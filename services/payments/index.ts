/*
 * Payment service v2 (Payments Phase 2, step 1).
 *
 * The one entry point the rest of FILUMIRE uses for payments. It works only
 * with the provider-independent contract (packages/payments); provider details
 * stay inside the adapters. It never reads or writes learner, evidence or
 * mastery state, and it grants nothing: confirm() only says whether a payment
 * matches what was expected. Entitlements are a later step.
 *
 * Duplicate handling (same for every provider):
 * - initiating the same attempt again (same reference and fingerprint) returns
 *   the first result without asking the provider again: no second charge;
 * - reusing a reference for a different payment is refused;
 * - confirm() is read-only and may be repeated; it re-asks the provider each time.
 * The attempt registry is in memory for this step; step 2 moves it to the
 * payment_intents table.
 */
import {
  intentFingerprint,
  isSupportedCurrency,
  isValidOurReference,
  PaymentError,
  sameMoney,
  validatePaymentIntent,
  verifyAgainstExpectation,
  type InitiatedPayment,
  type ObservedPayment,
  type PaymentExpectation,
  type PaymentIntent,
  type PaymentProviderAdapter,
  type VerificationResult,
} from "../../packages/payments";
import { resolvePaymentConfig } from "./config";
import { FakePaymentProvider } from "./fake";
import { PaystackAdapter } from "./paystack";

interface InitiatedAttempt {
  fingerprint: string;
  intent: PaymentIntent;
  initiated: InitiatedPayment;
}

export class PaymentService {
  private readonly attempts = new Map<string, InitiatedAttempt>();

  constructor(readonly adapter: PaymentProviderAdapter) {}

  async initiate(intent: PaymentIntent): Promise<InitiatedPayment> {
    validatePaymentIntent(intent);
    const fingerprint = intentFingerprint(intent);
    const existing = this.attempts.get(intent.ourReference);
    if (existing) {
      if (existing.fingerprint !== fingerprint) {
        throw new PaymentError("DUPLICATE_ATTEMPT_CONFLICT", "This payment reference was already used for a different payment.");
      }
      return existing.initiated;
    }
    const initiated = await this.adapter.initiate(intent);
    if (
      initiated.provider !== this.adapter.id ||
      initiated.ourReference !== intent.ourReference ||
      typeof initiated.providerReference !== "string" ||
      initiated.providerReference === ""
    ) {
      throw new PaymentError("PROVIDER_RESPONSE_INVALID", "Provider initiation result does not match the request.");
    }
    this.attempts.set(intent.ourReference, { fingerprint, intent, initiated });
    return initiated;
  }

  /*
   * Asks the provider about a payment and checks it strictly against what was
   * expected. Never throws for provider problems: an unreachable provider or
   * unusable answer is VERIFICATION_UNAVAILABLE (not confirmed). A malformed
   * expectation is a programming error and throws INVALID_INTENT.
   */
  async confirm(expected: PaymentExpectation): Promise<VerificationResult> {
    assertExpectation(expected);

    const known = this.attempts.get(expected.ourReference);
    const effective: PaymentExpectation = {
      ...expected,
      providerReference: expected.providerReference ?? known?.initiated.providerReference,
    };
    if (
      known &&
      (!sameMoney(known.intent.amount, expected.amount) ||
        (expected.providerReference !== undefined && expected.providerReference !== known.initiated.providerReference))
    ) {
      return { confirmed: false, failures: ["EXPECTATION_CONFLICT"] };
    }

    let observed: ObservedPayment;
    try {
      observed = await this.adapter.verify(expected.ourReference);
    } catch {
      return { confirmed: false, failures: ["VERIFICATION_UNAVAILABLE"] };
    }
    return verifyAgainstExpectation(effective, observed);
  }
}

function assertExpectation(expected: PaymentExpectation): void {
  const fail = (message: string) => {
    throw new PaymentError("INVALID_INTENT", message);
  };
  if (!expected || typeof expected !== "object") return fail("An expectation is required.");
  if (!isValidOurReference(expected.ourReference)) fail("Malformed payment reference.");
  const amount = expected.amount;
  if (!amount || !Number.isSafeInteger(amount.amountMinor) || amount.amountMinor <= 0) {
    fail("Expected amount must be a positive integer number of minor units.");
  }
  if (!isSupportedCurrency(amount?.currency)) fail("Unsupported expected currency.");
}

export interface CreatePaymentServiceOptions {
  /* Injected into the Paystack adapter (tests). */
  fetchImpl?: typeof fetch;
}

/* Builds the service from configuration. Defaults: sandbox mode, fake provider. */
export function createPaymentService(
  env: Record<string, string | undefined> = process.env,
  options: CreatePaymentServiceOptions = {},
): PaymentService {
  const config = resolvePaymentConfig(env);
  if (config.provider === "fake") {
    return new PaymentService(new FakePaymentProvider());
  }
  return new PaymentService(
    new PaystackAdapter({ secretKey: config.paystackSecretKey!, mode: config.mode, fetchImpl: options.fetchImpl }),
  );
}

export { resolvePaymentConfig, checkPaystackKey, type PaymentConfig } from "./config";
export { FakePaymentProvider, FakeProviderLedger, type FakeOutcome, type FakeAbsence, type FakeInitiateFailure } from "./fake";
export { PaystackAdapter, type PaystackAdapterOptions } from "./paystack";
/* Step 2: durable recording. PaymentService above stays for stateless use; PaymentRecorder is the durable path. */
export { PaymentRecorder, DEFAULT_SETTLE_WINDOW_MS, type ClosedSweepCursor, type StartPaymentInput, type StartPaymentResult, type PaymentRecorderOptions } from "./recorder";
export { MemoryPaymentAttemptStore } from "./store/memory";
export { PostgresPaymentAttemptStore } from "./store/postgres";
export { isRetryableConflict, RETRYABLE_SQLSTATES, type PgTransactionOptions } from "./store/pg-transaction";
export type * from "./store";
/* Step 3 (B2): obligations, receipts, financial exceptions (sandbox only; grants nothing). */
export * from "./obligations";
