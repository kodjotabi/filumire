# Ask FILU conversation display correction

Preview: https://filumire-learner-6xqmlwceo-tabicrentsil-6879s-projects.vercel.app

Deployment: `dpl_DXbksCZWEMFXN93NxXhvaNDnbRQZ`, existing `filumire-learner` project, protected Preview only, READY.

## Reproduction and cause

Real questions were submitted through the running application to its real curriculum-backed conversation API, using fictional local in-memory guardian/learner accounts. Existing scored-activity protections remained active; FILU returned guidance rather than assessment answers.

The conversation effect set `scrollTop` to `scrollHeight` on submission/completion. Because the reply and its voice controls exceeded the bounded transcript height, this scrolled the question and often the start of the reply above the visible panel. At 390px, the English reply began 61px above the panel; French began 134px above it. At desktop sizes the learner’s question was also above the panel.

## Targeted fix

Only `apps/learner/components/filumire/FiluConversation.tsx` changed among runtime files relative to the previous Audit 2 Preview.

- Anchor each new turn at its latest learner question, using its position within the transcript instead of scrolling to the bottom of the audio controls.
- Disable browser scroll anchoring inside this bounded panel to avoid competing movement as content mounts.
- Give assistant bubbles the remaining row width and constrain nested voice labels/selects to the bubble width.
- Retain the existing design and native vertical scrolling. Long responses are fully accessible by scrolling; no text is truncated to fit.

Subject/context handling, conversation privacy/expiry/retry, backend tutoring, session handling, assessment restrictions and voice services were unchanged. The prior component source was preserved as `FiluConversation-before.tsx.txt`; previous full snapshots and Preview packages remain intact.

## Verification

- 10 relevant regression suites passed: conversation API/client/context/identity, FILU functionality, voice/rendering, interface rendering, Ask FILU navigation and Audit 2 settings.
- Learner type checking and the Node 22 production build passed; all 33 static pages built. Root type checking passed after renaming the saved backup from .tsx to .txt so the root’s broad TypeScript include did not compile recovery material with unresolved relative imports.
- Eight browser scenarios passed: English/French at 320, 390, 768 and 1280px, before/during/after real submissions. After correction, the question starts 13px inside the panel and the actual reply starts 145–172px inside it. Reply text exactly matches the real API response; no page runtime errors occurred.
- Eight additional long-response cases used a controlled near-2,000-character display fixture derived from a real API response. They verified the latest question/reply beginning, full text availability, scroll access to the end, expanded audio controls below the text, and absence of horizontal overflow. These are display boundary fixtures, not claims about generated tutoring content.
- Conversation testing did not change learning progress. All test accounts and learning state existed only in the local server process; no external database was accessed. Test servers were stopped.
- Screenshots were inspected before and after the correction.
- All 1,155 upload source files matched their current local SHA-256 values and the CLI upload manifest. Source fingerprint: `a2fae110fc27ed5081dcb3adc39eef67f96ef4e12209319118745d43f924e226`. No environment files, recovery archives or local build output were uploaded.
- Vercel’s remote build passed and reached READY. Read-only deployed checks verify the updated dashboard bundle, login/dashboard serving, anonymous session rejection and Vercel Authentication redirect. Signed-in Preview interaction is not established by these read-only deployment checks; the full real-question flow was verified locally.
- Production target remained `dpl_qrqeL1qomMu434xDobMZysC9eSFc`. Protection remains `all_except_custom_domains`; the generated Preview URL is protected.

## Remaining limits and warnings

Physical-device voice playback was not verified because the headless browser reports no installed local voices. Voice-control layout and existing voice services were tested; voice functionality was not modified. Long text remains in a scrollable panel, rather than displaying every turn simultaneously.

The remote dependency scan still reports eight vulnerabilities (four moderate, three high, one critical), plus existing esbuild-kit deprecation warnings. No dependencies were changed for this display correction.

No production deployment, promotion, custom-domain/DNS change, billing/SMS activation, public website change, database migration or external database write was performed. Work stops after this report and Preview verification.
