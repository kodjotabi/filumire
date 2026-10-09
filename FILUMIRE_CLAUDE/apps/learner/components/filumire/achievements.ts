import type { Language } from "./language";

/*
 * Achievements are derived only from the server's learning overview
 * (goals completed and subjects started). Nothing is stored or
 * awarded on the client, so a badge can never claim progress the
 * learning record does not show.
 */
export type SubjectStat = {
  total: number;
  completed: number;
  tracked: number;
};

export type Achievement = {
  id: string;
  title: string;
  description: string;
  earned: boolean;
  current: number;
  target: number;
  color: string;
};

const TEXT = {
  en: {
    first: ["First Goal", "Finish your first learning goal"],
    explorer: ["Subject Explorer", "Start learning in two subjects"],
    steady: ["Steady Learner", "Finish five learning goals"],
    allRound: ["All-Rounder", "Start learning in every subject"],
    champion: ["Subject Champion", "Finish every goal in one subject"],
  },
  fr: {
    first: ["Premier objectif", "Termine ton premier objectif"],
    explorer: ["Explorateur", "Commence deux matières"],
    steady: ["Apprenant régulier", "Termine cinq objectifs"],
    allRound: ["Touche-à-tout", "Commence toutes les matières"],
    champion: ["Champion de matière", "Termine tous les objectifs d’une matière"],
  },
} as const;

export function computeAchievements(
  subjects: ReadonlyArray<SubjectStat | undefined>,
  language: Language,
): Achievement[] {
  const t = TEXT[language];
  const rows = subjects.filter((row): row is SubjectStat => Boolean(row));
  const done = rows.reduce((sum, row) => sum + row.completed, 0);
  const started = rows.filter((row) => row.tracked > 0 || row.completed > 0).length;
  const subjectCount = rows.length;
  // The subject closest to being finished drives the champion badge.
  const closest = rows
    .filter((row) => row.total > 0)
    .sort((a, b) => b.completed / b.total - a.completed / a.total)[0];
  const championCurrent = closest?.completed ?? 0;
  const championTarget = closest?.total ?? 1;
  const bestShare = closest ? closest.completed / closest.total : 0;

  const make = (
    id: keyof typeof t,
    earned: boolean,
    current: number,
    target: number,
    color: string,
  ): Achievement => ({
    id,
    title: t[id][0],
    description: t[id][1],
    earned,
    current: Math.min(current, target),
    target,
    color,
  });

  return [
    make("first", done >= 1, done, 1, "#f5a00f"),
    make("explorer", started >= 2, started, 2, "#0b7bff"),
    make("steady", done >= 5, done, 5, "#22a85a"),
    make("allRound", subjectCount > 0 && started >= subjectCount, started, Math.max(subjectCount, 1), "#8466dc"),
    make("champion", bestShare >= 1, championCurrent, championTarget, "#e85d75"),
  ];
}
