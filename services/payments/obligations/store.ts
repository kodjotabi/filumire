/*
 * Obligation store contract (Payments Phase 2, step 3). The persistence
 * boundary for obligations, beneficiary evidence, receipts, financial
 * exceptions and obligation events. Implemented in memory now
 * (./memory-ledger); a Postgres implementation over migration 0019 is B5.
 *
 * An obligation-aware store is ALSO the PaymentAttemptStore used by the
 * recorder, so that, in one transaction:
 * - an attempt can only be created for an open, unexpired obligation with the
 *   same payer, amount, currency and mode, and only while every beneficiary is
 *   still authorised (composite FK + insert trigger in 0019);
 * - an attempt transition into succeeded / needs_review records the receipt
 *   (if money moved), THEN separately decides settlement and exceptions.
 */
import type {
  BeneficiaryEvidence,
  FinancialException,
  ObligationStatus,
  PaymentObligation,
  PaymentReceipt,
} from "../../../packages/payments";
import type { PaymentAttemptStore } from "../store";

export interface NewObligation {
  obligation: PaymentObligation;
  beneficiaries: BeneficiaryEvidence[];
}

export type CreateObligationResult =
  | { created: true; obligation: PaymentObligation }
  /* The payer already used this creation key; the caller compares the purchases. */
  | { created: false; existing: PaymentObligation };

export interface ObligationTransitionResult {
  applied: boolean;
  obligation: PaymentObligation;
}

export type ObligationEventDetail = Record<string, string | number | boolean | null | string[]>;

export interface ObligationEvent {
  id: string;
  obligationId: string;
  sequence: number;
  eventType: string;
  fromStatus: ObligationStatus | null;
  toStatus: ObligationStatus | null;
  actorType: "system" | "payer";
  actorPrincipalId: string | null;
  detail: ObligationEventDetail;
  createdAt: Date;
}

export interface ObligationStore {
  /* Atomic: obligation + beneficiary evidence (re-checked) + seal check (hash, count) + "created" event. */
  createObligation(input: NewObligation): Promise<CreateObligationResult>;
  findObligation(id: string): Promise<PaymentObligation | null>;
  findObligationByCreationKey(payerPrincipalId: string, creationKey: string): Promise<PaymentObligation | null>;
  listBeneficiaries(obligationId: string): Promise<BeneficiaryEvidence[]>;
  listReceipts(obligationId: string): Promise<PaymentReceipt[]>;
  listExceptions(obligationId: string): Promise<FinancialException[]>;
  listObligationEvents(obligationId: string): Promise<ObligationEvent[]>;
  /* Payer cancellation: only while open, with no active attempt and no receipt. */
  cancelObligation(obligationId: string, payerPrincipalId: string, at: Date): Promise<ObligationTransitionResult>;
  /* System expiry: only while open, past expires_at, with no active attempt. */
  expireObligation(obligationId: string, at: Date): Promise<ObligationTransitionResult>;
  listExpirable(at: Date, limit: number): Promise<PaymentObligation[]>;
}

export type PaymentLedgerStore = ObligationStore & PaymentAttemptStore;
