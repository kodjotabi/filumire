# Basic 7 NaCCA source foundation

Prepared 21 October 2026. This is a source inventory and extraction, with no runtime registrations, authored lessons, new assessments or learner-facing changes.

The four PDFs are the files linked by NaCCA's [official CCP index](https://nacca.gov.gh/common-core-programme-ccp/). No earlier local copies were found in the Ghana curriculum-sources tree. Each PDF was saved once, without changing its bytes. The September 2020 cover dates, publisher, grade scope, source/retrieval URLs, PDF metadata, sizes, retrieval times and SHA-256 hashes are recorded in [the source manifest](basic7-source-manifest.json).

**Transport limitation:** NaCCA HTTPS connections timed out, including a retry outside the sandbox. The public official-host HTTP endpoint returned the index and PDFs when sent `X-Forwarded-Proto: https`, avoiding its HTTPS redirect. No mirror was used. HTTP is unauthenticated: the checksums pin these downloaded bytes but do not independently authenticate the publisher. Reconfirm these hashes over working HTTPS or against publisher-provided checksums before production acceptance. No numbered edition or claim that this is the latest revision is inferred from the 2023 upload path.

| Document | Cover / publisher | Scope | Basic 7 PDF pages | Printed pages | Indicator entries | Distinct printed codes |
| --- | --- | --- | --- | --- | ---: | ---: |
| [English Language CCP](ENGLISH-LANGUAGE.pdf) | September 2020 / NaCCA, Ministry of Education | B7–B9, confirmed on imprint | 38–72 | 2–36 | 53 | 53 |
| [Mathematics CCP](MATHEMATICS.pdf) | September 2020 / NaCCA, Ministry of Education | JHS 1 (B7)–JHS 3 (B9) | 32–118 | 2–88 | 74 | 74 |
| [Computing CCP](COMPUTING.pdf) | September 2020 / NaCCA, Ministry of Education | JHS 1 (B7)–JHS 3 (B9) | 31–51 | 2–22 | 55 | 52 |
| [Science CCP](SCIENCE.pdf) | September 2020 / NaCCA, Ministry of Education | JHS 1 (B7)–JHS 3 (B9) | 39–87 | 2–50 | 53 | 53 |
| **Total** | | | | | **235** | **232 subject-scoped codes** |

All four imprints show ©2020; Mathematics' imprint copyright is visible in the rendered page but absent from extracted PDF text. English, Computing and Science body footers show ©2021. These dates are retained separately rather than reconciled into an invented edition. The English cover repeats “COMMON CORE PROGRAMME” where the other covers state the grade range.

## Reading the artifacts

- [Coverage matrix](basic7-coverage-matrix.csv): one row per printed indicator entry, including conflicting/malformed codes; subject, strand/sub-strand context, displayed content standard, indicator statement, exact source PDF, URL, hash, one-based PDF page, printed page and continuation pages. `entry_id` is a documentation locator, never an official curriculum code or production competency ID.
- [Curriculum structure](basic7-curriculum-structure.json): all printed Basic 7 hierarchy headings, 23 English / 20 Mathematics / 18 Computing / 27 Science distinct printed standard codes, indicator statements, original cell text including exemplars, adjacent core competency text, assessment guidance pages and entry-specific flags.
- [Extraction validation](basic7-validation.json): source hashes, actual Basic 7/8 section boundaries, actual printed page labels, code presence, nonempty text, row enumeration and grade-boundary checks.
- [Extractor](extract-basic7.mjs) and [saved-artifact validator](validate-basic7.mjs): documentation-only tools. They do not import or change application code. The extractor reads PDFs and writes only the manifest, structure, CSV and extraction-validation JSON. The validator is read-only.

Codes retain their source spelling; only whitespace is collapsed in `official_code`. `source_code_raw` preserves original spacing, including malformed codes. No corrected replacement code is assigned. A repeated printed code is not a single objective: each row remains separately traceable. Official strand/sub-strand headings are preserved as printed; no fabricated hierarchy codes are assigned.

