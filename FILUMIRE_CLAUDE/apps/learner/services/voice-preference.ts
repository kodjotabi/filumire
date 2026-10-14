import { AFRICAN_VOICES, type VoiceStyle } from "./voice-catalogue";
import type { VoiceLanguage } from "./voice-catalogue";
export interface VoicePreference { voiceId: string; style: VoiceStyle }
const PREFIX = "filumire.voice.v1.";
function key(learnerId: string) { return PREFIX + encodeURIComponent(learnerId); }
export function validateVoicePreference(value: unknown): VoicePreference | undefined {
  if (!value || typeof value !== "object") return;
  const { voiceId, style } = value as Partial<VoicePreference>;
  const voice = AFRICAN_VOICES.find((item) => item.id === voiceId);
  if (!voice || !style || (style !== "neutral" && !voice.styles.includes(style))) return;
  return { voiceId: voice.id, style };
}
export function readVoicePreference(learnerId: string): VoicePreference | undefined {
  if (!learnerId) return;
  try {
    const raw = window.localStorage.getItem(key(learnerId));
    if (!raw || raw.length > 500) return;
    return validateVoicePreference(JSON.parse(raw));
  } catch { return; }
}
/** Only catalogue ID and style; no name, age, recordings, speech text or voice inventory. */
export function saveVoicePreference(learnerId: string, preference: VoicePreference): boolean {
  const safe = validateVoicePreference(preference);
  if (!learnerId || !safe) return false;
  try {
    window.localStorage.setItem(key(learnerId), JSON.stringify(safe));
    window.dispatchEvent(new Event("filumire-voice"));
    return true;
  } catch { return false; }
}
export function forgetVoicePreference(learnerId: string): void {
  try { window.localStorage.removeItem(key(learnerId)); } catch { /* optional storage */ }
}

export interface BrowserVoicePreference { voiceId: string; language: VoiceLanguage; rate: number; muted: boolean }
const BROWSER_PREFIX = "filumire.browserVoice.v2.";
const temporaryPreferences = new Map<string, BrowserVoicePreference>();
function announceBrowserPreference() { try { window.dispatchEvent(new Event("filumire-voice")); } catch { /* SSR/storage unavailable */ } }
function browserKey(learnerId: string, language: VoiceLanguage) { return BROWSER_PREFIX + encodeURIComponent(learnerId) + "." + language; }
export function validateBrowserPreference(value: unknown, language: VoiceLanguage): BrowserVoicePreference | undefined {
  if (!value || typeof value !== "object") return;
  const item = value as Partial<BrowserVoicePreference>;
  if (item.language !== language || typeof item.voiceId !== "string" || item.voiceId.length > 2000 || !Number.isFinite(item.rate) || item.rate! < 0.5 || item.rate! > 1.5 || typeof item.muted !== "boolean") return;
  try { const identity: unknown = JSON.parse(item.voiceId); if (!Array.isArray(identity) || identity.length !== 3 || identity.some((field) => typeof field !== "string")) return; } catch { return; }
  return { voiceId: item.voiceId, language, rate: item.rate!, muted: item.muted };
}
export function readBrowserVoicePreference(learnerId: string, language: VoiceLanguage): BrowserVoicePreference | undefined {
  if (!learnerId) return;
  if (typeof window !== "undefined" && temporaryPreferences.has(browserKey(learnerId, language))) return temporaryPreferences.get(browserKey(learnerId, language));
  try { const raw = window.localStorage.getItem(browserKey(learnerId, language)); return raw && raw.length <= 2500 ? validateBrowserPreference(JSON.parse(raw), language) : undefined; } catch { return; }
}
export function saveBrowserVoicePreference(learnerId: string, preference: BrowserVoicePreference): boolean {
  const safe = validateBrowserPreference(preference, preference.language);
  if (!learnerId || !safe) return false;
  const itemKey = browserKey(learnerId, safe.language);
  try { window.localStorage.setItem(itemKey, JSON.stringify(safe)); temporaryPreferences.delete(itemKey); announceBrowserPreference(); return true; }
  catch {
    if (typeof window !== "undefined") {
      if (temporaryPreferences.size >= 100) temporaryPreferences.clear();
      temporaryPreferences.set(itemKey, safe); announceBrowserPreference();
    }
    return false;
  }
}
export function forgetBrowserVoicePreference(learnerId: string, language: VoiceLanguage) {
  temporaryPreferences.delete(browserKey(learnerId, language));
  try { window.localStorage.removeItem(browserKey(learnerId, language)); } catch { /* optional storage */ }
  announceBrowserPreference();
}
