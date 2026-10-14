import { createHmac, randomBytes, randomUUID, timingSafeEqual } from "node:crypto";
import { AccessError, assertLocalFamilyAccess } from "./otp";

export type Entitlement = "FREE" | "TRIAL_PLUS" | "ACTIVE_PLUS" | "ACTIVE_FAMILY" | "SCHOOL_LICENSE";
export type PaidPlan = "PLUS" | "FAMILY";
export type BillingInterval = "monthly" | "annual";
export interface Price { amountMinor: number; currency: string }
export type PriceCatalogue = Partial<Record<`${PaidPlan}:${BillingInterval}`, Price>>;
export interface PaymentRequest { id: string; principalId: string; plan: PaidPlan; interval: BillingInterval; price: Price; authorisedAt: string; status: "pending" | "paid" | "failed" | "refunded"; paidUntil?: number }
interface FamilySubscription { start?: number; expiry?: number; paidPlan?: PaidPlan; paidUntil?: number; cancelled?: boolean }
export interface PaymentEvent { eventId: string; checkoutId: string; outcome: "paid" | "failed" | "refunded"; paidUntil?: number; amountMinor?: number; currency?: string; payerPrincipalId?: string }
export interface PaymentProvider { verify(payload: string, signature: string): PaymentEvent }
/** Signed server fixture events. No browser confirmation can activate access. */
export class MockPaymentProvider implements PaymentProvider {
  private key = randomBytes(32);
  private sign(payload: string) { return createHmac("sha256", this.key).update(payload).digest("hex"); }
  fixture(event: PaymentEvent) {
    assertLocalFamilyAccess();
    const payload = JSON.stringify(event);
    return { payload, signature: this.sign(payload) };
  }
  verify(payload: string, signature: string): PaymentEvent {
    assertLocalFamilyAccess();
    if (payload.length > 4096 || !/^[a-f0-9]{64}$/.test(signature) || !timingSafeEqual(Buffer.from(signature, "hex"), Buffer.from(this.sign(payload), "hex"))) throw new AccessError("payment_failed");
    let event: PaymentEvent;
    try { event = JSON.parse(payload); } catch { throw new AccessError("payment_failed"); }
    if (!event || typeof event.eventId !== "string" || event.eventId.length > 128 || !event.eventId || typeof event.checkoutId !== "string" || event.checkoutId.length > 128 || !["paid", "failed", "refunded"].includes(event.outcome)) throw new AccessError("payment_failed");
    return event;
  }
}
export interface EntitlementSnapshot {
  status: Entitlement; trialStartsAt?: string; trialExpiresAt?: string;
  paidThrough?: string; cancellationScheduled: boolean;
  notice: "trial_ending" | "trial_expired" | null;
  // No provisional feature limits silently applied to learning.
  enforcement: "unrestricted_existing_learning";
}
const DAY = 86_400_000;
/** Authoritative local-only model. No learning-state or assessment writes. */
export class SubscriptionService {
  private families = new Map<string, FamilySubscription>();
  private newFamilies = new Set<string>();
  private trialIdentityClaims = new Set<string>();
  private trialKey = randomBytes(32);
  private checkouts = new Map<string, PaymentRequest>();
  private processedEvents = new Map<string, string>();
  private historyEntries: Array<{ principalId: string; checkoutId?: string; action: string; at: string }> = [];
  // Provisioned only through the server test harness, never an adult/teacher HTTP flag.
  private schoolMembers = new Map<string, { organisationId: string; expiresAt: number; learners: Set<string> }>();
  constructor(private provider: PaymentProvider, private prices: PriceCatalogue = {}, private clock: () => number = Date.now) {
    this.prices = structuredClone(prices);
    for (const price of Object.values(this.prices)) if (!price || !Number.isSafeInteger(price.amountMinor) || price.amountMinor <= 0 || !/^[A-Z]{3}$/.test(price.currency)) throw new AccessError("invalid_request");
  }
  private audit(principalId: string, action: string, checkoutId?: string) {
    // Bounded local audit, containing identifiers and actions but no phone, OTP or child text.
    if (this.historyEntries.length >= 5000) this.historyEntries.shift();
    this.historyEntries.push({ principalId, action, checkoutId, at: new Date(this.clock()).toISOString() });
  }
  /** Called only by a successful new guardian registration, not by a client eligibility flag. */
  assertRegistrationCapacity() {
    assertLocalFamilyAccess();
    if (this.newFamilies.size >= 1000) throw new AccessError("unavailable");
  }
  registerNewFamily(principalId: string) {
    this.assertRegistrationCapacity(); this.newFamilies.add(principalId);
  }
  isNewFamily(principalId: string) { assertLocalFamilyAccess(); return this.newFamilies.has(principalId); }
  /** Local provisional eligibility: newly registered guardian plus verified phone ownership. */
  enrolNewFamily(principalId: string, verifiedIdentityKey: string): EntitlementSnapshot {
    assertLocalFamilyAccess();
    if (!this.newFamilies.has(principalId)) throw new AccessError("forbidden");
    const claim = createHmac("sha256", this.trialKey).update(verifiedIdentityKey).digest("hex");
    if (!this.families.has(principalId)) {
      if (this.families.size >= 1000) throw new AccessError("unavailable");
      const now = this.clock();
      const eligible = !this.trialIdentityClaims.has(claim);
      this.trialIdentityClaims.add(claim);
      this.families.set(principalId, eligible ? { start: now, expiry: now + 14 * DAY } : {});
      this.audit(principalId, eligible ? "trial_started" : "trial_not_eligible");
    }
    return this.snapshot(principalId);
  }
  snapshot(principalId: string): EntitlementSnapshot {
    assertLocalFamilyAccess();
    const family = this.families.get(principalId) ?? {};
    const now = this.clock();
    const school = this.schoolMembers.get(principalId);
    const paid = Boolean(family.paidUntil && family.paidUntil > now);
    const trial = family.expiry !== undefined && family.expiry > now;
    const status: Entitlement = school && school.expiresAt > now ? "SCHOOL_LICENSE" : paid ? (family.paidPlan === "FAMILY" ? "ACTIVE_FAMILY" : "ACTIVE_PLUS") : trial ? "TRIAL_PLUS" : "FREE";
    return {
      status, trialStartsAt: family.start === undefined ? undefined : new Date(family.start).toISOString(),
      trialExpiresAt: family.expiry === undefined ? undefined : new Date(family.expiry).toISOString(),
      paidThrough: family.paidUntil ? new Date(family.paidUntil).toISOString() : undefined,
      cancellationScheduled: family.cancelled ?? false,
      notice: status === "TRIAL_PLUS" && family.expiry! - now <= 3 * DAY ? "trial_ending" : status === "FREE" && family.expiry !== undefined && family.expiry <= now ? "trial_expired" : null,
      enforcement: "unrestricted_existing_learning",
    };
  }
  choices() { assertLocalFamilyAccess(); return structuredClone(this.prices); }
  checkout(principalId: string, plan: PaidPlan, interval: BillingInterval, explicitlyAuthorised: unknown, requestId: string): PaymentRequest {
    assertLocalFamilyAccess();
    if (explicitlyAuthorised !== true || !/^[a-zA-Z0-9-]{8,128}$/.test(requestId) || !["PLUS", "FAMILY"].includes(plan) || !["monthly", "annual"].includes(interval)) throw new AccessError("invalid_request");
    const id = `${principalId}:${requestId}`;
    const existing = this.checkouts.get(id);
    if (existing) {
      if (existing.plan !== plan || existing.interval !== interval) throw new AccessError("invalid_request");
      return structuredClone(existing);
    }
    const price = this.prices[`${plan}:${interval}`];
    if (!price) throw new AccessError("unavailable");
    if (this.checkouts.size >= 1000) throw new AccessError("unavailable");
    const request: PaymentRequest = { id: randomUUID(), principalId, plan, interval, price: { ...price }, authorisedAt: new Date(this.clock()).toISOString(), status: "pending" };
    this.checkouts.set(id, request);
    this.audit(principalId, "checkout_authorised", request.id);
    return structuredClone(request);
  }
  applyVerifiedEvent(payload: string, signature: string): void {
    assertLocalFamilyAccess();
    const event = this.provider.verify(payload, signature);
    const prior = this.processedEvents.get(event.eventId);
    if (prior !== undefined) { if (prior !== payload) throw new AccessError("payment_failed"); return; }
    const checkout = [...this.checkouts.values()].find(c => c.id === event.checkoutId);
    if (!checkout || this.processedEvents.size >= 5000) throw new AccessError("payment_failed");
    const family = this.families.get(checkout.principalId) ?? {};
    if (event.outcome === "paid") {
      // Match the trusted purchase, as required by the existing payment-attempt/obligation schema.
      if (event.amountMinor !== checkout.price.amountMinor || event.currency !== checkout.price.currency || event.payerPrincipalId !== checkout.principalId) throw new AccessError("payment_failed");
      if (checkout.status !== "pending" || !Number.isSafeInteger(event.paidUntil) || event.paidUntil! <= this.clock() || event.paidUntil! > this.clock() + 370 * DAY) throw new AccessError("payment_failed");
      checkout.status = "paid"; checkout.paidUntil = event.paidUntil;
      if (!family.paidUntil || event.paidUntil! >= family.paidUntil) {
        family.paidPlan = checkout.plan; family.paidUntil = event.paidUntil; family.cancelled = false;
      }
    } else if (event.outcome === "failed") {
      if (checkout.status !== "pending") throw new AccessError("payment_failed");
      checkout.status = "failed";
    } else {
      if (checkout.status !== "paid") throw new AccessError("payment_failed");
      checkout.status = "refunded";
      // Never remove an unrelated later purchase when an earlier payment is refunded.
      const other = [...this.checkouts.values()].filter(c => c.principalId === checkout.principalId && c.status === "paid" && c.paidUntil! > this.clock()).sort((a, b) => b.paidUntil! - a.paidUntil!)[0];
      family.paidPlan = other?.plan; family.paidUntil = other?.paidUntil;
    }
    this.families.set(checkout.principalId, family);
    this.processedEvents.set(event.eventId, payload);
    this.audit(checkout.principalId, `payment_${event.outcome}`, checkout.id);
  }
  cancel(principalId: string) {
    assertLocalFamilyAccess();
    const family = this.families.get(principalId);
    if (family) family.cancelled = true;
    this.audit(principalId, "renewal_cancelled");
    return this.snapshot(principalId);
  }
  billingHistory(principalId: string) {
    assertLocalFamilyAccess();
    return this.historyEntries.filter(e => e.principalId === principalId).map(e => ({ ...e }));
  }
  schoolCoversLearner(principalId: string, learnerId: string) {
    assertLocalFamilyAccess();
    const membership = this.schoolMembers.get(principalId);
    return Boolean(membership && membership.expiresAt > this.clock() && membership.learners.has(learnerId));
  }
  provisionSchoolFixture(principalId: string, organisationId: string, expiresAt: number, learnerIds: string[] = []) {
    assertLocalFamilyAccess();
    if (!organisationId || !Number.isSafeInteger(expiresAt) || expiresAt <= this.clock() || learnerIds.length > 500 || learnerIds.some(id => !id || id.length > 200)) throw new AccessError("invalid_request");
    this.schoolMembers.set(principalId, { organisationId, expiresAt, learners: new Set(learnerIds) });
  }
}
