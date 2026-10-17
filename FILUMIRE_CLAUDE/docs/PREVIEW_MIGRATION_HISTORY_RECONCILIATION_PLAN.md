# Preview migration-history reconciliation plan

**Status: PLAN ONLY — 17 October 2026.** Nothing in this document has been run.

**Approval state (17 October 2026):** R0 approved (owner reads dashboards; no database
connection). R1b and R1 are **on hold** until the review of
`scripts/sql/preview-history-reconciliation-readonly.sql` is complete; the reviewed file's SHA-256
will be restated with any later approval. Recommended order once released: R0 → R1b → R1. This
safeguard exists because earlier "Preview" work read `ep-cold-bird-b8j437np`, now labelled `main`. No database,
Neon, Vercel or GitHub system was contacted to prepare it; it is built from evidence already in
this repository. Every step below needs its own explicit approval for the exact target, and this
document authorises none of them.

Goal: give the `filumire-preview` database a migration ledger (`filumire_schema_migrations`) that
truthfully records its history, so migrations 0020–0024 can later be applied through the reviewed
path and the deployment guard can pass there. The ledger must be **reconciled from evidence, never
manufactured**: every row we record must be backed by an observed, matching schema state.

## 1. What the repository already establishes

| Fact | Source | Strength |
|---|---|---|
| Neon project `proud-term-61114809` (Vercel resource `neon-champagne-school`, Free plan) | `PRIVATE_PREVIEW_MIGRATION_READINESS.md` (control-plane GET, 10 Oct) | Verified metadata |
| `filumire-preview` = branch `br-round-resonance-b8fm2nao` | `PRIVATE_PREVIEW_0020_0021_PROPOSAL.sql`, `apply-registration-preview.sql` | Recorded by earlier work; not re-verified |
| `filumire-preview` endpoint = `ep-icy-scene-b816974r`; `main` endpoint = `ep-cold-bird-b8j437np` | `NEON_INTEGRATION_TEST_A6_PLAN.md`, `apply-migrations.mjs` deny list (15 Oct) | Recorded by later work; not re-verified |
| On `filumire-preview`: 8 of 10 account prerequisite tables present; `auth_rate_limits` and `teacher_link_codes` absent; account-kind check is the pre-0021 guardian/learner rule; 42 constraints validated; `learners.id`/`principals.id` are text | Owner-supplied SQL Editor results, top of `PRIVATE_PREVIEW_MIGRATION_READINESS.md` | Owner-reported, date unrecorded |
| No migration ledger on `main` or `filumire-preview` | A6 plan (lineage argument); 10 Oct baseline | Inference, not a direct check of `filumire-preview` |
| 0019 tables can pre-exist with no ledger; precedent: they were recorded as "in effect" after an exact-definition check, and 0019 re-ran as a no-op | `NEON_INTEGRATION_TEST_A4_EVIDENCE.md` (integration-test) | Verified precedent, different branch |
| Migration SQL hashes 0019–0024 | `drizzle/MIGRATIONS.json` | Verified locally |

Not established at all: when or how 0019 (or earlier work) reached `filumire-preview`, whether any
0020/0021 SQL was run there since the owner's check, whether `grade_set_by` (0023) exists there,
whether role `filumire_app` exists there, and what recovery point exists.

## 2. Blocking finding: two names for one endpoint

The 10 October "Preview" work pinned **`ep-cold-bird-b8j437np`**: `PRIVATE_PREVIEW_READ_ONLY_BASELINE.json`,
`PRIVATE_PREVIEW_SAFETY_EVIDENCE.json`, `scripts/private-preview-guards.mjs` (`TARGET`),
`scripts/private-preview-safety-preflight.mjs`, and the `FLPREVIEW_*` variables in the git-ignored
`.vercel/.env.preview.private.local`. The 15 October Neon work labels that same endpoint **`main`
(production)** and gives `filumire-preview` a different endpoint, `ep-icy-scene-b816974r`.

`PRIVATE_PREVIEW_REGISTRATION_PREPARATION.md` already flagged that the `FLPREVIEW_*` credentials'
mapping to `filumire-preview` was unverified. Consequences until resolved:

- The 10 October baseline (26 tables, schema `5af0c142…`, row counts) is **not evidence about
  `filumire-preview`**. It is most likely a read of `main`.
- The `private-preview-*` scripts and the `FLPREVIEW_*` variables must **not** be used for this
  reconciliation: they point at the endpoint now labelled production.
- Vercel's generic `DATABASE_URL` is scoped to Production **and** Preview; only branch
  `filumire-interface-testing` has a Preview override. Which database each Preview deployment
  actually uses is unproven.

R0 below resolves the mapping. Re-pointing or retiring the `private-preview-*` tooling is a separate
code change, after R0.

## 3. Steps that need approval now (read-only)

### R0 — Control-plane facts (you, in the Neon and Vercel dashboards; no SQL)

Inspect only. Don't click Create, Restore, Reset, Delete or Save. Report these non-secret identifiers:

1. For project `proud-term-61114809`, every branch: name, branch ID, parent, root or child, and each
   endpoint ID (read-write or read-only).
2. Confirm or correct: `filumire-preview` = `br-round-resonance-b8fm2nao` = `ep-icy-scene-b816974r`;
   `main` = `ep-cold-bird-b8j437np`.
3. The endpoint host behind Vercel Preview's `DATABASE_URL` override (branch
   `filumire-interface-testing`), and behind the generic `DATABASE_URL`, read from the Neon
   integration or connection-details page. Report hostnames only, never connection strings.
4. Recovery for `filumire-preview`: history window, earliest restorable point, any existing snapshot
   (ID, time, expiry), and who has permission to restore. If nothing is usable, say so.

