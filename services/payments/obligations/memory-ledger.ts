/*
 * In-memory payment ledger (Payments Phase 2, step 3, B2): payment attempts
 * (step 2 rules, inherited) + obligations, beneficiary evidence, receipts,
 * financial exceptions and obligation events, following the contracts that
 * migration 0019 will enforce in PostgreSQL.
 *
 * Transactions: every write runs under one store-wide mutex, against a
 * snapshot that is restored if anything throws, so each operation is
 * all-or-nothing. This proves the RULES; it proves nothing about PostgreSQL
 * locking, durability or crash recovery (B4/B5). Not durable: tests and local
 * development only.
 *
 * Order inside an attempt transition (mirrors the planned Postgres store):
 * 1. attempt transition (step 2 lifecycle);
 * 2. receipt recording, if the provider confirmed money moved (records, decides nothing);
 * 3. settlement decision (decideObligationOutcome) and its effects: settle, review, exceptions.
 */
import { randomUUID } from "node:crypto";
import {
  canTransitionObligation,
  decideObligationOutcome,
  decidePostSuccessObservation,
  evaluateGuardianV1,
  EXCEPTION_BLOCKS_FULFILMENT,
  isActiveStatus,
  isOperatorOnlyTransition,
  MERCHANT_CONTEXT_PATTERN,
  PaymentError,
  receiptCandidate,
  receiptMatchesObligation,
  type BeneficiaryEvidence,
  type FinancialException,
  type FinancialExceptionKind,
  type ObligationOutcome,
  type ObligationStatus,
  type PaymentAttemptStatus,
  type PaymentObligation,
  type PaymentReceipt,
} from "../../../packages/payments";
import { selectClosedPage, type ClosedAttemptPage, type CreateResult, type NewPaymentAttempt, type PaymentAttemptRecord, type PostSuccessObservation, type TransitionRequest, type TransitionResult } from "../store";
import { MemoryPaymentAttemptStore } from "../store/memory";
import { beneficiaryRefusal, recheckEvidence, type PaymentIdentityDirectory } from "./authorization";
import { assertSnapshotHash, validateNewObligation } from "./validate";
import type {
  CreateObligationResult,
  NewObligation,
  ObligationEvent,
  ObligationEventDetail,
  ObligationStore,
  ObligationTransitionResult,
} from "./store";

export type LedgerFaultPoint = "after_attempt_transition" | "after_receipt" | "after_settlement";

export interface MemoryPaymentLedgerOptions {
  directory: PaymentIdentityDirectory;
  /* Scopes receipts: (provider, mode, merchant context, provider reference) is unique. */
  merchantContext: string;
  /* Tests only: throw at a point inside a transaction to prove it is all-or-nothing. */
  faultHook?: (point: LedgerFaultPoint) => void;
}

interface LedgerState {
  attempts: Map<string, PaymentAttemptRecord>;
  events: Map<string, unknown[]>;
  obligations: Map<string, PaymentObligation>;
  beneficiaries: Map<string, BeneficiaryEvidence[]>;
  receipts: Map<string, PaymentReceipt>;
  exceptions: Map<string, FinancialException>;
  obligationEvents: Map<string, ObligationEvent[]>;
}

function refill<K, V>(target: Map<K, V>, source: Map<K, V>): void {
  target.clear();
  for (const [key, value] of source) target.set(key, value);
}

export class MemoryPaymentLedger extends MemoryPaymentAttemptStore implements ObligationStore {
  private readonly obligations = new Map<string, PaymentObligation>();
  private readonly beneficiaries = new Map<string, BeneficiaryEvidence[]>();
  private readonly receipts = new Map<string, PaymentReceipt>();
  private readonly exceptions = new Map<string, FinancialException>();
  private readonly obligationEvents = new Map<string, ObligationEvent[]>();
  private queue: Promise<unknown> = Promise.resolve();

  constructor(private readonly options: MemoryPaymentLedgerOptions) {
    super();
    if (!MERCHANT_CONTEXT_PATTERN.test(options.merchantContext ?? "")) {
      throw new PaymentError("CONFIGURATION", "merchantContext must be 3-64 characters of a-z, 0-9, ':', '.', '_' or '-'.");
    }
  }

