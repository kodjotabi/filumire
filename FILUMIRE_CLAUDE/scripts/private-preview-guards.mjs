import { createHash } from "node:crypto";
export class SafetyGateError extends Error { constructor(code) { super(code); this.code = code; } }
const refuse = code => { throw new SafetyGateError(code); };
export const TARGET = Object.freeze({ projectId: "proud-term-61114809", endpoint: "ep-cold-bird-b8j437np.c-14.us-east-1.aws.neon.tech", database: "neondb", role: "neondb_owner" });
export const SCHEMA_SHA256 = "5af0c142d62c5add0b72e476947631baa05ed89c7bf9275383fee2c27564ef3a";
export const PREREQUISITE_SHA256 = "a7b49b2749c53f681432ee74f3b075f9d3eb5a9ca239af1d6059218a13e614a7";
export const SQL_SHA256 = Object.freeze({
  "0020_auth_rate_limits.sql": "f3c77a33a20759cc7ff22f90699b3a0b639169a14b7e6e37cf1c618d5f80a74e",
  "0021_teacher_accounts.sql": "f4276c21c24d034e86acdec99ac124284b5f2adb375d5282e352021294e0ddeb",
});
const digest = value => createHash("sha256").update(value).digest("hex");
export function validatePrerequisiteSql(sql) {
  if (digest(sql) !== PREREQUISITE_SHA256) refuse("reviewed_prerequisite_sql_changed");
}
export function validateTarget(env) {
  if (!env.FLPREVIEW_DATABASE_URL_UNPOOLED || env.FLPREVIEW_NEON_PROJECT_ID !== TARGET.projectId) refuse("missing_or_wrong_preview_variables");
  let url;
  try { url = new URL(env.FLPREVIEW_DATABASE_URL_UNPOOLED); } catch { refuse("invalid_preview_url"); }
  let role;
  try { role = decodeURIComponent(url.username); } catch { refuse("invalid_preview_role"); }
  if (!["postgres:", "postgresql:"].includes(url.protocol) || url.hostname !== TARGET.endpoint || url.pathname !== `/${TARGET.database}` || role !== TARGET.role || !url.password || (url.port && url.port !== "5432") || url.hash) refuse("incorrect_preview_target");
  if ([...url.searchParams.keys()].some(key => !["sslmode", "channel_binding"].includes(key))) refuse("unexpected_connection_options");
  for (const [key, expected] of [["FLPREVIEW_PGDATABASE", TARGET.database], ["FLPREVIEW_PGUSER", TARGET.role], ["FLPREVIEW_PGHOST_UNPOOLED", TARGET.endpoint]]) if (env[key] !== undefined && env[key] !== expected) refuse("conflicting_preview_alias");
  if (env.FLPREVIEW_DATABASE_URL) {
    let pooled;
    try { pooled = new URL(env.FLPREVIEW_DATABASE_URL); } catch { refuse("invalid_preview_alias"); }
    if (pooled.hostname.replace("-pooler", "") !== TARGET.endpoint || pooled.pathname !== url.pathname || pooled.username !== url.username || !["postgres:", "postgresql:"].includes(pooled.protocol)) refuse("conflicting_preview_alias");
  }
  // Never consume generic DATABASE_URL or fall back to a pooled URL.
  url.searchParams.set("sslmode", "verify-full");
  return url.toString();
}
export function validateArtifacts(baseline, sqlFiles) {
  if (digest(JSON.stringify(baseline.schema)) !== SCHEMA_SHA256) refuse("reviewed_baseline_schema_changed");
  if (JSON.stringify(baseline.migrationHistory) !== "[]") refuse("unexpected_reviewed_migration_history");
  if (Object.keys(sqlFiles).join(",") !== Object.keys(SQL_SHA256).join(",")) refuse("unexpected_migration_order");
  for (const [name, expected] of Object.entries(SQL_SHA256)) if (digest(sqlFiles[name]) !== expected) refuse("reviewed_migration_sql_changed");
}
export function validateSnapshot(snapshot, baseline) {
  if (snapshot.identity.database !== TARGET.database || snapshot.identity.role !== TARGET.role || snapshot.identity.superuser !== false || snapshot.identity.read_only !== "on") refuse("incorrect_server_identity");
  if (JSON.stringify(snapshot.migrationHistory) !== JSON.stringify(baseline.migrationHistory)) refuse("unexpected_live_migration_history");
  if (digest(JSON.stringify(snapshot.schema)) !== SCHEMA_SHA256) refuse("unexpected_live_schema_or_partial_migration");
  if (snapshot.accountKinds.some(row => !["guardian", "learner"].includes(row.account_kind))) refuse("unsupported_existing_account_kind");
  if (snapshot.activity.some(row => row.query_visible !== true || row.potential_migration !== false) || snapshot.locks.length) refuse("concurrent_or_unobservable_migration_activity");
}
export function safetyBlockers(evidence, now = Date.now()) {
  if (!evidence || typeof evidence !== "object" || Array.isArray(evidence)) return ["invalid_safety_evidence"];
  const blockers = [];
  const preview = evidence.preview, production = evidence.production;
  if (preview?.controlPlaneMappingReviewed !== true || preview.projectId !== TARGET.projectId || !/^br-[a-z0-9-]+$/.test(preview.branchId ?? "") || preview.endpoint !== TARGET.endpoint || preview.database !== TARGET.database) blockers.push("preview_branch_mapping_unverified");
  if (production?.effectiveTargetReviewed !== true || production.controlPlaneMappingReviewed !== true || typeof production.projectId !== "string" || !production.projectId || !/^br-[a-z0-9-]+$/.test(production.branchId ?? "") || typeof production.database !== "string" || !production.database) blockers.push("production_target_unverified");
  else if (preview?.projectId === production.projectId && preview?.branchId === production.branchId && preview?.database === production.database) blockers.push("production_and_preview_share_writable_database");
  else if (preview?.projectId === production.projectId && preview?.branchId === production.branchId) blockers.push("production_and_preview_share_recovery_branch");
  const proof = value => typeof value === "string" && value.trim().length > 0 && !/postgres(?:ql)?:\/\/|Bearer\s/i.test(value);
  if (!proof(preview?.mappingEvidenceReference) || !proof(production?.mappingEvidenceReference) || !proof(production?.effectiveTargetEvidenceReference)) blockers.push("database_identity_evidence_missing");
  if (!/^ep-[a-z0-9-]+\.[a-z0-9.-]+\.neon\.tech$/.test(production?.endpoint ?? "")) blockers.push("production_endpoint_unverified");
  else if (production.endpoint.replace("-pooler", "") === TARGET.endpoint) blockers.push("production_endpoint_resolves_to_preview_target");
  const recovery = evidence.recovery;
  if (recovery?.reviewed !== true || recovery.restorePermissionVerified !== true || recovery.procedureReviewed !== true || typeof recovery.reference !== "string" || !recovery.reference || recovery.projectId !== TARGET.projectId || recovery.branchId !== preview?.branchId || !["snapshot", "backup_branch", "verified_dump", "root_branch_pitr"].includes(recovery.mechanism)) blockers.push("usable_recovery_point_unverified");
  else {
    const capture = Date.parse(recovery.capturedAt), expiry = Date.parse(recovery.expiresAt);
    if (!Number.isFinite(capture) || capture > now || !Number.isFinite(expiry) || expiry <= now + 30 * 60_000) blockers.push("recovery_point_expired_or_insufficient_window");
    if (recovery.mechanism === "root_branch_pitr" && (preview.branchType !== "root" || !Number.isFinite(recovery.retentionSeconds) || recovery.retentionSeconds <= 0)) blockers.push("instant_restore_not_supported_or_disabled");
    if (recovery.mechanism === "root_branch_pitr" && Number.isFinite(capture) && now - capture > recovery.retentionSeconds * 1000) blockers.push("restore_timestamp_outside_retention");
    if (recovery.mechanism === "root_branch_pitr" && Number.isFinite(capture) && Number.isFinite(expiry) && expiry > capture + recovery.retentionSeconds * 1000) blockers.push("recovery_expiry_exceeds_retention");
  }
  if (recovery?.sourceUsabilityVerified !== true || !proof(recovery?.availabilityEvidenceReference) || !proof(recovery?.permissionEvidenceReference) || !proof(recovery?.procedureEvidenceReference)) blockers.push("recovery_source_or_permission_evidence_missing");
  if (evidence.historyReconciliationReviewed !== true) blockers.push("handwritten_migration_history_not_reconciled");
  if (!proof(evidence.historyEvidenceReference)) blockers.push("migration_history_evidence_missing");
  const reviewedAt = Date.parse(evidence.reviewedAt);
  if (!Number.isFinite(reviewedAt) || reviewedAt > now || now - reviewedAt > 30 * 60_000) blockers.push("safety_evidence_missing_or_stale");
  return blockers;
}
