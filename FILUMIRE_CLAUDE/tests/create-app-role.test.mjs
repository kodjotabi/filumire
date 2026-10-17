// W4: guarded filumire_app creation. No database, network or Vercel access: runs against a scripted fake client,
// with injected randomness and file writes.
import assert from "node:assert/strict";
import { createHash, createHmac } from "node:crypto";
import { loadManifest } from "../scripts/migration-ledger.mjs";
import { checkTarget } from "../scripts/apply-migrations.mjs";
import { pinnedTarget, IDENTITY_SQL } from "../scripts/pinned-targets.mjs";
import { APP_ROLE_MATRIX } from "../scripts/test-app-role-permissions.mjs";
import { catalogHash } from "../scripts/catalog-snapshot.mjs";
import { scramKeys, scramVerifier, redact, appUrl, checkOutput, approvalCode, dryRun, execute, ROLE_ATTRIBUTES, RoleError } from "../scripts/create-app-role.mjs";

let checks = 0;
const ok = fn => { fn(); checks++; };
const refuses = (code, fn) => { assert.throws(fn, error => error.code === code, code); checks++; };
const rejects = async (code, fn) => { await assert.rejects(fn, error => error.code === code, code); checks++; };

const manifest = loadManifest();
const profile = pinnedTarget("filumire-preview");
const PREVIEW = profile.host;
const OWNER_URL = `postgresql://neondb_owner:fictional-owner@${PREVIEW}/neondb?sslmode=require&channel_binding=require`;
const target = checkTarget(OWNER_URL, PREVIEW, "neondb", profile);
const LEDGER = manifest.entries.map(e => ({ id: e.id, kind: e.kind, sha256: e.sha256 ?? "b".repeat(64) }));
const TABLES = Object.keys(APP_ROLE_MATRIX).sort();
const output = { envOut: "/fictional/.env.preview-app.local", varName: "FILUMIRE_PREVIEW_APP_URL", ownerUrl: OWNER_URL };

// ---- SCRAM-SHA-256 against RFC 7677's published exchange (user "user", password "pencil")
ok(() => {
  const { clientKey, storedKey, serverKey } = scramKeys("pencil", Buffer.from("W22ZaJ0SNY7soEsUEjb6gQ==", "base64"), 4096);
  const nonce = "rOprNGfwEbeRWgbNEkqO%hvYDpWUa2RaTCAfuxFIlj)hNlF$k0";
  const authMessage = `n=user,r=rOprNGfwEbeRWgbNEkqO,r=${nonce},s=W22ZaJ0SNY7soEsUEjb6gQ==,i=4096,c=biws,r=${nonce}`;
  const signature = createHmac("sha256", storedKey).update(authMessage).digest();
  const proof = Buffer.from(clientKey.map((byte, i) => byte ^ signature[i]));
  assert.equal(proof.toString("base64"), "dHzbZapWIk4jUhN+Ute9ytag9zjfMHgsqmmiz7AndVQ=");
  assert.equal(createHmac("sha256", serverKey).update(authMessage).digest("base64"), "6rriTRBi23WpRR/wtup+mMhUZUn/dB5nLTJRsjl95G4=");
  assert.deepEqual(createHash("sha256").update(clientKey).digest(), storedKey);
});
ok(() => assert.match(scramVerifier("pencil", Buffer.from("W22ZaJ0SNY7soEsUEjb6gQ==", "base64")), /^SCRAM-SHA-256\$4096:W22ZaJ0SNY7soEsUEjb6gQ==\$[A-Za-z0-9+/=]{44}:[A-Za-z0-9+/=]{44}$/));
refuses("password_not_printable_ascii", () => scramKeys("pässword", Buffer.alloc(16)));
refuses("password_not_printable_ascii", () => scramKeys("with space", Buffer.alloc(16)));

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
function fakeClient(overrides = {}) {
  const s = { queries: [], roleCreated: null, ledger: LEDGER, tables: TABLES, roleExists: false, others: null, publicGrants: 0,
    createrole: true, identity: { db: "neondb", usr: "neondb_owner", su: false, tl: profile.timelineId },
    role: { rolsuper: false, rolcreaterole: false, rolcreatedb: false, rolreplication: false, rolbypassrls: false, rolcanlogin: true,
      rolinherit: false, rolconnlimit: 20, rolvaliduntil: null }, memberships: 0, failCreate: null, failCommit: false, ...overrides };
  s.query = async (sql, params) => {
    s.queries.push(sql.trim().split(/\s+/).slice(0, 2).join(" "));
    if (sql === IDENTITY_SQL) return { rows: [s.identity] };
    if (sql.startsWith("select rolcreaterole r")) return { rows: [{ r: s.createrole }] };
    if (sql.startsWith("select to_regclass")) return { rows: [{ t: "filumire_schema_migrations" }] };
    if (sql.startsWith("select id, kind, sha256")) return { rows: s.ledger };
    if (sql.startsWith("select tablename t")) return { rows: s.tables.map(t => ({ t })) };
    if (sql.startsWith("select count(*)::int n from pg_roles")) return { rows: [{ n: s.roleExists ? 1 : 0 }] };
    if (sql.startsWith("select string_agg(rolname")) return { rows: [{ r: s.others }] };
    if (sql.includes("role_table_grants")) return { rows: [{ n: s.publicGrants }] };
    if (sql.startsWith("CREATE ROLE")) { if (s.failCreate) throw new Error(s.failCreate); s.roleCreated = sql; return { rows: [] }; }
    if (sql.startsWith("select rolsuper")) return { rows: [s.role] };
    if (sql.includes("pg_auth_members")) return { rows: [{ n: s.memberships }] };
    if (sql === "COMMIT" && s.failCommit) throw new Error("connection terminated");
    return { rows: [] }; // SET, BEGIN, COMMIT, ROLLBACK, catalog reads (empty snapshot)
  };
  return s;
}
const files = () => { const f = { written: {}, removed: [] }; f.io = { random: n => Buffer.alloc(n, 7), write: (p, t) => { f.written[p] = t; }, remove: p => f.removed.push(p) }; return f; };
const observed = { timelineId: profile.timelineId, ledger: LEDGER.map(r => r.id), tables: 29, schemaSha256: catalogHash({ tables: [], columns: [], constraints: [], indexes: [] }) };
const code = approvalCode(target, observed);
ok(() => assert.equal(TABLES.length, 29));

