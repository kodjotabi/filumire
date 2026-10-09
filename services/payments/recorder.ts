/*
 * Payment recorder (Payments Phase 2, step 2): durable, provider-independent
 * recording of payment attempts on top of the step 1 contract.
 *
 * Rules (see docs/handoff/PAYMENTS_PHASE2_STEP2.md):
 * - An attempt is saved ("created") BEFORE the provider is called, so a crash
 *   or timeout always leaves a record to reconcile.
 * - Idempotency key: same key + same request -> the same attempt (across
 *   restarts); same key + different request -> DUPLICATE_ATTEMPT_CONFLICT.
 * - Obligation (the specific purchase): at most one active attempt and one
 *   success, enforced by the store. A payer can pay several obligations at once.
 * - A failed initiation call is NOT a failed payment: it becomes "unknown" and
 *   blocks new attempts for the obligation until reconciled. Nothing is ever
 *   re-initiated automatically.
 * - Only verification decides: exact match -> succeeded (immutable); money
 *   moved but mismatched -> needs_review; provider-confirmed failure -> failed;
 *   provider unreachable -> unchanged.
 * - PAYMENT_NOT_FOUND (authoritative absence, see packages/payments/errors.ts)
 *   fails a created/unknown attempt only after the settle window; for a pending
 *   attempt (the provider had acknowledged it) it means needs_review.
 * - Checkout URLs are returned once to the caller and never stored or logged.
 * Grants nothing: entitlements are a later step.
 */
import { createHash, randomUUID } from "node:crypto";
import {
  ACTIVE_STATUSES,
  isActiveStatus,
  money,
  PaymentError,
  validatePaymentIntent,
  verifyAgainstExpectation,
  type InitiatedPayment,
  type Money,
  type ObservedPayment,
  type PaymentPayer,
  type PaymentProviderAdapter,
  type PaymentProviderId,
  type ProviderPaymentStatus,
  type VerificationFailure,
} from "../../packages/payments";
import type { AttemptPatch, PaymentAttemptRecord, PaymentAttemptStore, PaymentEventDetail, TransitionRequest } from "./store";

const KEY_PATTERN = /^[A-Za-z0-9._:-]{8,200}$/;
const OBLIGATION_PATTERN = /^[A-Za-z0-9._:-]{1,200}$/;
const PROVIDER_STATUSES: readonly ProviderPaymentStatus[] = ["pending", "successful", "failed", "abandoned", "reversed"];
const IDENTITY_FAILURES: readonly VerificationFailure[] = ["PROVIDER_MISMATCH", "REFERENCE_MISMATCH", "PROVIDER_REFERENCE_MISMATCH"];

export const DEFAULT_SETTLE_WINDOW_MS = 15 * 60 * 1000;

/* B3: position in a late-charge sweep (see reverifyClosedPage). Opaque to callers; safe to persist. */
export interface ClosedSweepCursor {
  since: Date;
  until: Date;
  after: { updatedAt: Date; id: string } | null;
}

export interface StartPaymentInput {
  /* Unique per checkout attempt, supplied by the caller (e.g. per button press / request). */
  idempotencyKey: string;
  /* The specific purchase being paid for. */
  obligationId: string;
  amount: Money;
  payer: PaymentPayer;
  description: string;
  billingAccountId?: string;
}

export type StartPaymentResult =
  /* New attempt accepted by the provider. `next` (checkout) is handed out here only, never stored. */
  | { kind: "initiated"; attempt: PaymentAttemptRecord; next: InitiatedPayment["next"] }
  /* Same idempotency key and request as before: the existing attempt (reconciled if due). */
  | { kind: "replayed"; attempt: PaymentAttemptRecord }
  /* Another attempt for this obligation is still active; no new charge was started. */
  | { kind: "obligation_in_progress"; attempt: PaymentAttemptRecord }
  /* The obligation is already paid; no new charge was started. */
  | { kind: "already_paid"; attempt: PaymentAttemptRecord }
  /* The provider call failed or answered unusably: outcome unknown, reconcile before anything else. */
  | { kind: "uncertain"; attempt: PaymentAttemptRecord }
  /* The adapter refused the request before sending it. */
  | { kind: "refused"; attempt: PaymentAttemptRecord };

