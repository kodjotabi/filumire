// Guarded migration apply for TEST databases (Phase 1 step 1.6), plus one pinned existing target (W2).
// The existing Neon endpoints stay refused; filumire-preview is reachable only with --pinned-target filumire-preview,
// which also requires its exact host, Neon timeline, role and R1 schema fingerprints. Production main never is.
// Default is a read-only dry run that prints the plan and its approval code. Applying needs --execute with that code,
// so the owner approves one exact plan against one exact target.
// Usage: node scripts/apply-migrations.mjs --url-env <VAR> --expect-host <host> --expect-database <db>
//          [--pinned-target <name>] [--execute --approval <code>]
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { loadManifest, verifyManifest, sha256, LedgerError } from "./migration-ledger.mjs";
import { catalog, catalogHash } from "./catalog-snapshot.mjs";
import { PinnedTargetError, pinnedTarget, checkPinnedHost, observe, checkPreconditions, checkFingerprints } from "./pinned-targets.mjs";

export class ApplyError extends Error { constructor(code) { super(code); this.code = code; } }
const refuse = code => { throw new ApplyError(code); };
/** Existing Neon endpoints (main = production, filumire-preview). Refused unless pinned (see pinned-targets.mjs). */
export const DENIED_ENDPOINTS = Object.freeze(["ep-cold-bird-b8j437np", "ep-icy-scene-b816974r"]);

