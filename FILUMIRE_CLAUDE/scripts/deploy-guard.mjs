// Deployment guard (audit S-SEC9). Run before `next build` on Vercel; refuses unsafe deployments.
// Wired into the learner package build. PostgreSQL Vercel builds verify their
// actual target read-only; running that verification requires database-access approval.
// Prints only refusal codes, never URLs or credentials.
// Usage: node scripts/deploy-guard.mjs
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { loadManifest, verifyManifest } from "./migration-ledger.mjs";

export class DeployGuardError extends Error { constructor(code) { super(code); this.code = code; } }
const refuse = code => { throw new DeployGuardError(code); };
const hosts = value => new Set((value ?? "").split(",").map(h => h.trim().toLowerCase()).filter(Boolean));
const OWNER_ROLE = /(^|_)owner$|^postgres$|^neondb_owner$/i;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Same rules as services/account reviewerList(): 1-20 combined "email:guardian|teacher" entries, at most one supplemental entry, no duplicates.
const MAX_REVIEWERS = 20;
const validReviewerList = (value, additional) => {
  const baseEntries = (value ?? "").split(",").map(entry => entry.trim()).filter(Boolean);
  const additionalEntries = (additional ?? "").split(",").map(entry => entry.trim()).filter(Boolean);
  const entries = [...baseEntries, ...additionalEntries];
  if (!baseEntries.length || additionalEntries.length > 1 || entries.length > MAX_REVIEWERS) return false;
  const seen = new Set();
  for (const entry of entries) {
    const at = entry.lastIndexOf(":"), email = entry.slice(0, at).trim().toLowerCase(), role = entry.slice(at + 1).trim().toLowerCase();
    if (at < 0 || !["guardian", "teacher"].includes(role) || email.length > 254 || !EMAIL.test(email) || seen.has(email)) return false;
    seen.add(email);
  }
  return true;
};
// Same formats as services/account/reviewers.ts reviewerAllRolesUntil(): YYYY-MM-DD or ISO date-time with a zone.
const validAccessUntil = value => {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const start = Date.parse(`${value}T00:00:00Z`);
    return !Number.isNaN(start) && new Date(start).toISOString().slice(0, 10) === value;
  }
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})$/.test(value) && !Number.isNaN(Date.parse(value));
};

/**
 * Rules for a Vercel build:
 * - no Neon owner credentials (FLPREVIEW_*) in any deployment;
 * - Production must use PostgreSQL (never memory mode), from an allow-listed host, with a non-owner role;
 * - Preview may use memory mode; if it uses PostgreSQL, the host must be allow-listed for Preview
 *   and must not be a Production host;
 * - Production builds only the approved commit from the approved branch;
 * - the Basic 7–9 private presentation (FILUMIRE_JHS_MODE) accepts only "private-presentation", on a
 *   Preview (behind Vercel Authentication) or on Production in private reviewer mode; anything else refuses;
 * - private review (FILUMIRE_ACCESS_MODE=reviewers) needs a valid reviewer list, closed general
 *   registration and no external identity provider;
 * - the all-roles test period (FILUMIRE_REVIEWER_ACCESS_UNTIL) needs reviewer mode and a valid date,
 *   so a mistyped value refuses the build instead of silently granting nothing.
 * Outside Vercel (local builds and tests) the guard does nothing.
 */
export function checkDeployment(env) {
  if (env.VERCEL !== "1") return { ok: true, mode: "local" };
  const target = env.VERCEL_ENV;
  if (target !== "production" && target !== "preview") refuse("unknown_vercel_environment");
  if (Object.keys(env).some(key => key.startsWith("FLPREVIEW_"))) refuse("owner_credentials_present");
  if (env.FILUMIRE_JHS_MODE) {
    if (env.FILUMIRE_JHS_MODE !== "private-presentation") refuse("jhs_mode_unknown");
    if (target === "production" && env.FILUMIRE_ACCESS_MODE !== "reviewers") refuse("jhs_mode_requires_reviewer_mode");
  }
  if (env.FILUMIRE_ACCESS_MODE && env.FILUMIRE_ACCESS_MODE !== "reviewers") refuse("unknown_access_mode");
  const accessUntil = (env.FILUMIRE_REVIEWER_ACCESS_UNTIL ?? "").trim();
  if (accessUntil) {
    if (env.FILUMIRE_ACCESS_MODE !== "reviewers") refuse("reviewer_access_until_without_reviewer_mode");
    if (!validAccessUntil(accessUntil)) refuse("reviewer_access_until_invalid");
  }
  if (env.FILUMIRE_ACCESS_MODE === "reviewers") {
    if (!validReviewerList(env.FILUMIRE_REVIEWER_EMAILS, env.FILUMIRE_REVIEWER_EMAILS_ADDITIONAL)) refuse("reviewer_list_invalid");
    if (env.FILUMIRE_ACCOUNT_REGISTRATION === "open") refuse("reviewer_mode_with_open_registration");
    if (Object.keys(env).some(key => key.startsWith("FILUMIRE_EXTERNAL_AUTH_") && env[key])) refuse("reviewer_mode_with_external_identity");
  }

  const persistence = env.FILUMIRE_PERSISTENCE ?? "memory";
  if (persistence !== "memory" && persistence !== "postgres") refuse("unknown_persistence");
  if (target === "production" && persistence !== "postgres") refuse("production_memory_mode");

  const productionHosts = hosts(env.FILUMIRE_DB_HOSTS_PRODUCTION);
  if (persistence === "postgres") {
    let url;
    try { url = new URL(env.DATABASE_URL ?? ""); } catch { refuse("database_url_invalid"); }
    if (!["postgres:", "postgresql:"].includes(url.protocol)) refuse("database_url_invalid");
    const host = url.hostname.toLowerCase().replace("-pooler.", ".");
    const allowed = target === "production" ? productionHosts : hosts(env.FILUMIRE_DB_HOSTS_PREVIEW);
    if (!allowed.size) refuse(`database_allowlist_missing_${target}`);
    if (!allowed.has(host)) refuse("database_host_not_allowed");
    if (target === "preview" && productionHosts.has(host)) refuse("preview_uses_production_database");
    if (OWNER_ROLE.test(decodeURIComponent(url.username))) refuse("database_owner_role");
  }

  if (target === "production") {
    if (!env.VERCEL_GIT_COMMIT_SHA || env.FILUMIRE_APPROVED_PRODUCTION_SHA !== env.VERCEL_GIT_COMMIT_SHA) refuse("production_commit_not_approved");
    if (env.VERCEL_GIT_COMMIT_REF !== (env.FILUMIRE_PRODUCTION_BRANCH ?? "main")) refuse("production_branch_not_approved");
  }
  return { ok: true, mode: target, persistence };
}

