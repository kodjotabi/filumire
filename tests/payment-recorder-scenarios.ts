/*
 * Payments Phase 2, step 2: recorder scenarios shared by the in-memory test
 * (tests/payment-lifecycle.test.ts) and the Postgres test
 * (tests/payment-persistence-postgres.test.ts). Fake provider only.
 */
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { money, PaymentError, type PaymentErrorCode } from "../packages/payments";
import {
  FakePaymentProvider,
  FakeProviderLedger,
  PaymentRecorder,
  type FakeAbsence,
  type PaymentAttemptRecord,
  type PaymentAttemptStore,
  type StartPaymentInput,
} from "../services/payments";

export interface ScenarioContext {
  newStore(): PaymentAttemptStore;
  newPayer(): Promise<string>;
}

const SETTLE_MS = 15 * 60 * 1000;
const PAYER_EMAIL = "guardian.scenario@example.com";
const CHECKOUT_HOST = "fake-payments.invalid";

class Clock {
  t = Date.now();
  now = () => new Date(this.t);
  advance(ms: number) {
    this.t += ms;
  }
}

const runId = randomUUID().slice(0, 8);
let counter = 0;
const unique = (prefix: string) => `${prefix}-${runId}-${++counter}`;

interface Harness {
  store: PaymentAttemptStore;
  provider: FakePaymentProvider;
  recorder: PaymentRecorder;
  clock: Clock;
  payer: string;
  input(overrides?: Partial<StartPaymentInput>): StartPaymentInput;
}

async function harness(ctx: ScenarioContext, options: { absence?: FakeAbsence; ledger?: FakeProviderLedger } = {}): Promise<Harness> {
  const store = ctx.newStore();
  const provider = new FakePaymentProvider({ absence: options.absence, ledger: options.ledger });
  const clock = new Clock();
  const recorder = new PaymentRecorder(store, provider, { now: clock.now, settleWindowMs: SETTLE_MS });
  const payer = await ctx.newPayer();
  const obligationId = unique("obl");
  return {
    store,
    provider,
    recorder,
    clock,
    payer,
    input: (overrides = {}) => ({
      idempotencyKey: unique("key"),
      obligationId,
      amount: money(2500, "GHS"),
      payer: { principalId: payer, email: PAYER_EMAIL },
      description: "FILUMIRE test access period",
      billingAccountId: "billing-scenario",
      ...overrides,
    }),
  };
}

async function expectCode(code: PaymentErrorCode, promise: Promise<unknown>, label: string): Promise<void> {
  await assert.rejects(promise, (error: unknown) => error instanceof PaymentError && error.code === code, label);
}

async function eventTypes(store: PaymentAttemptStore, attempt: PaymentAttemptRecord): Promise<string[]> {
  return (await store.listEvents(attempt.id)).map((e) => e.eventType);
}

export type Scenario = [name: string, run: (ctx: ScenarioContext) => Promise<void>];