export function checkTarget(urlText, expectHost, expectDatabase, profile) {
  let url;
  try { url = new URL(urlText ?? ""); } catch { refuse("database_url_invalid"); }
  if (!["postgres:", "postgresql:"].includes(url.protocol)) refuse("database_url_invalid");
  const host = url.hostname.toLowerCase();
  const pinned = checkPinnedHost(host, profile);
  if (!pinned && DENIED_ENDPOINTS.some(endpoint => host.startsWith(endpoint))) refuse("denied_existing_endpoint");
  if (!expectHost || host !== expectHost.toLowerCase()) refuse("host_does_not_match_expected");
  if (host.includes("-pooler")) refuse("pooled_connection_not_allowed_for_ddl");
  const database = decodeURIComponent(url.pathname.slice(1));
  if (!expectDatabase || database !== expectDatabase) refuse("database_does_not_match_expected");
  if (pinned && database !== profile.database) refuse("database_does_not_match_expected");
  const local = host === "localhost" || host === "127.0.0.1";
  if (!local && !["require", "verify-full", "verify-ca"].includes(url.searchParams.get("sslmode") ?? "")) refuse("tls_required");
  return pinned ? { host, database, pinned: profile.name } : { host, database };
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

/** Bound to the target, the plan AND the current schema: any change to the database voids an earlier code. */
export const approvalCode = (target, plan, schemaSha256) =>
  createHash("sha256").update(JSON.stringify([target.host, target.database, plan.needsBaseline, plan.pending, schemaSha256])).digest("hex").slice(0, 12);

async function inspect(client, manifest, profile) {
  const present = (await client.query("select to_regclass($1) t", [`public.${manifest.ledgerTable}`])).rows[0].t !== null;
  const rows = present ? (await client.query(`select id, kind, sha256 from "${manifest.ledgerTable}"`)).rows : [];
  const plan = planApply(manifest, rows);
  const pinned = profile ? await observe(client) : undefined;
  if (profile) checkPreconditions(profile, pinned, plan);
  return { plan, schemaSha256: catalogHash(await catalog(client)), fingerprints: pinned?.fingerprints };
}

export async function dryRun(client, manifest, target, profile) {
  await client.query("SET SESSION CHARACTERISTICS AS TRANSACTION READ ONLY");
  const { plan, schemaSha256, fingerprints } = await inspect(client, manifest, profile);
  return { mode: "dry-run", target, ...plan, schemaSha256, ...(profile ? { fingerprints, reconciled: profile.reconciled } : {}),
    approvalCode: approvalCode(target, plan, schemaSha256) };
}

export async function execute(client, manifest, target, approval, profile, read = file => readFileSync(resolve(manifest.folder, file), "utf8")) {
  // All or nothing: plan check, every migration and every ledger row in ONE transaction,
  // under an advisory lock, re-checked inside the transaction against the approved code.
  await client.query("BEGIN");
  try {
    if (profile) await client.query("SET LOCAL lock_timeout = '5s'; SET LOCAL statement_timeout = '60s'");
    await client.query("select pg_advisory_xact_lock(hashtext('filumire_schema_migrations'))");
    const { plan, schemaSha256 } = await inspect(client, manifest, profile);
    if (approval !== approvalCode(target, plan, schemaSha256)) refuse("approval_code_does_not_match_plan");
    if (!plan.pending.length) refuse("nothing_to_apply");
    const who = (await client.query("select current_user u")).rows[0].u;
    for (const id of plan.pending) {
      const entry = manifest.entries.find(e => e.id === id);
      const sql = read(entry.file);
      if (sha256(sql) !== entry.sha256) refuse(`file_changed_after_review:${id}`);
      try { await client.query(sql); }
      catch (error) { throw Object.assign(new Error(String(error.message).slice(0, 200)), { failedAt: id }); }
      // B1: re-running the migrations already present must leave the schema exactly as R1 found it.
      if (profile && id === profile.reconciled.at(-1)) checkFingerprints(profile.fingerprints, (await observe(client)).fingerprints, "reconciled_rerun_changed_schema");
    }
    if ((await client.query("select to_regclass($1) t", [`public.${manifest.ledgerTable}`])).rows[0].t === null) refuse("ledger_table_missing_after_apply");
    if (plan.needsBaseline)
      await client.query(`insert into "${manifest.ledgerTable}" (id, kind, sha256, applied_by, applied_at, note) values ($1,'baseline',$2,$3, now() - interval '1 microsecond', $4)`,
        [manifest.entries[0].id, schemaSha256, who, "catalog snapshot taken inside the applying transaction, before any change"]);
    for (const id of plan.pending)
      await client.query(`insert into "${manifest.ledgerTable}" (id, kind, sha256, applied_by) values ($1,'migration',$2,$3)`, [id, manifest.entries.find(e => e.id === id).sha256, who]);
    await client.query("COMMIT");
    return { mode: "execute", target, applied: plan.pending, baselineRecorded: plan.needsBaseline, schemaSha256Before: schemaSha256,
      ...(profile ? { reconciled: profile.reconciled } : {}) };
  } catch (error) {
    await client.query("ROLLBACK");
    if (error instanceof ApplyError || error instanceof PinnedTargetError) throw error;
    return { mode: "execute", target, applied: [], rolledBack: true, failedAt: error.failedAt, error: error.message };
  }
}

async function run(args) {
  const get = flag => (args.includes(flag) ? args[args.indexOf(flag) + 1] : undefined);
  const profile = args.includes("--pinned-target") ? pinnedTarget(get("--pinned-target")) : undefined;
  const target = checkTarget(process.env[get("--url-env") ?? ""], get("--expect-host"), get("--expect-database"), profile);
  const manifest = loadManifest();
  verifyManifest(manifest);
  const { default: pg } = await import("pg");
  const client = new pg.Client({ connectionString: process.env[get("--url-env")], connectionTimeoutMillis: 10000 });
  await client.connect();
  try {
    return args.includes("--execute") ? await execute(client, manifest, target, get("--approval"), profile) : await dryRun(client, manifest, target, profile);
  } finally { await client.end(); }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { console.log(JSON.stringify(await run(process.argv.slice(2)), null, 1)); }
  catch (error) {
    const known = error instanceof ApplyError || error instanceof LedgerError || error instanceof PinnedTargetError;
    console.log(JSON.stringify({ refused: known ? error.code : "database_error" }));
    process.exitCode = 1;
  }
}