export interface PaymentRecorderOptions {
  now?: () => Date;
  /* A created/unknown attempt is never failed on provider absence before this age. */
  settleWindowMs?: number;
  newId?: () => string;
}

export class PaymentRecorder {
  private readonly now: () => Date;
  private readonly settleWindowMs: number;
  private readonly newId: () => string;

  constructor(
    private readonly store: PaymentAttemptStore,
    private readonly adapter: PaymentProviderAdapter,
    options: PaymentRecorderOptions = {},
  ) {
    this.now = options.now ?? (() => new Date());
    this.settleWindowMs = options.settleWindowMs ?? DEFAULT_SETTLE_WINDOW_MS;
    this.newId = options.newId ?? randomUUID;
  }

  async startAttempt(input: StartPaymentInput): Promise<StartPaymentResult> {
    if (typeof input?.idempotencyKey !== "string" || !KEY_PATTERN.test(input.idempotencyKey)) {
      throw new PaymentError("INVALID_INTENT", "idempotencyKey must be 8-200 characters of letters, digits, '.', '_', ':' or '-'.");
    }
    if (typeof input.obligationId !== "string" || !OBLIGATION_PATTERN.test(input.obligationId)) {
      throw new PaymentError("INVALID_INTENT", "obligationId must be 1-200 characters of letters, digits, '.', '_', ':' or '-'.");
    }
    const id = this.newId();
    const intent = {
      ourReference: `FLM-${id.replace(/-/g, "")}`,
      amount: input.amount,
      payer: input.payer,
      description: input.description,
      billingAccountId: input.billingAccountId,
    };
    validatePaymentIntent(intent);
    const fingerprint = this.fingerprint(input);

    for (let round = 0; round < 3; round += 1) {
      const existing = await this.store.findByIdempotencyKey(input.idempotencyKey);
      if (existing) {
        if (existing.requestFingerprint !== fingerprint) {
          throw new PaymentError("DUPLICATE_ATTEMPT_CONFLICT", "This idempotency key was already used for a different payment request.");
        }
        return { kind: "replayed", attempt: await this.reconcileRecord(existing) };
      }

      const blocking = await this.checkObligation(input.obligationId);
      if (blocking) return blocking;

      const created = await this.store.create({
        id,
        idempotencyKey: input.idempotencyKey,
        obligationId: input.obligationId,
        ourReference: intent.ourReference,
        requestFingerprint: fingerprint,
        provider: this.adapter.id,
        mode: this.adapter.mode,
        payerPrincipalId: input.payer.principalId,
        billingAccountId: input.billingAccountId ?? null,
        amountMinor: input.amount.amountMinor,
        currency: input.amount.currency,
        createdAt: this.now(),
      });
      if (created.created) {
        return this.initiate(created.attempt, intent);
      }
      if (created.conflict === "our_reference") {
        throw new PaymentError("PERSISTENCE_ERROR", "Generated payment reference collided; retry.");
      }
      /* Lost a race (same key or same obligation): re-read and decide again. */
    }
    throw new PaymentError("PERSISTENCE_ERROR", "Could not record the payment attempt after concurrent updates; retry.");
  }

  /* Re-asks the provider about one attempt and records the outcome. Safe to repeat. */
  async reconcile(attemptId: string): Promise<PaymentAttemptRecord> {
    const attempt = await this.store.findById(attemptId);
    if (!attempt) throw new PaymentError("INVALID_INTENT", "Unknown payment attempt.");
    return this.reconcileRecord(attempt);
  }

  /* Reconciliation sweep over active attempts (oldest first). */
  async reconcileActive(limit = 50): Promise<PaymentAttemptRecord[]> {
    const active = await this.store.listActive(this.now(), limit);
    const results: PaymentAttemptRecord[] = [];
    for (const attempt of active) {
      if (attempt.provider !== this.adapter.id) continue;
      results.push(await this.reconcileRecord(attempt));
    }
    return results;
  }

