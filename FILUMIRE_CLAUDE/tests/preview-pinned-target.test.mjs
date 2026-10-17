// W2: the pinned filumire-preview target, R1 fingerprint gate and case B1 reconciliation. No database, network or
// Vercel access: the apply runs against a scripted fake client.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { loadManifest } from "../scripts/migration-ledger.mjs";
import { checkTarget, planApply, approvalCode, dryRun, execute, DENIED_ENDPOINTS, ApplyError } from "../scripts/apply-migrations.mjs";
import { PINNED_TARGETS, NEVER_ALLOWED_ENDPOINTS, FINGERPRINT_SQL, pinnedTarget, checkPreconditions, PinnedTargetError } from "../scripts/pinned-targets.mjs";
import { connectionString } from "../scripts/test-app-role-permissions.mjs";
import { catalogHash } from "../scripts/catalog-snapshot.mjs";

let checks = 0;
const ok = fn => { fn(); checks++; };
const refuses = (code, fn) => { assert.throws(fn, error => error.code === code, code); checks++; };
const rejects = async (code, fn) => { await assert.rejects(fn, error => error.code === code, code); checks++; };

const manifest = loadManifest();
const profile = pinnedTarget("filumire-preview");
const PREVIEW = profile.host, MAIN = "ep-cold-bird-b8j437np.c-14.us-east-1.aws.neon.tech";
const url = (host, db = "neondb", ssl = "?sslmode=require") => `postgresql://neondb_owner:fictional@${host}/${db}${ssl}`;

// ---- The pinned profile is exactly the R0/R1 evidence, and never production
ok(() => assert.deepEqual(
  [profile.project, profile.branch, profile.endpoint, profile.database, profile.role],
  ["proud-term-61114809", "br-round-resonance-b8fm2nao", "ep-icy-scene-b816974r", "neondb", "neondb_owner"]));
ok(() => assert.deepEqual(Object.keys(PINNED_TARGETS), ["filumire-preview"], "one pinned target only"));
ok(() => assert.deepEqual(NEVER_ALLOWED_ENDPOINTS, ["ep-cold-bird-b8j437np"]));
ok(() => assert(DENIED_ENDPOINTS.includes(profile.endpoint) && DENIED_ENDPOINTS.includes("ep-cold-bird-b8j437np"), "both stay denied by default"));
ok(() => assert(Object.isFrozen(PINNED_TARGETS["filumire-preview"].fingerprints)));
ok(() => assert.deepEqual(profile.expectedPlan.pending, planApply(manifest, []).pending, "B1 plan = every migration, from 0019"));
ok(() => {
  // The fingerprint query is Q8 of the committed read-only script, so live values compare with R1.
  const script = readFileSync(new URL("../scripts/sql/preview-history-reconciliation-readonly.sql", import.meta.url), "utf8").replace(/\r\n/g, "\n");
  const q8 = script.slice(script.indexOf("SELECT\n  (SELECT count(*)"), script.indexOf(" AS indexes_sha256;") + " AS indexes_sha256".length);
  assert.equal(FINGERPRINT_SQL, q8);
});
refuses("unknown_pinned_target", () => pinnedTarget("main"));
refuses("unknown_pinned_target", () => pinnedTarget(undefined));
refuses("unknown_pinned_target", () => pinnedTarget("toString"));

// ---- Target restrictions: apply-migrations
ok(() => assert.deepEqual(checkTarget(url(PREVIEW), PREVIEW, "neondb", profile), { host: PREVIEW, database: "neondb", pinned: "filumire-preview" }));
refuses("denied_existing_endpoint", () => checkTarget(url(PREVIEW), PREVIEW, "neondb"));
refuses("production_endpoint_never_allowed", () => checkTarget(url(MAIN), MAIN, "neondb", profile));
refuses("production_endpoint_never_allowed", () => checkTarget(url(MAIN.replace(".c-14", "-pooler.c-14")), MAIN.replace(".c-14", "-pooler.c-14"), "neondb", profile));
refuses("denied_existing_endpoint", () => checkTarget(url(MAIN), MAIN, "neondb"));
refuses("pinned_host_mismatch", () => checkTarget(url("ep-fictional-test-a1b2c3.c-14.us-east-1.aws.neon.tech"), "ep-fictional-test-a1b2c3.c-14.us-east-1.aws.neon.tech", "neondb", profile));
refuses("pinned_host_mismatch", () => checkTarget(url(PREVIEW.replace(".c-14", "-pooler.c-14")), PREVIEW.replace(".c-14", "-pooler.c-14"), "neondb", profile));
refuses("pinned_host_mismatch", () => checkTarget(url("localhost", "neondb", ""), "localhost", "neondb", profile));
refuses("host_does_not_match_expected", () => checkTarget(url(PREVIEW), "ep-other.example.neon.tech", "neondb", profile));
refuses("database_does_not_match_expected", () => checkTarget(url(PREVIEW, "filumire_test"), PREVIEW, "filumire_test", profile));
refuses("tls_required", () => checkTarget(url(PREVIEW, "neondb", ""), PREVIEW, "neondb", profile));

