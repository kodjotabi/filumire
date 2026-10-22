export type PlanId = 'individual' | 'family';
export type Plan = {
    id: PlanId;
    version: number;
    amount: number;
    currency: 'GHS';
    months: number;
    learners: number;
    provisional: boolean;
};
// Amounts are pesewas. New purchases use this catalogue; existing orders keep their snapshot.
export const PLANS: Record<PlanId, Plan> = {
    individual: { id: 'individual', version: 1, amount: 3000, currency: 'GHS', months: 1, learners: 1, provisional: true },
    family: { id: 'family', version: 1, amount: 6000, currency: 'GHS', months: 1, learners: 3, provisional: true },
};
export const TRIAL = { version: 1, hours: 168, learners: 3 };
export function planFor(id: unknown): Plan { if (id !== 'individual' && id !== 'family')
    throw new BillingError('invalid_plan', 400); const plan = PLANS[id]; if (!Number.isSafeInteger(plan.amount) || plan.amount <= 0 || !Number.isInteger(plan.months) || plan.months < 1 || !Number.isInteger(plan.learners) || plan.learners < 1)
    throw new BillingError('configuration', 503); return { ...plan }; }
export class BillingError extends Error {
    constructor(public code: string, public status = 400) { super(code); }
}
export function addMonths(start: Date, months: number): Date {
    const result = new Date(start);
    const day = result.getUTCDate();
    result.setUTCDate(1);
    result.setUTCMonth(result.getUTCMonth() + months);
    const lastDay = new Date(Date.UTC(result.getUTCFullYear(), result.getUTCMonth() + 1, 0)).getUTCDate();
    result.setUTCDate(Math.min(day, lastDay));
    return result;
}
