# Phase 8B: Basic 7 mapping and implementation plan

## Result and boundaries

All **235 Phase 8A source entries** are mapped to a proposed subject, strand, sub-strand, displayed content standard, learning-indicator node and intended FILUMIRE competency. All leading indicator statements/codes were visually checked against rendered PDF source crops in 22 review sheets. Fresh PDF text was checked for all anchors, parent codes, hierarchy headings, source activities and continuation pages: **221 source/context pages**, including all **192 Basic 7 table pages**. The review is not an official NaCCA erratum or independent pedagogical certification.

| Subject | Entries / proposed competencies | Strands | Sub-strands | Content standards | Entry-specific unresolved rows |
| --- | ---: | ---: | ---: | ---: | ---: |
| English Language | 53 | 5 | 13* | 23 | 1 |
| Mathematics | 74 | 4 | 12 | 20 | 2 |
| Computing | 55 | 4 | 14 | 18 | 9 |
| Science | 53 | 5 | 20 | 27 | 0 |
| Total | **235** | **18** | **59** | **88** | **12** |

*English includes the structurally indicated sub-strand 4 under Grammar Usage, whose official title is absent. Its official title remains null. The mapping has an explicitly nonofficial placeholder; it does not invent “Aesthetic Language” as an official heading. All figures count the detailed Basic 7 tables, including source conflicts, rather than silently adopting overview totals.

Computing's 55 entries have 52 distinct printed codes. They remain 55 distinct proposed competencies. The other subjects have no repeated printed indicator codes. There are 11 unresolved issue groups: six entry-specific groups affecting the 12 rows above, and five broader reference/provenance groups. The latter still apply even to rows marked `mapped`.

No Phase 8A input, PDF, Basic 4-6 content, production code, test, dependency manifest or storage-cleanup file was modified. No lessons, questions, rubrics or learner progress were generated or changed. Application, browser and database tests were not run: this phase validates documentation only.

## Deliverables and identity policy

| File | Purpose |
| --- | --- |
| [basic7-filumire-mapping.json](basic7-filumire-mapping.json) | Complete hierarchy, intended competency IDs, exact printed codes, source activities, assessment planning classifications and issue links |
| [basic7-filumire-mapping.csv](basic7-filumire-mapping.csv) | Flat reviewable 235-entry mapping with PDF/printed/continuation pages, source URLs and checksums |
| [basic7-mapping-source-issues.json](basic7-mapping-source-issues.json) | Resolved formatting/heading decisions and unresolved conflicts, with exact source pages and affected entries |
| [basic7-mapping-source-review.json](basic7-mapping-source-review.json) | Per-entry review record, fresh source-page text hashes and source assertions |
| [basic7-mapping-validation.json](basic7-mapping-validation.json) | Saved validation results |
| [build-basic7-mapping.mjs](build-basic7-mapping.mjs) | Reproducible documentation builder; reads PDFs and Phase 8A inputs |
| [validate-basic7-mapping.mjs](validate-basic7-mapping.mjs) | Documentation validator; read-only by default |
| [render-basic7-mapping-review.mjs](render-basic7-mapping-review.mjs) | Source-header review renderer; writes only to an explicitly configured temporary directory outside the project |
| This document | Findings, architectural review, implementation phases and acceptance criteria |

The source-backed intended competency title is the indicator statement. One source row maps to one proposed competency. Example: `english:pdf38:row1` maps to `competency-gh-english-b7-nacca2020-p038-r01`. These are **proposed**, unregistered IDs scoped by subject and source edition/anchor. They are deliberately independent of corrected/reused codes. Once approved, freeze them; do not regenerate them for a replacement PDF with changed page positions. A later source revision needs an explicit crosswalk and scope-equivalence review.

Every row preserves `original_printed_code`, including spaces/punctuation; also retains the Phase 8A whitespace-collapsed code. Structural keys such as `B7.4.1` identify hierarchy positions derived from printed standards and headings; they are not assertions that those exact hierarchy codes were separately printed. `filumire_format_alias` is a planning alias, never an official code replacement. Conflicting code entries have a null alias. The CSV and JSON make the distinction explicit.

