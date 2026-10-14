# Phase 6 — learner interface refinement

Local changes are confined to FILUMIRE_CLAUDE. Existing uncommitted Phases 1–5 and Preview preparation files were preserved. No deployment, Git commit/push, public website/CORE change, database operation, migration, package installation or external voice/model service.

## Initial audit and baseline

The existing dashboard, subject view, learner lesson/assessment route, progress/profile components, conversational FILU, closure card and browser-audio controls already support the intended journey. Phase 5’s passing regression baseline was used as the starting point; no new mastery, progression or assessment system was necessary.

Confirmed code findings:

- `LearnerBottomNav.tsx` had English-only navigation/home accessible names even in French. `LearnerHeader.tsx` used a different French FILU label from the conversation screen.
- Shared mobile navigation used 9px labels. Dashboard continuation/subject links had fixed 34px/36px heights; language/profile header controls were 36–38px. These were below the intended 44px learner touch target.
- Headers used tightly packed groups and, in the normal variant, an absolutely centred logo. Small-width collision was a code-level risk, not a reproduced device failure.
- Shared subject descriptions were line-clamped; learning-stage names used ellipsis/nowrap. Long French copy could hide useful information.
- Action buttons inherited bright blue, and active stage labels/numbers used orange/white combinations. Selected normal-text contrast pairs needed improvement.
- Lesson error handling could show arbitrary server English messages in a French session. Dashboard Suspense had a blank fallback; the lesson Suspense fallback had no readable loading text.
- Learning screens had a subject h1 plus an action h1. The illustrative fraction SVG had an English-only accessible name.
- Audio repeated six visible controls at each learning surface without a surface-specific group label. FILU request errors were not explicitly associated with its input. The profile name field used 15px text, a potential iOS focus-zoom issue.
- Browser-back language handling updated React state but did not explicitly update document language in that handler.

Preserved capabilities include authoritative progress/mastery distinctions, question-specific feedback, historical intervention completion, bilingual curriculum selection, mock FILU assessment protection, browser-local speech gates and pending-answer reconciliation.

## Improvements implemented

- Added shared `learner-interface.css`, scoped to `.learnerUi` on dashboard and lesson pages. Existing palette, branding, icons, sidebar breakpoints and learner journey remain.
- Added touch, reading-width, spacing, focus and control-radius tokens. Header groups wrap instead of colliding; text controls can shrink; long text wraps without clipping horizontal overflow.
- Mobile subject cards remain two-column, with one column below 360px and four columns at tablet widths. Navigation labels are larger and wrap; safe-area padding is included. Keyboard-focus states put mobile navigation in normal flow so it cannot remain sticky over a focused field.
- Continuation buttons can grow with French text. Subject descriptions and stage labels are no longer ellipsised. Selected action colours reuse the existing darker brand blue, and stage text uses darker contrasting colours while retaining the orange stage marker.
- Corrected French navigation names and FILU terminology; page language is explicit. Back/popstate also updates document language.
- Added a shared readable bilingual loading fallback. Learning API errors are presented through safe bilingual wording while preserving their original status and all retry/assessment handling. Stored error text is translated again when the interface language changes.
- Added an honest notice when delivered curriculum content is in the other language. Displayed lesson titles/body carry the server-provided content language. No lesson translation, authoring rewrite or replacement content was invented.
- Corrected action heading hierarchy and translated the fraction illustration’s accessible name.
- Audio groups now identify lesson/question/summary/FILU/preview context. Read, pause/resume and stop remain prominent; replay, mute and speed are inside keyboard-accessible native “Audio options” details. Speed controls have explicit unique label associations. Playback logic, preferences and local-only restrictions are unchanged.
- Associated FILU request errors/privacy notice with its input, exposed form busy state and raised profile input text to 16px. Existing focus, reduced-motion support and text-only learning access are preserved and reinforced in the learner scope.

## Files created or modified

Created:

- `apps/learner/app/learner-interface.css`
- `apps/learner/services/learner-interface.ts`
- `apps/learner/components/filumire/LearnerLoadingState.tsx`
- `tests/learner-interface-render.test.ts`
- `tests/learner-interface-copy.test.ts`
- `tests/learner-interface-layout.test.ts`
- `scripts/test-learner-interface.mjs`
- This report.

Modified:

