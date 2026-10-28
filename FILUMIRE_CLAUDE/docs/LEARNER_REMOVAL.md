# Guardian learner removal

The family page offers **Remove Learner** in English and French. A named
confirmation panel and required checkbox precede the request; Cancel sends no
request. Failures retain the learner and allow retry. Success updates the list;
refreshing confirms the learner remains absent.

`DELETE /api/account/learners/:learnerId` requires a signed-in guardian,
same-origin JSON, an active guardian relationship, creation ownership and
`{ "confirmRemoval": true }`. The storage operation independently checks ownership.
Learners, teachers, unrelated guardians and missing learners cannot be removed
through this endpoint. A guardian relationship alone does not grant creation
ownership.

Removal disables learner credentials, revokes learner sessions and all linked
access, and revokes teacher codes. Profiles, consent and learning records remain
stored. This is removal from active use, not a data-erasure mechanism. The UI
does not offer undo. Siblings and the guardian's own account remain available.

PostgreSQL performs removal in one transaction. Removal and teacher-code
redemption share a transaction advisory lock to prevent concurrent redemption
from restoring access. Learner/history rows stay unchanged; disabled credentials
and revoked access record removal. This works with the deployed app role's
existing permissions. No schema migration or grant is required.

## Local validation (2026-10-24)

- `node scripts/run-offline-suites.mjs learner-removal teacher-linking account-client-signout guardian-grade-lock principal-learner-access`: all five suites passed.
- `node node_modules/typescript/bin/tsc --project apps/learner/tsconfig.json --noEmit --incremental false`: passed.
- `tests/learner-removal.browser.mjs`: passed in English and French at 390px,
  covering confirmation, cancel, failed request/retry, successful removal and
  refresh. Uses the existing Playwright resolver and requires
  `FILUMIRE_PERSISTENCE=memory` and a loopback `FILUMIRE_TEST_URL`.

The initial runtime tests used fictional accounts, memory persistence and an
unreachable database URL. No real learners, Production changes or deployment
were involved.

## Isolated PostgreSQL validation (2026-10-24)

`node scripts/test-learner-removal-postgres.mjs` passed against a newly initialized
PostgreSQL **17.11** cluster bound only to `127.0.0.1` on a temporary port. The
runner ignores inherited database settings and never loads environment files.
It creates an empty `filumire_test` database with the non-superuser
`filumire_test_user`, generates its schema from the current
`services/database-schema.ts`, and stops the cluster in `finally`.

Before writing fixtures, the test verifies the exact database, role, address,
port, absence of existing tables, and the fresh cluster control-file identifier.
This checks the current schema and application behavior; it does not validate
historical migration files.

Passed checks:

- The shared removal suite runs against PostgreSQL: guardian role, creation
  ownership, confirmation, request origin, sibling protection, repeated and
  concurrent removal, revoked teacher codes, learner login/session revocation.
- Nonempty fictional learning evidence, learner state, grade context, profile
  and consent records remain unchanged after removal.
- Credentials become `disabled` and no active learner authentication sessions
  remain. The initial test also checked a `removed` learner status; the release
  revision below preserves the learner row to honor its append-only permissions.
- A temporary database trigger forces failure during credential disabling,
  after earlier removal writes. All earlier changes roll back; the teacher
  code remains redeemable. Removing the trigger allows a successful retry.
- Real PostgreSQL row locks queue removal and teacher-code redemption in both
  orders. Neither order leaves teacher or guardian access active.
- The PostgreSQL test and its imports pass a targeted TypeScript check.

Successful-run evidence is retained locally in
`.vercel/learner-removal-pg-OJiYKF/`: `tests.log`, `result.json`, generated
`schema.sql`, PostgreSQL logs and the stopped disposable cluster. Earlier
runner setup failures are retained in separate directories. No existing
database, real learners, Production configuration or deployment was touched.

## Reviewer/personal Preview release revision

The separate release package is based on deployed reviewer/JHS commit
`a27fd614b9f48279ba360d92f19376b8eba7cf6f`, preserving the five-reviewer gate,
private Basic 7–9 presentation and placement controls. Its source commit is
`b166b5e73be930dbe5bcd7c2b28a59d777b4fe66`; source manifest SHA-256 is
`8a433a4bca26940e1dea2916154e84fddd59beeb307971779db128cb36d426bd`.

The release uses a transaction advisory lock instead of updating/locking the
append-only `learners` table. The isolated PostgreSQL runner now executes the
application as `filumire_app`, with the same table grants as the deployed role,
explicitly asserting that UPDATE on learners is denied. Only the separate schema
owner connection creates the schema and injects a rollback-test trigger.

Both personal and five-fictional-reviewer PostgreSQL modes passed, including
nonempty history preservation, rollback/retry and both advisory-lock race orders.
Release-local evidence is under `FILUMIRE_CLAUDE/.vercel/learner-removal-release-20261024/FILUMIRE_CLAUDE/.vercel/`:
`learner-removal-pg-PT7u9P` (reviewers) and `learner-removal-pg-qNIbvF` (personal).
Both clusters are stopped. Reviewer access, JHS add-learner, guardian grade-lock,
teacher linking and the shared removal suite passed in memory; learner TypeScript
checks also passed. These tests do not modify hosted environments.
