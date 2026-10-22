# Phase 8E retention blocker repair

Subsequent verification: [FINAL-VALIDATION-REPAIR.md](FINAL-VALIDATION-REPAIR.md) resolves the route-test contract mismatch and root TypeScript errors recorded below. Current complete validation is 127/133; six payment suites remain blocked by an implementation found only on unmerged history. The original 125/133 findings below describe the retention-repair stage.

Date: 22 October 2026. Branch: `feat/basic7-science-pilot`. All changes are confined to the existing isolated worktree project at `C:/FILUMIRE/filumire-batch1/FILUMIRE_CLAUDE/.worktrees/basic7-science-pilot/FILUMIRE_CLAUDE`.

**Outcome:** the later-revision blocker is repaired. Basic 4–7 Science teaching-first journeys now deliver due retention questions in English and French and score correct/incorrect answers through the existing API. The repair is ready for review; Phase 8E is **not yet unconditionally cleared for integration**, because full repository validation and root TypeScript checks still expose inherited failures described below. Basic 7 remains hidden publicly.

## Exact cause

1. A learner acknowledges the introductory explanation. `acknowledgeIntervention` records a completed `teach` intervention with `outcome=not_yet_evaluated`, but no assessment evidence. Acknowledgement correctly awards no mastery.
2. The worked example has its own intervention. Guided practice and later independent checks are attached to that example or subsequent interventions. Consequently, the first explanation legitimately has no directly attached evidence even after the learner acquires the competency.
3. For explicitly selected topics, `currentTeachingCycle` correctly ends once the worked example has evidence. For initial introductions, the adaptive engine also correctly leaves introduction mode once questions have been answered. Neither mechanism deletes or invents evidence for the earlier explanation.
4. `buildRevisionSummary` correctly computes a due review after the retention interval. However, `unansweredActivities` used to classify every acknowledged, unevaluated teaching intervention as pending forever unless evidence referenced that exact intervention ID.
5. This disagreed with `makeAdaptiveDecision`'s existing `instructionToCheck` rule: acknowledged teaching is eligible for a check only when its completion is at or after the latest evidence on that competency. Older acknowledged instruction is already treated as superseded by later assessed work.
6. The stale explanation made `canStart=false`. The adaptive continuity guard treated it as current unfinished work and suppressed the due review. A completed single-topic pilot consequently returned `complete`; other subjects could resume ordinary work instead of reviewing.

Before the correction, the new real-journey regression reproduced the same blocked review in **all eight initial-introduction combinations: Science Basic 4, 5, 6 and isolated 7 × EN/FR**. The defect is in shared lifecycle handling, not Basic 7 curriculum data.

## Smallest correction

Only `services/learner-path/revision.ts` changes shared learner behavior. It derives the latest evidence timestamp **per competency** and excludes acknowledged instruction completed strictly before later evidence on that same competency from pending work. This aligns the revision guard with existing adaptive check selection.

It continues to protect:

- Active teaching, delivered unanswered questions and delivered unanswered retention checks.
- Acknowledged teaching without later same-competency evidence.
- New scaffold/remediation teaching after earlier evidence.
- Equal timestamps and incomplete historical completion timestamps, conservatively.
- Learner/subject/competency boundaries and existing recovered-assessment exclusions.

The correction is read-only. No intervention is cancelled or deleted; no historical evidence is reassigned; no mastery is awarded; no thresholds, scoring, diagnosis, retention minimums, teaching sequence or database schema change. Runtime Basic 7 activation remains restricted to the guarded in-memory fixture.

## Regression coverage

`tests/teaching-first-retention.test.ts` exercises **16 real learning journeys**: Basic 4–7 Science × EN/FR × initial introduction/explicitly selected teaching cycle. Scores are earned through the API, not seeded as mastery.

Each journey checks the completed teaching cycle, due scheduling, read-only history preservation, actual bilingual retention delivery, answer-key removal, stable question/intervention on refresh, correct retention timestamps/counters, unchanged independent mastery, and one score per review despite different submission keys. One first retention success remains `pending`; prior established retention remains `retained`. A later incorrect answer produces `not_retained`, blocks advancement and invokes the existing `practice / FORGOTTEN_KNOWLEDGE_REVIEW` intervention. Separate lifecycle tests protect active work, new corrective teaching, unrelated-competency evidence and timestamp ties.

For grades with successors, the fixture reorders already-earned competency states to enter the mastered topic's review boundary. It does not clear the successor's delivery, invent evidence, or use explicit topic selection for a due review. Explicit topic selection intentionally starts a teaching revisit and is separately tested during initial learning.

`tests/basic7-materials-pilot.test.ts` now replaces the original red blocker assertion with actual API delivery and scoring: correct later retention stays retained, a later wrong answer becomes not retained and enters forgotten-knowledge practice. The full practical-review, guided-evidence, progress and offline-queue checks still pass. Its retention mastery comparison uses the state after legitimate teacher-review evidence, rather than the earlier pre-review score.

The new regression is included in `npm run test:revision`.

## Validation results

