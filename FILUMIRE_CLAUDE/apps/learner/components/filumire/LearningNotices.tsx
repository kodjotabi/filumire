"use client";
import { useEffect, useRef, useState } from "react";
import { useInterfacePreferences } from "../../services/interface-preferences";
import type { Language } from "./language";
export function LearningNotices({ learnerId, completed, achievements = "", language }: { learnerId?: string; completed?: number; achievements?: string; language: Language }) {
  const preferences = useInterfacePreferences(learnerId);
  const previous = useRef<{ learnerId?: string; completed?: number; achievements: string }>({ achievements: "" });
  const [notice, setNotice] = useState<{ learnerId: string; kind: "progress" | "achievement" } | null>(null);
  useEffect(() => {
    if (!learnerId || completed === undefined) return;
    const last = previous.current;
    if (last.learnerId === learnerId && last.completed !== undefined) {
      if (preferences.achievementNotices && achievements.split(",").some(id => id && !last.achievements.split(",").includes(id))) setNotice({ learnerId, kind: "achievement" });
      else if (preferences.progressNotices && completed > last.completed) setNotice({ learnerId, kind: "progress" });
    }
    previous.current = { learnerId, completed, achievements };
  }, [learnerId, completed, achievements, preferences.achievementNotices, preferences.progressNotices]);
  const enabled = notice?.kind === "achievement" ? preferences.achievementNotices : preferences.progressNotices;
  useEffect(() => { if (!enabled) setNotice(null); }, [enabled]);
  if (!notice || notice.learnerId !== learnerId || !enabled) return null;
  return <aside className="learningNotice" role="status">
    <p>{language === "fr" ? (notice.kind === "achievement" ? "Tu as obtenu une nouvelle réussite. Consulte ta progression !" : "Ta progression a été mise à jour. Continue comme ça !") : (notice.kind === "achievement" ? "You earned a new achievement. Check your progress!" : "Your learning progress has been updated. Keep going!")}</p>
    <button type="button" onClick={() => setNotice(null)}>{language === "fr" ? "Fermer" : "Dismiss"}</button>
  </aside>;
}
