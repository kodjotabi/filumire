# JHS programme: batch 01, Basic 7 Science Materials

Worktree: `feat/jhs7-9-development`, based on commit `29854417561714a62024be2b150de9b4a2cd24b3` plus the uncommitted Phase 8E pilot/retention lineage and the later Phase 8D mapping documents. The verified teacher-delivery-provenance and French offline-shell fixes were carried as technical dependencies, without importing Basic 5 curriculum expansion. `lineage-manifest.json` records each carried file, origin and hash. All 80 origin-file records were checked unchanged after this work. The Basic 4-6 worktree's later 866-competency tranche remains separate; it was not merged or overwritten.

## Baseline and duplication audit

The baseline contains **625 unique proposed competency IDs**, representing printed source entries: Basic 7 235, Basic 8 192, Basic 9 198. Repeated printed codes remain separate, and original source flags and numbering decisions are preserved byte-for-byte in copied mapping inputs. All four original PDF hashes pass. Source PDFs are read in their existing location through a worktree-safe test resolver; no PDFs were copied or modified. This is not a new page-by-page review of all 625 indicators: the first three Science indicators were rechecked against the original rendered pages, while the rest retain the verified mapping baseline and unresolved issues.

The earlier Science pilot covered B7.1.1.1.1 as an isolated knowledge journey and kept practical completion separate. Its raw quizzes were not treated as proof of the full observation/table/discussion outcome. This batch reuses its four teaching cards, guided practice and revision questions with **14 exact existing content IDs** and unchanged bodies, adds teacher-reviewed independent tasks, and does not seed the older automatic mastery/transfer quizzes into the strengthened batch. The old prototype module and its separate regression harness remain intact; no historical records were rewritten.

## Implemented subject batch

| Code / stable ID suffix | Official reference | Work authored |
|---|---|---|
| B7.1.1.1.1 / p039-r01 | Science PDF39, printed2 | Strengthened existing states-of-matter journey: actual dated observation table, classification, differences and local examples |
| B7.1.1.1.2 / p040-r01 | Science PDF40, printed3 | Liquid uses, community observations, supervised information research, report/discussion and justified preservation |
| B7.1.1.1.3 / p040-r02 | Science PDF40, printed3 | Useful solids, checked information sources, conservation, actual safe models and explanation of limitations |

All fall under B7.1.1.1, Diversity of Matter / Materials. The source cover is September 2020; body footers say 2021, as already distinguished in the source manifest. No edition or indicator correction was invented.

There are **78 bilingual content records: 64 new and 14 reused**. Each competency has EN/FR explanation, worked example, scaffold, correction, guided practice, two diagnostic tasks, two reassessment tasks, two knowledge-retention checks and two transfer tasks. The 36 productive assessment records require existing authorised teacher review; they have no auto-scoring options. Guided quiz/retry evidence stays guided. Reports require actual source notes and observations; model tasks require actual products and teacher inspection. No made-up observations, websites, teacher approvals or classroom performance are credited. Criteria and translations are authored drafts pending educator/French review, not official NaCCA rubrics.

The neutral JHS preview uses existing correction and pending-answer components and the real assessment API. It provides topic selection, independent response entry and honest pending-review progress on mobile and desktop. It is a loopback-only, memory-only test harness, not a deployed or production-ready JHS interface. New content is absent from production seeding and normal learner navigation.

## Exact authored-versus-remaining matrix

| Grade | Subject | Mapped | Authored/API-validated | Awaiting authoring | Approved for learner release |
|---|---|---:|---:|---:|---:|
| 7 | English Language | 53 | 0 | 53 | 0 |
| 7 | Mathematics | 74 | 0 | 74 | 0 |
| 7 | Computing | 55 | 0 | 55 | 0 |
| 7 | Science | 53 | 3 | 50 | 0 |
| 8 | English Language | 49 | 0 | 49 | 0 |
| 8 | Mathematics | 58 | 0 | 58 | 0 |
| 8 | Computing | 39 | 0 | 39 | 0 |
| 8 | Science | 46 | 0 | 46 | 0 |
| 9 | English Language | 51 | 0 | 51 | 0 |
| 9 | Mathematics | 52 | 0 | 52 | 0 |
| 9 | Computing | 37 | 0 | 37 | 0 |
| 9 | Science | 58 | 0 | 58 | 0 |
| **Total** | | **625** | **3** | **622** | **0** |

`batch01-competency-matrix.json` contains all 625 rows, original codes/source references/issues, individual content IDs, batch membership and separate technical/release states. `batch01-summary.json` contains the twelve totals. All 625 remain incomplete for learner release; do not subtract the three draft journeys from educational-review requirements.

## Verification