| Check | Result |
|---|---|
| New 16-journey retention regression plus pending-activity safety cases | Passed |
| Full Basic 7 Materials pilot, EN/FR including later retention scoring | Passed |
| Existing focused revision, teaching-first, correction and Basic 4–6/Basic 7 integrity suites | Passed |
| Pilot Chromium browser cases: EN/FR × 390/1280px | 4 passed |
| Learner production build | Passed; 34 generated pages |
| Strict TypeScript check for changed services and focused tests | Passed |
| Full root TypeScript check | 5 inherited errors in 3 unchanged test files |
| Entire legacy validation inventory plus offline security and targeted regressions | 125 passed / 133 requested; 8 inherited failures |
| `git diff --check` | Passed |

The complete test inventory was run with `node scripts/validate-retention-repair.mjs`. This extracts both legacy validation lists and adds the authoritative offline-security list and focused regressions, without skipping missing entries. Every test is executed through the existing memory-only runner with an unreachable database URL. This avoids the legacy PowerShell wrapper's environment-file dependency, deletion of runtime logs and runtime-session file writes. The production build was run separately. Full output and machine-readable suite results are in `retention-validation.log` and `retention-validation.json`.

Sandbox child-process restrictions required approved local retries. The existing cached Playwright and installed Chromium were used; no browser/dependency was downloaded. The build reports the existing nested-worktree lockfile warning.

### Remaining full-validation failures

Six stale legacy validation entries reference files absent from this worktree and the tracked baseline:

- `tests/payment-service-config.test.ts`
- `tests/payment-service.test.ts`
- `tests/paystack-adapter.test.ts`
- `tests/payment-lifecycle.test.ts`
- `tests/payment-obligation-contracts.test.ts`
- `tests/payment-obligation-ledger.test.ts`

These fail with `ERR_MODULE_NOT_FOUND`. No cleanup files were restored and no validation entries were silently removed.

Two existing route assertions also fail:

- `prerequisite-repair-4d`: expects prerequisite repair, receives `teach / TOPIC_REVISIT` after explicit competency selection.
- `route-advance-4g`: expects advancement, receives `teach / TOPIC_REVISIT` after explicit competency selection.

Both failures were reproduced in isolated subprocesses with an in-memory module loader restoring the **pre-repair** pending-activity logic. The exact same assertions fail. No production file was reverted or temporarily edited for that comparison. This is an existing route-behavior/test-expectation disagreement, not introduced by the retention correction.

### Remaining root TypeScript errors

The root `tsc --noEmit --project tsconfig.json` reports:

- `tests/b4-framework-registration.test.ts:92`: widened overview `areas[].status` versus the component's status union.
- `tests/b7-framework-registration.test.ts:75,78`: optional parent IDs passed as required strings.
- `tests/immediate-correction.test.ts:219,220`: possibly undefined corrective passage.

These three inherited tests were not edited. The new strict check also found an optional assessment-item ID in the previously authored pilot progress helper; that changed helper now explicitly guards `undefined`, preserving its runtime behavior. Changed code has no remaining focused TypeScript errors.

## Files changed by this repair

Modified:

1. `services/learner-path/revision.ts` — pending-work supersession boundary; sole shared behavior correction.
2. `services/learner-progress/ghana-b7-materials-pilot.ts` — explicit optional-ID guard for strict typing.
3. `tests/basic7-materials-pilot.test.ts` — successful later review and actual correct/incorrect retention scoring.
4. `package.json` — include the new regression in `test:revision`.
5. `docs/phase8e/README.md` — distinguish initial blocker findings from repaired status.

Created:

6. `tests/teaching-first-retention.test.ts` — Basic 4–7 bilingual introduction/cycle and lifecycle-safety regressions.
7. `scripts/validate-retention-repair.mjs` — complete memory-only validation inventory runner.
8. `docs/phase8e/RETENTION-REPAIR.md` — this report.
9. `docs/phase8e/retention-validation.json` — generated full-suite results.
10. `docs/phase8e/retention-validation.log` — generated full-suite output.

Other modified/untracked files shown by Git are inherited Phase 2–8E work, not changes made by this repair. All 22 recorded inherited source/data hashes still match. The nine inherited tracked files checked against the main workspace, including learner interface files, still match byte for byte. No Basic 8–9 extraction, Claude interface file or official source PDF changed. No commit, push or deployment occurred.

## Integration decision and remaining limits

The specific retention blocker is cleared, and the repair can be reviewed together with the isolated Science pilot. Do not label full repository validation green or Phase 8E unconditionally integration-ready until the existing validation-inventory, route-expectation and test-typing issues are reconciled by their owners. Database-backed operation, a mature Basic 7 learner interface and educator/French-language review remain separate work. There is no public Basic 7 activation and no new offline capability for adult systems.

Reproduce targeted checks:

```powershell
node scripts/run-offline-suites.mjs teaching-first-retention basic7-materials-pilot
node scripts/validate-retention-repair.mjs
# Full inventory currently exits 1 for the eight inherited failures above.
```