The statement field separates the leading indicator from its exemplars. Nine Mathematics statements were transcribed from rendered pages because fractions, superscripts or exemplar layout confused plain-text ordering. These rows are marked; `(x; y)` denotes a column vector with x above y, and fractions are linearised with `/`. Full extracted cell text remains alongside them. Extracted text is not a substitute for source diagrams, equations or task layouts. PDF.js emitted font warnings (`TT: undefined function: 32`); text extraction and the inspected rendered pages remained readable. Covers, imprints and identified anomaly/formula pages were visually inspected; this is not a claim that every page received an independent editorial review.

## Source issues requiring decisions

| Subject | Source issue | PDF page(s) / printed page(s) | Handling |
| --- | --- | --- | --- |
| English | `B7.3.4.1` / `B7.3.4.1.1` appears without a separate sub-strand 4 heading in its Basic 7 table | 59 / 23 | Missing heading is null, preceding vocabulary heading retained separately; no invented title |
| English | Writing sub-strand heading ends at “PRODUCTION AND” | 60–61 / 24–25 | Incomplete heading retained and flagged |
| Mathematics | Comparison indicator printed `B7.1.1.2`, rather than a five-part indicator code | 33 / 3 | Truncated code retained, no inferred extra segment |
| Mathematics | Multiplication/division indicator printed `B71.2.2.2` | 40 / 10 | Missing separator retained |
| Mathematics | Construction indicators printed `7.3.1.2.4`, `7.3.1.2.5`, `7.3.1.2.6` | 85–87 / 55–57 | Missing B prefixes retained; these are included in the 74 entries |
| Mathematics | Standard codes `B.7.1.2.2`, `B.7.3.2.1`, `B.7.3.2.2`; indicator `B.7.3.2.1.1` | 39–42, 89–96 / 9–12, 59–66 | Extra punctuation retained; standard-level and indicator-level flags |
| Computing | `B7.2.1.1.3` means both find/replace/undo and tabs/formatting | 37, 39 / 8, 10 | Both rows retained; duplicate printed code flagged |
| Computing | `B7.2.1.1.4.5` and `B7.2.1.1.4.6` contain six numeric segments | 38 / 9 | Nonstandard codes retained |
| Computing | `B7.2.2.1.2` and `B7.2.2.1.3` repeat for different presentation skills, under standard `B7.2.2.2` on the later page | 40–41 / 11–12 | Duplicate and displayed-parent mismatch flags; no silent merge |
| Computing | Spreadsheet formula standard printed `B7 2.3.3` | 44 / 15 | Raw spacing retained; whitespace-collapsed key `B72.3.3` explicitly flagged; indicator remains `B7.2.3.3.1` |
| Science | Careers indicator printed `B.7. 5.3.1.1` | 84 / 47 | Extra punctuation/spacing retained |
| All | Joined words, inconsistent punctuation and mathematical text encoding occur in cells | See individual source pages | Raw text retained; no editorial corrections disguised as official text |

No whole subject PDF or Basic 7 section is missing or wholly unreadable. Coding conflicts above remain unresolved official-source ambiguities. The missing English heading cannot be reconstructed as an official Basic 7 table heading from this table alone. The Science content should later receive subject review, including animal/plant-cell wording; this foundation preserves its source wording rather than rewriting it.

## Assessment expectations

The structure includes the full extracted assessment guidance at English PDF 18–23 (xvii–xxii), Mathematics 18–21 (xviii–xxi), Computing 17–20 (xvii–xx) and Science 20–25 (xx–xxv). Each indicator's original cell/exemplars records the subject-specific performance expectations on its cited pages. No platform question, rubric, lesson, retention item or transfer item has been generated.

The documents call for assessment for/as/of learning, timely feedback, learner reflection, cumulative records and criterion-referenced reporting. Modes include written, oral, aural and practical class tasks, portfolios, journals and projects. English explicitly includes oral presentation, role play and conferencing (PDF 21); Computing requires demonstrations and artifacts such as documents/spreadsheets (e.g. PDF 37–44); Mathematics requires constructions, graphs and explanations (e.g. PDF 81–106); Science requires observation, investigation, models and practical work (e.g. PDF 42–43, 68–69, 78–80).

