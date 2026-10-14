# FILUMIRE Audit 2 — Phase 3, Stages 0–2

Completed locally on 13 October 2026. Work stopped after Stage 2 validation. No deployment, commit, push, migration, live payment, SMS activation, production/domain change or authentication infrastructure change was performed.

## Preservation

`existing-work.zip` preserves 10,743 files from the current repository, including existing uncommitted, untracked, hidden and ignored source/configuration and previous audit/preview artifacts. Generated node_modules, .next and .turbo directories and Git metadata directories were excluded. Every archived file passed SHA-256 verification before application edits. `history.bundle` preserves all available Git refs/history and passed `git bundle verify`.

The archive includes private configuration. Recovery materials are locally ignored; never publish them. Recover into a separate directory: clone the bundle, overlay the archived source and keep the new clone’s Git metadata rather than the archive’s worktree pointer. Do not extract over the working project.

Post-edit comparison checked all 10,743 archived paths. Exactly eight pre-existing learner files changed: dashboard, learn, login, learner-interface.css, LearnerHeader, FiluConversation, ProfilePage and VoiceSelection. All existing service/package code, API routes, environment files, database/migration files, dependencies and welcome/layout source remained byte-identical to the snapshot. The only missing archived helper is the unused Python preservation script created during this run and removed after the PowerShell snapshot succeeded; no pre-existing user file was deleted. New preference/components, tests and local audit evidence are additions.

## Corrections

| Requirement | Implemented result |
| --- | --- |
| Preserve welcome and language selection | Welcome page, layout, illustrations and original English/French behaviour unchanged. |
| Sign-in Subscription entry | Subscription/Abonnement links to the existing public English/French pricing pages. Copy states that payment and connected subscription access are unavailable in this preview. Registration and password sign-in remain connected to their existing handlers. |
| Ask FILU access | Restored the header shortcut on Home and My Learning. Existing bottom navigation, home tile and subject/language context remain. No curriculum button was added. |
| Sign Out placement | Removed header sign-out. Dashboard and lesson screens have a bottom control outside navigation. Profile retains its bottom control. Existing server revocation and device cleanup are reused; busy/failure states remain truthful. |
| Ask FILU simplicity | Removed the five visible shortcut buttons. The labelled question form and Send precede the conversation history and have stronger visual prominence. Backend tutoring, lesson context, privacy, expiry, retry and scored-activity protections are unchanged. |
| Settings order | My Settings is the main heading; profile preferences precede FILUMIRE Learning Voice; Additional Settings follows. Existing name/class/avatar/language and voice persistence are retained. |
| Notifications | Functional optional progress/achievement notice preferences. Notices derive from observed progress/achievement changes while the interface is active, can be dismissed and obey preferences. No push, email or scheduled/background delivery. Assessment and safety feedback are not controlled by these preferences. |
| App Appearance | Light, Dark and System Default, persisted per learner on the current device. System changes update the interface. Dashboard views, Ask FILU, settings and lessons support Dark mode; welcome/sign-in retain their established appearance. |
| Privacy & Safety | Working disclosure interface with existing privacy notice and safeguards. Learners retain existing password/device management; guardian sessions link to family management and do not receive learner password controls. |
| Help & Support | Dedicated disclosure interface with bilingual FAQs, subscription information and the existing public contact routes. Contact opens a new tab with guardian/privacy guidance; no new mailbox or delivery service was invented. |
| Responsive/contrast defects found during verification | Allow wrapped learner headers to grow; reduce sign-in header spacing below 360px; wrap long French challenge labels; correct Dark mode card, banner, metadata, stage and feedback colours. No overflow clipping was introduced. |

New preferences use a versioned, learner-specific localStorage key. They contain no names, contact details, learning records or voice inventory. Storage failures are reported. New preference writes do not touch profile/language/voice keys or account/database records.

## Verification

- **156 runnable automated suites passed**, accounting for focused reruns. The initial broad run passed 155; a stylesheet-scoping assertion failed because new login styles were in the learner-only stylesheet. Moving those rules into login resolved the failure. Historical logs retain the original result; FINAL-RESULTS.json reconciles the successful rerun.
- **7 final focused suites passed:** settings/storage isolation, layout contracts, rendered interface, sign-out cleanup, interface completion and the two existing voice suites.
- **Root and learner TypeScript checks passed.** The final **Node 22.23.3 production build passed**, including all 33 static pages.
- **36 existing browser navigation/access checks passed** at 390, 768 and 1280px: Home, Setup, My Learning, lesson entry, history, onboarding return, guardian selection and expired-session guards.
- **8 new browser scenarios passed:** English and French at 320, 390, 768 and 1280px. They exercised settings disclosures, persistence/reload, System media changes, learner appearance isolation, disabled/enabled progress notices, achievement notices, dismissal, Dark mode across dashboard views and lessons, question submission, bilingual support/pricing destinations and failed/successful sign-out handling. No page runtime errors were observed. API responses in these scenarios were intercepted fictional fixtures; these are UI integration checks, not proof of production database operation. Service workers were blocked in the new matrix to preserve interception.
- **17 actual local production-server HTTP checks passed** using fictional in-memory records: guardian/learner setup, password sign-in, real learning initialization/overview, bilingual curriculum-backed FILU responses, disclosure protection, cross-origin rejection, server sign-out and rejection of the revoked cookie. External database access was disabled with an inert localhost URL.
- Saved screenshots were inspected. Review caught contrast defects beyond the interaction assertions; those were fixed and rebuilt. The final matrix checks computed voice-heading contrast and lesson-banner colours as well as horizontal fit and header/content overlap.
- `git diff --check` passed. Local test servers were stopped after verification.

The earlier browser failures were either actual scoped styling/layout defects, which were corrected, or test expectations that needed to honour existing subject-preserving navigation and client-side French hydration. A cached Playwright/browser version mismatch was handled with the already installed Chromium executable; no dependency or browser download was added.

## Remaining limits

- Ten existing suites remain blocked: nine require an approved isolated PostgreSQL database; one requires verified authoritative English fixture provenance. No migrations or database provisioning were attempted.
- Browser checks used headless Chromium and fictional intercepted data. Physical Android/iOS/Safari behaviour and actual audible installed-voice playback still require device review. Existing voice behaviour and preference services passed automated regressions and were not changed.
- Preferences are device-local and learner-specific, not synchronised across devices. Notices are optional in-app updates, not an inbox or delivery service.
- Public contact/pricing destinations were checked in the UI against existing source routes. No contact message, email delivery, SMS or payment was sent or tested.
- Existing privacy notice remains a test-phase draft; no legal/content policy was replaced. Earlier dependency vulnerability warnings were not addressed through unrelated dependency upgrades.
- Current changes are local only. The existing private Preview remains the earlier deployment and does not contain Audit 2 changes.

## Evidence and review

FINAL-RESULTS.json, preservation-results.json, regression/focused results and logs, build/type logs, HTTP results, browser logs and screenshots are in this directory. Reusable isolated runners are scripts/check-audit2.mjs, build-audit2.mjs, browser-audit2.mjs and http-audit2.mjs. Preservation and comparison scripts are preserve-audit2.ps1 and verify-audit2-preservation.mjs.

React review covered client/server boundaries, hook order and cleanup, typed scoped preferences, honest storage errors, accessible native controls/disclosures, bilingual copy and absence of new dependencies. The browser and verification skills informed local validation; no connector action sent messages or changed infrastructure.

No work from Stages 3 onward has started. Await review before further implementation or deployment.
