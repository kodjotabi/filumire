# Neon A6 — guardian-to-learner journey on a disposable branch: evidence

- **Date:** 15 October 2026, 13:20:23–13:25:57 UTC (one execution, no retry)
- **Target:** disposable branch `a6-journey-20261015` (`br-snowy-snow-b8i4ywsf`), endpoint `ep-lingering-cherry-b85g3en5` (unpooled, TLS verify-full), database `neondb`, project `proud-term-61114809`
- **Parent:** `integration-test` (`br-long-leaf-b8wixqz2`), current data. Branch created 2026-10-15T12:48:35Z, expires 2026-10-16T12:48:35Z.
- **Roles:** the journey ran as `filumire_app` only. `neondb_owner` was used only for read-only snapshot sessions and the read-only catalog session of the A5 suite.
- **Not touched:** `main`, `filumire-preview`, `integration-test`, production; no grants changed, no migrations, no deploy, no payments
- **Approval code:** `afb0318cc47c`, re-computed by the runner from the live branch immediately before execution and matched
- **Runner:** `scripts/test-neon-integration-journey.mjs`, sha256 `265e6185afb49592f6dcf0fcb816911b022cf094b741d0a791811d4ee0cef450` (uncommitted)
- **Journey test:** `tests/account-registration-journey.test.ts`, sha256 `9acb646022d2a798788cb9155759023b51cc0a6c1e11c18b25f67e420d2dbd1c` (uncommitted, +9 lines for branch disposal)
- **Permission suite:** `scripts/test-app-role-permissions.mjs`, sha256 `65753cfc44e3ac519987c2c54008ad91791715ab1f420c45951994b68e792198`, unmodified
- **Raw evidence:** [NEON_INTEGRATION_TEST_A6_EVIDENCE.json](NEON_INTEGRATION_TEST_A6_EVIDENCE.json), sha256 `b93ace6d3cdd8084a5199005bb19578f6830eafc754b300ca80e8e4c33b6c484` (no credentials)
- **Branch manifest:** [NEON_INTEGRATION_TEST_A6_BRANCH_MANIFEST.json](NEON_INTEGRATION_TEST_A6_BRANCH_MANIFEST.json), sha256 `30472bf6b25b70f235c57cb52b4e9c2908e898bb27b8152741610fa096b474fe`, byte-identical to the quarantine copy (IDs and times only)

## Outcome

**Passed.** Journey 21/21 on PostgreSQL with exit 0; post-run diff clean; A5 permission suite 191/191 afterwards.

| Stage | Result |
|---|---|
| Runner self-test (offline) | 59 / 59 |
| Read-only `--check` (twice, before and after a pre-run A5 suite) | lineage verified, writes none, code `afb0318cc47c` both times |
| A5 suite before the journey (rollback-only) | 191 / 191 |
| Journey (`--execute`) | 21 / 21, exit 0, no signal, persistence `postgres` |
| Post-run snapshot diff | no problems |
| A5 suite after the journey (rollback-only) | **191 / 191**, 0 failed |

## Pre-run verification (read-only)

- Both connection strings are direct (no `-pooler`), on host `ep-lingering-cherry-b85g3en5.c-14.us-east-1.aws.neon.tech`, database `neondb`, with only TLS query parameters.
- The manifest passed `validateBranchManifest`: parent `integration-test`, branch not the parent, endpoint not `main`, `filumire-preview` or `integration-test`, expiry within 7 days, no extra fields.
- Each live session reported Neon `project_id` `proud-term-61114809`, `branch_id` `br-snowy-snow-b8i4ywsf` and `endpoint_id` `ep-lingering-cherry-b85g3en5`; `current_user` = `session_user` = the expected role; not superuser.
- Lineage: schema hash `20f33302…deaf2`; the ledger holds exactly the 5 A4 rows, all `applied_at = 2026-10-15T12:01:17.255Z`; `filumire_app` privileges equal the A5 matrix; no elevated attributes, connection limit 20, no memberships or default privileges; 0 rows in every table except the ledger.

## Journey

All 21 checks passed:

