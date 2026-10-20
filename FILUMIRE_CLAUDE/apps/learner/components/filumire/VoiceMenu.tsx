"use client";
import { browserVoiceId, isAfricanVoice, voiceGroups } from "../../services/browser-voices";
const copy = {
  en: { african: "African voices", other: "Other voices on this device (temporary)", female: "female", male: "male", unstated: "voice type not published", noMale: "No male voice is available on this device; only female voices are offered.", noFemale: "No female voice is available on this device; only male voices are offered.", unknown: "This device does not say whether its voices are male or female. Listen to the preview.", fallback: "This device has no African English voice yet, so FILUMIRE uses another voice on this device for now. African voices are always chosen first when available." },
  fr: { african: "Voix africaines", other: "Autres voix de cet appareil (temporaire)", female: "féminines", male: "masculines", unstated: "genre non indiqué", noMale: "Aucune voix masculine sur cet appareil ; seules des voix féminines sont proposées.", noFemale: "Aucune voix féminine sur cet appareil ; seules des voix masculines sont proposées.", unknown: "Cet appareil n’indique pas si ses voix sont masculines ou féminines. Écoute l’aperçu.", fallback: "Cet appareil n’a pas encore de voix française d’Afrique ; FILUMIRE utilise pour l’instant une autre voix de l’appareil. Les voix africaines sont toujours choisies en premier quand elles existent." },
};
/** Same-language voices (already ordered), grouped African then fallback, each split female / male / not published. */
export function VoiceOptions({ voices, language, label }: { voices: readonly SpeechSynthesisVoice[]; language: "en" | "fr"; label: (voice: SpeechSynthesisVoice) => string }) {
  const t = copy[language];
  const option = (voice: SpeechSynthesisVoice) => <option key={browserVoiceId(voice)} value={browserVoiceId(voice)} disabled={voice.localService !== true}>{label(voice)}</option>;
  const section = (name: string, items: readonly SpeechSynthesisVoice[]) => {
    const groups = voiceGroups(items);
    return <>
      {groups.female.length > 0 && <optgroup label={`${name} · ${t.female}`}>{groups.female.map(option)}</optgroup>}
      {groups.male.length > 0 && <optgroup label={`${name} · ${t.male}`}>{groups.male.map(option)}</optgroup>}
      {groups.unstated.length > 0 && <optgroup label={`${name} · ${t.unstated}`}>{groups.unstated.map(option)}</optgroup>}
    </>;
  };
  return <>
    {section(t.african, voices.filter((voice) => isAfricanVoice(voice, language)))}
    {section(t.other, voices.filter((voice) => !isAfricanVoice(voice, language)))}
  </>;
}
/** Says plainly when only one gender (or none known) is available among usable voices. */
export function voiceGenderNote(voices: readonly SpeechSynthesisVoice[], language: "en" | "fr") {
  const local = voices.filter((voice) => voice.localService === true); const groups = voiceGroups(local); const t = copy[language];
  if (!local.length) return "";
  if (!groups.female.length && !groups.male.length) return t.unknown;
  if (!groups.male.length) return t.noMale;
  if (!groups.female.length) return t.noFemale;
  return "";
}
export function fallbackVoiceNote(language: "en" | "fr") { return copy[language].fallback; }
