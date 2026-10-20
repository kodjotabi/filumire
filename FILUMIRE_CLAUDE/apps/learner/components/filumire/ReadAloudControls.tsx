"use client";
import { useEffect, useId, useSyncExternalStore } from "react";
import { browserSpeechPlayback } from "../../services/browser-speech-playback";
import { browserVoiceId, isAfricanVoice, voicesForLanguage } from "../../services/browser-voices";
import { readBrowserVoicePreference, saveBrowserVoicePreference } from "../../services/voice-preference";
import { useBrowserVoices } from "../../services/use-browser-voices";
import { VoiceOptions } from "./VoiceMenu";
import type { SpeechSurface } from "../../services/voice-playback";
export const speechCopy = {
  en: { read: "Read aloud", replay: "Replay", pause: "Pause", resume: "Resume", stop: "Stop", mute: "Mute", unmute: "Unmute", speed: "Reading speed", missing: "Your preferred voice is unavailable on this device, or is not an African voice. Choose a South African, Ghanaian, Nigerian, Kenyan or Tanzanian English voice.", choose: "Choose an African English voice in your profile to read aloud.", textOnly: "Text only: this device has no African English voice (South African, Ghanaian, Nigerian, Kenyan or Tanzanian English), so FILUMIRE does not read aloud.", remote: "This voice is not confirmed as local to your device. It cannot read learning text.", error: "Audio could not play. You can retry; your learning is unchanged.", muted: "Audio is muted.", local: "Audio uses a local device voice. No accent is guaranteed." },
  fr: { read: "Écouter", replay: "Réécouter", pause: "Pause", resume: "Reprendre", stop: "Arrêter", mute: "Couper le son", unmute: "Activer le son", speed: "Vitesse de lecture", missing: "Ta voix préférée n’est pas disponible sur cet appareil, ou n’est pas une voix africaine. Choisis une voix française d’Afrique.", choose: "Choisis une voix française d’Afrique dans ton profil pour écouter.", textOnly: "Texte seulement : cet appareil n’a pas de voix française d’Afrique, donc FILUMIRE ne lit pas à voix haute.", remote: "Cette voix n’est pas confirmée comme locale à ton appareil. Elle ne peut pas lire le texte d’apprentissage.", error: "Le son n’a pas pu être lu. Tu peux réessayer ; ton apprentissage est conservé.", muted: "Le son est coupé.", local: "Le son utilise une voix locale. Le genre et l’accent ne sont pas garantis." },
};
const audioLabels = {
  en: { options: "Audio options", lesson: "Audio for this lesson", summary: "Audio for this summary", question: "Audio for this question", filu: "Audio for this FILU response", preview: "Voice preview" },
  fr: { options: "Options audio", lesson: "Audio de cette leçon", summary: "Audio de ce résumé", question: "Audio de cette question", filu: "Audio de cette réponse FILU", preview: "Aperçu de la voix" },
};
/** Receives displayed, server-sanitised text only. Never looks at assessment keys. */
export function ReadAloudControls({ learnerId, text, language, surface }: { learnerId?: string; text: string; language: "en" | "fr"; surface: SpeechSurface }) {
  const id = useId(); const owner = `${learnerId ?? ""}:${surface}:${id}`;
  const t = speechCopy[language];
  const { voices, revision } = useBrowserVoices();
  const state = useSyncExternalStore(browserSpeechPlayback.subscribe, browserSpeechPlayback.snapshot, browserSpeechPlayback.serverSnapshot);
  const preference = learnerId && revision > 0 ? readBrowserVoicePreference(learnerId, language) : undefined;
  const voice = preference && voices.find((item) => browserVoiceId(item) === preference.voiceId && isAfricanVoice(item, language));
  const localVoices = voicesForLanguage(voices, language).filter((item) => item.localService === true);
  const active = state.owner === owner && (state.status === "speaking" || state.status === "paused");
  useEffect(() => () => { if (browserSpeechPlayback.snapshot().owner === owner) browserSpeechPlayback.stop(); }, [owner, text, language, preference?.voiceId, preference?.rate, preference?.muted]);
  // Preference changes (including another tab) must immediately silence muted audio.
  useEffect(() => { if (active && (preference?.muted || !voice || voice.localService !== true)) browserSpeechPlayback.stop(); }, [preference?.muted, active, voice]);
  if (!learnerId || !text.trim()) return null;
  // Owner policy: African voices only. Without one, the lesson stays text-only.
  if (!localVoices.length) return <p className="readAloudTextOnly" lang={language} role="note">{t.textOnly}<style jsx>{`.readAloudTextOnly { font-size: 14px; margin: 8px 0; color: #4a6358; }`}</style></p>;
  const enabled = Boolean(voice?.localService === true && !preference?.muted);
  function update(rate: number, muted: boolean) {
    browserSpeechPlayback.stop();
    if (learnerId && preference) saveBrowserVoicePreference(learnerId, { ...preference, rate, muted });
  }
  function chooseVoice(voiceId: string) {
    if (!learnerId || !localVoices.some((item) => browserVoiceId(item) === voiceId)) return;
    browserSpeechPlayback.stop();
    saveBrowserVoicePreference(learnerId, { voiceId, language, rate: preference?.rate ?? 1, muted: preference?.muted ?? false });
  }
  return <div className="readAloud" role="group" aria-label={audioLabels[language][surface]} lang={language}>
    {surface !== "preview" && <label htmlFor={`${id}-voice`}>{language === "fr" ? "Voix de lecture" : "Reading voice"}
      <select id={`${id}-voice`} value={voice?.localService === true ? preference?.voiceId : ""} disabled={!localVoices.length} onChange={(event) => chooseVoice(event.target.value)}>
        <option value="" disabled>{language === "fr" ? "Choisis une voix africaine" : "Choose an African voice"}</option>
        <VoiceOptions voices={localVoices} language={language} label={(item) => `${item.name} (${item.lang})`} />
      </select>
    </label>}
    <button type="button" disabled={!enabled} onClick={() => void browserSpeechPlayback.read(learnerId, text, language, owner).catch(() => {})}>{active ? t.replay : t.read}</button>
    {active && <><button type="button" onClick={state.status === "paused" ? browserSpeechPlayback.resume : browserSpeechPlayback.pause}>{state.status === "paused" ? t.resume : t.pause}</button>
    <button type="button" onClick={browserSpeechPlayback.stop}>{t.stop}</button></>}
    <details><summary>{audioLabels[language].options}</summary><div className="audioOptions">
      <button type="button" disabled={!preference} aria-pressed={preference?.muted ?? false} onClick={() => update(preference?.rate ?? 1, !preference?.muted)}>{preference?.muted ? t.unmute : t.mute}</button>
      <label htmlFor={`${id}-speed`}>{t.speed}<select id={`${id}-speed`} value={preference?.rate ?? 1} disabled={!preference} onChange={(event) => update(Number(event.target.value), preference?.muted ?? false)}>{[0.5, 0.75, 1, 1.25, 1.5].map((rate) => <option key={rate} value={rate}>{rate}×</option>)}</select></label>
    </div></details>
    <p role="status">{!preference ? (language === "fr" ? "Choisis une voix ci-dessus pour écouter." : "Choose a voice above to read aloud.") : !voice ? t.missing : voice.localService !== true ? t.remote : preference.muted ? t.muted : state.owner === owner && state.status === "error" ? t.error : ""}</p>
    <style jsx>{`.readAloud { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; margin: 12px 0; } button, select { min-height: 44px; font: inherit; padding: 8px; border: 1px solid #b5d4c5; border-radius: 8px; background: #f7fcf9; color: #24463b; } button:disabled { opacity: .6; } label { display: flex; align-items: center; gap: 8px; } p { flex-basis: 100%; font-size: 14px; margin: 0; } :focus-visible { outline: 3px solid #277dca; outline-offset: 3px; }`}</style>
  </div>;
}
