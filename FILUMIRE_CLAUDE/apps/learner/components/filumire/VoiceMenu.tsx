"use client";
import { browserVoiceId, voiceGroups } from "../../services/browser-voices";
const copy = {
  en: { female: "Female voices", male: "Male voices", unstated: "Voice type not published", noMale: "No male African English voice is available on this device; only female voices are offered.", noFemale: "No female African English voice is available on this device; only male voices are offered.", unknown: "This device does not say whether its African voices are male or female. Listen to the preview." },
  fr: { female: "Voix féminines", male: "Voix masculines", unstated: "Genre non indiqué", noMale: "Aucune voix masculine française d’Afrique sur cet appareil ; seules des voix féminines sont proposées.", noFemale: "Aucune voix féminine française d’Afrique sur cet appareil ; seules des voix masculines sont proposées.", unknown: "Cet appareil n’indique pas si ses voix africaines sont masculines ou féminines. Écoute l’aperçu." },
};
/** African voices only (already filtered), grouped female / male / not published. */
export function VoiceOptions({ voices, language, label }: { voices: readonly SpeechSynthesisVoice[]; language: "en" | "fr"; label: (voice: SpeechSynthesisVoice) => string }) {
  const t = copy[language]; const groups = voiceGroups(voices);
  const option = (voice: SpeechSynthesisVoice) => <option key={browserVoiceId(voice)} value={browserVoiceId(voice)} disabled={voice.localService !== true}>{label(voice)}</option>;
  return <>
    {groups.female.length > 0 && <optgroup label={t.female}>{groups.female.map(option)}</optgroup>}
    {groups.male.length > 0 && <optgroup label={t.male}>{groups.male.map(option)}</optgroup>}
    {groups.unstated.length > 0 && <optgroup label={t.unstated}>{groups.unstated.map(option)}</optgroup>}
  </>;
}
/** Says plainly when only one gender (or none known) is available among usable voices. */
export function voiceGenderNote(voices: readonly SpeechSynthesisVoice[], language: "en" | "fr") {
  const groups = voiceGroups(voices.filter((voice) => voice.localService === true)); const t = copy[language];
  if (!voices.some((voice) => voice.localService === true)) return "";
  if (!groups.female.length && !groups.male.length) return t.unknown;
  if (!groups.male.length) return t.noMale;
  if (!groups.female.length) return t.noFemale;
  return "";
}
