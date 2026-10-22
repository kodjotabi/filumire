# Basic 4–6 source reconciliation and controlled-pilot readiness

22 October 2026 — `feat/basic4-6-completion`

**All 862 existing competencies now have a page-traceable source association. This does not establish educational completeness or pilot readiness.** The reconciled inventory contains 871 distinct source objectives/activities, of which 867 have existing competency associations and four do not. All 40 selected test suites and 28 browser cases pass, as do TypeScript and the production build. One narrowly scoped bilingual Science correction was implemented. No new curriculum competencies, learner evidence or teacher approvals were generated.

## Sources and method

Used the four existing PDFs in `C:/FILUMIRE/filumire-batch1/FILUMIRE_WEBSITE/public/curriculum-sources/` read-only. No PDFs were downloaded, copied, replaced or edited. Covers identify the curricula as Primary Basic 4–6, September 2019; publication pages identify NaCCA/Ministry of Education, with Ghana Education Service also on the English cover. The original repository manifest checksums match all four files:

| Subject | File | Physical PDF pages | SHA-256 |
|---|---|---:|---|
| English Language | `ENGLISH-B4-B6.pdf` | 246 | `31727bc67e6beba32a5687fa6cffca9b41a4d13c5220e236534f1566fc0d8bdd` |
| Mathematics | `NaCCA-Mathematics-B4-B6-2019.pdf` | 183 | `4b4439306ad2fafc07f92ca6061dcbfbde63975549177fde3c69393faf4a427c` |
| Science | `NaCCA-Science-B4-B6-2019.pdf` | 69 | `9fd09042246256c1248d6976c4ee82b8b02c910fec771bc797ec2b05320e3c7b` |
| Computing | `NaCCA-Computing-B4-B6-2019.pdf` | 76 | `d622739de46fdc138508aa82b56a196453581677cd653bcab5f4b3723eb1ecca` |

`source-manifest.json` records source paths, known official URLs, cover/publication text, PDF metadata and hashes. This run verifies the existing local source bytes and publication content; it does not claim a new byte-for-byte comparison with a download from NaCCA. PDF metadata creation dates precede the printed September edition; the cover edition was retained rather than inferred from file timestamps.

All 574 PDF pages were extracted with positioned text. The table-column inventory contains **876 indicator/activity occurrences**, including malformed codes and one uncoded reflective-writing activity. Five documented repeated objectives are linked, retaining every original occurrence, giving **870 coded objective records plus one uncoded activity**. A separate whole-line scan finds 879 five-or-more-part code occurrences. All are accounted for: indicator codes, the unusually long Computing content-standard code `B5.6.4.9.1`, and the unresolved inline Mathematics cross-reference `P6.5.2.2.3` on PDF178. The latter is not invented as an extra indicator.

Thirty-nine selected source pages were rendered; covers and 21 additional pages were visually inspected for the principal discrepancies and gaps. Ordinary associations were checked computationally against their exact source positions, not manually certified by an educator. Physical PDF page numbers are primary; printed footer labels are recorded separately. Review flags, raw strings, source headings and table-standard relationships remain in the matrices. This is a traceable reconciliation of the 2019 documents, not NaCCA endorsement or a fully adjudicated transcription of every printing inconsistency.

## Coverage across the 12 grade/subject combinations

“Associated” means a current competency has an evidenced source association, including documented printed-code discrepancies. It does not mean its teaching, assessment, translation or independent performance has educator approval. The counts are source objectives, not runtime competency counts.

| Grade | Subject | Runtime competencies | Source objectives/activities | Associated | Unmapped |
|---|---|---:|---:|---:|---:|
| 4 | English Language | 131 | 131 | 131 | 0 |
| 4 | Mathematics | 67 | 71 | 71 | 0 |
| 4 | Science | 24 | 24 | 24 | 0 |
| 4 | Computing | 27 | 27 | 27 | 0 |
| 5 | English Language | 134 | 134 | 134 | 0 |
| 5 | Mathematics | 67 | 67 | 67 | 0 |
| 5 | Science | 28 | 29 | 28 | 1 |
| 5 | Computing | 79 | 82 | 79 | 3 |
| 6 | English Language | 134 | 134 | 134 | 0 |
| 6 | Mathematics | 45 | 45 | 45 | 0 |
| 6 | Science | 28 | 28 | 28 | 0 |
| 6 | Computing | 98 | 99 | 99 | 0 |
| Total | | 862 | 871 | 867 | 4 |

Basic 4 Mathematics includes the three stable legacy pattern competency IDs and many-to-one indicator mappings. Basic 6 Computing combines two differently situated mouse/delete source objectives in one existing competency; that accounts for 99 source objectives associated with 98 competencies. These counts must not be compared one-to-one or presented as a percentage of independently demonstrated mastery.

The four explicit registration gaps are:

