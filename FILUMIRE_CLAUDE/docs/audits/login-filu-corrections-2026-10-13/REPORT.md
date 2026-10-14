# Learner login illustration and Ask FILU corrections

Protected Preview: https://filumire-learner-k9v4opa1z-tabicrentsil-6879s-projects.vercel.app

Deployment `dpl_4Fku8zgrVeAHpNeAtK6Z7BsBR3mf` is **READY** in the existing `filumire-learner` project. Vercel Authentication remains enabled (`all_except_custom_domains`); anonymous access returns 302 to Vercel sign-in. The production target remains `dpl_qrqeL1qomMu434xDobMZysC9eSFc`.

## Root causes and corrections

**Login illustration.** The desktop hero stretched vertically with a minimum height of 520 pixels and no preserved aspect ratio. Its artwork used `object-fit: cover`, enlarging and cropping the original image to fill that frame. The hero now preserves the artwork's aspect ratio and uses `contain`. The original artwork, branding, form, account creation links and authentication handlers are preserved.

**Ask FILU.** Several separate conditions produced misleading restrictions or prevented ordinary tutoring:

1. The trusted context loader classified the absence of an active intervention as a protected scored activity. Six different English/French questions reproduced this with actual authentication and tutoring handlers.
2. Opening Ask FILU called lesson restoration, which could deliver a diagnosis activity even though the learner had only opened the tutor. The tutor view now uses the existing subject overview and reads authoritative tutoring context separately. A browser assertion verifies that its learning requests use `overview=1` and do not start a scored activity.
3. A registered learner without a selected lesson or curriculum pointer received HTTP 409 instead of being able to ask a basic general question. A general-only context is now available when the learner has a verified account profile or valid curriculum context **and no active intervention**. It exposes no lesson teaching or assessment material. Unrecognized identities, invalid curriculum context and ambiguous active assessment state continue to fail closed.
4. The existing local provider could only retrieve current-lesson text. It now also supports a deliberately bounded bilingual set of foundational questions: days of the week, months of the year and small-integer addition. Named-list follow-ups use the existing signed conversation history. Other questions continue through existing curriculum retrieval or honest guidance about unavailable teaching.

Active diagnosis, practice, reassessment, retention/transfer checks and teacher review remain protected. The assessment guard still runs before the provider, so general facts cannot bypass a genuine active assessment. Context is checked again before a response is released. No assessment options, keys or rubrics were added to tutoring context; no transcript database was introduced.

## Runtime files changed

- `apps/learner/app/login/page.tsx`: illustration sizing only.
- `apps/learner/app/dashboard/page.tsx`: tutor-only overview loading and rendering, preserving other dashboard flows.
- `services/edututor/conversation-context.ts`: distinguish idle/general-only context from scored or ambiguous state.
- `packages/ai/curriculum-conversation.ts`: route supported general questions through the bounded educational responder.
- `packages/ai/general-education.ts`: new bilingual foundational responder and follow-up handling.

Targeted tests are in `tests/login-filu-corrections.test.ts` and `tests/login-filu-corrections.browser.mjs`. Audit launchers and deployment verification scripts are under `scripts/` with `login-filu` names. The isolated test server and its fixture controls are test-only and were not uploaded.

## Preservation and interrupted execution

Existing source and test work was preserved in `.vercel/login-filu-audit/source-before.zip` (58,847,182 bytes), alongside the original Git diff and working-tree inventory. Original copies of affected files are recoverable in that archive. Earlier audit evidence and deployment packages were retained.

On resumption, the cancelled scrolling command had created no files and no test server remained running. The code corrections, passing backend checks, type checks and build were preserved. Work resumed at the outstanding browser verification.

The conversation display component, read-aloud controls and original login artwork were compared with the snapshot and are byte-identical. The prior scrolling correction therefore remains intact.

## Verification results

