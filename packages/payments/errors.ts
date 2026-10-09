/* Payment errors (Payments Phase 2, steps 1-2). Messages never contain credentials. */
export type PaymentErrorCode =
  | "CONFIGURATION"
  | "LIVE_MODE_REFUSED"
  | "INVALID_INTENT"
  | "PROVIDER_ERROR"
  | "PROVIDER_RESPONSE_INVALID"
  | "DUPLICATE_ATTEMPT_CONFLICT"
  /*
   * verify() only. The provider AUTHORITATIVELY reports it holds no
   * transaction for this reference: the adapter guarantees the provider's
   * lookup is consistent (a transaction it created would be visible) and the
   * answer is not a timeout, rate limit, outage or ambiguous error. Adapters
   * that cannot guarantee this (Paystack until confirmed in its sandbox) must
   * throw PROVIDER_ERROR instead. Even then the recorder only acts on it after
   * a settle window, and never when the provider earlier acknowledged the
   * payment.
   */
  | "PAYMENT_NOT_FOUND"
  /* A payment for this obligation needs human review; no new attempt is allowed. */
  | "OBLIGATION_NEEDS_REVIEW"
  /* The store could not record the attempt (database problem). */
  | "PERSISTENCE_ERROR"
  /*
   * B3: a retryable database conflict (serialization failure 40001, deadlock 40P01, lock timeout 55P03)
   * persisted after the store's bounded retries. Every try was rolled back: nothing was written, the
   * provider was not called by the store, and the caller may safely repeat the same request.
   */
  | "PERSISTENCE_RETRYABLE"
  /* Step 3 (obligations). Unknown obligation, or one the caller does not own (same answer for both). */
  | "OBLIGATION_NOT_FOUND"
  /* The obligation is not open for payment (cancelled, expired, in review). */
  | "OBLIGATION_NOT_PAYABLE"
  /* An attempt's payer, amount, currency or mode differs from its obligation. */
  | "OBLIGATION_MISMATCH"
  /* A creation key was reused for a different purchase. */
  | "OBLIGATION_CONFLICT"
  /* The obligation has an active payment attempt (it cannot be cancelled or expired now). */
  | "OBLIGATION_PAYMENT_IN_PROGRESS"
  | "INVALID_OBLIGATION"
  /* The catalogue has no approved product with this code (production has none in step 3). */
  | "PRODUCT_NOT_AVAILABLE"
  | "PAYER_NOT_AUTHORIZED"
  /* Same answer for an unknown learner, another family's learner, a revoked or non-guardian relationship. */
  | "BENEFICIARY_NOT_AUTHORIZED"
  /* Step 3 runs in sandbox mode only; anything live is refused. */
  | "SANDBOX_ONLY";

export class PaymentError extends Error {
  constructor(
    readonly code: PaymentErrorCode,
    message: string,
  ) {
    super(message);
  }
}
