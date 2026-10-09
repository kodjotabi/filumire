/*
 * Payments Phase 2, step 1: Paystack adapter v2 against recorded-shape
 * responses. fetch is injected; the global fetch is replaced by one that
 * fails the test, so no request can reach Paystack. The key is fake.
 */
import assert from "node:assert/strict";
import { money, PaymentError, type PaymentExpectation, type PaymentIntent } from "../packages/payments";
import { PaymentService } from "../services/payments";
import { PaystackAdapter } from "../services/payments/paystack";

const FAKE_TEST_KEY = "sk_test_FAKEFAKEFAKEFAKEFAKEFAKE0000";

let globalNetworkCalls = 0;
globalThis.fetch = (async () => {
  globalNetworkCalls += 1;
  throw new Error("Network access is not allowed in payment tests.");
}) as typeof fetch;

interface Recorded {
  url: string;
  method: string;
  headers: Record<string, string>;
  body: unknown;
}

type Responder = (request: Recorded) => Response | Promise<Response>;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

function fakeFetch(responder: Responder) {
  const calls: Recorded[] = [];
  const impl = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const request: Recorded = {
      url: String(input),
      method: init?.method ?? "GET",
      headers: (init?.headers ?? {}) as Record<string, string>,
      body: typeof init?.body === "string" ? JSON.parse(init.body) : undefined,
    };
    calls.push(request);
    assert.ok(request.url.startsWith("https://api.paystack.co/"), "only the Paystack API host");
    return responder(request);
  }) as typeof fetch;
  return { impl, calls };
}

function adapterWith(responder: Responder, timeoutMs?: number) {
  const fetcher = fakeFetch(responder);
  return { adapter: new PaystackAdapter({ secretKey: FAKE_TEST_KEY, mode: "sandbox", fetchImpl: fetcher.impl, timeoutMs }), calls: fetcher.calls };
}

const REF = "FLM-PSTK-0001";

function intent(overrides: Partial<PaymentIntent> = {}): PaymentIntent {
  return {
    ourReference: REF,
    amount: money(1999, "GHS"),
    payer: { principalId: "principal-guardian-001", email: "guardian@example.com" },
    description: "FILUMIRE test access period",
    billingAccountId: "billing-test-001",
    ...overrides,
  };
}

const expected: PaymentExpectation = { provider: "paystack", ourReference: REF, amount: money(1999, "GHS") };

function initializeOk(request: Recorded): Response {
  const body = request.body as { reference: string };
  return json({ status: true, message: "Authorization URL created", data: { authorization_url: "https://checkout.paystack.test/abc", access_code: "abc", reference: body.reference } });
}

function verifyData(overrides: Record<string, unknown> = {}) {
  return { status: true, message: "Verification successful", data: { reference: REF, status: "success", amount: 1999, currency: "GHS", channel: "mobile_money", paid_at: "2026-10-08T10:00:00.000Z", ...overrides } };
}

async function expectCode(code: PaymentError["code"], promise: Promise<unknown>, label: string): Promise<PaymentError> {
  try {
    await promise;
  } catch (error) {
    assert.ok(error instanceof PaymentError, `${label}: expected PaymentError, got ${String(error)}`);
    assert.equal(error.code, code, `${label}: wrong code (${error.message})`);
    assert.ok(!error.message.includes(FAKE_TEST_KEY), `${label}: key leaked into error`);
    return error;
  }
  throw new Error(`${label}: expected ${code}, nothing was thrown`);
}

const results: Record<string, "PASS"> = {};
async function check(name: string, run: () => Promise<void>): Promise<void> {
  await run();
  results[name] = "PASS";
}

