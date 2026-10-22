# FILUMIRE Phase 8D: Basic 8-9 extraction and mapping

Prepared 22 October 2026. Documentation and proposed curriculum mapping only.

## Delivery and safeguards

The completed new artifacts are in this folder, outside the repository. The session could read but could not write the active repository at C:/FILUMIRE/filumire-batch1/FILUMIRE_CLAUDE. A proposed home-directory output path was also denied; this permitted temporary workspace was used. Repository installation is therefore outstanding. These files can be added under docs/curriculum-sources/ghana/ccp-b7-b9 in a separately writable session without replacing any Phase 8A/8B file.

No source PDF was changed or downloaded. No existing Basic 7 record, Basic 4-6 content, production application code, registration, lesson, assessment item, database, Git commit, remote repository or deployment was changed. All 20 original source-package files and 13 inspected files containing existing application/uncommitted curriculum work have unchanged SHA-256 hashes. The source repository was read-only throughout.

## Exact coverage

| Grade | English Language | Mathematics | Computing | Science | Total mapped entries |
| --- | ---: | ---: | ---: | ---: | ---: |
| Basic 7, unchanged Phase 8B | 53 | 74 | 55 | 53 | 235 |
| Basic 8, Phase 8D | 49 | 58 | 39 | 46 | 192 |
| Basic 9, Phase 8D | 51 | 52 | 37 | 58 | 198 |
| **Basic 7-9** | **153** | **184** | **131** | **157** | **625** |

All 390 new entries have a separate proposed competency ID. Across the unchanged Basic 7 mapping and this work there are 625 unique proposed IDs. Mapping coverage is 100% of the leading printed indicator entries in the pinned detailed grade tables. This is not a claim of production support, independent pedagogical certification, or 625 distinct non-overlapping learning outcomes. Basic 4-6 was outside this phase and was not re-extracted or revalidated.

Basic 8 has 192 subject-scoped distinct printed codes. Basic 9 has 194, with 198 physical entries: four extra repeated-code occurrences are retained in Science. Basic 7 retains its existing 232 subject-scoped distinct codes. Do not merge rows merely because their printed labels match.

The Computing Basic 8 entry printed B9.2.3.1.7 stays in the physical Basic 8 inventory, with a unique B8 proposed ID and an explicit unresolved issue. Embedded references to indicators do not create entries. In particular, Computing PDF 78 and Science PDF 114 contain references within exemplars that must not be counted as duplicate leading indicators.

## Original sources and grade boundaries

Source document identity, retrieval history and immutable checksums remain in the original basic7-source-manifest.json. Each new inventory subject and every mapping row repeats the original source URL, path and hash. Original filenames are ENGLISH-LANGUAGE.pdf, MATHEMATICS.pdf, COMPUTING.pdf and SCIENCE.pdf.

| Subject | Basic 8 PDF pages / printed pages | Basic 9 PDF pages / printed pages | Following non-curriculum boundary |
| --- | --- | --- | --- |
| English Language | 74-104 / 38-68 | 106-136 / 70-100 | Writers, PDF 137 |
| Mathematics | 120-193 / 90-163 | 195-250 / 165-220 | Appendices, PDF 251 |
| Computing | 53-68 / 24-39 | 70-85 / 41-56 | Glossary, PDF 86 |
| Science | 89-122 / 52-85 | 124-160 / 87-123 | Appendices, PDF 161 |

All page references are one-based PDF indices; footer labels are separately recorded and checked against actual page text. Continuation-only pages are included. The four whole PDFs and these grade sections are present and readable. Their visible editorial and numbering defects are documented below; no missing example or official indicator was invented.

## Artifact use and identity policy

- basic8-curriculum-inventory.json and basic9-curriculum-inventory.json are the complete separate inventories. Their CSV counterparts provide a flat row-per-entry view.
- basic8-filumire-mapping.json and basic9-filumire-mapping.json map every entry to a proposed unique competency, proposed hierarchy nodes, unchanged printed codes, displayed content-standard text, source pages, complete activity/exemplar cell text, source-backed assessment planning classifications and issue links. CSV counterparts make the mapping reviewable in a spreadsheet.
- basic7-9-coverage.json and .csv provide the 12 grade/subject totals, exact mapping counts and distinct printed-code counts.
- basic89-source-issues.json is the machine-readable issue and human-review queue. phase8d-reviewed-corrections.json records four visual statement transcriptions, never publisher code repairs.
- phase8d-reviewed-anchors.json freezes the reviewed 390 leading statements/codes and the four excluded inline references. It is a review input, not an automatically refreshed approval record.
- phase8d-validation.json records the validation results. PHASE8D-FILES.md enumerates every created file. phase8d-output-manifest.json records sizes and SHA-256 hashes; its own self-referential digest is deliberately omitted.

