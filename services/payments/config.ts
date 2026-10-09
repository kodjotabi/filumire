/*
 * Payment configuration (Payments Phase 2, step 1): test mode first.
 *
 * - Default mode is "sandbox"; default provider is the deterministic fake.
 * - Live mode needs ALL of: PAYMENTS_MODE=live, PAYMENTS_LIVE_ENABLED=true and
 *   NODE_ENV=production. Anything less is refused.
 * - A live credential (e.g. Paystack "sk_live_") is refused in sandbox, and a
 *   test credential is refused in live mode. Unknown or placeholder keys are
 *   refused. Error messages never include key values.
 * - The fake provider can never run in live mode.
 */
import { PaymentError, type PaymentMode, type PaymentProviderId } from "../../packages/payments";

export interface PaymentConfig {
  mode: PaymentMode;
  provider: PaymentProviderId;
  paystackSecretKey?: string;
}

type Env = Record<string, string | undefined>;

const PLACEHOLDER_KEYS = new Set(["", "your_paystack_secret_key", "changeme", "test-secret-key"]);

export function resolvePaymentConfig(env: Env = process.env): PaymentConfig {
  const modeText = (env.PAYMENTS_MODE ?? "sandbox").trim().toLowerCase();
  if (modeText !== "sandbox" && modeText !== "live") {
    throw new PaymentError("CONFIGURATION", `PAYMENTS_MODE must be "sandbox" or "live".`);
  }
  const mode = modeText as PaymentMode;

  if (mode === "live") {
    if (env.PAYMENTS_LIVE_ENABLED !== "true") {
      throw new PaymentError("LIVE_MODE_REFUSED", "Live payments refused: PAYMENTS_LIVE_ENABLED is not \"true\".");
    }
    if (env.NODE_ENV !== "production") {
      throw new PaymentError("LIVE_MODE_REFUSED", "Live payments refused: NODE_ENV is not \"production\".");
    }
  }

  const providerText = (env.PAYMENTS_PROVIDER ?? "fake").trim().toLowerCase();
  if (providerText !== "fake" && providerText !== "paystack") {
    throw new PaymentError("CONFIGURATION", `PAYMENTS_PROVIDER must be "fake" or "paystack".`);
  }
  const provider = providerText as PaymentProviderId;

  if (provider === "fake") {
    if (mode === "live") {
      throw new PaymentError("LIVE_MODE_REFUSED", "The fake provider cannot run in live mode.");
    }
    return { mode, provider };
  }

  return { mode, provider, paystackSecretKey: checkPaystackKey(env.PAYSTACK_SECRET_KEY, mode) };
}

/* Paystack keys: sk_test_... in sandbox, sk_live_... in live. Exported for the adapter's own check. */
export function checkPaystackKey(key: string | undefined, mode: PaymentMode): string {
  const value = (key ?? "").trim();
  if (PLACEHOLDER_KEYS.has(value)) {
    throw new PaymentError("CONFIGURATION", "PAYSTACK_SECRET_KEY is not configured.");
  }
  if (value.startsWith("sk_live_")) {
    if (mode !== "live") {
      throw new PaymentError("LIVE_MODE_REFUSED", "A live Paystack secret key was supplied in sandbox mode; refused.");
    }
    return value;
  }
  if (value.startsWith("sk_test_")) {
    if (mode === "live") {
      throw new PaymentError("CONFIGURATION", "A Paystack test key cannot be used in live mode.");
    }
    return value;
  }
  throw new PaymentError("CONFIGURATION", "PAYSTACK_SECRET_KEY is not a recognised Paystack secret key.");
}
