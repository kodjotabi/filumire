# Basic 4–6 completion plan

This plan follows the 22 October 2026 audit. It proposes work; it does not authorise or implement production changes. No estimate assumes that repository coverage equals official NaCCA completeness.

## Exact current review workload

Every listed runtime competency needs source-page reconciliation, educational approval and bilingual review. The indicated subskill gaps have exact IDs in `review-queue.json`. Productive candidates are a first-pass title heuristic; an educator must determine the actual official performance requirements.

| Grade / subject | Source + teaching + translation review rows | Subskill-tag gap rows | Initial productive-assessment candidates | Additional individually unexecuted API journeys |
|---|---:|---:|---:|---:|
| B4 English | 131 | 21 | 22 | 130 |
| B4 Mathematics | 67, including 3 legacy IDs | 9 | 7 | 66 |
| B4 Science | 24 | 2 | 1 | 23 |
| B4 Computing | 27 | 1 | 7 | 26 |
| B5 English | 134 | 0 | 18 | 133 |
| B5 Mathematics | 67 | 0 | 2 | 66 |
| B5 Science | 28 | 1 | 1 | 27 |
| B5 Computing | 79 | 0 | 6 | 78 |
| B6 English | 134 | 0 | 24 | 133 |
| B6 Mathematics | 45 | 0 | 1 | 44 |
| B6 Science | 28 | 0 | 1 | 27 |
| B6 Computing | 98 | 0 | 9 | 97 |
| Total | 862 | 34 | 99 | 850 |

There is no confirmed absent lesson against the 859-entry local catalogue. The number of absent official competencies remains **unknown** until all four official PDFs are reconciled. All 15,533 question records need a representation/assessment-design decision; do not populate labels mechanically without checking what the learner actually sees and demonstrates.

## Priority and sequence

1. **Repair the confirmed French offline defect.** Scope the bilingual hiding rules in `apps/learner/public/offline.html` to the intended content containers so they cannot hide the root HTML element. Add real service-worker browser regressions with EN and FR browser locales, active learner language differing from browser locale, online→offline reload and reconnect. Preserve pending-answer identity and exactly-once trusted evidence. This should be a small isolated patch, with no engine or interface redesign.
2. **Establish the official denominator before expanding content.** Retrieve the four official NaCCA primary B4–B6 PDFs when network access is available; record original URLs, grade range, publisher/edition only as printed, SHA-256 and page numbering conventions. Reconcile every printed indicator with the 866 current indicator nodes and 862 runtime competencies. Identify unsupported claims, absent indicators, partial/supporting mappings and ambiguous source text. Preserve printed codes, stable internal IDs and all evidence. Maintain an explicit discrepancy/review register; do not invent corrections.
3. **Restore the root validation baseline.** Correct the three inherited test typing errors using accurate fixture types and explicit assertion narrowing. Do not suppress diagnostics, relax strictness or weaken assertions. Keep the separate Phase 8E retention regression/integration decision visible. Keep the six blocked payment tests documented as a separate branch dependency and obtain payment-specific approval for any work there.
4. **Complete Basic 4 in small reviewed units.** Begin with an official-source-confirmed English productive skill such as four-line poem composition, because the current content visibly teaches production while collecting only selected responses. Reuse existing trusted teacher review rather than treating an MCQ or guided correction as independent performance. Connect a complete reviewed teaching→practice→independent evidence→correction→retention→transfer journey. Then proceed through B4 English, Mathematics, Science and Computing according to the official inventory and educator risk ranking. Review 21/9/2/1 subskill-tag gaps and the four shared Mathematics code mappings. Preserve all three legacy pilot IDs.
5. **Complete Basic 5 using the validated pattern.** Reconcile the 308 runtime competencies and review all bilingual content. Prioritise the Science respiration/excretion wording, its one subskill-tag gap, English oral/written production, Computing tool tasks and mathematical reasoning/representations. Reuse the approved B4 assessment/review flow; do not generate a parallel engine.
6. **Complete Basic 6 and verify the vertical sequence.** Reconcile the 305 runtime competencies, deepen any insufficiently explained modelling/ratio topics after educator review, and verify independently produced English, Science investigations and Computing artefacts where the official curriculum requires them. Trace concept and terminology progression across B4–B6; avoid adding automatic grade promotion merely to encode curriculum relationships.
7. **Run the final pilot gate on the integrated candidate.** Verify every competency's correct, incorrect and repeated-error paths in both languages; interruption/resumption; guided evidence separation; earned mastery; due and incorrect retention; independent transfer; trustworthy progress/completion; long-content mobile layouts and offline/device recovery. Then perform controlled database persistence and classroom usability tests. Publish a bounded scope if any officially required outcome remains incomplete; do not describe a partial pilot as complete Basic 4–6 coverage.

Steps 1–3 can be prepared independently, but content expansion and claims of completeness depend on step 2. The subject order within each grade can change after official source reconciliation; counts in this plan must then be versioned rather than silently treated as the final official denominator.

## Dependencies and complexity

