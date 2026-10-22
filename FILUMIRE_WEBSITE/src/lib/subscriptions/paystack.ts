import { createHmac, timingSafeEqual } from 'node:crypto';
import { BillingError } from './plans';
export type VerifiedPayment = {
    id: number;
    domain: string;
    status: string;
    reference: string;
    amount: number;
    currency: string;
    channel: string;
    customer: {
        email: string;
    };
};
export type VerifiedRefund = {
    id: number;
    amount: number;
    status: string;
    transaction: {
        id: number;
        reference: string;
    };
};
export interface PaymentProvider {
    initialize(order: {
        reference: string;
        email: string;
        amount: number;
        callback: string;
        cancel: string;
    }): Promise<string>;
    verify(reference: string): Promise<VerifiedPayment>;
    refund(id: string): Promise<VerifiedRefund>;
}
export function testSecret(env: NodeJS.ProcessEnv = process.env): string {
    const key = env.PAYSTACK_SECRET_KEY;
    if (env.VERCEL_ENV === 'production' || env.PAYSTACK_MODE !== 'test' || !key || !/^sk_test_[A-Za-z0-9]+$/.test(key))
        throw new BillingError('payments_unavailable', 503);
    return key;
}
export function validSignature(raw: Buffer, signature: string | null, secret: string): boolean {
    if (!signature || !/^[a-f0-9]{128}$/i.test(signature))
        return false;
    const expected = createHmac('sha512', secret).update(raw).digest();
    return timingSafeEqual(expected, Buffer.from(signature, 'hex'));
}
export function assertVerified(order: {
    reference: string;
    amount: number;
    currency: string;
    parent_email: string;
}, data: VerifiedPayment): void {
    if (!data || data.domain !== 'test' || data.reference !== order.reference || data.currency !== order.currency || data.amount !== order.amount || !Number.isSafeInteger(data.id) || data.id < 1 || data.customer?.email?.toLowerCase() !== order.parent_email.toLowerCase() || (data.status === 'success' && !['card', 'mobile_money'].includes(data.channel)))
        throw new BillingError('verification_mismatch', 409);
}
export function paystack(env: NodeJS.ProcessEnv = process.env, transport: typeof fetch = fetch): PaymentProvider {
    const secret = testSecret(env);
    async function api(path: string, method = 'GET', body?: object) {
        try {
            const response = await transport('https://api.paystack.co' + path, { method, headers: { Authorization: 'Bearer ' + secret, 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined, cache: 'no-store', signal: AbortSignal.timeout(15000) });
            const value = await response.json();
            if (!response.ok || value.status !== true || !value.data)
                throw new Error('Rejected');
            return value.data;
        }
        catch {
            throw new BillingError('provider_unavailable', 502);
        }
    }
    return {
        async initialize(order) {
            const result = await api('/transaction/initialize', 'POST', { email: order.email, amount: order.amount, currency: 'GHS', reference: order.reference, channels: ['mobile_money', 'card'], callback_url: order.callback, metadata: { cancel_action: order.cancel } });
            let url: URL;
            try {
                url = new URL(result.authorization_url);
            }
            catch {
                throw new BillingError('provider_unavailable', 502);
            }
            if (url.protocol !== 'https:' || url.hostname !== 'checkout.paystack.com' || url.username || url.password || result.reference !== order.reference)
                throw new BillingError('provider_unavailable', 502);
            return url.href;
        },
        verify: reference => api('/transaction/verify/' + encodeURIComponent(reference)),
        refund: id => api('/refund/' + encodeURIComponent(id)),
    };
}
