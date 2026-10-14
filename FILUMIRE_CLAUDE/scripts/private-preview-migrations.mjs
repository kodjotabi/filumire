// Safety validator only. Execution stays disabled until separately authorized.
import { readFileSync } from "node:fs";
import pg from "pg";
import { validateTarget, validateArtifacts, validatePrerequisiteSql, validateSnapshot, safetyBlockers, SQL_SHA256 } from "./private-preview-guards.mjs";
let client;
try {
  if (process.argv.slice(2).length) throw Object.assign(new Error(), { code: "execution_disabled_or_unknown_argument" });
  const connectionString = validateTarget(process.env);
  const baseline = JSON.parse(readFileSync(new URL("../docs/PRIVATE_PREVIEW_READ_ONLY_BASELINE.json", import.meta.url), "utf8"));
  const sql = Object.fromEntries(Object.keys(SQL_SHA256).map(name => [name, readFileSync(new URL(`../drizzle/${name}`, import.meta.url))]));
  validateArtifacts(baseline, sql);
  validatePrerequisiteSql(readFileSync(new URL("../drizzle/0019_learner_accounts.sql", import.meta.url)));
  const evidence = JSON.parse(readFileSync(new URL("../docs/PRIVATE_PREVIEW_SAFETY_EVIDENCE.json", import.meta.url), "utf8"));
  const blockers = safetyBlockers(evidence);
  if (blockers.length) {
    console.log(JSON.stringify({ verdict: "NO-GO", blockers, connected: false }));
    process.exitCode = 1;
  } else {
    client = new pg.Client({ connectionString, connectionTimeoutMillis: 10000, application_name: "filumire_migration_safety_validator" });
    await client.connect();
    await client.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
    await client.query("SET LOCAL search_path = public, pg_catalog");
    await client.query("SET LOCAL lock_timeout = '5s'");
    await client.query("SET LOCAL statement_timeout = '30s'");
    const identity = (await client.query("SELECT current_database() AS database, current_user AS role, (SELECT rolsuper FROM pg_roles WHERE rolname=current_user) AS superuser, current_setting('transaction_read_only') AS read_only")).rows[0];
    const columns = (await client.query("SELECT table_schema, table_name, column_name, data_type, udt_name, is_nullable, column_default, ordinal_position FROM information_schema.columns WHERE table_schema='public' ORDER BY table_name, ordinal_position")).rows;
    const constraints = (await client.query("SELECT t.relname AS table_name, c.conname, c.contype, c.convalidated, pg_get_constraintdef(c.oid) AS definition FROM pg_constraint c JOIN pg_class t ON t.oid=c.conrelid JOIN pg_namespace n ON n.oid=t.relnamespace WHERE n.nspname='public' ORDER BY t.relname,c.conname")).rows;
    const indexes = (await client.query("SELECT tablename,indexname,indexdef FROM pg_indexes WHERE schemaname='public' ORDER BY tablename,indexname")).rows;
    const historyTables = (await client.query("SELECT n.nspname AS table_schema,c.relname AS table_name FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE c.relkind IN ('r','p') AND n.nspname NOT IN ('pg_catalog','information_schema') AND c.relname ~* '(migration|schema_version|databasechangelog)' ORDER BY n.nspname,c.relname")).rows;
    const migrationHistory = historyTables.map(table => ({ schema: table.table_schema, table: table.table_name }));
    const accountKinds = (await client.query("SELECT account_kind,count(*)::int AS records FROM public.account_credentials GROUP BY account_kind ORDER BY account_kind")).rows;
    const activity = (await client.query("SELECT query IS NOT NULL AS query_visible, CASE WHEN query IS NULL THEN NULL ELSE query ~* '(alter[[:space:]]+table|create[[:space:]]+(table|index)|drop[[:space:]]+(table|index)|drizzle|migration)' END AS potential_migration FROM pg_stat_activity WHERE datname=current_database() AND pid<>pg_backend_pid() AND backend_type='client backend'")).rows;
    const locks = (await client.query("SELECT l.pid FROM pg_locks l LEFT JOIN pg_class c ON c.oid=l.relation WHERE (l.locktype='advisory' AND l.objid=702021) OR (c.relname IN ('account_credentials','learners','principals','auth_rate_limits','teacher_link_codes') AND l.mode IN ('AccessExclusiveLock','ShareRowExclusiveLock','ShareLock'))")).rows;
    validateSnapshot({ identity, schema: { columns, constraints, indexes }, migrationHistory, accountKinds, activity, locks }, baseline);
    await client.query("ROLLBACK");
    console.log(JSON.stringify({ verdict: "READ-ONLY SAFEGUARDS PASS", proposedMigrations: Object.keys(SQL_SHA256), executionEnabled: false, authorizationRequired: true }));
  }
} catch (error) {
  await client?.query("ROLLBACK").catch(() => {});
  console.error(JSON.stringify({ verdict: "NO-GO", code: error.code ?? "invalid_or_missing_safety_artifact" }));
  process.exitCode = 1;
} finally { await client?.end().catch(() => {}); }
