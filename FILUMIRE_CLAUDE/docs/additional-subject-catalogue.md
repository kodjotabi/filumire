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

Follow-up verification on 1 November 2026 completed against the exact PR source at commit 98d4e2ab, using a temporary Vercel Sandbox with no exposed ports, memory persistence and an unreachable database URL. This was a test machine, not a deployment. Node was v24.22.1. The standard npm ci and npm run build:learner commands finished with exit code 0; compilation, type checking, all 36 static pages, optimization and build traces completed. No application or Next.js configuration changes were needed.

The local PowerShell host still rejects even a child Node process with spawn EPERM. A Windows-only thread experiment got past compilation and type checking but exposed a Next.js configuration DataCloneError during prerendering. That experiment was reverted. The environment restriction was avoided for verification by using the isolated runner; it has not been removed from the Windows host. Changing Windows security/process policy is outside this repository change.

The standard npm run test:subject-catalogue command now passes both suites in the isolated runner. It found a test-only omission masked by the earlier in-process loader: the classic JSX transform needs React on the test global, just as the existing catalogue test does. The new test now supplies that setup. Application rendering was already handled by Next.js and is unchanged.

A new npm run test:subject-catalogue:browser command checks the real optimized learner dashboard in headless Chromium 156.0.8078.4 (Playwright 1.64.1). All 36 cases passed: Basic 4, 5, 6, 7, 8 and 9, English and French, at 320px, 390px and 1440px. Every case signs in a temporary learner whose placement comes from the real API. It confirms the exact six primary or eight junior-high outline cards, all four established subject links, grade labels, keyboard opening/closing, document links, fitting text and controls, touch targets and unchanged learning overview after opening every outline. There were no page errors or failed application responses. Seventy-two open/closed screenshots were captured; representative phone and desktop screenshots in both languages were inspected.

The cards fit at every tested width, and opening them introduces no page overflow. At 320px in French, the existing Ask FILU tile elsewhere on the dashboard extends 3px beyond the primary viewport and 5px beyond the junior-high viewport. This is present with the catalogue collapsed as well as expanded; it is recorded separately by the browser test and was left unchanged to avoid unrelated work. At 390px and 1440px there was no page overflow.

The [full build output](audits/additional-subject-catalogue/build.log), [focused test output](audits/additional-subject-catalogue/focused.log) and [36 browser results](audits/additional-subject-catalogue/browser.log) are retained with this report. These results came from a temporary headless browser, not a connected interactive browser. Interactive review on a physical phone remains optional follow-up.

To repeat the browser checks, start the optimized learner locally with memory persistence, test-only authentication settings, open test registration and private junior-high mode. Point FILUMIRE_TEST_URL at its plain 127.0.0.1 origin, set FILUMIRE_PLAYWRIGHT_MODULE to an installed Playwright module, and set FILUMIRE_NAVIGATION_ARTIFACTS to a new directory. Run npm run test:subject-catalogue:browser with FILUMIRE_PERSISTENCE=memory. The test creates fictional accounts only; use an isolated instance. No connected interactive browser is required. The sandbox and its temporary accounts are removed after verification.

Lessons and learning activities for these additional subjects remain unauthored and unavailable. No curriculum statements or lessons have been invented or registered. Nothing has been deployed or merged.
