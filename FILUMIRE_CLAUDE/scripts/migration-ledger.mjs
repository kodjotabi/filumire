// Migration ledger: verifies drizzle/MIGRATIONS.json against the files, and (read-only) against a database.
// It never applies migrations or writes ledger rows; that stays a separately approved, manual step.
// Usage: node scripts/migration-ledger.mjs verify
//        node scripts/migration-ledger.mjs status --url-env <ENV_VAR_NAME>   (prints no credentials)
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export class LedgerError extends Error { constructor(code) { super(code); this.code = code; } }
const DRIZZLE = resolve(dirname(fileURLToPath(import.meta.url)), "../drizzle");
export const sha256 = text => createHash("sha256").update(text.replace(/\r\n/g, "\n")).digest("hex");

export function loadManifest(folder = DRIZZLE) {
  const manifest = JSON.parse(readFileSync(resolve(folder, "MIGRATIONS.json"), "utf8"));
  return { ...manifest, folder };
}

/** Manifest integrity: unique ids, one leading baseline, file hashes match the reviewed values. */
export function verifyManifest(manifest, read = file => readFileSync(resolve(manifest.folder, file), "utf8")) {
  const entries = manifest.entries ?? [];
  if (!entries.length || entries[0].kind !== "baseline" || entries.slice(1).some(e => e.kind !== "migration")) throw new LedgerError("baseline_must_be_first_and_only");
  const ids = new Set();
  for (const entry of entries) {
    if (!entry.id || ids.has(entry.id)) throw new LedgerError(`duplicate_or_missing_id:${entry.id}`);
    ids.add(entry.id);
    if (entry.kind === "migration") {
      if (!/^[0-9a-f]{64}$/.test(entry.sha256 ?? "")) throw new LedgerError(`missing_hash:${entry.id}`);
      if (sha256(read(entry.file)) !== entry.sha256) throw new LedgerError(`file_changed_after_review:${entry.id}`);
    }
  }
  return entries.length;
}

/** Compare ledger rows from a database with the manifest. Pure: no I/O. */
export function compareLedger(manifest, rows) {
  const byId = new Map(rows.map(row => [row.id, row]));
  const known = new Set(manifest.entries.map(e => e.id));
  const applied = [], pending = [], drift = [];
  let gap = false, outOfOrder = false;
  for (const entry of manifest.entries) {
    const row = byId.get(entry.id);
    if (!row) { pending.push(entry.id); gap = true; continue; }
    if (gap) outOfOrder = true;
    if (entry.kind === "migration" && row.sha256 !== entry.sha256) drift.push(entry.id);
    applied.push(entry.id);
  }
  const unknown = rows.map(row => row.id).filter(id => !known.has(id));
  return { applied, pending, drift, unknown, outOfOrder, consistent: !drift.length && !unknown.length && !outOfOrder };
}

async function status(urlEnv) {
  const url = urlEnv && process.env[urlEnv];
  if (!url) throw new LedgerError("missing_url_env");
  const { default: pg } = await import("pg");
  const client = new pg.Client({ connectionString: url, connectionTimeoutMillis: 5000 });
  await client.connect();
  try {
    await client.query("SET SESSION CHARACTERISTICS AS TRANSACTION READ ONLY");
    const manifest = loadManifest();
    verifyManifest(manifest);
    const exists = (await client.query("SELECT to_regclass($1) AS t", [`public.${manifest.ledgerTable}`])).rows[0].t !== null;
    const rows = exists ? (await client.query(`SELECT id, kind, sha256 FROM "${manifest.ledgerTable}" ORDER BY applied_at, id`)).rows : [];
    return { ledgerTablePresent: exists, ...compareLedger(manifest, rows) };
  } finally { await client.end(); }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [command, flag, value] = process.argv.slice(2);
  try {
    if (command === "verify") console.log(JSON.stringify({ verifiedEntries: verifyManifest(loadManifest()) }));
    else if (command === "status" && flag === "--url-env") console.log(JSON.stringify(await status(value), null, 1));
    else throw new LedgerError("usage: verify | status --url-env <ENV_VAR_NAME>");
  } catch (error) {
    console.log(JSON.stringify({ error: error instanceof LedgerError ? error.code : "database_error" }));
    process.exitCode = 1;
  }
}
