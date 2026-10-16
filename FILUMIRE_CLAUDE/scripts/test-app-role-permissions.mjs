// Positive and negative permission tests for filumire_app (A5). TEST branches only.
// Everything runs as filumire_app inside ONE transaction that is always rolled back; statements use
// WHERE false / zero-row forms, so no row is kept. The owner connection only reads the catalog.
// Usage: node scripts/test-app-role-permissions.mjs --app-url-env <VAR> --owner-url-env <VAR> --expect-host <host>
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { DENIED_ENDPOINTS } from "./apply-migrations.mjs";

const AI = ["SELECT", "INSERT"], AIU = [...AI, "UPDATE"];
/** Must match scripts/sql/app-role-grants.sql. Absent or [] = no access at all. */
export const APP_ROLE_MATRIX = Object.freeze({
  account_profiles: AI, controlled_teacher_actions: AI, external_identities: AI, guardian_consent_records: AI,
  learners: AI, learning_evidence: AI, parent_teacher_messages: AI, pilot_measurement_events: AI,
  teacher_professional_notes: AI,
  account_credentials: AIU, auth_sessions: AIU, interventions: AIU, learner_learning_context: AIU,
  learner_profiles: AIU, learner_states: AIU, pending_teacher_reviews: AIU, principal_learner_access: AIU,
  sessions: AIU, teacher_link_codes: AIU,
  auth_rate_limits: [...AIU, "DELETE"],
  principals: [...AI, "DELETE"],
  filumire_schema_migrations: [],
  payment_attempt_events: [], payment_attempts: [], payment_exceptions: [], payment_obligation_beneficiaries: [],
  payment_obligation_events: [], payment_obligations: [], payment_receipts: [],
});
const ALL = ["SELECT", "INSERT", "UPDATE", "DELETE", "TRUNCATE", "REFERENCES", "TRIGGER"];

function connectionString(envName, expectHost) {
  const url = new URL(process.env[envName] ?? "");
  const host = url.hostname.toLowerCase();
  if (DENIED_ENDPOINTS.some(e => host.startsWith(e))) throw new Error("denied_existing_endpoint");
  if (host !== expectHost) throw new Error("host_does_not_match_expected");
  // A local PostgreSQL server (loopback only) has no TLS; every remote host still requires verify-full.
  if (host === "localhost" || host === "127.0.0.1") { url.searchParams.delete("sslmode"); url.searchParams.delete("channel_binding"); return url.toString(); }
  url.searchParams.set("sslmode", "verify-full");
  url.searchParams.delete("channel_binding");
  return url.toString();
}