Example proposed identity: competency-gh-english-b8-nacca2020-p074-r01. These identities are subject- and physical-grade-scoped, anchored to the pinned edition's page and row. A changed source revision needs an explicit crosswalk; do not regenerate new identities and silently replace learner history. Proposed context is curriculum-version-gh-nacca-ccp-2020 / phase-gh-jhs-ccp, with separate level-gh-basic-8-ccp and level-gh-basic-9-ccp reservations. These are documentation reservations only.

The original source spelling is retained in source_code_raw / original_printed_code, while official_code / whitespace_collapsed_code removes whitespace only. No official indicator replacement or alias is assigned. B.8.3.2.1, B.9.1.2.1, B.9.3.2.1 and B82.2.1 have explicitly documented internal structural keys; the original printed parent is still recorded.

Repeated standards with changed text require special care. For Science B9.5.2.2 and B9.4.4.2, each row preserves the actual displayed standard fragment and its page; the first encountered title does not overwrite later variants. All standard page fragments remain available.

Missing detailed-table headings are null in the inventory, with preceding context retained separately. Three mapping resolutions cite explicit same-PDF scope titles: English B8 Reading/Summarising and B9 Literature/Narrative, Drama and Poetry from PDF 36; Science B8 sub-strand 6, Soil as a Component of the Environment, from PDF 37. The mapping does not claim those headings were printed in the corresponding detailed tables.

## Activities and assessment requirements

The inventories preserve complete extracted indicator/exemplar cells and adjacent core-competency text, including continuation pages and raw positioned fragments. These are source activities, not newly authored lesson or assessment content. Each mapping classifies explicit source actions using exact excerpts and the page on which each excerpt occurs; suggested evidence modes are planning interpretations rather than official prescribed question formats.

| Subject | Curriculum-supported activity and evidence requirements | Representative source pages |
| --- | --- | --- |
| English Language | Listen/respond to dialogue and audio-visual material; produce speech sounds and debate; read/analyse text; compose/revise paragraphs and formal texts; examine/create literary forms. Oral/aural performance and constructed writing require evidence of the actual performance. | B8 PDF 74-104; B9 PDF 106-136 |
| Mathematics | Calculate and explain; use ratios and graphs; solve inequalities; use ruler/compass construction and loci; reason with vectors, surds and geometry; collect/analyse data and perform probability experiments. Preserve working, mathematical representation, units and construction accuracy. | B8 PDF 120-193; B9 PDF 195-250 |
| Computing | Operate software and produce word-processing, presentation, publishing, spreadsheet and blog artifacts; evaluate online information and workstation issues; construct/trace algorithms; explain or demonstrate robotics and AI concepts. A menu-label response alone cannot substantiate artifact production. | B8 PDF 53-68; B9 PDF 70-85; B9 technology/community project note at PDF 72 |
| Science | Observe/classify materials and cells; perform separations; investigate cycles, crops and animals; construct models/circuits; investigate energy, motion, waste, health, industry and environment. Practical, observational and investigation evidence needs suitable subject review and evaluation. | B8 PDF 89-122; B9 PDF 124-160 |

General assessment guidance is included and referenced per entry: English PDF 18-23 (xvii-xxii), Mathematics PDF 18-21 (xviii-xxi), Computing PDF 17-20 (xvii-xx), Science PDF 20-25 (xx-xxv). These cover assessment for/as/of learning, diagnostic/formative/summative use, timely feedback, reflection, projects/portfolios and cumulative criterion-referenced reporting. Retain guided practice separately from evidence of independent performance.

The source reporting descriptors are Highly Proficient 80%+, Proficient 68-79%, Approaching Proficiency 54-67%, Developing 40-53%, Emerging 39% and below. These are source reporting descriptors, not proposed changes to FILUMIRE mastery thresholds. No scores, prerequisites, difficulty, rubric, retention item, lesson or assessment question was generated.

