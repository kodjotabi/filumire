// Guarded runner for the guardian-to-learner journey (tests/account-registration-journey.test.ts) on ONE
// disposable Neon child branch of integration-test, as the least-privilege filumire_app role.
// The branch is named in a reviewed manifest; main, filumire-preview and integration-test itself are refused,
// and the live session must prove its lineage (A4 ledger transaction, A5 grants, empty tables) before use.
//   --self-test  offline: refusal and connection-guard checks with fake clients. No network.
//   --check      read-only: verifies both sessions and lineage, snapshots, prints an approval code.
//   --execute --approval <code> --evidence <file>  WRITES fictional rows on the disposable branch only:
//                runs the journey, then read-only post-checks and the A5 permission suite, and saves evidence.
// The branch itself is deleted afterwards in the Neon console (no DELETE privilege is used by the app role).
// Usage: node scripts/test-neon-integration-journey.mjs --env-file <path> --branch-manifest <json> (--check | --execute ...)
//        node scripts/test-neon-integration-journey.mjs --self-test
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { DENIED_ENDPOINTS } from "./apply-migrations.mjs";
import { catalog, catalogHash } from "./catalog-snapshot.mjs";
import { APP_ROLE_MATRIX } from "./test-app-role-permissions.mjs";

/** The parent, as verified in A4/A5. The journey must never run here: it stays the clean baseline. */
export const PARENT = Object.freeze({
  project: "proud-term-61114809", branch: "br-long-leaf-b8wixqz2", endpoint: "ep-rough-water-b8fcf7pe",
  hostSuffix: ".c-14.us-east-1.aws.neon.tech", database: "neondb",
  schemaSha256: "20f333021d32ac58bcad97700ba6fc3ed608ce2557460127b19831fbb05deaf2",
  // Rows written by the single A4 transaction; only integration-test and its descendants hold them.
  ledger: ["0019_learner_accounts", "0020_auth_rate_limits", "0021_teacher_accounts", "0022_migration_ledger", "baseline-0000-0018"],
  ledgerAppliedAt: "2026-10-15T12:01:17.255Z",
});
export const ROLES = Object.freeze({ app: "filumire_app", owner: "neondb_owner" });
const REFUSED_ENDPOINTS = Object.freeze([...DENIED_ENDPOINTS, PARENT.endpoint]);
const APP_URL_ENV = "NEON_A6_APP_URL", OWNER_URL_ENV = "NEON_A6_OWNER_URL";
const ROOT = fileURLToPath(new URL("../", import.meta.url));
const JOURNEY = "tests/account-registration-journey.test.ts";
const EXPECTED_CHECKS = 21;
/** Tables the journey may add rows to (auth_rate_limits is also emptied by the test's resetRateLimits). */
export const MAY_GROW = Object.freeze(["account_credentials", "account_profiles", "auth_rate_limits", "auth_sessions",
  "guardian_consent_records", "interventions", "learner_learning_context", "learner_profiles", "learner_states",
  "learners", "pilot_measurement_events", "principal_learner_access", "principals"]);

export class JourneyError extends Error { constructor(code) { super(code); this.code = code; } }
const refuse = code => { throw new JourneyError(code); };
const sha256 = text => createHash("sha256").update(text.replace(/\r\n/g, "\n")).digest("hex");
const redact = text => String(text).replace(/postgres(ql)?:\/\/\S+/gi, "[redacted]");

