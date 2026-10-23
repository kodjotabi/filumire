import { subjectLabel, type FilumireSubject } from "./subjects";

/*
 * Basic 7-9 dashboard panel: mastery per subject and the next goal.
 * Read only; it shows the overview's counts (a topic counts as mastered
 * when the server marks it ready for advancement: mastery, retention and
 * transfer confirmed) and computes nothing the engine relies on.
 */
type SubjectCounts = { total: number; completed: number; started: boolean };

const GOAL_STEP = 0.25;

/* Next milestone (25 / 50 / 75 / 100 %) and topics still needed for it. */
export function nextMasteryGoal(completed: number, total: number) {
  if (total <= 0) return { targetPercent: 0, topicsNeeded: 0 };
  const share = completed / total;
  if (share >= 1) return { targetPercent: 100, topicsNeeded: 0 };
  const target = Math.min(1, (Math.floor(share / GOAL_STEP) + 1) * GOAL_STEP);
  return {
    targetPercent: Math.round(target * 100),
    topicsNeeded: Math.max(1, Math.ceil(target * total) - completed),
  };
}

const TEXT = {
  en: {
    heading: "Mastery overview",
    overall: "Overall mastery",
    mastered: "topics mastered",
    of: "of",
    goal: (n: number, pct: number) => `Next goal: master ${n} more ${n === 1 ? "topic" : "topics"} to reach ${pct}%`,
    complete: "All topics mastered",
    notStarted: "Not started",
    note: "A topic counts as mastered once you have shown it, remembered it later and used it in a new situation.",
  },
  fr: {
    heading: "Vue d’ensemble de la maîtrise",
    overall: "Maîtrise globale",
    mastered: "sujets maîtrisés",
    of: "sur",
    goal: (n: number, pct: number) => `Prochain objectif : maîtriser ${n} ${n === 1 ? "sujet" : "sujets"} de plus pour atteindre ${pct} %`,
    complete: "Tous les sujets maîtrisés",
    notStarted: "Pas commencé",
    note: "Un sujet est maîtrisé quand tu l’as montré, t’en es souvenu plus tard et l’as utilisé dans une nouvelle situation.",
  },
};

export function MasteryGoalsPanel({
  subjects,
  counts,
  language,
}: {
  subjects: readonly FilumireSubject[];
  counts: Record<string, SubjectCounts> | undefined;
  language: "en" | "fr";
}) {
  const t = TEXT[language];
  const rows = subjects.map((subject) => {
    const row = counts?.[subject.subjectId] ?? { total: 0, completed: 0, started: false };
    const percent = row.total > 0 ? Math.round((row.completed / row.total) * 100) : 0;
    return { subject, row, percent, goal: nextMasteryGoal(row.completed, row.total) };
  });
  const total = rows.reduce((sum, r) => sum + r.row.total, 0);
  const completed = rows.reduce((sum, r) => sum + r.row.completed, 0);
  const overall = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <section className="masteryPanel" aria-labelledby="mastery-panel-heading">
      <div className="masteryPanelHead">
        <h2 id="mastery-panel-heading">{t.heading}</h2>
        <div className="masteryOverall">
          <svg viewBox="0 0 36 36" width="52" height="52" aria-hidden="true">
            <circle cx="18" cy="18" r="15.5" fill="none" stroke="var(--jh-line)" strokeWidth="3.5" />
            <circle
              cx="18"
              cy="18"
              r="15.5"
              fill="none"
              stroke="var(--jh-mastery)"
              strokeWidth="3.5"
              strokeLinecap="round"
              strokeDasharray={`${(overall / 100) * 97.4} 97.4`}
              transform="rotate(-90 18 18)"
            />
          </svg>
          <span>
            <strong>{overall}%</strong>
            <small>{t.overall}</small>
          </span>
        </div>
      </div>

      <ul className="masteryRows">
        {rows.map(({ subject, row, percent, goal }) => (
          <li key={subject.subjectId} className="masteryRow" style={{ ["--accent" as string]: subject.accent }}>
            <div className="masteryRowHead">
              <strong>{subjectLabel(subject.name, language)}</strong>
              <span>
                {row.completed} {t.of} {row.total} {t.mastered}
              </span>
            </div>
            <div
              className="masteryBar"
              role="progressbar"
              aria-label={`${subjectLabel(subject.name, language)}: ${t.mastered}`}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={percent}
            >
              <span className="masteryBarFill" style={{ width: `${percent}%` }} />
              {goal.topicsNeeded > 0 && (
                <span className="masteryBarGoal" style={{ left: `${goal.targetPercent}%` }} aria-hidden="true" />
              )}
            </div>
            <p className="masteryGoal">
              {goal.topicsNeeded > 0
                ? t.goal(goal.topicsNeeded, goal.targetPercent)
                : row.total > 0
                  ? t.complete
                  : t.notStarted}
              {!row.started && goal.topicsNeeded > 0 ? ` · ${t.notStarted}` : ""}
            </p>
          </li>
        ))}
      </ul>

      <p className="masteryNote">{t.note}</p>
    </section>
  );
}