The four PDFs are English-language official-source references. Later French support requires separate bilingual subject review, preserving English Language performance targets rather than replacing them with French equivalents. No translation or production capability is implied by this mapping.

## Source issues and human decisions

There are 35 Phase 8D issue groups: 27 unresolved, one requiring subject review, three heading resolutions from the same PDF, and four explicitly documented structural-formatting decisions. Twenty-seven new entries have row-specific unresolved issues. Global source-authentication, edition and external-assessment-reference blockers also apply to entries marked mapped. Existing Basic 7 issues are carried forward unchanged in their original Phase 8B issue file, including 11 unresolved groups and 12 row-specific entries.

Priority review before implementation:

1. Authenticate the pinned PDF bytes. The original HTTP retrieval and visible editorial notes mean these copies must not be presented as an authenticated, clean final edition.
2. Obtain NaCCA decisions on EN B8.3.1.5.2, EN B9.5.1.14, Computing B982.1.1.1 / B91.1.1.1 / B91.1.2.1, and B9.2.3.1.7 printed in the Basic 8 section. Keep raw codes and individual identities until resolved.
3. Decide whether the repeated Science crop, Newton-law and health/fungal entries represent intended separate coverage, duplication or misplaced numbering. Do not merge or double-activate competencies automatically.
4. Review Mathematics B9.1.2.3.4 beneath the surds parent, B9.3.2.1.4 beneath the prism standard, and the overview's 17-versus-18 standard discrepancy. Preserve detailed coverage pending clarification.
5. Review scientific accuracy/scope of B8 prokaryotic/eukaryotic wording and magnetic force/Newton's Second Law; inspect mathematical diagrams/formulas and the feasibility of practical/digital evidence before any authoring.
6. Verify the external national assessment references and later delivery/evaluation capabilities. Source mapping completeness is not permission to expose grades, generate content or claim assessment readiness.

Full issue register (page numbers identify the relevant subject PDF):

