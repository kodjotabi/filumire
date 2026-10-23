import { createHmac, randomBytes, randomInt, randomUUID, timingSafeEqual } from "node:crypto";
import { normaliseGhanaMobile } from "./phone";

export type OtpPurpose = "register" | "login" | "link" | "recover";
export interface SmsProvider { send(phone: string, code: string, challengeId: string): Promise<void> }
export class AccessError extends Error {
  constructor(public readonly code: "unavailable" | "invalid_phone" | "invalid_request" | "verification_failed" | "rate_limited" | "forbidden" | "payment_failed") { super(code); }
}
export const FICTIONAL_PHONES = ["+233200000001", "+233200000002", "+233500000003", "+233500000004"] as const;
/** These are development fixtures, not a claim that the numbers are globally reserved. No transport. */
export class MockSmsProvider implements SmsProvider {
  private outbox = new Map<string, { phone: string; code: string }>();
  async send(phone: string, code: string, challengeId: string) {
    assertLocalFamilyAccess();
    if (!(FICTIONAL_PHONES as readonly string[]).includes(phone)) throw new AccessError("invalid_phone");
    if (this.outbox.size >= 1000) this.outbox.delete(this.outbox.keys().next().value!);
    this.outbox.set(challengeId, { phone, code });
  }
  /** Test harness only; never included in an HTTP response or log. */
  takeCode(challengeId: string): string {
    assertLocalFamilyAccess();
    const delivery = this.outbox.get(challengeId);
    this.outbox.delete(challengeId);
    if (!delivery) throw new AccessError("verification_failed");
    return delivery.code;
  }
}
export function localFamilyAccessEnabled(): boolean {
  // Phone accounts cannot be on the private-review email list.
  return process.env.FILUMIRE_ACCESS_MODE !== "reviewers" &&
    process.env.FILUMIRE_LOCAL_FAMILY_ACCESS === "mock" &&
    process.env.NODE_ENV !== "production" &&
    !process.env.VERCEL && !process.env.VERCEL_ENV &&
    (process.env.FILUMIRE_PERSISTENCE ?? "memory") === "memory";
}
export function assertLocalFamilyAccess(): void {
  if (!localFamilyAccessEnabled()) throw new AccessError("unavailable");
}
interface Challenge {
  phone: string; purpose: OtpPurpose; actor: string; digest: Buffer;
  expiresAt: number; attempts: number;
}
/** In-process prototype only. Atomic consumption before asynchronous account operations. */
export class OtpService {
  private key = randomBytes(32);
  private challenges = new Map<string, Challenge>();
  private windows = new Map<string, { until: number; count: number }>();
  private latest = new Map<string, { id: string; resendAt: number; expiresAt: number }>();
  constructor(private sms: SmsProvider, private clock: () => number = Date.now) {}
  private digest(id: string, phone: string, purpose: string, actor: string, code: string): Buffer {
    return createHmac("sha256", this.key).update(JSON.stringify([id, phone, purpose, actor, code])).digest();
  }
  private consume(key: string, limit: number, ms: number): void {
    const now = this.clock();
    for (const [k, w] of this.windows) if (w.until <= now) this.windows.delete(k);
    if (this.windows.size >= 5000 && !this.windows.has(key)) throw new AccessError("rate_limited");
    const window = this.windows.get(key) ?? { until: now + ms, count: 0 };
    window.count++; this.windows.set(key, window);
    if (window.count > limit) throw new AccessError("rate_limited");
  }
  async start(value: unknown, purpose: OtpPurpose, actor: string, address: string) {
    assertLocalFamilyAccess();
    let phone: string;
    try { phone = normaliseGhanaMobile(value); } catch { throw new AccessError("invalid_phone"); }
    if (!actor || actor.length > 256 || !["register", "login", "link", "recover"].includes(purpose)) throw new AccessError("invalid_request");
    // One cooldown and hourly budget across every purpose and browser for a phone.
    const phoneKey = createHmac("sha256", this.key).update(phone).digest("hex");
    this.consume(`ip:${address}`, 20, 3600_000);
    this.consume(`phone:${phoneKey}`, 5, 3600_000);
    const now = this.clock();
    for (const [id, entry] of this.challenges) if (entry.expiresAt <= now) this.challenges.delete(id);
    for (const [key, entry] of this.latest) if (entry.expiresAt <= now) this.latest.delete(key);
    if (this.challenges.size >= 1000) throw new AccessError("rate_limited");
    const previous = this.latest.get(phoneKey);
    if (previous && previous.resendAt > now) throw new AccessError("rate_limited");
    if (previous) this.challenges.delete(previous.id);
    const id = randomUUID(); const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
    const expiresAt = now + 5 * 60_000;
    this.challenges.set(id, { phone, purpose, actor, digest: this.digest(id, phone, purpose, actor, code), expiresAt, attempts: 0 });
    this.latest.set(phoneKey, { id, resendAt: now + 60_000, expiresAt });
    try { await this.sms.send(phone, code, id); }
    catch { this.challenges.delete(id); throw new AccessError("unavailable"); }
    // No account lookup or existence signal at the challenge stage.
    return { challengeId: id, expiresAt: new Date(expiresAt).toISOString(), resendAfterSeconds: 60 };
  }
  verify(id: unknown, code: unknown, purpose: OtpPurpose, actor: string, address: string): string {
    assertLocalFamilyAccess();
    this.consume(`verify-ip:${address}`, 30, 60_000);
    const entry = typeof id === "string" ? this.challenges.get(id) : undefined;
    if (!entry || entry.expiresAt <= this.clock()) {
      if (typeof id === "string") this.challenges.delete(id);
      throw new AccessError("verification_failed");
    }
    entry.attempts++;
    const valid = typeof code === "string" && /^\d{6}$/.test(code) && entry.purpose === purpose && entry.actor === actor &&
      timingSafeEqual(entry.digest, this.digest(id as string, entry.phone, purpose, actor, code));
    if (valid || entry.attempts >= 5) this.challenges.delete(id as string);
    if (!valid) throw new AccessError("verification_failed");
    return entry.phone;
  }
}