| Subject/grade | Code exactly represented in the source | Source task | Physical / printed page |
|---|---|---|---|
| Science B5 | `B5.2.2.1.2` | Compare germination of bean and maize seeds | 44 / 22 |
| Computing B5 | `B5.1.3.1.9` | Make tables and diagrams from collected data | 36 / 15 |
| Computing B5 | `B5.1.3.1.10` | Analyse data displays, generalise results and make suggestions | 36 / 15 |
| Computing B5 | `B5.6.4.9.1.2` | Discuss protection from online identity theft | 48 / 27 |

These are unmapped source objectives, not proof that no related content exists anywhere. Existing privacy lessons, data collection, word processing and Mathematics may be reusable. For example, B5 Computing `competency-gh-computing-b5-6-10-1-2` teaches privacy settings and considering information before posting, but is not a direct registration of the source's identity-theft protection objective. Related material was not silently relabelled as complete coverage.

## Incorrect/ambiguous source-code mappings and duplicates

Seventeen competency records require explicit printed-code qualification: 16 different/ambiguous code associations and one activity whose local indicator code is not printed. `review-decisions.json` and the competency matrix identify every ID and page. Runtime codes and IDs were preserved; these source-association records do not silently rewrite prerequisite keys or historical assessment metadata.

Examples:

- B4 English stress/rhythm meaning is printed as four-part `B4.1.7.1` (PDF33); the app uses `B4.1.7.1.1`.
- B4 English comparison contains the adjacent printed sequence `B4.3.4.1.1. 1.` (PDF63). Whether the final number is enumeration remains flagged; no replacement is asserted.
- B5 English editing is printed with B4 prefix `B4.4.9.3.2` inside the B5 section (PDF151).
- B6 English minimal pairs and centering diphthongs share printed `B6.2.3.1.1` on PDF193/194, while separate internal IDs distinguish the outcomes. Reflective Writing has no printed indicator code on PDF227. Superlatives use a four-part code on PDF239.
- B5 Mathematics volume/capacity indicators have `B5.3.3.2.*` prefixes under standard `B5.3.2.2` (PDF122/123).
- B6 Mathematics integer, transformation, questionnaire and probability codes contain table-prefix conflicts, duplicate codes, a four-part code or a `P6` prefix. These are preserved with the source page and intended existing competency.
- B6 Science carbon/industry indicators are printed as `2.1.3.1` and `5.3.1.1` without grade prefixes (PDF58/67).
- B5 Computing Digital Literacy uses six-part indicator codes (PDF48), not the normalised five-part form in the app.

Repeated statements under inconsistent codes in B4/B5 Mathematics, repeated B6 English writing statements, and distinct B6 Computing mouse/delete statements are preserved separately from accidental internal-ID duplication. There are no duplicated current internal competency IDs. Four shared B4 Mathematics pattern-code relationships from the earlier audit remain intact.

`source-anomalies.json` records 53 flagged indicator/activity occurrences, and `mapping-review-queue.json` contains 68 competency records requiring code, hierarchy or low-text-overlap review. These are review candidates, not 68 proven content errors. The B4 Computing source itself heads introductory material “WORD PROCESSING.” No sub-strand heading was extracted at the B6 prism tables (PDF165/166); two rows explicitly retain a null source label. `source-review-notes.json` records these limitations without inventing headings.

## Educational quality and bilingual evidence

All 862 current topics have separate authored EN/FR teaching records. The full 22,432-record inventory contains 15,533 questions: **15,532 multiple-choice and one application item**. No seeded question connects `trusted_rubric_evaluation`, despite an existing teacher-review infrastructure. All question representation metadata is absent. There are 34 competencies with at least one untagged declared subskill, and one declared misconception tag is unreferenced by question diagnostics (`changes_digits_left_of_rounding_place` in B4 rounding).

Source actions and explicit local response modes flag **286 competencies** for oral, written or practical evidence review. This heuristic is a prioritisation aid, not a verified count of mandatory NaCCA rubrics. Recognising an answer about a poem is not the same evidence as composing one; identifying a menu command does not demonstrate using it. Classroom observations, investigation records and independently created work require a reviewed evidence design. No new rubric scores, learner performances or teacher approvals were manufactured.

The source assessment introductions distinguish formative and summative assessment, learner reflection and teacher use of evidence (English PDF13, Mathematics PDF14, Science PDF14, Computing PDF13). Particular exemplars support activity design; they were not automatically converted into new mandatory assessment rules.

Automated checks found no malformed multiple-choice options, missing keyed option, EN/FR option-count or answer-index mismatch, or identical complete EN/FR lesson bodies. Those checks do not establish native French quality or semantic equivalence of every distractor. English target-language poems and passages inside French English lessons are not automatically fallbacks. All 862 topics still require qualified educational/language approval; the matrix records approval as pending, not approved. Retaining a question's original language during a guided retry remains distinct from a missing translation.

Desk-reviewed examples use Ghanaian names, cedis, local food, markets, plants and Akosombo. Existing samples show a coherent song-message progression across grades, but do not certify all age progression, terminology, reading load, mathematical depth, practical safety or accessibility. B6 brief Mathematics explanations and B4 animal classification generalisations remain educator-review items. The existing within-grade prerequisite graph does not substitute for a specialist vertical B4→B5→B6 review. Guardian placement and learning rules were unchanged.

