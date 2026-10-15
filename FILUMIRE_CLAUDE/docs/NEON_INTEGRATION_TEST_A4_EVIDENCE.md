# Neon integration-test — A4 migration evidence

- **Date:** 15 October 2026, 12:01 UTC
- **Target:** branch `integration-test` (`br-long-leaf-b8wixqz2`), endpoint `ep-rough-water-b8fcf7pe` (unpooled, TLS verify-full), database `neondb`
- **Not touched:** `main`, `filumire-preview`, `filumire_test`, production
- **Tool:** `scripts/apply-migrations.mjs --execute`, unmodified, approval code `96de243b9ce8` (A3 dry run, re-verified before execution)
- **Raw evidence:** [NEON_INTEGRATION_TEST_A4_EVIDENCE.json](NEON_INTEGRATION_TEST_A4_EVIDENCE.json) (no credentials)

## Outcome

One transaction, committed. All five ledger rows carry the same `applied_at`
(`2026-10-15T12:01:17.255Z`, the transaction start time), confirming a single atomic apply.
The tool re-checked the approval code inside the transaction against the live schema
(`66f8b396…3ac3c`) before making any change.

| Ledger id | Kind | Effect on this branch |
|---|---|---|
| `baseline-0000-0018` | baseline | Catalog hash `66f8b396b22c10118662f35526f7c6475b2bbed61328335259f93f9661a3ac3c` |
| `0019_learner_accounts` | migration | **No effect — see note below** |
| `0020_auth_rate_limits` | migration | Created `auth_rate_limits` + index |
| `0021_teacher_accounts` | migration | Created `teacher_link_codes`; `account_kind` check now allows `teacher` |
| `0022_migration_ledger` | migration | Created `filumire_schema_migrations` |

## Note on 0019 (pre-existing schema)

The four 0019 tables (`account_credentials`, `account_profiles`, `learner_profiles`,
`guardian_consent_records`) were already present when `integration-test` was created
schema-only from `main`; there was no ledger to record it. A3 verified their columns,
defaults, constraints and indexes match `0019_learner_accounts.sql` exactly.

0019 ran inside the A4 transaction as designed. Every statement in it is
`IF NOT EXISTS`, so it changed nothing:

- Fingerprint of the 0019 tables' columns, constraints (excluding the `account_kind` check
  that 0021 deliberately replaces) and indexes: `93c47eeb…f204e02` before and after.
- Table OIDs identical before and after (16681, 16702, 16756, 16799): no table was recreated.

The ledger row for 0019 therefore records that the reviewed file is in effect, not that its
tables were created on 15 October. By owner decision, no database note was added; this report is
the record. The baseline hash also includes the 0019 tables.

## Post-apply verification

- `migration-ledger.mjs status`: 5 applied, 0 pending, no drift, no unknown rows, in order, consistent.
- Fresh dry run: nothing pending, no baseline needed. New schema hash `20f333021d32ac58bcad97700ba6fc3ed608ce2557460127b19831fbb05deaf2`.
- Public tables: 26 → 29. Rows: 0 → 5 (the five ledger rows only).
- `filumire_app`: still no table privileges (0 tables). A5 grants not applied.