  private fingerprint(input: StartPaymentInput): string {
    return createHash("sha256")
      .update(
        JSON.stringify([
          input.obligationId,
          input.amount.amountMinor,
          input.amount.currency,
          input.payer.principalId,
          input.billingAccountId ?? null,
          this.adapter.id,
          this.adapter.mode,
        ]),
      )
      .digest("hex");
  }

  private async checkObligation(obligationId: string): Promise<StartPaymentResult | null> {
    const attempts = await this.store.listByObligation(obligationId);
    const paid = attempts.find((a) => a.status === "succeeded");
    if (paid) return { kind: "already_paid", attempt: paid };
    if (attempts.some((a) => a.status === "needs_review")) {
      throw new PaymentError("OBLIGATION_NEEDS_REVIEW", "A payment for this obligation needs review before another attempt.");
    }
    const active = attempts.find((a) => isActiveStatus(a.status));
    if (!active) return null;
    const reconciled = await this.reconcileRecord(active);
    if (reconciled.status === "succeeded") return { kind: "already_paid", attempt: reconciled };
    if (reconciled.status === "needs_review") {
      throw new PaymentError("OBLIGATION_NEEDS_REVIEW", "A payment for this obligation needs review before another attempt.");
    }
    if (isActiveStatus(reconciled.status)) return { kind: "obligation_in_progress", attempt: reconciled };
    return null;
  }

  private async initiate(attempt: PaymentAttemptRecord, intent: Parameters<PaymentProviderAdapter["initiate"]>[0]): Promise<StartPaymentResult> {
    let initiated: InitiatedPayment;
    try {
      initiated = await this.adapter.initiate(intent);
    } catch (error) {
      const code = error instanceof PaymentError ? error.code : "UNEXPECTED";
      if (code === "INVALID_INTENT") {
        const refused = await this.move(attempt, ["created"], "failed", "initiation_refused", { errorCode: code }, { lastErrorCode: code });
        return { kind: "refused", attempt: refused };
      }
      const uncertain = await this.move(attempt, ["created"], "unknown", "initiation_uncertain", { errorCode: code }, { lastErrorCode: code });
      return { kind: "uncertain", attempt: uncertain };
    }

    if (
      initiated.provider !== this.adapter.id ||
      initiated.ourReference !== attempt.ourReference ||
      typeof initiated.providerReference !== "string" ||
      initiated.providerReference === ""
    ) {
      const code = "PROVIDER_RESPONSE_INVALID";
      const uncertain = await this.move(attempt, ["created"], "unknown", "initiation_uncertain", { errorCode: code }, { lastErrorCode: code });
      return { kind: "uncertain", attempt: uncertain };
    }

    const result = await this.store.transition(attempt.id, {
      from: ["created"],
      to: "pending",
      patch: { providerReference: initiated.providerReference },
      event: { type: "initiated", detail: { providerReference: initiated.providerReference, nextType: initiated.next.type } },
      at: this.now(),
    });
    if (result.applied) return { kind: "initiated", attempt: result.attempt, next: initiated.next };

    /* A reconciliation ran while we were waiting for the provider. */
    const current = result.attempt;
    if (current.status === "failed") {
      const flagged = await this.move(current, ["failed"], "needs_review", "initiated_after_resolution", { providerReference: initiated.providerReference });
      return { kind: "uncertain", attempt: flagged };
    }
    if (current.status === "pending" || current.status === "unknown") {
      return { kind: "initiated", attempt: current, next: initiated.next };
    }
    return { kind: "replayed", attempt: current };
  }

