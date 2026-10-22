# Approved Basic 5 completion tranche

The four confirmed source-registration gaps now have registered competencies and 104 authored English/French records. This establishes source associations and tested learning paths, **not educator-certified curriculum completeness or pilot approval**.

| Objective | Source | Delivered |
|---|---|---|
| Science B5.2.2.1.2 | NaCCA Science B4-B6, September 2019, PDF44 / printed22, standard B5.2.2.1 | Dated bean/maize observations over several days, seed-leaf comparison, worked illustration, safe practical guidance, independent observation/comparison tasks |
| Computing B5.1.3.1.9 | NaCCA Computing B4-B6, September 2019, PDF36 / printed15, standard B5.1.3.1 | Labelled tables and diagrams, preservation of collected values, original notes and actual products required for review |
| Computing B5.1.3.1.10 | Same source page and standard | Reading data displays; sum, mean and differences; justified suggestions and sample limitations; new-dataset transfer |
| Computing B5.6.4.9.1.2 | NaCCA Computing B4-B6, September 2019, PDF48 / printed27, literal standard B5.6.4.9.1 | Identity-theft protection reasoning, signing out and checking a shared device, fictional scenarios and reviewed explanations |

Original physical pages were visually inspected. Raw printed codes, page numbers and SHA-256 references are in `new-objective-provenance.json`; original PDF paths, publishers, edition information and official URLs remain in `../reconciliation/source-manifest.json`. No PDFs were copied or modified. The six-part Computing code is preserved, with an explicit parent link to Digital Literacy rather than a guessed prefix-derived parent.

Each unit has four teaching cards, one guided knowledge question, two diagnostic tasks, two reassessment tasks, two knowledge-revision questions and two transfer tasks, in each language. The 104 records comprise 32 teaching records, 48 productive tasks requiring trusted teacher review and 24 automatic guided/revision checks. These are FILUMIRE-authored adaptations, not official NaCCA assessment rubrics. Educator and French-language approval remain pending.

New diagnostic, reassessment and transfer tasks cannot be auto-scored by matching the rubric marker. Learner submissions remain pending without evidence until an authorised teacher reviews the actual work. Rubrics require independent work and inspection of observations, displays or explanations. Guided quiz/retry evidence remains guided. Automatic retention checks explicitly assess knowledge, not renewed practical performance. No multiple-choice answer alone establishes productive mastery in the four new units.

## Necessary technical repair

Testing exposed loss of delivery provenance in trusted teacher review: pending-review storage did not retain the delivering intervention. Reviewed transfer evidence had a transfer purpose but no `transfer_check` intervention type, so the existing transfer evaluator could not update progression.

`resolveReviewIntervention` now recovers the latest matching server-recorded delivery at or before submission, validating learner, session, competency, item, content and actual intervention ownership. The teacher route supplies that ID to the existing evaluator. Legacy reviews without a delivery remain unbound as before. No database schema, mastery threshold, evidence policy version, adaptive rule or historical evidence was changed. Tests reject foreign/mismatched/future bindings and verify exact delivery identity, productive response mode and idempotent review.

## Mapping and subskill investigation

All 68 mapping-review records have individual traceable triage records in `mapping-review-adjudication.json`. Findings include 47 printed hierarchy conflicts, 16 literal-code/stable-key differences, one uncoded activity, two missing-heading records and 15 lexical-alert-only records; categories overlap. Existing page-specific associations and every source flag remain intact. Lexical similarity is not educational approval. No guessed code correction or runtime renumbering was justified. Printed inconsistencies still require qualified source clarification; instructional depth remains a separate review.

All 34 subskill-gap records were inspected against actual question prompts and current tags; `subskill-review.json` includes the questions and disposition. Two independently verifiable metadata omissions were repaired in both languages:

- The common-noun item explicitly identifies *dogs* as a common noun despite its sentence-initial capital: added `recognise_common_noun`.
- The data-collection item explicitly asks which tool is useful and identifies a checklist: added `identify_data_collection_tool`.