Canonical strand node titles use the first printed Basic 7 heading for that structural strand; each later source heading variant and its page remain on the row. This prevents the same node receiving both “Grammar Usage” and “Grammar”, for example. Source headings are not edited.

Proposed version `curriculum-version-gh-nacca-ccp-2020`, phase `phase-gh-jhs-ccp`, level/grade `level-gh-basic-7-ccp` and four subject IDs are design reservations, not active application registrations. Source PDF SHA-256 hashes and all Phase 8A input hashes are pinned in the mapping. Do not use source-page locators as learner evidence or assessment IDs.

## Resolutions supported by the PDF

1. **English writing heading:** PDF 60 / printed 24 truncates the title at “PRODUCTION AND”. The Basic 7 contents on PDF 6 / printed v and scope on PDF 36 / printed xxxv explicitly supply **Production and Distribution of Writing**. Both writing entries use this title, retain their original truncated context, and cite the resolving pages.
2. **Formatting aliases only:** Mathematics `B71.2.2.2` receives alias `B7.1.2.2.2` using its displayed parent and adjacent entries on PDF 39-41; missing-B codes `7.3.1.2.4` through `.6` receive B-prefixed aliases using the construction standard and series on PDF 81, 85-88. `B.7.3.2.1.1` and Science `B.7. 5.3.1.1` receive punctuation-only aliases supported by their parent cells. Three Mathematics standards with `B.7` and Computing's `B7 2.3.3` receive internal structural keys preserving the source digits. These six indicator aliases and four standard aliases are not publisher-issued corrections.
3. **Phase 8A transcription correction:** Mathematics PDF 87 / printed 57 visibly says **“Construct angles whose measures are 15° and 75°.”** Phase 8A had “Constructing”. Only the Phase 8B statement is corrected; the Phase 8A original is retained in each row and its files are unchanged.
4. **Science cell scope:** PDF 42-43 / printed 5-6 explicitly distinguish the animal-cell indicator from the plant-cell indicator, with matching exemplars. They remain separate. The Phase 8A request for clarification of that wording is resolved without rewriting either objective.

## Unresolved source issues

| Issue | Source evidence | Mapping decision / remaining action |
| --- | --- | --- |
| English missing sub-strand 4 title | PDF 59 / printed 23; scope PDF 36 lists only three grammar sub-strands | Preserve code and displayed standard; official sub-strand title null. Obtain NaCCA clarification before giving it an official navigation label. |
| Mathematics shortened comparison code | PDF 33 / printed 3 prints `B7.1.1.2` inside `B7.1.1.1` | Parent mapping is clear; a replacement five-part indicator code is not supplied. Preserve printed code, null alias. |
| Mathematics billion boundary | PDF 32 / printed 2: indicator “more than” one billion, exemplar “up to” one billion | Preserve both; subject reviewer must specify the scope before authoring. |
| Computing word-processing numbering | PDF 37-39 / printed 8-10 | Keep both `.3` rows and six-part `.4.5` / `.4.6` rows separate; no guessed sequence or official replacement codes. |
| Computing presentation numbering / parent | PDF 40-41 / printed 11-12 | Both `.1.2` and `.1.3` codes recur under different standard cells. Use displayed parents and distinct IDs, null aliases for the four conflicting entries. |
| Computing embedded Basic 8 code | PDF 36 / printed 7, inside `B7.1.3.1.3` | Preserve the Basic 7 top-level row; flag embedded `B8.1.3.1.1`. Do not add a 236th row or silently incorporate Basic 8 scope. |
| English missing reference-number diagram | PDF 31 / printed xxx contains literal question marks in the rendered page | Leave missing illustration unresolved; do not fabricate it. |
| Mathematics overview count mismatch | PDF 30 / printed xxx says 19 standards / 2 Measurement standards; PDF 89, 94, 97 show three detailed Measurement standards | Keep all 20 detailed standards. Publisher clarification needed before any summary count is presented as reconciled. |
| Edition / programme-duration inconsistencies | September 2020 covers, differing copyright years and three-/four-year preamble wording | Preserve manifest evidence; do not claim a numbered edition or resolve duration by guesswork. |
| Source transport authentication | Phase 8A official-host HTTP retrieval | Reconfirm the pinned PDF hashes over working HTTPS or against authenticated publisher copies/checksums before production acceptance. No new PDF copies were downloaded here. |
| Additional assessment references | Subject assessment sections cite NPLAF (2020a) and SBA Guidelines (2020b) | Retrieve and verify these separately before claiming complete national reporting compliance. |