// ---- Target restrictions: test-app-role-permissions
ok(() => assert.equal(new URL(connectionString(url(PREVIEW), PREVIEW, profile)).searchParams.get("sslmode"), "verify-full"));
assert.throws(() => connectionString(url(PREVIEW), PREVIEW), /denied_existing_endpoint/); checks++;
refuses("production_endpoint_never_allowed", () => connectionString(url(MAIN), MAIN, profile));
assert.throws(() => connectionString(url(MAIN), MAIN), /denied_existing_endpoint/); checks++;
refuses("pinned_host_mismatch", () => connectionString(url("ep-fictional-test-a1b2c3.c-14.us-east-1.aws.neon.tech"), "ep-fictional-test-a1b2c3.c-14.us-east-1.aws.neon.tech", profile));

// ---- Preconditions (pure)
const r1 = () => ({
  identity: { database: "neondb", role: "neondb_owner", superuser: false, timelineId: profile.timelineId },
  fingerprints: { ...profile.fingerprints }, history: [],
});
const freshPlan = planApply(manifest, []);
ok(() => checkPreconditions(profile, r1(), freshPlan));
for (const key of ["columns", "constraints", "indexes"])
  refuses(`schema_fingerprint_mismatch:${key}`, () => checkPreconditions(profile, { ...r1(), fingerprints: { ...profile.fingerprints, [key]: "0".repeat(64) } }, freshPlan));
refuses("schema_fingerprint_mismatch:baseTables", () => checkPreconditions(profile, { ...r1(), fingerprints: { ...profile.fingerprints, baseTables: 29 } }, freshPlan));
refuses("pinned_identity_mismatch:timeline", () => checkPreconditions(profile, { ...r1(), identity: { ...r1().identity, timelineId: "19176e69946f9c2943bbe66103f9c834" } }, freshPlan));
refuses("pinned_identity_mismatch:timeline", () => checkPreconditions(profile, { ...r1(), identity: { ...r1().identity, timelineId: null } }, freshPlan));
refuses("pinned_identity_mismatch:role", () => checkPreconditions(profile, { ...r1(), identity: { ...r1().identity, role: "filumire_app" } }, freshPlan));
refuses("pinned_identity_mismatch:superuser", () => checkPreconditions(profile, { ...r1(), identity: { ...r1().identity, superuser: true } }, freshPlan));
refuses("pinned_identity_mismatch:database", () => checkPreconditions(profile, { ...r1(), identity: { ...r1().identity, database: "filumire_test" } }, freshPlan));
refuses("unexpected_history_relation:drizzle.__drizzle_migrations", () => checkPreconditions(profile, { ...r1(), history: ["drizzle.__drizzle_migrations"] }, freshPlan));
refuses("pinned_plan_mismatch", () => checkPreconditions(profile, r1(), planApply(manifest, manifest.entries.slice(0, 2).map(e => ({ id: e.id, sha256: e.sha256 ?? "0".repeat(64) })))));

// ---- Fake client: R1 state, scripted per test
const fileId = sql => manifest.entries.find(e => e.file && readFileSync(`${manifest.folder}/${e.file}`, "utf8").replace(/\r\n/g, "\n") === sql.replace(/\r\n/g, "\n"))?.id;
function fakeClient({ fingerprints = { ...profile.fingerprints }, onApply = () => {}, failOn } = {}) {
  const state = { fingerprints, ledger: null, queries: [], applied: [], inserts: [] };
  state.query = async (sql, params) => {
    state.queries.push(sql.trim().split(/\s+/).slice(0, 3).join(" "));
    const id = fileId(sql);
    if (id) {
      if (id === failOn) throw new Error(`relation already exists (${id})`);
      state.applied.push(id);
      if (id === "0022_migration_ledger") state.ledger = [];
      onApply(id, state);
      return { rows: [] };
    }
    if (sql.startsWith("select to_regclass")) return { rows: [{ t: state.ledger ? "filumire_schema_migrations" : null }] };
    if (sql.startsWith("select id, kind, sha256 from")) return { rows: state.ledger ?? [] };
    if (sql.startsWith("select current_database()")) return { rows: [{ db: "neondb", usr: "neondb_owner", su: false, tl: profile.timelineId }] };
    if (sql === FINGERPRINT_SQL) {
      const f = state.fingerprints;
      return { rows: [{ base_tables: String(f.baseTables), columns_sha256: f.columns, constraints_sha256: f.constraints, indexes_sha256: f.indexes }] };
    }
    if (sql.startsWith("select n.nspname")) return { rows: [] };
    if (sql.startsWith("select current_user u")) return { rows: [{ u: "neondb_owner" }] };
    if (sql.startsWith("insert into")) { state.inserts.push(params[0]); return { rows: [] }; }
    return { rows: [] }; // BEGIN, SET, advisory lock, COMMIT, ROLLBACK, catalog reads (empty snapshot)
  };
  return state;
}
const target = checkTarget(url(PREVIEW), PREVIEW, "neondb", profile);
const emptyCatalogHash = catalogHash({ tables: [], columns: [], constraints: [], indexes: [] });
const code = approvalCode(target, freshPlan, emptyCatalogHash);