  private async reconcileRecord(attempt: PaymentAttemptRecord): Promise<PaymentAttemptRecord> {
    if (!isActiveStatus(attempt.status)) return attempt;
    if (attempt.provider !== this.adapter.id) {
      throw new PaymentError("CONFIGURATION", `Attempt belongs to provider "${attempt.provider}", not "${this.adapter.id}".`);
    }
    const age = this.now().getTime() - attempt.createdAt.getTime();
    /* A fresh created attempt may still be initiating in another request. */
    if (attempt.status === "created" && age < this.settleWindowMs) return attempt;

    let observed;
    try {
      observed = await this.adapter.verify(attempt.ourReference);
    } catch (error) {
      const code = error instanceof PaymentError ? error.code : "UNEXPECTED";
      if (code === "PAYMENT_NOT_FOUND") {
        if (attempt.status === "pending") {
          return this.move(attempt, ["pending"], "needs_review", "provider_record_missing", { errorCode: code }, { lastErrorCode: code }, true);
        }
        if (age >= this.settleWindowMs) {
          return this.move(attempt, ["created", "unknown"], "failed", "provider_has_no_record", { errorCode: code }, { lastErrorCode: code }, true);
        }
        return this.move(attempt, ACTIVE_STATUSES, undefined, "provider_absent_within_settle_window", { errorCode: code }, { lastErrorCode: code }, true);
      }
      return this.move(attempt, ACTIVE_STATUSES, undefined, "verification_unavailable", { errorCode: code }, { lastErrorCode: code }, true);
    }

    const { confirmed, failures, observedStatus, patch, identityOk, detail } = this.observation(attempt, observed);

    if (confirmed) {
      return this.move(attempt, ACTIVE_STATUSES, "succeeded", "verified_succeeded", detail, { ...patch, confirmedAt: this.now() }, true);
    }
    if (failures.includes("AMOUNT_NOT_INTEGER") || observedStatus === null) {
      return this.move(attempt, ACTIVE_STATUSES, undefined, "verification_unusable", detail, patch, true);
    }
    if (!identityOk || observedStatus === "successful" || observedStatus === "reversed") {
      return this.move(attempt, ACTIVE_STATUSES, "needs_review", "verified_mismatch", detail, patch, true);
    }
    if (observedStatus === "failed" || observedStatus === "abandoned") {
      return this.move(attempt, ACTIVE_STATUSES, "failed", "verified_failed", detail, patch, true);
    }
    return this.move(attempt, ACTIVE_STATUSES, "pending", "verified_pending", detail, patch, true);
  }

  /*
   * Step 3: re-asks the provider about a CLOSED attempt (failed, needs_review or succeeded) so a late or
   * duplicate charge, or a reversal, is never silently lost (reconcile() ignores closed attempts). Never
   * re-initiates, never fails or un-fails anything, never edits a succeeded attempt:
   * - failed + money moved (successful, reversed) or not identifiably ours -> needs_review;
   * - needs_review -> same status, observation recorded (an obligation-aware store records the receipt);
   * - succeeded -> the store's recordPostSuccessObservation (if any) records an exception.
   * Provider unreachable / no record -> unchanged. Active attempts go through reconcile().
   */
  async reverifyClosed(attemptId: string): Promise<PaymentAttemptRecord> {
    const attempt = await this.store.findById(attemptId);
    if (!attempt) throw new PaymentError("INVALID_INTENT", "Unknown payment attempt.");
    if (isActiveStatus(attempt.status)) return this.reconcileRecord(attempt);
    if (attempt.provider !== this.adapter.id) {
      throw new PaymentError("CONFIGURATION", `Attempt belongs to provider "${attempt.provider}", not "${this.adapter.id}".`);
    }
    let observed;
    try {
      observed = await this.adapter.verify(attempt.ourReference);
    } catch {
      return attempt;
    }
    const { failures, observedStatus, patch, identityOk, detail } = this.observation(attempt, observed);
    if (failures.includes("AMOUNT_NOT_INTEGER") || observedStatus === null) return attempt;

    if (attempt.status === "succeeded") {
      await this.store.recordPostSuccessObservation?.(attempt.id, { observedStatus, failures }, this.now());
      return attempt;
    }
    if (attempt.status === "failed") {
      if (!identityOk || observedStatus === "successful" || observedStatus === "reversed") {
        return this.move(attempt, ["failed"], "needs_review", "verified_after_failure", detail, patch, true);
      }
      return attempt;
    }
    return this.move(attempt, ["needs_review"], undefined, "reverified", detail, patch, true);
  }