  /* ---------- transactions ---------- */

  private exclusive<T>(work: () => Promise<T>): Promise<T> {
    const run = this.queue.then(work, work);
    this.queue = run.catch(() => {});
    return run;
  }

  private state(): LedgerState {
    return {
      attempts: this.attempts,
      events: this.events as Map<string, unknown[]>,
      obligations: this.obligations,
      beneficiaries: this.beneficiaries,
      receipts: this.receipts,
      exceptions: this.exceptions,
      obligationEvents: this.obligationEvents,
    };
  }

  private atomic<T>(work: () => Promise<T>): Promise<T> {
    return this.exclusive(async () => {
      const saved = structuredClone(this.state());
      try {
        return await work();
      } catch (error) {
        const live = this.state();
        for (const key of Object.keys(live) as Array<keyof LedgerState>) {
          refill(live[key] as Map<string, unknown>, saved[key] as Map<string, unknown>);
        }
        throw error;
      }
    });
  }

  private fault(point: LedgerFaultPoint): void {
    this.options.faultHook?.(point);
  }

  /* ---------- obligations ---------- */

  async createObligation(input: NewObligation): Promise<CreateObligationResult> {
    const { obligation: o, evidence, learnerIds } = validateNewObligation(input);

    return this.atomic(async () => {
      const existing = [...this.obligations.values()].find((x) => x.payerPrincipalId === o.payerPrincipalId && x.creationKey === o.creationKey);
      if (existing) return { created: false, existing: structuredClone(existing) } as CreateObligationResult;
      if (this.obligations.has(o.id)) throw new PaymentError("PERSISTENCE_ERROR", "Obligation id already exists.");

      /* Seal check (0019: deferred constraint trigger): the hash must match the columns and beneficiary rows. */
      assertSnapshotHash(o, learnerIds);

      /* Evidence check (0019: beneficiary insert trigger, access row read FOR SHARE). */
      for (const item of evidence) {
        const access = await this.options.directory.findAccessById(item.accessId);
        if (!evaluateGuardianV1(o.payerPrincipalId, item.learnerId, access).ok) throw beneficiaryRefusal();
      }

      const stored = structuredClone(o);
      this.obligations.set(o.id, stored);
      this.beneficiaries.set(o.id, structuredClone(evidence));
      this.appendObligationEvent(stored, "created", null, "open", o.createdAt, { productCode: o.productCode, amountMinor: o.amountMinor }, "payer", o.payerPrincipalId);
      return { created: true, obligation: structuredClone(stored) } as CreateObligationResult;
    });
  }

  async findObligation(id: string): Promise<PaymentObligation | null> {
    const found = this.obligations.get(id);
    return found ? structuredClone(found) : null;
  }

  async findObligationByCreationKey(payerPrincipalId: string, creationKey: string): Promise<PaymentObligation | null> {
    const found = [...this.obligations.values()].find((x) => x.payerPrincipalId === payerPrincipalId && x.creationKey === creationKey);
    return found ? structuredClone(found) : null;
  }

  async listBeneficiaries(obligationId: string): Promise<BeneficiaryEvidence[]> {
    return structuredClone(this.beneficiaries.get(obligationId) ?? []);
  }

  async listReceipts(obligationId: string): Promise<PaymentReceipt[]> {
    return structuredClone([...this.receipts.values()].filter((r) => r.obligationId === obligationId));
  }

  async listExceptions(obligationId: string): Promise<FinancialException[]> {
    return structuredClone([...this.exceptions.values()].filter((e) => e.obligationId === obligationId));
  }

  async listObligationEvents(obligationId: string): Promise<ObligationEvent[]> {
    return structuredClone(this.obligationEvents.get(obligationId) ?? []);
  }

