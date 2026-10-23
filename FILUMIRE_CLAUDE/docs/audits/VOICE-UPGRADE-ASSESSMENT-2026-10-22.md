# Voice upgrade assessment: Akua and Kwaku — 2026-10-22 (report only, nothing changed)

Code inspected: commit `3a4a8663` (`filumire-batch1`, `feat/jhs7-9-development`).

## 1. The existing voice system (works; upgrade, not rebuild)

| Part | What it does |
|---|---|
| `browser-voices.ts` | Lists the device's `speechSynthesis` voices. Orders African locales first: en-ZA (Tessa first), en-GH, en-NG, en-KE…; for French, francophone Africa. Then a **temporary same-language fallback** (owner, 2026-10-20). |
| `browser-speech-playback.ts` | One shared controller. Plays **device-local voices only**: remote voices are blocked so no child text leaves the device, and this is also why it works offline. With no local voice for the language, the surface is text-only. |
| `ReadAloudControls.tsx` | Used on **lesson, question, correction, summary, FILU** and the profile voice preview. Read/replay, pause/resume/stop, mute, 0.5–1.5× speed, per-learner voice choice. |
| `voice-catalogue.ts` + `voice-playback.ts` | A **dormant** African catalogue (10 entries, 5 regions, all `unavailable`) and a `VoiceAdapter` interface. A voice becomes playable only with `status: "verified"`, recorded evidence and rights, and an engine. Designed for exactly this upgrade; currently unused. |
| Tests | `test:voice` (`browser-speech`, `african-voice`): 2/2 pass, **fictional voices only**, and not in the default suite list. |

**Current voices on this Windows machine** (built-in Chromium, checked today): Microsoft George, Hazel and Susan, all en-GB, local. **No French voice**, so French read-aloud is text-only here. **No African voice**, so English uses the fallback. This matches the 14 October evidence. Other devices will differ; Tessa (en-ZA) ships on Apple devices.

## 2. Akua (female) and Kwaku (male): what I could verify

- **Not in any FILUMIRE code.** The names appear only as characters in Basic 5–6 lesson content. There is no prior integration, asset or configuration, and no Voice Lab directory was found on this machine.
- **Not offered by the major speech services**, checked against their official voice lists today:
  - Microsoft Azure: African English is Leah and Luke (en-ZA), Ezinne and Abeo (en-NG), Asilia and Chilemba (en-KE), Imani and Elimu (en-TZ). **No en-GH and no African French.**
  - Google Cloud: English only for en-AU, GB, IN and US; French only for fr-CA and FR.
  - AWS Polly: Ayanda (en-ZA) only.
  - Narakeet: Nigerian and South African accents; no Ghanaian.
- **Khaya AI (GhanaNLP)** offers text-to-speech for *Ghanaian languages* (Twi, Ewe, Ga, Dagbani, Frafra), not for English or French read with a Ghanaian accent.
- **Unverifiable from here:** ElevenLabs' shared voice library needs an API key (HTTP 401), and web search was unavailable in this session. Community voice libraries are the most likely home for voices named Akua and Kwaku.

**So the provider, availability, licence, cost and compatibility of Akua and Kwaku are NOT verified. I need the source** (link, provider or account) before any recommendation can be specific.

## 3. What is technically possible

| Option | How it would work | Offline | Privacy | Cost / licence | Fit |
|---|---|---|---|---|---|
| **A. Pre-generated audio (recommended, if the licence allows)** | Synthesise *authored* text (lessons, questions, correction explanations, summaries) once, in a controlled offline build step. Store the audio as static files keyed by content ID and version, and play them through a new adapter behind the existing `VoiceAdapter` / catalogue. | Yes, if cached by the service worker (needs a size budget) | No learner data leaves the device at runtime | One-off generation cost. The licence must allow **commercial redistribution of generated audio** to children. | Uses the dormant catalogue as designed |
| B. Live cloud TTS | The server proxies text to the provider on demand. | **No**: needs a connection | Sends text to a third party at runtime. **Conflicts with the current local-only rule**, and FILU text can contain a learner's own words. | Per-character charges; a data-processing agreement is needed | Reverses a documented privacy decision |
| C. Device voices only | Only if Akua and Kwaku are installable OS voices. | Yes | Local | Free | Not possible unless the vendor ships them as OS voices |

Options A and C keep every existing behaviour. B does not.

## 4. Recommended safest implementation (after the provider is confirmed)

1. **Verify first, no code change:** the provider's terms (commercial use, minors, redistribution of generated audio, attribution), price per character or minute, voice consent and provenance, and languages. Akua and Kwaku may be English only; French needs its own African-French voice decision. Record this as the catalogue's `verification.evidence` and `verification.rights`.
2. **Listening review** of samples by a Ghanaian English educator, and a French specialist for any French voice.
3. **Implement option A as an upgrade:**
   - Add two `verified` catalogue entries (Akua, Kwaku) and an "audio file" adapter. Lesson, question, correction and summary text then plays the pre-generated file when one exists for that exact content version.
   - **Unchanged fallback chain:** a missing file, or FILU (dynamic text), falls back to today's device voice ordering, then to text-only.
   - English and French playback, mute, speed, per-learner choice, and stop on navigation or logout are all preserved.
   - Generation runs as a reviewed script; no runtime keys in the learner app.
4. **Size and offline:** start with one pilot unit per grade/subject and measure storage before wider generation. The service worker caches only approved audio, never `/api/*` or personal HTML.

## 5. Items you asked for that need your approval to change

- **Add `test:voice` to the standard verification:** append `browser-speech` and `african-voice` to `OFFLINE_SECURITY_SUITES` in `scripts/run-offline-suites.mjs` (2 lines). Default set 49 → 51.
- **Correct `docs/PHASE_5_BROWSER_VOICE_STRATEGY.md`:** replace "No browser default fallback is used" with the 2026-10-20 temporary same-language fallback, how it is labelled, and that it is pending review. Add that audio playing does not mean an African voice.
- **Surface tests** (lesson, question, correction, summary, FILU), as a baseline now and again after any change:
  - a browser run that captures each surface's utterance: text, voice, `lang`, and that no answer key is spoken;
  - mute, stop on navigation, and language switch;
  - French on a device with no French voice (text-only notice);
  - the fallback indicator.
  Real-device runs (Android Chrome, iOS Safari, Windows, macOS) remain required.
