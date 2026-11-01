The subject catalogue now offers curriculum reference access for six additional subjects in each of Basic 4–6 and eight in each of Basic 7–9. The subject lists and bilingual names already existed as inactive cards on the integration branch; this change makes them expandable and connects them to official NaCCA documents.

Each card shows the learner's registered Basic level, an “Outline only” label, a notice that lessons and learning activities are unavailable, and links to the official curriculum PDF and NaCCA's curriculum library. The documents cover several classes; the card explains how to locate the learner's class in the contents. They are external reference documents, not locally authored lessons. French labels do not imply that the source PDFs have been translated.

The registered grade selects the catalogue independently of the optional junior-high visual theme. Unsupported and missing grades show no outline cards. Subjects already supplied by the lesson service are excluded from the outline list to prevent duplicates. English, Mathematics, Science and Computing keep their existing navigation and lesson availability rules.

Outline cards never become runtime subjects or competencies. Opening a card or a document sends no assessment evidence and does not change mastery, completion or adaptive progression. No database schema, account data, educational records, lesson content, deployment configuration or Production settings are changed.

Sources checked on 1 November 2026:

- [NaCCA Standards-Based Curriculum (2019), primary subject documents](https://nacca.gov.gh/learning-areas-subjects/new-standards-based-curriculum-2019/).
- [NaCCA Common Core Programme, Basic 7–9 subject documents](https://nacca.gov.gh/common-core-programme-ccp/).

All 14 subject/document combinations are listed by these official indexes. Twelve PDF documents were successfully retrieved during verification. The junior-high Creative Arts and Design and Career Technology PDFs timed out on two attempts; their published links are retained, with the official library as an alternative entry point. External document availability remains dependent on NaCCA.

Validation completed:

- `additional-subject-catalogue`: all six grades, both languages, exact subject lists, unsupported/missing grades, duplicate suppression, distinct primary/JHS documents, semantic disclosure markup and isolation from adaptive subjects.
- `jhs-review-subjects`: 52 existing catalogue/icon/navigation checks, updated for expandable outline cards.
- Existing `curriculum-framework`, `curriculum-navigation`, `grade-aware-subject-selection` and `production-curriculum-gates` suites passed. The last suite verifies the pinned learning content, exclusion of unavailable topics and preservation of saved learner progress.
- Learner TypeScript check passed. `git diff --check` passed.

The normal `tsx` test runner could not launch its transformer because this Windows environment rejects child processes with `spawn EPERM`. The suites above passed using a local in-process TypeScript loader with the in-memory store and an unreachable database URL. The loader is evidence tooling outside the repository. On an unrestricted machine, run `npm run test:subject-catalogue` for the focused tests.

The standard `npm run build:learner` command passed the local deployment guard but stopped during the optimized build with `spawn EPERM`. A complete optimized build still needs to run in an unrestricted environment. No browser was connected, so desktop and phone visual checks remain outstanding. The existing responsive grid and muted card palette are reused; disclosure controls and document links support keyboard access, visible focus and 44px minimum touch targets.

Lessons and learning activities for these additional subjects remain unauthored and unavailable. No curriculum statements or lessons have been invented or registered. Nothing has been deployed or merged.
