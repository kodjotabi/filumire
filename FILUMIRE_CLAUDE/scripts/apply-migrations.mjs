// Guarded migration apply for TEST databases only (Phase 1 step 1.6). Never targets the existing Neon main or
// filumire-preview endpoints; production migration is a separate, later tool and approval.
// Default is a read-only dry run that prints the plan and its approval code. Applying needs --execute with that code,
// so the owner approves one exact plan against one exact target.
// Usage: node scripts/apply-migrations.mjs --url-env <VAR> --expect-host <host> --expect-database <db> [--execute --approval <code>]
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { loadManifest, verifyManifest, sha256 } from "./migration-ledger.mjs";
import { catalog, catalogHash } from "./catalog-snapshot.mjs";

export class ApplyError extends Error { constructor(code) { super(code); this.code = code; } }
const refuse = code => { throw new ApplyError(code); };
/** Existing Neon endpoints (main = production, filumire-preview). Hard-refused regardless of flags. */
export const DENIED_ENDPOINTS = Object.freeze(["ep-cold-bird-b8j437np", "ep-icy-scene-b816974r"]);

export function checkTarget(urlText, expectHost, expectDatabase) {
  let url;
  try { url = new URL(urlText ?? ""); } catch { refuse("database_url_invalid"); }
  if (!["postgres:", "postgresql:"].includes(url.protocol)) refuse("database_url_invalid");
  const host = url.hostname.toLowerCase();
  if (DENIED_ENDPOINTS.some(endpoint => host.startsWith(endpoint))) refuse("denied_existing_endpoint");
  if (!expectHost || host !== expectHost.toLowerCase()) refuse("host_does_not_match_expected");
  if (host.includes("-pooler")) refuse("pooled_connection_not_allowed_for_ddl");
  const database = decodeURIComponent(url.pathname.slice(1));
  if (!expectDatabase || database !== expectDatabase) refuse("database_does_not_match_expected");
  const local = host === "localhost" || host === "127.0.0.1";
  if (!local && !["require", "verify-full", "verify-ca"].includes(url.searchParams.get("sslmode") ?? "")) refuse("tls_required");
  return { host, database };
}

/** Pure: which migrations to apply, given ledger rows (or none if the ledger table is absent). */
export function planApply(manifest, ledgerRows) {
  const recorded = new Map(ledgerRows.map(row => [row.id, row]));
  for (const entry of manifest.entries) {
    const row = recorded.get(entry.id);
    if (row && entry.kind === "migration" && row.sha256 !== entry.sha256) refuse(`ledger_drift:${entry.id}`);
  }
  const unknown = ledgerRows.filter(row => !manifest.entries.some(e => e.id === row.id));
  if (unknown.length) refuse(`ledger_has_unknown_entries:${unknown.map(r => r.id).join(",")}`);
  const pending = manifest.entries.filter(e => e.kind === "migration" && !recorded.has(e.id));
  const firstPending = manifest.entries.findIndex(e => e.kind === "migration" && !recorded.has(e.id));
  if (firstPending >= 0 && manifest.entries.slice(firstPending).some(e => recorded.has(e.id))) refuse("ledger_out_of_order");
  return { needsBaseline: !recorded.has(manifest.entries[0].id), pending: pending.map(e => e.id) };
}

export const approvalCode = (target, plan) =>
  createHash("sha256").update(JSON.stringify([target.host, target.database, plan.needsBaseline, plan.pending])).digest("hex").slice(0, 12);

async function run(args) {
  const get = flag => (args.includes(flag) ? args[args.indexOf(flag) + 1] : undefined);
  const target = checkTarget(process.env[get("--url-env") ?? ""], get("--expect-host"), get("--expect-database"));
  const manifest = loadManifest();
  verifyManifest(manifest);
  const { default: pg } = await import("pg");
  const client = new pg.Client({ connectionString: process.env[get("--url-env")], connectionTimeoutMillis: 10000 });
  await client.connect();
  try {
    const ledgerPresent = async () => (await client.query("select to_regclass($1) t", [`public.${manifest.ledgerTable}`])).rows[0].t !== null;
    const rows = (await ledgerPresent()) ? (await client.query(`select id, kind, sha256 from "${manifest.ledgerTable}"`)).rows : [];
    const plan = planApply(manifest, rows);
    const baselineSha256 = catalogHash(await catalog(client));
    const code = approvalCode(target, plan);
    if (!args.includes("--execute")) return { mode: "dry-run", target, ...plan, baselineSha256, approvalCode: code };
    if (get("--approval") !== code) refuse("approval_code_does_not_match_plan");

    const who = (await client.query("select current_user u")).rows[0].u;
    const unrecorded = [];
    const applied = [];
    for (const id of plan.pending) {
      const entry = manifest.entries.find(e => e.id === id);
      const sql = readFileSync(resolve(manifest.folder, entry.file), "utf8");
      if (sha256(sql) !== entry.sha256) refuse(`file_changed_after_review:${id}`);
      await client.query("BEGIN");
      try {
        await client.query(sql);
        unrecorded.push(entry);
        if (await ledgerPresent()) {
          if (plan.needsBaseline && !applied.includes("baseline"))
            await client.query(`insert into "${manifest.ledgerTable}" (id, kind, sha256, applied_by, note) values ($1,'baseline',$2,$3,$4)`,
              [manifest.entries[0].id, baselineSha256, who, "catalog snapshot taken immediately before this run"]), applied.push("baseline");
          for (const e of unrecorded.splice(0))
            await client.query(`insert into "${manifest.ledgerTable}" (id, kind, sha256, applied_by) values ($1,'migration',$2,$3)`, [e.id, e.sha256, who]);
        }
        await client.query("COMMIT");
        applied.push(id);
      } catch (error) {
        await client.query("ROLLBACK");
        return { mode: "execute", target, applied, failedAt: id, error: String(error.message).slice(0, 200) };
      }
    }
    if (unrecorded.length) return { mode: "execute", target, applied, warning: "applied_but_ledger_table_absent", unrecorded: unrecorded.map(e => e.id) };
    return { mode: "execute", target, applied, baselineSha256 };
  } finally { await client.end(); }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { console.log(JSON.stringify(await run(process.argv.slice(2)), null, 1)); }
  catch (error) {
    console.log(JSON.stringify({ refused: error instanceof ApplyError ? error.code : "database_error" }));
    process.exitCode = 1;
  }
}
