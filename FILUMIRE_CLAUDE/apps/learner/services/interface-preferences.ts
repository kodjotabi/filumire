"use client";
import { useEffect, useState } from "react";

// "system" is kept only so older saved choices still parse; it now means light.
export type Appearance = "light" | "dark" | "system";
export type InterfacePreferences = { appearance: Appearance; progressNotices: boolean; achievementNotices: boolean };
export const DEFAULT_INTERFACE_PREFERENCES: InterfacePreferences = { appearance: "light", progressNotices: true, achievementNotices: true };
export const INTERFACE_PREFERENCE_EVENT = "filumire-interface-preferences";
export function interfacePreferenceKey(learnerId: string) { return `filumire.interface.v1.${encodeURIComponent(learnerId)}`; }
export function readInterfacePreferences(learnerId?: string): InterfacePreferences {
  if (!learnerId || typeof window === "undefined") return { ...DEFAULT_INTERFACE_PREFERENCES };
  try {
    const raw = window.localStorage.getItem(interfacePreferenceKey(learnerId));
    if (!raw || raw.length > 500) return { ...DEFAULT_INTERFACE_PREFERENCES };
    const value = JSON.parse(raw);
    return {
      appearance: value?.appearance === "dark" ? "dark" : "light",
      progressNotices: typeof value?.progressNotices === "boolean" ? value.progressNotices : true,
      achievementNotices: typeof value?.achievementNotices === "boolean" ? value.achievementNotices : true,
    };
  } catch { return { ...DEFAULT_INTERFACE_PREFERENCES }; }
}
export function saveInterfacePreferences(learnerId: string, preferences: InterfacePreferences): boolean {
  try {
    window.localStorage.setItem(interfacePreferenceKey(learnerId), JSON.stringify(preferences));
    window.dispatchEvent(new Event(INTERFACE_PREFERENCE_EVENT));
    return true;
  } catch { return false; }
}
export function useInterfacePreferences(learnerId?: string) {
  const [saved, setSaved] = useState<{ scope?: string; value: InterfacePreferences }>({ value: DEFAULT_INTERFACE_PREFERENCES });
  useEffect(() => {
    const refresh = () => setSaved({ scope: learnerId, value: readInterfacePreferences(learnerId) });
    refresh();
    window.addEventListener(INTERFACE_PREFERENCE_EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => { window.removeEventListener(INTERFACE_PREFERENCE_EVENT, refresh); window.removeEventListener("storage", refresh); };
  }, [learnerId]);
  return saved.scope === learnerId ? saved.value : DEFAULT_INTERFACE_PREFERENCES;
}
/*
 * FILUMIRE's learning screens are white whatever the device's dark-mode
 * setting (owner decision 2026-10-20). The dark theme is used only when a
 * learner chooses it in Additional settings.
 */
export function useLearnerAppearance(learnerId?: string): "light" | "dark" {
  const { appearance } = useInterfacePreferences(learnerId);
  // No preferences of a previous learner are applied while switching accounts.
  return learnerId && appearance === "dark" ? "dark" : "light";
}
