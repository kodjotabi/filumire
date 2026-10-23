// Phase 1 integration foundation: migration ledger and deployment guard. No database, network or Vercel access.
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, copyFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadManifest, verifyManifest, compareLedger, sha256, LedgerError } from "../scripts/migration-ledger.mjs";
import { checkDeployment, DeployGuardError } from "../scripts/deploy-guard.mjs";

let checks = 0;
const ok = (fn) => { fn(); checks++; };
const refuses = (code, fn) => { assert.throws(fn, error => error.code === code, code); checks++; };

// ---- Migration ledger
const manifest = loadManifest();
ok(() => assert.equal(verifyManifest(manifest), 7));
ok(() => assert.equal(sha256("a\r\nb\n"), sha256("a\nb\n"), "line endings do not change the hash"));
{
  // A reviewed file edited afterwards is refused.
  const folder = mkdtempSync(join(tmpdir(), "ledger-"));
  copyFileSync(join(manifest.folder, "MIGRATIONS.json"), join(folder, "MIGRATIONS.json"));
  for (const entry of manifest.entries.filter(e => e.file)) copyFileSync(join(manifest.folder, entry.file), join(folder, entry.file));
  writeFileSync(join(folder, "0021_teacher_accounts.sql"), "-- tampered\n");
  refuses("file_changed_after_review:0021_teacher_accounts", () => verifyManifest(loadManifest(folder)));
}
refuses("baseline_must_be_first_and_only", () => verifyManifest({ ...manifest, entries: manifest.entries.slice(1) }));
refuses("duplicate_or_missing_id:0019_learner_accounts", () => verifyManifest({ ...manifest, entries: [...manifest.entries, manifest.entries[1]] }));

const row = id => ({ id, sha256: manifest.entries.find(e => e.id === id)?.sha256 ?? "0".repeat(64) });
ok(() => {
  const fresh = compareLedger(manifest, []);
  assert.deepEqual(fresh.applied, []); assert.equal(fresh.pending.length, 7); assert.equal(fresh.consistent, true);
});
ok(() => {
  const partial = compareLedger(manifest, [row("baseline-0000-0018"), row("0019_learner_accounts")]);
  assert.deepEqual(partial.pending, ["0020_auth_rate_limits", "0021_teacher_accounts", "0022_migration_ledger", "0023_learner_grade_set_by", "0024_deployment_migration_evidence"]); assert.equal(partial.consistent, true);
});
ok(() => assert.equal(compareLedger(manifest, [row("baseline-0000-0018"), row("0020_auth_rate_limits")]).outOfOrder, true, "skipped migration detected"));
ok(() => assert.deepEqual(compareLedger(manifest, [row("baseline-0000-0018"), { id: "0019_learner_accounts", sha256: "f".repeat(64) }]).drift, ["0019_learner_accounts"]));
ok(() => assert.deepEqual(compareLedger(manifest, [row("baseline-0000-0018"), { id: "0099_unknown", sha256: "a".repeat(64) }]).unknown, ["0099_unknown"]));

// ---- Deployment guard
const SHA = "abc123";
const prodHost = "ep-prod.example-region.aws.neon.tech", previewHost = "ep-preview.example-region.aws.neon.tech";
const base = { VERCEL: "1", FILUMIRE_DB_HOSTS_PRODUCTION: prodHost, FILUMIRE_DB_HOSTS_PREVIEW: previewHost };
const prod = { ...base, VERCEL_ENV: "production", FILUMIRE_PERSISTENCE: "postgres", DATABASE_URL: `postgresql://filumire_app:fictional@${prodHost}/neondb`,
  VERCEL_GIT_COMMIT_SHA: SHA, FILUMIRE_APPROVED_PRODUCTION_SHA: SHA, VERCEL_GIT_COMMIT_REF: "main" };
const preview = { ...base, VERCEL_ENV: "preview" };

ok(() => assert.equal(checkDeployment({}).mode, "local"));
ok(() => assert.equal(checkDeployment(prod).mode, "production"));
ok(() => assert.equal(checkDeployment(preview).persistence, "memory"));
ok(() => assert.equal(checkDeployment({ ...preview, FILUMIRE_PERSISTENCE: "postgres", DATABASE_URL: `postgres://filumire_app:fictional@${previewHost}/neondb` }).mode, "preview"));
ok(() => assert.equal(checkDeployment({ ...prod, DATABASE_URL: `postgresql://filumire_app:fictional@ep-prod-pooler.example-region.aws.neon.tech/neondb` }).mode, "production", "pooled host accepted"));

