/*
 * Payments Phase 2, step 1: configuration and live-mode safety.
 * No network, no database, no real credentials (all keys below are fake).
 */
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { PaymentError } from "../packages/payments";
import {
  checkPaystackKey,
  createPaymentService,
  FakePaymentProvider,
  PaystackAdapter,
  resolvePaymentConfig,
} from "../services/payments";

const FAKE_TEST_KEY = "sk_test_FAKEFAKEFAKEFAKEFAKEFAKE0000";
// Built at runtime so secret scanners do not mistake the placeholder for a real key.
const FAKE_LIVE_KEY = "sk_live_" + "FAKEFAKEFAKEFAKEFAKEFAKE0000";

let networkCalls = 0;
globalThis.fetch = (async () => {
  networkCalls += 1;
  throw new Error("Network access is not allowed in payment tests.");
}) as typeof fetch;

function expectPaymentError(code: PaymentError["code"], run: () => unknown, label: string): PaymentError {
  try {
    run();
  } catch (error) {
    assert.ok(error instanceof PaymentError, `${label}: expected PaymentError, got ${String(error)}`);
    assert.equal(error.code, code, `${label}: wrong code (${error.message})`);
    return error;
  }
  throw new Error(`${label}: expected ${code}, nothing was thrown`);
}

const results: Record<string, "PASS"> = {};
function check(name: string, run: () => void): void {
  run();
  results[name] = "PASS";
}

check("defaultsToSandboxAndFake", () => {
  assert.deepEqual(resolvePaymentConfig({}), { mode: "sandbox", provider: "fake" });
  const service = createPaymentService({});
  assert.ok(service.adapter instanceof FakePaymentProvider);
  assert.equal(service.adapter.mode, "sandbox");
});

check("liveModeNeedsAllThreeSwitches", () => {
  const paystackLive = { PAYMENTS_PROVIDER: "paystack", PAYSTACK_SECRET_KEY: FAKE_LIVE_KEY };
  expectPaymentError("LIVE_MODE_REFUSED", () => resolvePaymentConfig({ ...paystackLive, PAYMENTS_MODE: "live" }), "mode only");
  expectPaymentError(
    "LIVE_MODE_REFUSED",
    () => resolvePaymentConfig({ ...paystackLive, PAYMENTS_MODE: "live", PAYMENTS_LIVE_ENABLED: "true", NODE_ENV: "development" }),
    "not production",
  );
  expectPaymentError(
    "LIVE_MODE_REFUSED",
    () => resolvePaymentConfig({ ...paystackLive, PAYMENTS_MODE: "live", PAYMENTS_LIVE_ENABLED: "1", NODE_ENV: "production" }),
    "enabled flag must be exactly true",
  );
  expectPaymentError(
    "LIVE_MODE_REFUSED",
    () => createPaymentService({ ...paystackLive, PAYMENTS_MODE: "live" }),
    "service refuses too",
  );
});

check("fakeProviderNeverLive", () => {
  expectPaymentError(
    "LIVE_MODE_REFUSED",
    () => resolvePaymentConfig({ PAYMENTS_MODE: "live", PAYMENTS_LIVE_ENABLED: "true", NODE_ENV: "production" }),
    "fake in live",
  );
  assert.equal(new FakePaymentProvider().mode, "sandbox");
});

check("rejectsUnknownModeAndProvider", () => {
  expectPaymentError("CONFIGURATION", () => resolvePaymentConfig({ PAYMENTS_MODE: "production" }), "bad mode");
  expectPaymentError("CONFIGURATION", () => resolvePaymentConfig({ PAYMENTS_PROVIDER: "itc" }), "unimplemented provider");
});

check("liveKeyRefusedInSandboxWithoutLeakingIt", () => {
  const error = expectPaymentError(
    "LIVE_MODE_REFUSED",
    () => resolvePaymentConfig({ PAYMENTS_PROVIDER: "paystack", PAYSTACK_SECRET_KEY: FAKE_LIVE_KEY }),
    "live key in sandbox",
  );
  assert.ok(!error.message.includes(FAKE_LIVE_KEY), "error message must not contain the key");
  expectPaymentError("LIVE_MODE_REFUSED", () => new PaystackAdapter({ secretKey: FAKE_LIVE_KEY, mode: "sandbox" }), "adapter own check");
});

check("missingPlaceholderAndUnknownKeysRefused", () => {
  for (const key of [undefined, "", "your_paystack_secret_key", "test-secret-key", "pk_test_public", "random"]) {
    expectPaymentError("CONFIGURATION", () => checkPaystackKey(key, "sandbox"), `key ${String(key)}`);
  }
  expectPaymentError("CONFIGURATION", () => checkPaystackKey(FAKE_TEST_KEY, "live"), "test key in live");
});

check("sandboxTestKeyAccepted", () => {
  const config = resolvePaymentConfig({ PAYMENTS_PROVIDER: "paystack", PAYSTACK_SECRET_KEY: FAKE_TEST_KEY });
  assert.equal(config.mode, "sandbox");
  const service = createPaymentService({ PAYMENTS_PROVIDER: "paystack", PAYSTACK_SECRET_KEY: FAKE_TEST_KEY });
  assert.ok(service.adapter instanceof PaystackAdapter);
  assert.equal(service.adapter.mode, "sandbox");
});

check("noKeyLikeSecretsInPaymentSource", () => {
  const roots = ["packages/payments", "services/payments"];
  const files: string[] = [];
  const walk = (dir: string) => {
    for (const name of readdirSync(dir)) {
      const path = join(dir, name);
      if (statSync(path).isDirectory()) walk(path);
      else if (/\.ts$/.test(name)) files.push(path);
    }
  };
  roots.forEach(walk);
  assert.ok(files.length >= 8, "payment source files found");
  for (const file of files) {
    assert.ok(!/sk_(live|test)_[A-Za-z0-9]{16,}/.test(readFileSync(file, "utf8")), `${file} contains a key-like string`);
  }
});

assert.equal(networkCalls, 0, "no network calls");
console.log({ paymentServiceConfiguration: "PASS", checks: Object.keys(results).length, networkCalls });
