// Offline source-policy checks only: no pg import, SQL execution or database access.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { APP_ROLE_MATRIX, EVIDENCE_VIEW } from "../scripts/test-app-role-permissions.mjs";
import { loadManifest, verifyManifest } from "../scripts/migration-ledger.mjs";

const read = path => readFileSync(new URL(path, import.meta.url), "utf8");
const normalise = text => text.replace(/--[^\n]*/g, "").replace(/\s+/g, " ").trim();
const sql = normalise(read("../drizzle/0024_deployment_migration_evidence.sql"));
const policy = normalise(read("../scripts/sql/app-role-grants.sql"));
const guard = read("../scripts/deploy-guard.mjs");
const view = "public.filumire_deployment_migration_0023";
let checks = 0;
const check = fn => { fn(); checks++; };

// Migration 0024: one restricted view, role-neutral like 0019-0023.
check(() => assert.equal(EVIDENCE_VIEW, view));
check(() => assert(sql.startsWith(
  "CREATE VIEW " + view + " WITH (security_barrier = true) AS SELECT kind, sha256 FROM public.filumire_schema_migrations WHERE id = '0023_learner_grade_set_by'; "),
  "only the approved row and two columns may be exposed, behind a security barrier"));
check(() => assert.equal(sql.match(/\bCREATE\b/gi).length, 1, "creates nothing else"));
check(() => assert(sql.includes("REVOKE ALL PRIVILEGES ON " + view + " FROM PUBLIC;")));
check(() => assert(!/\bGRANT\b/i.test(sql), "grants belong to app-role-grants.sql"));
check(() => assert(!/filumire_app|neondb_owner|_owner\b|OWNER TO|SET ROLE/i.test(sql), "no role names: portable to any owner"));
check(() => assert(!/security_invoker\s*=\s*(true|on|1)/i.test(sql), "owner-based, never invoker-based"));
check(() => assert(/relowner FROM pg_class WHERE oid = 'public\.filumire_deployment_migration_0023'::regclass\) IS DISTINCT FROM \(SELECT relowner FROM pg_class WHERE oid = 'public\.filumire_schema_migrations'::regclass\) THEN RAISE EXCEPTION/.test(sql),
  "apply refuses unless the view belongs to the ledger owner"));
check(() => assert(!/\b(INSERT|UPDATE|DELETE|DROP|ALTER|TRUNCATE)\b/i.test(sql), "no data or other schema change"));
check(() => assert.deepEqual(APP_ROLE_MATRIX.filumire_schema_migrations, [], "base-ledger access remains denied"));

// Grant policy: requires 0024, restores only SELECT on the view after the clean slate.
const statements = policy.split(";").map(s => s.trim());
const grants = statements.filter(s => /^GRANT\b/i.test(s));
check(() => assert(grants.every(s => !/\bfilumire_schema_migrations\b/i.test(s)), "grant policy cannot expose the ledger"));
check(() => assert(grants.every(s => !/\bALL\s+TABLES\b/i.test(s)), "no blanket table grant"));
check(() => assert(grants.every(s => !/\bWITH\s+GRANT\s+OPTION\b/i.test(s)), "no grant delegation"));
const viewGrants = grants.filter(s => s.includes(view));
check(() => assert.deepEqual(viewGrants, ["GRANT SELECT ON " + view + " TO filumire_app"]));
const cleanSlate = policy.indexOf("REVOKE ALL ON ALL TABLES IN SCHEMA public FROM filumire_app");
const preflight = policy.indexOf("RAISE EXCEPTION 'Apply migration 0024_deployment_migration_evidence before these grants'");
check(() => assert(cleanSlate > 0 && policy.indexOf(viewGrants[0]) > cleanSlate, "view SELECT restored after the clean slate"));
check(() => assert(preflight > 0 && preflight < cleanSlate, "missing 0024 stops the policy before anything changes"));
check(() => assert(policy.indexOf("is not the reviewed 0024 view") < cleanSlate, "an altered view stops the policy too"));

// Guard: reads the evidence only through the view, never the ledger table.
check(() => assert(guard.includes('"SELECT kind, sha256 FROM public.filumire_deployment_migration_0023"')));
check(() => assert(!/FROM\s+(public\.)?\\?"?filumire_schema_migrations/i.test(guard), "guard never reads the ledger table"));
for (const code of ["deployment_evidence_view_missing", "deployment_evidence_view_untrusted", "deployment_evidence_view_denied"]) {
  check(() => assert(guard.includes(`refuse("${code}")`)));
}

const manifest = loadManifest();
check(() => assert.equal(verifyManifest(manifest), 7));
check(() => assert.equal(manifest.entries.at(-1).id, "0024_deployment_migration_evidence"));
console.log(`PASS: deployment migration evidence policy - ${checks} offline checks`);