refuses("unknown_vercel_environment", () => checkDeployment({ VERCEL: "1", VERCEL_ENV: "development" }));
refuses("owner_credentials_present", () => checkDeployment({ ...preview, FLPREVIEW_DATABASE_URL: "x" }));
refuses("production_memory_mode", () => checkDeployment({ ...prod, FILUMIRE_PERSISTENCE: undefined }));
refuses("production_memory_mode", () => checkDeployment({ ...prod, FILUMIRE_PERSISTENCE: "memory" }));
refuses("database_url_invalid", () => checkDeployment({ ...prod, DATABASE_URL: "not a url" }));
refuses("database_host_not_allowed", () => checkDeployment({ ...prod, DATABASE_URL: `postgresql://filumire_app:fictional@ep-other.example-region.aws.neon.tech/neondb` }));
refuses("database_allowlist_missing_production", () => checkDeployment({ ...prod, FILUMIRE_DB_HOSTS_PRODUCTION: "" }));
refuses("preview_uses_production_database", () => checkDeployment({ ...preview, FILUMIRE_PERSISTENCE: "postgres", FILUMIRE_DB_HOSTS_PREVIEW: `${previewHost},${prodHost}`, DATABASE_URL: `postgresql://filumire_app:fictional@${prodHost}/neondb` }));
refuses("database_owner_role", () => checkDeployment({ ...prod, DATABASE_URL: `postgresql://neondb_owner:fictional@${prodHost}/neondb` }));
refuses("production_commit_not_approved", () => checkDeployment({ ...prod, FILUMIRE_APPROVED_PRODUCTION_SHA: "other" }));
refuses("production_commit_not_approved", () => checkDeployment({ ...prod, FILUMIRE_APPROVED_PRODUCTION_SHA: undefined }));
refuses("production_branch_not_approved", () => checkDeployment({ ...prod, VERCEL_GIT_COMMIT_REF: "feature-x" }));
// Private review: a valid 1-5 entry reviewer list, closed registration, no external identity.
const reviewers = { FILUMIRE_ACCESS_MODE: "reviewers", FILUMIRE_REVIEWER_EMAILS: "g1@example.test:guardian,g2@example.test:guardian,g3@example.test:guardian,t1@example.test:teacher,t2@example.test:teacher" };
ok(() => assert.equal(checkDeployment({ ...prod, ...reviewers }).mode, "production"));
ok(() => assert.equal(checkDeployment({ ...preview, ...reviewers }).mode, "preview"));
// Basic 7–9 private presentation (owner decision 23 Oct 2026): local rehearsal, a Preview (behind
// Vercel Authentication), or Production only in private reviewer mode. Never public Production.
const jhs = { FILUMIRE_JHS_MODE: "private-presentation" };
ok(() => assert.equal(checkDeployment({ ...jhs }).mode, "local"));
ok(() => assert.equal(checkDeployment({ ...preview, ...jhs }).mode, "preview"));
ok(() => assert.equal(checkDeployment({ ...preview, ...reviewers, ...jhs }).mode, "preview"));
ok(() => assert.equal(checkDeployment({ ...prod, ...reviewers, ...jhs }).mode, "production"));
refuses("jhs_mode_requires_reviewer_mode", () => checkDeployment({ ...prod, ...jhs }));
refuses("jhs_mode_requires_reviewer_mode", () => checkDeployment({ ...prod, ...jhs, FILUMIRE_ACCESS_MODE: undefined, FILUMIRE_REVIEWER_EMAILS: reviewers.FILUMIRE_REVIEWER_EMAILS }));
refuses("jhs_mode_requires_reviewer_mode", () => checkDeployment({ ...prod, ...jhs, FILUMIRE_ACCESS_MODE: "everyone" }));
refuses("reviewer_list_invalid", () => checkDeployment({ ...prod, ...jhs, FILUMIRE_ACCESS_MODE: "reviewers" }));
refuses("reviewer_mode_with_open_registration", () => checkDeployment({ ...prod, ...reviewers, ...jhs, FILUMIRE_ACCOUNT_REGISTRATION: "open" }));
for (const value of ["off", "on", "true", "Private-Presentation", " private-presentation"]) {
  refuses("jhs_mode_unknown", () => checkDeployment({ ...preview, FILUMIRE_JHS_MODE: value }));
  refuses("jhs_mode_unknown", () => checkDeployment({ ...prod, ...reviewers, FILUMIRE_JHS_MODE: value }));
}
// The other Production rules still apply with Basic 7–9 on.
refuses("production_commit_not_approved", () => checkDeployment({ ...prod, ...reviewers, ...jhs, FILUMIRE_APPROVED_PRODUCTION_SHA: "other" }));
refuses("production_memory_mode", () => checkDeployment({ ...prod, ...reviewers, ...jhs, FILUMIRE_PERSISTENCE: "memory" }));
refuses("unknown_access_mode", () => checkDeployment({ ...prod, FILUMIRE_ACCESS_MODE: "everyone" }));
for (const list of [undefined, "", `${reviewers.FILUMIRE_REVIEWER_EMAILS},s6@example.test:teacher`, "g1@example.test", "g1@example.test:admin",
  "g1@example.test:learner", "not-an-email:guardian", "g1@example.test:guardian,G1@EXAMPLE.TEST:teacher"]) {
  refuses("reviewer_list_invalid", () => checkDeployment({ ...prod, ...reviewers, FILUMIRE_REVIEWER_EMAILS: list }));
}
refuses("reviewer_mode_with_open_registration", () => checkDeployment({ ...prod, ...reviewers, FILUMIRE_ACCOUNT_REGISTRATION: "open" }));
refuses("reviewer_mode_with_external_identity", () => checkDeployment({ ...prod, ...reviewers, FILUMIRE_EXTERNAL_AUTH_ISSUER: "https://idp.example.test" }));