| Issue | Subject / grades | Status | PDF pages | Evidence and decision |
| --- | --- | --- | --- | --- |
| 8D-SOURCE-AUTHENTICATION | all / 8, 9 | unresolved |  | Existing PDFs were retrieved over unauthenticated official-host HTTP after HTTPS timeouts. Original hashes are unchanged; no new authenticity claim is made. Reconfirm the pinned files over authenticated HTTPS or against authenticated publisher checksums before production acceptance. |
| 8D-ASSESSMENT-REFERENCES | all / 8, 9 | unresolved |  | NPLAF (2020a) and School-Based Assessment Guidelines (2020b) are cited but are not part of the four verified PDFs. Verify those references before claiming complete national assessment/reporting compliance. |
| 8D-EDITION | all / 8, 9 | unresolved |  | Cover, imprint, footer years and three-/four-year programme wording differ, as documented in Phase 8A/8B. Keep original edition evidence; no latest-edition claim or automatic source substitution. |
| 8D-EN8-EDITORIAL | english / 8 | unresolved | 86, 89 | The PDF visibly includes a red missing-example annotation at PDF 86 and a request to check red numbering at PDF 89. These are source editorial annotations, not extraction errors. Printed codes: B8.3.1.1.1; B8.3.1.5.2; B8.3.1.6.1. Obtain an authenticated final/errata version or publisher clarification; do not supply the missing example or repair codes. |
| 8D-EN9-EDITORIAL | english / 9 | unresolved | 127 | The content-standard cell on PDF 127 includes a red request to check an omission. Original wording remains unchanged. Printed codes: B9.4.1.2.1. Publisher clarification before treating the annotated standard as final. |
| 8D-MATH9-SUMMARY | mathematics / 9 | unresolved | 30, 226, 229 | Overview PDF 30 lists 17 Basic 9 standards and one Shapes and Space standard. The detailed section has 18 standards, including B9.3.1.1 and B9.3.1.2. Keep every detailed standard and indicator. Obtain publisher clarification of the overview total. |
| 8D-MATH9-VECTOR-PARENT | mathematics / 9 | unresolved | 235, 237 | The position-vector indicator B9.3.2.1.4 is displayed beneath the prism surface-area standard B.9.3.2.1. Its printed parent and code are preserved. Printed codes: B9.3.2.1.4. Review intended content-standard scope; do not silently reparent the indicator. |
| 8D-SCI8-CELL-SCOPE | science / 8 | unresolved | 93 | B8.1.2.1.2 classifies organisms (plants or animals) as prokaryotic or eukaryotic. The source wording and exemplars require scientific review. Printed codes: B8.1.2.1.2. A qualified Science reviewer should clarify the intended biological scope before any instruction is authored. |
| 8D-SCI8-FORCE | science / 8 | unresolved | 111 | B8.4.4.1.2 links magnetic force and Newton’s Second Law. Preserve both the statement and exemplars pending subject review. Printed codes: B8.4.4.1.2. Review scientific scope and the required evidence before implementation. |
| 8D-SCI-SCOPE-ORDER | science / 8, 9 | unresolved | 36, 106, 109, 110, 111, 113, 144, 146, 147, 148, 150 | The Forces and Energy sub-strand numbering in the general scope (PDF 36) differs from the detailed tables. The detailed tables include Energy and five sub-strands. Use displayed detailed-table parents for this inventory; request publisher clarification before reconciling navigation labels. |
| 8D-SCI9-PARENT-VARIANTS | science / 9 | unresolved | 148, 149, 153, 154 | Printed B9.4.4.2 has changing Newton-law descriptions at PDF 148/149; B9.5.2.2 describes health/disease at PDF 153 and selected fungal diseases at PDF 154. Every displayed parent fragment is retained per entry. Printed codes: B9.4.4.2.1; B9.4.4.1.2; B9.5.2.2.1; B9.5.2.2.2. Review whether these are repeated standards, misplaced statements or numbering errors. No official replacement codes or merged competency scopes. |
| 8D-COMP-SOFTWARE | computing / 8, 9 | unresolved | 54, 59, 63, 76, 85 | The curriculum names version-/service-specific interfaces and products, including Charms, MS-Publisher, Periscope and named AI demonstrations. This phase preserves the published requirements without certifying current availability. Review feasible supported tools and equivalence before instructional implementation; preserve original source requirements. |
| 8D-MATH-NOTATION | mathematics / 8, 9 | requires_subject_review | 173, 179, 200, 247 | PDF text order does not reproduce fractions, roots, column vectors, superscripts or geometric diagrams. Four leading statements have explicit visual transcriptions; the complete original cells and PDFs remain authoritative. Review original mathematical figures and exemplars before authoring. Plain text is not a faithful replacement for formula/diagram layout. |
| 8D-8-english-scope-heading-B8.2.2 | english / 8 | resolved_from_same_PDF | 36, 85 | A detailed-table heading is missing; the original scope and sequence explicitly supplies the corresponding title. Detailed-table null and preceding context remain in the inventory. Use the source-backed scope title only; do not assert it appeared in the detailed table. |
| 8D-8-english-indicator_prefix_differs_from_displayed_parent | english / 8 | unresolved | 89 | indicator_prefix_differs_from_displayed_parent: printed codes and every physical entry are preserved; no publisher replacement code is inferred. Printed codes: B8.3.1.5.2. Human source/subject review before implementation. |
| 8D-8-mathematics-standard-format-B.8.3.2.1 | mathematics / 8 | resolved_structural_formatting | 172, 173, 174, 175, 176, 177, 178 | Printed parent B.8.3.2.1 is retained; internal hierarchy key B8.3.2.1 preserves its source digits with separators. This is a FILUMIRE structural key, not an official corrected code. Retain source spelling and formatting provenance. |
| 8D-8-mathematics-cross_grade_code_in_source_cell | mathematics / 8 | unresolved | 184 | cross_grade_code_in_source_cell: printed codes and every physical entry are preserved; no publisher replacement code is inferred. Printed codes: B8.4.1.1.2. Human source/subject review before implementation. |
| 8D-8-computing-nonstandard_or_cross_grade_printed_code_preserved | computing / 8 | unresolved | 57, 60 | nonstandard_or_cross_grade_printed_code_preserved: printed codes and every physical entry are preserved; no publisher replacement code is inferred. Printed codes: B982.1.1.1; B9.2.3.1.7. Human source/subject review before implementation. |
| 8D-8-computing-indicator_prefix_differs_from_displayed_parent | computing / 8 | unresolved | 57, 60 | indicator_prefix_differs_from_displayed_parent: printed codes and every physical entry are preserved; no publisher replacement code is inferred. Printed codes: B982.1.1.1; B9.2.3.1.7. Human source/subject review before implementation. |
| 8D-8-computing-standard-format-B82.2.1 | computing / 8 | resolved_structural_formatting | 58 | Printed parent B82.2.1 is retained; internal hierarchy key B8.2.2.1 preserves its source digits with separators. This is a FILUMIRE structural key, not an official corrected code. Retain source spelling and formatting provenance. |
| 8D-8-computing-cross_grade_code_in_source_cell | computing / 8 | unresolved | 60 | cross_grade_code_in_source_cell: printed codes and every physical entry are preserved; no publisher replacement code is inferred. Printed codes: B9.2.3.1.7. Human source/subject review before implementation. |
| 8D-8-science-cross_grade_code_in_source_cell | science / 8 | unresolved | 112 | cross_grade_code_in_source_cell: printed codes and every physical entry are preserved; no publisher replacement code is inferred. Printed codes: B8.4.4.2.1. Human source/subject review before implementation. |
| 8D-8-science-scope-heading-B8.5.6 | science / 8 | resolved_from_same_PDF | 37, 122 | A detailed-table heading is missing; the original scope and sequence explicitly supplies the corresponding title. Detailed-table null and preceding context remain in the inventory. Use the source-backed scope title only; do not assert it appeared in the detailed table. |
| 8D-9-english-scope-heading-B9.5.1 | english / 9 | resolved_from_same_PDF | 36, 135 | A detailed-table heading is missing; the original scope and sequence explicitly supplies the corresponding title. Detailed-table null and preceding context remain in the inventory. Use the source-backed scope title only; do not assert it appeared in the detailed table. |
| 8D-9-english-nonstandard_or_cross_grade_printed_code_preserved | english / 9 | unresolved | 136 | nonstandard_or_cross_grade_printed_code_preserved: printed codes and every physical entry are preserved; no publisher replacement code is inferred. Printed codes: B9.5.1.14. Human source/subject review before implementation. |
| 8D-9-english-indicator_prefix_differs_from_displayed_parent | english / 9 | unresolved | 136 | indicator_prefix_differs_from_displayed_parent: printed codes and every physical entry are preserved; no publisher replacement code is inferred. Printed codes: B9.5.1.14. Human source/subject review before implementation. |
| 8D-9-mathematics-standard-format-B.9.1.2.1 | mathematics / 9 | resolved_structural_formatting | 198 | Printed parent B.9.1.2.1 is retained; internal hierarchy key B9.1.2.1 preserves its source digits with separators. This is a FILUMIRE structural key, not an official corrected code. Retain source spelling and formatting provenance. |
| 8D-9-mathematics-nonstandard_or_cross_grade_printed_code_preserved | mathematics / 9 | unresolved | 198 | nonstandard_or_cross_grade_printed_code_preserved: printed codes and every physical entry are preserved; no publisher replacement code is inferred. Printed codes: B.9.1.2.1.2. Human source/subject review before implementation. |
| 8D-9-mathematics-indicator_prefix_differs_from_displayed_parent | mathematics / 9 | unresolved | 201 | indicator_prefix_differs_from_displayed_parent: printed codes and every physical entry are preserved; no publisher replacement code is inferred. Printed codes: B9.1.2.3.4. Human source/subject review before implementation. |
| 8D-9-mathematics-standard-format-B.9.3.2.1 | mathematics / 9 | resolved_structural_formatting | 235, 236, 237 | Printed parent B.9.3.2.1 is retained; internal hierarchy key B9.3.2.1 preserves its source digits with separators. This is a FILUMIRE structural key, not an official corrected code. Retain source spelling and formatting provenance. |
| 8D-9-computing-nonstandard_or_cross_grade_printed_code_preserved | computing / 9 | unresolved | 70, 71 | nonstandard_or_cross_grade_printed_code_preserved: printed codes and every physical entry are preserved; no publisher replacement code is inferred. Printed codes: B91.1.1.1; B91.1.2.1. Human source/subject review before implementation. |
| 8D-9-computing-indicator_prefix_differs_from_displayed_parent | computing / 9 | unresolved | 70, 71 | indicator_prefix_differs_from_displayed_parent: printed codes and every physical entry are preserved; no publisher replacement code is inferred. Printed codes: B91.1.1.1; B91.1.2.1. Human source/subject review before implementation. |
| 8D-9-science-cross_grade_code_in_source_cell | science / 9 | unresolved | 131 | cross_grade_code_in_source_cell: printed codes and every physical entry are preserved; no publisher replacement code is inferred. Printed codes: B9.2.2.1.1. Human source/subject review before implementation. |
| 8D-9-science-duplicate_printed_code_distinct_entries | science / 9 | unresolved | 133, 134, 135, 148, 149, 153, 154 | duplicate_printed_code_distinct_entries: printed codes and every physical entry are preserved; no publisher replacement code is inferred. Printed codes: B9.2.3.2.1; B9.2.3.2.2; B9.4.4.2.1; B9.5.2.2.1. Human source/subject review before implementation. |
| 8D-9-science-indicator_prefix_differs_from_displayed_parent | science / 9 | unresolved | 149 | indicator_prefix_differs_from_displayed_parent: printed codes and every physical entry are preserved; no publisher replacement code is inferred. Printed codes: B9.4.4.1.2. Human source/subject review before implementation. |