  async cancelObligation(obligationId: string, payerPrincipalId: string, at: Date): Promise<ObligationTransitionResult> {
    return this.atomic(async () => {
      const o = this.obligations.get(obligationId);
      if (!o || o.payerPrincipalId !== payerPrincipalId) throw new PaymentError("OBLIGATION_NOT_FOUND", "Unknown payment obligation.");
      if (o.status !== "open") return { applied: false, obligation: structuredClone(o) };
      if (this.activeAttempts(obligationId).length > 0) {
        throw new PaymentError("OBLIGATION_PAYMENT_IN_PROGRESS", "A payment for this obligation is in progress; it cannot be cancelled now.");
      }
      if ([...this.receipts.values()].some((r) => r.obligationId === obligationId)) {
        throw new PaymentError("OBLIGATION_NOT_PAYABLE", "Money was received for this obligation; it needs review.");
      }
      this.moveObligation(o, "cancelled", "cancelled", at, {}, {}, "payer", payerPrincipalId);
      return { applied: true, obligation: structuredClone(o) };
    });
  }

  async expireObligation(obligationId: string, at: Date): Promise<ObligationTransitionResult> {
    return this.atomic(async () => {
      const o = this.obligations.get(obligationId);
      if (!o) throw new PaymentError("OBLIGATION_NOT_FOUND", "Unknown payment obligation.");
      if (o.status !== "open" || at.getTime() < o.expiresAt.getTime() || this.activeAttempts(obligationId).length > 0) {
        return { applied: false, obligation: structuredClone(o) };
      }
      this.moveObligation(o, "expired", "expired", at, {});
      return { applied: true, obligation: structuredClone(o) };
    });
  }

  async listExpirable(at: Date, limit: number): Promise<PaymentObligation[]> {
    return [...this.obligations.values()]
      .filter((o) => o.status === "open" && o.expiresAt.getTime() <= at.getTime())
      .sort((a, b) => a.expiresAt.getTime() - b.expiresAt.getTime())
      .slice(0, limit)
      .map((o) => structuredClone(o));
  }

  /* ---------- attempts bound to obligations ---------- */

  /* 0019: composite FK (payer, amount, currency, mode) + BEFORE INSERT trigger (open, unexpired) + evidence re-check. */
  override async create(input: NewPaymentAttempt): Promise<CreateResult> {
    return this.atomic(async () => {
      const o = this.obligations.get(input.obligationId);
      if (!o) throw new PaymentError("OBLIGATION_NOT_FOUND", "Unknown payment obligation.");
      if (
        o.payerPrincipalId !== input.payerPrincipalId ||
        o.amountMinor !== input.amountMinor ||
        o.currency !== input.currency ||
        o.mode !== input.mode
      ) {
        throw new PaymentError("OBLIGATION_MISMATCH", "The payment does not match its obligation (payer, amount, currency or mode).");
      }
      if (o.status === "settled") return { created: false, conflict: "obligation_succeeded" } as CreateResult;
      if (o.status === "review") throw new PaymentError("OBLIGATION_NEEDS_REVIEW", "A payment for this obligation needs review before another attempt.");
      if (o.status !== "open" || input.createdAt.getTime() >= o.expiresAt.getTime()) {
        throw new PaymentError("OBLIGATION_NOT_PAYABLE", "This obligation is no longer payable.");
      }
      const recheck = await recheckEvidence(this.options.directory, o.payerPrincipalId, this.beneficiaries.get(o.id) ?? []);
      if (!recheck.allAuthorized) throw beneficiaryRefusal();
      return super.create(input);
    });
  }

  override async transition(attemptId: string, request: TransitionRequest): Promise<TransitionResult> {
    return this.atomic(async () => {
      const before = this.attempts.get(attemptId);
      const newReference = request.patch?.providerReference;
      if (before && typeof newReference === "string") {
        /* Parity with 0018 UNIQUE(provider, provider_reference). */
        const clash = [...this.attempts.values()].some((a) => a.id !== attemptId && a.provider === before.provider && a.providerReference === newReference);
        if (clash) throw new PaymentError("PERSISTENCE_ERROR", "This provider reference already belongs to another payment attempt.");
      }
      const beforeStatus: PaymentAttemptStatus | undefined = before?.status;
      const result = await super.transition(attemptId, request);
      if (!result.applied || beforeStatus === undefined) return result;
      this.fault("after_attempt_transition");
      await this.applyAttemptOutcome(beforeStatus, this.attempts.get(attemptId)!, request.event.type, request.at);
      return { applied: true, attempt: { ...this.attempts.get(attemptId)! } };
    });
  }