| Check | Result | Scope |
| --- | --- | --- |
| Relevant automated suites | **17 passed** | Targeted corrections; tutoring API/context/identity/client; four-subject curriculum tutoring; instructional engine; navigation/settings; voice contracts; learner-state and assessment hardening; trusted teacher review |
| Four-subject tutoring suite | **48 real conversation requests passed** | Mathematics, science, computing and English; actual authentication, curriculum retrieval, practice and scored safeguards with memory fixtures |
| Login and tutor browser suite | **6 configurations passed** | English/French at 320, 768 and 1280 pixels; artwork geometry, rejected password, successful sign-in, ordinary questions, follow-ups, read-only tutor navigation, question/response visibility and voice non-overlap |
| Existing scrolling regression | **8 configurations passed** | English/French at 320, 390, 768 and 1280 pixels; before/pending/after real submissions and separate long-response boundary fixtures |
| TypeScript | **Root and learner passed** | Final correction source |
| Local production build | **Passed** | Node 22, memory persistence and unreachable test database URL; no production database connection |
| Vercel Preview build | **Passed** | Final uploaded local source; 33 generated pages |
| Deployed login browser tests | **6 configurations passed** | English/French at 320, 768 and 1280 pixels; `contain`, original image ratio and no horizontal overflow |
| Deployed authenticated tutoring | **8 real requests passed** | Existing saved Preview test account; English/French week, named follow-up, months and addition questions; all HTTP 200 and `assessmentProtected: false` |
| Deployment protection | **Passed** | Anonymous login request redirects to Vercel sign-in |
| Production target comparison | **Unchanged** | Same production deployment ID before and after |

The deployed example returns: “There are 7 days in a week: Monday, Tuesday, Wednesday, Thursday, Friday, Saturday and Sunday.” French returns the corresponding seven-day explanation.

Local functional tests use actual handlers, the existing curriculum provider and fictional accounts in memory. They do not mock ordinary tutoring answers. The long-response boundary test modifies the body after a real backend request specifically to exercise scrolling near the permitted response limit; that extended text is a display fixture, not a verified generated lesson response. Voice adapter tests use fictional browser/audio adapters; actual audible speech is not claimed as verified.

The Preview checks use the saved test account and do not create accounts, change learner profiles, submit assessment evidence or update learning progress. Sign-in creates a normal Preview session, and the successful verification signs out afterward. Subject/lesson and genuine scored-assessment scenarios were tested locally with isolated memory fixtures rather than altering the saved Preview account's learning records. The deployed Ask FILU checks exercise its authenticated API; the complete tutor UI and scrolling flows were exercised against the local production build.

## Failed attempts and resolved findings

Initial tests exposed French punctuation and repeated follow-up handling defects and a readonly-history TypeScript error; these were corrected and the final checks pass. Browser launcher failures came from missing Next async-runtime initialization and an incomplete fictional onboarding fixture, which were corrected in test code. Repeating rejected-password checks hit the existing authentication limiter; rejection is now tested once, with valid sign-ins used for the remaining layouts. An early navigation assertion counted an unfinished Home request; the test now waits for Home to finish before checking tutor requests.

Intermediate Preview verification exposed the missing curriculum-pointer case described above. It was corrected and the final deployed requests all pass. No unresolved final test failure remains.

## Source and deployment integrity

All **1,156 runtime source files** were verified byte-for-byte against current local source and the deployment dry run; `.vercelignore` is the only extra upload file. Environment files, snapshots, audit fixtures and test databases are excluded. The package includes audited uncommitted source, not an older GitHub checkout.

Source fingerprint: `e06b710568263d9c949ca362c8f3a4be7a69a29667ad7a9f4f93fccda246cb28`.

Detailed evidence, screenshots and JSON results are under `.vercel/login-filu-audit/`. Local authentication secrets and short-lived Vercel tokens were not printed or uploaded.

## Remaining limitations and warnings

- General tutoring remains bounded and curriculum grounded; it is not an unrestricted external AI service. Questions outside supported facts and available teaching receive guidance rather than invented answers.
- Genuine active scored activities retain the strict answer-disclosure restriction, including activities already active before these corrections. Opening the tutor no longer creates a new one.
- Actual audible voice playback and the genuine scored flow on persisted Preview learner records were not tested; local production-build fixtures and voice contract tests cover these boundaries.
- Vercel's dependency audit reports **8 existing vulnerabilities: 4 moderate, 3 high and 1 critical**, plus deprecated esbuild-kit packages. Dependencies were not changed as part of these targeted corrections. Some isolated React render tests emit the existing styled-jsx attribute warning.

The public website, production application, production databases, domains/DNS, billing/subscriptions, SMS and deployment-protection settings were not modified. No FILUMIRE F navigation button was implemented. Stopped after protected learner Preview deployment and verification.
