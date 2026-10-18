// W4: guarded filumire_app creation. No database, network or Vercel access: runs against a scripted fake client,
// with injected randomness and file writes.
import assert from "node:assert/strict";
import pg from "pg"; // Exercise installed driver's result/error handling without connecting.
import { createHash } from "node:crypto";
import { loadManifest } from "../scripts/migration-ledger.mjs";
import { checkTarget } from "../scripts/apply-migrations.mjs";
import { pinnedTarget, IDENTITY_SQL } from "../scripts/pinned-targets.mjs";
import { APP_ROLE_MATRIX } from "../scripts/test-app-role-permissions.mjs";
import { catalogHash } from "../scripts/catalog-snapshot.mjs";
import pgConnectionString from "pg-connection-string";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { newPassword, checkTlsConfig, checkVerifiedTls, PASSWORD_TRANSMISSION, redact, appUrl, checkOutput, approvalCode, dryRun, execute, ROLE_ATTRIBUTES, RoleError } from "../scripts/create-app-role.mjs";
import { fakeClient, verifiedStream } from "./helpers/w4-fake-client.mjs";
import { PUBLIC_ACCESS_SQL, reportCli, withClient, W4Error, CREDENTIAL_POLICY_VERSION } from "../scripts/w4-safety.mjs";

let checks = 0;
const ok = fn => { fn(); checks++; };
const refuses = (code, fn) => { assert.throws(fn, error => error.code === code, code); checks++; };
const rejects = async (code, fn) => { await assert.rejects(fn, error => error.code === code || error.details?.reason === code, code); checks++; };

const manifest = loadManifest();
const profile = pinnedTarget("filumire-preview");
const PREVIEW = profile.host;
const OWNER_URL = `postgresql://neondb_owner:fictional-owner@${PREVIEW}/neondb?sslmode=require&channel_binding=require`;
const target = checkTarget(OWNER_URL, PREVIEW, "neondb", profile);
const LEDGER = manifest.entries.map(e => ({ id: e.id, kind: e.kind, sha256: e.sha256 ?? "b".repeat(64) }));
const TABLES = Object.keys(APP_ROLE_MATRIX).sort();
const output = { envOut: "/fictional/.env.preview-app.local", varName: "FILUMIRE_PREVIEW_APP_URL", ownerUrl: OWNER_URL };

// ---- Password: 256 bits, base64url only (safe inside a SQL literal without escaping)
ok(() => assert.equal(newPassword(n => Buffer.alloc(n, 0xff)), "_".repeat(42) + "8"));
ok(() => { for (let i = 0; i < 200; i++) assert.match(newPassword(n => Buffer.from(Array.from({ length: n }, () => Math.floor(Math.random() * 256)))), /^[A-Za-z0-9_-]{43}$/); });
refuses("password_malformed", () => newPassword(n => Buffer.alloc(n - 1)));

// ---- Plaintext only over a verified TLS socket (pg's connection.stream after SSL negotiation)
ok(() => checkVerifiedTls({ connection: { stream: verifiedStream(PREVIEW) } }, PREVIEW));
ok(() => checkVerifiedTls({ connection: { stream: verifiedStream("*.c-14.us-east-1.aws.neon.tech") } }, PREVIEW));
for (const stream of [undefined, {}, { encrypted: true }, verifiedStream(PREVIEW, false), { authorized: true }]) {
  refuses("tls_not_verified", () => checkVerifiedTls({ connection: { stream } }, PREVIEW));
}
refuses("tls_not_verified", () => checkVerifiedTls({}, PREVIEW));
// CA-authorized but for another host, no certificate, or no expected host: hostname not verified.
for (const stream of [verifiedStream("attacker.example"), verifiedStream("ep-other.c-14.us-east-1.aws.neon.tech"),
  { encrypted: true, authorized: true }, { encrypted: true, authorized: true, getPeerCertificate: () => ({}) }]) {
  refuses("tls_hostname_not_verified", () => checkVerifiedTls({ connection: { stream } }, PREVIEW));
}
refuses("tls_hostname_not_verified", () => checkVerifiedTls({ connection: { stream: verifiedStream(PREVIEW) } }, undefined));