1. registration validates input and requires guardian consent
2. production registration stays closed until explicitly opened
3. guardian registers and is signed in; duplicate email rejected
4. guardian session reaches account pages but not learner endpoints
5. guardian adds a learner; consent recorded per learner, unverified
6. passwords are stored as salted scrypt hashes
7. failed sign-in does not reveal whether an account exists
8. learner signs in with own username and lands on own learner
9. onboarding rejects a missing or unsupported grade and writes nothing
10. learner completes onboarding; profile and grade saved on the server
11. signed-in learner reaches the adaptive learning engine
12. sign-out revokes the server session
13. returning learner continues with saved progress and profile
14. guardian switches into and out of a child's learning
15. learner session stays bound to the learner
16. families are isolated from each other
17. guardian resets a learner's password; learner's old sessions end
18. guardian changes own password and signs out other devices
19. account locks after five failed attempts
20. parallel wrong guesses still lock the account
21. sign-in attempts are rate limited per address

- Final markers: `accountJourneyTest: 'PASS', checks: 21, persistence: 'postgres'` and `testDataDisposal: 'neon-branch', rowsDeleted: 0`.
- stderr held 3 lines, all expected rejections from negative-path checks: an unauthenticated learning request (no learner chosen), an invalid production session, and an adult requesting a learner not authorised for that principal.
- All data is fictional. Clean-up is by branch deletion; no role deleted any row.

## Database changes (before → after)

| Table | Rows added |
|---|---|
| auth_sessions | +9 |
| pilot_measurement_events | +6 |
| guardian_consent_records | +5 |
| account_credentials | +3 |
| principals | +3 |
| account_profiles | +2 |
| principal_learner_access | +2 |
| interventions | +1 |
| learner_learning_context | +1 |
| learner_profiles | +1 |
| learner_states | +1 |
| learners | +1 |

- Created: 3 principals (`80367d3e-dac6-42b9-acfd-151f84f59259`, `abd80adc-7c49-465b-9727-4da60ccc07bb`, `fdc6db21-f8bb-429f-96ea-e02ceb497ec2`) and 1 learner (`learner-1e5138a0-ab36-4f2e-b2ec-a598d3470d56`), as planned.
- Every table that grew is in the runner's allowed list. `auth_rate_limits` ended at 0 rows (emptied by the test's rate-limit reset, the one permitted reduction). No other rows were removed.

## Post-run verification

- Schema hash unchanged: `20f333021d32ac58bcad97700ba6fc3ed608ce2557460127b19831fbb05deaf2`.
- Migration ledger unchanged: the same 5 rows and timestamps.
- All 7 payment tables (`payment_attempt_events`, `payment_attempts`, `payment_exceptions`, `payment_obligation_beneficiaries`, `payment_obligation_events`, `payment_obligations`, `payment_receipts`): 0 rows before and after.
- `filumire_app` grants identical to before; A5 suite 191/191 (29 catalog grants, 145 per-table statements, 5 ledger protections, 12 role and structure checks), all in one transaction that was rolled back.
- The JSON and this file were scanned for `postgres://`, `postgresql://` and `npg_`: no matches. The word "password" appears only in test names.

## Clean-up

- **Branch deleted:** `a6-journey-20261015` (`br-snowy-snow-b8i4ywsf`), endpoint `ep-lingering-cherry-b85g3en5`, deleted by the owner in the Neon console before 2026-10-15T13:45Z (exact console time not recorded). This removed the fictional rows; no DELETE privilege was used.
- **Old target no longer reachable:** re-running `--check` with the A6 manifest and credentials failed to connect (`28P01`) for both roles. Those same credentials still work on `integration-test`, so the refusal is caused by the endpoint being gone. Neon returns the same `28P01` for an endpoint ID that never existed, so the console's branch list remains the authoritative confirmation.
- **`integration-test` unchanged** (read-only session, 2026-10-15 ~13:44 UTC; Neon reported branch `br-long-leaf-b8wixqz2`, endpoint `ep-rough-water-b8fcf7pe`):
  - schema hash `20f33302…deaf2`
  - ledger: the same 5 A4 rows, all `2026-10-15T12:01:17.255Z`
  - `filumire_app` grants equal the A5 matrix on all 29 tables; role attributes, connection limit 20, no memberships, no default privileges
  - row counts: 5 in the ledger, 0 in every other table (0 principals, 0 learners, 0 in all payment tables)
  - the A5 permission suite was not re-run on `integration-test` in this clean-up (catalog checks only)
- **Credentials:** `.env.neon-a6-journey.local` overwritten (random, then zeros) and deleted at 2026-10-15T13:45Z. Its role passwords were the same as `integration-test`'s and stay valid there through `.env.neon-integration-test.local`. On an SSD, overwriting does not guarantee the old blocks are erased.
- **Preserved:** this file, the JSON evidence, the manifest in `docs/` and the manifest in the quarantine folder (sha256 `30472bf6…74fe`).
- Nothing is committed.
