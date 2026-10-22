# Basic 4–6 technical repair validation — 22 October 2026

The confirmed French offline blank page and all three inherited root TypeScript errors are repaired in the isolated `feat/basic4-6-completion` worktree. **All validation performed for this repair passed.** The earlier audit and its failing screenshots/results remain intact; this directory records the follow-up results.

## Files changed

| File | Targeted change |
|---|---|
| `apps/learner/public/offline.html` | Scoped the three language visibility rules to the translated content containers. `<html lang="fr">` remains visible. |
| `apps/learner/public/sw.js` | Advanced the learner shell cache version from v1 to v2 so an updating installation precaches the corrected offline HTML and removes its old shell caches. No evidence/API caching was introduced. |
| `tests/b4-framework-registration.test.ts` | Asserted each overview area's valid status before assigning the accurately narrowed data to `LearningOverview`. No unchecked cast or production type change. |
| `tests/immediate-correction.test.ts` | Added an explicit existence assertion for each corrective passage before checking its substantive content and exact authored title/body. Existing assertions remain. |
| `tests/offline-shell-v1.test.ts` | Added an installed-v1 cache fixture and assertions that activation removes its stale offline page while preserving unrelated caches. |
| `scripts/audit-basic4-6-offline.browser.mjs` | Extended the existing real-browser harness to all four language/width combinations; added offline language switching, immutable queued identity, server-state preservation and exact synchronised-request assertions; made evidence output configurable. |
| `tests/learner-offline-repairs.browser.mjs` (new) | Reusable browser regression entry point using that harness and a separate evidence directory. |

This report, `validation.json`, `typescript.log`, and browser JSON/screenshots were also created under `docs/audits/basic4-6-completion/technical-repairs/`.

## Root causes and safety

The previous `[lang="fr"] { display: none; }` selector matched the root document after the offline script set its language to French. Restricting the selector to `main > div[lang="fr"]` hides only the English/French content block intended by the existing design. The associated service-worker version change is necessary for already installed shells to refresh that cached HTML after an online update.

The test overview producer inferred area status as a general string. The framework test now verifies the three supported values at runtime and passes the resulting narrowed value to the typed UI contract. The correction test's optional-chain assertion did not prove to TypeScript that the passage existed; a preceding assertion now proves that fact and fails explicitly if teaching is absent. No strictness, tests, mastery thresholds, assessment rules or evidence rules were relaxed.

Of the 15 inherited working files recorded by the original audit, 13 retain exactly the same SHA-256. The only two intentional differences are the inherited test files repaired above. The full comparison is in `validation.json`. No curriculum content, adaptive-engine implementation, evidence store, payments, Basic 7–9 files or other worktrees were modified. No commit, merge, push or deployment occurred.

## Verification results

| Check | Result |
|---|---|
| Root TypeScript, before build and again after build | **Passed; 0 errors** |
| Production learner build, `npm.cmd run build:learner` | **Passed** |
| Relevant existing regression suites | **38/38 passed; 0 failed** |
| New offline browser matrix | **4/4 passed; 0 failed** |
| Existing four-subject B4–6 interface browser matrix | **24/24 passed; 0 failed** |
| Diff whitespace check | **Passed** |
| Unexpected inherited-file changes | **0** |

The 38 suite names and reproduction commands are recorded in `validation.json`. They cover Basic 4–6 curriculum registrations/content, teaching-first behaviour, immediate correction, teacher review, mastery, retention/transfer negative gates, future revision, adaptive progression, question ordering, language, session continuity, navigation and queued submissions. This is a targeted learning regression run, not the payment-inclusive repository-wide validation command.

Browser tests ran against the newly built learner app on isolated `http://127.0.0.1:3276`, with fictional accounts, memory persistence and an unreachable database URL. The local test server was stopped after validation.

The new offline cases cover EN and FR at 390px and 1280px, using the real service worker. Every case verifies:

1. A question is displayed and an answer is saved when the browser disconnects.
2. Switching to the other interface language and back while offline preserves the question text and every queued submission field, without changing server progress/evidence.
3. Reconnection submits the original request ID, assessment item, intervention, response, session and competency; the server evaluates that original item.
4. Exactly one new trusted server evidence record is created. Another online event leaves progress and evidence unchanged.
5. Offline navigation displays the correct browser-locale fallback with a visible document root and only one language block; API responses and personalised dashboard/lesson HTML are not cached.

The 24 existing browser cases cover all four subjects and Basic 4–6, with mobile English and desktop French. They verify wrong-answer teaching, guided retry identity/independence, EN↔FR switching without evidence/progress changes, successful correction headings, lesson summaries, review continuation and cross-site request rejection. Screenshots of the fixed French fallback were visually checked at both widths.

## Remaining limitations and blockers

There are **no remaining failures in the checks run for this repair**. The production build still emits the existing non-blocking multiple-lockfile/workspace-root warning; no configuration or dependency changes were made to address it.

The original curriculum pilot-readiness work remains: official source-page reconciliation, educator approval, productive/practical assessment coverage, representation/subskill review and French translation approval. Passing these technical checks does not establish curriculum completeness.

Live database persistence, real-device/storage-pressure recovery and classroom accessibility were not verified. The new browser offline tests exercise shared infrastructure through a Basic 4 Mathematics question, rather than every competency. Installed-cache replacement is covered by the service-worker lifecycle regression; browser contexts were fresh, not existing physical-device installations. The offline fallback still follows browser locale, as before. Full downloadable curriculum and server-free adaptive progression are not provided by the current offline-shell design.

The separate payment branch dependency and its six previously blocked tests remain outside this work. No payment behaviour was changed or certified. Validation is complete for the authorised technical repair; further implementation awaits instruction.