/** Pure: the manifest names exactly one new child branch of integration-test, and nothing else. */
export function validateBranchManifest(m) {
  const keys = ["projectId", "parentBranchId", "branchId", "branchName", "endpointId", "host", "createdAt", "expiresAt"];
  if (!m || typeof m !== "object" || Object.keys(m).sort().join() !== [...keys].sort().join()) refuse("manifest_fields");
  if (m.projectId !== PARENT.project) refuse("manifest_project");
  if (m.parentBranchId !== PARENT.branch) refuse("manifest_parent_not_integration_test");
  if (!/^br-[a-z]+-[a-z]+-[a-z0-9]{8}$/.test(m.branchId) || m.branchId === PARENT.branch) refuse("manifest_branch_id");
  if (!/^a6-journey-\d{8}(-\d{1,2})?$/.test(m.branchName)) refuse("manifest_branch_name");
  if (!/^ep-[a-z]+-[a-z]+-[a-z0-9]{8}$/.test(m.endpointId)) refuse("manifest_endpoint_id");
  if (REFUSED_ENDPOINTS.includes(m.endpointId)) refuse("manifest_endpoint_refused");
  if (m.host !== `${m.endpointId}${PARENT.hostSuffix}`) refuse("manifest_host");
  const created = Date.parse(m.createdAt), expires = Date.parse(m.expiresAt);
  // An expiry is the backstop if manual deletion is ever missed.
  if (!Number.isFinite(created) || !Number.isFinite(expires) || expires <= created || expires - created > 7 * 86_400_000) refuse("manifest_expiry");
  return Object.freeze({ ...m });
}

/** Pure: the only acceptable connection string for `role` on the manifest branch, normalised to verify-full. */
export function checkJourneyUrl(text, role, manifest) {
  let url;
  try { url = new URL(text ?? ""); } catch { refuse("database_url_invalid"); }
  if (!["postgres:", "postgresql:"].includes(url.protocol)) refuse("database_url_invalid");
  const host = url.hostname.toLowerCase();
  if (DENIED_ENDPOINTS.some(endpoint => host.startsWith(endpoint))) refuse("denied_existing_endpoint");
  if (host.startsWith(PARENT.endpoint)) refuse("integration_test_itself_refused");
  if (host.includes("-pooler")) refuse("pooled_connection_not_allowed");
  if (host !== manifest.host) refuse("host_not_manifest_branch");
  if (url.port && url.port !== "5432") refuse("unexpected_port");
  if (decodeURIComponent(url.pathname.slice(1)) !== PARENT.database) refuse("database_not_neondb");
  if (![ROLES.app, ROLES.owner].includes(role) || decodeURIComponent(url.username) !== role) refuse("unexpected_role");
  // Query parameters can redirect the connection (host=, options=-c role=...). Only TLS settings are accepted.
  for (const key of url.searchParams.keys()) if (!["sslmode", "channel_binding"].includes(key)) refuse("connection_parameter_not_allowed");
  url.searchParams.set("sslmode", "verify-full");
  url.searchParams.delete("channel_binding");
  return url.toString();
}

/** Opens a read-only session only after checkJourneyUrl, then confirms Neon's own view of the branch. */
export async function connectVerified(urlText, role, manifest, pg) {
  const connectionString = checkJourneyUrl(urlText, role, manifest);
  const client = new pg.Client({ connectionString, connectionTimeoutMillis: 10000 });
  await client.connect();
  try {
    await client.query("SET SESSION CHARACTERISTICS AS TRANSACTION READ ONLY");
    const s = (await client.query(`select current_database() db, current_user u, session_user su,
      current_setting('is_superuser') sup, current_setting('neon.endpoint_id', true) e,
      current_setting('neon.branch_id', true) b, current_setting('neon.project_id', true) p`)).rows[0];
    if (s.db !== PARENT.database || s.u !== role || s.su !== role || s.sup !== "off" || s.p !== PARENT.project
      || s.e !== manifest.endpointId || s.b !== manifest.branchId || s.b === PARENT.branch || REFUSED_ENDPOINTS.includes(s.e)) refuse("session_target_mismatch");
    return client;
  } catch (error) { await client.end().catch(() => {}); throw error; }
}

