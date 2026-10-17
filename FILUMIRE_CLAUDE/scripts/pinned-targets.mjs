// Pinned existing-database targets (W2). An endpoint in DENIED_ENDPOINTS can be used by apply-migrations.mjs and
// test-app-role-permissions.mjs only when named here AND passed explicitly with --pinned-target <name>.
// Every value comes from read-only evidence: R0 (Neon metadata) and R1 (17 Oct 2026, 18:37:44 UTC), see
// docs/PREVIEW_MIGRATION_HISTORY_RECONCILIATION_REPORT.md. Changing any value needs a new review.
export class PinnedTargetError extends Error { constructor(code) { super(code); this.code = code; } }
const refuse = code => { throw new PinnedTargetError(code); };

/** Production main. Never pinnable, never reachable through any flag. */
export const NEVER_ALLOWED_ENDPOINTS = Object.freeze(["ep-cold-bird-b8j437np"]);

export const PINNED_TARGETS = Object.freeze({
  "filumire-preview": Object.freeze({
    project: "proud-term-61114809",
    branch: "br-round-resonance-b8fm2nao",
    endpoint: "ep-icy-scene-b816974r",
    host: "ep-icy-scene-b816974r.c-14.us-east-1.aws.neon.tech",
    database: "neondb",
    role: "neondb_owner",
    timelineId: "9b1954e94ceac987049e579227dd4cf1",
    // R1 Q8, the whole public schema before any write. The apply refuses unless these match exactly.
    fingerprints: Object.freeze({
      baseTables: 28,
      columns: "a32edda08153dd80f79e67f89c6a621ba1d410dbe3717c85f339fe274800801c",
      constraints: "464828edcc99da657efea534cc6235cdd0d8ed4d8a2dfcc6ba95c59038f3a2c8",
      indexes: "b6a5358b02ee78ca4577cf671ed7c28efe8b6863b85bd38ebc8776d5793be117",
    }),
    // Case B1: no ledger; 0019-0021 present and exact, re-run inside the transaction; 0022-0024 applied.
    expectedPlan: Object.freeze({
      needsBaseline: true,
      pending: Object.freeze(["0019_learner_accounts", "0020_auth_rate_limits", "0021_teacher_accounts",
        "0022_migration_ledger", "0023_learner_grade_set_by", "0024_deployment_migration_evidence"]),
    }),
    reconciled: Object.freeze(["0019_learner_accounts", "0020_auth_rate_limits", "0021_teacher_accounts"]),
  }),
});

export function pinnedTarget(name) {
  if (!Object.hasOwn(PINNED_TARGETS, name ?? "")) refuse("unknown_pinned_target");
  const profile = PINNED_TARGETS[name];
  if (NEVER_ALLOWED_ENDPOINTS.includes(profile.endpoint) || !profile.host.startsWith(`${profile.endpoint}.`)) refuse("pinned_target_invalid");
  return { name, ...profile };
}

/** Host gate shared by both tools. Without a profile it allows nothing (callers keep their deny list); with one,
 *  production is refused outright and only the profile's exact host passes. */
export function checkPinnedHost(host, profile) {
  if (!profile) return false;
  if (NEVER_ALLOWED_ENDPOINTS.some(endpoint => host.startsWith(endpoint))) refuse("production_endpoint_never_allowed");
  if (host !== profile.host) refuse("pinned_host_mismatch");
  return true;
}

/** Exact Q8 of scripts/sql/preview-history-reconciliation-readonly.sql, so the values compare with R1. */
export const FINGERPRINT_SQL = `SELECT
  (SELECT count(*) FROM pg_class WHERE relnamespace = 'public'::regnamespace AND relkind IN ('r', 'p')) AS base_tables,
  (SELECT encode(sha256(convert_to(coalesce(string_agg(
            format('%s|%s|%s|%s|%s', c.relname, a.attname, format_type(a.atttypid, a.atttypmod), a.attnotnull, pg_get_expr(d.adbin, d.adrelid)),
            chr(10) ORDER BY c.relname, a.attname), ''), 'UTF8')), 'hex')
     FROM pg_attribute a JOIN pg_class c ON c.oid = a.attrelid
     LEFT JOIN pg_attrdef d ON d.adrelid = a.attrelid AND d.adnum = a.attnum
     WHERE c.relnamespace = 'public'::regnamespace AND c.relkind IN ('r', 'p', 'v', 'm', 'f')
       AND a.attnum > 0 AND NOT a.attisdropped) AS columns_sha256,
  (SELECT encode(sha256(convert_to(coalesce(string_agg(
            format('%s|%s|%s|%s', conrelid::regclass, conname, contype, pg_get_constraintdef(oid)),
            chr(10) ORDER BY conrelid::regclass::text, conname), ''), 'UTF8')), 'hex')
     FROM pg_constraint WHERE connamespace = 'public'::regnamespace) AS constraints_sha256,
  (SELECT encode(sha256(convert_to(coalesce(string_agg(
            format('%s|%s|%s', tablename, indexname, indexdef),
            chr(10) ORDER BY tablename, indexname), ''), 'UTF8')), 'hex')
     FROM pg_indexes WHERE schemaname = 'public') AS indexes_sha256`;

export const IDENTITY_SQL = "select current_database() db, current_user usr, (select rolsuper from pg_roles where rolname = current_user) su, current_setting('neon.timeline_id', true) tl";

/** Q1 of the reconciliation script: any history table or view in any non-system schema. */
export const HISTORY_SQL = `select n.nspname || '.' || c.relname rel from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where n.nspname not in ('pg_catalog', 'information_schema') and n.nspname not like 'pg_toast%'
    and c.relkind in ('r', 'p', 'v', 'm', 'f') and c.relname ~* '(migration|schema_version|changelog|flyway)' order by 1`;

export async function observe(client) {
  const [identity] = (await client.query(IDENTITY_SQL)).rows;
  const [f] = (await client.query(FINGERPRINT_SQL)).rows;
  const history = (await client.query(HISTORY_SQL)).rows.map(row => row.rel);
  return {
    identity: { database: identity.db, role: identity.usr, superuser: identity.su, timelineId: identity.tl },
    fingerprints: { baseTables: Number(f.base_tables), columns: f.columns_sha256, constraints: f.constraints_sha256, indexes: f.indexes_sha256 },
    history,
  };
}

export function checkIdentity(profile, identity) {
  if (identity.database !== profile.database) refuse("pinned_identity_mismatch:database");
  if (identity.role !== profile.role) refuse("pinned_identity_mismatch:role");
  if (identity.superuser !== false) refuse("pinned_identity_mismatch:superuser");
  if (identity.timelineId !== profile.timelineId) refuse("pinned_identity_mismatch:timeline");
}

export function checkFingerprints(expected, actual, code = "schema_fingerprint_mismatch") {
  for (const key of ["baseTables", "columns", "constraints", "indexes"])
    if (actual[key] !== expected[key]) refuse(`${code}:${key}`);
}

/** Every precondition for a write on the pinned target. Pure, so it is tested without a database. */
export function checkPreconditions(profile, observed, plan) {
  checkIdentity(profile, observed.identity);
  if (observed.history.length) refuse(`unexpected_history_relation:${observed.history.join(",")}`);
  checkFingerprints(profile.fingerprints, observed.fingerprints);
  if (plan.needsBaseline !== profile.expectedPlan.needsBaseline
      || JSON.stringify(plan.pending) !== JSON.stringify(profile.expectedPlan.pending)) refuse("pinned_plan_mismatch");
}
