import { AFRICAN_VOICES, type LearningVoice, type VoiceLanguage } from "./voice-catalogue";
import { type VoicePreference } from "./voice-preference";
import { browserSpeechPlayback } from "./browser-speech-playback";
export type SpeechSurface = "lesson" | "summary" | "question" | "filu" | "preview";
export interface VoiceAdapter {
  id: string;
  // External speech adapters are excluded by the revised browser-only strategy.
  privacy: "local-only";
  play(request: { text: string; voice: LearningVoice; style: VoicePreference["style"]; signal: AbortSignal }): Promise<void>;
  stop(): void;
}
export class VoicePlaybackError extends Error {}
export class LearningVoicePlayback {
  private active?: { adapter: VoiceAdapter; controller: AbortController };
  constructor(private catalogue: readonly LearningVoice[] = AFRICAN_VOICES, private adapters: readonly VoiceAdapter[] = []) {}
  stop() {
    const current = this.active; this.active = undefined;
    current?.controller.abort();
    try { current?.adapter.stop(); } catch { /* audio failure must never block logout/navigation */ }
  }
  async play(request: { preference: VoicePreference; text: string; language: VoiceLanguage; surface: SpeechSurface }) {
    this.stop();
    const voice = this.catalogue.find((item) => item.id === request.preference.voiceId);
    if (!voice || voice.status !== "verified" || !voice.verification?.evidence || !voice.verification.rights || !voice.engineId) throw new VoicePlaybackError("voice_unavailable");
    if (voice.language !== request.language) throw new VoicePlaybackError("language_unavailable");
    if (!voice.styles.includes(request.preference.style)) throw new VoicePlaybackError("style_unavailable");
    if (!request.text.trim() || request.text.length > 12000) throw new VoicePlaybackError("invalid_text");
    const adapter = this.adapters.find((item) => item.id === voice.engineId);
    if (!adapter) throw new VoicePlaybackError("engine_unavailable");
    const controller = new AbortController();
    const current = { adapter, controller }; this.active = current;
    try { await adapter.play({ text: request.text, voice, style: request.preference.style, signal: controller.signal }); }
    catch { throw new VoicePlaybackError(controller.signal.aborted ? "playback_cancelled" : "playback_failed"); }
    finally { if (this.active === current) this.active = undefined; }
  }
}
// All live learning surfaces share the browser-only controller; no legacy adapter is installed.
export const learningVoicePlayback = browserSpeechPlayback;
/** Shared entry point for every learning surface; never accepts hidden answer keys. */
export async function readLearningText(learnerId: string, text: string, language: VoiceLanguage, surface: SpeechSurface) {
  return learningVoicePlayback.read(learnerId, text, language, `${learnerId}:${surface}`);
}