- `apps/learner/app/layout.tsx` (imports learner-scoped styles)
- `apps/learner/app/dashboard/page.tsx`
- `apps/learner/app/learn/page.tsx`
- `apps/learner/components/filumire/LearnerBottomNav.tsx`
- `apps/learner/components/filumire/LearnerHeader.tsx`
- `apps/learner/components/filumire/ReadAloudControls.tsx`
- `apps/learner/components/filumire/FiluConversation.tsx`
- `apps/learner/components/filumire/ProfilePage.tsx`
- `apps/learner/components/filumire/language.ts`

No assessment, evidence, mastery, adaptive-intervention, authentication or database implementation was changed. UI tests did not require changes to learning business logic.

## English/French and curriculum coverage

Static lesson interface strings and adaptive action labels have French dictionary entries. New interface copy, navigation accessible names, loading states, audio options and safe error messages are bilingual. Rendering tests exercise both languages, long text and language-preserving back/subject links.

Curriculum titles/descriptions and some legacy lessons still lack trusted translations or explicit pairing. These remain a content-review gap. The UI reports delivered-language mismatch without fabricating a translation; the Phase 4 unavailable-summary fallback remains intact. Initial client-rendered loading defaults to English until the existing language hook restores the selected language.

## Accessibility and responsive coverage

The work is WCAG 2.2 AA-oriented, not certification. Tests verify semantic rendering, labels, current navigation state, non-colour-only feedback, busy/status states and selected contrast pairs at a 4.5:1 threshold. Existing input/assessment fieldsets and submission guards are preserved.

Styles configure small phones (including 320px-class widths), larger phones, tablets and desktop; wrapping layouts apply equally in portrait/landscape. Native keyboard interaction, 200% text resizing, on-screen keyboards, actual overflow, focus movement and audio-engine behaviour have not been measured in a real browser. Stylesheet-contract assertions validate the intended rules, not computed element positions.

## Automated validation

New Phase 6 runner: three suites for SSR rendering, bilingual errors/fallback/navigation and learner-scoped layout/contrast contracts. The initial navigation assertion accidentally included React-generated image preload links; it was narrowed to actual anchor links. All three focused suites then passed. No application behaviour was changed to satisfy that test.

Full requested validation passed with fictional fixtures and memory persistence: Section 7 baseline (20 suites), Phase 1 continuity (6), Phase 2 presentation (8), Phase 3 conversation (6), Phase 4 closure (8), Phase 5 voices (3), all 36 instructional journeys with 4,418 checks, standalone TypeScript and production build. All three Phase 6 suites passed; no failing tests remain. Whitespace validation passed. The suite counts are runner counts with overlapping regression coverage, not a count of unique tests. No independent lint configuration exists. SSR rendering outside Next’s JSX transform emits the existing styled-JSX attribute warning; the production build completed successfully.

## Outstanding browser/device validation

Browser runtime discovery returned an empty list. Playwright, @playwright/test and Puppeteer are not installed. No browser packages were installed and no deployment was made for testing. Therefore no real visual, interaction or device pass is claimed.

Required checks before mobile release:

1. Android/iOS at approximately 320, 360, 390 and 430px, plus 768/1024/1280px tablet/desktop widths, portrait/landscape and 200% text resizing: confirm no horizontal overflow or header collisions and readable French navigation/topics.
2. With the mobile keyboard open: compose a FILU question and a written assessment; confirm fields, error text and Send/Submit remain visible and bottom navigation does not obstruct them. Check browsers without `:has` support separately.
3. Keyboard/screen reader: test skip links, focus outlines, audio-details expansion, reading-speed labels, request-error associations, lesson summaries and progress announcements. Check full-page contrast rather than relying on the four automated colour pairs.
4. Device voice playback: verify local voice availability, previews, pronunciation, pause/resume, mute and reading speed. Gender/accent remains unverified metadata, and remote voices remain disabled.
5. Refresh/back/returning session, rapid taps, delayed responses, learner switching and logout through the actual UI. Automated continuity/evidence suites cover service boundaries but do not replace these interactive checks.

## Remaining gaps and Phase 7 readiness

No new backend dependency or approval is required for these local refinements. Curriculum translation coverage, live-provider FILU (still the approved mock), device speech behaviour and real-device/browser verification remain outstanding. The interface work is ready for Phase 7 planning after successful regressions; it is not declared mobile-release-ready or fully accessible on untested devices. Phase 7 scope/implementation requires the next instruction.
