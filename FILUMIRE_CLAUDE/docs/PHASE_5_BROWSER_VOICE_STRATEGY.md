# Phase 5 — revised browser/device voice strategy

This revision supersedes the African-voice-only selection requirement and the unavailable-only interface described in `PHASE_5_AFRICAN_VOICE_FOUNDATION.md`. That document remains a historical implementation record. Only installed browser/device synthesis is now enabled; no custom training, cloning, recordings, purchased voices, downloaded packages or external speech integration was added.

## Implemented capabilities

- Dynamic `speechSynthesis.getVoices()` discovery with one shared `voiceschanged` listener, an asynchronous initial retry and live preference updates. Voice names and language tags are displayed exactly as reported by the device, including European and other English/French regional voices. No gender is inferred from names.
- Local voices with target African regional language tags are prioritised in discovery. The label explicitly says a regional language tag is not verified accent evidence. No authentic African accent is certified from browser metadata. Learners can audition voices and select the sound they prefer, including male/female-sounding voices where their device provides them.
- Audio preview uses a fixed bilingual sample. The same playback controller and preference resolver serve lesson bodies, displayed assessment questions, curriculum summaries and FILU assistant messages. Audio starts only through an explicit button press, never automatically after a lesson or response.
- Separate English/French voice preferences enforce the text's trusted language. Utterances use the selected voice's actual language tag. No wrong-language or default-voice substitution occurs. Missing voice libraries or changed preferences display an explicit message; a removed selection is retained until the learner chooses another voice.
- Reading speeds 0.5×, 0.75×, 1×, 1.25× and 1.5×; replay, pause/resume, stop and mute/unmute controls. Replay restarts the currently displayed text. Changing voice, speed or mute stops existing speech. Controls cancel on their text/language/learner changing or unmounting; existing account transitions also stop audio.
- Preferences save per opaque learner ID and language on the current device, storing only voice identity (URI/name/language), language, rate and mute. No child speech text, recording, demographic profile or voice inventory is saved. Deletion is available. Storage failure is reported; a bounded temporary preference allows playback during the current visit without claiming it was saved.
- Playback validates voice availability afresh before every utterance, exact identity, text size, language and rate. Errors are safe and affect neither lessons nor assessments. Old completion/error callbacks cannot overwrite newer playback state. A five-minute cap cancels an utterance if completion is not reported.

## Privacy and identity boundaries

Browser-listed synthesis is not necessarily local: [SpeechSynthesisVoice.localService](https://developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesisVoice/localService) distinguishes local and remote engines. To preserve the no-external-service requirement, only voices reported as `localService === true` may speak. Remote or indeterminate voices appear as unavailable/disabled and are rejected again by the playback controller. No browser default fallback is used. This may leave a device without a usable voice even if its browser lists remote voices.

The [browser voice API](https://developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesisVoice) does not expose gender or certify accent. Male/female-sounding selection is by listening, not fabricated metadata. Warm/calm/expressive controls are absent because the API does not supply those capabilities. Rate changes are not presented as style changes. Regional language tags are useful sorting hints only. The earlier unavailable African catalogue remains dormant; it is not offered as working device audio, and its legacy preferences are not silently converted to another voice.

Read-aloud receives only already displayed curriculum text, summaries and server-sanitised FILU messages. It does not read assessment metadata, hidden answer keys, rubrics, typed learner answers or private conversational drafts. It sends no request to the learning API, adds no evidence and cannot acknowledge activities or alter mastery. Microphone access and spoken-answer assessment are outside this revision.

## Files

Added: `services/browser-voices.ts`, `services/browser-speech-playback.ts`, `services/use-browser-voices.ts` under `apps/learner`; `components/filumire/ReadAloudControls.tsx`; `tests/browser-speech.test.ts`; this document.

Updated: existing `voice-preference.ts`, `voice-playback.ts`, `VoiceSelection.tsx`, `LessonClosureCard.tsx`, `FiluConversation.tsx`, `app/learn/page.tsx`, `learning-client.ts` (optional server content language typing), `tests/african-voice-render.test.ts`, `scripts/test-african-voice.mjs`. Previous profile/dashboard/account cancellation integration is retained. No authentication, assessment evaluator, adaptive engine, curriculum or database changes.

## Validation and real-device acceptance

Automated tests use fictional voices and a mocked synthesis engine. They cover dynamic library changes, regional hints, exact selection, language/rate, mute, pause/resume/replay/stop, stale event protection, safe synthesis errors, missing/remote voices, per-learner bilingual preferences, storage failure, deletion and bilingual accessible rendering. The previous African catalogue safeguards remain tested as dormant infrastructure.

All three voice suites passed. The existing 20-suite baseline and Phase 1 (6), Phase 2 (8), Phase 3 (6) and Phase 4 (8) regression runners passed with memory persistence, including 36 instructional journeys and 4,418 checks. TypeScript, production build and whitespace validation passed. No remaining test failures were reported. These checks do not certify actual audible output or any voice's authenticity. No independent lint configuration exists.

Real-device testing remains required on the intended Android/iOS/desktop browsers:

1. Confirm reported local voices, initial loading and `voiceschanged` behaviour; test a device with no local English or French voice.
2. Audition each offered voice. Evaluate actual English/French pronunciation, mathematical notation and any claimed regional characteristics with appropriate speakers. Language matching alone cannot guarantee instructional pronunciation.
3. Test user-gesture playback, long text, replay, rate, pause/resume and mute. Browser/OS behaviour differs, and the UI requesting pause/resume does not prove the engine performed it correctly.
4. Verify navigation, updated questions, language switching, learner switching, logout, storage restrictions, refresh and changed/removed voice libraries while audio is active.
5. Test small-screen controls, screen-reader labels and audio focus. With a local voice, confirm no synthesis network traffic; no remote voice should be allowed to receive text.

No deployment, commit, GitHub operation, service activation, configuration change or database migration occurred. Actual speech readiness remains conditional on these device checks; the implementation does not guarantee an African voice is installed.
