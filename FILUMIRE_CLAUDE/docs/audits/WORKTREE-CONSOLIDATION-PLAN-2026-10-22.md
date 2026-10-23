# Worktree consolidation plan — 2026-10-22 (approved and COMPLETED the same day — see "Execution status")

Goal: one reliable FILUMIRE application in a single working tree, uncommitted, fully verified. No deployment.

## Current state (read-only survey)

All four `filumire-batch1` worktrees sit on the same commit, `29854417`, and differ only in uncommitted work. Generated output (`.next`, `node_modules`) is excluded; FILUMIRE_CORE is listed by name only.

| Worktree (branch) | Changed paths | Not already in JHS |
|---|---|---|
| `jhs7-9-development` (`feat/jhs7-9-development`) | 599 | — (most complete; holds the audited Basic 7–9 integration) |
| `basic7-science-pilot` | 55 | 7 docs only. Everything else is identical or older than JHS. |
| `basic4-6-completion` | 200 | **30 code files** (approved Basic 5 completion tranche: 104 bilingual records, B5 Computing/Science specs and indexes, 9 audit scripts, 9 tests) and 147 docs |
| root (`feat/teaching-first-phase1`) | 358 | **218 `FILUMIRE_WEBSITE` files**, 78 docs, `.claude/launch.json` (+86 lines of launch configurations) |

Across all four: 1,003 paths are unique to one worktree, 72 are identical wherever they appear, and **8 genuinely differ**. A line-level check against `HEAD` shows how each resolves:

| Path | In | Resolution |
|---|---|---|
| `apps/learner/services/learner-interface.ts` | all | JHS contains every other version's additions; take JHS. |
| `packages/curriculum-framework/index.ts` | all | JHS generalises root's B7-only registry lines to B7–9 and adds the gate; take JHS. |
| `packages/curriculum/index.ts` | b7sci, jhs | JHS replaces b7sci's B7-only registration guard with the general CCP runtime; take JHS. |
| `tests/immediate-correction.test.ts` | all | Assertion wording variants of equal strength. JHS (= b7sci) has both the presence and the substance assertions; take JHS. |
| `tests/b7-framework-registration.test.ts` | root, b7sci, jhs | JHS keeps b7sci's parent assertions and resolves source paths through `ccpSourcePath`; take JHS. |
| `tests/basic7-materials-pilot.test.ts`, `tests/fixtures/basic7-materials-pilot.ts` | b7sci, jhs | JHS is the later adaptation; take JHS. |
| `tests/b4-framework-registration.test.ts` | all | **Real divergence:** b46 and JHS type the learning overview differently. Hand-merge to keep every assertion from both, then confirm it compiles and passes against the consolidated code. |

## Proposal

**Target:** the `jhs7-9-development` worktree. It is the superset for 7 of the 8 conflicts and already holds the verified integration. The other three worktrees are left untouched as references, with nothing deleted, until you have committed.

**Steps (stop on any failure):**
1. **Freeze check.** Hash all four worktrees and compare with this survey; any drift stops the plan.
2. **Backup.** In the target, `FILUMIRE_CLAUDE/handoff/backup-before-worktree-consolidation/`: every file to be overwritten, `SHA256SUMS`, and `ADDED-FILES.txt` for rollback.
3. **Bring in Basic 4–6** (b46 → target): the 30 code files and 147 docs, byte-for-byte with hash verification. Then hand-merge `b4-framework-registration.test.ts`.
4. **Bring in root:**
   - the 218 `FILUMIRE_WEBSITE` files and 78 docs;
   - `.claude/launch.json` merged by configuration name, adding the new entries without dropping existing ones.
5. **Bring in b7sci's 7 docs.**
6. **Pinned Basic 5 baselines (needs your OK).** `b7-existing-curriculum-regression` pins every primary subject's curriculum data hash, so the approved Basic 5 tranche will legitimately change the **B5 Computing and B5 Science** pins. I will:
   - first show that only those two pins fail, and that the data diff equals the tranche's documented additions (Basic 5 now 134/67/29/82; all other totals unchanged);
   - only then update those two expected hashes.
   No other test or threshold changes.
7. **Verify in the target.**
   - TypeScript (root, learner).
   - All offline suites (49 + 20 + 10 + rollback + journeys + deploy guard), plus b46's own: `b5-completion-*`, `b4-6-source-reconciliation`, `b5-science-life-processes-integrity`, `b5-computing-v1`, `b5-science-v1`, `outline-visuals`.
   - Production build (10 prerendered routes).
   - Browser: Basic 7–9 48, Basic 4–6 24, offline ×3, b46's `b5-completion.browser.mjs`.
   - API probes on and off.
   - `FILUMIRE_WEBSITE`: run its own checks if it defines any; otherwise report it as not separately verified.
8. **Final.** Re-hash; the three source worktrees must be unchanged. Stop servers. Update the report and the handoff.

**Rollback:** restore from the step-2 backup and delete the paths in `ADDED-FILES.txt`.

## Not in this plan

