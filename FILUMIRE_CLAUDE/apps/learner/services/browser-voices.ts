import type { VoiceLanguage } from "./voice-catalogue";
export function speechEngine(): SpeechSynthesis | undefined {
  try { return typeof window === "undefined" ? undefined : window.speechSynthesis; } catch { return; }
}
export function installedVoices(): SpeechSynthesisVoice[] {
  try { return speechEngine()?.getVoices() ?? []; } catch { return []; }
}
/** Stable identity, never the browser's mutable list index or default voice. */
export function browserVoiceId(voice: Pick<SpeechSynthesisVoice, "voiceURI" | "name" | "lang">): string {
  return JSON.stringify([voice.voiceURI, voice.name, voice.lang]);
}
export function voiceMatchesLanguage(voice: Pick<SpeechSynthesisVoice, "lang">, language: VoiceLanguage) {
  return voice.lang.toLowerCase().split(/[-_]/)[0] === language;
}
/*
 * Owner policy (2026-10-20): learning text is read only by African voices.
 * English: Ghana first, then Nigeria, then Kenya. French: francophone Africa,
 * West Africa first. Any other voice (en-GB, en-US, fr-FR, untagged "en"…)
 * is never offered or played; FILUMIRE stays text-only instead.
 */
export const AFRICAN_VOICE_PRIORITY: Record<VoiceLanguage, readonly string[]> = {
  en: ["en-gh", "en-ng", "en-ke"],
  fr: ["fr-tg", "fr-bj", "fr-ci", "fr-bf", "fr-sn", "fr-ml", "fr-ne", "fr-gn", "fr-cm", "fr-ga", "fr-cg", "fr-cd", "fr-cf", "fr-td", "fr-rw", "fr-bi", "fr-dj", "fr-km", "fr-mg", "fr-mr", "fr-sc", "fr-ma", "fr-dz", "fr-tn"],
};
function localeTag(voice: Pick<SpeechSynthesisVoice, "lang">) { return voice.lang.toLowerCase().replaceAll("_", "-"); }
/** 0 = most preferred; -1 = not an approved African voice for this language. */
export function africanVoiceRank(voice: Pick<SpeechSynthesisVoice, "lang">, language: VoiceLanguage) {
  return AFRICAN_VOICE_PRIORITY[language].indexOf(localeTag(voice));
}
export function isAfricanVoice(voice: Pick<SpeechSynthesisVoice, "lang">, language: VoiceLanguage) {
  return africanVoiceRank(voice, language) >= 0;
}
/** Locale is the only signal the browser gives; neither accent nor gender is inferred. */
export function africanLocaleHint(voice: Pick<SpeechSynthesisVoice, "lang">) {
  return isAfricanVoice(voice, "en") || isAfricanVoice(voice, "fr");
}
/** Approved African voices only, in owner priority order, local before remote. */
export function voicesForLanguage(voices: readonly SpeechSynthesisVoice[], language: VoiceLanguage) {
  return voices.filter((voice) => isAfricanVoice(voice, language)).slice().sort((a, b) =>
    africanVoiceRank(a, language) - africanVoiceRank(b, language) || Number(b.localService === true) - Number(a.localService === true) || a.name.localeCompare(b.name));
}
