import assert from "node:assert/strict";
import { mock } from "node:test";

// Never load environment files or use a real connection string in this test.
process.env.DATABASE_URL = "postgresql://unused:unused@database.invalid/unused";
const { pool } = await import("../services/database");
const { GradeLockSchemaRequiredError, PostgresPersistenceStore } =
  await import("../services/persistence-postgres");

const probe = 'SELECT "grade_set_by" FROM "learner_learning_context" LIMIT 0';
const calls: Array<{ text: string; values?: unknown[] }> = [];
let failure: unknown;
let operationFailure: unknown;
const queryMock = mock.method(pool, "query", async (query: string | { text: string }, values?: unknown[]) => {
  const text = typeof query === "string" ? query : query.text;
  calls.push({ text, ...(values ? { values } : {}) });
  if (text === probe && failure) throw failure;
  if (text !== probe && operationFailure) throw operationFailure;
  return { rows: [], rowCount: 0 };
});
// Fail immediately if anything attempts to bypass the query stub and connect.
const connectMock = mock.method(pool, "connect", () => {
  throw new Error("Database connections are forbidden in this test");
});

const store = new PostgresPersistenceStore();
const context = {
  learnerId: "schema-guard-learner",
  curriculumVersionId: "test-curriculum",
  gradeId: "test-grade",
  activeSubjectId: "test-subject",
  gradeSetBy: "guardian" as const,
  updatedAt: new Date().toISOString(),
};
const operations = [
  () => store.getLearnerLearningContext(context.learnerId),
  () => store.saveLearnerLearningContext(context),
];

try {
  for (const code of ["42703", "42P01"]) {
    failure = Object.assign(new Error("private database details"), { code });
    for (const operation of operations) {
      calls.length = 0;
      await assert.rejects(operation, (error: unknown) => {
        assert(error instanceof GradeLockSchemaRequiredError);
        assert.equal(error.code, code === "42P01" ? "grade_lock_context_table_missing" : "grade_lock_migration_0023_required");
        if (code === "42P01") assert.match(error.message, /table is missing/);
        assert.match(error.message, /0023_learner_grade_set_by/);
        assert(!error.message.includes("private database details"));
        return true;
      });
      assert.deepEqual(calls, [{ text: probe }], "missing schema blocks the context read/write");
    }
  }

  failure = Object.assign(new Error("connection unavailable"), { code: "08006" });
  for (const operation of operations) {
    calls.length = 0;
    await assert.rejects(operation, error => error === failure);
    assert.deepEqual(calls, [{ text: probe }], "connection failures also block access");
  }

  // A failed check can recover after an operator migrates the database.
  failure = undefined;
  calls.length = 0;
  assert.equal(await store.getLearnerLearningContext(context.learnerId), undefined);
  assert.equal(calls[0].text, probe);
  assert.match(calls[1].text, /^select /i);
  calls.length = 0;
  await store.saveLearnerLearningContext(context);
  assert.equal(calls.length, 1, "successful readiness is cached across read/write operations");
  assert.match(calls[0].text, /^insert /i);
  assert(calls[0].values?.includes("guardian"), "ready schema persists guardian attribution");

  // Concurrent initial operations share one in-flight probe.
  calls.length = 0;
  const concurrentStore = new PostgresPersistenceStore();
  await Promise.all([
    concurrentStore.getLearnerLearningContext(context.learnerId),
    concurrentStore.saveLearnerLearningContext(context),
  ]);
  assert.equal(calls.filter(call => call.text === probe).length, 1);

  // Schema loss after readiness must still block reads and writes, including
  // PostgreSQL errors wrapped by Drizzle, and invalidate the cached success.
  for (const code of ["42703", "42P01"]) {
    for (const operation of operations) {
      operationFailure = Object.assign(new Error("schema removed"), { code });
      await assert.rejects(operation, (error: unknown) => {
        assert(error instanceof GradeLockSchemaRequiredError);
        assert.equal(error.code, code === "42P01" ? "grade_lock_context_table_missing" : "grade_lock_migration_0023_required");
        return true;
      });
      failure = operationFailure;
      operationFailure = undefined;
      calls.length = 0;
      await assert.rejects(operation, GradeLockSchemaRequiredError);
      assert.deepEqual(calls, [{ text: probe }], "operation failure invalidates readiness");
      failure = undefined;
      await store.getLearnerLearningContext(context.learnerId);
    }
  }

  // Concurrent failures must not poison the next attempt.
  const retryStore = new PostgresPersistenceStore();
  failure = Object.assign(new Error("temporary outage"), { code: "08006" });
  const failed = await Promise.allSettled([
    retryStore.getLearnerLearningContext(context.learnerId),
    retryStore.saveLearnerLearningContext(context),
  ]);
  assert(failed.every(result => result.status === "rejected"));
  failure = undefined;
  calls.length = 0;
  await retryStore.getLearnerLearningContext(context.learnerId);
  assert.equal(calls[0].text, probe, "failed shared check is retried");

  // A new store/target never inherits another store's cached success.
  failure = Object.assign(new Error("column missing"), { code: "42703" });
  const freshStore = new PostgresPersistenceStore();
  calls.length = 0;
  await assert.rejects(() => freshStore.getLearnerLearningContext(context.learnerId), GradeLockSchemaRequiredError);
  assert.deepEqual(calls, [{ text: probe }]);
  assert.equal(connectMock.mock.callCount(), 0);
  console.log("PASS: grade-lock schema guard (stubbed PostgreSQL; no connections)");
} finally {
  queryMock.mock.restore();
  connectMock.mock.restore();
  await pool.end();
}