Joined words and mathematical layout remain visible in source text. Source diagrams and formula typography remain authoritative in the unchanged PDFs. Formatting aliases do not repair mathematical content or imply that every exemplar has passed expert subject review.

## Assessment requirements and curriculum-supported activities

Every JSON entry includes its complete original indicator/exemplar cell text and continuation pages, together with source-excerpt-backed planning classifications and suggested FILUMIRE response modes. These classify actions actually present in the source, such as speaking, composing, demonstrating, constructing, investigating or explaining. They are not newly authored activities, prescribed official question formats, test questions or finished rubrics. Multiple classifications may apply to one entry. A subject reviewer must turn these requirements into assessment design in a later phase.

| Subject | Requirements and supported activities | Source examples / architecture consequence |
| --- | --- | --- |
| English | Listening and speaking, vowel/diphthong production, text interpretation and summarising, contextual grammar, process writing and literature | PDF 38-42, 43-59, 60-72. Oral/aural stimulus and observable speech must remain distinct from a text-only answer. Written composition and literature explanations need constructed-response evaluation. PDF 32-33 also specifies integrating skills, process writing and five books per term; a single quiz cannot represent the full programme. |
| Mathematics | Numerical reasoning with explanations, manipulatives, algebraic modelling, ruler/compass construction, graphs/vectors, surveys and data representations | PDF 32-76, 77-106, 107-118. Preserve equations, units, bearings, construction accuracy and reasoning. Numerical exact match alone cannot verify construction or survey performance. |
| Computing | Device use, Windows/file management, software artifacts, networks, online information evaluation, algorithms and application discussions | PDF 31-51. Distinguish knowing a menu label from actually producing/editing a document or spreadsheet. Some application/version wording and platform-specific instructions require later instructional review, not silent replacement of official indicators. |
| Science | Classification, observation, research reports, cell models, cycles, agriculture, investigations, circuits, machines and tool use | PDF 39-87. Practical demonstrations, models and observation records require evaluated evidence of the actual performance. Designing a safe, feasible practical delivery method remains later work; none is generated here. |

General assessment guidance is cited per entry: English PDF 18-23, Mathematics 18-21, Computing 17-20, Science 20-25. It covers assessment for/as/of learning, feedback, learner reflection, authentic performance, cumulative records and criterion-referenced reporting. Official reporting percentages remain source descriptors, not replacement adaptive mastery thresholds.

Retain three separate design layers: (a) the curriculum's minimum outcome and source-supported activities; (b) independent evidence sufficient to substantiate that performance; (c) diagnostic/scaffolded practice that can guide learning without establishing independent mastery. Later retention and transfer designs must measure the same competency after delay or in a changed context, with assistance provenance intact. This phase assigns no artificial scores, difficulty, prerequisites or mastery cutoffs.

## Architecture review

The following observations come from read-only source inspection; they are not browser/database verification.

