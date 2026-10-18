// Guarded creation of the application role filumire_app (W4, docs/PREVIEW_W4_APP_ROLE_PLAN.md).
// Same target gate as apply-migrations.mjs: existing Neon endpoints stay refused unless pinned, production never.
// Default is a read-only dry run that prints the pre-flight result and an approval code. Creating the role needs
// --execute with that code. Grants are a separate step (scripts/sql/app-role-grants.sql).
// The password is generated here and only its SCRAM-SHA-256 verifier is sent, so the plaintext never reaches SQL or
// server logs. It is written once, to a gitignored env file, before COMMIT; nothing secret is printed.
// Usage: node scripts/create-app-role.mjs --url-env <VAR> --expect-host <host> --expect-database <db>
//          [--pinned-target <name>] [--execute --approval <code> --env-out <.env.*.local> --app-url-var <VAR>]
import { createHash, createHmac, pbkdf2Sync, randomBytes } from "node:crypto";
import { basename, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { loadManifest, verifyManifest, compareLedger } from "./migration-ledger.mjs";
import { catalog, catalogHash } from "./catalog-snapshot.mjs";
import { checkTarget } from "./apply-migrations.mjs";
import { pinnedTarget, checkIdentity, IDENTITY_SQL } from "./pinned-targets.mjs";
import { APP_ROLE_MATRIX } from "./test-app-role-permissions.mjs";
import { checkPublicAccess, writeCredential, commitTransaction, transactionFailure, reportCli, withClient, W4Error, CREDENTIAL_POLICY_VERSION } from "./w4-safety.mjs";

export class RoleError extends W4Error {}
const refuse = code => { throw new RoleError(code); };

export const ROLE = "filumire_app";
export const CONNECTION_LIMIT = 20;
/** A5 attributes plus NOINHERIT (no memberships today; a later accidental GRANT would not take effect silently). */
export const ROLE_ATTRIBUTES = "LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION NOBYPASSRLS";
const SCRAM_ITERATIONS = 4096;
const VERIFIER = /^SCRAM-SHA-256\$\d+:[A-Za-z0-9+/=]+\$[A-Za-z0-9+/=]+:[A-Za-z0-9+/=]+$/;

/** RFC 5802 / 7677 keys. The password must be ASCII (SASLprep is then the identity). */
export function scramKeys(password, salt, iterations = SCRAM_ITERATIONS) {
  if (!/^[\x21-\x7e]+$/.test(password)) refuse("password_not_printable_ascii");
  const salted = pbkdf2Sync(Buffer.from(password, "utf8"), salt, iterations, 32, "sha256");
  const clientKey = createHmac("sha256", salted).update("Client Key").digest();
  return { clientKey, storedKey: createHash("sha256").update(clientKey).digest(), serverKey: createHmac("sha256", salted).update("Server Key").digest() };
}

/** PostgreSQL's stored form: SCRAM-SHA-256$<iterations>:<salt>$<StoredKey>:<ServerKey>. */
export function scramVerifier(password, salt, iterations = SCRAM_ITERATIONS) {
  const { storedKey, serverKey } = scramKeys(password, salt, iterations);
  const verifier = `SCRAM-SHA-256$${iterations}:${salt.toString("base64")}$${storedKey.toString("base64")}:${serverKey.toString("base64")}`;
  if (!VERIFIER.test(verifier)) refuse("verifier_malformed");
  return verifier;
}

/** Never let a verifier or URL reach output, even inside a driver error message. */
export const redact = text => String(text).replace(/SCRAM-SHA-256\$\S+/g, "<verifier>").replace(/postgres(ql)?:\/\/\S+/g, "<url>").slice(0, 200);

/** The app's connection string: same host and database as the owner's, the new role, TLS verify-full. */
export function appUrl(ownerUrlText, password) {
  const url = new URL(ownerUrlText);
  url.username = ROLE;
  url.password = password;
  url.searchParams.delete("channel_binding");
  url.searchParams.set("sslmode", "verify-full");
  return url.href;
}

/** The env file must be a gitignored .env.*.local file and the variable name must not be an owner variable. */
export function checkOutput(envOut, varName) {
  if (!envOut || !/^\.env\.[a-z0-9-]+\.local$/.test(basename(envOut))) refuse("env_out_must_be_dotenv_local");
  if (!varName || !/^[A-Z][A-Z0-9_]*$/.test(varName) || /OWNER|FLPREVIEW_/.test(varName)) refuse("app_url_var_invalid");
}

export const approvalCode = (target, observed) =>
  createHash("sha256").update(JSON.stringify([target.host, target.database, observed.timelineId, observed.ledger, observed.schemaSha256, `create ${ROLE}`, CREDENTIAL_POLICY_VERSION]))
    .digest("hex").slice(0, 12);

/** Every pre-flight check from the W4 plan. Read-only statements only. */
export async function inspect(client, manifest, profile, { roleExpected = "absent" } = {}) {
  const [id] = (await client.query(IDENTITY_SQL)).rows;
  const identity = { database: id.db, role: id.usr, superuser: id.su, timelineId: id.tl };
  if (profile) checkIdentity(profile, identity);
  else if (identity.superuser !== false) refuse("owner_must_not_be_superuser");
  if (!(await client.query("select rolcreaterole r from pg_roles where rolname = current_user")).rows[0]?.r) refuse("owner_cannot_create_roles");

  const ledgerPresent = (await client.query("select to_regclass($1) t", [`public.${manifest.ledgerTable}`])).rows[0].t !== null;
  if (!ledgerPresent) refuse("ledger_missing");
  const status = compareLedger(manifest, (await client.query(`select id, kind, sha256 from "${manifest.ledgerTable}" order by applied_at, id`)).rows);
  if (!status.consistent || status.pending.length) refuse("ledger_not_complete_and_consistent");

  const tables = (await client.query("select tablename t from pg_tables where schemaname = 'public' order by 1")).rows.map(r => r.t);
  const expected = Object.keys(APP_ROLE_MATRIX).sort();
  if (JSON.stringify(tables) !== JSON.stringify(expected)) refuse("public_tables_differ_from_grant_matrix");

  const roleCount = (await client.query("select count(*)::int n from pg_roles where rolname = $1", [ROLE])).rows[0].n;
  if (roleExpected === "present" ? roleCount !== 1 : roleCount !== 0) refuse(roleExpected === "present" ? "role_missing" : "role_already_exists");
  const others = (await client.query("select string_agg(rolname, ',') r from pg_roles where rolname like 'filumire\\_%'")).rows[0].r;
  if (others && !(roleExpected === "present" && others === ROLE)) refuse("other_filumire_roles_present");
  await checkPublicAccess(client);

  return { timelineId: identity.timelineId, ledger: status.applied, tables: tables.length, schemaSha256: catalogHash(await catalog(client)) };
}

export async function dryRun(client, manifest, target, profile) {
  await client.query("SET SESSION CHARACTERISTICS AS TRANSACTION READ ONLY");
  const observed = await inspect(client, manifest, profile);
  return { mode: "dry-run", target, role: ROLE, attributes: ROLE_ATTRIBUTES, connectionLimit: CONNECTION_LIMIT, ...observed,
    approvalCode: approvalCode(target, observed) };
}

/**
 * One transaction: re-check, create the role from a verifier, verify it, write the env file, COMMIT.
 * The file is fsynced before COMMIT. Remove it only after an acknowledged rollback.
 * Any uncertain outcome preserves credentials and stops with a nonzero CLI exit.
 */
export async function execute(client, manifest, target, approval, profile, output, io = {}) {
  const { random = randomBytes, write = writeCredential, remove } = io;
  checkOutput(output?.envOut, output?.varName);
  let written = false, commitAttempted = false;
  await client.query("BEGIN");
  try {
    await client.query("SET LOCAL lock_timeout = '5s'; SET LOCAL statement_timeout = '30s'");
    const observed = await inspect(client, manifest, profile);
    if (approval !== approvalCode(target, observed)) refuse("approval_code_does_not_match");

    const password = random(32).toString("base64url");
    const verifier = scramVerifier(password, random(16));
    await client.query(`CREATE ROLE ${ROLE} ${ROLE_ATTRIBUTES} CONNECTION LIMIT ${CONNECTION_LIMIT} PASSWORD '${verifier}'`);

    const role = (await client.query(
      "select rolsuper, rolcreaterole, rolcreatedb, rolreplication, rolbypassrls, rolcanlogin, rolinherit, rolconnlimit, rolvaliduntil from pg_roles where rolname = $1",
      [ROLE])).rows[0];
    if (!role || role.rolsuper || role.rolcreaterole || role.rolcreatedb || role.rolreplication || role.rolbypassrls || !role.rolcanlogin
        || role.rolinherit || role.rolconnlimit !== CONNECTION_LIMIT || role.rolvaliduntil !== null) refuse("role_attributes_unexpected");
    if ((await client.query("select count(*)::int n from pg_auth_members m join pg_roles r on r.oid = m.member where r.rolname = $1", [ROLE])).rows[0].n)
      refuse("role_has_memberships");

    await write(output.envOut, `${output.varName}=${appUrl(output.ownerUrl, password)}\n`, () => { written = true; });
    if (!written) refuse("credential_write_not_confirmed");
    commitAttempted = true;
    await commitTransaction(client);
    return { mode: "execute", target, created: ROLE, attributes: ROLE_ATTRIBUTES, connectionLimit: CONNECTION_LIMIT,
      passwordStoredAs: `SCRAM-SHA-256 verifier (${SCRAM_ITERATIONS} iterations)`, envFile: basename(output.envOut), envVar: output.varName,
      schemaSha256: observed.schemaSha256 };
  } catch (error) {
    return transactionFailure(client, error, { commitAttempted, credentialCreated: written, envOut: output.envOut, remove });
  }
}

async function run(args) {
  const get = flag => (args.includes(flag) ? args[args.indexOf(flag) + 1] : undefined);
  const profile = args.includes("--pinned-target") ? pinnedTarget(get("--pinned-target")) : undefined;
  const ownerUrl = process.env[get("--url-env") ?? ""];
  const target = checkTarget(ownerUrl, get("--expect-host"), get("--expect-database"), profile);
  const manifest = loadManifest();
  verifyManifest(manifest);
  const output = { envOut: get("--env-out") && resolve(get("--env-out")), varName: get("--app-url-var"), ownerUrl };
  if (args.includes("--execute")) checkOutput(output.envOut, output.varName);
  const { default: pg } = await import("pg");
  const client = new pg.Client({ connectionString: ownerUrl, connectionTimeoutMillis: 10000 });
  return withClient(client, async () => {
    return args.includes("--execute") ? await execute(client, manifest, target, get("--approval"), profile, output) : await dryRun(client, manifest, target, profile);
  });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exitCode = await reportCli(() => run(process.argv.slice(2)));
}
