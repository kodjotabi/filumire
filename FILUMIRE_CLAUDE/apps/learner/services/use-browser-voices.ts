"use client";
import { useEffect, useState } from "react";
import { installedVoices, speechEngine } from "./browser-voices";
// One native event listener shared by the learning controls and profile.
const listeners = new Set<() => void>();
let engine: SpeechSynthesis | undefined;
function changed() { listeners.forEach((listener) => listener()); }
export function useBrowserVoices() {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const update = () => { setVoices(installedVoices()); setRevision((value) => value + 1); };
    if (!listeners.size) { engine = speechEngine(); engine?.addEventListener("voiceschanged", changed); }
    listeners.add(update); update();
    window.addEventListener("filumire-voice", update);
    const storageChanged = (event: StorageEvent) => { if (event.key === null || event.key?.startsWith("filumire.browserVoice.v2.")) update(); };
    window.addEventListener("storage", storageChanged);
    const timer = setTimeout(update, 500); // Some engines populate asynchronously without an event.
    return () => { clearTimeout(timer); listeners.delete(update); window.removeEventListener("filumire-voice", update); window.removeEventListener("storage", storageChanged); if (!listeners.size) { engine?.removeEventListener("voiceschanged", changed); engine = undefined; } };
  }, []);
  return { voices, revision };
}
