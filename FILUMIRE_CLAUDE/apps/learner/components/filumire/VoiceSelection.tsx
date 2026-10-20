"use client";
import { useEffect, useId, useState } from "react";
import { browserVoiceId, africanLocaleHint, knownVoiceGender, voicesForLanguage } from "../../services/browser-voices";
import { VoiceOptions, voiceGenderNote } from "./VoiceMenu";
import { forgetBrowserVoicePreference, readBrowserVoicePreference, saveBrowserVoicePreference, type BrowserVoicePreference } from "../../services/voice-preference";
import { browserSpeechPlayback } from "../../services/browser-speech-playback";
import { useBrowserVoices } from "../../services/use-browser-voices";
import { ReadAloudControls } from "./ReadAloudControls";
import { REGION_LABELS } from "../../services/voice-catalogue";
const regionByTag: Record<string, keyof typeof REGION_LABELS.en> = { "en-za": "south-africa", "en-gh": "ghana", "en-ng": "nigeria", "en-ke": "kenya" };
function regionLabel(lang: string, language: "en" | "fr") {
  const tag = lang.toLowerCase().replaceAll("_", "-"); const region = regionByTag[tag];
  if (region) return REGION_LABELS[language][region];
  const french = tag.startsWith("fr");
  return language === "fr" ? (french ? "Français d’Afrique" : "Anglais d’Afrique") : french ? "African French" : "African English";
}
const copy = {
  en: { title: "FILUMIRE learning voice", description: "FILUMIRE reads aloud only with African voices: South African English first (Tessa where available), then Ghanaian, Nigerian, Kenyan or Tanzanian English. The browser reports a voice’s region, not its accent, so listen to the preview.", voice: "African English voice on this device", choose: "Choose a voice", noVoices: "Text only: this device has no African English voice (South African, Ghanaian, Nigerian, Kenyan or Tanzanian English). FILUMIRE stays text-only rather than use another accent. You can add an “English (South Africa)” voice such as Tessa in this device’s speech settings if it offers one.", unavailable: "Your saved voice is unavailable on this device or is not an African voice. Choose another; FILUMIRE never substitutes one silently.", local: "Local device voice", remote: "Not local — playback disabled", hint: "region from the device; accent not verified", saved: "Preference saved on this device only.", failed: "This preference could not be saved. Check browser storage settings.", preview: "Preview voice", forget: "Forget my voice preference", privacy: "Only voices reported as local are used. Browser voices that use a remote service remain disabled.", learner: "Choose an active learner to save a voice preference.", styles: "Expressive styles are not exposed by this API. Voices are marked female or male only when the voice maker publishes it." },
  fr: { title: "La voix d’apprentissage FILUMIRE", description: "FILUMIRE ne lit à voix haute qu’avec des voix africaines (français d’Afrique de l’Ouest en priorité). Le navigateur indique la région d’une voix, pas son genre ni son accent : écoute l’aperçu.", voice: "Voix française d’Afrique sur cet appareil", choose: "Choisir une voix", noVoices: "Texte seulement : cet appareil n’a pas de voix française d’Afrique. FILUMIRE reste en texte seulement plutôt que d’utiliser un autre accent.", unavailable: "Ta voix enregistrée n’est pas disponible sur cet appareil ou n’est pas une voix africaine. Choisis-en une autre ; FILUMIRE ne la remplace jamais sans te le dire.", local: "Voix locale de l’appareil", remote: "Non locale — lecture désactivée", hint: "région indiquée par l’appareil ; accent non vérifié", saved: "Préférence enregistrée sur cet appareil uniquement.", failed: "La préférence n’a pas pu être enregistrée. Vérifie les paramètres de stockage du navigateur.", preview: "Écouter un aperçu", forget: "Effacer ma préférence de voix", privacy: "Seules les voix signalées comme locales sont utilisées. Les voix utilisant un service distant restent désactivées.", learner: "Choisis un apprenant actif pour enregistrer une préférence de voix.", styles: "Cette API ne fournit pas les styles expressifs. Une voix est indiquée féminine ou masculine seulement quand son éditeur le publie." },
};
function genderLabel(voice: SpeechSynthesisVoice, language: "en" | "fr") {
  const gender = knownVoiceGender(voice);
  return !gender ? "" : language === "fr" ? (gender === "female" ? " (féminine)" : " (masculine)") : gender === "female" ? " (female)" : " (male)";
}
export function VoiceSelection({ learnerId, language }: { learnerId?: string; language: "en" | "fr" }) {
  const t = copy[language]; const id = useId(); const scope = `${learnerId ?? ""}:${language}`;
  const { voices, revision } = useBrowserVoices();
  const [selected, setSelected] = useState<{ scope: string; preference?: BrowserVoicePreference }>({ scope: "" });
  const [status, setStatus] = useState<"saved" | "failed" | null>(null);
  const preference = selected.scope === scope ? selected.preference : undefined;
  const options = voicesForLanguage(voices, language);
  const available = options.some((voice) => browserVoiceId(voice) === preference?.voiceId);
  useEffect(() => {
    setSelected({ scope, preference: learnerId ? readBrowserVoicePreference(learnerId, language) : undefined });
  }, [learnerId, language, scope, revision]);
  useEffect(() => { setStatus(null); browserSpeechPlayback.stop(); return () => browserSpeechPlayback.stop(); }, [scope]);
  function choose(voiceId: string) {
    if (!learnerId || !voiceId) return;
    browserSpeechPlayback.stop();
    const next = { voiceId, language, rate: preference?.rate ?? 1, muted: preference?.muted ?? false };
    setSelected({ scope, preference: next }); setStatus(saveBrowserVoicePreference(learnerId, next) ? "saved" : "failed");
  }
  return <section className="voiceSettings" lang={language} aria-labelledby={`${id}-title`}>
    <h2 id={`${id}-title`}>{language === "en" ? "FILUMIRE Learning Voice" : t.title}</h2><p>{t.description}</p><p>{t.privacy}</p>
    {!learnerId && <p>{t.learner}</p>}
    <label htmlFor={`${id}-voice`}>{t.voice}</label>
    <select id={`${id}-voice`} disabled={!learnerId} value={preference?.voiceId ?? ""} onChange={(event) => choose(event.target.value)}>
      <option value="">{t.choose}</option>
      {preference && !available && <option value={preference.voiceId}>{t.unavailable}</option>}
      <VoiceOptions voices={options} language={language} label={(voice) => `${voice.name}${genderLabel(voice, language)} · ${regionLabel(voice.lang, language)} (${voice.lang}) · ${voice.localService === true ? t.local : t.remote}${africanLocaleHint(voice) ? ` · ${t.hint}` : ""}`} />
    </select>
    {!options.length && <p role="note">{t.noVoices}</p>}
    {voiceGenderNote(options, language) && <p role="note">{voiceGenderNote(options, language)}</p>}
    <p>{t.styles}</p>
    {preference && !available && <p role="status">{t.unavailable}</p>}
    <h3>{t.preview}</h3>
    <ReadAloudControls learnerId={learnerId} language={language} surface="preview" text={language === "en" ? "Welcome to FILUMIRE. Let’s learn together. Compare two equal parts." : "Bienvenue dans FILUMIRE. Apprenons ensemble. Compare deux parts égales."} />
    <button type="button" disabled={!learnerId || !preference} onClick={() => { if (learnerId) { forgetBrowserVoicePreference(learnerId, language); browserSpeechPlayback.stop(); setSelected({ scope }); setStatus(null); } }}>{t.forget}</button>
    <p role="status">{status ? t[status] : ""}</p>
    <style jsx>{`.voiceSettings { padding: 20px; border-radius: 16px; background: #f7fcf9; color: #24463b; margin: 16px 0; overflow-wrap: break-word; } label { display: block; margin-top: 12px; } select { width: 100%; min-height: 44px; font: inherit; } button { min-height: 44px; padding: 10px; font: inherit; } button:disabled { opacity: .65; } :focus-visible { outline: 3px solid #277dca; outline-offset: 3px; }`}</style>
  </section>;
}