| Area / inspected file | Reuse | Required addition or change before Basic 7 release |
| --- | --- | --- |
| `packages/curriculum-framework/index.ts` | Version/phase/grade/subject hierarchy; node types, string IDs, parent relationships, `sourceReference`, capability and availability gates | Add CCP context and Basic 7 source nodes under approved IDs. Keep Basic 4-6 identities/version intact. Make source-code aliases separate from node IDs and preserve ambiguity metadata. Do not mark a subject fully supported merely because its source nodes exist. |
| `packages/curriculum/index.ts`, existing B6 adaptive/runtime specifications | Competency definition structure and explicit competency IDs / node mappings | Add Basic 7 runtime definitions only after difficulty, prerequisite/subskill/evidence designs exist. Map each approved source entry explicitly. Source order is not a prerequisite graph. Never feed duplicate official codes into the existing code-keyed builders as unique identifiers. |
| `services/learner-context/index.ts`, `apps/learner/components/filumire/grades.ts` | Persisted contexts and supported-grade validation; current UI explicitly lists Basic 4-6 | `requireSupportedGrade` checks the learner's current curriculum version, or the default pilot version. A new CCP version will therefore need an explicit authorized placement/version-selection path; simply adding Basic 7 to the UI or a different version's registry will fail. Validate version, grade and subject atomically, preserve guardian/teacher grade authority and old progress; no auto-promotion or default-context reset. |
| `services/database-schema.ts`, `services/persistence.ts` | Grade/context identifiers are represented as strings | No schema migration is proven necessary by mapping alone. Verify actual database constraints and cross-version context round trips in an isolated test database before deciding. Do not alter live storage during this work or Claude's cleanup. |
| `services/curriculum-navigation`, learning overview routes | Data-driven subject/topic resolution and capability gating | Add coherent names, bilingual display labels and grade-bound initial-topic selection. Source-only or unresolved mappings must not expose empty lessons or learner-facing placeholder titles. |
| `packages/domain/index.ts`, `services/assessment/index.ts`, teacher-review services | Evidence purposes, independence levels, response modes, trusted evaluation paths and teacher review | Prove suitable evaluators and learner/teacher interactions for oral/aural, constructed response, worked reasoning and practical/digital artifacts. Domain response-mode names alone do not establish UI/evaluator support. Keep assistance, question identity and evaluator provenance server-controlled. |
| `services/content-store/authored-builder.ts` | Existing bilingual authored-content plumbing | The common builder emits `assessmentStrategy: multiple_choice`; that does not cover all practical/oral/constructed outcomes. Extend narrowly where needed, preserving existing Basic 4-6 behavior. No builder rewrite or content generation is performed here. |
| `services/adaptive-engine`, `services/mastery`, `services/retention-transfer` | Generic guided/independent evidence and adaptive decisions | Configure reviewed prerequisites/evidence profiles for new competencies. Keep supported success distinct from mastery and avoid routing across grade boundaries without explicit policy. |
| `services/learner-path/revision.ts` | Retention scheduling/unfinished-activity continuity | Current subject revision eligibility requires suitable retention content for every published competency in both languages, with expected responses and without trusted-rubric-only evaluation. Practical/teacher-reviewed competencies need a deliberate eligibility/evidence policy; one unsupported competency can disable revision for a subject. |

The four source PDFs are English-language references. French help/UI and later instruction require bilingual subject review while preserving English Language performance targets (English pronunciation, English writing, etc.). Translations must not change the official outcome or re-identify an in-flight guided retry. A language switch must retain the delivered question/evidence identity according to the existing correction policy.

## Implementation sequence and acceptance gates

