# Security test suites

## Offline (part of `npm test`)

`npm run test:security-offline` runs the offline security and integrity suites,
one process each, through `scripts/run-offline-suites.mjs`. The script
holds the authoritative list. It forces every suite onto the in-memory store
with an unreachable database URL (`127.0.0.1:1`), whatever `.env` files or the
shell contain, so it cannot reach PostgreSQL. No secrets are needed: suites that
sign tokens set their own test-only values.

It covers the red-team suites (identity, trusted evidence, JSON parsing,
session/competency binding, progression, concurrency), learning API and
assessment integrity, principal sessions and learner access, teacher
authorization and review, teacher write-origin checks, parent and family access,
tutoring identity, lesson closure and safeguarding.

`npm test` also runs these offline security suites through earlier scripts:
`api-assessment-security`, `api-identity-security`, `session-issue-rate-limit`,
`teacher-learner-session-boundary`, `auth-rate-limit`, `guardian-grade-lock`,
`grade-lock-schema-guard`, `teacher-linking`, `account-registration-journey`
and `spaced-revision`. Most of those earlier scripts load `.env.local`; keep
that file on memory storage for offline runs.

`test:grade-lock` and `test:revision` use the same runner, so they too run
offline from a clean shell.

## Database-dependent (separate; never part of `npm test`)

These suites need a real PostgreSQL database. On memory storage they refuse to
start, or (`teacher-pending-review-postgres`) fail against the unreachable
database URL. Run them only against a disposable test database with migrations
applied, never against production data:

| Suite | Verifies |
|---|---|
| `api-auth-postgres-lifecycle` | Session issue, renewal and revocation in PostgreSQL |
| `evidence-postgres-roundtrip` | Evidence storage round trip |
| `evidence-v1-postgres-persistence` | Evidence v1 persistence |
| `evidence-v1-postgres-atomic-persistence` | Atomic evidence plus learner-state writes |
| `learner-state-postgres-concurrency` | Concurrent learner-state updates |
| `learner-state-postgres-semantic-concurrency` | Semantic conflicts in concurrent updates |
| `teacher-pending-review-postgres` | Pending teacher review persistence |
| `teacher-observation` | Teacher observations recorded as evidence |
| `pilot-measurement-v1` | Pilot measurement events |

Run one with `node --import tsx --env-file=<test-database env file> ./tests/<suite>.test.ts`,
where the env file sets `FILUMIRE_PERSISTENCE=postgres` and a `DATABASE_URL`
for the disposable database.
