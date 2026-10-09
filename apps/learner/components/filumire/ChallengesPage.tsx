"use client";

import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";

import type { LearningOverview } from "../../services/learning-client";
import { subjectLabel, toFilumireSubjects } from "./subjects";

type ChallengesPageProps = {
  language: "en" | "fr";
  overview: LearningOverview | null;
  renderIcon: (key: string) => ReactNode;
  current: {
    subjectId: string;
    subjectName: string;
    title: string;
    done: number;
    total: number;
    startHref: string;
  };
};

const COLORS: Record<string, string> = {
  english: "#0b7bff",
  mathematics: "#f59e0b",
  science: "#22a85a",
  computing: "#7c5ce0",
};

const TEXT = {
  en: {
    title: "Challenges & Achievements",
    intro: "Learn. Improve. Achieve. You\u2019ve got this!",
    today: "Today\u2019s Challenge",
    todaySub: "Complete this to boost your learning!",
    of: "of",
    start: "Start Challenge",
    more: "More Learning Challenges",
    viewAll: "View all",
    rowSub: "Learning goals completed",
    achievements: "Your Achievements",
    earned: "Earned",
    locked: "Not yet earned",
    badges: [
      { title: "First Goal", sub: "Finish your first learning goal" },
      { title: "Subject Explorer", sub: "Start learning in two subjects" },
      { title: "Steady Learner", sub: "Finish five learning goals" },
    ],
    quote: "Keep learning, keep growing! You\u2019re making great progress!",
  },
  fr: {
    title: "D\u00e9fis et r\u00e9ussites",
    intro: "Apprends. Progresse. R\u00e9ussis. Tu peux le faire !",
    today: "D\u00e9fi du jour",
    todaySub: "Termine-le pour progresser !",
    of: "sur",
    start: "Commencer le d\u00e9fi",
    more: "Autres d\u00e9fis d\u2019apprentissage",
    viewAll: "Tout voir",
    rowSub: "Objectifs termin\u00e9s",
    achievements: "Tes r\u00e9ussites",
    earned: "Obtenu",
    locked: "Pas encore obtenu",
    badges: [
      { title: "Premier objectif", sub: "Termine ton premier objectif" },
      { title: "Explorateur", sub: "Commence deux mati\u00e8res" },
      { title: "Apprenant r\u00e9gulier", sub: "Termine cinq objectifs" },
    ],
    quote: "Continue d\u2019apprendre, continue de grandir !",
  },
} as const;

const BADGE_COLORS = ["#f5a00f", "#0b7bff", "#22a85a"];

