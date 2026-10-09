/*
 * Payments Phase 2, step 1: contract v2, money, intents, strict verification
 * and the payment service, using the deterministic fake provider.
 * No network, no database, no credentials.
 */
import assert from "node:assert/strict";
import {
  formatMajorAmount,
  intentFingerprint,
  money,
  MoneyError,
  parseMajorAmount,
  PaymentError,
  sameMoney,
  validatePaymentIntent,
  verifyAgainstExpectation,
  type ObservedPayment,
  type PaymentExpectation,
  type PaymentIntent,
  type PaymentProviderAdapter,
  type VerificationResult,
} from "../packages/payments";
import { FakePaymentProvider, PaymentService } from "../services/payments";

let networkCalls = 0;
globalThis.fetch = (async () => {
  networkCalls += 1;
  throw new Error("Network access is not allowed in payment tests.");
}) as typeof fetch;

const results: Record<string, "PASS"> = {};
async function check(name: string, run: () => void | Promise<void>): Promise<void> {
  await run();
  results[name] = "PASS";
}

function intent(overrides: Partial<PaymentIntent> = {}): PaymentIntent {
  return {
    ourReference: "FLM-TEST-0001",
    amount: money(2500, "GHS"),
    payer: { principalId: "principal-guardian-001", email: "guardian@example.com" },
    description: "FILUMIRE test access period",
    billingAccountId: "billing-test-001",
    ...overrides,
  };
}

function expectation(i: PaymentIntent, provider: PaymentExpectation["provider"] = "fake"): PaymentExpectation {
  return { provider, ourReference: i.ourReference, amount: i.amount };
}

function expectIntentError(i: unknown, label: string): void {
  assert.throws(
    () => validatePaymentIntent(i as PaymentIntent),
    (error: unknown) => error instanceof PaymentError && error.code === "INVALID_INTENT",
    label,
  );
}

function failuresOf(result: VerificationResult): string[] {
  return result.confirmed ? [] : result.failures;
}