/** Read-only owner snapshot: everything the approval code is bound to, plus IDs for the post-run diff. */
async function snapshot(owner) {
  const q = async (sql, params) => (await owner.query(sql, params)).rows;
  const tables = (await q("select tablename t from pg_tables where schemaname='public' order by 1")).map(r => r.t);
  const rowCounts = {};
  for (const t of tables) rowCounts[t] = (await q(`select count(*)::int n from public."${t}"`))[0].n;
  const privileges = {};
  for (const t of tables) privileges[t] = (await q(`select array_to_string(array(select p from unnest(array['SELECT','INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER']) p
    where has_table_privilege($1, $2, p)), ',') h`, [ROLES.app, `public.${t}`]))[0].h;
  const role = (await q("select rolsuper, rolcreaterole, rolcreatedb, rolreplication, rolbypassrls, rolconnlimit from pg_roles where rolname=$1", [ROLES.app]))[0];
  const memberships = (await q("select count(*)::int n from pg_auth_members m join pg_roles r on r.oid=m.member where r.rolname=$1", [ROLES.app]))[0].n;
  const defaultAcl = (await q("select count(*)::int n from pg_default_acl where defaclacl::text like '%filumire_app%'"))[0].n;
  const ledger = (await q("select id, applied_at from filumire_schema_migrations order by id")).map(r => ({ id: r.id, appliedAt: new Date(r.applied_at).toISOString() }));
  const principalIds = (await q("select id from principals order by id")).map(r => r.id);
  const learnerIds = (await q("select id from learners order by id")).map(r => r.id);
  return { schemaSha256: catalogHash(await catalog(owner)), tables, rowCounts, privileges, role, memberships, defaultAcl, ledger, principalIds, learnerIds };
}

/** Pure: pre-run proof that this is an untouched copy of integration-test after A5. */
export function assertLineage(snap) {
  const problems = [];
  if (snap.schemaSha256 !== PARENT.schemaSha256) problems.push("schema_not_integration_test");
  if (JSON.stringify(snap.ledger.map(l => l.id)) !== JSON.stringify(PARENT.ledger) || snap.ledger.some(l => l.appliedAt !== PARENT.ledgerAppliedAt)) problems.push("ledger_not_a4_transaction");
  for (const t of snap.tables) if (!(t in APP_ROLE_MATRIX)) problems.push(`unclassified:${t}`);
  for (const t of snap.tables) if (snap.privileges[t] !== (APP_ROLE_MATRIX[t] ?? []).join(",")) problems.push(`grants_differ:${t}`);
  for (const t of snap.tables) if (t !== "filumire_schema_migrations" && snap.rowCounts[t] !== 0) problems.push(`not_empty:${t}`);
  const r = snap.role;
  if (!r || r.rolsuper || r.rolcreaterole || r.rolcreatedb || r.rolreplication || r.rolbypassrls || r.rolconnlimit !== 20) problems.push("role_attributes");
  if (snap.memberships || snap.defaultAcl) problems.push("role_memberships_or_default_acl");
  if (problems.length) refuse(`lineage_failed:${problems.join(";")}`);
}

const fingerprint = (snap, manifest) => ({ manifest, schemaSha256: snap.schemaSha256, rowCounts: snap.rowCounts, privileges: snap.privileges,
  ledger: snap.ledger, journeySha256: sha256(readFileSync(resolve(ROOT, JOURNEY), "utf8")),
  runnerSha256: sha256(readFileSync(fileURLToPath(import.meta.url), "utf8")) });
export const approvalCode = (snap, manifest) => createHash("sha256").update(JSON.stringify(fingerprint(snap, manifest))).digest("hex").slice(0, 12);

