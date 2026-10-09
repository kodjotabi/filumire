/*
 * Payment intent validation (Payments Phase 2, step 1). Every adapter and the
 * payment service call this before anything reaches a provider.
 */
import { assertMinorUnits, isSupportedCurrency } from "./money";
import { PaymentError } from "./errors";
import type { PaymentIntent } from "./index";

/* Letters, digits, - . = _ ; 8-100 chars (safe for Paystack and Hubtel references). */
const REFERENCE_PATTERN = /^[A-Za-z0-9._=-]{8,100}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidOurReference(value: unknown): value is string {
  return typeof value === "string" && REFERENCE_PATTERN.test(value);
}

export function validatePaymentIntent(intent: PaymentIntent): void {
  const fail = (message: string): never => {
    throw new PaymentError("INVALID_INTENT", message);
  };

  if (!isValidOurReference(intent?.ourReference)) {
    fail("ourReference must be 8-100 characters of letters, digits, '-', '.', '=' or '_'.");
  }

  try {
    assertMinorUnits(intent.amount?.amountMinor, "amount.amountMinor");
  } catch (error) {
    fail((error as Error).message);
  }
  if (intent.amount.amountMinor <= 0) fail("amount must be greater than zero.");
  if (!isSupportedCurrency(intent.amount.currency)) fail(`Unsupported currency "${String(intent.amount.currency)}".`);

  /* The payer is an adult principal with a real, reachable email. */
  const payer = intent.payer;
  if (!payer || typeof payer.principalId !== "string" || payer.principalId.trim() === "") {
    fail("A payer principal is required (an adult account, never a learner).");
  }
  if (typeof payer.email !== "string" || !EMAIL_PATTERN.test(payer.email)) {
    fail("The payer needs a valid email address for provider receipts.");
  }
  if (/@filumire\.local$/i.test(payer.email)) {
    fail("Synthetic @filumire.local addresses are not payer contacts.");
  }

  if (typeof intent.description !== "string" || intent.description.trim() === "" || intent.description.length > 200) {
    fail("description must be 1-200 characters.");
  }
}

/* Same attempt? Used to make retries idempotent and to refuse conflicting reuse of a reference. */
export function intentFingerprint(intent: PaymentIntent): string {
  return JSON.stringify([
    intent.ourReference,
    intent.amount.amountMinor,
    intent.amount.currency,
    intent.payer.principalId,
    intent.payer.email.toLowerCase(),
    intent.billingAccountId ?? null,
  ]);
}
