# PostgreSQL read-only gate checks — proposal (2026-10-23; nothing run)

Scope: Neon project `proud-term-61114809` (Vercel resource `neon-champagne-school`, Free plan) and branch `filumire-preview`. **No database writes, no DDL, no role creation, no restore, no Vercel or Neon setting changes.** It builds on the repository's reconciliation plan and report (`docs/PREVIEW_MIGRATION_HISTORY_RECONCILIATION_PLAN.md` / `_REPORT.md`, 17 Oct).

## Already established (17 Oct, recorded)

- **Branch and endpoint mapping (R0):**
  - `filumire-preview` = `br-round-resonance-b8fm2nao` (parent `main`) = `ep-icy-scene-b816974r`;
  - `main` = `br-wild-morning-b8tw4thx` = `ep-cold-bird-b8j437np`;
  - also `integration-test` and `filumire-online-test`.
- **Schema (R1/R1b, read-only, ended in ROLLBACK):** case **B**. The 0000–0018 baseline is present; 0019, 0020 and 0021 are present and exactly match their files; 0022 (ledger), 0023 (`grade_set_by`) and 0024 (evidence view) are absent; no history table exists; nothing unexpected. Role `filumire_app` is absent.

## Checks proposed now (all read-only)

| ID | Gate | What I check | How |
|---|---|---|---|
| **G1** | Branch isolation (re-confirm) | The mapping above is unchanged. `filumire-preview` is its own branch with its own compute endpoint. No other branch or endpoint shares it, and it is not Neon's default or primary branch. | Neon console: Branches page and each branch's details (read only) |
| **G2** | Which database each Vercel environment uses | The Neon integration's branch per environment: Production → ?, Preview → ?, plus the `filumire-interface-testing` Preview override. **The pass condition: Preview never resolves to `main` or Production's endpoint.** Values are sensitive, so I read only integration and branch mappings, never the URL or password. | Vercel → Storage → `neon-champagne-school` and Settings → Environment Variables (names, targets, and which integration created them; not values) |
| **G3** | Recovery point (W1) | The restore (history retention) window, the earliest restorable time for `filumire-preview`, and any existing snapshot or backup branch with its age. Whether this window is enough to undo a failed migration. | Neon console: project settings → history retention; branch → Restore page **(view only, never click Restore)** |
| **G4** | Migration history still case B | Re-run the **pinned read-only script** `scripts/sql/preview-history-reconciliation-readonly.sql` (LF-normalised SHA-256 `3977f9c8bb322f5626483a38c4e9f0ed8385ac9ecfe59a3ab175b2c904ab40a2`, verified today). It is 20 statements in a `READ ONLY` transaction ending in `ROLLBACK`. Pass: results identical to 17 Oct (0022–0024 still absent, nothing new), and no concurrent migration or locks. | Neon SQL Editor on **`filumire-preview` only**; confirm the editor shows 20 statements before running |
| **G5** | Production binding (information only) | Which branch and endpoint Production's `DATABASE_URL` names (from the integration mapping), without reading the value. Needed to decide where reviewers' data will live. | Same pages as G2 |

**Outputs:** an evidence file of catalogue metadata only (no application rows, no credentials), kept outside the repository, plus a short summary added to the readiness report. Each gate gets PASS, FAIL or "needs owner decision".

## Access I need from you

1. **Neon console sign-in** in the built-in browser. Your Neon project was created through Vercel, so this is usually Vercel → Storage → `neon-champagne-school` → "Open in Neon", or `console.neon.tech` with the same login. **You sign in; I never handle passwords, API keys or connection strings.**
2. **Vercel stays signed in** in the built-in browser (it may ask again, as it did last time) for G2/G5.
3. **Explicit approval to run G4** on `filumire-preview`, naming hash `3977f9c8…`. I paste the script exactly as reviewed and check the statement count before running. I will not run it on `main`, `integration-test` or any other branch without separate approval.
4. Nothing else. No Neon API key and no database credential are needed.

If you'd rather run G4 yourself, I'll give you the exact file and steps, and you paste the result sets back.

## Decisions these checks feed (later; each is a separate approval)

- **Where reviewers' data lives:** `filumire-preview` (after migrations) versus a fresh dedicated branch for the review. **I'd recommend a dedicated review branch created from the migrated preview,** keeping test history apart from real reviewers.
- **Case B recording:** B1 (re-run 0020/0021 as no-ops) or B2 (verify and record without re-running). Then the reviewed write phase W1–W7: recovery point, pinned executor, one transactional apply, `filumire_app` role and grants, permission test, deploy guard, Vercel alignment.
- **Durability test** on that isolated branch only, after the write phase.