async function run(): Promise<void> {
  /* 1. Integer pesewas only. */
  await check("integerPesewas", () => {
    assert.deepEqual(parseMajorAmount("12.50", "GHS"), { amountMinor: 1250, currency: "GHS" });
    assert.equal(parseMajorAmount("0.1", "GHS").amountMinor, 10);
    assert.equal(parseMajorAmount("100", "GHS").amountMinor, 10000);
    assert.equal(parseMajorAmount("0.07", "GHS").amountMinor, 7);
    /* The classic float trap: 0.1 + 0.2 and 19.99 * 100 must not drift. */
    assert.equal(parseMajorAmount("19.99", "GHS").amountMinor, 1999);
    assert.equal(formatMajorAmount(money(1999, "GHS")), "19.99");
    assert.equal(formatMajorAmount(money(5, "GHS")), "0.05");
    for (const bad of ["-1", "1.234", "1e3", "1,000", "", " ", "12.", ".5", "abc", "NaN", "Infinity"]) {
      assert.throws(() => parseMajorAmount(bad, "GHS"), MoneyError, `parse "${bad}"`);
    }
    assert.throws(() => parseMajorAmount(12.5 as unknown as string, "GHS"), MoneyError, "number input refused");
    assert.throws(() => parseMajorAmount("99999999999999999999", "GHS"), MoneyError, "beyond safe integer");
    for (const bad of [-1, 1.5, Number.NaN, Number.POSITIVE_INFINITY, 2 ** 53, "100"]) {
      assert.throws(() => money(bad as number, "GHS"), MoneyError, `money(${String(bad)})`);
    }
    assert.throws(() => money(100, "USD"), MoneyError, "unsupported currency");
    assert.throws(() => money(100, "ghs"), MoneyError, "currency is case-sensitive");
    assert.ok(Object.isFrozen(money(1, "GHS")));
    assert.ok(sameMoney(money(1250, "GHS"), parseMajorAmount("12.5", "GHS")));
  });

  /* 2 + 3. Valid intents; the payer is an adult principal, not a learner. */
  await check("validIntent", () => {
    validatePaymentIntent(intent());
    validatePaymentIntent(intent({ billingAccountId: undefined, payer: { principalId: "p-1", email: "a@b.co", phone: "+233200000000" } }));
  });

  await check("adultPayerRequired", () => {
    expectIntentError(intent({ payer: undefined as never }), "missing payer");
    expectIntentError(intent({ payer: { principalId: "", email: "guardian@example.com" } }), "empty principal");
    expectIntentError(intent({ payer: { principalId: "  ", email: "guardian@example.com" } }), "blank principal");
    expectIntentError(intent({ payer: { principalId: "p-1", email: "not-an-email" } }), "bad email");
    /* The v1 adapter used <learnerId>@filumire.local as the payer; never again. */
    expectIntentError(intent({ payer: { principalId: "p-1", email: "learner-001@filumire.local" } }), "synthetic learner email");
    expectIntentError(intent({ payer: { principalId: "p-1", email: "X@FILUMIRE.LOCAL" } }), "synthetic email any case");
    /* The contract has no learner field; a learner id must not leak into the fingerprint either. */
    const withLearner = { ...intent(), learnerId: "learner-001" } as PaymentIntent;
    assert.ok(!intentFingerprint(withLearner).includes("learner-001"));
  });

  await check("invalidIntentsRefused", () => {
    expectIntentError(null, "null intent");
    expectIntentError(intent({ ourReference: "short" }), "short reference");
    expectIntentError(intent({ ourReference: "has space 0001" }), "reference with space");
    expectIntentError(intent({ ourReference: "../../etc/passwd" }), "path-like reference");
    expectIntentError(intent({ amount: { amountMinor: 0, currency: "GHS" } }), "zero amount");
    expectIntentError(intent({ amount: { amountMinor: -100, currency: "GHS" } }), "negative amount");
    expectIntentError(intent({ amount: { amountMinor: 12.5, currency: "GHS" } }), "fractional pesewas");
    expectIntentError(intent({ amount: { amountMinor: 100, currency: "USD" as never } }), "unsupported currency");
    expectIntentError(intent({ amount: undefined as never }), "missing amount");
    expectIntentError(intent({ description: "" }), "empty description");
    expectIntentError(intent({ description: "x".repeat(201) }), "long description");
  });

  /* 4-8, 10. Strict verification (pure function). */
  const base: ObservedPayment = {
    provider: "fake",
    providerReference: "fake_FLM-TEST-0001",
    ourReference: "FLM-TEST-0001",
    status: "successful",
    amountMinor: 2500,
    currency: "GHS",
  };
  const expected: PaymentExpectation = { provider: "fake", ourReference: "FLM-TEST-0001", amount: money(2500, "GHS") };

  await check("verificationPure", () => {
    assert.equal(verifyAgainstExpectation(expected, base).confirmed, true, "exact match confirmed");
    const cases: Array<[Partial<ObservedPayment>, string]> = [
      [{ amountMinor: 2499 }, "UNDERPAYMENT"],
      [{ amountMinor: 0 }, "UNDERPAYMENT"],
      [{ amountMinor: -2500 }, "UNDERPAYMENT"],
      [{ amountMinor: 2501 }, "OVERPAYMENT"],
      [{ amountMinor: 2500.5 }, "AMOUNT_NOT_INTEGER"],
      [{ amountMinor: Number.NaN }, "AMOUNT_NOT_INTEGER"],
      [{ amountMinor: "2500" as never }, "AMOUNT_NOT_INTEGER"],
      [{ currency: "NGN" }, "CURRENCY_MISMATCH"],
      [{ currency: "ghs" }, "CURRENCY_MISMATCH"],
      [{ ourReference: "FLM-OTHER-0001" }, "REFERENCE_MISMATCH"],
      [{ provider: "paystack" }, "PROVIDER_MISMATCH"],
      [{ status: "failed" }, "STATUS_NOT_SUCCESSFUL"],
      [{ status: "pending" }, "STATUS_NOT_SUCCESSFUL"],
      [{ status: "abandoned" }, "STATUS_NOT_SUCCESSFUL"],
      [{ status: "reversed" }, "STATUS_NOT_SUCCESSFUL"],
      [{ status: "success" as never }, "STATUS_NOT_SUCCESSFUL"],
    ];
    for (const [change, failure] of cases) {
      const result = verifyAgainstExpectation(expected, { ...base, ...change });
      assert.equal(result.confirmed, false, `${JSON.stringify(change)} must not confirm`);
      assert.ok(failuresOf(result).includes(failure as never), `${JSON.stringify(change)} -> ${failure}`);
    }
    const providerRef = verifyAgainstExpectation({ ...expected, providerReference: "fake_OTHER" }, base);
    assert.deepEqual(failuresOf(providerRef), ["PROVIDER_REFERENCE_MISMATCH"]);
    /* Several problems are all reported. */
    const many = verifyAgainstExpectation(expected, { ...base, status: "pending", currency: "USD", amountMinor: 100 });
    assert.deepEqual(failuresOf(many), ["STATUS_NOT_SUCCESSFUL", "CURRENCY_MISMATCH", "UNDERPAYMENT"]);
    /* Malformed observation. */
    assert.deepEqual(failuresOf(verifyAgainstExpectation(expected, null as never)), ["VERIFICATION_UNAVAILABLE"]);
    assert.deepEqual(failuresOf(verifyAgainstExpectation(expected, "ok" as never)), ["VERIFICATION_UNAVAILABLE"]);
  });

  /* Service + fake provider end to end. */
  await check("serviceConfirmsExactPayment", async () => {
    const service = new PaymentService(new FakePaymentProvider());
    const i = intent();
    const initiated = await service.initiate(i);
    assert.equal(initiated.provider, "fake");
    assert.equal(initiated.ourReference, i.ourReference);
    assert.equal(initiated.next.type, "redirect");
    /* Initiation is not proof of payment: the result carries no status or amount received. */
    assert.ok(!("status" in initiated) && !("amountMinor" in initiated));
    const result = await service.confirm(expectation(i));
    assert.equal(result.confirmed, true);
    assert.equal(result.observed?.amountMinor, 2500);
  });

  await check("serviceRejectsMismatches", async () => {
    const provider = new FakePaymentProvider();
    const service = new PaymentService(provider);
    const scenarios: Array<[string, Parameters<FakePaymentProvider["script"]>[1], string]> = [
      ["FLM-UNDER-0001", { amountDeltaMinor: -1 }, "UNDERPAYMENT"],
      ["FLM-OVER-00001", { amountDeltaMinor: 1 }, "OVERPAYMENT"],
      ["FLM-CURR-00001", { currency: "USD" }, "CURRENCY_MISMATCH"],
      ["FLM-REF-000001", { reportReference: "FLM-SOMEONE-ELSE" }, "REFERENCE_MISMATCH"],
      ["FLM-FAIL-00001", { status: "failed" }, "STATUS_NOT_SUCCESSFUL"],
      ["FLM-PEND-00001", { status: "pending" }, "STATUS_NOT_SUCCESSFUL"],
      ["FLM-ABAN-00001", { status: "abandoned" }, "STATUS_NOT_SUCCESSFUL"],
      ["FLM-REV-000001", { status: "reversed" }, "STATUS_NOT_SUCCESSFUL"],
      ["FLM-DOWN-00001", { unavailable: true }, "VERIFICATION_UNAVAILABLE"],
      ["FLM-BAD-000001", { malformed: true }, "VERIFICATION_UNAVAILABLE"],
    ];
    for (const [reference, outcome, failure] of scenarios) {
      const i = intent({ ourReference: reference });
      await service.initiate(i);
      provider.script(reference, outcome);
      const result = await service.confirm(expectation(i));
      assert.equal(result.confirmed, false, `${reference} must not confirm`);
      assert.ok(failuresOf(result).includes(failure as never), `${reference} -> ${failure}, got ${failuresOf(result).join(",")}`);
    }
    /* Pending later becomes successful: confirmation follows the provider, not the first answer. */
    const late = intent({ ourReference: "FLM-LATE-00001" });
    await service.initiate(late);
    provider.script(late.ourReference, { status: "pending" });
    assert.equal((await service.confirm(expectation(late))).confirmed, false);
    provider.script(late.ourReference, { status: "successful" });
    assert.equal((await service.confirm(expectation(late))).confirmed, true);
    /* Unknown reference: never initiated, never confirmed. */
    const unknown = await service.confirm(expectation(intent({ ourReference: "FLM-NEVER-0001" })));
    assert.deepEqual(failuresOf(unknown), ["VERIFICATION_UNAVAILABLE"]);
  });

  await check("callerCannotLowerTheExpectation", async () => {
    const service = new PaymentService(new FakePaymentProvider());
    const i = intent({ ourReference: "FLM-EXPECT-001" });
    await service.initiate(i);
    const lowered = await service.confirm({ ...expectation(i), amount: money(1, "GHS") });
    assert.deepEqual(failuresOf(lowered), ["EXPECTATION_CONFLICT"]);
    const wrongProviderRef = await service.confirm({ ...expectation(i), providerReference: "fake_OTHER" });
    assert.deepEqual(failuresOf(wrongProviderRef), ["EXPECTATION_CONFLICT"]);
    const wrongProvider = await service.confirm(expectation(i, "paystack"));
    assert.deepEqual(failuresOf(wrongProvider), ["PROVIDER_MISMATCH"]);
    for (const bad of [
      { ...expectation(i), ourReference: "bad ref" },
      { ...expectation(i), amount: { amountMinor: 0, currency: "GHS" } },
      { ...expectation(i), amount: { amountMinor: 25.5, currency: "GHS" } },
      { ...expectation(i), amount: { amountMinor: 2500, currency: "USD" } },
      null,
    ]) {
      await assert.rejects(
        service.confirm(bad as PaymentExpectation),
        (error: unknown) => error instanceof PaymentError && error.code === "INVALID_INTENT",
      );
    }
  });

  /* 9. Duplicates. */
  await check("duplicateAttempts", async () => {
    const provider = new FakePaymentProvider();
    const service = new PaymentService(provider);
    const i = intent({ ourReference: "FLM-DUP-000001" });
    const first = await service.initiate(i);
    const second = await service.initiate({ ...i, payer: { ...i.payer, email: "GUARDIAN@example.com" } });
    assert.deepEqual(second, first, "same attempt returns the same payment");
    assert.equal(provider.initiateCalls, 1, "retry does not reach the provider");
    assert.equal(provider.chargesCreated, 1, "one charge only");
    await assert.rejects(
      service.initiate({ ...i, amount: money(2600, "GHS") }),
      (error: unknown) => error instanceof PaymentError && error.code === "DUPLICATE_ATTEMPT_CONFLICT",
    );
    await assert.rejects(
      service.initiate({ ...i, payer: { principalId: "principal-other", email: "other@example.com" } }),
      (error: unknown) => error instanceof PaymentError && error.code === "DUPLICATE_ATTEMPT_CONFLICT",
    );
    /* The fake provider applies the same rule on its own (another service instance). */
    const other = new PaymentService(provider);
    assert.deepEqual(await other.initiate(i), first);
    assert.equal(provider.chargesCreated, 1);
    await assert.rejects(
      other.initiate({ ...i, amount: money(1, "GHS") }),
      (error: unknown) => error instanceof PaymentError && error.code === "DUPLICATE_ATTEMPT_CONFLICT",
    );
    /* Repeated confirmation is stable and grants nothing extra. */
    const a = await service.confirm(expectation(i));
    const b = await service.confirm(expectation(i));
    assert.deepEqual(a, b);
    assert.equal(a.confirmed, true);
    assert.equal(provider.chargesCreated, 1);
  });

  /* 11. Determinism. */
  await check("fakeProviderDeterministic", async () => {
    const runOnce = async () => {
      const provider = new FakePaymentProvider();
      const service = new PaymentService(provider);
      const out: unknown[] = [];
      for (const [reference, delta] of [["FLM-DET-000001", 0], ["FLM-DET-000002", -5]] as const) {
        const i = intent({ ourReference: reference });
        out.push(await service.initiate(i));
        provider.script(reference, { amountDeltaMinor: delta });
        out.push(await service.confirm(expectation(i)));
      }
      return JSON.stringify(out);
    };
    assert.equal(await runOnce(), await runOnce());
  });

  /* 13. Contract consistency: both adapters expose the same surface. */
  await check("contractConsistency", async () => {
    const { PaystackAdapter } = await import("../services/payments/paystack");
    const adapters: PaymentProviderAdapter[] = [
      new FakePaymentProvider(),
      new PaystackAdapter({ secretKey: "sk_test_FAKEFAKEFAKEFAKEFAKEFAKE0000", mode: "sandbox", fetchImpl: globalThis.fetch }),
    ];
    for (const adapter of adapters) {
      assert.equal(typeof adapter.initiate, "function");
      assert.equal(typeof adapter.verify, "function");
      assert.equal(adapter.mode, "sandbox");
      assert.ok(["fake", "paystack"].includes(adapter.id));
      /* Both refuse invalid intents before any provider work. */
      await assert.rejects(
        adapter.initiate(intent({ amount: { amountMinor: 1.5, currency: "GHS" } })),
        (error: unknown) => error instanceof PaymentError && error.code === "INVALID_INTENT",
      );
    }
  });

  assert.equal(networkCalls, 0, "no network calls");
  console.log({ paymentService: "PASS", checks: Object.keys(results).length, networkCalls });
}

let finished = false;
process.on("exit", (code) => {
  if (code === 0 && !finished) {
    console.error("payment-service test ended before finishing (pending promise); failing.");
    process.exitCode = 1;
  }
});

run()
  .then(() => {
    finished = true;
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