- **45/45 selected regression suites pass**, covering the 625-ID source baseline, all four PDF hashes, hidden publication, duplicate/internal ID preservation, old Science pilot, retention repair, Basic 4-6 subjects, teacher review, evidence security, progression, language and offline contracts.
- **12/12 new API scenarios pass**: three competencies x EN/FR x correct/incorrect due revision. Real signed fictional sessions exercise teaching/example, interrupted lesson, correction, guided retry across language changes, pending work without evidence, incorrect/correct fictional teacher judgements, exact delivery provenance, idempotent review, mastery, reviewed transfer, new sign-in after 31 days and actual retention delivery. One successful revision remains pending under the unchanged two-observation rule. Wrong retention evidence marks not-retained, blocks readiness and returns correction.
- **12/12 new preview browser cases pass**: three topics x two languages x 390/1280 widths, including visible topic selection, teaching/example, wrong answer, offline queue/reconnect, retained original question on language switch, guided retry, independent response submission, pending review without mastery, progress display and overflow/error checks.
- **4/4 existing pilot browser regressions pass** independently, including its original practical-pending distinction. These are isolated harness results; general-learner JHS onboarding and production navigation remain unavailable.
- **Root TypeScript passes with zero errors.** The invalid-registration fixture was corrected to supply a required `Subject.code`; no negative assertion was removed. Legacy source-hash tests resolve the original PDFs rather than requiring duplicate worktree copies.
- **Production build fails**, on both ordinary attempts, in the existing `next/font/google` loader at `loader.js:122`, where a font URL extension match is null. A direct invocation of the same CSS fetch subsequently returned recognised file extensions for Montserrat and Kalam, so the underlying build failure is unresolved; it is not claimed as a proven network failure or an independently cleared baseline defect. No font/interface/dependency change was made to force a pass. Logs and fetched CSS evidence are retained. Existing multiple-lockfile warnings also remain.

An initial browser-harness attempt selected by authored option position even though the API shuffles options; it was corrected to read actual displayed option values. The final twelve cases pass. Existing security/option-order behaviour was preserved. The full payment-dependent validation inventory was not run; the six historical payment tests remain a separate unmerged branch dependency. No payment implementation or test was imported.

Browser offline coverage here exercises Learner-App pending-answer helpers and real API synchronisation. It does not certify a full offline JHS adaptive engine, the production service-worker/browser shell on this failed build, offline adult systems or database durability. Persistence is memory-only. Fictional teacher test outcomes are not educator approval or actual learner evidence.

## Files and preservation

New implementation/test tooling: `services/content-store/ghana-b7-science-materials-batch.ts`, `scripts/jhs-coverage.ts`, `tests/jhs-curriculum-integrity.test.ts`, `tests/jhs-materials-journey.test.ts`, `tests/jhs-materials.browser.mjs`, `tests/fixtures/jhs-materials-batch.ts`, `tests/fixtures/jhs-materials-app.tsx` and `tests/fixtures/ccp-source.ts`.

Only three carried files were subsequently edited: `packages/curriculum/index.ts` (guarded in-memory batch registration only), `tests/b7-framework-registration.test.ts` and `tests/basic7-materials-pilot.test.ts` (original-PDF resolver, unchanged hash assertions). All other carried pilot/technical/source files retain their pinned bytes. Documentation, matrices, screenshots and logs are under `docs/jhs-development/`.

All source worktrees, Basic 4-6 uncommitted work, Claude's learner-removal work, payment functionality and production were preserved. No source PDF was copied, edited, moved or deleted. No commit, merge, push or deployment occurred. Test servers close after the browser runs.

## Major architecture gate and next sequence

Before real JHS registration/navigation can replace test-only adapters, approve `ARCHITECTURE-DECISION.md`: a distinct inactive CCP runtime identity, hidden Basic 8/9 hierarchy registration, authorised atomic version-aware placement, and a grade-scoped mature presentation boundary. These span framework, profiles, persistence and shared learner interfaces; they cannot be safely achieved by flipping hidden/support flags or continuing to label CCP runtime definitions as the primary mathematics framework. No mastery-rule change is proposed.

After approval: implement and validate that foundation without public activation; obtain Science batch educational/French/rubric review and genuine task evidence; continue Basic 7 Science with source-clear batches, then the other Basic 7 subjects; validate Basic 8 and then Basic 9 in subject-level batches. Retain flagged source rows for clarification and unsupported evidence-capture methods for a separate design decision. Refresh the 625-entry matrix after every batch. Resolve the production font build blocker and database/mobile/classroom verification before any pilot-readiness claim.

Work stops at this concrete architecture decision, as required by the user's execution safeguard, rather than at the initial audit. The programme is begun; Basic 7-9 is not complete or publicly active.