### R1 — One read-only SQL run on `filumire-preview` (you, in the Neon SQL Editor)

Run `scripts/sql/preview-history-reconciliation-readonly.sql` with `filumire-preview` selected,
database `neondb`. It runs a single `BEGIN READ ONLY … ROLLBACK` transaction made only of SELECTs, with
`statement_timeout` 30s and `lock_timeout` 5s. It reads:

- identity and server version
- every migration-history table in any schema (including Drizzle's `drizzle.__drizzle_migrations`),
  plus their rows if present
- every public relation with owner and options
- columns, constraints and indexes of each object that 0019–0024 create or change, and the 0024 view
  definition if present
- schema-wide fingerprints
- the `filumire_app` role, its privileges and default privileges
- row-count estimates
- concurrent sessions and locks

It returns no application row contents and no credentials. Paste or export the result sets, along
with a screenshot of the editor's branch selector, as the binding between the results and the
branch.

Why the SQL Editor rather than a script on this machine: no credential for `filumire-preview` exists
locally, and the local tooling either refuses that endpoint (`apply-migrations.mjs`,
`test-app-role-permissions.mjs`) or is pinned to `main` (`private-preview-*`). Nothing new has to
be shared.

**Optional R1b:** the same file on `integration-test` (`br-long-leaf-b8wixqz2`). That gives a
reference for the exact reviewed definitions of 0019–0022 produced by this same SQL, so the comparison
doesn't depend on hand-reading. It's also read-only and needs the same kind of approval.

### R2 — Offline analysis (Claude, no access)

I compare the R1 results against the reviewed SQL files (and against R1b, if you approve it), then
write a reconciliation report that classifies the branch into one of the cases below. The report
proposes the exact ledger rows and the exact apply plan for that case.

## 4. Reconciliation decision matrix

| Case | Observed on `filumire-preview` | Proposed ledger outcome (future, needs approval) |
|---|---|---|
| **A** | No history table. All four 0019 tables match `0019_learner_accounts.sql` exactly. 0020–0024 objects wholly absent. No unexpected objects | Same as the A4 precedent. In one transaction: `baseline-0000-0018` (catalog hash taken inside it), 0019 re-run as a verified no-op and recorded as "in effect", then 0020–0024 applied and recorded. 0022 creates the ledger as the applying owner; 0024 then succeeds as the same owner |
| **B** | As A, but 0020 and/or 0021 already present, and **exactly** matching their files (for example, the registration SQL was run by hand) | Maintainer decision required. Re-running 0020 is a no-op (`IF NOT EXISTS`). 0021 drops and re-adds the account-kind check (an ACCESS EXCLUSIVE lock plus a full scan), so it must be shown to converge to the same definition before it is recorded. Record nothing that was not re-run or verified |
| **C** | Partial, divergent or unknown objects (for example, `grade_set_by` present without its check; 0023 is **not** re-runnable because it uses `ADD CONSTRAINT` without `IF NOT EXISTS`), or definitions differing from the files | **Stop.** No ledger. The maintainer explains each difference; any repair becomes a new reviewed migration, never an edited one |
| **D** | Another history table exists (a Drizzle journal or a ledger) | **Stop.** Its rows are compared against the manifest first. Nothing is recorded that contradicts it |

The baseline row's meaning stays as `MIGRATIONS.json` defines it: the schema as found before the
ledger, including any 0019 tables already present (as on integration-test).

## 5. Later write phase (listed only; nothing here is approved)

Each step needs separate approval with the exact target, the plan, and an approval code bound to
the schema.

1. **Recovery point (W1):** a usable, inspected recovery point for `filumire-preview`, from R0, or
   created with approval.
2. **Executor (W2):** the reviewed `apply-migrations.mjs` hard-refuses `ep-icy-scene-b816974r` by
   design. The recommended route is a reviewed code change that adds one pinned `filumire-preview`
   identity to that tool, with the deny list kept for every other endpoint. That keeps its dry-run
   approval code bound to target, plan and schema hash, and its single all-or-nothing transaction.
   A hand-run SQL Editor transaction can't compute the reviewed catalog hash for the baseline row,
   so it isn't recommended for case A.
3. **Apply (W3):** run the case A plan (or the reconciled B plan) in one transaction.
4. **Application role (W4):** if `filumire_app` is absent (Q9), create it as a restricted SQL role
   (never through the Neon console, which adds `neon_superuser` membership). Then run
   `scripts/sql/app-role-grants.sql`, which also checks 0024's view.
5. **Permissions (W5):** run `test-app-role-permissions.mjs`. It needs the same pinned-identity
   change, because it also refuses this endpoint.
6. **Deployment guard (W6):** run read-only with the Preview environment and the application role's
   credentials.
7. **Vercel (W7):** align Preview's `DATABASE_URL` and `FILUMIRE_DB_HOSTS_PREVIEW` with the R0
   mapping. This is an infrastructure change and needs its own approval.

## 6. Stop conditions

Stop and report if any of these happen:

- R0 contradicts the mapping in section 1.
- The R1 identity, branch screenshot or server version doesn't match `filumire-preview`.
- R1 shows another session holding schema locks.
- R1 finds case C or D.
- No usable recovery point exists and creating one isn't approved.

## 7. Approval requested

Only these two read-only steps:

- **R0:** you read and report the control-plane facts listed above (no changes).
- **R1:** you run `scripts/sql/preview-history-reconciliation-readonly.sql` once in the Neon SQL
  Editor on `proud-term-61114809` / `filumire-preview` / `neondb`, and share the results and the
  branch-selector screenshot.

R1b is optional. All writes in section 5 stay unapproved.