refuses("tls_hostname_check_disabled", () => checkTlsConfig(`${OWNER_URL}&uselibpqcompat=false`));
refuses("tls_hostname_check_disabled", () => checkTlsConfig(OWNER_URL.replace("sslmode=require", "sslmode=verify-ca")));
ok(() => { checkTlsConfig(OWNER_URL); checkTlsConfig(OWNER_URL.replace("sslmode=require", "sslmode=verify-full")); });
const tlsBypassRegression = async () => {
  const dir = mkdtempSync(join(tmpdir(), "filumire-w4-tls-")), ca = join(dir, "fictional-ca.pem");
  writeFileSync(ca, "fictional CA, never used for a connection\n");
  try {
    for (const query of [`sslmode=verify-ca&uselibpqcompat=true&sslrootcert=${encodeURIComponent(ca)}`,
      `sslmode=require&uselibpqcompat=true&sslrootcert=${encodeURIComponent(ca)}`]) {
      const bypass = `postgresql://neondb_owner:fictional-owner@${PREVIEW}/neondb?${query}`;
      const parsed = pgConnectionString.parse(bypass);
      assert.equal(parsed.ssl.checkServerIdentity("attacker.example", {}), undefined, "parser disables hostname check");
      ok(() => checkTarget(bypass, PREVIEW, "neondb", profile)); // the target gate alone accepts it
      refuses("tls_hostname_check_disabled", () => checkTlsConfig(bypass));
      const client = fakeClient({ connection: { stream: verifiedStream("attacker.example") } }), f = files();
      await rejects("tls_hostname_check_disabled", () => execute(client, manifest, target, code, profile, { ...output, ownerUrl: bypass }, f.io));
      await rejects("tls_hostname_not_verified", () => execute(client, manifest, target, code, profile, output, f.io));
      assert.deepEqual(client.queries, []); assert.deepEqual(f.written, {}); checks++;
    }
  } finally { rmSync(dir, { recursive: true, force: true }); }
};

// ---- Output hygiene
ok(() => assert.equal(redact("bad SCRAM-SHA-256$4096:abc$def:ghi near postgresql://u:p@h/db x"), "bad <verifier> near <url> x"));
ok(() => {
  const url = new URL(appUrl(OWNER_URL, "s3cret-_pw"));
  assert.deepEqual([url.username, url.password, url.hostname, url.pathname, url.searchParams.get("sslmode"), url.searchParams.has("channel_binding")],
    ["filumire_app", "s3cret-_pw", PREVIEW, "/neondb", "verify-full", false]);
});
ok(() => checkOutput("C:/x/.env.preview-app.local", "FILUMIRE_PREVIEW_APP_URL"));
refuses("env_out_must_be_dotenv_local", () => checkOutput("C:/x/.env", "FILUMIRE_PREVIEW_APP_URL"));
refuses("env_out_must_be_dotenv_local", () => checkOutput("C:/x/app.env.local", "FILUMIRE_PREVIEW_APP_URL"));
refuses("env_out_must_be_dotenv_local", () => checkOutput(undefined, "FILUMIRE_PREVIEW_APP_URL"));
refuses("app_url_var_invalid", () => checkOutput("C:/x/.env.preview-app.local", "FILUMIRE_PREVIEW_OWNER_URL"));
refuses("app_url_var_invalid", () => checkOutput("C:/x/.env.preview-app.local", "FLPREVIEW_DATABASE_URL"));
refuses("app_url_var_invalid", () => checkOutput("C:/x/.env.preview-app.local", "bad name"));

// ---- Target gate is apply-migrations' (production never, preview only when pinned)
refuses("production_endpoint_never_allowed", () => checkTarget(OWNER_URL.replace(PREVIEW, "ep-cold-bird-b8j437np.c-14.us-east-1.aws.neon.tech"), "ep-cold-bird-b8j437np.c-14.us-east-1.aws.neon.tech", "neondb", profile));
refuses("denied_existing_endpoint", () => checkTarget(OWNER_URL, PREVIEW, "neondb"));

