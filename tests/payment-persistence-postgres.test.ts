/*
 * Payments Phase 2, step 2: payment persistence on Postgres (filumire_test ONLY).
 *
 * Run (guard first):
 *   node --env-file=.env.postgres-test.local scripts/verify-test-database.mjs
 *   npx tsx --env-file=.env.postgres-test.local tests/payment-persistence-postgres.test.ts
 *
 * Refuses unless connected to filumire_test as a non-superuser. Creates its own
 * principals (ids recorded in this run) and deletes exactly those principals and
 * the payment rows whose payer is one of them, inside a transaction that sets the
 * filumire.payment_test_cleanup flag (honoured by the 0018 triggers only in
 * filumire_test). Never truncates. Verifies that every non-payment table is
 * byte-identical (row count + content hash) before and after.
 */
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import pg from "pg";
import { money } from "../packages/payments";
import { FakePaymentProvider, FakeProviderLedger, PaymentRecorder, PostgresPaymentAttemptStore } from "../services/payments";
import { runRecorderScenarios } from "./payment-recorder-scenarios";

const EXPECTED_DATABASE = "filumire_test";
const url = process.env.DATABASE_URL ?? "";
let configured = "";
try {
  configured = decodeURIComponent(new URL(url).pathname.replace(/^\//, ""));
} catch {
  /* handled below */
}
if (configured !== EXPECTED_DATABASE) {
  console.error(`REFUSED: DATABASE_URL must name ${EXPECTED_DATABASE}.`);
  process.exit(1);
}

let networkCalls = 0;
globalThis.fetch = (async () => {
  networkCalls += 1;
  throw new Error("Network access is not allowed in payment tests.");
}) as typeof fetch;

const runId = randomUUID();
const ownedPrincipals: string[] = [];
const results: Record<string, unknown> = {};

async function snapshotLearnerData(pool: pg.Pool): Promise<Record<string, string>> {
  const tables = (
    await pool.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE' AND table_name NOT LIKE 'payment\\_%' ORDER BY 1",
    )
  ).rows.map((r) => r.table_name as string);
  const out: Record<string, string> = {};
  for (const table of tables) {
    const row = (
      await pool.query(
        `SELECT count(*)::int AS n, md5(coalesce(string_agg(md5(x::text), '' ORDER BY md5(x::text)), '')) AS h FROM "${table}" x`,
      )
    ).rows[0];
    out[table] = `${row.n}:${row.h}`;
  }
  return out;
}

async function sqlError(pool: pg.Pool, text: string, values: unknown[] = []): Promise<{ code?: string; constraint?: string; message: string }> {
  try {
    await pool.query(text, values);
  } catch (error) {
    const e = error as { code?: string; constraint?: string; message: string };
    return { code: e.code, constraint: e.constraint, message: e.message };
  }
  throw new Error(`Expected SQL to fail: ${text}`);
}

async function newPayer(pool: pg.Pool): Promise<string> {
  const id = `pay-test-${runId}-${ownedPrincipals.length + 1}`;
  await pool.query("INSERT INTO principals (id) VALUES ($1)", [id]);
  ownedPrincipals.push(id);
  return id;
}

async function cleanup(pool: pg.Pool): Promise<void> {
  if (ownedPrincipals.length === 0) return;
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SET LOCAL filumire.payment_test_cleanup = 'on'");
    await client.query(
      "DELETE FROM payment_attempt_events WHERE attempt_id IN (SELECT id FROM payment_attempts WHERE payer_principal_id = ANY($1))",
      [ownedPrincipals],
    );
    await client.query("DELETE FROM payment_attempts WHERE payer_principal_id = ANY($1)", [ownedPrincipals]);
    await client.query("DELETE FROM principals WHERE id = ANY($1)", [ownedPrincipals]);
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}

async function run(pool: pg.Pool): Promise<void> {
  const who = (await pool.query("SELECT current_database() AS db, (SELECT rolsuper FROM pg_roles WHERE rolname = current_user) AS su")).rows[0];
  assert.equal(who.db, EXPECTED_DATABASE, "connected database");
  assert.equal(who.su, false, "not a superuser");

  const before = await snapshotLearnerData(pool);
  const paymentRowsBefore = (await pool.query("SELECT (SELECT count(*) FROM payment_attempts)::int a, (SELECT count(*) FROM payment_attempt_events)::int e")).rows[0];

  try {
    /* 1. Shared recorder scenarios on the real store. */
    const store = new PostgresPaymentAttemptStore(pool);
    results.scenarios = (await runRecorderScenarios({ newStore: () => store, newPayer: () => newPayer(pool) })).length;

    /* 2. Restart / recovery: new pool, store, recorder and adapter; the provider keeps its ledger. */
    {
      const ledger = new FakeProviderLedger();
      const payer = await newPayer(pool);
      const input = {
        idempotencyKey: `key-restart-${runId}`,
        obligationId: `obl-restart-${runId}`,
        amount: money(3000, "GHS"),
        payer: { principalId: payer, email: "guardian.restart@example.com" },
        description: "FILUMIRE restart test",
      };
      const fakeBefore = new FakePaymentProvider({ ledger });
      fakeBefore.failNextInitiate("lost_response");
      const before = await new PaymentRecorder(new PostgresPaymentAttemptStore(pool), fakeBefore).startAttempt(input);
      assert.equal(before.kind, "uncertain");

      const restartedPool = new pg.Pool({ connectionString: url, max: 4 });
      try {
        const restarted = new PaymentRecorder(new PostgresPaymentAttemptStore(restartedPool), new FakePaymentProvider({ ledger }));
        const replay = await restarted.startAttempt(input);
        assert.equal(replay.kind, "replayed");
        assert.equal(replay.attempt.id, before.attempt.id);
        assert.equal(replay.attempt.status, "succeeded", "reconciled after restart, not re-charged");
        assert.equal(ledger.chargesCreated, 1);
        const conflicting = await restarted.startAttempt({ ...input, amount: money(1, "GHS") }).catch((e) => e);
        assert.equal(conflicting?.code, "DUPLICATE_ATTEMPT_CONFLICT", "key conflict survives restart");
        const newKey = await restarted.startAttempt({ ...input, idempotencyKey: `key-restart-2-${runId}` });
        assert.equal(newKey.kind, "already_paid");
        assert.equal(ledger.chargesCreated, 1);

        /* Timeout + transient absence stays unknown across a restart and blocks the obligation. */
        const ledger2 = new FakeProviderLedger();
        const fake2 = new FakePaymentProvider({ ledger: ledger2, absence: "transient" });
        fake2.failNextInitiate("not_sent");
        const input2 = { ...input, idempotencyKey: `key-restart-3-${runId}`, obligationId: `obl-restart-2-${runId}` };
        const uncertain = await new PaymentRecorder(new PostgresPaymentAttemptStore(pool), fake2).startAttempt(input2);
        assert.equal(uncertain.attempt.status, "unknown");
        const after = new PaymentRecorder(new PostgresPaymentAttemptStore(restartedPool), new FakePaymentProvider({ ledger: ledger2, absence: "transient" }));
        const held = await after.startAttempt({ ...input2, idempotencyKey: `key-restart-4-${runId}` });
        assert.equal(held.kind, "obligation_in_progress");
        assert.equal(held.attempt.status, "unknown");
        assert.equal(ledger2.chargesCreated, 0);
      } finally {
        await restartedPool.end();
      }
      results.restartRecovery = "PASS";
    }

    /* 3. Database guards hold even against direct SQL. */
    {
      const payer = await newPayer(pool);
      const recorder = new PaymentRecorder(store, new FakePaymentProvider());
      const base = { amount: money(1500, "GHS"), payer: { principalId: payer, email: "guardian.sql@example.com" }, description: "SQL guard test" };
      const paid = await recorder.startAttempt({ ...base, idempotencyKey: `key-sql-1-${runId}`, obligationId: `obl-sql-1-${runId}` });
      await recorder.reconcile(paid.attempt.id);
      const pending = await recorder.startAttempt({ ...base, idempotencyKey: `key-sql-2-${runId}`, obligationId: `obl-sql-2-${runId}` });

      const p0001 = (e: { code?: string }) => assert.equal(e.code, "P0001");
      p0001(await sqlError(pool, "UPDATE payment_attempts SET status = 'failed' WHERE id = $1", [paid.attempt.id]));
      p0001(await sqlError(pool, "UPDATE payment_attempts SET verify_count = verify_count + 1 WHERE id = $1", [paid.attempt.id]));
      p0001(await sqlError(pool, "UPDATE payment_attempts SET amount_minor = 1 WHERE id = $1", [pending.attempt.id]));
      p0001(await sqlError(pool, "UPDATE payment_attempts SET provider_reference = 'x' WHERE id = $1", [pending.attempt.id]));
      p0001(await sqlError(pool, "UPDATE payment_attempts SET status = 'created' WHERE id = $1", [pending.attempt.id]));
      p0001(await sqlError(pool, "UPDATE payment_attempts SET status = 'unknown' WHERE id = $1", [pending.attempt.id]));
      p0001(await sqlError(pool, "DELETE FROM payment_attempts WHERE id = $1", [pending.attempt.id]));
      p0001(await sqlError(pool, "UPDATE payment_attempt_events SET event_type = 'tampered' WHERE attempt_id = $1", [paid.attempt.id]));
      p0001(await sqlError(pool, "DELETE FROM payment_attempt_events WHERE attempt_id = $1", [paid.attempt.id]));
      /* A wrong flag value does not unlock deletes. */
      {
        const client = await pool.connect();
        try {
          await client.query("BEGIN");
          await client.query("SET LOCAL filumire.payment_test_cleanup = 'yes'");
          const refused = await client.query("DELETE FROM payment_attempts WHERE id = $1", [pending.attempt.id]).catch((e) => e);
          assert.equal(refused?.code, "P0001", "flag must be exactly 'on'");
        } finally {
          await client.query("ROLLBACK");
          client.release();
        }
      }

      const insert = `INSERT INTO payment_attempts (id, idempotency_key, obligation_id, our_reference, request_fingerprint, provider, mode,
                        payer_principal_id, amount_minor, currency, status, observed_status, observed_amount_minor, observed_currency, confirmed_at, provider_reference)
                      VALUES ($1, $2, $3, $4, 'fp', 'fake', 'sandbox', $5, $6, 'GHS', $7, $8, $9, $10, $11, $12)`;
      const row = (o: { obligation?: string; payer?: string; amount?: number; status?: string; observed?: [string, number, string] | null; confirmed?: boolean; providerRef?: string | null } = {}) => {
        const id = randomUUID();
        return [
          id, `key-raw-${id}`, o.obligation ?? `obl-raw-${id}`, `FLM-RAW-${id}`, o.payer ?? payer, o.amount ?? 100, o.status ?? "created",
          o.observed?.[0] ?? null, o.observed?.[1] ?? null, o.observed?.[2] ?? null, o.confirmed ? new Date() : null, o.providerRef ?? null,
        ];
      };
      assert.equal((await sqlError(pool, insert, row({ amount: 0 }))).constraint, "payment_attempts_amount_check");
      assert.equal((await sqlError(pool, insert, row({ status: "paid" }))).constraint, "payment_attempts_status_check");
      assert.equal((await sqlError(pool, insert, row({ status: "succeeded" }))).constraint, "payment_attempts_succeeded_check");
      assert.equal(
        (await sqlError(pool, insert, row({ status: "succeeded", observed: ["successful", 99, "GHS"], confirmed: true, providerRef: "r" }))).constraint,
        "payment_attempts_succeeded_check",
        "underpaid success refused by the database",
      );
      assert.equal((await sqlError(pool, insert, row({ obligation: `obl-sql-2-${runId}` }))).constraint, "payment_attempts_one_active_per_obligation");
      assert.equal((await sqlError(pool, insert, row({ obligation: `obl-sql-1-${runId}`, status: "succeeded", observed: ["successful", 100, "GHS"], confirmed: true, providerRef: `raw-${runId}` }))).constraint, "payment_attempts_one_success_per_obligation");
      assert.equal((await sqlError(pool, insert, row({ payer: `missing-principal-${runId}` }))).code, "23503", "payer must be a principal");
      assert.equal(
        (await sqlError(pool, "INSERT INTO payment_attempt_events (id, attempt_id, sequence, event_type, to_status, detail) VALUES ($1, $2, 99, 'forged', 'succeeded', '{}')", [randomUUID(), paid.attempt.id])).constraint,
        "payment_attempt_events_one_success_per_attempt",
      );
      results.databaseGuards = "PASS";
    }

    /* 4. Schema objects present. */
    const objects = (
      await pool.query(
        `SELECT (SELECT count(*) FROM pg_constraint WHERE conrelid IN ('payment_attempts'::regclass, 'payment_attempt_events'::regclass))::int AS constraints,
                (SELECT count(*) FROM pg_indexes WHERE tablename IN ('payment_attempts', 'payment_attempt_events'))::int AS indexes,
                (SELECT count(*) FROM pg_trigger WHERE NOT tgisinternal AND tgrelid IN ('payment_attempts'::regclass, 'payment_attempt_events'::regclass))::int AS triggers`,
      )
    ).rows[0];
    results.schemaObjects = objects;
  } finally {
    await cleanup(pool);
  }

  const leftover = (await pool.query("SELECT count(*)::int n FROM payment_attempts WHERE payer_principal_id = ANY($1)", [ownedPrincipals])).rows[0].n;
  const leftoverPrincipals = (await pool.query("SELECT count(*)::int n FROM principals WHERE id = ANY($1)", [ownedPrincipals])).rows[0].n;
  const paymentRowsAfter = (await pool.query("SELECT (SELECT count(*) FROM payment_attempts)::int a, (SELECT count(*) FROM payment_attempt_events)::int e")).rows[0];
  assert.equal(leftover, 0, "own payment rows removed");
  assert.equal(leftoverPrincipals, 0, "own principals removed");
  assert.deepEqual(paymentRowsAfter, paymentRowsBefore, "payment tables back to their prior state");
  const after = await snapshotLearnerData(pool);
  assert.deepEqual(after, before, "every non-payment table byte-identical");
  results.learnerDataIdentical = Object.keys(after).length;
  results.principalsCreatedAndRemoved = ownedPrincipals.length;
}

let finished = false;
process.on("exit", (code) => {
  if (code === 0 && !finished) {
    console.error("payment-persistence-postgres test ended before finishing; failing.");
    process.exitCode = 1;
  }
});

const { pool } = await import("../services/database");
run(pool)
  .then(() => {
    assert.equal(networkCalls, 0, "no network calls");
    console.log({ paymentPersistencePostgres: "PASS", ...results, networkCalls });
    finished = true;
  })
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
