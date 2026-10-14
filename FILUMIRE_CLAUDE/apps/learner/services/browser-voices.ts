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
const africanEnglishTags = new Set(["en-gh", "en-ng", "en-ke", "en-za"]);
const westAfricanFrenchTags = new Set(["fr-bj", "fr-bf", "fr-ci", "fr-gn", "fr-ml", "fr-ne", "fr-sn", "fr-tg"]);
/** Locale is a discovery hint only; neither accent nor gender is inferred. */
export function africanLocaleHint(voice: Pick<SpeechSynthesisVoice, "lang">) {
  const tag = voice.lang.toLowerCase().replaceAll("_", "-");
  return africanEnglishTags.has(tag) || westAfricanFrenchTags.has(tag);
}
export function voicesForLanguage(voices: readonly SpeechSynthesisVoice[], language: VoiceLanguage) {
  return voices.filter((voice) => voiceMatchesLanguage(voice, language)).slice().sort((a, b) =>
    Number(b.localService === true) - Number(a.localService === true) || Number(africanLocaleHint(b)) - Number(africanLocaleHint(a)) || a.name.localeCompare(b.name));
}