// ---- Fake client: post-W3 filumire-preview
const files = () => { const f = { written: {}, removed: [] }; f.io = { random: n => Buffer.alloc(n, 7), write: (p, t, created) => { created(); f.written[p] = t; }, remove: p => f.removed.push(p) }; return f; };
const observed = { timelineId: profile.timelineId, ledger: LEDGER.map(r => r.id), tables: 29, schemaSha256: catalogHash({ tables: [], columns: [], constraints: [], indexes: [] }) };
const code = approvalCode(target, observed);
ok(() => assert.equal(TABLES.length, 29));
// Credential-policy changes invalidate pre-security-fix approval codes.
const oldCode = createHash("sha256").update(JSON.stringify([
  target.host, target.database, observed.timelineId, observed.ledger, observed.schemaSha256, "create filumire_app",
])).digest("hex").slice(0, 12);
// Verifier-era codes (before the switch to plaintext over TLS) are refused too.
const verifierCode = createHash("sha256").update(JSON.stringify([
  target.host, target.database, observed.timelineId, observed.ledger, observed.schemaSha256, "create filumire_app", CREDENTIAL_POLICY_VERSION,
])).digest("hex").slice(0, 12);
ok(() => { assert.notEqual(code, oldCode); assert.notEqual(code, verifierCode); assert.equal(PASSWORD_TRANSMISSION, "plaintext-over-verified-tls-v1"); });
for (const stale of [oldCode, verifierCode]) {
  await rejects("approval_code_does_not_match", () => execute(fakeClient(), manifest, target, stale, profile, output, files().io));
}

// Regression (reported bypass): pg 8.23 libpq-compat verify-ca (or require) with sslrootcert disables hostname
// checks while `authorized` stays true. Proven against the installed parser, then refused at the URL and the socket.
await tlsBypassRegression();

// Dry run: read-only session, every pre-flight passes, no role statement.
{
  const client = fakeClient();
  const report = await dryRun(client, manifest, target, profile);
  assert.equal(client.queries[0], "SET SESSION");
  assert.equal(report.approvalCode, code);
  assert.equal(report.passwordTransmission, PASSWORD_TRANSMISSION);
  assert.deepEqual([report.tables, report.ledger.length, report.attributes], [29, 7, ROLE_ATTRIBUTES]);
  assert(!client.queries.some(q => q.startsWith("CREATE"))); checks++;
}
// Pre-flight refusals.
await rejects("pinned_identity_mismatch:timeline", () => dryRun(fakeClient({ identity: { db: "neondb", usr: "neondb_owner", su: false, tl: "e2d7091317290be4027c8d4057d0e31b" } }), manifest, target, profile));
await rejects("owner_cannot_create_roles", () => dryRun(fakeClient({ createrole: false }), manifest, target, profile));
await rejects("ledger_not_complete_and_consistent", () => dryRun(fakeClient({ ledger: LEDGER.slice(0, 6) }), manifest, target, profile));
await rejects("ledger_not_complete_and_consistent", () => dryRun(fakeClient({ ledger: [...LEDGER, { id: "0099_unknown", kind: "migration", sha256: "0".repeat(64) }] }), manifest, target, profile));
await rejects("public_tables_differ_from_grant_matrix", () => dryRun(fakeClient({ tables: [...TABLES, "new_table"].sort() }), manifest, target, profile));
await rejects("role_already_exists", () => dryRun(fakeClient({ roleExists: true }), manifest, target, profile));
await rejects("other_filumire_roles_present", () => dryRun(fakeClient({ others: "filumire_dev_owner" }), manifest, target, profile));
await rejects("password_encryption_not_scram", () => dryRun(fakeClient({ passwordEncryption: "md5" }), manifest, target, profile));
for (const kind of ["publicTableGrants", "publicViewGrants", "publicColumnGrants", "publicSequenceGrants"]) {
  await rejects("public_has_relation_or_column_grants", () => dryRun(fakeClient({ [kind]: 1 }), manifest, target, profile));
}
ok(() => {
  assert(!PUBLIC_ACCESS_SQL.includes("role_table_grants"));
  assert(PUBLIC_ACCESS_SQL.includes("aclexplode") && PUBLIC_ACCESS_SQL.includes("acldefault"));
  assert(PUBLIC_ACCESS_SQL.includes("a.grantee = 0") && PUBLIC_ACCESS_SQL.includes("col.attacl"));
});

