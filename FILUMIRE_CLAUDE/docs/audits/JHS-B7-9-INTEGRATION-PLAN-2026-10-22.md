# Basic 7–9 integration plan — 2026-10-22 (approved and executed the same day; results in the audit report §8)

## Where things are

| Location | Repository / branch | State |
|---|---|---|
| Codex workspace `C:\Users\tabi\Documents\Codex\filumire-jhs-integration\FILUMIRE_CLAUDE` | Independent copy of `filumire-batch1`, branch `feat/jhs7-9-development` @ `29854417` | Audited and fixed (R1–R5), all passing, uncommitted |
| **Original worktree** `C:\FILUMIRE\filumire-batch1\FILUMIRE_CLAUDE\.worktrees\jhs7-9-development` | `filumire-batch1`, `feat/jhs7-9-development` @ `29854417` | 88 inherited uncommitted changes; byte-identical to the Codex baseline at audit time |
| Sibling worktrees in `filumire-batch1` | `feat/teaching-first-phase1` (root), `feat/basic4-6-completion`, `feat/basic7-science-pilot`, all @ `29854417` | 89 / 54 / 33 uncommitted changes |
| This checkout `C:\FILUMIRE\filumire` | GitHub `kodjotabi/filumire`, `filumire-six-corrections-20261013-website` @ `ae1e72de` | Different lineage (merge-base `217dc67b`; 72 vs 41 commits apart). It does not contain `29854417`. |
| GitHub `main` @ `26d81ef6` | Root commits "initial" and "Trigger deployment" | Unrelated deployment history, not the app lineage |

`filumire-batch1` has push disabled (`recovery-bundle` remote set to `DISABLED-no-push-from-batch1`).

## What "integration" means here

Bring the audited and fixed Basic 7–9 delta from the Codex workspace into the **original `feat/jhs7-9-development` worktree**, as uncommitted working-tree changes.

Standing rule (CLAUDE.md): I do not stage or commit. So **I do not merge branches**, and there is nothing to merge into `main` or GitHub. Committing on `feat/jhs7-9-development` is your step afterwards. Reconciling with the sibling worktrees and the GitHub lineage is a separate later task (see "Not in this plan").

## Manifest (82 files)

Computed fresh at execution time by hashing both trees; today it is:
- **16 modified:** placement route, learning route, dashboard, family page, layout, `account-client`, `learner-interface`, `learning-client`, `curriculum/index`, `curriculum-framework/index`, `deploy-guard`, `adult-summary`, `content-store/seed`, `learner-context/placement`, `teacher-summary`, `integration-phase1-foundation` test.
- **66 added:** the 18 new code/test/script files (including `api/presentation-scope`, `jhs-private-rollback` test, `jhs-private-policy` and manifest), 13 font files with provenance and OFL notice, and `docs/jhs-development/integration/**` evidence.

**Excluded:**
- `apps/learner/.env.production.local`: it sets `FILUMIRE_JHS_MODE=private-presentation` and a fixed fictional JWT secret. In the original it would switch Basic 7–9 on for every local `next start`, against the default-off rule. The launcher sets its own environment.
- `handoff/backup-before-jhs-audit-fixes/` (15 files): provenance stays in the Codex workspace.

**Added on top:** this audit report as `docs/jhs-development/integration/CLAUDE-AUDIT-REPORT.md`, which supersedes Codex's pre-fix handover where they differ. Also the post-fix `results.json` for the 48 Basic 7–9 journeys, the 24 Basic 4–6 journeys and the offline cases. Codex's own documents are left unedited, as history.

## Steps (in order; stop on any failure)

1. **Freeze check.** Confirm nobody is editing the original worktree. Re-hash it: it must match the audit inventory (2,257 files) exactly; any difference stops the plan. Record `git status` counts for all four `filumire-batch1` worktrees.
2. **Build the manifest** by re-hashing Codex vs original. Its contents must equal the list above; anything unexpected stops the plan.
3. **Back up the original** in `FILUMIRE_CLAUDE/handoff/backup-before-jhs-integration/`:
   - the 16 files to be overwritten (`path_with_underscores.bak`) with `SHA256SUMS`;
   - `ADDED-FILES.txt` listing the 66 (+ report and evidence) paths, which is the rollback deletion list.
4. **Copy** each manifest file byte-for-byte and verify every SHA-256 against the Codex copy.
5. **Tree check.** Re-hash the original against Codex. Expected differences are only: the excluded `.env.production.local`, the handoff backups, and the added report and evidence.
6. **Verify in the original**, logs to the scratchpad. No `node_modules` junction is added: Node resolves from `filumire-batch1/FILUMIRE_CLAUDE/node_modules`, and tools run by absolute path.
   - Offline suites: default 49, targeted 20, adaptive 10, `learner-interface-copy`, `jhs-private-rollback`, journeys (`journeys.json` hash must stay `05689ccd…`), deploy-guard foundation 51.
   - `tsc` root and learner.
   - `npm run build:learner`, which replaces the original's ignored `.next`; the prerender manifest must list 10 routes.
     The pre-Codex 14:10 build survives as a reference copy in the scratchpad.
   - Servers on 127.0.0.1 with fictional memory-only accounts: Basic 7–9 on (launcher environment) and off.
   - Browser: 48 Basic 7–9 journeys, 24 Basic 4–6 journeys, offline cases ×3, API probes on/off, and a manual French family-page check and a JHS-off family-page check.
7. **Final checks.** Re-run the tree check from step 5. Sibling worktrees' `git status` counts must be unchanged. Stop all servers. Update the report §7 and the handoff.

## Rollback

Restore the 16 `.bak` files (verify against `SHA256SUMS`) and delete the paths in `ADDED-FILES.txt`. Then re-hash: the original must equal the step-1 inventory. Ignored `.next` output is simply rebuilt.

## Stop conditions

The original changed since the audit, the manifest differs from expected, a hash mismatch after copy, or any test, build or browser failure. On a stop I report and leave the files as they are; I don't roll back automatically unless you say so.

## Not in this plan (needs your decision later)

- **Commit** on `feat/jhs7-9-development`: yours, per CLAUDE.md.
- **Sibling worktrees:** `learner-interface.ts` and `curriculum-framework/index.ts` also carry uncommitted edits in all three siblings, and `curriculum/index.ts` in `basic7-science-pilot`. Combining branches will need three-way merges.
- **GitHub lineage** (`ae1e72de`, `main`): unrelated histories; no merge or push proposed.
- **Deployment:** none. Basic 7–9 is local rehearsal only and the deploy guard refuses it on Vercel.
- **R6** (inherited offline-test race), PostgreSQL durability, and educator and French approval.
