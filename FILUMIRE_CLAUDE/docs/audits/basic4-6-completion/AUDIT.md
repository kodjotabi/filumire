# Basic 4–6 completion audit — 22 October 2026

The learning software and local content structure are substantially implemented. **Complete NaCCA coverage and educational pilot readiness are not established.** Official source-page reconciliation, productive assessment, educator review and database/device validation remain open. A live French offline failure and three inherited root TypeScript errors are confirmed. No curriculum, production or existing test repairs were made during this audit.

## Scope and baseline

- Isolated branch: `feat/basic4-6-completion`.
- Git worktree: `C:/FILUMIRE/filumire-batch1/FILUMIRE_CLAUDE/.worktrees/basic4-6-completion`.
- Project directory inside it: `FILUMIRE_CLAUDE/`; base commit `29854417561714a62024be2b150de9b4a2cd24b3`.
- The audit copied 15 explicitly identified, uncommitted learner/framework/test files from the current main workspace to retain its real working baseline. `baseline.json` records SHA-256 hashes; all 15 remain unchanged in this worktree.
- This is the main working snapshot, **not** the separate Phase 8E pilot branch. Phase 8E's later repair/integration status is a separate dependency. No changes were imported from its worktree, Claude's interface worktree, the Voice Lab or Basic 8–9 extraction.
- All learning tests used fictional learners, memory persistence and an unreachable database. The browser used an isolated local production server on `127.0.0.1:3276`. No personal learner records were read or changed.

## Coverage inventory

Counts below describe the repository, not the complete national curriculum. Every runtime competency has English and French lesson, worked-example, scaffold, remediation, scorable guided-practice, retention and transfer records. These are content-presence checks; they do not certify teaching quality or that the assessed response demonstrates the whole skill.

| Grade | Subject | Catalogue competencies | Runtime competencies | Mapped indicator nodes | Competencies with missing declared-subskill question tags | Productive assessment review candidates* |
|---|---|---:|---:|---:|---:|---:|
| 4 | English Language | 131 | 131 | 131 | 21 | 22 |
| 4 | Mathematics | 64 | 67 | 71 | 9 | 7 |
| 4 | Science | 24 | 24 | 24 | 2 | 1 |
| 4 | Computing | 27 | 27 | 27 | 1 | 7 |
| 5 | English Language | 134 | 134 | 134 | 0 | 18 |
| 5 | Mathematics | 67 | 67 | 67 | 0 | 2 |
| 5 | Science | 28 | 28 | 28 | 1 | 1 |
| 5 | Computing | 79 | 79 | 79 | 0 | 6 |
| 6 | English Language | 134 | 134 | 134 | 0 | 24 |
| 6 | Mathematics | 45 | 45 | 45 | 0 | 1 |
| 6 | Science | 28 | 28 | 28 | 0 | 1 |
| 6 | Computing | 98 | 98 | 98 | 0 | 9 |
| Total | | 859 | 862 | 866 | 34 | 99 |

*A title-based triage heuristic, not a verified list of official assessment requirements. It will miss some practical/productive requirements; the entire inventory still needs source and educator review. Missing tags are metadata gaps, not proof that the corresponding question fails to assess a skill.

The three additional Basic 4 Mathematics runtime competencies are stable legacy number-pattern pilot IDs with separate authored content. They are not three missing lessons. Preserve them for progress compatibility. Four official-code nodes have multiple competency relationships:

- `B4.2.1.1.1`: pattern-describe and number-patterns-002.
- `B4.2.1.1.2`: pattern-missing-elements and number-patterns-001.
- `B4.2.1.3.1`: pattern-problem-to-table and number-patterns-003.
- `B4.2.1.3.2`: pattern-extension-problem, number-patterns-001 and number-patterns-003.

`indicator-matrix.json` preserves full IDs and distinguishes `direct` from `supports` relationships. These overlaps require review; they do not justify deleting IDs or silently merging learner histories. The audited runtime IDs are unique, and each mapped indicator has a strand, sub-strand and content-standard ancestry.

## Status definitions and evidence limits

`coverage-matrix.csv` and `coverage-matrix.json` contain one row per runtime competency, including grade, subject, title, claimed official codes, hierarchy, source claims, authored files, language/purpose counts, misconceptions, subskills, thresholds, content IDs and individual review flags.

- **Implemented, structurally:** all 862 runtime competencies have the expected record types and framework mappings; all 859 local catalogue entries are registered.
- **Partially implemented, educationally:** all 862 still need verified official scope and educational/translation approval. Selected-response assessment alone is insufficient evidence for a productive skill such as composing a poem.
- **Missing, verified:** explicit representation metadata on all 15,533 question records; declared-subskill question tags for at least one subskill on 34 competencies; no trusted-rubric assessment records in the seeded content. Source-page references are not verified for this inventory.
- **Unverified:** the official denominator and therefore how many national indicators are missing; complete skill coverage; translation approval; most individual journeys; durable database recovery; assistive technology and classroom usability.

