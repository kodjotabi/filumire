import { randomBytes, randomUUID, createHash, createHmac } from 'node:crypto';
import type { Database, Sql } from './database';
import { BillingError } from './plans';
import type { Parent } from './service';
export type SendAuthMail = (email: string, url: string, locale: 'en' | 'fr') => Promise<void>;
export function digest(value: string): string { return createHash('sha256').update(value).digest('hex'); }
export function cookieValue(request: Request, name: string): string { const value = request.headers.get('cookie')?.split(';').map(p => p.trim()).find(p => p.startsWith(name + '='))?.slice(name.length + 1) ?? ''; return /^[a-f0-9]{64}$/.test(value) ? value : ''; }
export function authCookie(name: string, value: string, origin: string, seconds: number): string { return name + '=' + value + '; HttpOnly; SameSite=Lax; Path=/; Max-Age=' + seconds + (origin.startsWith('https:') ? '; Secure' : ''); }
export function configuredOrigin(env: NodeJS.ProcessEnv = process.env): string { try {
    const url = new URL(env.FILUMIRE_BILLING_ORIGIN ?? '');
    if (url.username || url.password || url.pathname !== '/' || url.search || url.hash || !(url.protocol === 'https:' || (url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname))))
        throw new Error();
    return url.origin;
}
catch {
    throw new BillingError('configuration', 503);
} }
export function sameOrigin(request: Request, origin: string) { if (request.headers.get('origin') !== origin || request.headers.get('sec-fetch-site') === 'cross-site')
    throw new BillingError('request_rejected', 403); }
export async function boundedBody(request: Request, maximum = 8192): Promise<Buffer> { const reader = request.body?.getReader(); if (!reader)
    throw new BillingError('invalid_request', 400); const chunks: Uint8Array[] = []; let bytes = 0; while (true) {
    const part = await reader.read();
    if (part.done)
        break;
    bytes += part.value.length;
    if (bytes > maximum) {
        await reader.cancel();
        throw new BillingError('request_too_large', 413);
    }
    chunks.push(part.value);
} return Buffer.concat(chunks); }
export async function consumeLimit(tx: Sql, key: string, maximum: number, windowSeconds: number, now = new Date()) {
    await tx.query('INSERT INTO filumire_billing_limits(key,count,resets_at) VALUES ($1,0,$2) ON CONFLICT(key) DO NOTHING', [key, new Date(+now + windowSeconds * 1000)]);
    const row = (await tx.query<{
        count: number;
        resets_at: Date;
    }>('SELECT count,resets_at FROM filumire_billing_limits WHERE key=$1 FOR UPDATE', [key])).rows[0];
    if (new Date(row.resets_at) <= now) {
        await tx.query('UPDATE filumire_billing_limits SET count=1,resets_at=$2 WHERE key=$1', [key, new Date(+now + windowSeconds * 1000)]);
        return;
    }
    if (row.count >= maximum)
        throw new BillingError('rate_limited', 429);
    await tx.query('UPDATE filumire_billing_limits SET count=count+1 WHERE key=$1', [key]);
}
/** Passwordless, browser-bound email links. Only hashes of tokens and sessions are stored. */
export class ParentAuth {
    constructor(private db: Database, private send: SendAuthMail, private origin: string, private secret: string, private now: () => Date = () => new Date()) { if (secret.length < 32)
        throw new BillingError('configuration', 503); }
    async requestLink(email: unknown, guardian: unknown, locale: 'en' | 'fr') {
        if (typeof email !== 'string' || email.length > 254 || !/^[-A-Za-z0-9.!#$%&'*+/=?^_\x60{|}~]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(email) || guardian !== true)
            throw new BillingError('invalid_account', 400);
        email = email.toLowerCase();
        const token = randomBytes(32).toString('hex'), challenge = randomBytes(32).toString('hex'), now = this.now();
        await this.db.transaction(async (tx) => {
            await consumeLimit(tx, 'email:' + createHmac('sha256', this.secret).update(email as string).digest('hex'), 3, 900, now);
            await consumeLimit(tx, 'auth-global', 30, 900, now);
            await tx.query('DELETE FROM filumire_login_tokens WHERE expires_at<$1', [now]);
            await tx.query('INSERT INTO filumire_login_tokens(digest,email,challenge_digest,expires_at,guardian_attested_at) VALUES ($1,$2,$3,$4,$5)', [digest(token), email, digest(challenge), new Date(+now + 900000), now]);
        });
        try {
            await this.send(email as string, this.origin + (locale === 'fr' ? '/fr' : '') + '/account#token=' + token, locale);
        }
        catch {
            await this.db.query('DELETE FROM filumire_login_tokens WHERE digest=$1', [digest(token)]);
            throw new BillingError('email_unavailable', 503);
        }
        return { challenge };
    }
    async complete(token: unknown, challenge: string) {
        if (typeof token !== 'string' || !/^[a-f0-9]{64}$/.test(token) || !/^[a-f0-9]{64}$/.test(challenge))
            throw new BillingError('invalid_link', 403);
        const bearer = randomBytes(32).toString('hex');
        await this.db.transaction(async (tx) => {
            const row = (await tx.query<{
                email: string;
                challenge_digest: string;
                expires_at: Date;
                used_at: Date | null;
                guardian_attested_at: Date;
            }>('SELECT * FROM filumire_login_tokens WHERE digest=$1 FOR UPDATE', [digest(token)])).rows[0];
            if (!row || row.used_at || new Date(row.expires_at) <= this.now() || row.challenge_digest !== digest(challenge))
                throw new BillingError('invalid_link', 403);
            await tx.query('INSERT INTO filumire_auth_user(id,name,email,"emailVerified","createdAt","updatedAt",guardian_attested_at) VALUES ($1,$2,$3,$4,$5,$5,$5) ON CONFLICT(email) DO UPDATE SET "emailVerified"=$4,"updatedAt"=$5', [randomUUID(), 'Parent', row.email, true, this.now()]);
            const user = (await tx.query<{
                id: string;
            }>('SELECT id FROM filumire_auth_user WHERE email=$1', [row.email])).rows[0];
            await tx.query('INSERT INTO filumire_auth_session(id,"expiresAt",token,"userId","createdAt","updatedAt") VALUES ($1,$2,$3,$4,$5,$5)', [randomUUID(), new Date(+this.now() + 14 * 86400000), digest(bearer), user.id, this.now()]);
            await tx.query('UPDATE filumire_login_tokens SET used_at=$2 WHERE digest=$1', [digest(token), this.now()]);
        });
        return { bearer };
    }
    async session(request: Request): Promise<Parent | null> {
        const bearer = cookieValue(request, 'filumire_parent');
        if (!bearer)
            return null;
        const row = (await this.db.query<{
            id: string;
            email: string;
            emailVerified: boolean | number;
            expires: string;
        }>('SELECT u.id,u.email,u."emailVerified",s."expiresAt" AS expires FROM filumire_auth_session s JOIN filumire_auth_user u ON u.id=s."userId" WHERE s.token=$1', [digest(bearer)])).rows[0];
        return row && new Date(row.expires) > this.now() ? { id: row.id, email: row.email, emailVerified: !!row.emailVerified } : null;
    }
    async logout(request: Request) { const bearer = cookieValue(request, 'filumire_parent'); if (bearer)
        await this.db.query('DELETE FROM filumire_auth_session WHERE token=$1', [digest(bearer)]); }
}
