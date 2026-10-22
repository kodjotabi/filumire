# Basic 4–9 private application: independent audit handover

This packet covers the approved bounded integration, not completion of the 625-entry JHS curriculum. No commit, merge, push or deployment has been performed.

## Location and lineage

Working repository: `C:\Users\tabi\Documents\Codex\filumire-jhs-integration`

Application: its `FILUMIRE_CLAUDE` directory. Branch: `feat/jhs7-9-development`. HEAD remains `29854417561714a62024be2b150de9b4a2cd24b3`.

The original worktree is outside this session's writable boundary. Its exact working files, including the inherited uncommitted work, were copied into this independent working repository. Dependencies are reused through a local junction; Git reads existing historical objects through an alternate object store. This is a local audit workspace, not a portable deployment archive. `files-changed.json` distinguishes this integration's delta from the inherited changes and verifies the original working files against the capture baseline. The original source remains intact.

## What is integrated

- The real Next.js learner application loads the existing **42 fingerprint-pinned bilingual JHS journeys**, covering all twelve Basic 7–9 / English, Mathematics, Science and Computing combinations. The **583 unauthored entries are excluded from the teachable registry**. No lessons were duplicated or reauthored.
- Activation requires the server setting `FILUMIRE_JHS_MODE=private-presentation`; JHS remains unavailable by default. `VERCEL_ENV=production` refuses this draft activation. This is a private presentation scope, not educational release approval.
- The family page adds a guardian-only **Class and subject** form on each learner card. Create the learner first, then select Basic 7–9 there. The add-learner form retains its existing primary-grade contract. The form uses the existing cross-version placement service; it does not migrate or manufacture evidence. Primary classes remain available as a return path.
- Learners sign in with their own credentials and use `/dashboard` and `/learn`, including teaching first, bilingual content, wrong-answer explanations, guided retry, independent responses and interruption recovery. The original guardian grade lock remains enforced.
- Guardian-issued teacher codes connect the existing teacher workspace to the same learner. A learner submission creates a pending review, not mastery. An authorised teacher decision records evidence and updates parent/learner progress. The learner can sign out and sign in again to resume reviewed work.
- Existing adaptive intervention, independent mastery, transfer and due retention rules are reused. Automated teacher decisions and simulated time in the tests do not constitute real oral/practical achievement or educator approval.
- A bilingual notice distinguishes the available presentation activities from the full official curriculum. Its desktop position accounts for the fixed learner sidebar. Existing Google font binaries are self-hosted, with hashes, provenance and OFL notices, so production builds no longer need Google Fonts downloads.

Key implementation files:

```
packages/curriculum/jhs-private-policy.ts
packages/curriculum/jhs-private-manifest.json
packages/curriculum/index.ts
packages/curriculum-framework/index.ts
services/content-store/jhs-private.ts
services/content-store/seed.ts
services/learner-context/placement.ts
services/adult-summary/index.ts
services/teacher-summary/index.ts
apps/learner/instrumentation.ts
apps/learner/app/api/account/learners/[learnerId]/placement/route.ts
apps/learner/components/filumire/GuardianPlacement.tsx
apps/learner/components/filumire/PrivatePresentationNotice.tsx
apps/learner/services/account-client.ts
apps/learner/app/family/page.tsx
apps/learner/app/layout.tsx
apps/learner/app/local-fonts.css
apps/learner/public/fonts/
```

The package registry keeps source mapping separate from teachable definitions. The private seed checks the entire approved scope before registering any of it. A changed content fingerprint fails initialization. The primary registry, content and assessment policies are preserved. No payment, schema or mastery-threshold change is part of this integration.

## Verification evidence

The authoritative machine-readable results are in `validation-summary.json`; detailed evidence paths are recorded there. Completed checks include:

- **49/49** existing offline security/integrity suites.
- **20/20** targeted JHS, Basic 4–6 preservation, placement, guardian-lock, curriculum-navigation, trusted-review, account, progress and retention suites.
- **10/10** additional adaptive-loop, assessment, identity, intervention, language and authentication suites.
- **168/168** integrated API scenarios: 42 journeys × two languages × correct/incorrect due-retention outcomes. Each includes teaching, interruption, guided correction, pending review, fictional trusted review, transfer and a return after 31 simulated days.
- **48/48** real Next.js browser workflows: twelve JHS contexts × English/French × 390/1280px. These use signed accounts and the actual learner, family, teacher and parent interfaces. They cover guardian placement, login, teaching, incorrect practice and retry, pending review, teacher decisions, parent progress, logout/login resumption, learner placement refusal, cross-site refusal, absence of browser runtime errors and horizontal overflow.
- **24/24** inherited Basic 4–6 browser journeys, spanning all twelve primary grade/subject combinations on mobile English and desktop French. These preserve language-switch question identity, guided retry, lesson summaries and origin protections.
- **4/4** inherited offline browser cases: both languages and viewport sizes. Queued answers survive an offline language switch, synchronise once, and do not cache personal HTML or APIs. These verify the existing offline fallback; they do not establish new offline curriculum delivery.
- Root and learner TypeScript checks, production build and startup passed. **4/4** final focused browser workflows passed after the desktop scope-notice correction; its text is clear of the sidebar in both languages.