No explicit TODO/TBD/lorem-ipsum/bracketed-placeholder markers were found. A word such as “placeholder” in place-value teaching or “coming soon” inside a grammatical example is not unfinished content. No exact duplicate English lesson bodies were found. Semantic duplication, shallow content and seed-time overwrites are not disproved by these checks.

## Official curriculum evidence

The [official NaCCA standards-based curriculum directory](https://nacca.gov.gh/learning-areas-subjects/new-standards-based-curriculum-2019/) identifies the relevant primary curriculum documents:

- [English B4–B6](https://nacca.gov.gh/wp-content/uploads/2019/06/ENGLISH-B4-B6.pdf).
- [Mathematics B4–B6](https://nacca.gov.gh/wp-content/uploads/2019/04/MATHS-UPPER-PRIMARY-B4-B6.pdf).
- [Science B4–B6](https://nacca.gov.gh/wp-content/uploads/2019/04/SCIENCE-UPPER-PRIMARY-B4-B6.pdf).
- [Computing B4–B6](https://nacca.gov.gh/wp-content/uploads/2019/04/COMPUTING-B4-B6.pdf).

Official HTTPS PDF retrieval failed in this environment, including the network-enabled retry. `source-retrieval.json` records the four failures. No replacement PDFs were fabricated or saved. No official PDF edition, checksum, printed page, or full indicator count was independently certified here. Existing framework source strings are claims awaiting page reconciliation.

The checked-in `docs/curriculum-sources/ghana/2019/ENGLISH-B4-indicators-authoritative.txt` contains 131 unique codes, all matching Basic 4 English mappings with no extra mapped codes. This is useful local corroboration, but it lacks the PDF page evidence required for complete official-source verification. The count differences between subjects/grades must not be treated as missing national indicators without those documents.

## Educational desk review

`quality-samples.json` exposes the first and middle topic in each of the 12 grade/subject groups, with bilingual lesson, example, remediation and practice cards. The desk review sampled their explanations and examples; it is not Ghanaian educator or French-language sign-off. Automated integrity checks covered the full seeded inventory.

**Strengths observed:** explanations commonly define terms plainly, use Ghanaian names, cedis, classroom/market examples and step-by-step worked examples. Correction cards address named misconceptions. The sampled song sequence develops from stress/rhythm in Basic 4, to a central message in Basic 5, to connections with personal experience in Basic 6. Number examples progress from five-digit place value toward larger numbers. French instructional prose is present alongside English; English-language reading passages retained within French English lessons are not automatically translation fallbacks.

**Assessment limitations:** 22,432 content records include 15,533 questions: 15,532 multiple-choice and one application item. No seeded question uses `trusted_rubric_evaluation`. For example, `competency-gh-english-b4-1-3-1-3` teaches composing four-line poems, but its question responses cannot collect a learner's poem; recitation/read-aloud topics cannot collect an oral performance; Computing topics describe tool use without demonstrating the learner's use of the tool. These records can teach and check recognition, but cannot establish all the productive outcomes suggested by their own local objectives.

Trusted teacher review already exists and its regression suite passes. Some older generated English content includes rubric-based material, but the seed filters replace all 131 Basic 4 English topics with authored content. The presence of rubric code in an unused generator does not mean learners receive it.

**Evidence quality:** every question's explicit `evidenceRepresentation` is absent. The existing mastery policy uses contexts as well as representations for variation, so this is not proof that current mastery is unreachable or incorrectly awarded. Preserve thresholds and independence rules; review question types, representation metadata and actual demonstrated skills before approving any extension. Stored answer positions are heavily biased toward the first option, but the existing server shuffles options stably per learner/item and removes answer keys; the dedicated option-order tests passed. This audit does not report the stored order as an unresolved learner-facing defect.

**Content requiring educator review:** Basic 5 Science `competency-gh-science-b5-1-1-1-1` gives a general definition of respiration using oxygen for every living thing and describes excess plant water as excretion. Basic 4 animal classification gives categorical wording about reptiles laying eggs. Review these statements against the official scope and intended simplification in both languages. No scientific wording or curriculum requirement was silently corrected. Basic 6 Mathematics explanations are notably brief in sampled large-number and ratio topics; educators should assess whether this supplies enough concrete modelling and challenge for the grade.

**Progression and accessibility:** the runtime has within-grade prerequisite links, not a complete audited vertical Basic 4→5→6 concept progression. Guardian-controlled grade assignment is intentional. A teacher must reconcile depth, terminology, prerequisites and practical demands across the three grades. The UI exposes labelled radio groups, buttons and status messages, and the sampled 390px/1280px dashboard and question screens had zero horizontal overflow. No full screen-reader, contrast, zoom, motor-access, dyslexia, real-phone, speech/audio or child-usability evaluation was performed. Text explaining singing/recitation is not proof of an accessible audio or performance experience.

## Technical verification

| Verification | Result | What it establishes |
|---|---|---|
| Existing selected regression suites | **37/37 passed** | Curriculum structure, adaptive learning, correction, integrity, retention, continuity, offline helpers and related guards; names/commands in `validation.json` |
| Additional in-memory API journeys | **48/48 passed** | One competency per grade/subject × EN/FR × correct/repeated-mistake paths |
| Existing live browser repair matrix | **24/24 passed** | All 12 subject/grade groups at 390px English and 1280px French, including language switching |
| Live service-worker/offline audit | **1/2 passed** | English passed; French offline reload failed; answer queuing/reconnect checks passed in both |
| Production learner build | **Passed** | App compilation and app TypeScript validation; local build only |
| Root TypeScript check | **Failed: 3 errors in 2 inherited test files** | Entire repository does not currently type-check |
| Official PDF retrieval | **0/4 retrieved** | External source verification remains blocked |

The 48 API cases use actual GET/POST learning handlers. They check teaching-first explanation/example/practice, interrupted-screen and unanswered-question identity on repeated GETs, correct answers or repeated mistakes, corrective teaching, guided-evidence independence, subsequent mastery thresholds, transfer and a due retention question after advancing the clock 31 days. Correct retention scoring passed. The harness deliberately puts the earned target state first at the review boundary without changing its evidence or scores. This is a controlled review test, not a simulation of every scheduling/current-topic arrangement or a longitudinal classroom study. It samples 12 competencies; **850 others have no individual end-to-end execution in this audit**. Negative retention/state behaviour has existing unit/regression coverage, not new exhaustive per-competency browser verification.

The browser matrix uses real fictional account/login flows and visible topic controls. It checks a wrong answer, correction, guided retry, EN↔FR switching while preserving question/options/progress/evidence, a correct guided retry heading, lesson summary/review continuation, rejection of cross-site summary requests and no browser runtime errors. It does not drive all 862 topics to mastery. Desktop English, mobile French, other viewport sizes, 200% zoom and long-content screens remain additional UI coverage to add.

The offline audit allows the real service worker. In both EN and FR it saved a pending answer, reconnected to exactly one new server evidence record, and did not duplicate evidence on another online event. English reload displayed its offline fallback and cached no API response or personalised dashboard/lesson HTML. French reload failed: `navigator.language='fr'`, `<html lang='fr' class='fr'>`, computed root display **`none`**. `apps/learner/public/offline.html` applies `[lang="fr"] { display: none; }` globally, so the script changing the root language hides the whole document. `browser/offline-results.json` and `offline-failure-fr-1280.png` preserve the reproduction. This shared fallback defect can affect every subject and grade using a French browser; it is not specific to Mathematics.

The current offline design is an app shell, loaded-screen reading and a single queued answer. It does **not** provide a downloadable curriculum or server-free adaptive progression. New lesson delivery, fresh corrections and trusted mastery remain server-dependent. Persistence after real browser termination/storage pressure, shared-device handover, reconnect conflicts and database restarts still require controlled integration/device tests.

Root TypeScript failures, preserved verbatim in `typescript.log`:

- `tests/b4-framework-registration.test.ts:92` — fixture `areas[].status` inferred as `string`, not the `LearningOverview` literal union.
- `tests/immediate-correction.test.ts:219` and `:220` — `passage` may be undefined.

These files match the inherited baseline hashes. The application build excludes these root test errors, which explains why a successful build does not resolve them. None were suppressed or repaired. The earlier Phase 8E retention defect was not reproduced in the 48 sampled paths; this does not establish that its separate branch repair is redundant or integrated. Integration approval must retain its specific regression cases. The six payment tests remain a previously documented separate branch dependency; no payment code or integration was changed or certified here. The repository-wide/payment-inclusive validation command and live database suites were not run.

## Deliverables and next decision

- `coverage-matrix.csv` / `.json`: 862 competency rows with structural, educational and verification statuses.
- `indicator-matrix.csv` / `.json`: 866 repository indicator nodes, hierarchy and competency relationships.
- `review-queue.json`: exact source/education/translation review work and flagged IDs.
- `summary.json`, `audit-statistics.json`, `question-integrity.json`: reproducible counts and integrity findings.
- `quality-samples.json`, `catalogues.json`, `seeded-content.json`: local content/spec evidence for review; these are curriculum audit extracts, not learner records.
- `journey-results.json`, `browser/`, `typescript.log`, `validation.json`: verification evidence.
- `baseline.json`, `source-retrieval.json`: baseline protection and external-source limitations.
- `IMPLEMENTATION-PLAN.md`: priorities, dependencies, complexity and acceptance criteria.

Only five new audit scripts and audit artefacts were authored. Existing production files, content, tests and inherited working changes were preserved. No payment changes, Basic 7–9 activation, commits, merges, pushes or deployments occurred. The next technical repair to approve is the French offline root-selector failure with a browser regression; the first curriculum completion task is the four-document source manifest and page-by-page indicator reconciliation. Substantial implementation awaits approval.
