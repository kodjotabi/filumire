import { randomBytes, randomUUID } from "node:crypto";
import { authenticateWithPassword, CONSENT_METHOD, CONSENT_NOTICE_VERSION, isRegistrationOpen } from "../account";
import { accountStore } from "../account/store";
import { hashPassword } from "../account/password";
import { revokeOtherPrincipalAuthSessions } from "../auth-session";
import { getPrincipalLearnerAccess, isPrincipalAuthorizedForLearner } from "../principal";
import { AccessError, assertLocalFamilyAccess, MockSmsProvider, OtpService } from "./otp";
import { MockPaymentProvider, SubscriptionService } from "./subscriptions";

export async function requireFamilyAdult(principalId: string): Promise<void> {
  assertLocalFamilyAccess();
  const credential = await accountStore.getCredentialByPrincipal(principalId);
  if (credential?.accountKind !== "guardian" || credential.status !== "active") throw new AccessError("forbidden");
}
/** Reuses learner access links. Neither a Family plan nor a school fixture grants learner access. */
export async function getLearnerEntitlement(principalId: string, learnerId: string, subscriptions: SubscriptionService) {
  assertLocalFamilyAccess();
  if (!(await isPrincipalAuthorizedForLearner(principalId, learnerId))) throw new AccessError("forbidden");
  const own = subscriptions.snapshot(principalId);
  if (own.status === "SCHOOL_LICENSE" && subscriptions.schoolCoversLearner(principalId, learnerId)) return { status: own.status, enforcement: own.enforcement };
  const profile = await accountStore.getLearnerProfile(learnerId);
  const owner = profile?.createdByPrincipalId;
  if (!owner || (await getPrincipalLearnerAccess(owner, learnerId, "guardian"))?.status !== "active") return { status: "FREE" as const, enforcement: "unrestricted_existing_learning" as const };
  await requireFamilyAdult(owner);
  const family = subscriptions.snapshot(owner);
  return { status: family.status, enforcement: family.enforcement };
}
export interface GuardianPhoneRegistration {
  displayName: unknown; language: unknown; confirmsGuardian: unknown; acceptsNotice: unknown;
}
/** Adds a verified phone alias to the existing principal; never replaces an identity. */
export class FamilyPhoneAccounts {
  private bindings = new Map<string, string>();
  private principalPhones = new Map<string, string>();
  private busy = new Set<string>();
  private auditEntries: Array<{ principalId: string; action: string; at: string }> = [];
  constructor(private subscriptions: SubscriptionService) {}
  private audit(principalId: string, action: string) {
    if (this.auditEntries.length >= 1000) this.auditEntries.shift();
    this.auditEntries.push({ principalId, action, at: new Date().toISOString() });
  }
  securityHistoryFor(principalId: string) { assertLocalFamilyAccess(); return this.auditEntries.filter(entry => entry.principalId === principalId).map(entry => ({ ...entry })); }
  private async exclusive<T>(keys: string[], action: () => Promise<T>): Promise<T> {
    assertLocalFamilyAccess();
    if (keys.some(key => this.busy.has(key))) throw new AccessError("verification_failed");
    keys.forEach(key => this.busy.add(key));
    try { return await action(); } finally { keys.forEach(key => this.busy.delete(key)); }
  }
  /** Phone must come from OtpService.verify, never directly from an HTTP body. */
  async registerVerified(phone: string, input: GuardianPhoneRegistration): Promise<string> {
    return this.exclusive([`phone:${phone}`], async () => {
      if (!isRegistrationOpen() || input.confirmsGuardian !== true || input.acceptsNotice !== true || typeof input.displayName !== "string" || input.displayName.trim().length < 1 || input.displayName.length > 40 || /[\u0000-\u001f\u007f]/.test(input.displayName) || !["en", "fr"].includes(input.language as string)) throw new AccessError("invalid_request");
      if (this.bindings.has(phone) || await accountStore.getCredentialByLogin(phone)) throw new AccessError("verification_failed");
      if (this.bindings.size >= 1000) throw new AccessError("unavailable");
      this.subscriptions.assertRegistrationCapacity();
      const principalId = randomUUID(); const at = new Date().toISOString();
      // Unknowable password keeps the existing credential schema intact; OTP is the login method.
      // Does not fabricate an email address or merge an existing family based on submitted details.
      await accountStore.createGuardianAccount({ principalId,
        credential: { id: randomUUID(), loginIdentifier: phone, passwordHash: await hashPassword(randomBytes(48).toString("base64url")) },
        profile: { displayName: input.displayName.trim(), preferredLanguage: input.language as "en" | "fr" },
        consents: ["guardian_declaration", "privacy_notice_and_terms"].map(consentType => ({ id: randomUUID(), guardianPrincipalId: principalId, consentType, noticeVersion: CONSENT_NOTICE_VERSION, method: CONSENT_METHOD, verificationStatus: "unverified", recordedAt: at })),
      });
      this.bindings.set(phone, principalId); this.principalPhones.set(principalId, phone);
      this.subscriptions.registerNewFamily(principalId);
      this.subscriptions.enrolNewFamily(principalId, `phone:${phone}`);
      this.audit(principalId, "phone_registration");
      return principalId;
    });
  }
  async linkVerified(phone: string, principalId: string, currentPassword: unknown): Promise<void> {
    return this.exclusive([`phone:${phone}`, `principal:${principalId}`], async () => {
      await requireFamilyAdult(principalId);
      const credential = (await accountStore.getCredentialByPrincipal(principalId))!;
      const auth = await authenticateWithPassword(credential.loginIdentifier, currentPassword);
      if (auth.principalId !== principalId || this.bindings.has(phone) || this.principalPhones.has(principalId) || await accountStore.getCredentialByLogin(phone)) throw new AccessError("verification_failed");
      if (this.bindings.size >= 1000) throw new AccessError("unavailable");
      this.bindings.set(phone, principalId); this.principalPhones.set(principalId, phone);
      if (this.subscriptions.isNewFamily(principalId)) this.subscriptions.enrolNewFamily(principalId, `phone:${phone}`);
      this.audit(principalId, "phone_linked");
      // Existing families are not granted new eligibility by linking; completed trials cannot restart.
    });
  }
  async loginVerified(phone: string): Promise<string> {
    assertLocalFamilyAccess();
    const principalId = this.bindings.get(phone);
    if (!principalId) throw new AccessError("verification_failed");
    await requireFamilyAdult(principalId);
    this.audit(principalId, "phone_login");
    return principalId;
  }
  async recoverVerified(phone: string, password: unknown): Promise<void> {
    return this.exclusive([`phone:${phone}`], async () => {
      const principalId = await this.loginVerified(phone);
      if (typeof password !== "string" || password.length < 8 || password.length > 128) throw new AccessError("invalid_request");
      const hash = await hashPassword(password);
      // Revoke every old session before resetting; a failed reset leaves those sessions closed.
      await revokeOtherPrincipalAuthSessions(principalId);
      await accountStore.updatePasswordHash(principalId, hash);
      const credential = (await accountStore.getCredentialByPrincipal(principalId))!;
      await accountStore.setSignInAttemptState(credential.id, { failedAttemptCount: 0 });
      this.audit(principalId, "phone_recovery_sessions_revoked");
    });
  }
}
const shared = globalThis as { __filumireLocalFamily?: {
  sms: MockSmsProvider; otp: OtpService; payments: MockPaymentProvider;
  subscriptions: SubscriptionService; phones: FamilyPhoneAccounts;
} };
export function localFamilyServices() {
  assertLocalFamilyAccess();
  if (!shared.__filumireLocalFamily) {
    const sms = new MockSmsProvider(); const payments = new MockPaymentProvider();
    // No published prices yet. Fixture catalogues are injected into isolated test services.
    const subscriptions = new SubscriptionService(payments);
    shared.__filumireLocalFamily = { sms, otp: new OtpService(sms), payments, subscriptions, phones: new FamilyPhoneAccounts(subscriptions) };
  }
  return shared.__filumireLocalFamily;
}
