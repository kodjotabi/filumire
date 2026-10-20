"use client";
import { useEffect, useId, useState } from "react";
import { browserVoiceId, africanLocaleHint, voicesForLanguage } from "../../services/browser-voices";
import { forgetBrowserVoicePreference, readBrowserVoicePreference, saveBrowserVoicePreference, type BrowserVoicePreference } from "../../services/voice-preference";
import { browserSpeechPlayback } from "../../services/browser-speech-playback";
import { useBrowserVoices } from "../../services/use-browser-voices";
import { ReadAloudControls } from "./ReadAloudControls";
import { REGION_LABELS } from "../../services/voice-catalogue";
const regionByTag: Record<string, keyof typeof REGION_LABELS.en> = { "en-gh": "ghana", "en-ng": "nigeria", "en-ke": "kenya" };
function regionLabel(lang: string, language: "en" | "fr") {
  const region = regionByTag[lang.toLowerCase().replaceAll("_", "-")];
  return region ? REGION_LABELS[language][region] : language === "fr" ? "Français d’Afrique" : "African French";
}
const copy = {
  en: { title: "FILUMIRE learning voice", description: "FILUMIRE reads aloud only with African voices: Ghanaian English first, then Nigerian or Kenyan English. The browser reports a voice’s region, not its gender or accent, so listen to the preview.", voice: "African English voice on this device", choose: "Choose a voice", noVoices: "This device has no Ghanaian, Nigerian or Kenyan English voice. FILUMIRE stays text-only rather than use another accent. You can add an “English (Nigeria)” or “English (Kenya)” voice in this device’s speech settings if it offers one.", unavailable: "Your saved voice is unavailable on this device or is not an African voice. Choose another; FILUMIRE never substitutes one silently.", local: "Local device voice", remote: "Not local — playback disabled", hint: "region from the device; accent not verified", saved: "Preference saved on this device only.", failed: "This preference could not be saved. Check browser storage settings.", preview: "Preview voice", forget: "Forget my voice preference", privacy: "Only voices reported as local are used. Browser voices that use a remote service remain disabled.", learner: "Choose an active learner to save a voice preference.", styles: "Expressive styles and voice gender are not exposed by this API. Use previews to find a voice you like." },
  fr: { title: "La voix d’apprentissage FILUMIRE", description: "FILUMIRE ne lit à voix haute qu’avec des voix africaines (français d’Afrique de l’Ouest en priorité). Le navigateur indique la région d’une voix, pas son genre ni son accent : écoute l’aperçu.", voice: "Voix française d’Afrique sur cet appareil", choose: "Choisir une voix", noVoices: "Cet appareil n’a pas de voix française d’Afrique. FILUMIRE reste en texte seulement plutôt que d’utiliser un autre accent.", unavailable: "Ta voix enregistrée n’est pas disponible sur cet appareil ou n’est pas une voix africaine. Choisis-en une autre ; FILUMIRE ne la remplace jamais sans te le dire.", local: "Voix locale de l’appareil", remote: "Non locale — lecture désactivée", hint: "région indiquée par l’appareil ; accent non vérifié", saved: "Préférence enregistrée sur cet appareil uniquement.", failed: "La préférence n’a pas pu être enregistrée. Vérifie les paramètres de stockage du navigateur.", preview: "Écouter un aperçu", forget: "Effacer ma préférence de voix", privacy: "Seules les voix signalées comme locales sont utilisées. Les voix utilisant un service distant restent désactivées.", learner: "Choisis un apprenant actif pour enregistrer une préférence de voix.", styles: "Cette API ne fournit pas les styles expressifs ni le genre. Écoute les aperçus pour trouver une voix qui te plaît." },
};
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
      {options.map((voice) => <option key={browserVoiceId(voice)} value={browserVoiceId(voice)} disabled={voice.localService !== true}>{voice.name} · {regionLabel(voice.lang, language)} ({voice.lang}) · {voice.localService === true ? t.local : t.remote}{africanLocaleHint(voice) ? ` · ${t.hint}` : ""}</option>)}
    </select>
    {!options.length && <p>{t.noVoices}</p>}
    {preference && !available && <p role="status">{t.unavailable}</p>}
    <h3>{t.preview}</h3>
    <ReadAloudControls learnerId={learnerId} language={language} surface="preview" text={language === "en" ? "Welcome to FILUMIRE. Let’s learn together. Compare two equal parts." : "Bienvenue dans FILUMIRE. Apprenons ensemble. Compare deux parts égales."} />
    <button type="button" disabled={!learnerId || !preference} onClick={() => { if (learnerId) { forgetBrowserVoicePreference(learnerId, language); browserSpeechPlayback.stop(); setSelected({ scope }); setStatus(null); } }}>{t.forget}</button>
    <p role="status">{status ? t[status] : ""}</p>
    <style jsx>{`.voiceSettings { padding: 20px; border-radius: 16px; background: #f7fcf9; color: #24463b; margin: 16px 0; overflow-wrap: break-word; } label { display: block; margin-top: 12px; } select { width: 100%; min-height: 44px; font: inherit; } button { min-height: 44px; padding: 10px; font: inherit; } button:disabled { opacity: .65; } :focus-visible { outline: 3px solid #277dca; outline-offset: 3px; }`}</style>
  </section>;
}