Complexity means relative effort, not a delivery promise: **S** = a narrowly scoped code/test correction; **M** = several modules or specialist review; **L** = a complete reviewed subject/grade tranche; **XL** = substantial curriculum-wide review. Official indicator additions are not estimated before their number is known.

| Work | Complexity | Dependency / review owner | Acceptance evidence |
|---|---|---|---|
| French offline root-selector repair | S | Existing PWA and browser runner | Both locales render visible content; queued evidence remains exactly once |
| Three root test typing repairs | S | Existing test contracts; preserve assertions | Root `tsc --noEmit` passes |
| Official four-document manifest | S–M | Official HTTPS access, curriculum reviewer | Verified bytes/hash, edition and source provenance |
| Page-level reconciliation of 866 existing nodes | L | Four PDFs and Ghanaian subject specialists | Every existing and official indicator has a disposition and page reference |
| 34 declared-subskill metadata gaps | M after educational review | Question content vs actual intended subskill | Explicitly justified coverage or a reviewed new task; no invented metadata |
| Productive assessment connection | M for one vertical slice; L–XL for all required skills | Existing trusted review, educator rubrics, device/privacy constraints | Independent learner work is assessed and cannot be manufactured by guided retries |
| Bilingual educational review, 862 current topics | XL | Ghanaian educators and qualified French reviewer | Signed topic-level accuracy, accessibility and translation decisions |
| B4 completion tranche, 249 runtime IDs | L–XL | Source scope, reviewed assessment pattern | All B4 official requirements accounted for; no evidence/ID loss |
| B5 completion tranche, 308 runtime IDs | L–XL | B4 pattern and vertical mapping | Grade-specific depth and progression validated |
| B6 completion tranche, 305 runtime IDs | L–XL | B5 progression and official practical requirements | Exit-level scope, depth and independent performance validated |
| Full curriculum journey expansion and regression | L | Reviewed content, deterministic fixtures | Both-language test matrix and negative evidence checks |
| Database/device/classroom validation | M–L | Isolated test DB, representative phones/network, pilot educators | Durable/resumed evidence, real accessibility and child-use observations |

The existing correction, mastery, retention/transfer, language, progress and teacher-review architecture can be reused. Any proposal to change fundamental mastery thresholds, assisted-evidence rules, privacy boundaries, grade assignment or persistence schema needs separate design approval. Avoid altering these rules to accommodate an underspecified content item.

## Required human review

- Official NaCCA hierarchy and exact indicator wording, codes, assessment expectations and ambiguous printed material.
- Whether a quiz measures recognition or the required independent performance; acceptable teacher observation/rubric evidence for poems, reading, practical investigations and software work.
- Science generalisations identified in `AUDIT.md`, mathematical depth/concrete representations, examples and distractors, and correction that diagnoses rather than merely supplies answers.
- French accuracy and age suitability, including when English examples should remain in the target-language lesson.
- Reading load, inclusion, accessible alternatives, phone/device demands and safe practical activities.
- Cross-grade prerequisites and progression; shared Mathematics code relationships and legacy progress compatibility.

## Pilot acceptance criteria

1. The official scope is demonstrable: original PDF manifest, verified page references, all printed indicators accounted for, unresolved items explicitly signed off or excluded from a clearly bounded pilot. No unverified row is counted as complete.
2. Every in-scope indicator has appropriate teaching, a worked example, guided practice and independent assessment of its actual outcome. Required productive/practical work has real evidence and a reviewed rubric or equivalent existing trusted mechanism.
3. Both EN and FR content have educator/language approval. Runtime fallback or retained correction language is accurately identified and never presented as an authored translation.
4. Incorrect/repeated responses produce relevant correction and intervention. Guided evidence cannot independently establish mastery. Thresholds and existing learner evidence remain intact.
5. Tests demonstrate earned mastery, future-due retention presentation, correct/incorrect retention updates and independent transfer. Interrupted/resumed and language-switched attempts preserve assessment identity and evidence. Add the specific Phase 8E regression before declaring the relevant integrated branch covered.
6. All 12 grade/subject groups pass desktop/mobile EN and FR navigation and long-content tests. The French offline fallback is visible; loaded-screen reading, pending-answer persistence, reconnect and deduplication work. Clearly state that full offline adaptive learning is not currently provided; if that is required for the pilot, scope and approve it separately.
7. Root TypeScript, production build and the agreed full relevant regression set pass with no skipped/weakened tests. Payment branch dependencies remain separate and do not get silently counted as passes.
8. An isolated database test demonstrates durable progress and evidence through restart/resume, idempotent retries, review scheduling and shared-device access boundaries. No production database is used for validation.
9. Representative teachers/learners sign off age appropriateness, practical feasibility and accessibility on real devices. No unresolved critical interface, evidence-integrity or content-accuracy blocker remains in the pilot scope.

**Next approval:** authorise the narrow French offline repair and source-reconciliation tranche. Keep broader curriculum changes behind the resulting reviewed completion register. No implementation begins under this audit deliverable.