Earlier browser attempts are retained. They exposed test assumptions about explicit multi-learner selection, asynchronous account loading and the existing ten-learner family cap. The final matrix uses the visible selectors, waits for them, and keeps each fictional family within that cap. No security or family limit was relaxed. Failed build experiments using worker threads were abandoned; the final build uses the unchanged normal Next.js configuration and self-hosted fonts.

## Reproduce

From the application's `FILUMIRE_CLAUDE` directory:

```powershell
node scripts/run-offline-suites.mjs
node scripts/run-offline-suites.mjs jhs-private-integration b7-existing-curriculum-regression jhs-preview-preservation jhs-runtime-foundation jhs-placement jhs-preview-placement jhs-preview-content-integrity guardian-grade-lock curriculum-navigation selected-topic-lesson-integration spaced-revision spaced-revision-subjects time-aware-retention-v1 time-aware-retention-engine-v1 teaching-first-retention teaching-first-journey teacher-review-delivery-provenance account-registration-journey teacher-linking learner-progress
node scripts/run-offline-suites.mjs adaptive-learning-loop competency-003-adaptive-loop api-assessment-security api-identity-security intervention-lifecycle content-language-selection auth-rate-limit learning-language session-issue-rate-limit teacher-learner-session-boundary
node scripts/run-offline-suites.mjs jhs-private-journeys
node node_modules/typescript/bin/tsc --noEmit --incremental false
node node_modules/typescript/bin/tsc --noEmit --incremental false -p apps/learner/tsconfig.json
npm.cmd run build:learner
powershell.exe -NoProfile -File scripts/start-jhs-private.ps1
```

An ignored `apps/learner/.env.production.local` configures this local build with fictional memory-only settings, an unreachable database URL and a test signing key. It is not deployment configuration. The launcher generates a new fictional signing key per run and binds only to `127.0.0.1:3291`; use `-Port` if needed. It does not stop an existing process. Ctrl+C stops that instance. Memory accounts, evidence and sessions disappear when the server stops.

The browser runner uses the installed Playwright and Chromium paths supplied explicitly:

```powershell
node --import tsx tests/jhs-private.browser.mjs --playwright C:/Users/tabi/AppData/Local/npm-cache/_npx/e41f203b7505f1fb/node_modules/playwright/index.mjs --chromium C:/Users/tabi/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe
node --import tsx tests/jhs-primary-browser.mjs --playwright C:/Users/tabi/AppData/Local/npm-cache/_npx/e41f203b7505f1fb/node_modules/playwright/index.mjs --chromium C:/Users/tabi/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe
node --import tsx tests/jhs-primary-browser.mjs --offline --playwright C:/Users/tabi/AppData/Local/npm-cache/_npx/e41f203b7505f1fb/node_modules/playwright/index.mjs --chromium C:/Users/tabi/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe
```

Run `tests/jhs-private.browser.mjs` with `--layout-only` for the focused four-case check. Paths above name existing local tools; substitute another installed matching toolchain when reproducing elsewhere. Nothing in this task installs a browser or downloads dependencies.

## Independent review priorities and remaining boundaries

1. Review the private activation gate, exact 42-entry allowlist, all-or-nothing fingerprint validation, and default/production exclusion. Review worker/module initialization for the eventual hosting environment.
2. Verify guardian-only placement, inactive/mismatched-context refusal, no history rewriting, and return to primary education. Check the two-step new-JHS-learner setup in the family page.
3. Inspect actual trusted-review provenance and learner/parent/teacher consistency. Practical/oral activities still require genuine observed evidence; the automated fictional responses are explicitly labelled.
4. Confirm the disclosure that **42/625** JHS source entries have draft technically validated journeys. The original source flags and separate educational/French approval gates remain pending. Existing preview documents are historical harness evidence, not the new application's readiness statement.
5. Before any eventual private deployment, independently verify protected access, deployment configuration, schema compatibility and durable PostgreSQL behaviour against an authorised isolated target. **No real database writes or restart-durability test were performed here.** The local memory rehearsal is not evidence of durable hosting.
6. Full cold-start offline JHS delivery and real classroom/educator/French approval are outside the demonstrated scope. Do not claim full curriculum completion or school-release approval.

The bounded application integration is ready for independent review. Final production-build, startup and layout checks passed. Deployment remains a separate action requiring approval.
