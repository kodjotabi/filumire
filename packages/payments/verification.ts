/*
 * Strict payment verification (Payments Phase 2, step 1).
 *
 * A payment counts as confirmed ONLY when what the provider reports matches
 * exactly what FILUMIRE expected: provider, our reference, successful status,
 * currency and the exact amount in minor units. Anything else is refused with
 * the reasons, so nothing downstream (entitlements, later steps) can grant
 * access on an underpaid, foreign, mismatched or unfinished payment.
 * Overpayment is also refused here (flagged for review, never auto-accepted).
 */
import type { Money } from "./money";
import type { ObservedPayment, PaymentProviderId } from "./index";

export interface PaymentExpectation {
  provider: PaymentProviderId;
  ourReference: string;
  amount: Money;
  /* The provider reference returned at initiation, when known. */
  providerReference?: string;
}

export type VerificationFailure =
  | "PROVIDER_MISMATCH"
  | "REFERENCE_MISMATCH"
  | "PROVIDER_REFERENCE_MISMATCH"
  | "STATUS_NOT_SUCCESSFUL"
  | "CURRENCY_MISMATCH"
  | "UNDERPAYMENT"
  | "OVERPAYMENT"
  | "AMOUNT_NOT_INTEGER"
  /* The caller's expectation differs from the intent FILUMIRE initiated for this reference. */
  | "EXPECTATION_CONFLICT"
  /* The provider could not be asked, or answered with something unusable. */
  | "VERIFICATION_UNAVAILABLE";

export type VerificationResult =
  | { confirmed: true; observed: ObservedPayment }
  | { confirmed: false; failures: VerificationFailure[]; observed?: ObservedPayment };

export function verifyAgainstExpectation(
  expected: PaymentExpectation,
  observed: ObservedPayment,
): VerificationResult {
  if (!observed || typeof observed !== "object") {
    return { confirmed: false, failures: ["VERIFICATION_UNAVAILABLE"] };
  }
  const failures: VerificationFailure[] = [];

  if (observed.provider !== expected.provider) failures.push("PROVIDER_MISMATCH");
  if (observed.ourReference !== expected.ourReference) failures.push("REFERENCE_MISMATCH");
  if (expected.providerReference !== undefined && observed.providerReference !== expected.providerReference) {
    failures.push("PROVIDER_REFERENCE_MISMATCH");
  }
  if (observed.status !== "successful") failures.push("STATUS_NOT_SUCCESSFUL");
  if (observed.currency !== expected.amount.currency) failures.push("CURRENCY_MISMATCH");

  if (!Number.isSafeInteger(observed.amountMinor)) {
    failures.push("AMOUNT_NOT_INTEGER");
  } else if (observed.amountMinor < expected.amount.amountMinor) {
    failures.push("UNDERPAYMENT");
  } else if (observed.amountMinor > expected.amount.amountMinor) {
    failures.push("OVERPAYMENT");
  }

  return failures.length === 0
    ? { confirmed: true, observed }
    : { confirmed: false, failures, observed };
}
