# Preview migration-history reconciliation report (R2)

**Status: ANALYSIS ONLY — 17 October 2026.** Written offline from the R1 and R1b results. No
database was touched to write it. Nothing here authorises a write: every step in section 6 needs its
own approval, as `PREVIEW_MIGRATION_HISTORY_RECONCILIATION_PLAN.md` section 5 requires.

**Classification: case B.** `filumire-preview` has no migration-history table. 0019, 0020 and 0021
are present and match their files exactly. 0022, 0023 and 0024 are wholly absent, and there are no
unexpected objects. Proceeding needs a maintainer decision on how to record 0020 and 0021
(section 5).

## 1. Evidence used

| Step | Target | Script | Result |
|---|---|---|---|
| R0 | Neon control plane (read-only API, console session) | — | `filumire-preview` = `br-round-resonance-b8fm2nao` (parent `main`) = `ep-icy-scene-b816974r`. `integration-test` = `br-long-leaf-b8wixqz2` = `ep-rough-water-b8fcf7pe`. `main` = `br-wild-morning-b8tw4thx` = `ep-cold-bird-b8j437np`. Fourth branch: `filumire-online-test` (`ep-cold-unit-b8b6rjx3`). Both branches have database `neondb` owned by `neondb_owner` |
| R0 | Vercel (read-only API) | — | Project `filumire-learner`: `DATABASE_URL` for Production, plus a Preview override for git branch `filumire-interface-testing`. Both are type *sensitive* (write-only), so **which endpoint they name is unconfirmed** |
| R1b run 1 | integration-test / neondb | `162da2f7…094113` (commit `2883f624`) | Q0–Q7 only. The editor stopped splitting statements at the `E'\n'` in Q8 |
| R1b run 2 | integration-test / neondb, 18:35:29 UTC | `3977f9c8…ab40a2` (commit `0ec000d2`) | 20 of 20 statements, ended in ROLLBACK |
| R1 | filumire-preview / neondb, 18:37:44 UTC | `3977f9c8…ab40a2` (commit `0ec000d2`) | 20 of 20 statements, ended in ROLLBACK |

Before each run, the editor buffer's SHA-256 was checked against the committed file. Each run was
made with the branch selector showing the intended branch (screenshots were taken during the
session). Q0 on both runs: `neondb`, `neondb_owner`, not superuser, `read_only = on`, PostgreSQL
`18.6 (653b019)`. Neon timelines differ: preview `9b1954e9…`, integration-test `19176e69…`.

## 2. Method

- **R1 vs R1b, row by row.** For Q3 (relations), Q4 (columns), Q5 (constraints) and Q6 (indexes),
  every R1b row whose table is `filumire_schema_migrations` was removed. The remaining rows were
  then compared programmatically with R1, as full row strings, in order.
- **Against the files.** Each remaining object was checked against `drizzle/0019`–`0024`, whose
  hashes match `drizzle/MIGRATIONS.json`.
- **Limits:**
  - The Q8 fingerprints hash the whole public schema, so they differ by construction: integration-test
    also has the ledger table. They are recorded below as the exact pre-state to bind a later apply
    to, not as a comparison.
  - Q13 counts are statistics estimates, not exact counts.

## 3. Row-by-row comparison (R1 = preview, R1b = integration-test)

| Query | R1 rows | R1b rows | R1b without ledger rows | Rows only in R1 | Rows only in R1b | Same order |
|---|---|---|---|---|---|---|
| Q3 relations | 28 | 29 | 28 | 0 | 0 | yes |
| Q4 columns | 53 | 59 | 53 | 0 | 0 | yes |
| Q5 constraints | 64 | 72 | 64 | 0 | 0 | yes |
| Q6 indexes | 14 | 15 | 14 | 0 | 0 | yes |
| Q7 0024 view | absent | absent | — | — | — | — |
| Q9 triggers/policies | none | none | — | — | — | — |
| Q12 default privileges | 2 | 2 | — | 0 | 0 | yes |

