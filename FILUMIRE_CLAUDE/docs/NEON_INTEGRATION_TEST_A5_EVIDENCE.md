# Neon integration-test — A5 application-role grants evidence

- **Date:** 15 October 2026, 12:19 UTC
- **Target:** branch `integration-test` (`br-long-leaf-b8wixqz2`), endpoint `ep-rough-water-b8fcf7pe` (unpooled, TLS verify-full), database `neondb`, executed as `neondb_owner`
- **Not touched:** `main`, `filumire-preview`, `filumire_test`, production; no application data, no migrations, no deploy, no payments
- **Grants file:** `scripts/sql/app-role-grants.sql`, sha256 `8d7f8995a684becd79efbccdb7398cbde41ef877dc42d2942374acc3b8a2616e` (uncommitted working-copy version, sent unmodified)
- **Tests:** `scripts/test-app-role-permissions.mjs`, unmodified
- **Raw evidence:** [NEON_INTEGRATION_TEST_A5_EVIDENCE.json](NEON_INTEGRATION_TEST_A5_EVIDENCE.json) (no credentials)

## Outcome

**191 / 191 permission checks passed, 0 failed.**

| Stage | Passed | Failed |
|---|---|---|
| Baseline, before grants (re-run 15 Oct) | 115 | 76 (expected) |
| After grants | **191** | **0** |

## Pre-apply verification (read-only)

- Neon session reports endpoint `ep-rough-water-b8fcf7pe` and branch `br-long-leaf-b8wixqz2`, which match A4.
- `neondb`: 29 public tables. Every table is classified in both the grants file and `APP_ROLE_MATRIX`. No public sequences.
- Schema hash `20f33302…deaf2` is identical to the A4 post-apply hash.
- Migration ledger: 5 applied, 0 pending, no drift, no unknown rows, in order.
- `filumire_app`: no superuser, createrole, createdb, replication or bypassrls attributes, connection limit 20, no role memberships, 0 table grants, no default privileges.
- Grants file sha256 re-checked on the apply connection, together with endpoint, branch, database, user and schema hash, immediately before submission.

## Apply

The file was sent as a single submission. Its privilege guard runs first, and its coverage check and every REVOKE/GRANT run inside its own `BEGIN … COMMIT`. The transaction committed and the connection ended idle (`I`). The schema hash is unchanged afterwards.

| Access | Tables |
|---|---|
| SELECT, INSERT | account_profiles, controlled_teacher_actions, external_identities, guardian_consent_records, learners, learning_evidence, parent_teacher_messages, pilot_measurement_events, teacher_professional_notes |
| SELECT, INSERT, UPDATE | account_credentials, auth_sessions, interventions, learner_learning_context, learner_profiles, learner_states, pending_teacher_reviews, principal_learner_access, sessions, teacher_link_codes |
| SELECT, INSERT, UPDATE, DELETE | auth_rate_limits |
| SELECT, INSERT, DELETE | principals |
| **None** | filumire_schema_migrations, all 7 payment_* tables |

The role also has schema `USAGE` (no `CREATE`) and database `CONNECT`. Nothing has TRUNCATE, REFERENCES or TRIGGER.

## Post-apply verification

- Row counts unchanged: 5 ledger rows, 0 in every other table.
- No default privileges for `filumire_app`, so future tables get no automatic grants.
- Role attributes and memberships unchanged. Ledger still consistent with 0 pending.
- The test suite runs as `filumire_app` in one transaction that is always rolled back, using zero-row statements.

## Observation for later stages

The test inserts use `insert … select … where false`, so they do not exercise column defaults. There are no sequences today, so this is not a gap now. A future migration that adds a `serial` column would need an explicit sequence decision in the grants file.
