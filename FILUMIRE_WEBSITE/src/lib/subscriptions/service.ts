import { randomUUID, createHash } from 'node:crypto';
import { BillingError, TRIAL, planFor, addMonths, type Plan } from './plans';
import type { Database, Sql } from './database';
import { assertVerified, type PaymentProvider, type VerifiedPayment } from './paystack';
export type Parent = {
    id: string;
    email: string;
    emailVerified: boolean;
};
type Household = {
    id: string;
    parent_id: string;
    eligibility_key: string | null;
    eligibility_approved_at: Date | null;
    eligibility_requested_at: Date | null;
    cancelled_at: Date | null;
};
type Period = {
    starts_at: Date;
    ends_at: Date;
    learner_limit: number;
};
type Order = {
    reference: string;
    household_id: string;
    parent_email: string;
    amount: number;
    currency: string;
    plan: Plan;
    status: string;
    provider_id: string | null;
    refunded_amount: number;
    verified_at: Date | null;
};
export function requireParent(parent: Parent | null): Parent { if (!parent)
    throw new BillingError('sign_in', 401); if (!parent.emailVerified)
    throw new BillingError('verify_email', 403); return parent; }
export function accessPeriod(periods: Period[], now: Date): Period | null { return periods.filter(p => new Date(p.starts_at) <= now && now < new Date(p.ends_at)).sort((a, b) => b.learner_limit - a.learner_limit || +new Date(b.ends_at) - +new Date(a.ends_at))[0] ?? null; }
export class BillingService {
    constructor(private db: Database, private provider: PaymentProvider | null, private now: () => Date = () => new Date(), private learningReady = false) { }
    private async household(tx: Sql, parent: Parent): Promise<Household> {
        requireParent(parent);
        await tx.query('INSERT INTO filumire_households(id,parent_id) VALUES ($1,$2) ON CONFLICT(parent_id) DO NOTHING', [randomUUID(), parent.id]);
        return (await tx.query<Household>('SELECT * FROM filumire_households WHERE parent_id=$1 FOR UPDATE', [parent.id])).rows[0];
    }
    private async periods(tx: Sql, household: string) {
        const trials = (await tx.query<Period>('SELECT starts_at,ends_at,learner_limit FROM filumire_trial_uses WHERE household_id=$1', [household])).rows;
        const grants = (await tx.query<Period>('SELECT starts_at,ends_at,learner_limit FROM filumire_grants WHERE household_id=$1 AND revoked_at IS NULL', [household])).rows;
        return { trials, grants };
    }
    async status(parent: Parent, page = 0) {
        return this.db.transaction(async (tx) => {
            const h = await this.household(tx, parent), periods = await this.periods(tx, h.id), now = this.now();
            const active = accessPeriod([...periods.trials, ...periods.grants], now);
            const future = periods.grants.filter(p => new Date(p.ends_at) > now);
            const limit = active?.learner_limit ?? future.sort((a, b) => +new Date(a.starts_at) - +new Date(b.starts_at))[0]?.learner_limit ?? 1;
            const learners = (await tx.query<{
                id: string;
                display_name: string;
            }>('SELECT id,display_name FROM filumire_learners WHERE household_id=$1 ORDER BY created_at,id', [h.id])).rows;
            const payments = (await tx.query('SELECT p.reference,p.amount,p.currency,p.status,p.channel,p.plan,p.created_at,p.verified_at,p.refunded_amount,g.starts_at,g.ends_at,r.status AS refund_status FROM filumire_payments p LEFT JOIN filumire_grants g ON g.payment_reference=p.reference LEFT JOIN filumire_refund_requests r ON r.payment_reference=p.reference WHERE p.household_id=$1 ORDER BY p.created_at DESC,p.reference LIMIT 51 OFFSET $2', [h.id, page * 50])).rows;
            const paidThrough = future.reduce<Date | null>((end, p) => !end || new Date(p.ends_at) > end ? new Date(p.ends_at) : end, null);
            return { email: parent.email, trial: periods.trials[0] ?? null, trialUsed: periods.trials.length > 0, eligible: !!h.eligibility_key, eligibilityRequested: !!h.eligibility_requested_at, access: !!active && this.learningReady, learningReady: this.learningReady, accessEndsAt: active?.ends_at ?? null, paidThrough, learnerLimit: limit, cancelledAt: h.cancelled_at, learners: learners.map((l, index) => ({ ...l, access: !!active && this.learningReady && index < limit })), payments: payments.slice(0, 50), hasMore: payments.length > 50, page, testMode: true, paymentsReady: !!this.provider };
        });
    }
    async requestEligibility(parent: Parent) { return this.db.transaction(async (tx) => { const h = await this.household(tx, parent); await tx.query('UPDATE filumire_households SET eligibility_requested_at=COALESCE(eligibility_requested_at,$2) WHERE id=$1', [h.id, this.now()]); }); }
    async activateTrial(parent: Parent) {
        if (!this.learningReady)
            throw new BillingError('learning_unavailable', 409);
        return this.db.transaction(async (tx) => {
            const h = await this.household(tx, parent);
            if (!h.eligibility_key || !h.eligibility_approved_at)
                throw new BillingError('household_review', 403);
            if ((await tx.query('SELECT eligibility_key FROM filumire_trial_uses WHERE eligibility_key=$1 OR household_id=$2', [h.eligibility_key, h.id])).rows.length)
                throw new BillingError('trial_used', 409);
            if ((await this.periods(tx, h.id)).grants.some(p => new Date(p.ends_at) > this.now()))
                throw new BillingError('already_paid', 409);
            const start = this.now(), end = new Date(+start + TRIAL.hours * 3600000);
            await tx.query('INSERT INTO filumire_trial_uses(eligibility_key,household_id,starts_at,ends_at,learner_limit,version) VALUES ($1,$2,$3,$4,$5,$6)', [h.eligibility_key, h.id, start, end, TRIAL.learners, TRIAL.version]);
            return { startsAt: start, endsAt: end };
        });
    }
    async addLearner(parent: Parent, name: unknown) {
        if (typeof name !== 'string' || !name.trim() || name.trim().length > 80 || /[\x00-\x1f]/.test(name))
            throw new BillingError('invalid_learner', 400);
        return this.db.transaction(async (tx) => {
            const h = await this.household(tx, parent), periods = await this.periods(tx, h.id);
            const active = accessPeriod([...periods.trials, ...periods.grants], this.now());
            const future = periods.grants.filter(p => new Date(p.ends_at) > this.now()).sort((a, b) => +new Date(a.starts_at) - +new Date(b.starts_at));
            const limit = active?.learner_limit ?? future[0]?.learner_limit ?? 1;
            const count = +(await tx.query<{
                count: string;
            }>('SELECT count(*) AS count FROM filumire_learners WHERE household_id=$1', [h.id])).rows[0].count;
            if (count >= limit)
                throw new BillingError('learner_limit', 409);
            const id = randomUUID();
            await tx.query('INSERT INTO filumire_learners(id,household_id,display_name) VALUES ($1,$2,$3)', [id, h.id, name.trim()]);
            return { id };
        });
    }
    async learnerAccess(parent: Parent, learnerId: string) {
        const status = await this.status(parent);
        const learner = status.learners.find(l => l.id === learnerId);
        if (!learner)
            throw new BillingError('not_found', 404);
        if (!learner.access)
            throw new BillingError('access_expired', 403);
        return { learnerId: learner.id, householdAccessEndsAt: status.accessEndsAt, features: 'all_available' as const };
    }
    async progress(parent: Parent, learnerId: string) { const status = await this.status(parent); if (!status.learners.some(l => l.id === learnerId))
        throw new BillingError('not_found', 404); return (await this.db.query('SELECT activity_id,score,completed,updated_at FROM filumire_progress WHERE learner_id=$1 ORDER BY updated_at DESC', [learnerId])).rows; }
    async recordProgress(parent: Parent, learnerId: string, activity: unknown, score: unknown, completed: unknown) {
        if (typeof activity !== 'string' || !/^[a-z0-9][a-z0-9._-]{0,99}$/i.test(activity) || !Number.isInteger(score) || Number(score) < 0 || Number(score) > 100 || typeof completed !== 'boolean')
            throw new BillingError('invalid_progress', 400);
        return this.db.transaction(async (tx) => {
            const h = await this.household(tx, parent);
            const learners = (await tx.query<{
                id: string;
            }>('SELECT id FROM filumire_learners WHERE household_id=$1 ORDER BY created_at,id', [h.id])).rows;
            const index = learners.findIndex(l => l.id === learnerId);
            if (index < 0)
                throw new BillingError('not_found', 404);
            const periods = await this.periods(tx, h.id), active = accessPeriod([...periods.trials, ...periods.grants], this.now());
            if (!this.learningReady || !active || index >= active.learner_limit)
                throw new BillingError('access_expired', 403);
            await tx.query('INSERT INTO filumire_progress(learner_id,activity_id,score,completed,updated_at) VALUES ($1,$2,$3,$4,$5) ON CONFLICT(learner_id,activity_id) DO UPDATE SET score=EXCLUDED.score,completed=EXCLUDED.completed,updated_at=EXCLUDED.updated_at', [learnerId, activity, score, completed, this.now()]);
            return { recorded: true };
        });
    }
    async checkout(parent: Parent, planId: unknown, origin: string, locale: 'en' | 'fr') {
        if (!this.learningReady)
            throw new BillingError('learning_unavailable', 409);
        if (!this.provider)
            throw new BillingError('payments_unavailable', 503);
        const plan = planFor(planId), reference = 'fm-test-' + randomUUID();
        await this.db.transaction(async (tx) => {
            const h = await this.household(tx, parent);
            const count = +(await tx.query<{
                count: string;
            }>('SELECT count(*) AS count FROM filumire_learners WHERE household_id=$1', [h.id])).rows[0].count;
            if (count > plan.learners)
                throw new BillingError('plan_learner_conflict', 409);
            await tx.query('INSERT INTO filumire_payments(reference,household_id,parent_email,plan,amount,currency) VALUES ($1,$2,$3,$4,$5,$6)', [reference, h.id, parent.email, JSON.stringify(plan), plan.amount, plan.currency]);
        });
        try {
            const page = origin + (locale === 'fr' ? '/fr' : '') + '/account/subscription';
            const url = await this.provider.initialize({ reference, email: parent.email, amount: plan.amount, callback: page + '?reference=' + encodeURIComponent(reference), cancel: page + '?checkout=cancelled' });
            await this.db.query('UPDATE filumire_payments SET checkout_url=$2 WHERE reference=$1', [reference, url]);
            return { url, reference };
        }
        catch (error) {
            await this.db.query("UPDATE filumire_payments SET status='initialization_failed' WHERE reference=$1 AND status='pending'", [reference]);
            throw error;
        }
    }
    async verify(parent: Parent, reference: string) {
        requireParent(parent);
        const order = (await this.db.query<Order>('SELECT p.* FROM filumire_payments p JOIN filumire_households h ON h.id=p.household_id WHERE p.reference=$1 AND h.parent_id=$2', [reference, parent.id])).rows[0];
        if (!order)
            throw new BillingError('not_found', 404);
        if (!this.provider)
            throw new BillingError('payments_unavailable', 503);
        return this.applyPayment(await this.provider.verify(reference));
    }
    async applyPayment(data: VerifiedPayment, eventDigest?: string) {
        const existing = (await this.db.query<Order>('SELECT * FROM filumire_payments WHERE reference=$1', [data.reference])).rows[0];
        if (!existing)
            throw new BillingError('not_found', 404);
        return this.db.transaction(async (tx) => {
            await tx.query('SELECT id FROM filumire_households WHERE id=$1 FOR UPDATE', [existing.household_id]);
            const order = (await tx.query<Order>('SELECT * FROM filumire_payments WHERE reference=$1 FOR UPDATE', [data.reference])).rows[0];
            assertVerified(order, data);
            if (order.provider_id && order.provider_id !== String(data.id))
                throw new BillingError('verification_mismatch', 409);
            if (!order.verified_at && !['success', 'refunded', 'partially_refunded'].includes(order.status)) {
                if (data.status === 'success') {
                    const now = this.now(), periods = await this.periods(tx, order.household_id);
                    const start = [...periods.trials, ...periods.grants].reduce((last, p) => new Date(p.ends_at) > last ? new Date(p.ends_at) : last, now);
                    const end = addMonths(start, order.plan.months);
                    await tx.query("UPDATE filumire_payments SET status='success',provider_id=$2,channel=$3,verified_at=$4 WHERE reference=$1", [order.reference, String(data.id), data.channel, now]);
                    await tx.query('INSERT INTO filumire_grants(payment_reference,household_id,starts_at,ends_at,learner_limit) VALUES ($1,$2,$3,$4,$5)', [order.reference, order.household_id, start, end, order.plan.learners]);
                    await tx.query('UPDATE filumire_households SET cancelled_at=NULL WHERE id=$1', [order.household_id]);
                }
                else {
                    const state = data.status === 'failed' ? 'failed' : data.status === 'abandoned' ? 'abandoned' : 'pending';
                    await tx.query('UPDATE filumire_payments SET status=$2 WHERE reference=$1', [order.reference, state]);
                }
            }
            if (eventDigest)
                await tx.query('UPDATE filumire_webhooks SET processed_at=$2 WHERE digest=$1', [eventDigest, this.now()]);
            return { status: (await tx.query<{
                    status: string;
                }>('SELECT status FROM filumire_payments WHERE reference=$1', [order.reference])).rows[0].status };
        });
    }
    async cancel(parent: Parent) { return this.db.transaction(async (tx) => { const h = await this.household(tx, parent); await tx.query('UPDATE filumire_households SET cancelled_at=$2 WHERE id=$1', [h.id, this.now()]); return { endsAfterPaidPeriod: true }; }); }
    async requestRefund(parent: Parent, reference: string, reason: unknown) {
        if (typeof reason !== 'string' || reason.trim().length < 10 || reason.length > 1000)
            throw new BillingError('invalid_refund', 400);
        return this.db.transaction(async (tx) => {
            const h = await this.household(tx, parent);
            const order = (await tx.query<Order>('SELECT * FROM filumire_payments WHERE reference=$1 AND household_id=$2 FOR UPDATE', [reference, h.id])).rows[0];
            if (!order)
                throw new BillingError('not_found', 404);
            if (!['success', 'partially_refunded'].includes(order.status))
                throw new BillingError('refund_unavailable', 409);
            await tx.query('INSERT INTO filumire_refund_requests(id,payment_reference,household_id,reason) VALUES ($1,$2,$3,$4) ON CONFLICT(payment_reference) DO NOTHING', [randomUUID(), reference, h.id, reason.trim()]);
            return { requested: true };
        });
    }
    async webhook(raw: Buffer) {
        const event = JSON.parse(raw.toString('utf8'));
        if (typeof event.event !== 'string')
            throw new BillingError('invalid_event', 400);
        if (!['charge.success', 'refund.pending', 'refund.processing', 'refund.processed', 'refund.failed'].includes(event.event))
            return { ignored: true };
        if (!this.provider)
            throw new BillingError('payments_unavailable', 503);
        const digest = createHash('sha256').update(raw).digest('hex');
        await this.db.query('INSERT INTO filumire_webhooks(digest,event_type) VALUES ($1,$2) ON CONFLICT(digest) DO NOTHING', [digest, event.event]);
        if ((await this.db.query<{
            processed_at: Date | null;
        }>('SELECT processed_at FROM filumire_webhooks WHERE digest=$1', [digest])).rows[0].processed_at)
            return { duplicate: true };
        if (event.event === 'charge.success') {
            const reference = event.data?.reference;
            if (typeof reference !== 'string' || !/^fm-test-[a-f0-9-]{36}$/.test(reference))
                return this.ignoreEvent(digest);
            if (!(await this.db.query('SELECT reference FROM filumire_payments WHERE reference=$1', [reference])).rows.length)
                return this.ignoreEvent(digest);
            const data = await this.provider.verify(reference);
            if (data.status !== 'success')
                throw new BillingError('verification_pending', 503);
            return this.applyPayment(data, digest);
        }
        const id = event.data?.id;
        if (!Number.isSafeInteger(id) || id < 1)
            throw new BillingError('invalid_event', 400);
        const refund = await this.provider.refund(String(id));
        if (String(refund.id) !== String(id) || !Number.isSafeInteger(refund.amount) || refund.amount <= 0 || !['pending', 'processing', 'needs-attention', 'processed', 'failed'].includes(refund.status))
            throw new BillingError('verification_mismatch', 409);
        if (event.event === 'refund.processed' && refund.status !== 'processed') throw new BillingError('verification_pending', 503);
        const reference = refund.transaction?.reference;
        const existing = (await this.db.query<Order>('SELECT * FROM filumire_payments WHERE reference=$1', [reference])).rows[0];
        if (!existing)
            return this.ignoreEvent(digest);
        const payment = await this.provider.verify(reference);
        assertVerified(existing, payment);
        if (String(payment.id) !== existing.provider_id || String(refund.transaction.id) !== existing.provider_id)
            throw new BillingError('verification_mismatch', 409);
        return this.db.transaction(async (tx) => {
            await tx.query('SELECT id FROM filumire_households WHERE id=$1 FOR UPDATE', [existing.household_id]);
            const order = (await tx.query<Order>('SELECT * FROM filumire_payments WHERE reference=$1 FOR UPDATE', [reference])).rows[0];
            const previous = (await tx.query<{payment_reference:string;amount:number}>('SELECT payment_reference,amount FROM filumire_refunds WHERE provider_id=$1',[String(id)])).rows[0];
            if(previous && (previous.payment_reference !== reference || previous.amount !== refund.amount)) throw new BillingError('verification_mismatch',409);
            await tx.query("INSERT INTO filumire_refunds(provider_id,payment_reference,amount,status) VALUES ($1,$2,$3,$4) ON CONFLICT(provider_id) DO UPDATE SET status=CASE WHEN filumire_refunds.status='processed' THEN 'processed' ELSE EXCLUDED.status END,updated_at=now()", [String(id), reference, refund.amount, refund.status]);
            const total = +(await tx.query<{
                total: string;
            }>("SELECT COALESCE(sum(amount),0) AS total FROM filumire_refunds WHERE payment_reference=$1 AND status='processed'", [reference])).rows[0].total;
            if (total > order.amount)
                throw new BillingError('verification_mismatch', 409);
            if (total > 0) {
                await tx.query('UPDATE filumire_payments SET refunded_amount=$2,status=$3 WHERE reference=$1', [reference, total, total === order.amount ? 'refunded' : 'partially_refunded']);
                if (total === order.amount)
                    await tx.query('UPDATE filumire_grants SET revoked_at=COALESCE(revoked_at,$2) WHERE payment_reference=$1', [reference, this.now()]);
            }
            await tx.query('UPDATE filumire_refund_requests SET status=$2 WHERE payment_reference=$1', [reference, refund.status === 'processed' ? 'processed' : refund.status === 'failed' ? 'failed' : 'processing']);
            await tx.query('UPDATE filumire_webhooks SET processed_at=$2 WHERE digest=$1', [digest, this.now()]);
            return { processed: true };
        });
    }
    private async ignoreEvent(digest: string) { await this.db.query('UPDATE filumire_webhooks SET processed_at=$2 WHERE digest=$1', [digest, this.now()]); return { ignored: true }; }
}