Integration-test is a valid reference for the reviewed definitions of 0019–0022. Its ledger records
0019, 0020, 0021 and 0022 with SHA-256 values equal to `MIGRATIONS.json`
(`a7b49b27…`, `f3c77a33…`, `f4276c21…`, `7df38ca0…`). On integration-test, 0020 and 0021 therefore
came through the reviewed path, and the preview objects are identical to them.

## 4. Findings per migration on `filumire-preview`

| Migration | State | Evidence |
|---|---|---|
| baseline 0000–0018 | Present: 22 baseline tables (28 minus the six that 0019–0021 create). Same names, owner (`neondb_owner`), options and row-security flags as integration-test | Q3 |
| 0019 learner accounts | **Present, exact.** `account_credentials` (12 columns), `account_profiles` (5), `learner_profiles` (9), `guardian_consent_records` (9): types, nullability, defaults, unique keys, FKs (`ON DELETE RESTRICT`) and both guardian-consent indexes as in the file | Q4–Q6, = R1b |
| 0020 auth rate limits | **Present, exact.** `auth_rate_limits` (3 columns), PK on `key_hash`, index `auth_rate_limits_window_ends_at_idx` | Q4–Q6, = R1b |
| 0021 teacher accounts | **Present, exact.** Check is `CHECK ((account_kind = ANY (ARRAY['guardian'::text, 'learner'::text, 'teacher'::text])))`, the 0021 form. `teacher_link_codes` (9 columns), unique `code_hash`, 3 FKs, index `teacher_link_codes_learner_idx` | Q4–Q6, = R1b |
| 0022 ledger | **Absent.** No `filumire_schema_migrations`, no other history relation, no `drizzle.__drizzle_migrations` | Q1, Q2 |
| 0023 grade set by | **Absent.** `learner_learning_context` has no `grade_set_by` and no `learner_learning_context_grade_set_by_check`. That table is part of the baseline: 0023 only adds the column and check | Q4, Q5 |
| 0024 evidence view | **Absent** | Q7 |

Other facts that matter for later steps:

- **Role `filumire_app` does not exist on `filumire-preview`**, and nothing is granted to it or to
  PUBLIC (Q10, Q11). On integration-test it exists with 55 table grants.
- `neondb_owner` is a member of `neon_auth` and `neon_superuser` on preview. On integration-test it is
  also a member of `filumire_app` and `neon_service`.
- Q14: one other session (idle), none active, no advisory or blocking locks. Stop condition
  "another session holding schema locks" was not triggered.
- Q13 estimates: 0 live rows in every preview table. Indicative only.
- Q8 pre-state fingerprints for preview (bind any later apply to these):
  - 28 base tables
  - columns `a32edda08153dd80f79e67f89c6a621ba1d410dbe3717c85f339fe274800801c`
  - constraints `464828edcc99da657efea534cc6235cdd0d8ed4d8a2dfcc6ba95c59038f3a2c8`
  - indexes `b6a5358b02ee78ca4577cf671ed7c28efe8b6863b85bd38ebc8776d5793be117`
- Integration-test has 0023 and 0024 unapplied as well. Its ledger stops at 0022.

**Superseded fact.** The plan's section 1 cites an owner report that `auth_rate_limits` and
`teacher_link_codes` were absent and the check was the pre-0021 rule. That no longer holds: 0020 and
0021 reached `filumire-preview` after that report, outside the ledger. How they got there is
unrecorded. `scripts/apply-registration-preview.sql` is a likely candidate, but this is not proven.

## 5. Classification and why

- **Not A:** 0020 and 0021 objects are present.
- **B:** every 0019–0021 object matches its file and the reviewed-path result on integration-test
  exactly. 0022–0024 are wholly absent. Nothing unexpected exists.
- **Not C:** no partial or divergent object. In particular, `grade_set_by` is absent, so 0023 will
  apply cleanly. It cannot be re-run because its `ADD CONSTRAINT` has no `IF NOT EXISTS`, but here it
  is a first apply.
