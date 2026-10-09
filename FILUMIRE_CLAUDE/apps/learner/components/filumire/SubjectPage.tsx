"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";

import type { LearningOverview } from "../../services/learning-client";
import { subjectLabel, type FilumireSubject, type FilumireSubjectKey } from "./subjects";

type AreaStatus = "completed" | "inprogress" | "new";

type SubjectPageProps = {
  subject: FilumireSubject;
  language: "en" | "fr";
  overview: LearningOverview | null;
  currentTitle: string;
  learnHref: string | null;
  icon: ReactNode;
  footer: ReactNode;
};

type Words = Record<FilumireSubjectKey, string>;

const TEXT: Record<
  "en" | "fr",
  {
    overall: string;
    of: string;
    topics: string;
    current: string;
    areas: string;
    viewAll: string;
    less: string;
    cont: string;
    start: string;
    empty: string;
    keep: string;
    great: string;
    practice: string;
    status: Record<AreaStatus, string>;
    tagline: Words;
    note: Words;
  }
> = {
  en: {
    overall: "Overall Progress",
    of: "of",
    topics: "topics completed",
    current: "Current Topic",
    areas: "Learning Areas",
    viewAll: "View All",
    less: "Show less",
    cont: "Continue Learning",
    start: "Start Learning",
    empty: "Your topics for this subject will appear here once you start learning.",
    keep: "Keep going!",
    great: "You're making great progress in",
    practice: "Practice today, progress tomorrow!",
    status: { completed: "Completed", inprogress: "In Progress", new: "Not Started" },
    tagline: {
      english: "Read. Think. Express.",
      mathematics: "Solve. Reason. Grow.",
      science: "Explore. Discover. Apply.",
      computing: "Create. Solve. Belong.",
    },
    note: {
      english: "Words build brighter futures!",
      mathematics: "Numbers build brighter futures!",
      science: "Curiosity builds brighter futures!",
      computing: "Ideas build brighter futures!",
    },
  },
  fr: {
    overall: "Progression globale",
    of: "sur",
    topics: "thèmes terminés",
    current: "Thème actuel",
    areas: "Domaines d'apprentissage",
    viewAll: "Tout voir",
    less: "Voir moins",
    cont: "Continuer l'apprentissage",
    start: "Commencer",
    empty: "Tes thèmes pour cette matière apparaîtront ici dès que tu commenceras.",
    keep: "Continue !",
    great: "Tu progresses bien en",
    practice: "Pratique aujourd'hui, progresse demain !",
    status: { completed: "Terminé", inprogress: "En cours", new: "Pas commencé" },
    tagline: {
      english: "Lire. Penser. Exprimer.",
      mathematics: "Résoudre. Raisonner. Grandir.",
      science: "Explorer. Découvrir. Appliquer.",
      computing: "Créer. Résoudre. Appartenir.",
    },
    note: {
      english: "Les mots ouvrent l'avenir!",
      mathematics: "Les nombres ouvrent l'avenir!",
      science: "La curiosité ouvre l'avenir!",
      computing: "Les idées ouvrent l'avenir!",
    },
  },
};

const AREA_ICONS: Record<AreaStatus, ReactNode> = {
  completed: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M9.5 16.2 5.8 12.5l-1.4 1.4 5.1 5.1L20 8.5l-1.4-1.4z" />
    </svg>
  ),
  inprogress: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M8 5v14l11-7z" />
    </svg>
  ),
  new: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M17 9h-1V7a4 4 0 0 0-8 0v2H7a1 1 0 0 0-1 1v9a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-9a1 1 0 0 0-1-1zM10 7a2 2 0 0 1 4 0v2h-4z" />
    </svg>
  ),
};

function markCurrent(list: LearningOverview["areas"], title: string) {
  if (!title) return list;
  const live = list.findIndex((a) => a.status === "inprogress");
  const at = live >= 0 ? live : list.findIndex((a) => a.status === "new");
  if (at < 0) return list;
  return list.map((a, i) => (i === at ? { ...a, title, status: "inprogress" as const } : a));
}

