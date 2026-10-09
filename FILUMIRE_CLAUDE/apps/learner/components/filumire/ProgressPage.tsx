"use client";

import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";

import type { LearningOverview } from "../../services/learning-client";
import { subjectLabel, toFilumireSubjects } from "./subjects";

type ProgressPageProps = {
  language: "en" | "fr";
  overview: LearningOverview | null;
  renderIcon: (key: string) => ReactNode;
};

const COLORS: Record<string, string> = {
  english: "#0b7bff",
  mathematics: "#f59e0b",
  science: "#22a85a",
  computing: "#7c5ce0",
};

const TEXT = {
  en: {
    title: "My Progress",
    intro: "You’re learning and making great progress!",
    note: ["Small steps", "make big", "progress!"],
    overall: "Overall Progress",
    across: "Across all subjects",
    onTrack: "You’re on track. Keep going!",
    subjects: "Your Subjects",
    viewAll: "View all learning",
    good: "Doing Well",
    learning: "Learning",
    fresh: "Not started",
    growing: "You’re growing!",
    growingBody:
      "Every goal you finish adds to your progress. Keep exploring!",
    growNote: ["Progress", "today,", "brighter", "tomorrow!"],
    strengths: "Your Strengths",
    strengthsSub: "You’re doing especially well in:",
    keepUp: "Keep it up!",
    noStrengths: "Finish a learning goal to see your strengths here.",
    noFocus: "Start a subject to see what to practise next.",
    focus: "Areas to Focus",
    focusSub: "Keep practising these areas:",
    youCan: "You can do it!",
    quote:
      "Every time you practise, you get a little better. Your effort makes a real difference!",
  },
  fr: {
    title: "Mes progrès",
    intro: "Tu apprends et tu progresses bien !",
    note: ["Petits pas,", "grands", "progrès !"],
    overall: "Progression globale",
    across: "Dans toutes les matières",
    onTrack: "Tu es sur la bonne voie. Continue !",
    subjects: "Tes matières",
    viewAll: "Voir tout",
    good: "Bien parti",
    learning: "En cours",
    fresh: "Pas commencé",
    growing: "Tu grandis !",
    growingBody:
      "Chaque objectif terminé fait avancer ta progression. Continue d’explorer !",
    growNote: ["Progresser", "aujourd’hui,", "demain sera", "plus beau !"],
    strengths: "Tes points forts",
    strengthsSub: "Tu réussis surtout en :",
    keepUp: "Continue !",
    noStrengths: "Termine un objectif pour voir tes points forts ici.",
    noFocus: "Commence une matière pour voir quoi travailler.",
    focus: "À travailler",
    focusSub: "Continue à t’entraîner en :",
    youCan: "Tu peux le faire !",
    quote:
      "Chaque fois que tu t’entraînes, tu t’améliores un peu. Ton effort compte vraiment !",
  },
} as const;

