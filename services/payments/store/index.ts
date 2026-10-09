/*
 * Payment attempt store (Payments Phase 2, step 2): the persistence boundary
 * for the payment recorder. Two implementations with the same semantics:
 * ./memory (tests, local dev) and ./postgres (payment_attempts, migration 0018).
 *
 * Nothing here stores card data, tokens, checkout URLs, payer contact details
 * or raw provider payloads.
 */
import type { CurrencyCode, PaymentAttemptStatus, PaymentMode, ProviderPaymentStatus } from "../../../packages/payments";

export interface PaymentAttemptRecord {
  id: string;
  idempotencyKey: string;
  obligationId: string;
  ourReference: string;
  requestFingerprint: string;
  provider: string;
  mode: PaymentMode;
  providerReference: string | null;
  payerPrincipalId: string;
  billingAccountId: string | null;
  amountMinor: number;
  currency: CurrencyCode;
  status: PaymentAttemptStatus;
  observedStatus: ProviderPaymentStatus | null;
  observedAmountMinor: number | null;
  observedCurrency: string | null;
  verificationFailures: string[] | null;
  lastErrorCode: string | null;
  verifyCount: number;
  confirmedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export type NewPaymentAttempt = Pick<
  PaymentAttemptRecord,
  | "id"
  | "idempotencyKey"
  | "obligationId"
  | "ourReference"
  | "requestFingerprint"
  | "provider"
  | "mode"
  | "payerPrincipalId"
  | "billingAccountId"
  | "amountMinor"
  | "currency"
  | "createdAt"
>;

/* Audit detail: codes, statuses and integer amounts only (no URLs, tokens, contacts or payloads). */
export type PaymentEventDetail = Record<string, string | number | boolean | null | string[]>;

export interface PaymentAttemptEvent {
  id: string;
  attemptId: string;
  sequence: number;
  eventType: string;
  fromStatus: PaymentAttemptStatus | null;
  toStatus: PaymentAttemptStatus | null;
  detail: PaymentEventDetail;
  createdAt: Date;
}

export type AttemptPatch = Partial<
  Pick<
    PaymentAttemptRecord,
    "providerReference" | "observedStatus" | "observedAmountMinor" | "observedCurrency" | "verificationFailures" | "lastErrorCode" | "confirmedAt"
  >
>;

export interface TransitionRequest {
  /* Apply only if the current status is one of these (checked under a row lock). */
  from: readonly PaymentAttemptStatus[];
  /* New status; omitted = keep the current status (record an observation only). */
  to?: PaymentAttemptStatus;
  patch?: AttemptPatch;
  incrementVerifyCount?: boolean;
  event: { type: string; detail?: PaymentEventDetail };
  at: Date;
}

export type CreateResult =
  | { created: true; attempt: PaymentAttemptRecord }
  | { created: false; conflict: "idempotency_key" | "obligation_active" | "obligation_succeeded" | "our_reference" };

export type TransitionResult =
  | { applied: true; attempt: PaymentAttemptRecord }
  | { applied: false; attempt: PaymentAttemptRecord };

export interface PaymentAttemptStore {
  /* Inserts the attempt (status "created") and its "created" event atomically. Uniqueness is enforced by the store. */
  create(input: NewPaymentAttempt): Promise<CreateResult>;
  findById(id: string): Promise<PaymentAttemptRecord | null>;
  findByIdempotencyKey(key: string): Promise<PaymentAttemptRecord | null>;
  listByObligation(obligationId: string): Promise<PaymentAttemptRecord[]>;
  /* Active (created/pending/unknown) attempts last updated before the cut-off, oldest first. */
  listActive(updatedBefore: Date, limit: number): Promise<PaymentAttemptRecord[]>;
  /* Atomic: lock row, check from-status and lifecycle, update, append event. */
  transition(attemptId: string, request: TransitionRequest): Promise<TransitionResult>;
  listEvents(attemptId: string): Promise<PaymentAttemptEvent[]>;
  /*
   * Step 3, optional (obligation-aware stores only): a later provider observation of an attempt that
   * already SUCCEEDED (e.g. a reversal). The attempt never changes; the store records a financial exception.
   */
  recordPostSuccessObservation?(attemptId: string, observation: PostSuccessObservation, at: Date): Promise<void>;
  /*
   * Step 3, optional: closed (failed / needs_review / succeeded) attempts last updated at or after `since`,
   * ordered by (updatedAt, id). B3: `page` bounds the walk (updatedAt <= until) and continues after a
   * keyset cursor, so a sweep can visit every closed attempt in the window instead of the same oldest page.
   */
  listClosedUpdatedSince?(since: Date, limit: number, page?: ClosedAttemptPage): Promise<PaymentAttemptRecord[]>;
}

export interface ClosedAttemptPage {
  until: Date;
  after: { updatedAt: Date; id: string } | null;
}

/* Keyset filter + order shared by the memory implementations (Postgres does the same in SQL). */
export function selectClosedPage(
  attempts: Iterable<PaymentAttemptRecord>,
  isClosed: (a: PaymentAttemptRecord) => boolean,
  since: Date,
  limit: number,
  page?: ClosedAttemptPage,
): PaymentAttemptRecord[] {
  const after = page?.after ?? null;
  return [...attempts]
    .filter((a) => isClosed(a) && a.updatedAt.getTime() >= since.getTime())
    .filter((a) => !page || a.updatedAt.getTime() <= page.until.getTime())
    .filter(
      (a) =>
        !after ||
        a.updatedAt.getTime() > after.updatedAt.getTime() ||
        (a.updatedAt.getTime() === after.updatedAt.getTime() && a.id > after.id),
    )
    .sort((a, b) => a.updatedAt.getTime() - b.updatedAt.getTime() || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
    .slice(0, limit)
    .map((a) => ({ ...a }));
}

export interface PostSuccessObservation {
  observedStatus: ProviderPaymentStatus | null;
  failures: string[];
}