// Happy path: one transaction, plaintext (Neon needs it), env file written before COMMIT, nothing secret returned.
const PASSWORD = Buffer.alloc(32, 7).toString("base64url");
{
  const client = fakeClient(), f = files();
  const result = await execute(client, manifest, target, code, profile, output, f.io);
  assert.equal(client.queries[0], "BEGIN");
  assert.equal(client.queries[1], "SET LOCAL");
  assert.equal(client.queries.at(-1), "COMMIT");
  assert.equal(client.roleCreated, `CREATE ROLE filumire_app ${ROLE_ATTRIBUTES} CONNECTION LIMIT 20 PASSWORD '${PASSWORD}'`);
  assert(!client.roleCreated.includes("SCRAM-SHA-256$"), "no precomputed verifier");
  assert(client.sql.indexOf("select current_setting('password_encryption') pe") < client.sql.indexOf(client.roleCreated));
  assert.equal(client.sql.filter(q => q.includes(PASSWORD)).length, 1, "password sent exactly once");
  assert.deepEqual(f.written, { [output.envOut]: `FILUMIRE_PREVIEW_APP_URL=${appUrl(OWNER_URL, PASSWORD)}\n` });
  assert(!JSON.stringify(result).includes(PASSWORD));
  assert.equal(result.passwordTransmission, PASSWORD_TRANSMISSION);
  assert.equal(result.created, "filumire_app"); checks++;
}
// Unverified or absent TLS: refused before BEGIN, nothing sent, no file.
for (const stream of [{ encrypted: true, authorized: false }, { encrypted: false }, undefined]) {
  const client = fakeClient({ connection: { stream } }), f = files();
  await rejects("tls_not_verified", () => execute(client, manifest, target, code, profile, output, f.io));
  assert.deepEqual(client.queries, []); assert.deepEqual(f.written, {}); checks++;
}
// Server would not hash as SCRAM: rolled back before the password is generated or sent.
{
  const client = fakeClient({ passwordEncryption: "md5" }), f = files();
  await rejects("password_encryption_not_scram", () => execute(client, manifest, target, code, profile, output, f.io));
  assert.equal(client.roleCreated, null); assert(!client.sql.some(q => q.includes(PASSWORD)));
  assert.equal(client.queries.at(-1), "ROLLBACK"); assert.deepEqual(f.written, {}); checks++;
}
// Neon rejects CREATE ROLE with a driver error that echoes the statement: nothing of it reaches output.
{
  const client = fakeClient(), query = client.query, f = files(), emitted = [];
  client.query = async (sql, params) => {
    if (sql.startsWith("CREATE ROLE")) throw Object.assign(new pg.DatabaseError(`fictional rejection of ${sql}`, 0, "error"), { code: "XX000", detail: sql });
    return query(sql, params);
  };
  assert.equal(await reportCli(() => execute(client, manifest, target, code, profile, output, f.io), { emit: r => emitted.push(r) }), 1);
  assert.deepEqual(emitted, [{ refused: "w4_transaction_failed", outcome: "rolled_back", rolledBack: true,
    credentialRetained: false, envFileRemoved: false, cleanupFailed: false }]);
  assert(!JSON.stringify(emitted).includes(PASSWORD)); assert.deepEqual(f.written, {}); checks++;
}
// Neon rejects at COMMIT (the observed XX000 case): outcome unknown, credential kept, password never output.
{
  const client = fakeClient(), query = client.query, f = files(), emitted = [];
  client.query = async (sql, params) => sql === "COMMIT"
    ? Promise.reject(Object.assign(new pg.DatabaseError("fictional HTTP 400: plaintext password required", 0, "error"), { code: "XX000" }))
    : query(sql, params);
  assert.equal(await reportCli(() => execute(client, manifest, target, code, profile, output, f.io), { emit: r => emitted.push(r) }), 1);
  assert.equal(emitted[0].refused, "transaction_outcome_unknown"); assert.equal(emitted[0].credentialRetained, true);
  assert(!JSON.stringify(emitted).includes(PASSWORD) && !JSON.stringify(emitted).includes("HTTP 400")); checks++;
}
// Wrong approval code: rolled back, no role, no file.
{
  const client = fakeClient(), f = files();
  await rejects("approval_code_does_not_match", () => execute(client, manifest, target, "000000000000", profile, output, f.io));
  assert.equal(client.roleCreated, null); assert.deepEqual(f.written, {}); assert.equal(client.queries.at(-1), "ROLLBACK"); checks++;
}
// Database changed since the dry run (a table appeared): refused before CREATE ROLE.
{
  const client = fakeClient({ tables: [...TABLES, "z_new"].sort() }), f = files();
  await rejects("public_tables_differ_from_grant_matrix", () => execute(client, manifest, target, code, profile, output, f.io));
  assert.equal(client.roleCreated, null); checks++;
}
// Neon rejects the role (e.g. password policy): rolled back, no file, error redacted.
{
  const client = fakeClient({ failCreate: "password rejected" }), f = files();
  await rejects("w4_transaction_failed", () => execute(client, manifest, target, code, profile, output, f.io));
  assert.deepEqual(f.written, {}); assert.equal(client.queries.at(-1), "ROLLBACK"); checks++;
}
// The created role is not what was asked for: rolled back before the file is written.
{
  const client = fakeClient({ role: { ...fakeClient().role, rolinherit: true } }), f = files();
  await rejects("role_attributes_unexpected", () => execute(client, manifest, target, code, profile, output, f.io));
  assert.deepEqual(f.written, {}); assert.equal(client.queries.at(-1), "ROLLBACK"); checks++;
}
{
  const client = fakeClient({ memberships: 1 }), f = files();
  await rejects("role_has_memberships", () => execute(client, manifest, target, code, profile, output, f.io));
  assert.deepEqual(f.written, {}); checks++;
}
// Loss before OR after server COMMIT: neither is a confirmed rollback. Keep credentials.
for (const failCommit of ["before", "after"]) {
  const client = fakeClient({ failCommit }), f = files(), emitted = [];
  assert.equal(await reportCli(() => execute(client, manifest, target, code, profile, output, f.io), { emit: r => emitted.push(r) }), 1);
  assert.equal(emitted[0].refused, "transaction_outcome_unknown");
  assert.equal(emitted[0].rolledBack, false); assert.equal(emitted[0].credentialRetained, true);
  assert.deepEqual(f.removed, []); assert(f.written[output.envOut]);
  assert(!client.queries.includes("ROLLBACK"));
  assert.equal(client.serverCommitted, failCommit === "after"); checks++;
}
{
  const client = fakeClient({ commitResult: "ROLLBACK" }), f = files();
  const emitted = [];
  assert.equal(await reportCli(() => execute(client, manifest, target, code, profile, output, f.io), { emit: r => emitted.push(r) }), 1);
  assert.equal(emitted[0].refused, "w4_transaction_failed");
  assert.equal(emitted[0].reason, "commit_rolled_back");
  assert.equal(emitted[0].outcome, "rolled_back");
  assert.equal(emitted[0].credentialRetained, false);
  assert.deepEqual(f.removed, [output.envOut]);
  assert(!client.queries.includes("ROLLBACK")); checks++;
}
// A missing/unrecognized acknowledgment remains unknown, never grounds for cleanup.
for (const commitResult of [undefined, "UNEXPECTED"]) {
  const client = fakeClient({ commitResult }), f = files();
  await rejects("transaction_outcome_unknown", () => execute(client, manifest, target, code, profile, output, f.io));
  assert.deepEqual(f.removed, []); assert(!client.queries.includes("ROLLBACK")); checks++;
}
// Use pg's actual Query handlers with fabricated protocol events: no socket/client/file.
const pgCommit = ({ tag, error }) => new Promise((resolve, reject) => {
  const query = new pg.Query("COMMIT", (err, result) => err ? reject(err) : resolve(result));
  if (error) query.handleError(error, {});
  else { query.handleCommandComplete({ text: tag }, {}); query.handleReadyForQuery({}); }
});
{
  assert.equal((await pgCommit({ tag: "ROLLBACK" })).command, "ROLLBACK");
  assert.equal((await pgCommit({ tag: "COMMIT" })).command, "COMMIT"); checks++;
}
// A server ErrorResponse and transport loss collapse to the SAME original sanitized output.
// The saved report alone cannot identify the historical cause. Never infer rollback here.
{
  const serverError = new pg.DatabaseError("fictional server detail", 0, "error");
  serverError.code = "40001";
  const transportError = new Error("fictional connection detail");
  const reports = [];
  for (const error of [serverError, transportError]) {
    const client = fakeClient(), query = client.query, f = files(), emitted = [];
    client.query = async (sql, params) => sql === "COMMIT" ? pgCommit({ error }) : query(sql, params);
    assert.equal(await reportCli(() => execute(client, manifest, target, code, profile, output, f.io), { emit: r => emitted.push(r) }), 1);
    reports.push(emitted[0]);
    assert.deepEqual(f.removed, []); assert(!client.queries.includes("ROLLBACK"));
  }
  assert.deepEqual(reports[0], reports[1]);
  assert.deepEqual(reports[0], { refused: "transaction_outcome_unknown", outcome: "unknown", rolledBack: false,
    credentialRetained: true, envFileRemoved: false, cleanupFailed: false }); checks++;
}
// Cleanup errors after an explicit rollback remain nonzero and retain the warning.
{
  const client = fakeClient({ commitResult: "ROLLBACK" }), f = files(), emitted = [];
  f.io.remove = () => { throw new Error("fictional private cleanup detail"); };
  assert.equal(await reportCli(() => execute(client, manifest, target, code, profile, output, f.io), { emit: r => emitted.push(r) }), 1);
  assert.equal(emitted[0].refused, "credential_cleanup_failed");
  assert.equal(emitted[0].rolledBack, true); assert.equal(emitted[0].credentialRetained, true);
  assert(!JSON.stringify(emitted).includes("private cleanup")); checks++;
}
// The env file already exists (write refuses): rolled back, the existing file is left alone.
{
  const client = fakeClient(), f = files();
  f.io.write = () => { throw Object.assign(new Error("EEXIST: file already exists"), { code: "EEXIST" }); };
  await assert.rejects(() => execute(client, manifest, target, code, profile, output, f.io), e => e.details.rolledBack && !e.details.envFileRemoved);
  assert.deepEqual(f.removed, []); checks++;
}
// Partial write, cleanup failure and rollback failure remain visible and never leak messages.
for (const failRollback of [false, true]) {
  const client = fakeClient({ failRollback }), f = files(), emitted = [];
  f.io.write = (p, t, created) => { created(); f.written[p] = t; throw new Error("fictional secret write failure"); };
  assert.equal(await reportCli(() => execute(client, manifest, target, code, profile, output, f.io), { emit: r => emitted.push(r) }), 1);
  assert.equal(emitted[0].rolledBack, !failRollback);
  assert.equal(emitted[0].credentialRetained, failRollback);
  assert.equal(f.removed.length, failRollback ? 0 : 1);
  assert(!JSON.stringify(emitted).includes("fictional secret")); checks++;
}
{
  const client = fakeClient(), f = files(), emitted = [];
  f.io.write = (p, t, created) => { created(); throw new Error("write failure"); };
  f.io.remove = () => { throw new Error("secret filesystem details"); };
  assert.equal(await reportCli(() => execute(client, manifest, target, code, profile, output, f.io), { emit: r => emitted.push(r) }), 1);
  assert.equal(emitted[0].refused, "credential_cleanup_failed");
  assert.equal(emitted[0].cleanupFailed, true); assert.equal(emitted[0].envFileRemoved, false);
  assert.equal(emitted[0].credentialRetained, true); assert(!JSON.stringify(emitted).includes("secret filesystem")); checks++;
}
{
  const client = fakeClient({ failCommit: "after" }), f = files(), emitted = [];
  client.connect = async () => {}; client.end = async () => { throw new Error("secret teardown details"); };
  assert.equal(await reportCli(() => withClient(client, () => execute(client, manifest, target, code, profile, output, f.io)), { emit: r => emitted.push(r) }), 1);
  assert.equal(emitted[0].refused, "transaction_outcome_unknown");
  assert.equal(emitted[0].connectionCleanupFailed, true); assert.equal(emitted[0].credentialRetained, true); checks++;
}
{
  const emitted = [];
  assert.equal(await reportCli(async () => { throw new Error("unredacted-secret"); }, { emit: r => emitted.push(r) }), 1);
  assert.deepEqual(emitted, [{ refused: "w4_operation_failed" }]); checks++;
}
// Bad output settings are refused before BEGIN.
{
  const client = fakeClient();
  await rejects("env_out_must_be_dotenv_local", () => execute(client, manifest, target, code, profile, { ...output, envOut: "/x/.env" }, files().io));
  assert.deepEqual(client.queries, []); checks++;
}
ok(() => assert(new RoleError("x") instanceof Error));

console.log(`PASS: filumire_app creation — ${checks} checks (pre-flight, verified TLS, server SCRAM, plaintext never output, env file before COMMIT, fail-closed)`);
