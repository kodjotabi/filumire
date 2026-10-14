// Read-only catalog/data baseline. No DDL, recovery creation or credentials in output.
import pg from "pg";
import { writeFileSync, readFileSync } from "node:fs";
import { createHash } from "node:crypto";
let client;
try {
  if (process.argv.includes("--apply")) throw new Error("read_only_only");
  const connection = process.env.FLPREVIEW_DATABASE_URL_UNPOOLED;
  if (!connection || process.env.FLPREVIEW_NEON_PROJECT_ID !== "proud-term-61114809") throw new Error("missing_or_wrong_preview_variables");
  let url;
  try { url = new URL(connection); } catch { throw new Error("invalid_preview_url"); }
  if (url.hostname !== "ep-cold-bird-b8j437np.c-14.us-east-1.aws.neon.tech" || url.pathname !== "/neondb" || !["postgres:", "postgresql:"].includes(url.protocol)) throw new Error("incorrect_target");
  url.searchParams.set("sslmode", "verify-full");
  client = new pg.Client({ connectionString: url.toString(), connectionTimeoutMillis: 10000, application_name: "filumire_read_only_safety_gate" });
  await client.connect();
  await client.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
  await client.query("SET LOCAL statement_timeout = '30s'");
  await client.query("SET LOCAL lock_timeout = '5s'");
  const identity = (await client.query("SELECT current_database() AS database, current_user AS role, (SELECT rolsuper FROM pg_roles WHERE rolname=current_user) AS superuser, current_setting('transaction_read_only') AS read_only, current_setting('server_version') AS postgres, current_setting('search_path') AS search_path, clock_timestamp() AS captured_at")).rows[0];
  if (identity.database !== "neondb" || identity.role !== "neondb_owner" || identity.superuser || identity.read_only !== "on") throw new Error("wrong_server_identity");
  const columns = (await client.query("SELECT table_schema, table_name, column_name, data_type, udt_name, is_nullable, column_default, ordinal_position FROM information_schema.columns WHERE table_schema='public' ORDER BY table_name, ordinal_position")).rows;
  const constraints = (await client.query("SELECT t.relname AS table_name, c.conname, c.contype, c.convalidated, pg_get_constraintdef(c.oid) AS definition FROM pg_constraint c JOIN pg_class t ON t.oid=c.conrelid JOIN pg_namespace n ON n.oid=t.relnamespace WHERE n.nspname='public' ORDER BY t.relname,c.conname")).rows;
  const indexes = (await client.query("SELECT tablename, indexname, indexdef FROM pg_indexes WHERE schemaname='public' ORDER BY tablename,indexname")).rows;
  const tables = (await client.query("SELECT table_schema, table_name FROM information_schema.tables WHERE table_type='BASE TABLE' AND table_schema NOT IN ('pg_catalog','information_schema') ORDER BY table_schema, table_name")).rows;
  const baseline = [];
  const quote = name => '"' + name.replaceAll('"', '""') + '"';
  for (const table of tables.filter(row => row.table_schema === "public")) {
    const qualified = `public.${quote(table.table_name)}`;
    const row = (await client.query(`SELECT count(*)::text AS records, md5(coalesce(string_agg(row_hash, '' ORDER BY row_hash), '')) AS content_fingerprint FROM (SELECT md5(to_jsonb(t)::text) AS row_hash FROM ${qualified} t) x`)).rows[0];
    baseline.push({ table: table.table_name, ...row });
  }
  const history = [];
  for (const table of tables.filter(row => /migration|schema_version|databasechangelog/i.test(row.table_name))) {
    const qualified = `${quote(table.table_schema)}.${quote(table.table_name)}`;
    const rows = (await client.query(`SELECT to_jsonb(t) AS record FROM ${qualified} t`)).rows;
    // Keep only migration ledger metadata; never application rows.
    history.push({ schema: table.table_schema, table: table.table_name, records: rows.map(({ record }) => Object.fromEntries(Object.entries(record).filter(([key]) => /^(id|hash|created_at|version|name|checksum|installed_on|success|dirty)$/i.test(key)))) });
  }
  const activity = (await client.query("SELECT pid, usename, state, xact_start, wait_event_type, wait_event, query IS NOT NULL AS query_visible, CASE WHEN query IS NULL THEN NULL ELSE query ~* '(alter[[:space:]]+table|create[[:space:]]+(table|index)|drop[[:space:]]+(table|index)|drizzle|migration)' END AS potential_migration FROM pg_stat_activity WHERE datname=current_database() AND pid<>pg_backend_pid() AND backend_type='client backend'")).rows;
  const locks = (await client.query("SELECT l.pid,l.locktype,l.mode,l.granted,c.relname AS relation,l.objid FROM pg_locks l LEFT JOIN pg_class c ON c.oid=l.relation WHERE (l.locktype='advisory' AND l.objid=702021) OR (c.relname IN ('account_credentials','learners','principals','auth_rate_limits','teacher_link_codes') AND l.mode IN ('AccessExclusiveLock','ShareRowExclusiveLock','ShareLock'))")).rows;
  const kinds = (await client.query("SELECT account_kind, count(*)::int AS records FROM public.account_credentials GROUP BY account_kind ORDER BY account_kind")).rows;
  const files = ["0020_auth_rate_limits.sql", "0021_teacher_accounts.sql"].map(file => ({ file, sha256: createHash("sha256").update(readFileSync(new URL(`../drizzle/${file}`, import.meta.url))).digest("hex") }));
  await client.query("ROLLBACK");
  const output = { identity: { neonProjectFromConfiguration: "proud-term-61114809", endpoint: url.hostname, ...identity }, schema: { columns, constraints, indexes }, baseline, migrationHistory: history, accountKinds: kinds, activity, locks, migrationFiles: files, recoveryVerified: false, productionIsolationVerified: false };
  const artifact = `PRIVATE_PREVIEW_READ_ONLY_BASELINE.${new Date(identity.captured_at).toISOString().replaceAll(":", "-")}.json`;
  writeFileSync(new URL(`../docs/${artifact}`, import.meta.url), JSON.stringify(output, null, 2) + "\n", { flag: "wx" });
  console.log(JSON.stringify({ identity: output.identity, baseline, migrationHistory: history, accountKinds: kinds, activity, locks, migrationFiles: files, schemaArtifact: `docs/${artifact}`, verdict: "NO-GO: production isolation and recovery not verified" }, null, 2));
} catch (error) {
  await client?.query("ROLLBACK").catch(() => {});
  console.error(JSON.stringify({ failed: true, code: error.code ?? "safety_preflight_failed" }));
  process.exitCode = 1;
} finally { await client?.end().catch(() => {}); }