// The caller supplies an already connected client, allowing offline regression
// tests. This transaction never applies migrations or writes ledger rows.
export async function checkGradeLockCompatibility(client) {
  const manifest = loadManifest();
  verifyManifest(manifest);
  const required = manifest.entries.find(entry => entry.id === "0023_learner_grade_set_by");
  if (!required) refuse("grade_lock_manifest_entry_missing");
  await client.query("BEGIN READ ONLY");
  try {
    await client.query("SET LOCAL statement_timeout = 10000");
    await client.query("SET LOCAL lock_timeout = 5000");
    // Migration-0023 evidence comes only from the restricted view of migration 0024;
    // the application role has no access to the ledger table itself.
    const view = await client.query(`SELECT
      to_regclass('public.filumire_deployment_migration_0023') IS NOT NULL AS present,
      (SELECT v.relkind = 'v' AND v.relowner = l.relowner
          AND COALESCE((SELECT option_value::boolean FROM pg_options_to_table(v.reloptions)
            WHERE option_name = 'security_barrier'), false)
          AND NOT COALESCE((SELECT option_value::boolean FROM pg_options_to_table(v.reloptions)
            WHERE option_name = 'security_invoker'), false)
        FROM pg_class v, pg_class l
        WHERE v.oid = to_regclass('public.filumire_deployment_migration_0023')
          AND l.oid = to_regclass('public.filumire_schema_migrations')) AS trusted`);
    if (view.rows[0]?.present !== true) refuse("deployment_evidence_view_missing");
    if (view.rows[0]?.trusted !== true) refuse("deployment_evidence_view_untrusted");
    let ledger;
    try {
      ledger = await client.query("SELECT kind, sha256 FROM public.filumire_deployment_migration_0023");
    } catch (error) {
      if (error?.code === "42P01") refuse("deployment_evidence_view_missing");
      if (error?.code === "42501") refuse("deployment_evidence_view_denied");
      throw error;
    }
    if (ledger.rows.length !== 1 || ledger.rows[0].kind !== "migration" || ledger.rows[0].sha256 !== required.sha256) {
      refuse("grade_lock_migration_0023_unverified");
    }
    // Resolve the same table as runtime, using the application role/search path.
    await client.query('SELECT "grade_set_by" FROM "learner_learning_context" LIMIT 0');
    const schema = await client.query(`SELECT
      EXISTS (SELECT 1 FROM pg_attribute
        WHERE attrelid = to_regclass('learner_learning_context')
          AND attname = 'grade_set_by' AND NOT attisdropped
          AND atttypid = 'text'::regtype AND NOT attnotnull) AS column_ready,
      EXISTS (SELECT 1 FROM pg_constraint
        WHERE conrelid = to_regclass('learner_learning_context')
          AND conname = 'learner_learning_context_grade_set_by_check'
          AND contype = 'c' AND convalidated) AS constraint_ready`);
    if (schema.rows[0]?.column_ready !== true || schema.rows[0]?.constraint_ready !== true) {
      refuse("grade_lock_schema_incompatible");
    }
  } catch (error) {
    if (error instanceof DeployGuardError) throw error;
    if (error?.code === "42P01") refuse("grade_lock_required_table_missing");
    if (error?.code === "42703") refuse("grade_lock_required_column_missing");
    refuse("grade_lock_database_verification_failed");
  } finally {
    await client.query("ROLLBACK");
  }
}

export async function verifyDeployment(env, createClient) {
  const result = checkDeployment(env);
  if (result.mode === "local" || result.persistence !== "postgres") return result;
  // No offline flag/attestation can substitute for checking this exact target.
  const client = await createClient(env.DATABASE_URL);
  try {
    await client.connect();
    await checkGradeLockCompatibility(client);
  } finally {
    await client.end();
  }
  return { ...result, gradeLockSchema: "verified" };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    console.log(JSON.stringify(await verifyDeployment(process.env, async connectionString => {
      const { default: pg } = await import("pg");
      return new pg.Client({ connectionString, connectionTimeoutMillis: 5000, statement_timeout: 10000 });
    })));
  }
  catch (error) {
    console.error(JSON.stringify({ deployGuard: "refused", code: error instanceof DeployGuardError ? error.code : "guard_error" }));
    process.exitCode = 1;
  }
}