Joined words, punctuation, red editorial notes, formula encoding and inconsistent headings are retained rather than rewritten as official text. No complete curriculum section was found absent, but blank/missing exemplars and unresolved source material have not been invented or silently repaired.

## Validation and visual review

Fresh PDF validation passed 20,553 checks plus row-level assertions and all 9 in-memory negative tests. Check categories: preservation 33; uniqueness 2; coverage 1133; source_traceability 10419; hierarchy 3115; mapping 780; csv 5071. Validation covers all 390 new entries, all 625 proposed identities, exact PDF hashes/lengths, actual grade dividers/terminal boundaries, broad independent source-anchor enumeration, reviewed inline-reference exclusions, complete raw cell fragments, every body-page text assignment, actual printed labels, continuation pages, displayed parent variants, hierarchy source/scope evidence, CSV round trips and preserved originals.

All 390 leading indicator statements and codes were visually inspected in 37 rendered contact sheets. Supplemental images retain problem pages and explicit hierarchy scope evidence. Four statement transcriptions restore equation order or distinguish indicator wording from following exemplars; original text remains alongside them. This is not an independent pedagogical review of every exemplar, figure or scientific claim. PDF.js emitted font warnings; the inspected leading text rendered legibly.

The unchanged Basic 7 validators were also run read-only: 2,397 saved-extraction checks (682 recorded source-extraction checks) and 5,069 saved-mapping checks (2,132 recorded source checks), all passed. Application/browser/database tests were not run: production code and registrations were outside this phase.

