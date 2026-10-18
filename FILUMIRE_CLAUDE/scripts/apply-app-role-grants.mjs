// W4-3 only. Default: read-only dry run. Imports never connect to a database.
// Usage (from FILUMIRE_CLAUDE, after separately approved W4-2):
// node --env-file=.env.preview-owner.local scripts/apply-app-role-grants.mjs
//   --pinned-target filumire-preview --url-env FILUMIRE_PREVIEW_OWNER_URL
//   --sql-sha256 <APPROVED_SQL_SHA256> [--execute --approval <dry-run code>]
// Approval is for this SQL and observed target/schema, never for migrations.
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { pinnedTarget } from "./pinned-targets.mjs";
import { checkTarget } from "./apply-migrations.mjs";
import { loadManifest, verifyManifest, sha256 } from "./migration-ledger.mjs";
import { inspect, ROLE, CONNECTION_LIMIT } from "./create-app-role.mjs";
import { W4Error, transactionFailure, reportCli, withClient } from "./w4-safety.mjs";

// Reviewed SQL SHA-256 with CRLF normalized to LF. The SQL itself stays unchanged.
export const APPROVED_SQL_SHA256 = "541f1168dde51798c410e32302349afd3e8d7fd307b68c5ae1e0b2ee4086109e";
const SQL_FILE = new URL("./sql/app-role-grants.sql", import.meta.url);
const refuse = code => { throw new W4Error(code); };

export function grantTarget(url, name) {
  if (name !== "filumire-preview") refuse("preview_pin_required");
  const profile = pinnedTarget(name);
  const target = checkTarget(url, profile.host, profile.database, profile);
  const parsed = new URL(url);
  if (decodeURIComponent(parsed.username) !== profile.role) refuse("owner_url_role_mismatch");
  // No libpq service, host, role or other connection overrides.
  if ((parsed.port && parsed.port !== "5432") || [...parsed.searchParams.keys()].some(k => !["sslmode", "channel_binding"].includes(k))) refuse("connection_override_not_allowed");
  if (parsed.searchParams.getAll("sslmode").length !== 1 || parsed.searchParams.get("sslmode") !== "verify-full") refuse("tls_verify_full_required");
  return { target, profile };
}

export function grantSql(approvedHash, read = () => readFileSync(SQL_FILE, "utf8")) {
  if (approvedHash !== APPROVED_SQL_SHA256) refuse("sql_hash_not_approved");
  const sql = read();
  if (sha256(sql) !== APPROVED_SQL_SHA256) refuse("grants_file_changed_after_review");
  // Include the initial role guard in OUR transaction. Only this exact reviewed
  // file can pass; this is not a general SQL parser or arbitrary-path executor.
  const normal = sql.replace(/\r\n/g, "\n");
  if ((normal.match(/^BEGIN;$/gm) ?? []).length !== 1 || (normal.match(/^COMMIT;$/gm) ?? []).length !== 1) refuse("policy_transaction_shape_changed");
  return normal.replace(/^BEGIN;\n/m, "").replace(/^COMMIT;\n?$/m, "");
}

export const EVIDENCE_SQL = `select
  c.relkind = 'v' and c.relowner = l.relowner
    and coalesce('security_barrier=true' = any(c.reloptions), false)
    and not coalesce('security_invoker=true' = any(c.reloptions), false) trusted,
  regexp_replace(pg_get_viewdef(c.oid, true), '[[:space:]]+', ' ', 'g') definition
  from pg_class c, pg_class l
  where c.oid = to_regclass('public.filumire_deployment_migration_0023')
    and l.oid = to_regclass('public.filumire_schema_migrations')`;
export const EVIDENCE_DEFINITION = " SELECT kind, sha256 FROM filumire_schema_migrations WHERE id = '0023_learner_grade_set_by'::text;";

export async function inspectGrants(client, manifest, profile) {
  const observed = await inspect(client, manifest, profile, { roleExpected: "present" });
  const r = (await client.query(
    "select rolsuper, rolcreaterole, rolcreatedb, rolreplication, rolbypassrls, rolcanlogin, rolinherit, rolconnlimit, rolvaliduntil from pg_roles where rolname = $1", [ROLE],
  )).rows[0];
  if (!r || r.rolsuper || r.rolcreaterole || r.rolcreatedb || r.rolreplication || r.rolbypassrls || !r.rolcanlogin || r.rolinherit
      || r.rolconnlimit !== CONNECTION_LIMIT || r.rolvaliduntil !== null) refuse("role_attributes_unexpected");
  if ((await client.query("select count(*)::int n from pg_auth_members m join pg_roles r on r.oid = m.member where r.rolname = $1", [ROLE])).rows[0]?.n !== 0) refuse("role_has_memberships");
  const v = (await client.query(EVIDENCE_SQL)).rows[0];
  if (!v?.trusted || v.definition !== EVIDENCE_DEFINITION) refuse("evidence_view_not_reviewed_definition");
  return observed;
}

export const grantsApproval = (target, observed) => createHash("sha256").update(JSON.stringify([
  "W4-3", target.host, target.database, observed.timelineId, observed.ledger, observed.schemaSha256, APPROVED_SQL_SHA256,
])).digest("hex").slice(0, 12);

export async function dryRunGrants(client, manifest, options, read) {
  const { target, profile } = grantTarget(options.url, options.pin);
  grantSql(options.sqlHash, read);
  await client.query("SET SESSION CHARACTERISTICS AS TRANSACTION READ ONLY");
  await client.query("SET search_path = pg_catalog, public");
  const observed = await inspectGrants(client, manifest, profile);
  return { mode: "dry-run", target, sqlSha256: APPROVED_SQL_SHA256, ...observed, approvalCode: grantsApproval(target, observed) };
}

export async function executeGrants(client, manifest, options, read) {
  const { target, profile } = grantTarget(options.url, options.pin);
  grantSql(options.sqlHash, read);
  let commitAttempted = false;
  await client.query("BEGIN");
  try {
    await client.query("SET LOCAL lock_timeout = '5s'; SET LOCAL statement_timeout = '30s'");
    await client.query("SET LOCAL search_path = pg_catalog, public");
    const observed = await inspectGrants(client, manifest, profile);
    if (options.approval !== grantsApproval(target, observed)) refuse("approval_code_does_not_match");
    // Re-read/hash immediately before sending. One query stops at the first SQL error.
    await client.query(grantSql(options.sqlHash, read));
    commitAttempted = true;
    if ((await client.query("COMMIT"))?.command !== "COMMIT") refuse("commit_not_confirmed");
    return { mode: "execute", target, granted: ROLE, sqlSha256: APPROVED_SQL_SHA256 };
  } catch (error) { return transactionFailure(client, error, { commitAttempted }); }
}

async function run(args) {
  const get = flag => args.includes(flag) ? args[args.indexOf(flag) + 1] : undefined;
  const options = { url: process.env[get("--url-env") ?? ""], pin: get("--pinned-target"), sqlHash: get("--sql-sha256"), approval: get("--approval") };
  grantTarget(options.url, options.pin);
  grantSql(options.sqlHash);
  const manifest = loadManifest(); verifyManifest(manifest);
  const { default: pg } = await import("pg");
  const client = new pg.Client({ connectionString: options.url, connectionTimeoutMillis: 10000 });
  return withClient(client, () => args.includes("--execute") ? executeGrants(client, manifest, options) : dryRunGrants(client, manifest, options));
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exitCode = await reportCli(() => run(process.argv.slice(2)));
}
