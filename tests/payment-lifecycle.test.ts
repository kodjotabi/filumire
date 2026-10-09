/*
 * Payments Phase 2, step 2: lifecycle rules and the payment recorder on the
 * in-memory store. No database, no network, no credentials.
 * The same scenarios run against Postgres in tests/payment-persistence-postgres.test.ts.
 */
import assert from "node:assert/strict";
import { ACTIVE_STATUSES, canTransition, PAYMENT_ATTEMPT_STATUSES, type PaymentAttemptStatus } from "../packages/payments";
import { MemoryPaymentAttemptStore } from "../services/payments";
import { runRecorderScenarios } from "./payment-recorder-scenarios";

let networkCalls = 0;
globalThis.fetch = (async () => {
  networkCalls += 1;
  throw new Error("Network access is not allowed in payment tests.");
}) as typeof fetch;

/* Must match the payment_attempts_guard trigger in drizzle/0018_payment_attempts.sql. */
const EXPECTED: Record<PaymentAttemptStatus, PaymentAttemptStatus[]> = {
  created: ["created", "pending", "unknown", "succeeded", "failed", "needs_review"],
  pending: ["pending", "succeeded", "failed", "needs_review"],
  unknown: ["unknown", "pending", "succeeded", "failed", "needs_review"],
  failed: ["failed", "needs_review"],
  needs_review: ["needs_review"],
  succeeded: [],
};

function checkLifecycleTable(): void {
  for (const from of PAYMENT_ATTEMPT_STATUSES) {
    for (const to of PAYMENT_ATTEMPT_STATUSES) {
      assert.equal(canTransition(from, to), EXPECTED[from].includes(to), `${from} -> ${to}`);
    }
  }
  assert.deepEqual([...ACTIVE_STATUSES], ["created", "pending", "unknown"]);
  /* Key safety rules, spelled out. */
  assert.equal(canTransition("succeeded", "failed"), false);
  assert.equal(canTransition("succeeded", "succeeded"), false);
  assert.equal(canTransition("failed", "succeeded"), false);
  assert.equal(canTransition("pending", "unknown"), false);
  assert.equal(canTransition("failed", "pending"), false);
}

async function run(): Promise<void> {
  checkLifecycleTable();
  let payers = 0;
  const scenarios = await runRecorderScenarios({
    newStore: () => new MemoryPaymentAttemptStore(),
    newPayer: async () => `memory-payer-${++payers}`,
  });
  assert.equal(networkCalls, 0, "no network calls");
  console.log({ paymentLifecycle: "PASS", lifecycleTable: "PASS", scenarios: scenarios.length, networkCalls });
}

let finished = false;
process.on("exit", (code) => {
  if (code === 0 && !finished) {
    console.error("payment-lifecycle test ended before finishing (pending promise); failing.");
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
