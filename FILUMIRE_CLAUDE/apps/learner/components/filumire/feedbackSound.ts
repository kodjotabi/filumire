"use client";

import { useCallback, useEffect, useState } from "react";

/*
 * Optional answer-feedback sounds. Synthesised with the Web Audio API
 * (no audio files, nothing fetched). The learner's choice is stored on
 * this device only; when storage or audio is unavailable the page stays
 * silent and works the same.
 */
/* happy / sad: Basic 4-6. confirm / notice: quiet Basic 7-9 tones. */
export type FeedbackSoundKind = "happy" | "sad" | "confirm" | "notice";

const STORAGE_KEY = "filumire.feedbackSound";
const CHANGE_EVENT = "filumire-feedback-sound";

export function readSoundPreference(defaultOn: boolean): boolean {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return stored === null ? defaultOn : stored === "on";
  } catch {
    return defaultOn;
  }
}

export function writeSoundPreference(on: boolean) {
  try {
    window.localStorage.setItem(STORAGE_KEY, on ? "on" : "off");
  } catch {
    /* storage unavailable: the choice lasts for this page only */
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function useSoundPreference(defaultOn: boolean) {
  const [soundOn, setSoundOn] = useState(false);

  useEffect(() => {
    const sync = () => setSoundOn(readSoundPreference(defaultOn));
    sync();
    window.addEventListener(CHANGE_EVENT, sync);
    return () => window.removeEventListener(CHANGE_EVENT, sync);
  }, [defaultOn]);

  const toggle = useCallback(() => {
    const next = !soundOn;
    setSoundOn(next);
    writeSoundPreference(next);
  }, [soundOn]);

  return { soundOn, toggle };
}

let sharedContext: AudioContext | null = null;

function audioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctor =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!Ctor) return null;
  sharedContext ??= new Ctor();
  return sharedContext;
}

type Note = { freq: number; start: number; length: number; glideTo?: number };

/* happy: a bouncy rising "boing-ding"; sad: a soft falling "awww". */
const PATTERNS: Record<FeedbackSoundKind, { wave: OscillatorType; volume: number; notes: Note[] }> = {
  happy: {
    wave: "triangle",
    volume: 0.16,
    notes: [
      { freq: 523.25, start: 0, length: 0.1, glideTo: 659.25 },
      { freq: 783.99, start: 0.1, length: 0.1 },
      { freq: 1046.5, start: 0.2, length: 0.22, glideTo: 1174.66 },
    ],
  },
  sad: {
    wave: "sine",
    volume: 0.1,
    notes: [
      { freq: 392, start: 0, length: 0.22, glideTo: 349.23 },
      { freq: 329.63, start: 0.22, length: 0.4, glideTo: 261.63 },
    ],
  },
  confirm: {
    wave: "sine",
    volume: 0.06,
    notes: [
      { freq: 659.25, start: 0, length: 0.09 },
      { freq: 987.77, start: 0.08, length: 0.16 },
    ],
  },
  notice: {
    wave: "sine",
    volume: 0.05,
    notes: [{ freq: 440, start: 0, length: 0.22 }],
  },
};

export function playFeedbackSound(kind: FeedbackSoundKind) {
  const ctx = audioContext();
  if (!ctx) return;

  try {
    if (ctx.state === "suspended") void ctx.resume();
    const pattern = PATTERNS[kind];
    const now = ctx.currentTime + 0.02;

    for (const note of pattern.notes) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const start = now + note.start;
      const end = start + note.length;

      osc.type = pattern.wave;
      osc.frequency.setValueAtTime(note.freq, start);
      if (note.glideTo) {
        osc.frequency.exponentialRampToValueAtTime(note.glideTo, end);
      }

      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(pattern.volume, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, end);

      osc.connect(gain).connect(ctx.destination);
      osc.start(start);
      osc.stop(end + 0.02);
    }
  } catch {
    /* audio blocked or unsupported: feedback stays visual */
  }
}
