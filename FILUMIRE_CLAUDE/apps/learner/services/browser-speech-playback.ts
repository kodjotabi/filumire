import { browserVoiceId, installedVoices, speechEngine, voiceMatchesLanguage } from "./browser-voices";
import { readBrowserVoicePreference, type BrowserVoicePreference } from "./voice-preference";
import type { VoiceLanguage } from "./voice-catalogue";
export interface PlaybackState { status: "idle" | "speaking" | "paused" | "error"; owner?: string; error?: string }
const IDLE: PlaybackState = { status: "idle" };
export class BrowserSpeechPlayback {
  private current?: { utterance: SpeechSynthesisUtterance; settle: () => void; reject: (error: Error) => void; timer: ReturnType<typeof setTimeout> };
  private state: PlaybackState = IDLE;
  private listeners = new Set<() => void>();
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  snapshot = () => this.state;
  serverSnapshot = () => IDLE;
  private publish(state: PlaybackState) { this.state = state; this.listeners.forEach((listener) => listener()); }
  stop = () => {
    const current = this.current; this.current = undefined;
    if (current) { clearTimeout(current.timer); current.utterance.onend = null; current.utterance.onerror = null; current.settle(); }
    try { speechEngine()?.cancel(); } catch { /* never block learning/logout */ }
    this.publish(IDLE);
  };
  pause = () => { if (!this.current || this.state.status !== "speaking") return; try { speechEngine()?.pause(); this.publish({ ...this.state, status: "paused" }); } catch { this.fail("playback_failed"); } };
  resume = () => { if (!this.current || this.state.status !== "paused") return; try { speechEngine()?.resume(); this.publish({ ...this.state, status: "speaking" }); } catch { this.fail("playback_failed"); } };
  private fail(error: string, owner = this.state.owner) { this.current?.reject(new Error(error)); this.stop(); this.publish({ status: "error", owner, error }); }
  async play({ preference, text, language, owner }: { preference: BrowserVoicePreference; text: string; language: VoiceLanguage; owner: string }): Promise<void> {
    this.stop();
    const reject = (error: string) => { this.publish({ status: "error", owner, error }); throw new Error(error); };
    if (preference.muted) return reject("muted");
    if (preference.language !== language || !Number.isFinite(preference.rate) || preference.rate < 0.5 || preference.rate > 1.5) return reject("language_unavailable");
    const engine = speechEngine();
    if (!engine || typeof SpeechSynthesisUtterance === "undefined") return reject("speech_unavailable");
    const voice = installedVoices().find((item) => browserVoiceId(item) === preference.voiceId);
    if (!voice) return reject("voice_unavailable");
    if (!voiceMatchesLanguage(voice, language)) return reject("language_unavailable");
    // Browser-library voices can also be remote. No child text may be sent to them.
    if (voice.localService !== true) return reject("remote_voice_blocked");
    if (!text.trim() || text.length > 12000) return reject("invalid_text");
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.voice = voice; utterance.lang = voice.lang; utterance.rate = preference.rate; utterance.volume = 1;
    return new Promise<void>((resolve, rejectPromise) => {
      const current = { utterance, settle: resolve, reject: rejectPromise, timer: setTimeout(() => {
        if (this.current !== current) return; this.fail("playback_timeout", owner); rejectPromise(new Error("playback_timeout"));
      }, 300000) };
      this.current = current;
      utterance.onend = () => { if (this.current !== current) return; clearTimeout(current.timer); this.current = undefined; this.publish(IDLE); resolve(); };
      utterance.onerror = () => { if (this.current !== current) return; this.fail("playback_failed", owner); rejectPromise(new Error("playback_failed")); };
      this.publish({ status: "speaking", owner });
      try { engine.resume(); engine.speak(utterance); } catch { if (this.current === current) { this.fail("playback_failed", owner); rejectPromise(new Error("playback_failed")); } }
    });
  }
  async read(learnerId: string, text: string, language: VoiceLanguage, owner: string) {
    const preference = readBrowserVoicePreference(learnerId, language);
    if (!preference) { this.fail("voice_not_selected", owner); throw new Error("voice_not_selected"); }
    return this.play({ preference, text, language, owner });
  }
}
export const browserSpeechPlayback = new BrowserSpeechPlayback();
