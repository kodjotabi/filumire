# Grade-lock release safety

Migration `0023_learner_grade_set_by` must be applied and verified on each target
database **before deploying code that requires `grade_set_by`**. A runtime refusal
is a final safeguard; it is not a substitute for migration-before-deployment.
Migration `0024_deployment_migration_evidence` must also be applied, and the
application-role grants re-run, on **every PostgreSQL Preview and Production
target** before this build guard can pass there. The manifest has seven entries:
baseline 0000–0018 and migrations 0019–0024. Neither migration is authorised by
this document.

## Release order and approval

Each numbered step needs its own explicit approval for the exact target. A step
that fails stops the release; do not skip ahead or work around it.

1. Review the complete code/test change set before committing. Preserve existing
   unrelated work. Run local checks with memory persistence and no live database.
2. Before any database access, obtain explicit approval for the exact target and
   operation. Existing isolation, recovery, migration-history and operator-approval
   requirements still apply; see `PRIVATE_PREVIEW_MIGRATION_READINESS.md`.
3. Prerequisite: the target has the migration ledger (0022) and its baseline row.
   As of the last read-only check, the Preview database had no ledger, so its
   history must be reconciled first. Do not manufacture ledger rows.
4. An authorised operator applies the reviewed migration 0023 after its
   prerequisites, then records its reviewed SHA-256 in the migration ledger.
5. The operator applies migration 0024 **as the owner of
   `filumire_schema_migrations`** and records it, in the same transaction (see
   below). 0024 refuses to apply under any other owner.
6. As the same owner, run `scripts/sql/app-role-grants.sql`. It stops with no
   change if 0024 is absent or its view has been altered, and grants
   `filumire_app` SELECT on the view only. 0024 itself grants nothing.
7. Verify permissions read-only: `filumire_app` has exactly SELECT on the view,
   no table- or column-level ledger privilege, and the view is owned by the
   ledger owner with `security_barrier=true` (see `test-app-role-permissions.mjs`).
8. After approval for read-only verification, run the deployment guard with the
   intended Vercel environment and the target's existing application credentials.
   A successful check on another database, an environment flag, or a historical
   runtime success cannot satisfy this gate.
9. Only after compatibility passes and deployment receives explicit approval may
   the reviewed code be deployed. This document authorises none of these actions.

### Applying 0023/0024 on Preview and Production

`scripts/apply-migrations.mjs` and `scripts/test-app-role-permissions.mjs` refuse
the existing Neon endpoints by design; they serve test branches only. There is
**no approved executor for Preview or Production yet**. Until one is reviewed,
the only acceptable method is a supervised session that follows exactly what
`apply-migrations.mjs` does, on a direct (unpooled) TLS connection as the ledger
owner, after `npm run migrations:verify` passes on the reviewed commit:

```sql
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';
SELECT pg_advisory_xact_lock(hashtext('filumire_schema_migrations'));
-- Must return exactly the reviewed 0023 hash, and no 0024 row; otherwise ROLLBACK.
SELECT id, kind, sha256 FROM filumire_schema_migrations
 WHERE id IN ('0023_learner_grade_set_by', '0024_deployment_migration_evidence');
-- The reviewed file drizzle/0024_deployment_migration_evidence.sql, verbatim.
INSERT INTO filumire_schema_migrations (id, kind, sha256, applied_by)
VALUES ('0024_deployment_migration_evidence', 'migration', '<sha256 from MIGRATIONS.json>', current_user);
COMMIT;
```

Recovery-point, isolation and identity checks from
`PRIVATE_PREVIEW_MIGRATION_READINESS.md` apply first. If the 0023 row is missing
or its hash differs, stop: 0024 is not a way to repair migration history.

## Build gate

`npm run build:learner` invokes the learner workspace build, which runs
`node ../../scripts/deploy-guard.mjs && next build`. The normal Vercel learner
package build therefore stops before Next.js when verification fails.
`npm run deploy:guard` runs the same gate directly.

