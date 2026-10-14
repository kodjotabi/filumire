# Phase 5 addendum — African voice identity

Scope: the supplied African voice addendum only. No separate Phase 5 specification was found or supplied. This is a local catalogue/preference/playback foundation, not a completed spoken-learning implementation.

## Availability and feasibility assessment

| Target | Male-presenting | Female-presenting | Styles | Current audio |
| --- | --- | --- | --- | --- |
| Ghanaian English | Planned, unverified | Planned, unverified | Unsupported | Unavailable |
| Nigerian English | Planned, unverified | Planned, unverified | Unsupported | Unavailable |
| Kenyan English | Planned, unverified | Planned, unverified | Unsupported | Unavailable |
| South African English | Planned, unverified | Planned, unverified | Unsupported | Unavailable |
| West African Francophone French | Planned, unverified | Planned, unverified | Unsupported | Unavailable |

These catalogue IDs describe requested categories; they do not name real speakers or impersonate verified voices. West African French is a broad target, not a claim of one uniform regional accent. Future verified entries should identify their actual country/community and reviewed linguistic characteristics rather than treating these targets as interchangeable.

No verified recordings, provider configuration or approved speech engine was found in the existing learner application. Browser-native synthesis cannot be guaranteed to satisfy this identity requirement across devices. The [Web Speech voice interface](https://developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesisVoice) exposes name, URI, language, default and local-service metadata; it does not certify accent authenticity, gender presentation or expressive styles. [getVoices()](https://developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesis/getVoices) reports the current device's inventory, not a portable voice catalogue. [localService](https://developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesisVoice/localService) distinguishes local and remote synthesis; using a browser API would not by itself guarantee offline processing or absence of network costs.

The new profile panel inventories browser voices locally and updates on `voiceschanged`. All are marked unverified regardless of name or locale, and none is enabled. Inventory is neither stored nor transmitted. A connected browser was unavailable during development, so an actual device voice inventory, accent listening assessment and mobile playback audit remain outstanding; no claim is made that zero voices exist on the user's device. An empty inventory in the panel means the browser has not reported voices, not proof that the operating system cannot provide any.

There is no API request, synthesis call, microphone use, speaker recording, voice cloning, paid service or new dependency. No provider costs were incurred. Recordings require consent, licences and curriculum coverage; TTS requires explicit approval, accent verification, child-data privacy review and current pricing review before integration. No particular provider's authenticity or price is claimed here.

## Implemented architecture

- `voice-catalogue.ts`: ten unavailable entries covering five target regions and two presentations, bilingual labels, verified provenance/rights fields and explicit per-voice style capabilities. Browser inventory never auto-verifies a voice from locale or name.
- `voice-preference.ts`: versioned local-device preference per existing opaque learner ID, containing only catalogue ID and style. No names, age, demographics, recordings, text, mastery or browser inventory. Invalid preferences are rejected; unavailable preferences may be saved as future wishes. The panel offers deletion. Preferences survive returning sessions on the same browser, do not synchronise to accounts/devices, and are not included in public server responses. This changes no database schema.
- `voice-playback.ts`: one entry point for lessons, summaries, displayed questions, FILU responses and preview, with verification, rights, language, style and installed-engine gates. A mismatch fails rather than substituting a British/American/default voice. Playback errors are sanitised and cancellation supported; stop failures cannot disrupt logout. No adapters are installed. Future approved recordings or local/provider engines implement the same adapter contract. No spoken-learning surface is enabled yet.
- `VoiceSelection.tsx`: profile interface with male/female labels, explicit unavailable status, disabled audio preview/style controls, local browser inventory and storage-failure messaging. It offers warm/calm/expressive only when a verified voice actually advertises them. Future previews use a fixed non-personal sample in the selected voice's language.
- Existing `ProfilePage.tsx` and `dashboard/page.tsx` integrate the panel using the authenticated active learner ID. Existing `account-client.ts` stops playback on authentication loss, sign-in, learner switch and profile clearing; previous conversation/closure cleanup is preserved.

Assessment evaluation, mastery, instructional acknowledgement, retention and adaptive decisions are unchanged. A future read-aloud integration must use only already sanitised displayed text; this abstraction has no access to hidden answer keys or learning-state mutation. The Phase 4 optional read-aloud callback remains inactive until verified audio exists. This does not implement microphone questions or a voice-based assessment route.

## Validation

New `tests/african-voice.test.ts` covers catalogue scope, unverified browser metadata, preference isolation/minimal fields/deletion, unknown voice rejection, blocked unavailable playback, common adapter use across all surfaces, language/style/verification failures, safe engine failures and cancellation. Its in-memory test adapter and provenance strings are fictional; they do not verify an actual voice.

New `tests/african-voice-render.test.ts` covers bilingual option labels, unavailable statuses, disabled previews/styles and semantic controls. Runner: `node scripts/test-african-voice.mjs`.

Regression validation passed using fictional fixtures and memory persistence: baseline 20 suites; Phase 1 6; Phase 2 8; Phase 3 6; Phase 4 8; new voice foundation 2. Final voice/logout checks, TypeScript and the production build also passed. No test failures remain. Real-device speech, mobile interaction and screen-reader testing remain outstanding. There is no configured independent lint command. No deployment, Git commit/push, configuration change, production database mutation or migration is part of this work.

## Remaining approval boundary

The foundation is ready for verified voice assets, not for a claim of working African audio. Next: approve either a consented/licensed African recording plan or evaluation of an African-accent TTS provider. Integration must document real voice provenance, supported languages/styles, sample review, rights, privacy and any costs. Do not record, clone, purchase or transmit child learning text without explicit authorisation. Broader Phase 5 audio/voice requirements still need to be supplied before declaring Phase 5 complete.
