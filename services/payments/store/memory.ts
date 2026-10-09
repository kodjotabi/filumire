/*
 * In-memory payment attempt store (Payments Phase 2, step 2). Same rules as
 * the Postgres store and the 0018 constraints/triggers, for tests and local
 * development. Not durable: never use it where retries must survive a restart.
 */
import { randomUUID } from "node:crypto";
import { canTransition, isActiveStatus, PaymentError } from "../../../packages/payments";
import type {
  CreateResult,
  NewPaymentAttempt,
  PaymentAttemptEvent,
  PaymentAttemptRecord,
  PaymentAttemptStore,
  TransitionRequest,
  TransitionResult,
} from "./index";

export class MemoryPaymentAttemptStore implements PaymentAttemptStore {
  /* Protected (step 3) so the obligation-aware MemoryPaymentLedger can snapshot and roll back. */
  protected readonly attempts = new Map<string, PaymentAttemptRecord>();
  protected readonly events = new Map<string, PaymentAttemptEvent[]>();

  async create(input: NewPaymentAttempt): Promise<CreateResult> {
    const all = [...this.attempts.values()];
    if (all.some((a) => a.idempotencyKey === input.idempotencyKey)) return { created: false, conflict: "idempotency_key" };
    if (all.some((a) => a.ourReference === input.ourReference)) return { created: false, conflict: "our_reference" };
    if (all.some((a) => a.obligationId === input.obligationId && isActiveStatus(a.status))) {
      return { created: false, conflict: "obligation_active" };
    }
    const attempt: PaymentAttemptRecord = {
      ...input,
      providerReference: null,
      status: "created",
      observedStatus: null,
      observedAmountMinor: null,
      observedCurrency: null,
      verificationFailures: null,
      lastErrorCode: null,
      verifyCount: 0,
      confirmedAt: null,
      updatedAt: input.createdAt,
    };
    this.attempts.set(attempt.id, attempt);
    this.events.set(attempt.id, [
      { id: randomUUID(), attemptId: attempt.id, sequence: 1, eventType: "created", fromStatus: null, toStatus: "created", detail: {}, createdAt: input.createdAt },
    ]);
    return { created: true, attempt: { ...attempt } };
  }

  async findById(id: string): Promise<PaymentAttemptRecord | null> {
    const found = this.attempts.get(id);
    return found ? { ...found } : null;
  }

  async findByIdempotencyKey(key: string): Promise<PaymentAttemptRecord | null> {
    const found = [...this.attempts.values()].find((a) => a.idempotencyKey === key);
    return found ? { ...found } : null;
  }

  async listByObligation(obligationId: string): Promise<PaymentAttemptRecord[]> {
    return [...this.attempts.values()]
      .filter((a) => a.obligationId === obligationId)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
      .map((a) => ({ ...a }));
  }

  async listActive(updatedBefore: Date, limit: number): Promise<PaymentAttemptRecord[]> {
    return [...this.attempts.values()]
      .filter((a) => isActiveStatus(a.status) && a.updatedAt < updatedBefore)
      .sort((a, b) => a.updatedAt.getTime() - b.updatedAt.getTime())
      .slice(0, limit)
      .map((a) => ({ ...a }));
  }

  async transition(attemptId: string, request: TransitionRequest): Promise<TransitionResult> {
    const current = this.attempts.get(attemptId);
    if (!current) throw new PaymentError("PERSISTENCE_ERROR", "Unknown payment attempt.");
    const to = request.to ?? current.status;
    if (!request.from.includes(current.status) || !canTransition(current.status, to)) {
      return { applied: false, attempt: { ...current } };
    }
    if (current.providerReference !== null && request.patch?.providerReference !== undefined && request.patch.providerReference !== current.providerReference) {
      throw new PaymentError("PERSISTENCE_ERROR", "provider reference is immutable once set.");
    }
    const next: PaymentAttemptRecord = { ...current, ...request.patch, status: to, updatedAt: request.at };
    if (request.incrementVerifyCount) next.verifyCount += 1;
    if (to === "succeeded") {
      const valid =
        next.observedStatus === "successful" &&
        next.observedAmountMinor === next.amountMinor &&
        next.observedCurrency === next.currency &&
        next.confirmedAt !== null &&
        next.providerReference !== null;
      const otherSuccess = [...this.attempts.values()].some((a) => a.id !== attemptId && a.obligationId === next.obligationId && a.status === "succeeded");
      if (!valid || otherSuccess) throw new PaymentError("PERSISTENCE_ERROR", "succeeded attempt violates constraints.");
    }
    if (isActiveStatus(to) && !isActiveStatus(current.status)) {
      throw new PaymentError("PERSISTENCE_ERROR", "cannot re-activate an attempt.");
    }
    this.attempts.set(attemptId, next);
    const log = this.events.get(attemptId)!;
    log.push({
      id: randomUUID(),
      attemptId,
      sequence: log.length + 1,
      eventType: request.event.type,
      fromStatus: current.status,
      toStatus: to,
      detail: { ...(request.event.detail ?? {}) },
      createdAt: request.at,
    });
    return { applied: true, attempt: { ...next } };
  }

  async listEvents(attemptId: string): Promise<PaymentAttemptEvent[]> {
    return (this.events.get(attemptId) ?? []).map((e) => ({ ...e, detail: { ...e.detail } }));
  }
}