export function ProgressPage({
  language,
  overview,
  renderIcon,
}: ProgressPageProps) {
  const t = TEXT[language];

  const rows = toFilumireSubjects(overview?.availableSubjects).map((subject) => {
    const stats = overview?.subjects[subject.subjectId];
    const total = stats?.total ?? 0;
    const done = stats?.completed ?? 0;
    const started = (stats?.tracked ?? 0) > 0 || done > 0;
    const percent = total > 0 ? Math.round((done / total) * 100) : 0;
    const tone = (percent >= 60 ? "good" : started ? "learning" : "fresh") as
      | "good"
      | "learning"
      | "fresh";
    return { subject, total, done, percent, tone };
  });

  const totalAll = rows.reduce((sum, row) => sum + row.total, 0);
  const doneAll = rows.reduce((sum, row) => sum + row.done, 0);
  const overall = totalAll > 0 ? Math.round((doneAll / totalAll) * 100) : 0;

  // Only real evidence: a strength needs a completed goal, a focus area
  // needs a started subject. Untouched subjects at 0% are neither.
  const strengths = rows
    .filter((row) => row.done > 0)
    .sort((a, b) => b.percent - a.percent)
    .slice(0, 2);
  const focus = rows
    .filter(
      (row) =>
        row.tone === "learning" &&
        !strengths.some((s) => s.subject.key === row.subject.key),
    )
    .sort((a, b) => a.percent - b.percent)
    .slice(0, 2);

  return (
    <div className="progressPage">
      <section className="pHero">
        <h1>{t.title}</h1>
        <p>{t.intro}</p>
        <span className="pBubble" aria-hidden="true">
          {t.note.map((line) => (
            <span key={line}>{line}</span>
          ))}
        </span>
        <img src="/images/home/boy-continue.png" alt="" />
      </section>

      <section className="pOverall">
        <span className="pOverallIcon" aria-hidden="true">
          <svg viewBox="0 0 24 24">
            <rect x="3" y="13" width="5" height="8" rx="0.8" />
            <rect x="9.5" y="8" width="5" height="13" rx="0.8" />
            <rect x="16" y="3" width="5" height="18" rx="0.8" />
          </svg>
        </span>
        <div className="pOverallText">
          <strong>{t.overall}</strong>
          <small>{t.across}</small>
        </div>
        <div className="pOverallBar">
          <b>{overall}%</b>
          <div
            className="pTrack"
            role="progressbar"
            aria-label={t.overall}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={overall}
          >
            <span style={{ width: `${overall}%` }} />
          </div>
          <small>{t.onTrack}</small>
        </div>
      </section>

      <section className="pSubjects">
        <div className="pHead">
          <h2>{t.subjects}</h2>
          <Link href={`/dashboard?lang=${language}&view=learning`}>
            {t.viewAll} <span aria-hidden="true">{"→"}</span>
          </Link>
        </div>
        <div className="pGrid">
          {rows.map(({ subject, percent, tone }) => (
            <Link
              key={subject.key}
              href={`/dashboard?lang=${language}&view=learning&subjectId=${subject.subjectId}`}
              className="pCard"
            >
              <span
                className="pIcon"
                style={{ "--c": COLORS[subject.key] } as CSSProperties}
              >
                {renderIcon(subject.key)}
              </span>
              <span className="pCardName">
                <strong>{subjectLabel(subject.name, language, true)}</strong>
                <b>{percent}%</b>
              </span>
              <span className="pTrack small">
                <span style={{ width: `${percent}%` }} />
              </span>
              <span className={`pChip ${tone}`}>{t[tone]}</span>
              <span className="pArrow" aria-hidden="true">
                {"›"}
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section className="pGrowing">
        <span className="pSprout" aria-hidden="true">
          <svg viewBox="0 0 24 24">
            <path d="M12 21v-9" />
            <path d="M12 12C12 8 9 6 5 6c0 4 2 6 7 6z" />
            <path d="M12 14c0-3 2-5 6-5 0 3-2 5-6 5z" />
          </svg>
        </span>
        <div>
          <strong>{t.growing}</strong>
          <p>{t.growingBody}</p>
        </div>
        <span className="pGrowNote" aria-hidden="true">
          {t.growNote.map((line) => (
            <span key={line}>{line}</span>
          ))}
        </span>
      </section>

      <section className="pLists">
        <div className="pList strengths">
          <strong>{t.strengths}</strong>
          <small>{t.strengthsSub}</small>
          <ol>
            {strengths.map((row, index) => (
              <li key={row.subject.key}>
                <i>{index + 1}</i>
                <span>{subjectLabel(row.subject.name, language)}</span>
                <b>{row.percent}%</b>
              </li>
            ))}
            <li>
              <i>{strengths.length + 1}</i>
              <span>{strengths.length ? t.keepUp : t.noStrengths}</span>
            </li>
          </ol>
        </div>
        <div className="pList focus">
          <strong>{t.focus}</strong>
          <small>{t.focusSub}</small>
          <ol>
            {focus.map((row, index) => (
              <li key={row.subject.key}>
                <i>{index + 1}</i>
                <span>{subjectLabel(row.subject.name, language)}</span>
                <b>{row.percent}%</b>
              </li>
            ))}
            <li>
              <i>{focus.length + 1}</i>
              <span>{focus.length ? t.youCan : t.noFocus}</span>
            </li>
          </ol>
        </div>
      </section>

      <section className="pQuote">
        <span className="pQuoteMark" aria-hidden="true">
          {"“"}
        </span>
        <p>{t.quote}</p>
        <b>{"– FILU"}</b>
      </section>

      <section className="homeFooter">
        <img src="/images/home/landscape%20footer.png" alt="" />
      </section>

      <style jsx>{`
        .progressPage {
          display: flex;
          flex: 1;
          flex-direction: column;
          gap: 6px;
        }

        .pHero {
          position: relative;
          min-height: 96px;
          padding: 8px 0 0 4px;
        }

        .pHero h1 {
          margin: 0;
          color: var(--filumire-navy);
          font-size: 28px;
          line-height: 1.1;
          font-weight: 800;
        }

        .pHero p {
          max-width: 190px;
          margin: 4px 0 0;
          color: #3d5a78;
          font-size: 14px;
          line-height: 1.25;
        }

        .pHero img {
          position: absolute;
          right: -4px;
          bottom: 0;
          width: auto;
          height: 92px;
        }

        .pBubble {
          position: absolute;
          top: 0;
          right: 70px;
          display: flex;
          width: 98px;
          height: 78px;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          background: #fdf0c4;
          color: #1a6fd1;
          font-family: var(--font-hand), cursive;
          font-size: 14px;
          line-height: 1.05;
          text-align: center;
          transform: rotate(-6deg);
        }

        .pOverall {
          display: grid;
          grid-template-columns: 44px minmax(0, 1fr) minmax(0, 1.25fr);
          align-items: center;
          column-gap: 10px;
          padding: 8px 12px;
          border-radius: 14px;
          background: #e8f2fc;
        }

        .pOverallIcon {
          display: grid;
          width: 44px;
          height: 44px;
          place-items: center;
          border-radius: 50%;
          background: #cfe3fa;
        }

        .pOverallIcon svg {
          width: 24px;
          height: 24px;
          fill: #0b7bff;
        }

        .pOverallText strong {
          display: block;
          color: var(--filumire-navy);
          font-size: 15px;
          line-height: 1.15;
        }

        .pOverallText small {
          color: #4a6580;
          font-size: 12px;
        }

        .pOverallBar b {
          display: block;
          color: var(--filumire-navy);
          font-size: 20px;
          line-height: 1;
        }

        .pOverallBar small {
          display: block;
          margin-top: 3px;
          color: #4a6580;
          font-size: 11px;
        }

        .pTrack {
          display: block;
          height: 8px;
          margin-top: 4px;
          overflow: hidden;
          border-radius: 999px;
          background: #d5e2ee;
        }

        .pTrack > span {
          display: block;
          height: 100%;
          border-radius: inherit;
          background: var(--filumire-green);
        }

        .pHead {
          display: flex;
          align-items: baseline;
          justify-content: space-between;
          margin-bottom: 4px;
        }

        .pHead h2 {
          margin: 0;
          color: var(--filumire-navy);
          font-size: 20px;
          font-weight: 800;
        }

        .pHead :global(a) {
          color: #0b7bff;
          font-size: 12px;
          font-weight: 700;
          text-decoration: none;
        }

        .pGrid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 6px;
        }

        .pGrid :global(.pCard) {
          position: relative;
          display: grid;
          grid-template-columns: 36px minmax(0, 1fr);
          column-gap: 6px;
          row-gap: 2px;
          align-items: center;
          padding: 6px 8px;
          border: 1px solid #dbe6f0;
          border-radius: 12px;
          background: #ffffff;
          color: inherit;
          text-decoration: none;
        }

        .pIcon {
          display: grid;
          grid-row: 1 / span 1;
          width: 36px;
          height: 36px;
          place-items: center;
          border-radius: 50%;
          background: var(--c);
        }

        .pIcon :global(svg) {
          width: 22px;
          height: 22px;
          fill: #ffffff;
        }

        .pIcon :global(.cut) {
          fill: var(--c);
        }

        .pIcon :global(.cutline) {
          fill: none;
          stroke: var(--c);
          stroke-width: 1.6;
          stroke-linecap: round;
        }

        .pIcon :global(.line) {
          fill: none;
          stroke: #ffffff;
          stroke-width: 2;
          stroke-linecap: round;
        }

        .pCardName {
          display: flex;
          min-width: 0;
          align-items: baseline;
          justify-content: space-between;
          gap: 4px;
        }

        .pCardName strong {
          overflow: hidden;
          color: var(--filumire-navy);
          font-size: 13px;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .pCardName b {
          color: var(--filumire-navy);
          font-size: 13px;
        }

        .pTrack.small {
          grid-column: 1 / -1;
          height: 6px;
          margin-top: 0;
        }

        .pChip {
          grid-column: 1 / -1;
          justify-self: start;
          padding: 2px 10px;
          border-radius: 8px;
          font-size: 11px;
          font-weight: 700;
        }

        .pChip.good {
          background: #dcf3e5;
          color: #1c7d44;
        }

        .pChip.learning {
          background: #dcebff;
          color: #1a5fb4;
        }

        .pChip.fresh {
          background: #eef1f5;
          color: #5b6b7a;
        }

        .pArrow {
          position: absolute;
          right: 8px;
          bottom: 8px;
          color: var(--filumire-navy);
          font-size: 18px;
          line-height: 1;
        }

        .pGrowing {
          position: relative;
          display: grid;
          grid-template-columns: 40px minmax(0, 1fr);
          align-items: center;
          column-gap: 10px;
          min-height: 56px;
          padding: 6px 92px 6px 12px;
          border-radius: 14px;
          background: #e3f4e8;
        }

        .pSprout {
          display: grid;
          width: 40px;
          height: 40px;
          place-items: center;
          border-radius: 50%;
          background: #cdebd6;
        }

        .pSprout svg {
          width: 24px;
          height: 24px;
          fill: #22a85a;
          stroke: #22a85a;
          stroke-width: 1.4;
          stroke-linecap: round;
          stroke-linejoin: round;
        }

        .pGrowing strong {
          color: var(--filumire-navy);
          font-size: 15px;
        }

        .pGrowing p {
          margin: 2px 0 0;
          color: #3d5a78;
          font-size: 11px;
          line-height: 1.3;
        }

        .pGrowNote {
          position: absolute;
          top: 6px;
          right: 8px;
          display: flex;
          width: 84px;
          flex-direction: column;
          align-items: center;
          color: #1a6fd1;
          font-family: var(--font-hand), cursive;
          font-size: 13px;
          line-height: 1.05;
          text-align: center;
          transform: rotate(-4deg);
        }

        .pLists {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 8px;
        }

        .pList {
          padding: 10px 10px 8px;
          border-radius: 14px;
        }

        .pList.strengths {
          background: #e3f4e8;
        }

        .pList.focus {
          background: #e4effb;
        }

        .pList strong {
          display: block;
          color: var(--filumire-navy);
          font-size: 14px;
        }

        .pList small {
          display: block;
          margin-top: 1px;
          color: #4a6580;
          font-size: 10px;
          line-height: 1.25;
        }

        .pList ol {
          margin: 4px 0 0;
          padding: 0;
          list-style: none;
        }

        .pList li {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 2px 0;
          color: var(--filumire-navy);
          font-size: 12px;
        }

        .pList li span {
          flex: 1;
        }

        .pList li b {
          font-size: 12px;
        }

        .pList li i {
          display: grid;
          width: 18px;
          height: 18px;
          flex: 0 0 18px;
          place-items: center;
          border-radius: 50%;
          color: #ffffff;
          font-size: 10px;
          font-style: normal;
          font-weight: 800;
        }

        .strengths li i {
          background: #22a85a;
        }

        .focus li i {
          background: #0b7bff;
        }

        .pQuote {
          display: grid;
          grid-template-columns: 30px minmax(0, 1fr) auto;
          align-items: center;
          column-gap: 8px;
          padding: 6px 12px;
          border-radius: 14px;
          background: #ece6fa;
        }

        .pQuoteMark {
          color: #9b86e8;
          font-size: 34px;
          font-weight: 800;
          line-height: 0.8;
        }

        .pQuote p {
          margin: 0;
          color: #3d3a66;
          font-size: 11px;
          line-height: 1.3;
        }

        .pQuote b {
          align-self: end;
          color: #3d3a66;
          font-size: 11px;
        }
      `}</style>
    </div>
  );
}