async function run(args) {
  const get = flag => args[args.indexOf(flag) + 1];
  const { default: pg } = await import("pg");
  const results = [];
  const record = (name, ok, detail) => results.push({ name, ok, ...(detail ? { detail } : {}) });

  // 1. Owner reads the catalog: exact privilege set per table, nothing else anywhere.
  const owner = new pg.Client({ connectionString: connectionString(get("--owner-url-env"), get("--expect-host")) });
  await owner.connect();
  await owner.query("SET SESSION CHARACTERISTICS AS TRANSACTION READ ONLY");
  const tables = (await owner.query("select tablename t from pg_tables where schemaname='public' order by 1")).rows.map(r => r.t);
  const unclassified = tables.filter(t => !(t in APP_ROLE_MATRIX));
  record("every public table is classified", !unclassified.length, unclassified.join(", ") || undefined);
  for (const t of tables) {
    const held = [];
    for (const p of ALL) if ((await owner.query("select has_table_privilege('filumire_app', $1, $2) h", [`public.${t}`, p])).rows[0].h) held.push(p);
    const want = APP_ROLE_MATRIX[t] ?? [];
    record(`catalog ${t} = [${want.join(",") || "none"}]`, held.join(",") === want.join(","), held.join(",") || "none");
  }
  const role = (await owner.query("select rolsuper, rolcreaterole, rolcreatedb, rolreplication, rolbypassrls, rolconnlimit from pg_roles where rolname='filumire_app'")).rows[0];
  record("role attributes restricted, limit 20", !role.rolsuper && !role.rolcreaterole && !role.rolcreatedb && !role.rolreplication && !role.rolbypassrls && role.rolconnlimit === 20);
  record("no role memberships", (await owner.query("select count(*)::int n from pg_auth_members m join pg_roles r on r.oid=m.member where r.rolname='filumire_app'")).rows[0].n === 0);
  record("no default privileges for app", (await owner.query("select count(*)::int n from pg_default_acl where defaclacl::text like '%filumire_app%'")).rows[0].n === 0);
  const columns = Object.fromEntries((await owner.query(
    "select c.relname t, (array_agg(a.attname order by a.attnum))[1] col from pg_attribute a join pg_class c on c.oid=a.attrelid where c.relnamespace='public'::regnamespace and c.relkind='r' and a.attnum>0 and not a.attisdropped group by 1")).rows.map(r => [r.t, r.col]));
  await owner.end();

  // 2. App performs real statements, each in a savepoint, all rolled back at the end.
  const app = new pg.Client({ connectionString: connectionString(get("--app-url-env"), get("--expect-host")) });
  await app.connect();
  await app.query("BEGIN");
  const attempt = async (name, sql, expectAllowed) => {
    await app.query("SAVEPOINT s");
    try { await app.query(sql); await app.query("RELEASE SAVEPOINT s"); record(name, expectAllowed, expectAllowed ? undefined : "was allowed"); }
    catch (e) { await app.query("ROLLBACK TO SAVEPOINT s"); record(name, !expectAllowed && e.code === "42501", `${e.code}`); }
  };
  try {
    const who = (await app.query("select current_user u, current_setting('is_superuser') su")).rows[0];
    record("connected as filumire_app, not superuser", who.u === "filumire_app" && who.su === "off");
    for (const t of tables) {
      const want = APP_ROLE_MATRIX[t] ?? [], c = `"${columns[t]}"`;
      await attempt(`${t}: SELECT`, `select 1 from public."${t}" limit 0`, want.includes("SELECT"));
      await attempt(`${t}: INSERT`, `insert into public."${t}" select * from public."${t}" where false`, want.includes("INSERT") && want.includes("SELECT"));
      await attempt(`${t}: UPDATE`, `update public."${t}" set ${c} = ${c} where false`, want.includes("UPDATE"));
      await attempt(`${t}: DELETE`, `delete from public."${t}" where false`, want.includes("DELETE"));
      await attempt(`${t}: TRUNCATE`, `truncate public."${t}"`, false);
    }
    // Migration-history protection, spelled out.
    await attempt("ledger: read history", "select id from public.filumire_schema_migrations", false);
    await attempt("ledger: forge a row", "insert into public.filumire_schema_migrations (id, kind, sha256, applied_by) values ('x','migration',repeat('0',64),'app')", false);
    await attempt("ledger: rewrite history", "update public.filumire_schema_migrations set sha256 = sha256", false);
    await attempt("ledger: erase history", "delete from public.filumire_schema_migrations", false);
    await attempt("ledger: drop table", "drop table public.filumire_schema_migrations", false);
    // Structure and role management.
    await attempt("create table in public", "create table public.__app_probe (x int)", false);
    await attempt("alter an app table", "alter table public.learners add column __probe int", false);
    await attempt("drop an app table", "drop table public.learners", false);
    await attempt("create schema", "create schema __app_probe", false);
    await attempt("create role", "create role __app_probe", false);
    await attempt("become the owner", "set role neondb_owner", false);
    await attempt("read neon_auth users", 'select 1 from neon_auth."user" limit 0', false);
  } finally {
    await app.query("ROLLBACK");
    await app.end();
  }
  const failed = results.filter(r => !r.ok);
  return { passed: results.length - failed.length, failed: failed.length, failures: failed, results };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const report = await run(process.argv.slice(2));
    console.log(JSON.stringify(report, null, 1));
    if (report.failed) process.exitCode = 1;
  } catch (error) {
    console.log(JSON.stringify({ error: String(error.message).replace(/postgres(ql)?:\/\/\S+/gi, "[redacted]") }));
    process.exitCode = 1;
  }
}