The source proficiency tables distinguish independent/authentic transfer from performance with guidance: Highly Proficient 80%+, Proficient 68–79%, Approaching Proficiency 54–67%, Developing 40–53%, Emerging 39% and below. References: English PDF 22–23; Mathematics 21; Computing 20; Science 25. These are source reporting descriptors, not changes to FILUMIRE mastery thresholds. Some preambles mention a four-year CCP despite the covers/imprints specifying B7–B9; Computing describes three years. Grade scope follows the explicit covers/imprints and section dividers; this discrepancy is not silently corrected.

The referenced Ministry of Education (2020a) National Pre-tertiary Learning Assessment Framework and (2020b) School-Based Assessment Guidelines are not among these four PDFs and were not separately retrieved/verified here. Detailed national reporting requirements remain dependent on those references. No official French versions or approved French translations were located in the four-document source set; future French instructional content must be explicitly distinguished from the English official curriculum.

## FILUMIRE compatibility and readiness

Read-only inspection of `packages/curriculum-framework/index.ts` confirms existing `strand`, `sub_strand`, `content_standard` and `learning_indicator` node types, parent relationships and `sourceReference`, plus string identifiers and subject-specific mappings. These can represent the extracted hierarchy without changing the base node model. The curriculum and runtime registries currently register Basic 4–6; `apps/learner/components/filumire/grades.ts` lists only those grades. This source package is not imported into either registry and does not expose Basic 7 to learners.

Future implementation must add a CCP version/phase decision, Basic 7 grade and four subject registrations with stable subject-scoped internal IDs. Printed codes recur across subjects and conflict within Computing: use independent internal identities and a reviewed source-code/alias policy, never global code-only IDs or automatic renumbering. `sourceReference` can point to the manifest document and page; richer checksum provenance can remain in the manifest. Keep all existing Basic 4–6 IDs and data unchanged, and explicitly review B6→B7 prerequisites rather than auto-promoting learners.

Existing adaptive evidence roles include retention and transfer (`packages/domain/index.ts`), and the framework already warns that oral, observed-performance and constructed-response evaluation is incomplete for English. Reuse the existing separation of guided and independent evidence; do not treat a multiple-choice proxy as proof of practical/oral mastery. Bilingual authoring/review, suitable practical/constructed-response evaluation, retention/transfer evidence and browser/database tests remain future implementation work.

**Readiness:** suitable as a traceable, validated source-review foundation; not yet approved for automatic production registration or full-capability claims. First resolve the documented source-code/hierarchy ambiguities and authenticate/reconfirm the downloaded hashes. Then prepare a reviewed Basic 7 mapping plan with stable internal IDs, beginning with a bounded first subject/strand. Implementation and content generation remain stopped pending approval.

## Reproducing validation

Final validation passed: 682 source-extraction assertions and 2,397 saved-artifact assertions, covering all 235 entries. Checks include PDF hashes, grade boundaries, printed page labels, CSV round-tripping, complete entry linkage and explicit malformed-code flags. Application/browser/database suites were not run because this change is a documentation/source package with no production imports or test modifications. Validation does not resolve publisher ambiguities or authenticate HTTP transport.

From repository root, `node docs/curriculum-sources/ghana/ccp-b7-b9/validate-basic7.mjs` validates saved files without writing anything or requiring PDF tools.

To regenerate only the four derived JSON/CSV artifacts, set `FILUMIRE_PDFJS_MODULE` to the file URL of an installed `pdfjs-dist/legacy/build/pdf.mjs`, then run `node docs/curriculum-sources/ghana/ccp-b7-b9/extract-basic7.mjs`. The preparation used external temporary tooling, PDF.js 6.4.299 and `@napi-rs/canvas`, without changing repository dependencies. Rendered inspection images are temporary tool outputs, not duplicate curriculum PDFs. Existing PDFs are read-only inputs. Regeneration is not required to use the manifest/matrix.