Only those four existing question records changed tags and versions. IDs, prompts, answers and diagnostic rules remain unchanged. The other 32 competency records remain open: downstream application or recognition does not necessarily isolate the missing precursor skill, and MCQs do not establish observation, creation, recording or oral presentation. No blanket tags, teacher scores or approvals were manufactured.

## Coverage and preservation

The current matrix contains **866 competencies associated with all 871 distinct source objectives/activities** across the 12 grade/subject combinations. Some indicators share an existing competency, and five repeated source occurrences were already grouped; these counts are not interchangeable. Basic 5 now has 134 English, 67 Mathematics, 29 Science and 82 Computing competencies. All other grade/subject competency totals remain unchanged. See `coverage-by-grade-subject.json`, `competency-matrix.json` and `source-objective-matrix.json`.

Regression assertions compare all 862 pre-tranche competency definitions exactly, including prerequisites, successors and requirements. They compare all 22,432 prior Basic 4-6 content records, preserving the earlier Science wording repair and permitting only the four explicitly verified question tag/version updates. Existing teaching/assessment bodies, IDs, learner histories and learning rules were not rewritten.

## Validation

- **50/50 distinct selected suites pass** after affected-suite reruns. The first broad run had 51 executions because one teacher suite appeared twice; its single failure was the obsolete visual inventory count. The repaired test requires 866 unique topics, six previously reviewed visual pilots and 860 unreviewed topics. No test was skipped, removed or weakened.
- **16/16 new API scenarios pass:** four objectives x two languages x correct/incorrect due revision. They exercise teaching/example, interrupted lesson, correction, guided retry, language-preserved question identity, pending review without evidence, incorrect and correct fictional teacher judgements, mastery, reviewed transfer, reauthentication after 31 days and actual due-revision delivery. Correct revision records `pending` after one observation; incorrect revision records `not_retained`, blocks readiness and supplies correction. The existing two-observation retention rule is unchanged.
- **36/36 browser cases pass:** eight new-unit cases on the final production build, 24 existing interface regressions and four real service-worker offline/synchronisation cases. New cases use visible topic selection and existing components, check meaningful names, bilingual teaching, wrong-answer correction, guided retry, preserved identity/evidence on language change, productive response entry and pending-review submission without mastery. Teacher scoring and due revision were tested through APIs, not claimed as browser-tested teacher interactions.
- Root TypeScript check passes with zero errors. Final learner production build passes. Diff whitespace check passes with Windows CRLF recognised. Next.js still reports the inherited multiple-lockfile/workspace-root warning.

Logs, case results and screenshots are retained in this directory. All learner/teacher test work is fictional and uses memory persistence with an unreachable database. Test fixture judgements are not actual educational approvals. No live database durability, restart/reconnect persistence, real-phone or classroom acceptance is claimed. Browser server was stopped and its local port released.

## Remaining pilot blockers and boundary

Subject educators must approve task scope, rubrics, plant/seed choices, practical safety and productive evidence. French specialists must review all new translations. Real learners must produce actual observations/products/explanations, and authorised teachers must review them; none exists from these automated fixtures. Prior productive-evidence review candidates, the 32 remaining subskill-gap records, printed source ambiguities, visual reviews and broader bilingual/progression review remain outstanding. Knowledge revision is not practical retention certification; a single successful spaced answer is not confirmed retention.

Database-backed durability/resume verification and controlled classroom/mobile trials remain required before pilot approval. The offline browser checks verify the existing fallback and queued-answer synchronisation; they do not provide a complete offline adaptive engine or offline parent/teacher systems. Payments remain a separate branch dependency and were not changed or tested here.

Exactly 15 existing code/test files were modified and eight code/test/script files created; `files-changed.json` lists every path relative to this worktree. Audit matrices, logs and browser evidence were created under this directory. Pre-existing uncommitted work was preserved. Basic 7-9 files, payment files, other worktrees, Claude's interface work and the Voice Lab were not modified. No commit, merge, push or deployment occurred.

**Stop here.** This approved tranche is implemented and technically validated; the full Basic 4-6 programme remains short of controlled-pilot readiness. Obtain educational/translation review and resolve the documented pilot gates before further substantial expansion.