## Reproduction

Node.js and existing external PDF.js tooling were used; repository dependencies were not installed or changed. The original external tools were PDF.js 6.4.299 and @napi-rs/canvas, available under C:/Users/tabi/AppData/Local/Temp/filumire-b7-pdf-tools/node_modules. Override tool locations with FILUMIRE_PDFJS_MODULE and FILUMIRE_CANVAS_MODULE (file URLs) and input location with FILUMIRE_SOURCE_ROOT (the FILUMIRE_CLAUDE directory).

From this output folder:

~~~powershell
$env:FILUMIRE_SOURCE_ROOT='C:\FILUMIRE\filumire-batch1\FILUMIRE_CLAUDE'
node validate-basic89.mjs --fresh --self-test
~~~

The command is read-only. Add --record only to update this bundle's phase8d-validation.json. Without --fresh, validation checks the pinned original PDF hashes and saved positioned-text data; --fresh re-extracts all four PDFs and requires exact equality with that cached data.

To regenerate derived documentation from the same frozen reviewed input, run node extract-basic89.mjs, then node build-basic89-mapping.mjs, then the validator. Do not regenerate the review lock to force a changed source to pass. Render inspection images with node render-basic89-review.mjs. Initial positioned-text acquisition is implemented in phase8d-source.mjs --extract-text; it writes only into this output folder, but should not be rerun to replace the reviewed input lock for a changed source. A source revision requires a new review and explicit crosswalk.

The original Phase 8A/8B scripts need not be rerun or modified. Nothing in this bundle imports or updates the production application.