- **GitHub line** (`C:\FILUMIRE\filumire`, `ae1e72de`; 41 commits since merge-base `217dc67b`). Its source differs from `29854417` in about 2,000 files (mostly handoff/audit docs, learner interface and FILUMIRE_CORE). Much of it may already have been ported under different commits, but that is unverified. This needs its own read-only comparison, then your decision on which repository is canonical. GitHub `main` is an unrelated two-commit deployment history.
- **Commits** (yours, per CLAUDE.md); deleting the redundant worktrees afterwards; any deployment.

## Execution status (22 Oct 2026) — completed

Done in the target `jhs7-9-development` worktree (uncommitted, nothing staged):
1. **Freeze check:** 0 drift since the survey.
2. **Backup:** `FILUMIRE_CLAUDE/handoff/backup-before-worktree-consolidation/` holds 16 `.bak` files with verified `SHA256SUMS`, `MODIFIED-FILES.txt`, and `ADDED-FILES.txt` (468 paths).
3. **Copy:** 480 files, 0 hash mismatches: root 296 (218 website, 78 docs), Basic 4–6 177, Basic 7 science 7. The 13 target files overwritten were still at `HEAD`.
4. **Merges:**
   - `b4-framework-registration.test.ts`: JHS's typed structure plus Basic 4–6's area-specific message. The assertion is unchanged; passes.
   - `.claude/launch.json`: root's strict superset. Three new entries point at Codex's machine-local Node runtime.
5. **Pins:** **B5 Computing re-pinned.** The diff is exactly the approved tranche: +3 competencies, +4 nodes, +78 records, nothing existing changed.

**Paused because three more pins change, and you approved only B5:**

| Pin | Change (field-level, verified) | Source |
|---|---|---|
| B5 Science | Tranche: +1 competency, +1 node, +26 records. **Plus** 4 existing records (life-processes-001 lesson and scaffold, EN/FR): respiration wording "from food with oxygen" → "in its cells"; version 1.0 → 1.1. | Tranche, plus the earlier Basic 4–6 Science wording repair the tranche report says it "preserved" |
| B4 English | 2 records (proper-common-nouns-001 diagnostic-capital, EN/FR): `targetSubskills` + `recognise_common_noun`; version 1.0 → 1.1. Prompts and answers unchanged. | Documented in the tranche report ("only those four existing question records changed tags and versions") |
| B4 Computing | 2 records (data-collection-tools-001 transfer-attendance, EN/FR): `targetSubskills` + `identify_data_collection_tool`; version 1.0 → 1.1. | Same |

All other 8 Basic 4–6 subjects' fingerprints are unchanged.
Not yet run: step 7 (full verification) and step 8 (final checks).

### Completion (after approval to re-pin B5 Science, B4 English, B4 Computing)

The three pins were updated with comments naming the exact approved change. `b7-existing-curriculum-regression` passes, with all 12 subjects pinned.

**Verification in the consolidated `jhs7-9-development` tree**
- TypeScript root and learner: pass.
- Offline suites:
  - 49/49 default, 20/20 targeted, 10/10 adaptive, 2/2 extra;
  - **11/11 Basic 4–6 and Basic 7 suites:** `b5-completion-curriculum`, `-existing-content`, `-journey`, `b4-6-source-reconciliation`, `b5-science-life-processes-integrity`, `b5-computing-v1`, `b5-science-v1`, `b4-framework-registration`, `b7-framework-registration`, `immediate-correction`, `basic7-materials-pilot`;
  - journeys 1/1 (`journeys.json` hash unchanged); deploy-guard foundation 51.
- Learner production build: pass, build `ymDL3HBsrdHOVdF_g7xjP`, 10 prerendered routes.
- Browser: Basic 7–9 48/48; **Basic 5 completion 8/8**; Basic 4–6 24/24; offline 12/12 over 3 runs.
- API probes: on 39/40, off 29/30 (the known auditor expectation). With JHS off, placement offers Basic 4/5/6 only; Basic 5 subject topics are now 29/82/67/134.
- **Website:**
  - typecheck pass; unit tests **69/69**.
  - The production build **fails inside the target** with a Next.js invariant, because the target has no `FILUMIRE_WEBSITE/node_modules` and resolves React/Next from the learner's dependencies.
  - A byte-identical copy of the target website, linked to its real `node_modules` (`filumire-batch1/FILUMIRE_WEBSITE/node_modules`), **builds and passes the local link check**. So this is environment, not code.
  - I removed the partial, git-ignored `FILUMIRE_WEBSITE/.next` my failed build created.

**Final checks**
- The three source worktrees have zero drift from the survey, and their status counts are unchanged (89 / 54 / 33).
- The target now shows 218 status entries (folded directories); nothing is staged and HEAD is `29854417`.
- All 480 copied files still match their sources. Backups are intact. All servers are stopped.

**Setup notes for this tree**
- `node_modules`: the learner resolves via the parent `filumire-batch1/FILUMIRE_CLAUDE/node_modules`. The website needs its own (install, or a junction to the root worktree's).
- Local learner builds need `FILUMIRE_PERSISTENCE=memory` and an unreachable `DATABASE_URL`, or a real database configuration.
- `scripts/start-jhs-private.ps1` assumes a local `node_modules`.
- Three new `.claude/launch.json` entries point at Codex's machine-local Node runtime.