  async recordPostSuccessObservation(attemptId: string, observation: PostSuccessObservation, at: Date): Promise<void> {
    await this.atomic(async () => {
      const attempt = this.attempts.get(attemptId);
      if (!attempt || attempt.status !== "succeeded") throw new PaymentError("PERSISTENCE_ERROR", "Post-success observations apply to succeeded attempts only.");
      const o = this.obligations.get(attempt.obligationId);
      if (!o) throw new PaymentError("PERSISTENCE_ERROR", "Attempt is not bound to an obligation.");
      const kind = decidePostSuccessObservation(observation.observedStatus, observation.failures);
      if (!kind) return;
      const receipt = [...this.receipts.values()].find((r) => r.attemptId === attemptId) ?? null;
      this.openException(o, kind, attemptId, receipt?.id ?? null, at);
    });
  }

  async listClosedUpdatedSince(since: Date, limit: number, page?: ClosedAttemptPage): Promise<PaymentAttemptRecord[]> {
    return selectClosedPage(this.attempts.values(), (a) => !isActiveStatus(a.status), since, limit, page);
  }

  /* ---------- internals (always inside atomic) ---------- */

  private activeAttempts(obligationId: string): PaymentAttemptRecord[] {
    return [...this.attempts.values()].filter((a) => a.obligationId === obligationId && isActiveStatus(a.status));
  }

  private async applyAttemptOutcome(from: PaymentAttemptStatus, attempt: PaymentAttemptRecord, eventType: string, at: Date): Promise<void> {
    if (attempt.status !== "succeeded" && attempt.status !== "needs_review") return;
    const o = this.obligations.get(attempt.obligationId);
    if (!o) throw new PaymentError("PERSISTENCE_ERROR", "Attempt is not bound to an obligation.");

    /* 1. Receipt: money that moved. Decides nothing. */
    const receipt = this.recordReceipt(attempt, at);
    this.fault("after_receipt");

    /* 2. Settlement decision, separately. */
    const beneficiariesAuthorized =
      attempt.status === "succeeded" && o.status === "open"
        ? (await recheckEvidence(this.options.directory, o.payerPrincipalId, this.beneficiaries.get(o.id) ?? [])).allAuthorized
        : true;
    const outcome = decideObligationOutcome({
      obligationStatus: o.status,
      attemptFrom: from,
      attemptTo: attempt.status,
      eventType,
      verificationFailures: attempt.verificationFailures ?? [],
      observedStatus: attempt.observedStatus,
      receipt: receipt ? { exact: receiptMatchesObligation(receipt, o), currencyMatches: receipt.currency === o.currency } : null,
      beneficiariesAuthorized,
    });
    this.applyOutcome(o, outcome, receipt, attempt, eventType, at);
  }

  private recordReceipt(attempt: PaymentAttemptRecord, at: Date): PaymentReceipt | null {
    const candidate = receiptCandidate(attempt);
    if (!candidate) return null;
    const existing = [...this.receipts.values()].find((r) => r.attemptId === attempt.id);
    if (existing) {
      if (existing.providerReference !== candidate.providerReference) {
        throw new PaymentError("PERSISTENCE_ERROR", "A receipt for this attempt already exists with another provider reference.");
      }
      return existing;
    }
    const clash = [...this.receipts.values()].some(
      (r) =>
        r.provider === attempt.provider &&
        r.mode === attempt.mode &&
        r.merchantContext === this.options.merchantContext &&
        r.providerReference === candidate.providerReference,
    );
    if (clash) throw new PaymentError("PERSISTENCE_ERROR", "This provider charge is already recorded for another attempt.");
    const receipt: PaymentReceipt = {
      id: randomUUID(),
      attemptId: attempt.id,
      obligationId: attempt.obligationId,
      provider: attempt.provider,
      mode: attempt.mode,
      merchantContext: this.options.merchantContext,
      providerReference: candidate.providerReference,
      amountMinor: candidate.amountMinor,
      currency: candidate.currency,
      verifiedAt: attempt.confirmedAt ?? at,
      recordedAt: at,
    };
    this.receipts.set(receipt.id, receipt);
    return receipt;
  }