  /*
   * Step 3: late-charge sweep. Re-verifies closed attempts updated within the look-back window (oldest
   * first), so a charge confirmed after an attempt was marked failed is found without anyone asking.
   * Needs a store that can list closed attempts. Charges FILUMIRE never recorded at all still need the
   * provider's transaction listing (a later step).
   * B3: this is the FIRST PAGE only (`limit` attempts). A scheduler must use reverifyClosedPage and walk
   * the cursor to the end, otherwise attempts that stay unchanged (e.g. still failed) keep the oldest
   * page full and newer attempts in the window are never re-verified.
   */
  async reverifyRecentlyClosed(lookbackMs: number, limit = 50): Promise<PaymentAttemptRecord[]> {
    return (await this.reverifyClosedPage(null, lookbackMs, limit)).results;
  }

  /*
   * B3: one page of the late-charge sweep. Pass `cursor: null` to start a sweep: the window is fixed then
   * as [now - lookbackMs, now], so attempts re-verified during the sweep (their updatedAt moves past
   * `until`) are not visited twice and the walk always ends. Keep calling with the returned cursor until it
   * is null. Each attempt is re-verified with its own provider call and its own store transaction; nothing
   * is held open between pages.
   */
  async reverifyClosedPage(
    cursor: ClosedSweepCursor | null,
    lookbackMs: number,
    limit = 50,
  ): Promise<{ results: PaymentAttemptRecord[]; cursor: ClosedSweepCursor | null }> {
    if (!this.store.listClosedUpdatedSince) {
      throw new PaymentError("CONFIGURATION", "This payment store cannot list closed attempts.");
    }
    if (!Number.isSafeInteger(limit) || limit < 1 || limit > 500) {
      throw new PaymentError("CONFIGURATION", "Sweep page size must be an integer from 1 to 500.");
    }
    const now = this.now();
    const window: ClosedSweepCursor = cursor ?? { since: new Date(now.getTime() - lookbackMs), until: now, after: null };
    const page = await this.store.listClosedUpdatedSince(window.since, limit, { until: window.until, after: window.after });
    const results: PaymentAttemptRecord[] = [];
    for (const attempt of page) {
      if (attempt.provider !== this.adapter.id) continue;
      results.push(await this.reverifyClosed(attempt.id));
    }
    const last = page.at(-1);
    const next = page.length < limit || !last ? null : { ...window, after: { updatedAt: last.updatedAt, id: last.id } };
    return { results, cursor: next };
  }

  /* Compares one provider observation with the attempt (shared by reconcile and reverifyClosed). */
  private observation(attempt: PaymentAttemptRecord, observed: ObservedPayment) {
    const expected = {
      provider: attempt.provider as PaymentProviderId,
      ourReference: attempt.ourReference,
      amount: money(attempt.amountMinor, attempt.currency),
      providerReference: attempt.providerReference ?? undefined,
    };
    const result = verifyAgainstExpectation(expected, observed);
    const failures = result.confirmed ? [] : result.failures;
    const observedStatus = PROVIDER_STATUSES.includes(observed.status) ? observed.status : null;
    const patch: AttemptPatch = {
      observedStatus,
      observedAmountMinor: Number.isSafeInteger(observed.amountMinor) ? observed.amountMinor : null,
      observedCurrency: typeof observed.currency === "string" ? observed.currency.slice(0, 8) : null,
      verificationFailures: failures,
      lastErrorCode: null,
    };
    const identityOk = !failures.some((f) => IDENTITY_FAILURES.includes(f));
    if (identityOk && attempt.providerReference === null && typeof observed.providerReference === "string" && observed.providerReference !== "") {
      patch.providerReference = observed.providerReference;
    }
    const detail: PaymentEventDetail = {
      observedStatus: observedStatus ?? "unrecognised",
      observedAmountMinor: patch.observedAmountMinor ?? null,
      observedCurrency: patch.observedCurrency ?? null,
      failures,
    };
    return { confirmed: result.confirmed, failures, observedStatus, patch, identityOk, detail };
  }

  private async move(
    attempt: PaymentAttemptRecord,
    from: TransitionRequest["from"],
    to: TransitionRequest["to"],
    eventType: string,
    detail: PaymentEventDetail,
    patch: AttemptPatch = {},
    incrementVerifyCount = false,
  ): Promise<PaymentAttemptRecord> {
    const result = await this.store.transition(attempt.id, {
      from,
      to,
      patch,
      incrementVerifyCount,
      event: { type: eventType, detail },
      at: this.now(),
    });
    return result.attempt;
  }
}
