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
ok(() => assert.equal(verifyManifest(manifest), 5));
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
  assert.deepEqual(fresh.applied, []); assert.equal(fresh.pending.length, 5); assert.equal(fresh.consistent, true);
});
ok(() => {
  const partial = compareLedger(manifest, [row("baseline-0000-0018"), row("0019_learner_accounts")]);
  assert.deepEqual(partial.pending, ["0020_auth_rate_limits", "0021_teacher_accounts", "0022_migration_ledger"]); assert.equal(partial.consistent, true);
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

// Errors never echo the connection string.
ok(() => { try { checkDeployment({ ...prod, DATABASE_URL: `postgresql://neondb_owner:fictional-secret@${prodHost}/neondb` }); } catch (error) { assert(!String(error.message).includes("fictional-secret")); assert(error instanceof DeployGuardError); } });
ok(() => assert(new LedgerError("x") instanceof Error));

console.log(`PASS: integration phase 1 foundation — ${checks} checks (migration ledger, deployment guard)`);