/** Pure: compares the read-only snapshots taken before and after the journey. */
export function compareSnapshots(before, after) {
  const problems = [], grew = {};
  if (after.schemaSha256 !== before.schemaSha256) problems.push("schema_changed");
  if (JSON.stringify(after.privileges) !== JSON.stringify(before.privileges)) problems.push("grants_changed");
  if (JSON.stringify(after.ledger) !== JSON.stringify(before.ledger)) problems.push("ledger_changed");
  for (const t of before.tables) {
    const delta = (after.rowCounts[t] ?? 0) - before.rowCounts[t];
    if (delta > 0) grew[t] = delta;
    if (delta > 0 && !MAY_GROW.includes(t)) problems.push(`unexpected_rows:${t}`);
    if (delta < 0 && t !== "auth_rate_limits") problems.push(`rows_removed:${t}`);
  }
  const newPrincipals = after.principalIds.filter(id => !before.principalIds.includes(id));
  const newLearners = after.learnerIds.filter(id => !before.learnerIds.includes(id));
  if (before.principalIds.some(id => !after.principalIds.includes(id))) problems.push("existing_principal_removed");
  if (newPrincipals.length !== 3) problems.push(`expected_3_principals:${newPrincipals.length}`);
  if (newLearners.length !== 1) problems.push(`expected_1_learner:${newLearners.length}`);
  return { ok: !problems.length, problems, grew, newPrincipals, newLearners };
}

/** Pure, strict: exit 0, all 21 checks, PostgreSQL, and clean-up delegated to branch deletion with 0 rows deleted. */
export function judgeJourney({ status, signal, stdout }) {
  const passed = /accountJourneyTest: 'PASS'/.test(stdout) && /persistence: 'postgres'/.test(stdout);
  const checks = (stdout.match(/result: 'PASS'/g) ?? []).length;
  const disposal = /testDataDisposal: 'neon-branch', rowsDeleted: 0/.test(stdout);
  return { ok: status === 0 && !signal && passed && checks === EXPECTED_CHECKS && disposal, exitStatus: status, signal: signal ?? null, passed, checks, disposalDelegated: disposal };
}

/** Child environment: only what node needs plus the app-role connection. No owner URL, no PG* fallbacks. */
export function childEnv(appUrl, manifest, parent = process.env) {
  const keep = ["PATH", "Path", "SystemRoot", "SYSTEMROOT", "TEMP", "TMP", "HOME", "USERPROFILE", "APPDATA", "LOCALAPPDATA", "COMSPEC", "PATHEXT"];
  const env = Object.fromEntries(keep.filter(k => parent[k] !== undefined).map(k => [k, parent[k]]));
  return { ...env, DATABASE_URL: checkJourneyUrl(appUrl, ROLES.app, manifest), FILUMIRE_PERSISTENCE: "postgres",
    FILUMIRE_TEST_DATA_DISPOSAL: "neon-branch", FILUMIRE_AUTH_JWT_SECRET: "test-only-account-journey-secret-at-least-32-chars" };
}

async function verifiedSnapshot(manifest, pg) {
  const app = await connectVerified(process.env[APP_URL_ENV], ROLES.app, manifest, pg);
  await app.end();
  const owner = await connectVerified(process.env[OWNER_URL_ENV], ROLES.owner, manifest, pg);
  try { return await snapshot(owner); } finally { await owner.end(); }
}

