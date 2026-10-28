import { createHmac, randomBytes, timingSafeEqual, createHash } from 'node:crypto';
import { prepareInquiry, InquiryError, type InquiryCategory, type InquiryFields } from '../inquiries';
import { smtpConfiguration, sendSmtp, type Mail, type SmtpConfig } from './smtp';
export const CONTACT_RECIPIENTS = { inquiriesEmail: 'info@filumire.com', schoolsEmail: 'info@filumire.com', partnershipsEmail: 'info@filumire.com' };
const limits = new Map<string, {
    count: number;
    until: number;
}>();
export function issueContactToken(secret: string, now = Date.now()): string { const payload = now + '.' + randomBytes(16).toString('hex'); return payload + '.' + createHmac('sha256', secret).update(payload).digest('hex'); }
export function validContactToken(token: unknown, cookie: string | undefined, secret: string, now = Date.now()): boolean {
    if (typeof token !== 'string' || token !== cookie || token.length > 160)
        return false;
    const parts = token.split('.');
    if (parts.length !== 3)
        return false;
    const timestamp = Number(parts[0]);
    if (!Number.isFinite(timestamp) || now - timestamp < 2000 || now - timestamp > 3600000)
        return false;
    const expected = createHmac('sha256', secret).update(parts.slice(0, 2).join('.')).digest('hex');
    return parts[2].length === expected.length && timingSafeEqual(Buffer.from(parts[2]), Buffer.from(expected));
}
export function consumeContactLimit(key: string, now = Date.now()): boolean {
    for (const [id, item] of limits)
        if (item.until <= now)
            limits.delete(id);
    const existing = limits.get(key);
    if (existing) {
        if (existing.count >= 3)
            return false;
        existing.count++;
        return true;
    }
    if (limits.size >= 2000)
        return false;
    limits.set(key, { count: 1, until: now + 900000 });
    return true;
}
const messages = { en: { unavailable: 'Messaging is currently unavailable. No message was sent. Please try again later.', invalid: 'Please check your details.', rejected: 'This request could not be verified. Reload the form and try again.', limited: 'Too many attempts. Please wait 15 minutes before trying again.', failed: 'We could not confirm acceptance by the email server. Please try again later.', accepted: 'The email server accepted your message for delivery. Inbox receipt and response time are not yet confirmed.' }, fr: { unavailable: 'La messagerie est actuellement indisponible. Aucun message n’a été envoyé. Réessayez plus tard.', invalid: 'Vérifiez les informations saisies.', rejected: 'Cette demande n’a pas pu être vérifiée. Rechargez le formulaire et réessayez.', limited: 'Trop de tentatives. Patientez 15 minutes avant de réessayer.', failed: 'Nous n’avons pas pu confirmer la prise en charge par le serveur de messagerie. Réessayez plus tard.', accepted: 'Le serveur de messagerie a accepté votre message pour envoi. Sa bonne réception et le délai de réponse ne sont pas encore confirmés.' } };
export async function handleContact(request: Request, env: NodeJS.ProcessEnv = process.env, transport: (config: SmtpConfig, mail: Mail) => Promise<void> = sendSmtp): Promise<Response> {
    const json = (status: number, body: object) => Response.json(body, { status, headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } });
    const config = smtpConfiguration(env);
    if (request.method === 'GET') {
        if (!config)
            return json(503, { available: false });
        const token = issueContactToken(config.password);
        const secure = new URL(request.url).protocol === 'https:';
        return new Response(JSON.stringify({ available: true, token }), { headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'Set-Cookie': 'filumire_contact=' + token + '; HttpOnly; SameSite=Strict; Path=/api/contact; Max-Age=3600' + (secure ? '; Secure' : '') } });
    }
    if (request.method !== 'POST')
        return json(405, { error: 'Method not allowed' });
    let locale: 'en' | 'fr' = 'en';
    let fields: InquiryFields;
    let category: InquiryCategory;
    let token: unknown;
    let draft: ReturnType<typeof prepareInquiry>;
    try {
        const origin = request.headers.get('origin');
        const requestUrl = new URL(request.url);
        const allowedOrigins = new Set([requestUrl.origin]);
        if (env.NEXT_PUBLIC_FILUMIRE_SITE_URL) {
            try { allowedOrigins.add(new URL(env.NEXT_PUBLIC_FILUMIRE_SITE_URL).origin); } catch { /* Invalid configuration cannot approve an origin. */ }
        }
        // Next.js may normalise 127.0.0.1 requests to localhost internally.
        // Accept the matching loopback host and port only for a loopback request.
        if (['localhost', '127.0.0.1'].includes(requestUrl.hostname)) {
            const host = request.headers.get('host');
            if (host) {
                try {
                    const loopback = new URL(requestUrl.protocol + '//' + host);
                    if (['localhost', '127.0.0.1'].includes(loopback.hostname) && loopback.port === requestUrl.port) allowedOrigins.add(loopback.origin);
                } catch { /* Reject malformed Host values. */ }
            }
        }
        if (!origin || !allowedOrigins.has(origin))
            return json(403, { message: messages.en.rejected });
        if (request.headers.get('content-type')?.split(';')[0] !== 'application/json')
            return json(415, { message: messages.en.invalid });
        const reader = request.body?.getReader();
        if (!reader)
            throw new Error('Missing body');
        const chunks: Uint8Array[] = [];
        let size = 0;
        while (true) {
            const part = await reader.read();
            if (part.done)
                break;
            size += part.value.byteLength;
            if (size > 20000) {
                await reader.cancel();
                return json(413, { message: messages.en.invalid });
            }
            chunks.push(part.value);
        }
        const bytes = new Uint8Array(size);
        let offset = 0;
        for (const chunk of chunks) {
            bytes.set(chunk, offset);
            offset += chunk.byteLength;
        }
        const body = JSON.parse(new TextDecoder().decode(bytes));
        locale = body?.locale === 'fr' ? 'fr' : 'en';
        if (!body || typeof body !== 'object' || !body.fields || typeof body.fields !== 'object')
            throw new Error('Invalid body');
        if (body.website)
            return json(403, { message: messages[locale].rejected });
        for (const field of ['name', 'email', 'message'])
            if (typeof body.fields[field] !== 'string')
                throw new Error('Invalid fields');
        for (const field of ['phone', 'organization', 'country'])
            if (body.fields[field] !== undefined && typeof body.fields[field] !== 'string')
                throw new Error('Invalid fields');
        fields = { name: body.fields.name, email: body.fields.email, message: body.fields.message,
            phone: body.fields.phone ?? '', organization: body.fields.organization ?? '', country: body.fields.country ?? '' };
        category = body.category ?? 'general';
        token = body.token;
        draft = prepareInquiry(category, fields, CONTACT_RECIPIENTS, locale);
    }
    catch (error) {
        return json(400, { message: error instanceof InquiryError ? error.message : messages[locale].invalid, field: error instanceof InquiryError ? error.field : undefined });
    }
    if (!config)
        return json(503, { message: messages[locale].unavailable });
    const cookie = request.headers.get('cookie')?.split(';').map(x => x.trim()).find(x => x.startsWith('filumire_contact='))?.slice('filumire_contact='.length);
    if (!validContactToken(token, cookie, config.password))
        return json(403, { message: messages[locale].rejected });
    // Per-instance limits are defence in depth, not a globally durable rate limiter.
    const emailKey = createHash('sha256').update(fields.email.trim().toLowerCase()).digest('hex');
    const address = env.VERCEL === '1' ? request.headers.get('x-vercel-forwarded-for') || 'unknown' : 'local';
    if (!consumeContactLimit('email:' + emailKey) || !consumeContactLimit('address:' + address))
        return json(429, { message: messages[locale].limited });
    try {
        await transport(config, { from: config.from, to: draft.recipient, replyTo: fields.email.trim(), subject: 'FILUMIRE — ' + (locale === 'fr' ? 'Message du site' : 'Website message'), body: [(locale === 'fr' ? 'Nom : ' : 'Name: ') + fields.name.trim(), (locale === 'fr' ? 'E-mail : ' : 'Email: ') + fields.email.trim(), '', fields.message.trim()].join('\n') });
        return json(200, { accepted: true, message: messages[locale].accepted });
    }
    catch {
        return json(502, { message: messages[locale].failed });
    }
}
