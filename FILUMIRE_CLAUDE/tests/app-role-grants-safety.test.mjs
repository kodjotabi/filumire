// Offline only: fake clients and local temporary files. Never import pg or load env files.
import assert from "node:assert/strict";
import { readFileSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname, basename, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { fakeClient, manifest, profile } from "./helpers/w4-fake-client.mjs";
import { grantTarget, grantSql, dryRunGrants, executeGrants, APPROVED_SQL_SHA256 } from "../scripts/apply-app-role-grants.mjs";
import { reportCli, writeCredential, withClient } from "../scripts/w4-safety.mjs";

let checks = 0;
const ok = fn => { fn(); checks++; };
const options = { pin: "filumire-preview", url: `postgresql://neondb_owner:fictional@${profile.host}/neondb?sslmode=verify-full`, sqlHash: APPROVED_SQL_SHA256 };
const client = extra => fakeClient({ roleExists: true, others: "filumire_app", ...extra });
const refuses = (code, fn) => { assert.throws(fn, e => e.code === code); checks++; };
const rejected = async (code, c, opts = options, read) => {
  const output = [];
  assert.equal(await reportCli(() => executeGrants(c, manifest, opts, read), { emit: r => output.push(r) }), 1);
  assert(output[0].refused === code || output[0].reason === code, JSON.stringify(output));
  assert(!c.policySent); assert(!c.queries.includes("COMMIT")); checks++;
};

ok(() => assert.equal(grantTarget(options.url, options.pin).target.pinned, "filumire-preview"));
refuses("preview_pin_required", () => grantTarget(options.url));
refuses("preview_pin_required", () => grantTarget(options.url, "production"));
refuses("production_endpoint_never_allowed", () => grantTarget(options.url.replace(profile.endpoint, "ep-cold-bird-b8j437np"), options.pin));
refuses("pinned_host_mismatch", () => grantTarget(options.url.replace(profile.endpoint, "ep-fictional-other"), options.pin));
refuses("pinned_host_mismatch", () => grantTarget(options.url.replace(profile.endpoint, profile.endpoint + "-pooler"), options.pin));
refuses("database_does_not_match_expected", () => grantTarget(options.url.replace("/neondb?", "/other?"), options.pin));
refuses("owner_url_role_mismatch", () => grantTarget(options.url.replace("neondb_owner:", "other:"), options.pin));
refuses("tls_verify_full_required", () => grantTarget(options.url.replace("verify-full", "require"), options.pin));
refuses("tls_required", () => grantTarget(options.url.replace("verify-full", "disable"), options.pin));
for (const suffix of ["&options=-c%20role%3Dpostgres", "&host=other", "&service=other"]) {
  refuses("connection_override_not_allowed", () => grantTarget(options.url + suffix, options.pin));
}
refuses("sql_hash_not_approved", () => grantSql("0".repeat(64)));
refuses("grants_file_changed_after_review", () => grantSql(APPROVED_SQL_SHA256, () => "GRANT ALL ON SCHEMA public TO PUBLIC;"));
const body = grantSql(APPROVED_SQL_SHA256);
ok(() => {
  assert(!/^BEGIN;|^COMMIT;/m.test(body));
  assert(body.indexOf("Role filumire_app does not exist") < body.indexOf("REVOKE ALL"));
  assert(!/GRANT[^;]*ON[^;]*filumire_schema_migrations/i.test(body));
  assert(body.includes("GRANT SELECT ON public.filumire_deployment_migration_0023 TO filumire_app;"));
});

const dry = client();
const report = await dryRunGrants(dry, manifest, options);
ok(() => {
  assert.equal(report.mode, "dry-run"); assert.match(report.approvalCode, /^[a-f0-9]{12}$/);
  assert.equal(dry.queries[0], "SET SESSION"); assert(!dry.policySent);
  assert(!dry.queries.includes("BEGIN") && !dry.queries.includes("COMMIT"));
});
const approved = { ...options, approval: report.approvalCode };
{
  const c = client();
  const result = await executeGrants(c, manifest, approved);
  assert.equal(result.granted, "filumire_app");
  assert.equal(c.sql[0], "BEGIN"); assert.equal(c.sql.at(-1), "COMMIT");
  assert.equal(c.sql.filter(s => s === body).length, 1);
  assert(c.sql.indexOf(body) > c.sql.indexOf("SET LOCAL search_path = pg_catalog, public")); checks++;
}
await rejected("approval_code_does_not_match", client(), { ...approved, approval: "not-approved" });
for (const [key, value, code] of [
  ["db", "other", "pinned_identity_mismatch:database"],
  ["usr", "other", "pinned_identity_mismatch:role"],
  ["su", true, "pinned_identity_mismatch:superuser"],
  ["tl", "other", "pinned_identity_mismatch:timeline"],
]) {
  const c = client(); c.identity = { ...c.identity, [key]: value }; await rejected("w4_transaction_failed", c, approved);
  // No policy statement may follow a failed identity check.
  assert(!c.policySent, code);
}
await rejected("role_missing", client({ roleExists: false }), approved);
await rejected("role_attributes_unexpected", client({ role: { ...client().role, rolsuper: true } }), approved);
await rejected("role_has_memberships", client({ memberships: 1 }), approved);
await rejected("other_filumire_roles_present", client({ others: "filumire_app,filumire_other" }), approved);
await rejected("public_tables_differ_from_grant_matrix", client({ tables: [...client().tables, "unexpected"] }), approved);
await rejected("ledger_not_complete_and_consistent", client({ ledger: [] }), approved);
for (const key of ["publicTableGrants", "publicViewGrants", "publicColumnGrants", "publicSequenceGrants"]) {
  await rejected("public_has_relation_or_column_grants", client({ [key]: 1 }), approved);
}
await rejected("evidence_view_not_reviewed_definition", client({ viewMissing: true }), approved);
await rejected("evidence_view_not_reviewed_definition", client({ viewTrusted: false }), approved);
await rejected("evidence_view_not_reviewed_definition", client({ viewDefinition: " SELECT * FROM filumire_schema_migrations;" }), approved);
{
  // The file changes AFTER preflight. Rechecking just before query must refuse it.
  let reads = 0;
  const original = readFileSync(new URL("../scripts/sql/app-role-grants.sql", import.meta.url), "utf8");
  await rejected("grants_file_changed_after_review", client(), approved, () => ++reads === 1 ? original : original + "--changed");
  assert.equal(reads, 2);
}
{
  const c = client({ failPolicy: true }), output = [];
  assert.equal(await reportCli(() => executeGrants(c, manifest, approved), { emit: r => output.push(r) }), 1);
  assert.equal(output[0].outcome, "rolled_back"); assert.equal(c.sql.at(-1), "ROLLBACK");
  assert(!c.sql.includes("COMMIT")); checks++;
}
for (const failCommit of ["before", "after"]) {
  const c = client({ failCommit }), output = [];
  assert.equal(await reportCli(() => executeGrants(c, manifest, approved), { emit: r => output.push(r) }), 1);
  assert.equal(output[0].refused, "transaction_outcome_unknown");
  assert.equal(output[0].rolledBack, false); assert(!c.sql.includes("ROLLBACK")); checks++;
}
{
  const c = client({ commitResult: "ROLLBACK" }), output = [];
  assert.equal(await reportCli(() => executeGrants(c, manifest, approved), { emit: r => output.push(r) }), 1);
  assert.equal(output[0].refused, "w4_transaction_failed");
  assert.equal(output[0].reason, "commit_rolled_back");
  assert.equal(output[0].outcome, "rolled_back");
  assert(!c.sql.includes("ROLLBACK")); checks++;
}
{
  const c = client({ failPolicy: true, failRollback: true }), output = [];
  assert.equal(await reportCli(() => executeGrants(c, manifest, approved), { emit: r => output.push(r) }), 1);
  assert.equal(output[0].outcome, "unknown"); checks++;
}
{
  const c = { on: () => c, connect: async () => {}, end: async () => { throw new Error("private connection details"); } }, output = [];
  assert.equal(await reportCli(() => withClient(c, async () => ({ mode: "execute" })), { emit: r => output.push(r) }), 1);
  assert.equal(output[0].refused, "connection_cleanup_failed"); assert.equal(output[0].outcome, "committed");
  assert(!JSON.stringify(output).includes("private connection")); checks++;
}

// Exercise exclusive credential-file creation on disk with fictional text, never a real URL.
const dir = mkdtempSync(join(tmpdir(), "filumire-w4-offline-"));
try {
  const path = join(dir, ".env.fictional.local"); let created = false;
  await writeCredential(path, "FICTIONAL=test-only\n", () => { created = true; });
  assert(created); assert.equal(readFileSync(path, "utf8"), "FICTIONAL=test-only\n");
  await assert.rejects(() => writeCredential(path, "overwrite", () => { throw new Error("must not run"); }), e => e.code === "EEXIST" || e.code === "windows_credential_protection_failed");
  assert.equal(readFileSync(path, "utf8"), "FICTIONAL=test-only\n"); checks++;
} finally {
  assert.equal(dirname(resolve(dir)), resolve(tmpdir()));
  assert(basename(dir).startsWith("filumire-w4-offline-"));
  rmSync(dir, { recursive: true, force: true });
}

// Real process boundary, but no URL, env file or pg connection: missing pin/URL refuses first.
for (const file of ["create-app-role.mjs", "apply-app-role-grants.mjs"]) {
  const result = spawnSync(process.execPath, [fileURLToPath(new URL("../scripts/" + file, import.meta.url))], {
    encoding: "utf8", env: { SystemRoot: process.env.SystemRoot, PATH: process.env.PATH }, timeout: 10000,
  });
  assert.equal(result.error, undefined); assert.equal(result.status, 1);
  assert(JSON.parse(result.stdout).refused); assert(!result.stdout.includes("postgresql://")); checks++;
}
console.log(`PASS: W4 grants and failure safety - ${checks} offline checks`);