async function run(args) {
  const get = flag => (args.includes(flag) ? args[args.indexOf(flag) + 1] : undefined);
  if (args.includes("--self-test")) return selfTest();
  const envFile = get("--env-file"), manifestFile = get("--branch-manifest");
  if (!envFile) refuse("env_file_required");
  if (!manifestFile) refuse("branch_manifest_required");
  const execute = args.includes("--execute");
  if (!execute && !args.includes("--check")) refuse("choose_check_or_execute");
  const evidenceFile = get("--evidence");
  if (execute && (!evidenceFile || existsSync(evidenceFile))) refuse("new_evidence_file_required");
  let manifestJson;
  try { manifestJson = JSON.parse(readFileSync(manifestFile, "utf8")); } catch { refuse("manifest_unreadable"); }
  const manifest = validateBranchManifest(manifestJson);
  process.loadEnvFile(envFile);
  // Validate both URLs before importing a driver or opening anything.
  checkJourneyUrl(process.env[APP_URL_ENV], ROLES.app, manifest);
  checkJourneyUrl(process.env[OWNER_URL_ENV], ROLES.owner, manifest);
  const { default: pg } = await import("pg");
  const before = await verifiedSnapshot(manifest, pg);
  assertLineage(before);
  const code = approvalCode(before, manifest);
  const summary = { manifest, schemaSha256: before.schemaSha256, rowCounts: before.rowCounts };
  if (!execute) return { mode: "check", writes: "none", lineage: "verified", ...summary, approvalCode: code };
  if (get("--approval") !== code) refuse("approval_code_does_not_match");

  const started = new Date().toISOString();
  const child = spawnSync(process.execPath, ["--import", "tsx", JOURNEY], { cwd: ROOT, env: childEnv(process.env[APP_URL_ENV], manifest), encoding: "utf8", timeout: 600_000, maxBuffer: 16 * 1024 * 1024 });
  const journey = judgeJourney({ status: child.status, signal: child.signal, stdout: child.stdout ?? "" });
  const after = await verifiedSnapshot(manifest, pg);
  const diff = compareSnapshots(before, after);
  const permissions = spawnSync(process.execPath, ["scripts/test-app-role-permissions.mjs", "--app-url-env", APP_URL_ENV, "--owner-url-env", OWNER_URL_ENV, "--expect-host", manifest.host],
    { cwd: ROOT, env: { ...childEnv(process.env[APP_URL_ENV], manifest), [APP_URL_ENV]: process.env[APP_URL_ENV], [OWNER_URL_ENV]: process.env[OWNER_URL_ENV] }, encoding: "utf8", timeout: 300_000 });
  let a5;
  try { const r = JSON.parse(permissions.stdout); a5 = { passed: r.passed, failed: r.failed, failures: r.failures }; } catch { a5 = { error: "unparseable" }; }
  const report = { mode: "execute", ok: journey.ok && diff.ok && a5.failed === 0 && a5.passed === 191, started, finished: new Date().toISOString(), ...summary, approvalCode: code,
    journey, journeyOutput: redact(child.stdout ?? "").split(/\r?\n/).filter(l => /test:|accountJourneyTest|testDataDisposal|FAIL/.test(l)),
    journeyErrors: redact(child.stderr ?? "").split(/\r?\n/).filter(Boolean).slice(0, 40),
    postCheck: diff, rowCountsAfter: after.rowCounts, permissions: a5,
    nextStep: `Delete Neon branch ${manifest.branchId} (${manifest.branchName}) after this evidence is preserved.` };
  const text = JSON.stringify(report, null, 1);
  if (/postgres(ql)?:\/\/|npg_/i.test(text)) refuse("evidence_contains_secret_like_text");
  writeFileSync(evidenceFile, text + "\n", { flag: "wx" });
  return report;
}