  private applyOutcome(
    o: PaymentObligation,
    outcome: ObligationOutcome,
    receipt: PaymentReceipt | null,
    attempt: PaymentAttemptRecord,
    cause: string,
    at: Date,
  ): void {
    if (outcome.settle) {
      /* 0019: settlement FK to an exact receipt of THIS obligation; UNIQUE settled_receipt_id; one settled event. */
      if (!receipt || !receiptMatchesObligation(receipt, o)) throw new PaymentError("PERSISTENCE_ERROR", "Settlement requires an exact receipt.");
      if (o.status !== "open" || o.settledReceiptId !== null) throw new PaymentError("PERSISTENCE_ERROR", "Obligation is not open for settlement.");
      if ([...this.obligations.values()].some((x) => x.settledReceiptId === receipt.id)) throw new PaymentError("PERSISTENCE_ERROR", "Receipt already settled an obligation.");
      if ((this.obligationEvents.get(o.id) ?? []).some((e) => e.toStatus === "settled")) throw new PaymentError("PERSISTENCE_ERROR", "Obligation already has a settlement event.");
      this.moveObligation(o, "settled", "settled", at, { receiptId: receipt.id, attemptId: attempt.id }, { settledReceiptId: receipt.id, settledAt: at });
      this.fault("after_settlement");
    } else if (outcome.obligationTo) {
      this.moveObligation(o, outcome.obligationTo, "review_required", at, { attemptId: attempt.id, cause });
    }
    for (const kind of outcome.exceptions) {
      this.openException(o, kind, attempt.id, receipt?.id ?? null, at);
    }
  }

  private moveObligation(
    o: PaymentObligation,
    to: ObligationStatus,
    eventType: string,
    at: Date,
    detail: ObligationEventDetail,
    patch: Partial<Pick<PaymentObligation, "settledReceiptId" | "settledAt">> = {},
    actorType: ObligationEvent["actorType"] = "system",
    actorPrincipalId: string | null = null,
  ): void {
    /* 0019 obligation trigger: allowed transitions only; operator-only ones are not available to the system. */
    if (!canTransitionObligation(o.status, to) || isOperatorOnlyTransition(o.status, to)) {
      throw new PaymentError("PERSISTENCE_ERROR", `Obligation transition ${o.status} -> ${to} is not allowed.`);
    }
    const from = o.status;
    Object.assign(o, patch, { status: to, updatedAt: at });
    this.appendObligationEvent(o, eventType, from, to, at, detail, actorType, actorPrincipalId);
  }

  private openException(o: PaymentObligation, kind: FinancialExceptionKind, attemptId: string, receiptId: string | null, at: Date): void {
    const dedupeKey = attemptId;
    const exists = [...this.exceptions.values()].some((e) => e.obligationId === o.id && e.kind === kind && e.dedupeKey === dedupeKey);
    if (exists) return;
    const exception: FinancialException = {
      id: randomUUID(),
      obligationId: o.id,
      attemptId,
      receiptId,
      kind,
      blocksFulfilment: EXCEPTION_BLOCKS_FULFILMENT[kind],
      dedupeKey,
      status: "open",
      openedAt: at,
      openedBy: "system",
      resolutionCode: null,
      resolvedAt: null,
    };
    this.exceptions.set(exception.id, exception);
    /* No status change: from/to stay null, so the one-"settled"-event rule is never touched. */
    this.appendObligationEvent(o, "exception_opened", null, null, at, { kind, exceptionId: exception.id, attemptId, receiptId });
  }

  private appendObligationEvent(
    o: PaymentObligation,
    eventType: string,
    from: ObligationStatus | null,
    to: ObligationStatus | null,
    at: Date,
    detail: ObligationEventDetail,
    actorType: ObligationEvent["actorType"] = "system",
    actorPrincipalId: string | null = null,
  ): void {
    const log = this.obligationEvents.get(o.id) ?? [];
    log.push({ id: randomUUID(), obligationId: o.id, sequence: log.length + 1, eventType, fromStatus: from, toStatus: to, actorType, actorPrincipalId, detail: { ...detail }, createdAt: at });
    this.obligationEvents.set(o.id, log);
  }
}