// Dry run: read-only session, reports the R1 fingerprints and the B1 plan.
{
  const client = fakeClient();
  const report = await dryRun(client, manifest, target, profile);
  assert.equal(client.queries[0], "SET SESSION CHARACTERISTICS");
  assert.deepEqual(report.pending, profile.expectedPlan.pending);
  assert.deepEqual(report.fingerprints, profile.fingerprints);
  assert.deepEqual(report.reconciled, ["0019_learner_accounts", "0020_auth_rate_limits", "0021_teacher_accounts"]);
  assert.equal(report.approvalCode, code);
  assert.equal(client.applied.length, 0); checks++;
}
// Dry run on a drifted schema is refused.
await rejects("schema_fingerprint_mismatch:constraints", () => dryRun(fakeClient({ fingerprints: { ...profile.fingerprints, constraints: "f".repeat(64) } }), manifest, target, profile));

// B1 happy path: timeouts, lock, re-run 0019-0021, convergence check, 0022-0024, baseline + six rows, one COMMIT.
{
  const client = fakeClient();
  const result = await execute(client, manifest, target, code, profile);
  assert.deepEqual(client.applied, profile.expectedPlan.pending);
  assert.deepEqual(client.inserts, ["baseline-0000-0018", ...profile.expectedPlan.pending]);
  assert.equal(client.queries[0], "BEGIN");
  assert.equal(client.queries[1], "SET LOCAL lock_timeout");
  assert.equal(client.queries.at(-1), "COMMIT");
  assert(!client.queries.includes("ROLLBACK"));
  assert.deepEqual(result.reconciled, profile.reconciled);
  assert.equal(result.baselineRecorded, true); checks++;
}
// B1 non-convergence: 0021's re-run leaves a different constraint set -> rollback, nothing recorded, 0022+ never run.
{
  const client = fakeClient({ onApply: (id, state) => { if (id === "0021_teacher_accounts") state.fingerprints = { ...state.fingerprints, constraints: "c".repeat(64) }; } });
  await rejects("reconciled_rerun_changed_schema:constraints", () => execute(client, manifest, target, code, profile));
  assert.deepEqual(client.applied, profile.reconciled);
  assert.deepEqual(client.inserts, []);
  assert.equal(client.queries.at(-1), "ROLLBACK");
  assert(!client.queries.includes("COMMIT")); checks++;
}
// Schema changed after the dry run: refused before any migration SQL runs.
{
  const client = fakeClient({ fingerprints: { ...profile.fingerprints, columns: "d".repeat(64) } });
  await rejects("schema_fingerprint_mismatch:columns", () => execute(client, manifest, target, code, profile));
  assert.deepEqual(client.applied, []);
  assert.equal(client.queries.at(-1), "ROLLBACK"); checks++;
}
// Wrong approval code: refused, rolled back, nothing applied.
{
  const client = fakeClient();
  await rejects("approval_code_does_not_match_plan", () => execute(client, manifest, target, "000000000000", profile));
  assert.deepEqual(client.applied, []); assert.equal(client.queries.at(-1), "ROLLBACK"); checks++;
}
// A failing migration (0023) rolls the whole transaction back and records nothing.
{
  const client = fakeClient({ failOn: "0023_learner_grade_set_by" });
  const result = await execute(client, manifest, target, code, profile);
  assert.equal(result.rolledBack, true); assert.equal(result.failedAt, "0023_learner_grade_set_by");
  assert.deepEqual(client.inserts, []); assert.equal(client.queries.at(-1), "ROLLBACK"); checks++;
}
// A migration file edited after review is refused inside the transaction.
{
  const client = fakeClient();
  await rejects("file_changed_after_review:0019_learner_accounts", () => execute(client, manifest, target, code, profile, () => "-- tampered\n"));
  assert.deepEqual(client.applied, []); assert.equal(client.queries.at(-1), "ROLLBACK"); checks++;
}
// Unpinned test targets keep their old behaviour: no fingerprint gate, no extra timeouts.
{
  const testHost = "ep-fictional-test-a1b2c3.c-14.us-east-1.aws.neon.tech";
  const testTarget = checkTarget(url(testHost), testHost, "neondb");
  const client = fakeClient({ fingerprints: { baseTables: 0, columns: "x", constraints: "y", indexes: "z" } });
  await execute(client, manifest, testTarget, approvalCode(testTarget, freshPlan, emptyCatalogHash));
  assert(!client.queries.includes("SET LOCAL lock_timeout"));
  assert.equal(client.queries.at(-1), "COMMIT"); checks++;
}
ok(() => assert(new PinnedTargetError("x") instanceof Error && new ApplyError("x") instanceof Error));

console.log(`PASS: pinned filumire-preview target — ${checks} checks (target restrictions, R1 fingerprint gate, B1 reconciliation, fail-closed)`);
