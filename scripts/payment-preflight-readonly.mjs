/*
 * Payments Phase 2, step 3 (B0): READ-ONLY preflight of filumire_test before any obligation work.
 * Refuses unless DATABASE_URL names filumire_test and the user is not a superuser. Every query runs inside
 * a READ ONLY transaction that is rolled back. Never prints the password. Changes nothing.
 *
 * Run: node --env-file=.env.postgres-test.local scripts/payment-preflight-readonly.mjs
 */
import pg from "pg";

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

const client = new pg.Client({ connectionString: url, connectionTimeoutMillis: 5000 });
const out = {};
const q = async (text) => (await client.query(text)).rows;

try {
  await client.connect();
  await client.query("BEGIN TRANSACTION READ ONLY");
  const who = (await q("SELECT current_database() AS db, current_user AS usr, (SELECT rolsuper FROM pg_roles WHERE rolname = current_user) AS superuser, current_setting('server_version') AS version, current_setting('transaction_read_only') AS read_only"))[0];
  if (who.db !== EXPECTED_DATABASE || who.superuser) {
    throw new Error(`refused: database ${who.db}, superuser ${who.superuser}`);
  }
  out.connection = who;

  out.migrations = await q("SELECT id, hash, created_at FROM drizzle.__drizzle_migrations ORDER BY created_at");
  out.publicTables = (await q("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE' ORDER BY 1")).map((r) => r.table_name);
  out.obligationLikeTables = (await q("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND (table_name LIKE '%obligation%' OR table_name LIKE '%receipt%' OR table_name LIKE '%exception%' OR table_name LIKE '%entitlement%' OR table_name LIKE '%billing%')")).map((r) => r.table_name);
  out.paymentAttempts = (await q("SELECT count(*)::int AS n FROM payment_attempts"))[0].n;
  out.paymentAttemptEvents = (await q("SELECT count(*)::int AS n FROM payment_attempt_events"))[0].n;
  out.attemptsByStatus = await q("SELECT status, count(*)::int AS n FROM payment_attempts GROUP BY status ORDER BY status");
  out.attemptColumns = await q("SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'payment_attempts' ORDER BY ordinal_position");
  out.paymentTriggers = await q("SELECT c.relname AS table_name, t.tgname FROM pg_trigger t JOIN pg_class c ON c.oid = t.tgrelid WHERE NOT t.tgisinternal AND c.relname LIKE 'payment\\_%' ORDER BY 1, 2");
  out.paymentFunctions = (await q("SELECT proname FROM pg_proc WHERE proname LIKE 'payment\\_%' ORDER BY 1")).map((r) => r.proname);
  out.cleanupAllowedByDefault = (await q("SELECT payment_test_cleanup_allowed() AS allowed"))[0].allowed;
  out.accessRelationships = await q("SELECT relationship_type, status, count(*)::int AS n FROM principal_learner_access GROUP BY 1, 2 ORDER BY 1, 2");
  out.otherSessions = (await q("SELECT count(*)::int AS n FROM pg_stat_activity WHERE datname = current_database() AND pid <> pg_backend_pid()"))[0].n;

  const fingerprint = {};
  for (const table of out.publicTables.filter((t) => !t.startsWith("payment_"))) {
    const row = (await q(`SELECT count(*)::int AS n, md5(coalesce(string_agg(md5(x::text), '' ORDER BY md5(x::text)), '')) AS h FROM "${table}" x`))[0];
    fingerprint[table] = `${row.n}:${row.h}`;
  }
  out.learnerFingerprint = fingerprint;
  await client.query("ROLLBACK");
  console.log(JSON.stringify(out, null, 2));
} catch (error) {
  await client.query("ROLLBACK").catch(() => {});
  console.error(`PREFLIGHT FAILED: ${error.code ?? ""} ${error.message}`);
  process.exitCode = 1;
} finally {
  await client.end().catch(() => {});
}