/** Offline checks. A fake driver records every client it is asked to create. */
async function selfTest() {
  const results = [];
  const record = (name, ok, detail) => results.push({ name, ok, ...(detail ? { detail } : {}) });
  const manifest = validateBranchManifest({ projectId: PARENT.project, parentBranchId: PARENT.branch, branchId: "br-quiet-lake-a1b2c3d4",
    branchName: "a6-journey-20261016", endpointId: "ep-misty-field-a1b2c3d4", host: `ep-misty-field-a1b2c3d4${PARENT.hostSuffix}`,
    createdAt: "2026-10-16T09:00:00Z", expiresAt: "2026-10-17T09:00:00Z" });
  const child = manifest.host;
  const url = (user, host = child, db = PARENT.database, query = "?sslmode=require") => `postgresql://${user}:fake-password@${host}/${db}${query}`;
  const manifestCases = [
    ["parent is not integration-test", { parentBranchId: "br-main-00000000" }, "manifest_parent_not_integration_test"],
    ["branch is integration-test itself", { branchId: PARENT.branch }, "manifest_branch_id"],
    ["endpoint is integration-test", { endpointId: PARENT.endpoint, host: `${PARENT.endpoint}${PARENT.hostSuffix}` }, "manifest_endpoint_refused"],
    ["endpoint is main", { endpointId: "ep-cold-bird-b8j437np", host: `ep-cold-bird-b8j437np${PARENT.hostSuffix}` }, "manifest_endpoint_refused"],
    ["endpoint is filumire-preview", { endpointId: "ep-icy-scene-b816974r", host: `ep-icy-scene-b816974r${PARENT.hostSuffix}` }, "manifest_endpoint_refused"],
    ["host does not match endpoint", { host: `ep-cold-bird-b8j437np${PARENT.hostSuffix}` }, "manifest_host"],
    ["other project", { projectId: "other-project-1234" }, "manifest_project"],
    ["unexpected branch name", { branchName: "main" }, "manifest_branch_name"],
    ["no expiry", { expiresAt: "" }, "manifest_expiry"],
    ["expiry over 7 days", { expiresAt: "2026-11-30T09:00:00Z" }, "manifest_expiry"],
    ["extra field", { connectionString: "x" }, "manifest_fields"],
  ];
  for (const [name, change, expected] of manifestCases) {
    let code; try { validateBranchManifest({ ...manifest, ...change }); } catch (e) { code = e.code; }
    record(`manifest refuses ${name}`, code === expected, code === expected ? undefined : String(code));
  }
  const refused = [
    ["main endpoint (production)", url("filumire_app", `ep-cold-bird-b8j437np${PARENT.hostSuffix}`), "denied_existing_endpoint"],
    ["filumire-preview endpoint", url("filumire_app", `ep-icy-scene-b816974r${PARENT.hostSuffix}`), "denied_existing_endpoint"],
    ["main endpoint, pooled", url("filumire_app", `ep-cold-bird-b8j437np-pooler${PARENT.hostSuffix}`), "denied_existing_endpoint"],
    ["integration-test itself", url("filumire_app", `${PARENT.endpoint}${PARENT.hostSuffix}`), "integration_test_itself_refused"],
    ["disposable branch, pooled", url("filumire_app", `ep-misty-field-a1b2c3d4-pooler${PARENT.hostSuffix}`), "pooled_connection_not_allowed"],
    ["another Neon endpoint", url("filumire_app", `ep-other-thing-a1b2c3d4${PARENT.hostSuffix}`), "host_not_manifest_branch"],
    ["look-alike host suffix", url("filumire_app", `${child}.evil.test`), "host_not_manifest_branch"],
    ["localhost", url("filumire_app", "localhost"), "host_not_manifest_branch"],
    ["database postgres", url("filumire_app", child, "postgres"), "database_not_neondb"],
    ["database filumire_test", url("filumire_app", child, "filumire_test"), "database_not_neondb"],
    ["no database", url("filumire_app", child, ""), "database_not_neondb"],
    ["owner role as app", url("neondb_owner"), "unexpected_role"],
    ["other role", url("filumire_test_user"), "unexpected_role"],
    ["host override parameter", url("filumire_app", child, PARENT.database, `?sslmode=require&host=ep-cold-bird-b8j437np${PARENT.hostSuffix}`), "connection_parameter_not_allowed"],
    ["role override via options", url("filumire_app", child, PARENT.database, "?options=-c%20role%3Dneondb_owner"), "connection_parameter_not_allowed"],
    ["database override parameter", url("filumire_app", child, PARENT.database, "?dbname=postgres"), "connection_parameter_not_allowed"],
    ["unexpected port", `postgresql://filumire_app:x@${child}:6543/neondb`, "unexpected_port"],
    ["not postgres", `https://${child}/neondb`, "database_url_invalid"],
    ["missing", undefined, "database_url_invalid"],
  ];
  for (const [name, text, expected] of refused) {
    let created = 0;
    const fake = { Client: class { constructor() { created += 1; } async connect() {} async query() { return { rows: [] }; } async end() {} } };
    let code;
    try { await connectVerified(text, ROLES.app, manifest, fake); } catch (e) { code = e.code; }
    record(`refuses ${name}`, code === expected && created === 0, code === expected ? undefined : String(code));
  }
  const good = url("filumire_app", child, PARENT.database, "?sslmode=require&channel_binding=require");
  const normalised = new URL(checkJourneyUrl(good, ROLES.app, manifest));
  record("accepts manifest branch as filumire_app, forces verify-full", normalised.searchParams.get("sslmode") === "verify-full" && !normalised.searchParams.has("channel_binding"));
  record("accepts manifest branch as owner for read-only snapshots", Boolean(checkJourneyUrl(url("neondb_owner"), ROLES.owner, manifest)));
  const session = { db: PARENT.database, u: ROLES.app, su: ROLES.app, sup: "off", e: manifest.endpointId, b: manifest.branchId, p: PARENT.project };
  for (const [name, change] of [["branch (integration-test)", { b: PARENT.branch }], ["branch (other)", { b: "br-main-00000000" }],
    ["endpoint", { e: "ep-cold-bird-b8j437np" }], ["project", { p: "other-project" }], ["database", { db: "postgres" }],
    ["user", { u: "neondb_owner" }], ["superuser", { sup: "on" }]]) {
    let ended = false, readOnly = false, code;
    const fake = { Client: class { async connect() {} async end() { ended = true; }
      async query(sql) { if (/READ ONLY/.test(sql)) readOnly = true; return { rows: [{ ...session, ...change }] }; } } };
    try { await connectVerified(good, ROLES.app, manifest, fake); } catch (e) { code = e.code; }
    record(`refuses live session with wrong ${name}`, code === "session_target_mismatch" && ended && readOnly);
  }
  { let code; const fake = { Client: class { async connect() {} async end() {} async query() { return { rows: [session] }; } } };
    try { await (await connectVerified(good, ROLES.app, manifest, fake)).end(); } catch (e) { code = e.code; }
    record("accepts verified disposable-branch session", code === undefined); }
  const lineageOk = { schemaSha256: PARENT.schemaSha256, tables: Object.keys(APP_ROLE_MATRIX).sort(),
    rowCounts: Object.fromEntries(Object.keys(APP_ROLE_MATRIX).map(t => [t, t === "filumire_schema_migrations" ? 5 : 0])),
    privileges: Object.fromEntries(Object.entries(APP_ROLE_MATRIX).map(([t, p]) => [t, p.join(",")])),
    ledger: PARENT.ledger.map(id => ({ id, appliedAt: PARENT.ledgerAppliedAt })),
    role: { rolsuper: false, rolcreaterole: false, rolcreatedb: false, rolreplication: false, rolbypassrls: false, rolconnlimit: 20 }, memberships: 0, defaultAcl: 0 };
  const lineage = change => { try { assertLineage({ ...lineageOk, ...change }); return "ok"; } catch (e) { return e.code; } };
  record("lineage: untouched copy of integration-test accepted", lineage({}) === "ok");
  record("lineage: data present (e.g. production) refused", lineage({ rowCounts: { ...lineageOk.rowCounts, learners: 12 } }).startsWith("lineage_failed:not_empty:learners"));
  record("lineage: different ledger transaction refused", lineage({ ledger: PARENT.ledger.map(id => ({ id, appliedAt: "2026-10-01T00:00:00.000Z" })) }).includes("ledger_not_a4_transaction"));
  record("lineage: no ledger (main/preview) refused", lineage({ ledger: [] }).includes("ledger_not_a4_transaction"));
  record("lineage: different schema refused", lineage({ schemaSha256: "0".repeat(64) }).includes("schema_not_integration_test"));
  record("lineage: extra DELETE grant refused", lineage({ privileges: { ...lineageOk.privileges, learners: "DELETE,INSERT,SELECT" } }).includes("grants_differ:learners"));
  record("lineage: elevated role refused", lineage({ role: { ...lineageOk.role, rolbypassrls: true } }).includes("role_attributes"));
  const env = childEnv(good, manifest, { PATH: "p", PGHOST: "evil", PGDATABASE: "postgres", NEON_A6_OWNER_URL: "owner", DATABASE_URL: "other", NODE_OPTIONS: "--require x" });
  const envUrl = new URL(env.DATABASE_URL);
  record("child env: app URL on manifest branch only, disposal mode, no PG*/owner/NODE_OPTIONS",
    envUrl.username === ROLES.app && envUrl.hostname === child && env.FILUMIRE_TEST_DATA_DISPOSAL === "neon-branch" && env.FILUMIRE_PERSISTENCE === "postgres"
    && !("PGHOST" in env) && !("PGDATABASE" in env) && !("NEON_A6_OWNER_URL" in env) && !("NODE_OPTIONS" in env));
  { let code; try { childEnv(url("filumire_app", `${PARENT.endpoint}${PARENT.hostSuffix}`), manifest); } catch (e) { code = e.code; }
    record("child env refuses integration-test itself", code === "integration_test_itself_refused"); }
  const out = (n, extra = "\n{ testDataDisposal: 'neon-branch', rowsDeleted: 0 }") => Array.from({ length: n }, (_, i) => `{ test: 't${i}', result: 'PASS' }`).join("\n") + "\n{ accountJourneyTest: 'PASS', checks: 21, persistence: 'postgres' }" + extra;
  record("judge: exit 0, 21 checks, postgres, disposal delegated", judgeJourney({ status: 0, stdout: out(21) }).ok);
  record("judge: non-zero exit after 21 checks is a FAILURE", !judgeJourney({ status: 1, stdout: out(21) }).ok);
  record("judge: killed by signal is a failure", !judgeJourney({ status: null, signal: "SIGTERM", stdout: out(21) }).ok);
  record("judge: no disposal marker (clean-up attempted) is a failure", !judgeJourney({ status: 0, stdout: out(21, "") }).ok);
  record("judge: memory persistence is a failure", !judgeJourney({ status: 0, stdout: out(21).replace("'postgres'", "'memory'") }).ok);
  record("judge: missing checks is a failure", !judgeJourney({ status: 0, stdout: out(20) }).ok);
  const base = { schemaSha256: "s", tables: ["principals", "learners", "payment_receipts", "auth_rate_limits"], privileges: { a: "x" }, ledger: ["l"],
    rowCounts: { principals: 0, learners: 0, payment_receipts: 0, auth_rate_limits: 2 }, principalIds: [], learnerIds: [] };
  const grown = { ...base, rowCounts: { principals: 3, learners: 1, payment_receipts: 0, auth_rate_limits: 0 }, principalIds: ["a", "b", "c"], learnerIds: ["l1"] };
  record("diff: expected growth passes", compareSnapshots(base, grown).ok);
  record("diff: payment rows fail", !compareSnapshots(base, { ...grown, rowCounts: { ...grown.rowCounts, payment_receipts: 1 } }).ok);
  record("diff: grant change fails", !compareSnapshots(base, { ...grown, privileges: { a: "y" } }).ok);
  record("diff: schema change fails", !compareSnapshots(base, { ...grown, schemaSha256: "t" }).ok);
  const failed = results.filter(r => !r.ok);
  return { mode: "self-test", network: "none", passed: results.length - failed.length, failed: failed.length, failures: failed, results };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const report = await run(process.argv.slice(2));
    console.log(JSON.stringify(report, null, 1));
    if (report.failed || report.ok === false) process.exitCode = 1;
  } catch (error) {
    console.log(JSON.stringify({ error: error.code ?? redact(error.message) }));
    process.exitCode = 1;
  }
}
