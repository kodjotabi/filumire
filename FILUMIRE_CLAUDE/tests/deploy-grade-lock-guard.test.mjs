// Offline only: inject every client; never import pg or connect to a database.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { verifyDeployment, DeployGuardError } from "../scripts/deploy-guard.mjs";
import { loadManifest } from "../scripts/migration-ledger.mjs";

const migration = loadManifest().entries.find(entry => entry.id === "0023_learner_grade_set_by");
const env = {
  VERCEL: "1", VERCEL_ENV: "preview", FILUMIRE_PERSISTENCE: "postgres",
  FILUMIRE_DB_HOSTS_PREVIEW: "preview.example.test",
  FILUMIRE_DB_HOSTS_PRODUCTION: "production.example.test",
  DATABASE_URL: "postgres://filumire_app:fictional@preview.example.test/filumire",
};
let checks = 0;
function fixture({ ledger = [{ kind: "migration", sha256: migration.sha256 }],
  column = true, constraint = true, failureAt, pgCode, connectFailure = false } = {}) {
  const calls = [];
  const client = {
    async connect() { calls.push("connect"); if (connectFailure) throw new Error("secret connection detail"); },
    async end() { calls.push("end"); },
    async query(text, values) {
      calls.push(text);
      if (failureAt && text.includes(failureAt)) throw Object.assign(new Error("secret database detail"), { code: pgCode });
      if (text.startsWith("SELECT kind")) {
        assert.deepEqual(values, [migration.id]);
        return { rows: ledger };
      }
      if (text.includes("pg_attribute")) return { rows: [{ column_ready: column, constraint_ready: constraint }] };
      return { rows: [] };
    },
  };
  return { calls, client, createClient: async url => { assert.equal(url, env.DATABASE_URL); return client; } };
}
async function refuses(options, code) {
  const f = fixture(options);
  await assert.rejects(() => verifyDeployment(env, f.createClient), error => {
    assert(error instanceof DeployGuardError);
    assert.equal(error.code, code);
    assert(!error.message.includes("secret"));
    return true;
  });
  assert.equal(f.calls.at(-2), "ROLLBACK");
  assert.equal(f.calls.at(-1), "end");
  checks++;
}

const success = fixture();
assert.equal((await verifyDeployment(env, success.createClient)).gradeLockSchema, "verified");
assert.deepEqual(success.calls.slice(0, 2), ["connect", "BEGIN READ ONLY"]);
assert.equal(success.calls.at(-2), "ROLLBACK");
assert.equal(success.calls.at(-1), "end");
assert(success.calls.every(call => /^(connect|end|BEGIN READ ONLY|SET LOCAL |SELECT\b|ROLLBACK)/.test(call)));
checks++;

await refuses({ ledger: [] }, "grade_lock_migration_0023_unverified");
await refuses({ ledger: [{ kind: "migration", sha256: "f".repeat(64) }] }, "grade_lock_migration_0023_unverified");
await refuses({ ledger: [{ kind: "baseline", sha256: migration.sha256 }] }, "grade_lock_migration_0023_unverified");
await refuses({ column: false }, "grade_lock_schema_incompatible");
await refuses({ constraint: false }, "grade_lock_schema_incompatible");
await refuses({ failureAt: "SELECT kind", pgCode: "42P01" }, "grade_lock_required_table_missing");
await refuses({ failureAt: 'SELECT "grade_set_by"', pgCode: "42P01" }, "grade_lock_required_table_missing");
await refuses({ failureAt: 'SELECT "grade_set_by"', pgCode: "42703" }, "grade_lock_required_column_missing");
await refuses({ failureAt: "SELECT kind", pgCode: "42501" }, "grade_lock_database_verification_failed");
await refuses({ failureAt: "pg_attribute", pgCode: "08006" }, "grade_lock_database_verification_failed");

const disconnected = fixture({ connectFailure: true });
await assert.rejects(() => verifyDeployment(env, disconnected.createClient));
assert.deepEqual(disconnected.calls, ["connect", "end"]);
checks++;

const noClient = () => { throw new Error("must refuse before connecting"); };
assert.equal((await verifyDeployment({}, noClient)).mode, "local");
assert.equal((await verifyDeployment({ VERCEL: "1", VERCEL_ENV: "preview" }, noClient)).persistence, "memory");
await assert.rejects(() => verifyDeployment({ ...env, FILUMIRE_DB_HOSTS_PREVIEW: "other.example.test" }, noClient),
  error => error.code === "database_host_not_allowed");
await assert.rejects(() => verifyDeployment({ ...env, DATABASE_URL: env.DATABASE_URL.replace("filumire_app", "postgres") }, noClient),
  error => error.code === "database_owner_role");
checks += 4;

// Production follows the same compatibility gate after existing SHA/branch checks.
const production = { ...env, VERCEL_ENV: "production", DATABASE_URL: env.DATABASE_URL.replace("preview.", "production."),
  VERCEL_GIT_COMMIT_SHA: "reviewed", FILUMIRE_APPROVED_PRODUCTION_SHA: "reviewed", VERCEL_GIT_COMMIT_REF: "main" };
const prodClient = fixture({ ledger: [] });
await assert.rejects(() => verifyDeployment(production, async url => {
  assert.equal(url, production.DATABASE_URL);
  return prodClient.client;
}), error => error.code === "grade_lock_migration_0023_unverified");
checks++;

const appPackage = JSON.parse(readFileSync(new URL("../apps/learner/package.json", import.meta.url)));
const rootPackage = JSON.parse(readFileSync(new URL("../package.json", import.meta.url)));
assert.equal(appPackage.scripts.build, "node ../../scripts/deploy-guard.mjs && next build");
assert(rootPackage.scripts.test.includes("test:integration-foundation"));
assert(rootPackage.scripts["test:integration-foundation"].includes("deploy-grade-lock-guard.test.mjs"));
assert(rootPackage.scripts["test:integration-foundation"].includes("test:grade-lock"));
assert(rootPackage.scripts["test:grade-lock"].includes("grade-lock-schema-guard.test.ts"));
checks++;
console.log(`PASS: deployment grade-lock guard — ${checks} offline checks`);
