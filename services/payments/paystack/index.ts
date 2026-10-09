/*
 * Paystack adapter v2 (Payments Phase 2, step 1).
 *
 * Corrections to v1:
 * - the payer is the adult principal and their real email; no learner id is
 *   sent to Paystack (v1 sent "<learnerId>@filumire.local" and learnerId);
 * - amounts are integer pesewas passed through unchanged (v1 multiplied a
 *   float by 100);
 * - the secret key must match the mode (sk_test_ in sandbox, sk_live_ only in
 *   live, which the configuration refuses unless explicitly enabled);
 * - every call has a timeout; responses are validated and normalised;
 * - verify() only REPORTS what Paystack says. Whether it counts is decided by
 *   verifyAgainstExpectation (amount, currency, reference, status).
 * Paystack identifies transactions by our reference, so providerReference is
 * our reference. API details to be confirmed against the Paystack sandbox.
 */
import {
  isValidOurReference,
  PaymentError,
  validatePaymentIntent,
  type InitiatedPayment,
  type ObservedPayment,
  type PaymentChannel,
  type PaymentIntent,
  type PaymentMode,
  type PaymentProviderAdapter,
  type ProviderPaymentStatus,
} from "../../../packages/payments";
import { checkPaystackKey } from "../config";

const PAYSTACK_API = "https://api.paystack.co";

export interface PaystackAdapterOptions {
  secretKey: string;
  mode: PaymentMode;
  /* Injectable for tests; defaults to global fetch. */
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
}

const STATUS_MAP: Record<string, ProviderPaymentStatus> = {
  success: "successful",
  failed: "failed",
  abandoned: "abandoned",
  reversed: "reversed",
  ongoing: "pending",
  pending: "pending",
  processing: "pending",
  queued: "pending",
};

const CHANNEL_MAP: Record<string, PaymentChannel> = {
  card: "card",
  mobile_money: "mobile_money",
  bank: "bank",
  bank_transfer: "bank",
};

/* Own keys only: "constructor", "__proto__" etc. must not map to anything. */
function lookup<T>(map: Record<string, T>, key: unknown): T | undefined {
  return typeof key === "string" && Object.hasOwn(map, key) ? map[key] : undefined;
}

type PaystackBody = { status?: unknown; data?: Record<string, unknown>; message?: unknown };
type PaystackSuccessBody = PaystackBody & { data: Record<string, unknown> };

export class PaystackAdapter implements PaymentProviderAdapter {
  readonly id = "paystack" as const;
  readonly mode: PaymentMode;
  private readonly secretKey: string;
  private readonly fetchImpl: typeof fetch;
  private readonly timeoutMs: number;

  constructor(options: PaystackAdapterOptions) {
    this.mode = options.mode;
    this.secretKey = checkPaystackKey(options.secretKey, options.mode);
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.timeoutMs = options.timeoutMs ?? 15_000;
  }

  private async call(path: string, init: RequestInit): Promise<PaystackSuccessBody> {
    let response: Response;
    try {
      response = await this.fetchImpl(`${PAYSTACK_API}${path}`, {
        ...init,
        headers: { Authorization: `Bearer ${this.secretKey}`, "Content-Type": "application/json" },
        signal: AbortSignal.timeout(this.timeoutMs),
      });
    } catch {
      throw new PaymentError("PROVIDER_ERROR", "Paystack could not be reached.");
    }
    let body: PaystackBody;
    try {
      body = (await response.json()) as PaystackBody;
    } catch {
      throw new PaymentError("PROVIDER_RESPONSE_INVALID", `Paystack returned an unreadable response (HTTP ${response.status}).`);
    }
    if (!body || typeof body !== "object") {
      throw new PaymentError("PROVIDER_RESPONSE_INVALID", `Paystack returned an unreadable response (HTTP ${response.status}).`);
    }
    if (!response.ok || body.status !== true || !body.data || typeof body.data !== "object") {
      if (/duplicate/i.test(String(body.message ?? ""))) {
        throw new PaymentError("DUPLICATE_ATTEMPT_CONFLICT", "Paystack reports this payment reference already exists.");
      }
      throw new PaymentError("PROVIDER_ERROR", `Paystack request failed (HTTP ${response.status}).`);
    }
    return body as PaystackSuccessBody;
  }

  async initiate(intent: PaymentIntent): Promise<InitiatedPayment> {
    validatePaymentIntent(intent);
    const body = await this.call("/transaction/initialize", {
      method: "POST",
      body: JSON.stringify({
        email: intent.payer.email,
        amount: intent.amount.amountMinor,
        currency: intent.amount.currency,
        reference: intent.ourReference,
        metadata: {
          payer_principal_id: intent.payer.principalId,
          billing_account_id: intent.billingAccountId ?? null,
          filumire_mode: this.mode,
        },
      }),
    });
    const data = body.data;
    if (data.reference !== intent.ourReference || typeof data.authorization_url !== "string") {
      throw new PaymentError("PROVIDER_RESPONSE_INVALID", "Paystack initialisation response did not match the request.");
    }
    return {
      provider: this.id,
      ourReference: intent.ourReference,
      providerReference: intent.ourReference,
      next: { type: "redirect", url: data.authorization_url },
    };
  }

  async verify(ourReference: string): Promise<ObservedPayment> {
    if (!isValidOurReference(ourReference)) {
      throw new PaymentError("INVALID_INTENT", "Malformed payment reference.");
    }
    const body = await this.call(`/transaction/verify/${encodeURIComponent(ourReference)}`, { method: "GET" });
    const data = body.data;
    const status = lookup(STATUS_MAP, data.status);
    if (!status || typeof data.reference !== "string" || typeof data.currency !== "string" || !Number.isSafeInteger(data.amount)) {
      throw new PaymentError("PROVIDER_RESPONSE_INVALID", "Paystack verification response is incomplete or malformed.");
    }
    return {
      provider: this.id,
      providerReference: data.reference,
      ourReference: data.reference,
      status,
      amountMinor: data.amount as number,
      currency: data.currency,
      channel: lookup(CHANNEL_MAP, data.channel) ?? "other",
      paidAt: typeof data.paid_at === "string" ? data.paid_at : undefined,
    };
  }
}