export function ChallengesPage({
  language,
  overview,
  renderIcon,
  current,
}: ChallengesPageProps) {
  const t = TEXT[language];

  const rows = toFilumireSubjects(overview?.availableSubjects).map((subject) => {
    const stats = overview?.subjects[subject.subjectId];
    const total = stats?.total ?? 0;
    const done = stats?.completed ?? 0;
    const started = (stats?.tracked ?? 0) > 0 || done > 0;
    const percent = total > 0 ? Math.round((done / total) * 100) : 0;
    return { subject, total, done, started, percent };
  });

  const doneAll = rows.reduce((sum, row) => sum + row.done, 0);
  const startedCount = rows.filter((row) => row.started).length;
  const earned = [doneAll >= 1, startedCount >= 2, doneAll >= 5];

  const currentPercent =
    current.total > 0
      ? Math.round((current.done / current.total) * 100)
      : 0;

  const others = rows
    .filter((row) => row.subject.subjectId !== current.subjectId)
    .slice(0, 3);

  return (
    <div className="challengesPage">
      <section className="cHead">
        <h1>{t.title}</h1>
        <p>{t.intro}</p>
      </section>

      <section className="cToday">
        <span className="cTodayIcon" aria-hidden="true">
          <svg viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="9" />
            <circle cx="12" cy="12" r="5" />
            <circle cx="12" cy="12" r="1.6" />
          </svg>
        </span>
        <div className="cTodayText">
          <strong>{t.today}</strong>
          <small>{t.todaySub}</small>
        </div>
        <img src="/images/home/boy-continue.png" alt="" />
        <div className="cTodayBody">
          <h2>{current.title}</h2>
          <p>{subjectLabel(current.subjectName, language)}</p>
        </div>
        <div className="cTodayBar">
          <div
            className="cTrack"
            role="progressbar"
            aria-label={t.today}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={currentPercent}
          >
            <span style={{ width: `${currentPercent}%` }} />
          </div>
          <b>
            {current.done} {t.of} {current.total}
          </b>
        </div>
        <Link href={current.startHref} className="cStart">
          {t.start} <span aria-hidden="true">{"\u2192"}</span>
        </Link>
      </section>

      <section className="cMore">
        <div className="cSecHead">
          <h2>{t.more}</h2>
          <Link href={`/dashboard?lang=${language}&view=learning`}>
            {t.viewAll} <span aria-hidden="true">{"\u2192"}</span>
          </Link>
        </div>
        <div className="cRows">
          {others.map(({ subject, done, total, percent }) => (
            <Link
              key={subject.key}
              href={`/dashboard?lang=${language}&view=learning&subjectId=${subject.subjectId}`}
              className="cRow"
              style={{ "--c": COLORS[subject.key] } as CSSProperties}
            >
              <span className="cRowIcon">{renderIcon(subject.key)}</span>
              <span className="cRowText">
                <strong>{subjectLabel(subject.name, language)}</strong>
                <small>{t.rowSub}</small>
                <span className="cTrack small">
                  <span style={{ width: `${percent}%` }} />
                </span>
              </span>
              <b>
                {done} {t.of} {total}
              </b>
              <span className="cArrow" aria-hidden="true">
                {"\u203a"}
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section className="cAch">
        <div className="cSecHead">
          <h2>{t.achievements}</h2>
        </div>
        <div className="cBadges">
          {t.badges.map((badge, index) => (
            <div
              key={badge.title}
              className={`cBadge${earned[index] ? " on" : ""}`}
              style={{ "--b": BADGE_COLORS[index] } as CSSProperties}
            >
              <span className="cMedal" aria-hidden="true">
                <svg viewBox="0 0 24 24">
                  <path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.8l-5.2 2.8 1-5.8-4.3-4.1 5.9-.9z" />
                </svg>
              </span>
              <strong>{badge.title}</strong>
              <small>{badge.sub}</small>
              <em>{earned[index] ? t.earned : t.locked}</em>
            </div>
          ))}
        </div>
      </section>

      <section className="cQuote">
        <span aria-hidden="true">{"\u2605"}</span>
        <p>{t.quote}</p>
        <b>{"\u2013 FILU"}</b>
      </section>

      <section className="homeFooter">
        <img src="/images/home/landscape%20footer.png" alt="" />
      </section>

      <style jsx>{`
        .challengesPage {
          display: flex;
          flex: 1;
          flex-direction: column;
          gap: 10px;
        }

        .cHead {
          padding: 14px 0 0 4px;
        }

        .cHead h1 {
          margin: 0;
          color: var(--filumire-navy);
          font-size: 22px;
          line-height: 1.1;
          font-weight: 800;
        }

        .cHead p {
          margin: 3px 0 0;
          color: #3d5a78;
          font-size: 13px;
        }

        .cToday {
          position: relative;
          display: grid;
          grid-template-columns: 38px minmax(0, 1fr);
          column-gap: 10px;
          row-gap: 4px;
          align-items: center;
          padding: 10px 12px 12px;
          border-radius: 16px;
          background: #fdf3de;
        }

        .cTodayIcon {
          display: grid;
          width: 38px;
          height: 38px;
          place-items: center;
          border-radius: 50%;
          background: #fbe3b0;
        }

        .cTodayIcon svg {
          width: 24px;
          height: 24px;
          fill: none;
          stroke: #f08a00;
          stroke-width: 1.8;
        }

        .cTodayIcon svg circle:last-child {
          fill: #f08a00;
          stroke: none;
        }

        .cTodayText strong {
          display: block;
          color: var(--filumire-navy);
          font-size: 16px;
          line-height: 1.1;
        }

        .cTodayText small {
          color: #5b6b7a;
          font-size: 12px;
        }

        .cToday img {
          position: absolute;
          top: 6px;
          right: 8px;
          width: auto;
          height: 76px;
        }


        .cTodayBody {
          grid-column: 1 / -1;
          margin-top: 6px;
          padding-right: 84px;
        }

        .cTodayBody h2 {
          margin: 0;
          color: var(--filumire-navy);
          font-size: 16px;
          line-height: 1.15;
          font-weight: 800;
        }

        .cTodayBody p {
          margin: 2px 0 0;
          color: #5b6b7a;
          font-size: 12px;
        }

        .cTodayBar {
          grid-column: 1 / -1;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .cTodayBar b {
          color: var(--filumire-navy);
          font-size: 12px;
          white-space: nowrap;
        }

        .cTrack {
          display: block;
          flex: 1;
          height: 8px;
          overflow: hidden;
          border-radius: 999px;
          background: #e1d8c4;
        }

        .cTrack > span {
          display: block;
          height: 100%;
          border-radius: inherit;
          background: var(--filumire-green);
        }

        .cToday :global(.cStart) {
          grid-column: 1 / -1;
          display: flex;
          min-height: 42px;
          align-items: center;
          justify-content: center;
          gap: 8px;
          margin-top: 2px;
          border-radius: 12px;
          background: #1677ff;
          color: #ffffff;
          font-size: 16px;
          font-weight: 800;
          text-decoration: none;
        }

        .cSecHead {
          display: flex;
          align-items: baseline;
          justify-content: space-between;
          margin-bottom: 4px;
        }

        .cSecHead h2 {
          margin: 0;
          color: var(--filumire-navy);
          font-size: 17px;
          font-weight: 800;
        }

        .cSecHead :global(a) {
          color: #0b7bff;
          font-size: 12px;
          font-weight: 700;
          text-decoration: none;
        }

        .cRows {
          display: grid;
          gap: 6px;
        }

        .cRows :global(.cRow) {
          display: grid;
          grid-template-columns: 34px minmax(0, 1fr) auto 14px;
          align-items: center;
          column-gap: 10px;
          padding: 5px 10px;
          border-radius: 12px;
          background: #eef4fb;
          color: inherit;
          text-decoration: none;
        }

        .cRowIcon {
          display: grid;
          width: 34px;
          height: 34px;
          place-items: center;
          border-radius: 50%;
          background: var(--c);
        }

        .cRowIcon :global(svg) {
          width: 20px;
          height: 20px;
          fill: #ffffff;
        }

        .cRowIcon :global(.cut) {
          fill: var(--c);
        }

        .cRowIcon :global(.cutline) {
          fill: none;
          stroke: var(--c);
          stroke-width: 1.6;
          stroke-linecap: round;
        }

        .cRowIcon :global(.line) {
          fill: none;
          stroke: #ffffff;
          stroke-width: 2;
          stroke-linecap: round;
        }

        .cRowText strong {
          display: block;
          color: var(--filumire-navy);
          font-size: 13px;
          line-height: 1.1;
        }

        .cRowText small {
          display: block;
          color: #5b6b7a;
          font-size: 11px;
        }

        .cTrack.small {
          height: 6px;
          margin-top: 2px;
          background: #d5e2ee;
        }

        .cRows :global(.cRow) b {
          color: var(--filumire-navy);
          font-size: 12px;
          white-space: nowrap;
        }

        .cArrow {
          color: var(--filumire-navy);
          font-size: 18px;
          line-height: 1;
        }

        .cBadges {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 6px;
        }

        .cBadge {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 6px 6px;
          border: 1px solid #dbe6f0;
          border-radius: 12px;
          background: #ffffff;
          text-align: center;
          opacity: 0.6;
        }

        .cBadge.on {
          opacity: 1;
        }

        .cMedal {
          display: grid;
          width: 32px;
          height: 32px;
          place-items: center;
          border-radius: 50%;
          background: #c9d3de;
        }

        .cBadge.on .cMedal {
          background: var(--b);
        }

        .cMedal svg {
          width: 24px;
          height: 24px;
          fill: #ffffff;
        }

        .cBadge strong {
          margin-top: 4px;
          color: var(--filumire-navy);
          font-size: 12px;
          line-height: 1.15;
        }

        .cBadge small {
          margin-top: 2px;
          color: #5b6b7a;
          font-size: 10px;
          line-height: 1.2;
        }

        .cBadge em {
          margin-top: 1px;
          color: #5b6b7a;
          font-size: 10px;
          font-style: normal;
          font-weight: 700;
        }

        .cBadge.on em {
          color: #1c7d44;
        }

        .cQuote {
          display: grid;
          grid-template-columns: 28px minmax(0, 1fr) auto;
          align-items: center;
          column-gap: 8px;
          padding: 4px 12px;
          border-radius: 14px;
          background: #ece6fa;
        }

        .cQuote span {
          color: #f5a00f;
          font-size: 22px;
        }

        .cQuote p {
          margin: 0;
          color: #3d3a66;
          font-size: 11px;
          line-height: 1.3;
        }

        .cQuote b {
          color: #3d3a66;
          font-size: 11px;
        }
      `}</style>
    </div>
  );
}