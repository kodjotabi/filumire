import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { validateTarget, validateArtifacts, validatePrerequisiteSql, validateSnapshot, safetyBlockers, TARGET, SQL_SHA256 } from "../scripts/private-preview-guards.mjs";
const baseline = JSON.parse(readFileSync(new URL("../docs/PRIVATE_PREVIEW_READ_ONLY_BASELINE.json", import.meta.url)));
const sql = Object.fromEntries(Object.keys(SQL_SHA256).map(name => [name, readFileSync(new URL(`../drizzle/${name}`, import.meta.url))]));
const validEnv = { FLPREVIEW_NEON_PROJECT_ID: TARGET.projectId, FLPREVIEW_DATABASE_URL_UNPOOLED: `postgresql://${TARGET.role}:synthetic-test-password@${TARGET.endpoint}/neondb?sslmode=require` };
let checks = 0;
function reject(action, expected) { assert.throws(action, error => error.code === expected); checks++; }
assert.equal(new URL(validateTarget(validEnv)).searchParams.get("sslmode"), "verify-full"); checks++;
assert.equal(validateTarget({ ...validEnv, DATABASE_URL: "postgresql://irrelevant.invalid/production" }), validateTarget(validEnv)); checks++;
for (const env of [{}, { FLPREVIEW_DATABASE_URL: validEnv.FLPREVIEW_DATABASE_URL_UNPOOLED }, { ...validEnv, FLPREVIEW_NEON_PROJECT_ID: "other-project" }]) reject(() => validateTarget(env), "missing_or_wrong_preview_variables");
reject(() => validateTarget({ ...validEnv, FLPREVIEW_DATABASE_URL_UNPOOLED: "not a URL" }), "invalid_preview_url");
for (const address of [
  `postgresql://${TARGET.role}:test-password@other.neon.tech/neondb`,
  `postgresql://${TARGET.role}:test-password@${TARGET.endpoint.replace(".c-", "-pooler.c-")}/neondb`,
  `postgresql://${TARGET.role}:test-password@${TARGET.endpoint}/production`,
  `postgresql://other-role:test-password@${TARGET.endpoint}/neondb`,
  `https://${TARGET.role}:test-password@${TARGET.endpoint}/neondb`,
  `postgresql://${TARGET.role}@${TARGET.endpoint}/neondb`,
]) reject(() => validateTarget({ ...validEnv, FLPREVIEW_DATABASE_URL_UNPOOLED: address }), "incorrect_preview_target");
reject(() => validateTarget({ ...validEnv, FLPREVIEW_DATABASE_URL_UNPOOLED: validEnv.FLPREVIEW_DATABASE_URL_UNPOOLED + "&options=unsafe" }), "unexpected_connection_options");
reject(() => validateTarget({ ...validEnv, FLPREVIEW_PGDATABASE: "other" }), "conflicting_preview_alias");
reject(() => validateTarget({ ...validEnv, FLPREVIEW_DATABASE_URL: "postgresql://other:x@other.neon.tech/neondb" }), "conflicting_preview_alias");
validateArtifacts(baseline, sql); checks++;
validatePrerequisiteSql(readFileSync(new URL("../drizzle/0019_learner_accounts.sql", import.meta.url))); checks++;
reject(() => validatePrerequisiteSql("changed prerequisite"), "reviewed_prerequisite_sql_changed");
reject(() => validateArtifacts({ ...baseline, schema: {} }, sql), "reviewed_baseline_schema_changed");
reject(() => validateArtifacts({ ...baseline, migrationHistory: [{ id: 20 }] }, sql), "unexpected_reviewed_migration_history");
reject(() => validateArtifacts(baseline, Object.fromEntries(Object.entries(sql).reverse())), "unexpected_migration_order");
reject(() => validateArtifacts(baseline, { ...sql, "0021_teacher_accounts.sql": Buffer.from("changed SQL") }), "reviewed_migration_sql_changed");
const snapshot = { ...baseline, identity: { database: "neondb", role: TARGET.role, superuser: false, read_only: "on" }, activity: [], locks: [] };
validateSnapshot(snapshot, baseline); checks++;
for (const identity of [{ ...snapshot.identity, database: "production" }, { ...snapshot.identity, superuser: true }, { ...snapshot.identity, superuser: undefined }, { ...snapshot.identity, read_only: "off" }]) reject(() => validateSnapshot({ ...snapshot, identity }, baseline), "incorrect_server_identity");
reject(() => validateSnapshot({ ...snapshot, migrationHistory: [{ table: "__drizzle_migrations" }] }, baseline), "unexpected_live_migration_history");
reject(() => validateSnapshot({ ...snapshot, schema: { ...baseline.schema, indexes: [] } }, baseline), "unexpected_live_schema_or_partial_migration");
reject(() => validateSnapshot({ ...snapshot, accountKinds: [{ account_kind: "teacher" }] }, baseline), "unsupported_existing_account_kind");
for (const extra of [{ locks: [{ pid: 1 }] }, { activity: [{ query_visible: true, potential_migration: true }] }, { activity: [{ query_visible: false, potential_migration: null }] }]) reject(() => validateSnapshot({ ...snapshot, ...extra }, baseline), "concurrent_or_unobservable_migration_activity");
const now = Date.now();
const evidence = {
  reviewedAt: new Date(now).toISOString(), historyReconciliationReviewed: true, historyEvidenceReference: "synthetic owner reconciliation",
  preview: { projectId: TARGET.projectId, endpoint: TARGET.endpoint, database: "neondb", branchId: "br-preview-test", branchType: "root", controlPlaneMappingReviewed: true, mappingEvidenceReference: "synthetic preview metadata" },
  production: { projectId: "production-project", endpoint: "ep-production-test.c-14.us-east-1.aws.neon.tech", branchId: "br-production-test", database: "neondb", effectiveTargetReviewed: true, controlPlaneMappingReviewed: true, mappingEvidenceReference: "synthetic production metadata", effectiveTargetEvidenceReference: "synthetic runtime metadata" },
  recovery: { projectId: TARGET.projectId, branchId: "br-preview-test", mechanism: "root_branch_pitr", reference: "test-lsn", capturedAt: new Date(now - 1000).toISOString(), expiresAt: new Date(now + 3600000).toISOString(), retentionSeconds: 21600, reviewed: true, restorePermissionVerified: true, procedureReviewed: true, sourceUsabilityVerified: true, availabilityEvidenceReference: "synthetic point validation", permissionEvidenceReference: "synthetic project permission", procedureEvidenceReference: "synthetic reviewed procedure" },
};
assert.deepEqual(safetyBlockers(evidence, now), []); checks++;
const missing = JSON.parse(readFileSync(new URL("../docs/PRIVATE_PREVIEW_SAFETY_EVIDENCE.json", import.meta.url)));
assert(safetyBlockers(missing, now).length >= 5); checks++;
for (const [patched, blocker] of [
  [{ ...evidence, production: { ...evidence.production, projectId: TARGET.projectId, branchId: evidence.preview.branchId } }, "production_and_preview_share_writable_database"],
  [{ ...evidence, production: { ...evidence.production, projectId: TARGET.projectId, branchId: evidence.preview.branchId, database: "other" } }, "production_and_preview_share_recovery_branch"],
  [{ ...evidence, recovery: { ...evidence.recovery, restorePermissionVerified: false } }, "usable_recovery_point_unverified"],
  [{ ...evidence, recovery: { ...evidence.recovery, expiresAt: new Date(now).toISOString() } }, "recovery_point_expired_or_insufficient_window"],
  [{ ...evidence, preview: { ...evidence.preview, branchType: "child" } }, "instant_restore_not_supported_or_disabled"],
  [{ ...evidence, recovery: { ...evidence.recovery, retentionSeconds: 0 } }, "instant_restore_not_supported_or_disabled"],
  [{ ...evidence, recovery: { ...evidence.recovery, capturedAt: new Date(now - 86400000).toISOString() } }, "restore_timestamp_outside_retention"],
  [{ ...evidence, reviewedAt: new Date(now - 3600000).toISOString() }, "safety_evidence_missing_or_stale"],
  [{ ...evidence, historyReconciliationReviewed: false }, "handwritten_migration_history_not_reconciled"],
  [{ ...evidence, production: { ...evidence.production, effectiveTargetReviewed: "true" } }, "production_target_unverified"],
  [{ ...evidence, production: { ...evidence.production, endpoint: TARGET.endpoint } }, "production_endpoint_resolves_to_preview_target"],
  [{ ...evidence, production: { ...evidence.production, endpoint: TARGET.endpoint.replace(".c-", "-pooler.c-") } }, "production_endpoint_resolves_to_preview_target"],
  [{ ...evidence, production: { ...evidence.production, endpoint: null } }, "production_endpoint_unverified"],
  [{ ...evidence, preview: { ...evidence.preview, mappingEvidenceReference: null } }, "database_identity_evidence_missing"],
  [{ ...evidence, recovery: { ...evidence.recovery, sourceUsabilityVerified: false } }, "recovery_source_or_permission_evidence_missing"],
  [{ ...evidence, recovery: { ...evidence.recovery, permissionEvidenceReference: null } }, "recovery_source_or_permission_evidence_missing"],
  [{ ...evidence, recovery: { ...evidence.recovery, expiresAt: new Date(now + 86400000).toISOString() } }, "recovery_expiry_exceeds_retention"],
  [{ ...evidence, recovery: { ...evidence.recovery, retentionSeconds: "21600" } }, "instant_restore_not_supported_or_disabled"],
  [{ ...evidence, historyEvidenceReference: null }, "migration_history_evidence_missing"],
]) { assert(safetyBlockers(patched, now).includes(blocker)); checks++; }
for (const invalid of [null, [], "verified"]) { assert.deepEqual(safetyBlockers(invalid, now), ["invalid_safety_evidence"]); checks++; }
console.log(JSON.stringify({ privatePreviewGuards: "PASS", checks, databaseConnections: 0, mutations: 0 }));
