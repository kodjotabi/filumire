import { ParentAuth, cookieValue, authCookie, boundedBody, configuredOrigin, sameOrigin, consumeLimit } from './auth';
import { getDatabase } from './database';
import { BillingService, requireParent } from './service';
import { BillingError } from './plans';
import { paystack, testSecret, validSignature } from './paystack';
import { authSmtpConfiguration, sendAuthSmtp } from './auth-mail';
export function json(status: number, body: unknown) { return Response.json(body, { status, headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer' } }); }
export function failure(error: unknown) { return error instanceof BillingError ? json(error.status, { code: error.code }) : json(503, { code: 'service_unavailable' }); }
export function services() {
    const db = getDatabase(), origin = configuredOrigin();
    const auth = new ParentAuth(db, async (email, url, locale) => {
        const config = authSmtpConfiguration();
        if (!config)
            throw new BillingError('email_unavailable', 503);
        await sendAuthSmtp(config, { from: config.from, to: email, replyTo: config.from, subject: locale === 'fr' ? 'Votre lien FILUMIRE' : 'Your FILUMIRE sign-in link', body: locale === 'fr' ? 'Ouvrez ce lien dans le navigateur ayant demandé la connexion, puis confirmez. Il expire dans 15 minutes. Ne le partagez pas.\n\n' + url : 'Open this link in the browser where you requested sign-in, then confirm. It expires in 15 minutes. Do not share it.\n\n' + url });
    }, origin, process.env.FILUMIRE_AUTH_SECRET ?? '');
    let provider = null;
    try {
        provider = paystack();
    }
    catch { /* Invalid or absent keys never enable payments. */ }
    return { db, auth, origin, billing: new BillingService(db, provider, () => new Date(), process.env.FILUMIRE_WEBSITE_LEARNING_READY === 'true') };
}
export async function handleAuth(request: Request, dependencies?: ReturnType<typeof services>) {
    try {
        const { auth, origin } = dependencies ?? services();
        sameOrigin(request, origin);
        if (request.headers.get('content-type')?.split(';')[0] !== 'application/json')
            throw new BillingError('invalid_request', 415);
        let body;
        try {
            body = JSON.parse((await boundedBody(request)).toString('utf8'));
        }
        catch (error) {
            if (error instanceof BillingError)
                throw error;
            throw new BillingError('invalid_request', 400);
        }
        if (!body || typeof body !== 'object' || Array.isArray(body))
            throw new BillingError('invalid_request', 400);
        if (body.action === 'request') {
            const { challenge } = await auth.requestLink(body.email, body.guardian, body.locale === 'fr' ? 'fr' : 'en');
            const response = json(200, { sent: true });
            response.headers.append('Set-Cookie', authCookie('filumire_login_challenge', challenge, origin, 900));
            return response;
        }
        if (body.action === 'complete') {
            const { bearer } = await auth.complete(body.token, cookieValue(request, 'filumire_login_challenge'));
            const response = json(200, { signedIn: true });
            response.headers.append('Set-Cookie', authCookie('filumire_parent', bearer, origin, 14 * 86400));
            response.headers.append('Set-Cookie', authCookie('filumire_login_challenge', '', origin, 0));
            return response;
        }
        if (body.action === 'logout') {
            await auth.logout(request);
            const response = json(200, { signedOut: true });
            response.headers.append('Set-Cookie', authCookie('filumire_parent', '', origin, 0));
            return response;
        }
        throw new BillingError('invalid_request', 400);
    }
    catch (error) {
        return failure(error);
    }
}
export async function handleBilling(request: Request, dependencies?: ReturnType<typeof services>) {
    try {
        const { db, auth, billing, origin } = dependencies ?? services();
        const parent = requireParent(await auth.session(request));
        if (request.method === 'GET') {
            const value = new URL(request.url).searchParams.get('page') ?? '0';
            if (!/^\d{1,5}$/.test(value))
                throw new BillingError('invalid_request', 400);
            return json(200, await billing.status(parent, Number(value)));
        }
        sameOrigin(request, origin);
        if (request.headers.get('content-type')?.split(';')[0] !== 'application/json')
            throw new BillingError('invalid_request', 415);
        const body = JSON.parse((await boundedBody(request)).toString('utf8'));
        await db.transaction(tx => consumeLimit(tx, 'action:' + parent.id, 20, 60));
        switch (body.action) {
            case 'eligibility':
                await billing.requestEligibility(parent);
                return json(200, { requested: true });
            case 'trial': return json(200, await billing.activateTrial(parent));
            case 'learner': return json(201, await billing.addLearner(parent, body.name));
            case 'access':
                if (typeof body.learnerId !== 'string')
                    throw new BillingError('invalid_request', 400);
                return json(200, await billing.learnerAccess(parent, body.learnerId));
            case 'progress':
                if (typeof body.learnerId !== 'string')
                    throw new BillingError('invalid_request', 400);
                return json(200, await billing.progress(parent, body.learnerId));
            case 'record-progress':
                if (typeof body.learnerId !== 'string')
                    throw new BillingError('invalid_request', 400);
                return json(200, await billing.recordProgress(parent, body.learnerId, body.activity, body.score, body.completed));
            case 'checkout': return json(200, await billing.checkout(parent, body.plan, origin, body.locale === 'fr' ? 'fr' : 'en'));
            case 'verify':
                if (typeof body.reference !== 'string' || !/^fm-test-[a-f0-9-]{36}$/.test(body.reference))
                    throw new BillingError('invalid_request', 400);
                return json(200, await billing.verify(parent, body.reference));
            case 'cancel': return json(200, await billing.cancel(parent));
            case 'refund':
                if (typeof body.reference !== 'string')
                    throw new BillingError('invalid_request', 400);
                return json(200, await billing.requestRefund(parent, body.reference, body.reason));
            default: throw new BillingError('invalid_request', 400);
        }
    }
    catch (error) {
        return failure(error);
    }
}
export async function handleWebhook(request: Request, dependencies?: ReturnType<typeof services>, env: NodeJS.ProcessEnv = process.env) {
    try {
        const secret = testSecret(env);
        const raw = await boundedBody(request, 65536);
        if (!validSignature(raw, request.headers.get('x-paystack-signature'), secret))
            throw new BillingError('invalid_signature', 401);
        const { billing } = dependencies ?? services();
        return json(200, await billing.webhook(raw));
    }
    catch (error) {
        return failure(error);
    }
}