export function SubjectPage({
  subject,
  language,
  overview,
  currentTitle,
  learnHref,
  icon,
  footer,
}: SubjectPageProps) {
  const t = TEXT[language];
  const [showAll, setShowAll] = useState(false);
  const stats = overview?.subjects[subject.subjectId];
  const areas =
    overview && overview.areasSubjectId === subject.subjectId ? markCurrent(overview.areas, currentTitle) : [];
  const total = stats ? stats.total : areas.length;
  const done = stats ? stats.completed : 0;
  const percent = total > 0 ? Math.round((done / total) * 100) : 0;
  const inProgress = areas.findIndex((area) => area.status === "inprogress");
  const nextNew = areas.findIndex((area) => area.status === "new");
  const titledIndex = currentTitle ? areas.findIndex((area) => area.title === currentTitle) : -1;
  const currentIndex = titledIndex >= 0 ? titledIndex : inProgress >= 0 ? inProgress : nextNew;
  const currentArea = currentIndex >= 0 ? areas[currentIndex] : undefined;
  const titled = currentTitle
    ? areas.find((area) => area.title === currentTitle)
    : undefined;
  const topic = titled ?? currentArea;
  const topicTitle = currentTitle || currentArea?.title || "";
  const start = Math.max(0, Math.min(currentIndex - 1, areas.length - 3));
  const shown = showAll ? areas : areas.slice(start, start + 3);
  const name = subjectLabel(subject.name, language);

  return (
    <div className={`subjectPage ${subject.key}`}>
      <section className="subjectHero">
        <span className="homeSubjectIcon">{icon}</span>
        <div>
          <h1>{name}</h1>
          <p>{t.tagline[subject.key]}</p>
        </div>
        <div className="homeNote" aria-hidden="true">
          {t.note[subject.key].split(" ").map((word, index) => (
            <span key={`${word}-${index}`}>{word}</span>
          ))}
        </div>
      </section>

      <section className="subjectProgress">
        <strong>{t.overall}</strong>
        <div className="subjectProgressRow">
          <span
            className="homeMiniTrack"
            role="progressbar"
            aria-label={t.overall}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={percent}
          >
            <span style={{ width: `${percent}%` }} />
          </span>
          <b>{percent}%</b>
        </div>
        <small>
          {done} {t.of} {total} {t.topics}
        </small>
      </section>

      {topicTitle ? (
        <section className="subjectCurrent">
          <div className="subjectCurrentBody">
            <span className="homeSubjectIcon">{icon}</span>
            <div>
              <span className="subjectTag">{t.current}</span>
              <h2>{topicTitle}</h2>
              {topic?.description ? <p>{topic.description}</p> : null}
            </div>
          </div>
          {learnHref ? (
            <Link href={learnHref} className="subjectCta">
              {t.cont}
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </Link>
          ) : null}
        </section>
      ) : learnHref ? (
        <section className="subjectCurrent">
          <p className="subjectEmpty">{t.empty}</p>
          <Link href={learnHref} className="subjectCta">
            {t.start}
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </Link>
        </section>
      ) : null}

      {areas.length > 0 ? (
        <section className="subjectAreas">
          <div className="homeSectionHead">
            <h2>{t.areas}</h2>
            {areas.length > 3 ? (
              <button
                type="button"
                className="homeSeeAll"
                onClick={() => setShowAll(!showAll)}
                aria-expanded={showAll}
              >
                {showAll ? t.less : t.viewAll}
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M9 6l6 6-6 6" />
                </svg>
              </button>
            ) : null}
          </div>
          <ul>
            {shown.map((area) => (
              <li key={area.id} className={`subjectArea ${area.status}`}>
                <span className="subjectAreaIcon">{AREA_ICONS[area.status]}</span>
                <div>
                  <strong>
                    {areas.indexOf(area) + 1}. {area.title}
                  </strong>
                  
                </div>
                <span className="subjectAreaPill">{t.status[area.status]}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="subjectKeep">
        <span className="subjectTrophy">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M19 5h-2V3H7v2H5c-1.1 0-2 .9-2 2v1c0 2.55 1.92 4.63 4.39 4.94A5.01 5.01 0 0 0 11 15.9V19H7v2h10v-2h-4v-3.1a5.01 5.01 0 0 0 3.61-2.96C19.08 12.63 21 10.55 21 8V7c0-1.1-.9-2-2-2zM5 8V7h2v3.82C5.84 10.4 5 9.3 5 8zm14 0c0 1.3-.84 2.4-2 2.82V7h2v1z" />
          </svg>
        </span>
        <div>
          <strong>{t.keep}</strong>
          <p>
            {t.great} {name}.
          </p>
        </div>
        <img className="subjectKeepArt" src="/images/home/boy-continue.png" alt="" />
        <span className="subjectKeepNote" aria-hidden="true">
          {t.practice}
        </span>
      </section>

      {footer}
    </div>
  );
}
