// Shared W4 safety primitives. Importing this module never connects to a database.
import { openSync, writeFileSync, fsyncSync, closeSync, unlinkSync } from "node:fs";
import { writeWindowsCredential, WindowsCredentialError } from "./windows-credential.mjs";

export const CREDENTIAL_POLICY_VERSION = "w4-owner-system-v1";

// Inspect catalog ACLs directly: role_table_grants deliberately omits PUBLIC.
// Include views, sequences and column grants; NULL relation ACLs use PostgreSQL defaults.
export const PUBLIC_ACCESS_SQL = `select count(*)::int n from (
  select c.oid from pg_class c
    cross join lateral aclexplode(coalesce(c.relacl,
      acldefault(case when c.relkind = 'S' then 'S'::"char" else 'r'::"char" end, c.relowner))) a
    where c.relnamespace = 'public'::regnamespace and c.relkind in ('r','p','v','m','f','S') and a.grantee = 0
  union all
  select c.oid from pg_attribute col join pg_class c on c.oid = col.attrelid
    cross join lateral aclexplode(col.attacl) a
    where c.relnamespace = 'public'::regnamespace and col.attnum > 0 and not col.attisdropped and a.grantee = 0
) public_access`;

export async function checkPublicAccess(client) {
  if ((await client.query(PUBLIC_ACCESS_SQL)).rows[0]?.n !== 0) {
    throw new W4Error("public_has_relation_or_column_grants");
  }
}

export class W4Error extends Error {
  constructor(code, details = {}) { super(code); this.code = code; this.details = details; }
}

// Exclusive creation protects existing files. Notify the caller as soon as we own the file,
// including when a later write/fsync/close fails. Never include driver/filesystem messages.
export async function writeCredential(path, text, created) {
  if (process.platform === "win32") {
    try { return await writeWindowsCredential(path, text, created); }
    catch (error) { throw new W4Error("windows_credential_protection_failed", error instanceof WindowsCredentialError ? error.details : {}); }
  }
  const fd = openSync(path, "wx", 0o600);
  created();
  try { writeFileSync(fd, text); fsyncSync(fd); }
  finally { closeSync(fd); }
}

// An explicit ROLLBACK command tag is definitive; a rejected/missing COMMIT reply is not.
export async function commitTransaction(client) {
  const result = await client.query("COMMIT");
  if (result?.command === "ROLLBACK") throw new W4Error("commit_rolled_back");
  if (result?.command !== "COMMIT") throw new W4Error("commit_not_confirmed");
}

// A failed COMMIT may have committed on the server. Neither a later ROLLBACK nor
// reconnecting and observing an absent role can resolve a still-running COMMIT safely.
// Preserve the exclusive credential file and require operator reconciliation; never retry.
export async function transactionFailure(client, error, {
  commitAttempted = false, credentialCreated = false, envOut, remove = unlinkSync,
} = {}) {
  let rolledBack = commitAttempted && error instanceof W4Error && error.code === "commit_rolled_back";
  if (!commitAttempted) {
    try { rolledBack = (await client.query("ROLLBACK"))?.command === "ROLLBACK"; }
    catch { /* Outcome remains unknown; preserve credentials. */ }
  }
  let removed = false, cleanupFailed = false;
  if (rolledBack && credentialCreated) {
    try { remove(envOut); removed = true; }
    catch { cleanupFailed = true; }
  }
  const code = !rolledBack ? "transaction_outcome_unknown"
    : cleanupFailed ? "credential_cleanup_failed" : "w4_transaction_failed";
  throw new W4Error(code, {
    outcome: rolledBack ? "rolled_back" : "unknown", rolledBack,
    credentialRetained: credentialCreated && !removed,
    envFileRemoved: removed, cleanupFailed,
    // Only codes created by our code are eligible for output, never error.message.
    ...(error instanceof W4Error ? { reason: error.code } : {}),
    ...(error instanceof W4Error && error.details.fileCreationUncertain ? { fileCreationUncertain: true } : {}),
  });
}

// Both W4 CLIs use this boundary: every failure is exit 1, with no raw error details.
export async function reportCli(action, io = {}) {
  const emit = io.emit ?? (value => console.log(JSON.stringify(value, null, 1)));
  try { emit(await action()); return 0; }
  catch (error) {
    emit(error instanceof W4Error
      ? { refused: error.code, ...error.details }
      : { refused: "w4_operation_failed" });
    return 1;
  }
}

// Teardown must not hide the transaction outcome or a retained-credential warning.
// node-postgres emits 'error' when the connection is lost, even while idle in a transaction.
// Unhandled, Node exits with a raw stack trace before any outcome is classified. pg itself
// rejects pending/later queries, so only record that it happened; never keep the message.
export async function withClient(client, action) {
  let result, failure, connectionLost = false;
  client.on("error", () => { connectionLost = true; });
  try { await client.connect(); result = await action(client); }
  catch (error) { failure = error; }
  try { await client.end(); }
  catch {
    if (!(failure instanceof W4Error)) failure = new W4Error(
      failure ? "w4_operation_failed" : "connection_cleanup_failed",
      { ...(result ? { operationCompleted: true, outcome: result.mode === "execute" ? "committed" : "read_only" } : {}) },
    );
    failure.details.connectionCleanupFailed = true;
  }
  if (failure instanceof W4Error && connectionLost) failure.details.connectionLost = true;
  if (failure) throw failure;
  return result;
}