## Independently verifiable corrections completed

1. **Science accuracy, B5.1.1.1.1:** removed the general assertion that releasing energy from food always requires oxygen, in EN/FR explanation and scaffold. The official scope remains life processes (Science PDF39, printed17). The scientific correction is supported by [OpenStax Biology 2e, Metabolism without Oxygen](https://openstax.org/books/biology-2e/pages/7-5-metabolism-without-oxygen); no anaerobic-respiration curriculum unit was added. Four teaching records now use version `authored-life-processes-1.1`. All 26 content IDs, question IDs, options, keys, diagnosis, evidence tags and the other 22 records remain unchanged apart from regenerated timestamps. Existing mastery, retention and transfer requirements are identical.
2. **Accurate test claims:** B5 Science/Computing test messages now describe their 28/79 existing local specifications rather than imply that those counts prove official completeness. Numeric assertions and all content checks are preserved. The new source test additionally checks the actual 29/82 source inventories and explicit gaps.
3. **Source evidence:** corrected the reconciliation's associations for malformed/normalised codes, gave all 862 competencies physical page references and original source strings, and retained unresolved flags. This is a documentation/data correction; production framework mappings were not re-keyed or expanded.

## Validation and safeguards

- **40/40 selected suites passed on final execution**, including both new source/integrity suites and all 38 learning regression suites from the technical repair. `validation.json` lists every suite.
- **TypeScript passed, zero errors.** Production learner build passed, with only the inherited workspace-root/multiple-lockfile warning.
- **24/24 existing interface browser cases passed:** all four subjects, B4–6, mobile English/desktop French, wrong-answer correction, guided retry, language switch identity/evidence, summary and continuation.
- **4/4 real-service-worker offline browser cases passed:** EN/FR at 390px/1280px, pending submission preserved through language changes, original question synchronised once, duplicate online events harmless, visible fallback and no cached personal HTML/API responses.
- Source validation verifies all four PDF hashes, every recorded source code at its exact extracted position, 876 occurrences, 871 linked objectives, all 862 live runtime IDs, original duplicate/malformed codes and four explicit gaps. The initial test's broad coordinate tolerance selected a neighbouring line; an exact-coordinate lookup fixed that test error. Sandbox-blocked subprocess attempts were rerun successfully outside the sandbox. No test was skipped or weakened.
- The 1,113-file production baseline confirms **one changed production file only**, the B5 Science authored content file. Source PDFs and all other recorded production files are unchanged. Previous uncommitted work and technical fixes remain intact. No payments, Basic 7–9, other worktree files, commits, merges, pushes or deployments were changed.

Tests used fictional accounts and memory persistence, not a live database. Browser evidence is under `browser/`; earlier audit/repair evidence was not overwritten. These are selected suites, not payment-inclusive repository-wide certification. Full offline curriculum/adaptive progression, real-device storage recovery, durable database restart/resume, classroom use and comprehensive accessibility remain unverified.

## Deliverables, remaining gate and next approval

Files authored/changed in this tranche:

- Modified production: `services/content-store/ghana-b5-science-authored-life-processes.ts` only.
- Modified assertion descriptions, preserving checks: `tests/b5-science-v1.test.ts`, `tests/b5-computing-v1.test.ts`.
- New regression tests: `tests/b4-6-source-reconciliation.test.ts`, `tests/b5-science-life-processes-integrity.test.ts`.
- New evidence tooling: `scripts/reconcile-basic4-6-sources.mjs`, `scripts/reconcile-basic4-6-indicators.mjs`, `scripts/render-basic4-6-source-review.mjs`, `scripts/build-basic4-6-reconciliation.mjs`.
- New documentation/data/browser evidence under this `reconciliation/` directory; no previous audit or technical-repair evidence was overwritten.

- `competency-matrix.json` / `.csv`: all 862 current competencies, original mappings, source references, flags and educational status.
- `source-objective-matrix.json` / `.csv`: 871 source objective/activity records, retaining every occurrence and mapped ID.
- `source-manifest.json`, positioned text/page extracts, independent code index and page-review renders: reproducible source evidence.
- `unmapped-source-objectives.json`, `mapping-review-queue.json`, `review-decisions.json`, `source-anomalies.json`, `source-review-notes.json`: exact unresolved work.
- `educational-review.json`: all-inventory checks, 286 evidence-mode candidates, tag gaps and approval status.
- `validation.json`, `typescript.log`, browser results: technical verification.
- `NEXT-TRANCHE.md`: bounded work, explicit acceptance criteria and approval boundary.

**Basic 4–6 is not yet verified pilot-ready.** Remaining gates are the four registration gaps, adjudication of the source/mapping review queue, adequate independent evidence for productive skills, educational/French approval, vertical progression and controlled database/device/classroom verification. Per the Phase 3 safeguard, substantial curriculum expansion and any change to mastery or assessment rules stop here for approval. No additional learning journey was generated.