1. **Freeze the approved source-to-ID mapping.** Reconfirm publisher source hashes, review the six row-specific issue groups and the five broader groups, and agree which unresolved entries remain quarantined. Approve internal formatting aliases, source references and the separate CCP version/placement design. Produce an explicit resolved/deferred decision for each issue; never guess replacements. No content generation is required for this gate.
2. **Add a hidden Basic 7 source registry.** Register the CCP context, grade, four subjects and source hierarchy in the framework, with unsupported/unpublished capabilities. Add provenance/alias data without changing Basic 4-6 IDs. Keep runtime competencies, learner grade options and topic availability gated until their release criteria are met. Test 235 source-entry links, 235 stable reserved competency identities, 88 detailed standards, all duplicate-code cases, null-title quarantine and unknown-ID rejection.
3. **Implement explicit CCP learner placement.** Add authorized version-aware profile/grade selection and context resolution. Validate that a new Basic 7 learner resolves the CCP grade/subjects; an existing Basic 4-6 learner remains on the existing version with exactly the same competency states and progress. Test guardian-grade locks, rejected cross-grade topics, persistence round trips, desktop/mobile navigation and bilingual grade labels. Perform database tests only in an isolated environment, after coordination with cleanup work.
4. **Design a bounded Basic 7 Science pilot.** Begin with standard `B7.1.1.1`, the three Materials indicators on PDF 39-40 (classification; importance of liquids; importance of solids). They have clear printed codes and parent mapping. Review activity feasibility, representations, evidence and prerequisites before any later lesson authoring. Decide how practical classification/report evidence is evaluated, how corrections/retries operate and how independent retention/transfer will be verified. Keep remaining subjects unpublished.
5. **Add the minimum assessment capabilities and bilingual pilot content.** In a separately authorized implementation phase, add only evaluator/UI capabilities proven necessary by the pilot. Then author/review English and French support and independent evidence. Require a wrong-answer-to-correction-to-guided-retry-to-continuation journey, plus verified question/evidence preservation across language switches. Do not lower existing mastery standards to accommodate a new response mode.
6. **Expand Basic 7 progressively.** Review and publish further Science strands, then a bounded Mathematics strand, English and Computing. Computing's conflicting code groups and embedded B8 reference stay deferred until their source-scope decisions are approved. English oral/aural and writing performance require real evaluator/interaction support. Expand topic batches with complete evidence, revision eligibility and meaningful navigation, rather than declaring whole-subject completion from source coverage.
7. **Release gate before any Basic 8-9 expansion.** Demonstrate 48 Basic 7 smoke scenarios: 4 subjects x 2 languages x 2 desktop/mobile viewports x 3 representative learner states (new, correction-in-progress and returning/progressed). Cover all published response modes and every source entry in data checks; do not confuse this smoke matrix with exhaustive content verification. Re-run relevant Basic 4-6 suites, verify isolated database persistence and record remaining capability limitations. Commit/push/deploy require separate authorization; none occurs in Phase 8B.

**First concrete development task after approval:** add the hidden, unsupported Basic 7 CCP framework/source registry and its focused mapping-integrity tests (step 2), consuming the frozen IDs/provenance while leaving learner selectors, runtime competency activation and all Basic 4-6 data unchanged. Resolve the version-aware placement design before exposing that registry to learners.

Suggested existing regression targets for later implementation are `tests/curriculum-framework.test.ts`, `tests/curriculum-navigation.test.ts`, `tests/grade-aware-subject-selection.test.ts`, `tests/guardian-grade-lock.test.ts`, `tests/immediate-correction.test.ts`, `tests/assessment-external-evidence.test.ts`, `tests/api-evidence-integrity.test.ts`, `tests/teacher-trusted-review.test.ts`, `tests/content-language-selection.test.ts`, the retention/transfer suites, `tests/spaced-revision-subjects.test.ts` and existing grade-navigation/correction browser suites. Extend only the tests justified by the implemented phase; current Basic 7 rejection expectations should change only when support is deliberately activated.

## Validation and reproducibility

Validation passed **2,132 fresh source checks** and **5,069 saved-mapping checks**. They cover hashes, all 235 source entries, exact printed codes, PDF/printed/continuation pages, parent and heading evidence, CSV round trips, shared-node coherence, assessment excerpt provenance, unique IDs/aliases, issue/status completeness, unpublished state and collisions with current runtime/framework identifiers. All 11 Phase 8A input files have unchanged hashes. These checks validate the mapping, not application readiness or source authenticity.

Run `node docs/curriculum-sources/ghana/ccp-b7-b9/validate-basic7-mapping.mjs` from repository root for read-only validation. Add `--record` only to update its dedicated validation report. Regenerating the mapping requires `FILUMIRE_PDFJS_MODULE` pointing to an installed PDF.js module; the builder writes only the four Phase 8B JSON/CSV mapping/review/issue outputs. Visual review additionally uses `FILUMIRE_CANVAS_MODULE` and an external `FILUMIRE_B7_REVIEW_DIR`. No repository dependencies were changed. Visual-review completion in the review record describes this performed review; regeneration of crops alone is not a substitute for inspecting them.

The current mapping is complete and validated as documentation. Its unresolved issues and provenance limits remain explicit. Production implementation, content generation and deployment remain stopped pending the next authorized phase.
