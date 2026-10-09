/*
 * Deterministic fake payment provider (Payments Phase 2, steps 1-2).
 *
 * For tests and local development only: never touches the network, always
 * sandbox. Outcomes are scripted per reference, so tests can produce exact
 * underpayments, wrong currencies, mismatched references, failures and
 * pending payments. Re-initiating the same attempt returns the same payment
 * and is NOT a second charge; reusing a reference for a different attempt is
 * refused.
 *
 * Step 2 additions:
 * - a FakeProviderLedger can be shared between instances, so a test can
 *   "restart" FILUMIRE (new store, recorder and adapter) while the provider
 *   keeps its records, as a real provider would;
 * - absence of a reference is modelled both ways: "authoritative" (throws
 *   PAYMENT_NOT_FOUND) or "transient" (throws PROVIDER_ERROR, the provider
 *   might still have it). The default is "transient" (the safe assumption);
 * - initiation failures: "lost_response" creates the charge and then fails
 *   as if the response was lost; "not_sent" fails without creating anything.
 */
import {
  intentFingerprint,
  PaymentError,
  validatePaymentIntent,
  type InitiatedPayment,
  type ObservedPayment,
  type PaymentIntent,
  type PaymentProviderAdapter,
  type ProviderPaymentStatus,
} from "../../../packages/payments";

export interface FakeOutcome {
  status?: ProviderPaymentStatus;
  /* Added to the expected amount (negative = underpayment). */
  amountDeltaMinor?: number;
  currency?: string;
  /* Report a different reference than the one asked for. */
  reportReference?: string;
  /* Make verify() fail as if the provider were unreachable. */
  unavailable?: boolean;
  /* Make verify() fail as if the provider answered with an unusable response. */
  malformed?: boolean;
  /* How verify() reports this reference when it holds no record of it. */
  absent?: FakeAbsence;
}

export type FakeAbsence = "authoritative" | "transient";

export type FakeInitiateFailure = "lost_response" | "not_sent";

interface FakeAttempt {
  fingerprint: string;
  intent: PaymentIntent;
  initiated: InitiatedPayment;
}

/* Provider-side state. Share one ledger between instances to simulate a FILUMIRE restart. */
export class FakeProviderLedger {
  readonly attempts = new Map<string, FakeAttempt>();
  readonly outcomes = new Map<string, FakeOutcome>();
  /* Number of distinct charges created (a retry of the same attempt is not a charge). */
  chargesCreated = 0;
  initiateCalls = 0;
  verifyCalls = 0;
}

export interface FakeProviderOptions {
  ledger?: FakeProviderLedger;
  absence?: FakeAbsence;
}

export class FakePaymentProvider implements PaymentProviderAdapter {
  readonly id = "fake" as const;
  readonly mode = "sandbox" as const;
  readonly ledger: FakeProviderLedger;
  private readonly absence: FakeAbsence;
  private readonly initiateFailures: FakeInitiateFailure[] = [];

  constructor(options: FakeProviderOptions = {}) {
    this.ledger = options.ledger ?? new FakeProviderLedger();
    this.absence = options.absence ?? "transient";
  }

  get chargesCreated(): number {
    return this.ledger.chargesCreated;
  }

  get initiateCalls(): number {
    return this.ledger.initiateCalls;
  }

  /* Script what the provider will report for a reference (default: exact success). */
  script(ourReference: string, outcome: FakeOutcome): void {
    this.ledger.outcomes.set(ourReference, outcome);
  }

  /* Make the next initiate() call fail (queued, one per call). */
  failNextInitiate(failure: FakeInitiateFailure): void {
    this.initiateFailures.push(failure);
  }

  async initiate(intent: PaymentIntent): Promise<InitiatedPayment> {
    this.ledger.initiateCalls += 1;
    validatePaymentIntent(intent);
    const failure = this.initiateFailures.shift();
    if (failure === "not_sent") {
      throw new PaymentError("PROVIDER_ERROR", "Fake provider could not be reached.");
    }
    const fingerprint = intentFingerprint(intent);
    const existing = this.ledger.attempts.get(intent.ourReference);
    if (existing) {
      if (existing.fingerprint !== fingerprint) {
        throw new PaymentError("DUPLICATE_ATTEMPT_CONFLICT", "This payment reference was already used for a different payment.");
      }
      return existing.initiated;
    }
    const initiated: InitiatedPayment = {
      provider: this.id,
      ourReference: intent.ourReference,
      providerReference: `fake_${intent.ourReference}`,
      next: { type: "redirect", url: `https://fake-payments.invalid/checkout/${encodeURIComponent(intent.ourReference)}` },
    };
    this.ledger.attempts.set(intent.ourReference, { fingerprint, intent, initiated });
    this.ledger.chargesCreated += 1;
    if (failure === "lost_response") {
      throw new PaymentError("PROVIDER_ERROR", "Fake provider response lost.");
    }
    return initiated;
  }

  async verify(ourReference: string): Promise<ObservedPayment> {
    this.ledger.verifyCalls += 1;
    const outcome = this.ledger.outcomes.get(ourReference) ?? {};
    if (outcome.unavailable) {
      throw new PaymentError("PROVIDER_ERROR", "Fake provider unavailable.");
    }
    const attempt = this.ledger.attempts.get(ourReference);
    if (!attempt) {
      if ((outcome.absent ?? this.absence) === "authoritative") {
        throw new PaymentError("PAYMENT_NOT_FOUND", "Fake provider has no transaction with this reference.");
      }
      throw new PaymentError("PROVIDER_ERROR", "Fake provider could not find the reference (may be temporary).");
    }
    if (outcome.malformed) {
      throw new PaymentError("PROVIDER_RESPONSE_INVALID", "Fake provider response is malformed.");
    }
    const status = outcome.status ?? "successful";
    return {
      provider: this.id,
      providerReference: attempt.initiated.providerReference,
      ourReference: outcome.reportReference ?? ourReference,
      status,
      amountMinor: attempt.intent.amount.amountMinor + (outcome.amountDeltaMinor ?? 0),
      currency: outcome.currency ?? attempt.intent.amount.currency,
      channel: "mobile_money",
      paidAt: status === "successful" ? "2026-01-01T00:00:00.000Z" : undefined,
    };
  }
}