The existing Vercel checks remain: environment-specific host allowlists, Preview
isolation from Production hosts, owner-credential refusal, Production PostgreSQL
requirement, and approved Production SHA/branch. After those checks, PostgreSQL
Preview and Production builds connect to their actual `DATABASE_URL`, using its
existing TLS and application-role settings, with bounded connection/query/lock
timeouts. Within `BEGIN READ ONLY` the guard requires:

- The reviewed local manifest/file hashes to verify.
- The schema-qualified evidence view to exist, owned by the ledger owner, with
  `security_barrier` on and `security_invoker` off (read from `pg_class`).
- Exactly one migration-0023 evidence row from that view, with kind `migration`
  and the reviewed hash.
- Access to `learner_learning_context.grade_set_by` on the runtime search path.
- A nullable text column and the named, validated grade-attribution CHECK constraint.

The transaction ends with `ROLLBACK` and the connection closes. Missing ledger
evidence, schema, permissions, connection availability, or any verification error
blocks the build. The guard never runs DDL, writes ledger rows, grants permissions,
or substitutes owner credentials. The application role reads only
`public.filumire_deployment_migration_0023`; direct ledger access remains denied.
Migration 0024 exposes only `kind` and `sha256` for migration 0023, with a security
barrier and owner-based base-table access. Only SELECT on this view is granted.
A missing view refuses with `deployment_evidence_view_missing`, an altered one with
`deployment_evidence_view_untrusted`, and a missing grant with
`deployment_evidence_view_denied`; do not broaden ledger permissions to fix any of
them. Do not manufacture a 0023 ledger row or automatically execute migrations
during build. Only fixed refusal codes are printed by the CLI.

Local builds (`VERCEL` other than `1`) and memory Preview builds need no database
and skip database verification. A local build is **not** deployment approval or
target-compatibility evidence. Local prebuilt artifacts must undergo the same
target-specific gate with the intended Vercel environment before an approved
release. Direct `next build`, custom build-command overrides, promotion of existing
artifacts, and external deployment tooling can bypass package scripts; the release
operator must verify the actual pipeline uses this gate. No remote build settings
or external infrastructure were changed here.

## Runtime cache and failure handling

The process's singleton PostgreSQL persistence store caches its successful
readiness promise, sharing an in-flight probe across concurrent context reads and
writes. The store uses one fixed pool/target. A new store/process checks anew;
restart processes when changing target/search-path configuration. This is safe
for the expected additive migration lifecycle. Do not remove required schema
under running application processes.

Failed checks are discarded. Every actual read/write still references the required
column; subsequent failures invalidate the cache and fail closed, including errors
wrapped by Drizzle. Missing table (`42P01`) reports
`grade_lock_context_table_missing`; missing column (`42703`) reports
`grade_lock_migration_0023_required`. Connection/permission errors are never treated
as successful readiness. Legacy rows with NULL attribution remain valid/unlocked.

## Offline validation

`npm test` includes `test:integration-foundation`, which runs the foundation ledger
checks, stubbed deployment-gate tests, and `test:grade-lock`. The latter runs the
stubbed PostgreSQL schema-guard tests and in-memory guardian-grade-lock regression.
Use `FILUMIRE_PERSISTENCE=memory` for the overall test suite. The schema-guard test
sets a fictional connection string and stubs both query and connection methods.
Deployment-gate tests inject clients and never connect to a database. They cover
missing, duplicate and mismatched evidence, a missing, altered or denied view, and
a client that denies ledger reads.
The offline evidence-policy test checks that 0024 is role-neutral and creates only
the restricted view, and that the grant policy requires 0024 before changing
anything. These are source/simulated-client checks, not proof of PostgreSQL ACL
behaviour. The separately approved live permission checker inspects the view's
owner, options and privileges, ledger column privileges, and tries reading and
writing through the view as `filumire_app`; it must not run during a local-only task.
Connection-limit changes remain a separately approved role-administration action.

Also run `npm run migrations:verify`, `tsc --noEmit --incremental false`, and the
in-memory `tests/grade-aware-subject-selection.test.ts`. No migration or live
database test is necessary for these offline checks. Live compatibility remains
unverified until separately approved and run on each intended target.
