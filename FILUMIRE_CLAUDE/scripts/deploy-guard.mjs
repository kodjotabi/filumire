// Deployment guard (audit S-SEC9). Run before `next build` on Vercel; refuses unsafe deployments.
// Prints only refusal codes, never URLs or credentials. Not wired into any Vercel build yet:
// that is a live project setting and needs owner approval.
// Usage: node scripts/deploy-guard.mjs
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

export class DeployGuardError extends Error { constructor(code) { super(code); this.code = code; } }
const refuse = code => { throw new DeployGuardError(code); };
const hosts = value => new Set((value ?? "").split(",").map(h => h.trim().toLowerCase()).filter(Boolean));
const OWNER_ROLE = /(^|_)owner$|^postgres$|^neondb_owner$/i;

/**
 * Rules for a Vercel build:
 * - no Neon owner credentials (FLPREVIEW_*) in any deployment;
 * - Production must use PostgreSQL (never memory mode), from an allow-listed host, with a non-owner role;
 * - Preview may use memory mode; if it uses PostgreSQL, the host must be allow-listed for Preview
 *   and must not be a Production host;
 * - Production builds only the approved commit from the approved branch.
 * Outside Vercel (local builds and tests) the guard does nothing.
 */
export function checkDeployment(env) {
  if (env.VERCEL !== "1") return { ok: true, mode: "local" };
  const target = env.VERCEL_ENV;
  if (target !== "production" && target !== "preview") refuse("unknown_vercel_environment");
  if (Object.keys(env).some(key => key.startsWith("FLPREVIEW_"))) refuse("owner_credentials_present");

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

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { console.log(JSON.stringify(checkDeployment(process.env))); }
  catch (error) {
    console.error(JSON.stringify({ deployGuard: "refused", code: error instanceof DeployGuardError ? error.code : "guard_error" }));
    process.exitCode = 1;
  }
}