async function run(): Promise<void> {
  await check("initiateRequestShape", async () => {
    const { adapter, calls } = adapterWith(initializeOk);
    /* Even if a caller smuggles a learner id onto the intent, it is not sent. */
    const initiated = await adapter.initiate({ ...intent(), learnerId: "learner-001" } as PaymentIntent);
    assert.deepEqual(initiated, {
      provider: "paystack",
      ourReference: REF,
      providerReference: REF,
      next: { type: "redirect", url: "https://checkout.paystack.test/abc" },
    });
    assert.equal(calls.length, 1);
    const [call] = calls;
    assert.equal(call.method, "POST");
    assert.equal(call.url, "https://api.paystack.co/transaction/initialize");
    assert.equal(call.headers.Authorization, `Bearer ${FAKE_TEST_KEY}`);
    const body = call.body as Record<string, unknown>;
    assert.equal(body.amount, 1999, "integer pesewas sent unchanged");
    assert.ok(Number.isSafeInteger(body.amount));
    assert.equal(body.currency, "GHS");
    assert.equal(body.reference, REF);
    assert.equal(body.email, "guardian@example.com", "adult payer email");
    const serialised = JSON.stringify(body);
    assert.ok(!serialised.includes("learner"), "no learner identity sent to Paystack");
    assert.ok(!serialised.includes("filumire.local"));
    assert.deepEqual(body.metadata, { payer_principal_id: "principal-guardian-001", billing_account_id: "billing-test-001", filumire_mode: "sandbox" });
  });

  await check("initiateRejectsBadIntentWithoutCalling", async () => {
    const { adapter, calls } = adapterWith(initializeOk);
    await expectCode("INVALID_INTENT", adapter.initiate(intent({ amount: { amountMinor: 19.99, currency: "GHS" } })), "float amount");
    await expectCode("INVALID_INTENT", adapter.initiate(intent({ payer: { principalId: "p", email: "learner-1@filumire.local" } })), "learner email");
    assert.equal(calls.length, 0);
  });

  await check("initiateResponseValidated", async () => {
    await expectCode("PROVIDER_RESPONSE_INVALID", adapterWith(() => json({ status: true, data: { reference: "OTHER-REF-001", authorization_url: "https://x.test" } })).adapter.initiate(intent()), "reference mismatch");
    await expectCode("PROVIDER_RESPONSE_INVALID", adapterWith(() => json({ status: true, data: { reference: REF } })).adapter.initiate(intent()), "no url");
    await expectCode("DUPLICATE_ATTEMPT_CONFLICT", adapterWith(() => json({ status: false, message: "Duplicate Transaction Reference" }, 400)).adapter.initiate(intent()), "duplicate");
    await expectCode("PROVIDER_ERROR", adapterWith(() => json({ status: false, message: "Invalid key" }, 401)).adapter.initiate(intent()), "401");
  });

  await check("verifyNormalises", async () => {
    const { adapter, calls } = adapterWith(() => json(verifyData()));
    const observed = await adapter.verify(REF);
    assert.deepEqual(observed, {
      provider: "paystack",
      providerReference: REF,
      ourReference: REF,
      status: "successful",
      amountMinor: 1999,
      currency: "GHS",
      channel: "mobile_money",
      paidAt: "2026-10-08T10:00:00.000Z",
    });
    assert.equal(calls[0].method, "GET");
    assert.equal(calls[0].url, `https://api.paystack.co/transaction/verify/${REF}`);
    const statuses: Record<string, string> = { failed: "failed", abandoned: "abandoned", reversed: "reversed", ongoing: "pending", pending: "pending", processing: "pending", queued: "pending" };
    for (const [paystackStatus, normalised] of Object.entries(statuses)) {
      const { adapter: a } = adapterWith(() => json(verifyData({ status: paystackStatus })));
      assert.equal((await a.verify(REF)).status, normalised, paystackStatus);
    }
    const { adapter: other } = adapterWith(() => json(verifyData({ channel: "ussd" })));
    assert.equal((await other.verify(REF)).channel, "other");
    const { adapter: proto } = adapterWith(() => json(verifyData({ channel: "constructor" })));
    assert.equal((await proto.verify(REF)).channel, "other");
  });

  await check("verifyMalformedResponses", async () => {
    const malformed: Array<[string, Responder]> = [
      ["unknown status", () => json(verifyData({ status: "weird" }))],
      ["prototype status", () => json(verifyData({ status: "constructor" }))],
      ["missing amount", () => json(verifyData({ amount: undefined }))],
      ["string amount", () => json(verifyData({ amount: "1999" }))],
      ["float amount", () => json(verifyData({ amount: 19.99 }))],
      ["missing currency", () => json(verifyData({ currency: null }))],
      ["missing reference", () => json(verifyData({ reference: 42 }))],
    ];
    for (const [label, responder] of malformed) {
      await expectCode("PROVIDER_RESPONSE_INVALID", adapterWith(responder).adapter.verify(REF), label);
    }
    await expectCode("PROVIDER_RESPONSE_INVALID", adapterWith(() => new Response("<html>bad gateway</html>", { status: 502 })).adapter.verify(REF), "html body");
    await expectCode("PROVIDER_RESPONSE_INVALID", adapterWith(() => json(null)).adapter.verify(REF), "null body");
    await expectCode("PROVIDER_ERROR", adapterWith(() => json({ status: true, data: "oops" })).adapter.verify(REF), "string data");
    await expectCode("PROVIDER_ERROR", adapterWith(() => json({ status: true })).adapter.verify(REF), "no data");
    await expectCode("PROVIDER_ERROR", adapterWith(() => json({ status: "true", data: {} })).adapter.verify(REF), "status not boolean");
    await expectCode("PROVIDER_ERROR", adapterWith(() => json({ status: false, message: "Transaction reference not found" }, 404)).adapter.verify(REF), "404");
    await expectCode("PROVIDER_ERROR", adapterWith(() => json(verifyData(), 500)).adapter.verify(REF), "500 even with body");
  });

  await check("networkErrorsAndTimeouts", async () => {
    await expectCode("PROVIDER_ERROR", adapterWith(() => { throw new TypeError("fetch failed"); }).adapter.verify(REF), "network error");
    /* A provider that never answers: the adapter's timeout must abort the call. */
    const adapter = new PaystackAdapter({
      secretKey: FAKE_TEST_KEY,
      mode: "sandbox",
      timeoutMs: 50,
      fetchImpl: ((_input: RequestInfo | URL, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => reject(init.signal?.reason));
        })) as typeof fetch,
    });
    /* AbortSignal.timeout's timer does not keep Node alive; hold the loop open meanwhile. */
    const keepAlive = setInterval(() => {}, 1000);
    try {
      await expectCode("PROVIDER_ERROR", adapter.verify(REF), "timeout");
    } finally {
      clearInterval(keepAlive);
    }
  });

  await check("verifyRefusesMalformedReference", async () => {
    const { adapter, calls } = adapterWith(() => json(verifyData()));
    await expectCode("INVALID_INTENT", adapter.verify("../../balance"), "path-like reference");
    await expectCode("INVALID_INTENT", adapter.verify(""), "empty reference");
    assert.equal(calls.length, 0);
  });

  await check("serviceVerificationThroughPaystack", async () => {
    const scenarios: Array<[Record<string, unknown>, string | null]> = [
      [{}, null],
      [{ amount: 1998 }, "UNDERPAYMENT"],
      [{ amount: 2000 }, "OVERPAYMENT"],
      [{ currency: "NGN" }, "CURRENCY_MISMATCH"],
      [{ reference: "FLM-OTHER-0001" }, "REFERENCE_MISMATCH"],
      [{ status: "failed" }, "STATUS_NOT_SUCCESSFUL"],
      [{ status: "ongoing" }, "STATUS_NOT_SUCCESSFUL"],
      [{ status: "weird" }, "VERIFICATION_UNAVAILABLE"],
    ];
    for (const [overrides, failure] of scenarios) {
      const { adapter } = adapterWith((request) => (request.method === "POST" ? initializeOk(request) : json(verifyData(overrides))));
      const service = new PaymentService(adapter);
      await service.initiate(intent());
      const result = await service.confirm(expected);
      if (failure === null) {
        assert.equal(result.confirmed, true, "exact payment confirmed");
      } else {
        assert.equal(result.confirmed, false, `${JSON.stringify(overrides)} must not confirm`);
        assert.ok(result.failures.includes(failure as never), `${JSON.stringify(overrides)} -> ${failure}, got ${result.failures.join(",")}`);
      }
    }
  });

  await check("serviceDeduplicatesPaystackRetries", async () => {
    const { adapter, calls } = adapterWith(initializeOk);
    const service = new PaymentService(adapter);
    const first = await service.initiate(intent());
    const second = await service.initiate(intent());
    assert.deepEqual(second, first);
    assert.equal(calls.length, 1, "Paystack asked once");
    await assert.rejects(service.initiate(intent({ amount: money(2999, "GHS") })), (error: unknown) => error instanceof PaymentError && error.code === "DUPLICATE_ATTEMPT_CONFLICT");
    assert.equal(calls.length, 1);
  });

  assert.equal(globalNetworkCalls, 0, "no real network calls");
  console.log({ paystackAdapter: "PASS", checks: Object.keys(results).length, globalNetworkCalls });
}

let finished = false;
process.on("exit", (code) => {
  if (code === 0 && !finished) {
    console.error("paystack-adapter test ended before finishing (pending promise); failing.");
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