- **Not D:** no other history table.

**Decision for the maintainer (case B):** how 0020 and 0021 get ledger rows.

- **B1, recommended:** re-run them inside the apply transaction, as integration-test (A4) did for
  0019, and record them because they were re-run.
  - 0020 is a no-op (`IF NOT EXISTS` throughout).
  - 0021 drops and re-adds the account-kind check. That takes an ACCESS EXCLUSIVE lock on
    `account_credentials` and scans it. Q13 estimates 0 rows, and `lock_timeout` bounds the wait.
  - It converges to the observed definition. The same file produced exactly this constraint on
    integration-test, and the preview constraint is identical to it.
- **B2:** do not re-run them. Record them as "verified in effect" with a note citing this report.
  The matrix allows "re-run or verified". However, this skips the precedent of re-running, and it
  rests on a check made at 18:37 UTC rather than inside the transaction.

## 6. Proposed ledger rows and apply plan (future; nothing approved)

One all-or-nothing transaction as `neondb_owner` on `filumire-preview`, through the pinned executor
(plan W2). Before anything else:

1. Recompute the Q8 fingerprints and **abort if they differ** from section 4.
2. Abort if any 0022–0024 object or any history table has appeared.

Then, in manifest order:

| Order | Ledger id | kind | sha256 | How |
|---|---|---|---|---|
| 1 | `baseline-0000-0018` | baseline | catalog snapshot hash taken inside the transaction | Schema as found: baseline tables plus the 0019–0021 objects already present, as on integration-test |
| 2 | `0019_learner_accounts` | migration | `a7b49b2749c53f681432ee74f3b075f9d3eb5a9ca239af1d6059218a13e614a7` | Re-run as a verified no-op, recorded "in effect" (A4 precedent) |
| 3 | `0020_auth_rate_limits` | migration | `f3c77a33a20759cc7ff22f90699b3a0b639169a14b7e6e37cf1c618d5f80a74e` | B1: re-run (no-op). B2: verified, not re-run |
| 4 | `0021_teacher_accounts` | migration | `f4276c21c24d034e86acdec99ac124284b5f2adb375d5282e352021294e0ddeb` | B1: re-run, converges to the observed check. B2: verified, not re-run |
| 5 | `0022_migration_ledger` | migration | `7df38ca03de3361a1692938f7b2dbf3861fd748239e08dde0ec8eb1b5507eee5` | Apply. Creates the ledger owned by the applier |
| 6 | `0023_learner_grade_set_by` | migration | `a84adcc6dbed2f76555848fb21b89cc96e0ac390e1ddc16c34848e4bb711b633` | Apply (first apply) |
| 7 | `0024_deployment_migration_evidence` | migration | `1e4b639e464e59182153250185d067034182d96d58c834e5e8231a0e8ed455ce` | Apply as the ledger owner (same role) |

Expected post-state: Q3–Q6 on preview equal integration-test's, plus the 0023 column and check and
the 0024 view, and no other differences.

## 7. What still blocks the write phase

| Plan step | State |
|---|---|
| W1 recovery point | **Not inspected.** R0 covered branch and endpoint mapping only, not the restore window or snapshots |
| W2 executor | `apply-migrations.mjs` still refuses `ep-icy-scene-b816974r`. The pinned-identity code change is not written |
| W4 application role | **Needed:** `filumire_app` is absent on preview. Create it as a restricted SQL role, then run `scripts/sql/app-role-grants.sql` after 0024 |
| W5 / W6 | Depend on W2–W4 |
| W7 Vercel | Which endpoint Preview's `DATABASE_URL` names is still unconfirmed (sensitive value). Confirming it needs the owner, or a deliberate value check approved separately |

Raw R1 and R1b result sets are kept outside the repository (session scratchpad). They contain
catalog metadata only: no application rows and no credentials.