// Dry run: read-only session, every pre-flight passes, no role statement.
{
  const client = fakeClient();
  const report = await dryRun(client, manifest, target, profile);
  assert.equal(client.queries[0], "SET SESSION");
  assert.equal(report.approvalCode, code);
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
await rejects("other_filumire_roles_present:filumire_dev_owner", () => dryRun(fakeClient({ others: "filumire_dev_owner" }), manifest, target, profile));
await rejects("public_has_table_grants", () => dryRun(fakeClient({ publicGrants: 2 }), manifest, target, profile));

// Happy path: one transaction, verifier only, env file written before COMMIT, nothing secret returned.
{
  const client = fakeClient(), f = files();
  const result = await execute(client, manifest, target, code, profile, output, f.io);
  const password = Buffer.alloc(32, 7).toString("base64url");
  assert.equal(client.queries[0], "BEGIN");
  assert.equal(client.queries[1], "SET LOCAL");
  assert.equal(client.queries.at(-1), "COMMIT");
  assert(client.roleCreated.startsWith(`CREATE ROLE filumire_app ${ROLE_ATTRIBUTES} CONNECTION LIMIT 20 PASSWORD 'SCRAM-SHA-256$4096:`));
  assert(!client.roleCreated.includes(password), "plaintext never sent");
  assert.equal(client.roleCreated, `CREATE ROLE filumire_app ${ROLE_ATTRIBUTES} CONNECTION LIMIT 20 PASSWORD '${scramVerifier(password, Buffer.alloc(16, 7))}'`);
  assert.deepEqual(f.written, { [output.envOut]: `FILUMIRE_PREVIEW_APP_URL=${appUrl(OWNER_URL, password)}\n` });
  assert(!JSON.stringify(result).includes(password) && !JSON.stringify(result).includes("SCRAM-SHA-256$"));
  assert.equal(result.created, "filumire_app"); checks++;
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
  const client = fakeClient({ failCreate: "password rejected: SCRAM-SHA-256$4096:x$y:z" }), f = files();
  const result = await execute(client, manifest, target, code, profile, output, f.io);
  assert.equal(result.rolledBack, true); assert.equal(result.envFileRemoved, false);
  assert.equal(result.error, "password rejected: <verifier>");
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
// COMMIT fails after the file was written: the file is removed again.
{
  const client = fakeClient({ failCommit: true }), f = files();
  const result = await execute(client, manifest, target, code, profile, output, f.io);
  assert.equal(result.rolledBack, true); assert.equal(result.envFileRemoved, true);
  assert.deepEqual(f.removed, [output.envOut]); checks++;
}
// The env file already exists (write refuses): rolled back, the existing file is left alone.
{
  const client = fakeClient(), f = files();
  f.io.write = () => { throw Object.assign(new Error("EEXIST: file already exists"), { code: "EEXIST" }); };
  const result = await execute(client, manifest, target, code, profile, output, f.io);
  assert.equal(result.rolledBack, true); assert.equal(result.envFileRemoved, false); assert.deepEqual(f.removed, []); checks++;
}
// Bad output settings are refused before BEGIN.
{
  const client = fakeClient();
  await rejects("env_out_must_be_dotenv_local", () => execute(client, manifest, target, code, profile, { ...output, envOut: "/x/.env" }, files().io));
  assert.deepEqual(client.queries, []); checks++;
}
ok(() => assert(new RoleError("x") instanceof Error));

console.log(`PASS: filumire_app creation — ${checks} checks (SCRAM RFC 7677, pre-flight, verifier-only, env file before COMMIT, fail-closed)`);
