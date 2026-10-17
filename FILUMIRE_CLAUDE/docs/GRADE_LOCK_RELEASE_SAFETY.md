# Grade-lock release safety

Migration `0023_learner_grade_set_by` must be applied and verified on each target
database **before deploying code that requires `grade_set_by`**. A runtime refusal
is a final safeguard; it is not a substitute for migration-before-deployment.
The manifest has six entries: baseline 0000–0018 and migrations 0019–0023.

## Release order and approval

1. Review the complete code/test change set before committing. Preserve existing
   unrelated work. Run local checks with memory persistence and no live database.
2. Before any database access, obtain explicit approval for the exact target and
   operation. Existing isolation, recovery, migration-history and operator-approval
   requirements still apply; see `PRIVATE_PREVIEW_MIGRATION_READINESS.md`.
3. An authorised operator applies the reviewed migration 0023 after its
   prerequisites, then records its reviewed SHA-256 in the migration ledger.
   Migration execution and ledger writes require separate explicit approval.
4. After approval for read-only verification, run the deployment guard with the
   intended Vercel environment and the target's existing application credentials.
   A successful check on another database, an environment flag, or a historical
   runtime success cannot satisfy this gate.
5. Only after compatibility passes and deployment receives explicit approval may
   the reviewed code be deployed. This document authorises none of these actions.

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
- Exactly one migration-0023 ledger row, with kind `migration` and the reviewed hash.
- Access to `learner_learning_context.grade_set_by` on the runtime search path.
- A nullable text column and the named, validated grade-attribution CHECK constraint.

The transaction ends with `ROLLBACK` and the connection closes. Missing ledger
evidence, schema, permissions, connection availability, or any verification error
blocks the build. The guard never runs DDL, writes ledger rows, grants permissions,
or substitutes owner credentials. If the application role cannot read the ledger,
the release remains blocked pending operator/security review; do not automatically
broaden that role's permissions. Only fixed refusal codes are printed by the CLI.

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
Deployment-gate tests inject clients and never connect to a database.

Also run `npm run migrations:verify`, `tsc --noEmit --incremental false`, and the
in-memory `tests/grade-aware-subject-selection.test.ts`. No migration or live
database test is necessary for these offline checks. Live compatibility remains
unverified until separately approved and run on each intended target.
