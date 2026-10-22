# Phase 8E — isolated Basic 7 Science pilot

Current status: retention, route tests, root TypeScript and the learner build pass; complete validation is **127/133**, with only six unresolved payment suites. See [FINAL-VALIDATION-REPAIR.md](FINAL-VALIDATION-REPAIR.md) for the payment Git investigation, safe corrections and approval boundary. Basic 7 remains hidden and inactive for general learners. [RETENTION-REPAIR.md](RETENTION-REPAIR.md) and the initial findings below preserve earlier audit results.

User disposition: payment integration remains a separate task. The six blocked payment suites are an existing branch dependency; the recorded validation result is unchanged. Phase 8E is preserved in this worktree and work is stopped awaiting further instructions. No merge, commit, push or deployment is authorized.

## Workspace protection

- Branch: `feat/basic7-science-pilot`.
- Worktree root: `C:/FILUMIRE/filumire-batch1/FILUMIRE_CLAUDE/.worktrees/basic7-science-pilot`.
- Project: the worktree's `FILUMIRE_CLAUDE/` subdirectory.
- Base: `29854417`. Required existing uncommitted Phase 2–8C files were inherited explicitly rather than committed. Their source/data hashes are recorded in `inherited-baseline.json`.
- All 22 recorded inherited source/data files still match their hashes. Nine inherited tracked changes, including the learner UI files, still match the main workspace byte for byte at verification.
- No Basic 8–9 extraction or Claude interface edits were made. No commit, push, deployment, database migration or dependency installation occurred.

## Source and authored scope

One competency only: `competency-gh-science-b7-nacca2020-p039-r01`, source entry `science:pdf39:row1`.

- Indicator: **B7.1.1.1.1**, classify materials into liquids, solids and gases.
- Standard: **B7.1.1.1**, recognise materials as important resources for providing human needs.
- Strand: Diversity of Matter. Sub-strand: Materials.
- NaCCA, Ministry of Education, *Science Common Core Programme (CCP), Curriculum for JHS 1 (B7)–JHS 3 (B9)*. Cover: September 2020; imprint/body copyright information remains separately documented in the inherited manifest.
- Official linked source: `https://nacca.gov.gh/wp-content/uploads/2023/06/SCIENCE.pdf`.
- Local source: `docs/curriculum-sources/ghana/ccp-b7-b9/SCIENCE.pdf`.
- PDF page **39**, printed page **2**. Re-extracted and visually inspected in this phase; `science-source-page39.png` is the review rendering. PDF bytes were not modified.
- SHA-256: `10e9fbec7adff109f4e1a67301c1f87a4b7cd62a39d9c3d9b2116314a34728b8`.
- Source-backed activities: observe texture, appearance, colour and shape in a table; classify materials; discuss differences; identify environmental examples. Source guidance assessment references remain in the inherited mapping, including Science PDF pages 20–25.
- No indicator-specific unresolved source issue affects this row. The global HTTP retrieval/authenticity caveat and unverified external NPLAF/SBA references remain unresolved. No national assessment/reporting compliance is claimed.

The explanation, examples, quizzes, French translation, teacher rubric, difficulty and thresholds are FILUMIRE pilot authoring decisions, **not additional NaCCA requirements or an official French translation**. The original indicator code and hierarchy are unchanged.

Per language: four teaching cards (explanation, worked example, scaffold, error analysis), one guided practice question, six diagnostic questions, two reassessment questions, two retention questions, two transfer questions, and one separate teacher-reviewed observation activity. Total: 36 bilingual content records. Ordinary quizzes use the existing authored builder, exact-match assessment, correction, intervention, evidence, mastery, retention/transfer and progress services.

The practical artefact uses the existing pending teacher review and authorized teacher evaluation API. Quiz mastery is reported separately; full pilot journey completion also requires correct teacher-reviewed practical evidence. No local or learner-supplied score is trusted.

## Isolation and offline boundaries

Nothing imports the pilot into production content seeding or registers it on application startup. The sole production-framework addition is a guarded in-memory test registration function; it rejects production, deployed instances, non-memory persistence, missing explicit opt-in and duplicate/replacement records. It cannot replace a Basic 4–6 competency. Public Basic 7 remains hidden/unsupported/inactive outside the isolated process, as verified by the existing Phase 8C suite.

The test fixture enables only the in-process Science pilot registry. The browser harness binds to an ephemeral **127.0.0.1** port and refuses to run unless `NODE_ENV=test`, `FILUMIRE_PERSISTENCE=memory`, `FILUMIRE_BASIC7_PILOT=test-only`, and `VERCEL` is absent. Its `/test/*` endpoints do not exist in Next or in the production build. It uses fictional learners and development test identity, not production account sessions.

The browser harness reuses `AnswerCorrectionPanel` and the existing pending-submission helpers; teaching, radio choices and the observation form are minimal test controls, not a mature Basic 7 interface. No Claude design file changed.