// ---- Guarded apply (test databases only)
const { checkTarget, planApply, approvalCode, DENIED_ENDPOINTS } = await import("../scripts/apply-migrations.mjs");
const testHost = "ep-fictional-test-a1b2c3.c-14.us-east-1.aws.neon.tech";
const testUrl = `postgresql://neondb_owner:fictional@${testHost}/neondb?sslmode=require`;
ok(() => assert.deepEqual(checkTarget(testUrl, testHost, "neondb"), { host: testHost, database: "neondb" }));
ok(() => assert.equal(checkTarget("postgresql://u:p@localhost/filumire_rehearsal_test", "localhost", "filumire_rehearsal_test").host, "localhost"));
for (const endpoint of DENIED_ENDPOINTS) {
  const host = `${endpoint}.c-14.us-east-1.aws.neon.tech`;
  refuses("denied_existing_endpoint", () => checkTarget(`postgresql://u:p@${host}/neondb?sslmode=require`, host, "neondb"));
  refuses("denied_existing_endpoint", () => checkTarget(`postgresql://u:p@${endpoint}-pooler.c-14.us-east-1.aws.neon.tech/neondb?sslmode=require`, `${endpoint}-pooler.c-14.us-east-1.aws.neon.tech`, "neondb"));
}
refuses("host_does_not_match_expected", () => checkTarget(testUrl, "ep-other.example.neon.tech", "neondb"));
refuses("database_does_not_match_expected", () => checkTarget(testUrl, testHost, "filumire_test"));
refuses("pooled_connection_not_allowed_for_ddl", () => checkTarget(testUrl.replace("-a1b2c3.", "-a1b2c3-pooler."), testHost.replace("-a1b2c3.", "-a1b2c3-pooler."), "neondb"));
refuses("tls_required", () => checkTarget(testUrl.replace("?sslmode=require", ""), testHost, "neondb"));
ok(() => assert.deepEqual(planApply(manifest, []), { needsBaseline: true, pending: ["0019_learner_accounts", "0020_auth_rate_limits", "0021_teacher_accounts", "0022_migration_ledger", "0023_learner_grade_set_by", "0024_deployment_migration_evidence"] }));
ok(() => {
  const through0022 = manifest.entries.slice(0, -2).map(e => row(e.id));
  assert.equal(manifest.entries.at(-1).id, "0024_deployment_migration_evidence");
  assert.deepEqual(compareLedger(manifest, through0022).pending, ["0023_learner_grade_set_by", "0024_deployment_migration_evidence"]);
  assert.deepEqual(planApply(manifest, through0022), { needsBaseline: false, pending: ["0023_learner_grade_set_by", "0024_deployment_migration_evidence"] });
});
ok(() => {
  const through0023 = manifest.entries.slice(0, -1).map(e => row(e.id));
  assert.deepEqual(planApply(manifest, through0023), { needsBaseline: false, pending: ["0024_deployment_migration_evidence"] });
});
ok(() => assert.deepEqual(planApply(manifest, manifest.entries.map(e => row(e.id))), { needsBaseline: false, pending: [] }));
refuses("ledger_drift:0019_learner_accounts", () => planApply(manifest, [row("baseline-0000-0018"), { id: "0019_learner_accounts", sha256: "f".repeat(64) }]));
refuses("ledger_out_of_order", () => planApply(manifest, [row("baseline-0000-0018"), row("0020_auth_rate_limits")]));
refuses("ledger_has_unknown_entries:0099_x", () => planApply(manifest, [row("baseline-0000-0018"), { id: "0099_x", sha256: "a".repeat(64) }]));
ok(() => {
  const target = { host: testHost, database: "neondb" }, plan = planApply(manifest, []), schema = "a".repeat(64);
  assert.match(approvalCode(target, plan, schema), /^[0-9a-f]{12}$/);
  assert.notEqual(approvalCode(target, plan, schema), approvalCode({ ...target, database: "other" }, plan, schema), "code is bound to the target");
  assert.notEqual(approvalCode(target, plan, schema), approvalCode(target, { ...plan, pending: plan.pending.slice(1) }, schema), "code is bound to the plan");
  assert.notEqual(approvalCode(target, plan, schema), approvalCode(target, plan, "b".repeat(64)), "code is bound to the current schema");
});

// Errors never echo the connection string.
ok(() => { try { checkDeployment({ ...prod, DATABASE_URL: `postgresql://neondb_owner:fictional-secret@${prodHost}/neondb` }); } catch (error) { assert(!String(error.message).includes("fictional-secret")); assert(error instanceof DeployGuardError); } });
ok(() => assert(new LedgerError("x") instanceof Error));

console.log(`PASS: integration phase 1 foundation — ${checks} checks (migration ledger, deployment guard)`);