export const recorderScenarios: Scenario[] = [
  ["happyPathAndImmutableSuccess", async (ctx) => {
    const h = await harness(ctx);
    const started = await h.recorder.startAttempt(h.input());
    assert.equal(started.kind, "initiated");
    if (started.kind !== "initiated") return;
    assert.equal(started.attempt.status, "pending", "initiation is not payment");
    assert.equal(started.next.type, "redirect");
    const done = await h.recorder.reconcile(started.attempt.id);
    assert.equal(done.status, "succeeded");
    assert.ok(done.confirmedAt instanceof Date);
    assert.equal(done.observedAmountMinor, 2500);
    assert.equal(done.providerReference, `fake_${done.ourReference}`);
    assert.deepEqual(await eventTypes(h.store, done), ["created", "initiated", "verified_succeeded"]);
    /* Repeated verification: no provider call, no new event, nothing changes. */
    const calls = h.provider.ledger.verifyCalls;
    const again = await h.recorder.reconcile(done.id);
    assert.deepEqual(again, done);
    assert.equal(h.provider.ledger.verifyCalls, calls);
    assert.equal((await h.store.listEvents(done.id)).length, 3);
    /* The store refuses any change to a succeeded attempt. */
    const refused = await h.store.transition(done.id, { from: ["succeeded"], to: "failed", event: { type: "manual_test" }, at: h.clock.now() });
    assert.equal(refused.applied, false);
    assert.equal(refused.attempt.status, "succeeded");
  }],

  ["noCheckoutUrlOrContactStored", async (ctx) => {
    const h = await harness(ctx);
    const started = await h.recorder.startAttempt(h.input());
    assert.equal(started.kind, "initiated");
    await h.recorder.reconcile(started.attempt.id);
    const stored = JSON.stringify([await h.store.findById(started.attempt.id), await h.store.listEvents(started.attempt.id)]);
    assert.ok(!stored.includes(CHECKOUT_HOST), "checkout URL not persisted");
    assert.ok(!stored.includes(PAYER_EMAIL), "payer email not persisted");
    assert.ok(!stored.includes("FILUMIRE test access period"), "description not persisted");
  }],

  ["pendingStaysPending", async (ctx) => {
    const h = await harness(ctx);
    const started = await h.recorder.startAttempt(h.input());
    h.provider.script(started.attempt.ourReference, { status: "pending" });
    const checked = await h.recorder.reconcile(started.attempt.id);
    assert.equal(checked.status, "pending");
    assert.equal(checked.verifyCount, 1);
    h.provider.script(started.attempt.ourReference, { status: "successful" });
    assert.equal((await h.recorder.reconcile(started.attempt.id)).status, "succeeded");
  }],

  ["idempotentReplayAndConflicts", async (ctx) => {
    const h = await harness(ctx);
    const input = h.input();
    const first = await h.recorder.startAttempt(input);
    const second = await h.recorder.startAttempt({ ...input, payer: { ...input.payer, email: "OTHER.contact@example.com" }, description: "other text" });
    assert.equal(second.kind, "replayed");
    assert.equal(second.attempt.id, first.attempt.id);
    assert.equal(h.provider.chargesCreated, 1);
    await expectCode("DUPLICATE_ATTEMPT_CONFLICT", h.recorder.startAttempt({ ...input, amount: money(2600, "GHS") }), "different amount");
    await expectCode("DUPLICATE_ATTEMPT_CONFLICT", h.recorder.startAttempt({ ...input, payer: { principalId: await ctx.newPayer(), email: PAYER_EMAIL } }), "different payer");
    await expectCode("DUPLICATE_ATTEMPT_CONFLICT", h.recorder.startAttempt({ ...input, obligationId: unique("obl") }), "different obligation");
    await expectCode("DUPLICATE_ATTEMPT_CONFLICT", h.recorder.startAttempt({ ...input, billingAccountId: undefined }), "different billing account");
    assert.equal(h.provider.chargesCreated, 1);
  }],

  ["payerCanPaySeveralObligations", async (ctx) => {
    const h = await harness(ctx);
    const a = await h.recorder.startAttempt(h.input({ obligationId: unique("obl-learner-a") }));
    const b = await h.recorder.startAttempt(h.input({ obligationId: unique("obl-learner-b"), amount: money(4000, "GHS") }));
    assert.equal(a.kind, "initiated");
    assert.equal(b.kind, "initiated");
    assert.equal((await h.recorder.reconcile(a.attempt.id)).status, "succeeded");
    assert.equal((await h.recorder.reconcile(b.attempt.id)).status, "succeeded");
    assert.equal(h.provider.chargesCreated, 2);
  }],

  ["oneActiveAttemptPerObligation", async (ctx) => {
    const h = await harness(ctx);
    const first = await h.recorder.startAttempt(h.input());
    h.provider.script(first.attempt.ourReference, { status: "pending" });
    const second = await h.recorder.startAttempt(h.input());
    assert.equal(second.kind, "obligation_in_progress");
    assert.equal(second.attempt.id, first.attempt.id);
    h.provider.script(first.attempt.ourReference, { status: "successful" });
    const third = await h.recorder.startAttempt(h.input());
    assert.equal(third.kind, "already_paid");
    assert.equal(third.attempt.id, first.attempt.id);
    assert.equal(h.provider.chargesCreated, 1);
  }],

  ["confirmedFailureAllowsNewAttempt", async (ctx) => {
    const h = await harness(ctx);
    const first = await h.recorder.startAttempt(h.input());
    h.provider.script(first.attempt.ourReference, { status: "failed" });
    assert.equal((await h.recorder.reconcile(first.attempt.id)).status, "failed");
    const retry = await h.recorder.startAttempt(h.input());
    assert.equal(retry.kind, "initiated");
    assert.notEqual(retry.attempt.id, first.attempt.id);
    assert.equal((await h.recorder.reconcile(retry.attempt.id)).status, "succeeded");
    assert.equal(h.provider.chargesCreated, 2);
  }],

  ["mismatchesNeedReviewAndBlockObligation", async (ctx) => {
    const cases: Array<[Parameters<FakePaymentProvider["script"]>[1], string]> = [
      [{ amountDeltaMinor: -1 }, "UNDERPAYMENT"],
      [{ amountDeltaMinor: 1 }, "OVERPAYMENT"],
      [{ currency: "USD" }, "CURRENCY_MISMATCH"],
      [{ reportReference: "FLM-SOMEONE-ELSE" }, "REFERENCE_MISMATCH"],
      [{ status: "reversed" }, "STATUS_NOT_SUCCESSFUL"],
    ];
    for (const [outcome, failure] of cases) {
      const h = await harness(ctx);
      const started = await h.recorder.startAttempt(h.input());
      h.provider.script(started.attempt.ourReference, outcome);
      const checked = await h.recorder.reconcile(started.attempt.id);
      assert.equal(checked.status, "needs_review", JSON.stringify(outcome));
      assert.ok(checked.verificationFailures?.includes(failure), `${JSON.stringify(outcome)} -> ${failure}`);
      assert.equal(checked.confirmedAt, null);
      await expectCode("OBLIGATION_NEEDS_REVIEW", h.recorder.startAttempt(h.input()), "blocked obligation");
      assert.equal(h.provider.chargesCreated, 1);
    }
  }],

  ["timeoutIsUnknownNeverFailedOrRecharged", async (ctx) => {
    const h = await harness(ctx, { absence: "transient" });
    h.provider.failNextInitiate("not_sent");
    const input = h.input();
    const started = await h.recorder.startAttempt(input);
    assert.equal(started.kind, "uncertain");
    assert.equal(started.attempt.status, "unknown");
    assert.equal(started.attempt.lastErrorCode, "PROVIDER_ERROR");
    /* Retrying the same request never re-initiates. */
    const replay = await h.recorder.startAttempt(input);
    assert.equal(replay.kind, "replayed");
    assert.equal(replay.attempt.status, "unknown");
    /* A new request for the same obligation is held back. */
    const other = await h.recorder.startAttempt(h.input());
    assert.equal(other.kind, "obligation_in_progress");
    /* Long after the settle window, transient absence still proves nothing. */
    h.clock.advance(SETTLE_MS * 10);
    assert.equal((await h.recorder.reconcile(started.attempt.id)).status, "unknown");
    assert.equal(h.provider.initiateCalls, 1);
    assert.equal(h.provider.chargesCreated, 0);
  }],

  ["authoritativeAbsenceOnlyAfterSettleWindow", async (ctx) => {
    const h = await harness(ctx, { absence: "authoritative" });
    h.provider.failNextInitiate("not_sent");
    const started = await h.recorder.startAttempt(h.input());
    assert.equal(started.attempt.status, "unknown");
    const early = await h.recorder.reconcile(started.attempt.id);
    assert.equal(early.status, "unknown", "inside the settle window");
    assert.ok((await eventTypes(h.store, early)).includes("provider_absent_within_settle_window"));
    h.clock.advance(SETTLE_MS);
    const late = await h.recorder.reconcile(started.attempt.id);
    assert.equal(late.status, "failed");
    assert.equal(late.lastErrorCode, "PAYMENT_NOT_FOUND");
    const retry = await h.recorder.startAttempt(h.input());
    assert.equal(retry.kind, "initiated");
  }],

  ["lostResponseRecoveredByVerification", async (ctx) => {
    const h = await harness(ctx);
    h.provider.failNextInitiate("lost_response");
    const started = await h.recorder.startAttempt(h.input());
    assert.equal(started.kind, "uncertain");
    assert.equal(started.attempt.providerReference, null);
    assert.equal(h.provider.chargesCreated, 1, "the provider did create the charge");
    const blocked = await h.recorder.startAttempt(h.input());
    assert.equal(blocked.kind, "already_paid", "reconciled before any new charge");
    assert.equal(blocked.attempt.id, started.attempt.id);
    assert.equal(blocked.attempt.providerReference, `fake_${started.attempt.ourReference}`);
    assert.equal(h.provider.chargesCreated, 1);
  }],

  ["acknowledgedPaymentMissingNeedsReview", async (ctx) => {
    const h = await harness(ctx, { absence: "authoritative" });
    const started = await h.recorder.startAttempt(h.input());
    h.provider.ledger.attempts.delete(started.attempt.ourReference);
    h.clock.advance(SETTLE_MS * 2);
    const checked = await h.recorder.reconcile(started.attempt.id);
    assert.equal(checked.status, "needs_review", "a pending payment that vanished is never 'failed'");
  }],

  ["verificationUnavailableChangesNothing", async (ctx) => {
    const h = await harness(ctx);
    const started = await h.recorder.startAttempt(h.input());
    for (const outcome of [{ unavailable: true }, { malformed: true }]) {
      h.provider.script(started.attempt.ourReference, outcome);
      const checked = await h.recorder.reconcile(started.attempt.id);
      assert.equal(checked.status, "pending", JSON.stringify(outcome));
    }
    const final = await h.store.findById(started.attempt.id);
    assert.equal(final?.verifyCount, 2);
    assert.equal(final?.lastErrorCode, "PROVIDER_RESPONSE_INVALID");
  }],

  ["freshCreatedAttemptIsNotTouched", async (ctx) => {
    const h = await harness(ctx, { absence: "authoritative" });
    const input = h.input();
    /* Simulate a crash after saving, before calling the provider. */
    const created = await h.store.create({
      id: randomUUID(), idempotencyKey: input.idempotencyKey, obligationId: input.obligationId, ourReference: `FLM-${randomUUID().replace(/-/g, "")}`,
      requestFingerprint: "crash-test", provider: "fake", mode: "sandbox", payerPrincipalId: h.payer, billingAccountId: null,
      amountMinor: 2500, currency: "GHS", createdAt: h.clock.now(),
    });
    assert.ok(created.created);
    if (!created.created) return;
    assert.equal((await h.recorder.reconcile(created.attempt.id)).status, "created", "may still be initiating");
    assert.equal(h.provider.ledger.verifyCalls, 0);
    h.clock.advance(SETTLE_MS);
    assert.equal((await h.recorder.reconcile(created.attempt.id)).status, "failed", "authoritatively absent after the window");
  }],

  ["storeRefusesInvalidTransitions", async (ctx) => {
    const h = await harness(ctx);
    const started = await h.recorder.startAttempt(h.input());
    const id = started.attempt.id;
    const at = h.clock.now();
    for (const to of ["created", "unknown"] as const) {
      const result = await h.store.transition(id, { from: ["pending"], to, event: { type: "manual_test" }, at });
      assert.equal(result.applied, false, `pending -> ${to}`);
    }
    const wrongFrom = await h.store.transition(id, { from: ["unknown"], to: "failed", event: { type: "manual_test" }, at });
    assert.equal(wrongFrom.applied, false, "from-status guard");
    await assert.rejects(
      h.store.transition(id, { from: ["pending"], to: "succeeded", patch: { observedStatus: "successful", observedAmountMinor: 1, observedCurrency: "GHS", confirmedAt: at }, event: { type: "manual_test" }, at }),
      (error: unknown) => error instanceof PaymentError && error.code === "PERSISTENCE_ERROR",
      "succeeded with wrong amount",
    );
    assert.equal((await h.store.findById(id))?.status, "pending");
  }],

  ["invalidInputsStoreNothing", async (ctx) => {
    const h = await harness(ctx);
    const input = h.input();
    await expectCode("INVALID_INTENT", h.recorder.startAttempt({ ...input, idempotencyKey: "short" }), "short key");
    await expectCode("INVALID_INTENT", h.recorder.startAttempt({ ...input, obligationId: "has space" }), "bad obligation");
    await expectCode("INVALID_INTENT", h.recorder.startAttempt({ ...input, payer: { principalId: h.payer, email: "learner-1@filumire.local" } }), "learner email");
    await expectCode("INVALID_INTENT", h.recorder.startAttempt({ ...input, amount: { amountMinor: 25.5, currency: "GHS" } }), "float amount");
    assert.equal(await h.store.findByIdempotencyKey(input.idempotencyKey), null);
    assert.equal(h.provider.initiateCalls, 0);
  }],

  ["concurrentSameKey", async (ctx) => {
    const h = await harness(ctx);
    const input = h.input();
    const results = await Promise.all(Array.from({ length: 8 }, () => h.recorder.startAttempt(input)));
    assert.equal(new Set(results.map((r) => r.attempt.id)).size, 1, "one attempt");
    assert.equal(results.filter((r) => r.kind === "initiated").length, 1);
    assert.equal(h.provider.chargesCreated, 1, "one charge");
  }],

  ["concurrentSameObligationDifferentKeys", async (ctx) => {
    const h = await harness(ctx);
    const results = await Promise.all(Array.from({ length: 8 }, () => h.recorder.startAttempt(h.input())));
    assert.equal(results.filter((r) => r.kind === "initiated").length, 1);
    /* Late losers may reconcile the winner's attempt after it succeeded: already_paid. */
    assert.ok(results.every((r) => ["initiated", "obligation_in_progress", "already_paid"].includes(r.kind)), results.map((r) => r.kind).join(","));
    assert.equal(new Set(results.map((r) => r.attempt.id)).size, 1);
    assert.equal(h.provider.chargesCreated, 1);
  }],

  ["concurrentVerificationOneSuccess", async (ctx) => {
    const h = await harness(ctx);
    const started = await h.recorder.startAttempt(h.input());
    const results = await Promise.all(Array.from({ length: 8 }, () => h.recorder.reconcile(started.attempt.id)));
    assert.ok(results.every((r) => r.status === "succeeded"));
    const events = await h.store.listEvents(started.attempt.id);
    assert.equal(events.filter((e) => e.toStatus === "succeeded").length, 1, "exactly one success event");
    assert.deepEqual(events.map((e) => e.sequence), events.map((_, i) => i + 1), "gapless sequence");
  }],

  ["reconciliationSweep", async (ctx) => {
    const h = await harness(ctx);
    const a = await h.recorder.startAttempt(h.input({ obligationId: unique("obl-sweep-a") }));
    const b = await h.recorder.startAttempt(h.input({ obligationId: unique("obl-sweep-b") }));
    h.provider.script(b.attempt.ourReference, { status: "abandoned" });
    h.clock.advance(1000);
    const swept = await h.recorder.reconcileActive(500);
    const byId = new Map(swept.map((r) => [r.id, r.status]));
    assert.equal(byId.get(a.attempt.id), "succeeded");
    assert.equal(byId.get(b.attempt.id), "failed");
  }],
];

export async function runRecorderScenarios(ctx: ScenarioContext): Promise<string[]> {
  const passed: string[] = [];
  for (const [name, run] of recorderScenarios) {
    try {
      await run(ctx);
    } catch (error) {
      console.error(`Scenario failed: ${name}`);
      throw error;
    }
    passed.push(name);
  }
  return passed;
}
