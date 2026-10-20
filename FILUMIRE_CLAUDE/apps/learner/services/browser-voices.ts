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
 * Owner policy (2026-10-20): African voices come first. English: South
 * Africa (Tessa preferred), then Ghana, Nigeria, Kenya, Tanzania and other
 * anglophone African locales. French: francophone Africa, West Africa first.
 * Temporary fallback (owner, 2026-10-20, to be reviewed): when the device has
 * no African voice, its other voices for the same language may read, so
 * FILUMIRE keeps speaking. Only device-local voices ever play.
 */
export const AFRICAN_VOICE_PRIORITY: Record<VoiceLanguage, readonly string[]> = {
  en: ["en-za", "en-gh", "en-ng", "en-ke", "en-tz", "en-ug", "en-zm", "en-zw", "en-rw", "en-mw", "en-bw", "en-na", "en-sl", "en-lr", "en-gm", "en-cm", "en-ls", "en-sz", "en-ss", "en-sd", "en-mu", "en-sc"],
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
/** Locale is the only accent signal the browser gives; accent is never inferred. */
export function africanLocaleHint(voice: Pick<SpeechSynthesisVoice, "lang">) {
  return isAfricanVoice(voice, "en") || isAfricanVoice(voice, "fr");
}
export type VoiceGender = "female" | "male";
/*
 * The Web Speech API does not report gender. These are vendor-published
 * African voices (Apple, Microsoft) with a documented gender, matched by
 * name and locale; any other voice is shown as "not stated".
 */
const KNOWN_VOICES: readonly { name: string; lang: string; gender: VoiceGender }[] = [
  // Common built-in Windows and Apple voices, for the temporary fallback.
  { name: "george", lang: "en-gb", gender: "male" }, { name: "hazel", lang: "en-gb", gender: "female" }, { name: "susan", lang: "en-gb", gender: "female" }, { name: "daniel", lang: "en-gb", gender: "male" },
  { name: "david", lang: "en-us", gender: "male" }, { name: "mark", lang: "en-us", gender: "male" }, { name: "zira", lang: "en-us", gender: "female" }, { name: "samantha", lang: "en-us", gender: "female" },
  { name: "hortense", lang: "fr-fr", gender: "female" }, { name: "julie", lang: "fr-fr", gender: "female" }, { name: "paul", lang: "fr-fr", gender: "male" }, { name: "thomas", lang: "fr-fr", gender: "male" },
  { name: "caroline", lang: "fr-ca", gender: "female" }, { name: "claude", lang: "fr-ca", gender: "male" }, { name: "amélie", lang: "fr-ca", gender: "female" },
  { name: "tessa", lang: "en-za", gender: "female" }, { name: "leah", lang: "en-za", gender: "female" }, { name: "luke", lang: "en-za", gender: "male" },
  { name: "ezinne", lang: "en-ng", gender: "female" }, { name: "abeo", lang: "en-ng", gender: "male" },
  { name: "asilia", lang: "en-ke", gender: "female" }, { name: "chilemba", lang: "en-ke", gender: "male" },
  { name: "imani", lang: "en-tz", gender: "female" }, { name: "elimu", lang: "en-tz", gender: "male" },
];
function knownVoice(voice: Pick<SpeechSynthesisVoice, "name" | "lang">) {
  const words = voice.name.toLowerCase().split(/[^a-zé]+/);
  return KNOWN_VOICES.find((known) => known.lang === localeTag(voice) && words.includes(known.name));
}
export function knownVoiceGender(voice: Pick<SpeechSynthesisVoice, "name" | "lang">): VoiceGender | undefined {
  return knownVoice(voice)?.gender;
}
/** Owner preference: Tessa (en-ZA) leads English wherever the device has her. */
function tessaFirst(voice: Pick<SpeechSynthesisVoice, "name" | "lang">) { return knownVoice(voice)?.name === "tessa" ? 0 : 1; }
/** Order for an African voice by owner priority; other voices sort after every African one. */
function priority(voice: Pick<SpeechSynthesisVoice, "lang">, language: VoiceLanguage) {
  const rank = africanVoiceRank(voice, language);
  return rank < 0 ? AFRICAN_VOICE_PRIORITY[language].length : rank;
}
/** Same-language voices: African first (Tessa first), then the temporary device fallback; local before remote. */
export function voicesForLanguage(voices: readonly SpeechSynthesisVoice[], language: VoiceLanguage) {
  return voices.filter((voice) => voiceMatchesLanguage(voice, language)).slice().sort((a, b) =>
    tessaFirst(a) - tessaFirst(b) || priority(a, language) - priority(b, language) || Number(b.localService === true) - Number(a.localService === true) || a.name.localeCompare(b.name));
}
/** Highest-priority voice that can actually play (device-local), if any. */
export function bestLocalVoice(voices: readonly SpeechSynthesisVoice[], language: VoiceLanguage) {
  return voicesForLanguage(voices, language).find((voice) => voice.localService === true);
}
/** Voice menu groups: female, male, then voices whose gender is not published. */
export function voiceGroups(voices: readonly SpeechSynthesisVoice[]) {
  return {
    female: voices.filter((voice) => knownVoiceGender(voice) === "female"),
    male: voices.filter((voice) => knownVoiceGender(voice) === "male"),
    unstated: voices.filter((voice) => !knownVoiceGender(voice)),
  };
}
/** True when some same-language voice exists but none is African (the temporary fallback is in use). */
export function usingFallbackVoices(voices: readonly SpeechSynthesisVoice[], language: VoiceLanguage) {
  const local = voicesForLanguage(voices, language).filter((voice) => voice.localService === true);
  return local.length > 0 && !local.some((voice) => isAfricanVoice(voice, language));
}