Offline verification covers the already-delivered activity remaining readable, an untrusted pending answer, no offline mastery award, and exactly-once evaluation on reconnection. Existing service-worker and queue regressions also pass. This does **not** establish cold-start access to a complete downloaded course or a client-side adaptive engine. Parent, teacher and administrative offline capabilities were not added.

## Initial verification — before retention repair, 22 October 2026

- **Passed:** core Science journey in EN and FR: explanation, examples, guided practice, wrong answer, corrective teaching, successful guided retry, continued independent assessment, immediate retention/transfer evidence, engine mastery, shared progress reporting, pending practical review, authorized teacher evidence, practical completion, offline answer queue and idempotent replay.
- **Passed:** four Chromium browser cases: EN/FR × 390/1280px. Visible controls, correction/retry, preserved question identity during language switching, offline/reconnect, quiz mastery/progress, observation submission, no page exceptions or horizontal overflow. These cases do not simulate the later revision date or the teacher's browser UI.
- **Passed:** 11 existing suites: `b7-framework-registration`, `b7-existing-curriculum-regression`, `b4-framework-registration`, `immediate-correction`, `mastery-v1`, `retention-transfer-negative-gate`, `spaced-revision-subjects`, `offline-shell-v1`, `pending-submission-client`, `teaching-first-journey`, `teacher-trusted-review`.
- **Failed:** `basic7-materials-pilot` at its final later-revision assertion, in both EN and FR. Its preceding core journey assertions pass. Do not report this suite as green.
- **Passed:** learner production build (34 generated pages), targeted TypeScript check including the new content, report and harness, and `git diff --check`.
- Sandbox initially blocked child processes; the approved local build/browser retries ran outside it. Cached Playwright required an explicit existing Chromium path; no browser was downloaded. Build notes multiple nested-worktree lockfiles. Direct React SSR emits the existing styled-jsx attribute warning; the Next build and browser cases pass.
- PostgreSQL persistence, production authentication, deployed operation and a mature Basic 7 UI were not tested. Every journey used memory persistence and an unreachable database URL.

## Original blocker — subsequently repaired

After quiz mastery and practical teacher review, move the test clock 30 days forward. `buildRevisionSummary` lists this competency as due. However, `unansweredActivities` still returns the initial acknowledged explanation: a completed `teach` intervention with `outcome=not_yet_evaluated` and no evidence IDs. The explanation was followed by a worked example and actual assessment evidence, but that later evidence belongs to other interventions.

`services/learner-path/revision.ts` treats that old explanation as work awaiting an instruction check and reports `canStart=false`. The continuity guard in `services/adaptive-engine/index.ts` suppresses the due review, returning `complete`. Both languages reproduce this. This is an existing shared lifecycle defect exposed by a full teaching-first pilot, not a missing Science indicator or an item-exhaustion workaround.

**First repair:** make the shared teaching-intervention lifecycle distinguish an introductory explanation superseded by a worked example and its check from genuine unfinished corrective teaching. Add actual teaching-first-to-spaced-review regressions across Basic 4–6 as well as this Basic 7 pilot. Preserve delivered unanswered questions, guided evidence and historical records. Do not fabricate evidence, cancel all historical teaching, or relax mastery gates to make the test pass. Review that shared behavior change before expanding Basic 7.

The next content step, after that repair and a green focused suite, is educator review of the Science wording/French translation and practical rubric, followed by integration with the mature learner UI and database-backed verification. No public activation is recommended yet.

## Files changed in this phase

Modified: `packages/curriculum/index.ts` (guarded isolated-test registration only).

Created:

- `services/content-store/ghana-b7-materials-pilot.ts`
- `services/learner-progress/ghana-b7-materials-pilot.ts`
- `tests/basic7-materials-pilot.test.ts`
- `tests/basic7-materials-pilot.browser.mjs`
- `tests/fixtures/basic7-materials-pilot.ts`
- `tests/fixtures/basic7-materials-app.tsx`
- `docs/phase8e/inherited-baseline.json`
- `docs/phase8e/science-source-page39.png`
- `docs/phase8e/README.md`

The separately inherited Phase 2–8C files are baseline work, not new Phase 8E changes.

## Reproduction

From this worktree's project directory:

```powershell
node scripts/run-offline-suites.mjs basic7-materials-pilot
# Now passes after the retention repair; originally failed on later revision.

$env:NODE_ENV='test'
$env:FILUMIRE_PERSISTENCE='memory'
$env:FILUMIRE_BASIC7_PILOT='test-only'
$env:DATABASE_URL='postgres://offline:offline@127.0.0.1:1/offline'
# Set FILUMIRE_PLAYWRIGHT_MODULE and FILUMIRE_CHROMIUM_PATH to existing local installations when needed.
node --import tsx tests/basic7-materials-pilot.browser.mjs
```
