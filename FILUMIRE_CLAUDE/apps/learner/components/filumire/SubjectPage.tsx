"use client";

import Link from "next/link";
import { ProgressStatus } from "./ProgressStatus";
import type { ReactNode } from "react";

import type { LearningOverview } from "../../services/learning-client";
import { completionPercent } from "../../services/learning-presentation";
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
    hint: string;
    mastered: string;
    here: string;
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
    overall: "Subject goals mastered",
    of: "of",
    topics: "goals mastered",
    current: "Current Topic",
    areas: "Topics",
    hint: "Choose any topic to start learning it now, or continue where you left off.",
    mastered: "mastered",
    here: "Your current topic",
    cont: "Continue Learning",
    start: "Start Learning",
    empty: "Your topics for this subject will appear here once you start learning.",
    keep: "Keep going!",
    great: "You're making great progress in",
    practice: "Practice today, progress tomorrow!",
    status: { completed: "Mastered", inprogress: "In Progress", new: "Not Started" },
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
    overall: "Objectifs maîtrisés dans cette matière",
    of: "sur",
    topics: "objectifs maîtrisés",
    current: "Thème actuel",
    areas: "Thèmes",
    hint: "Choisis n'importe quel thème pour l'apprendre maintenant, ou reprends ton thème actuel.",
    mastered: "maîtrisés",
    here: "Ton thème actuel",
    cont: "Continuer l'apprentissage",
    start: "Commencer",
    empty: "Tes thèmes pour cette matière apparaîtront ici dès que tu commenceras.",
    keep: "Continue !",
    great: "Tu progresses bien en",
    practice: "Pratique aujourd'hui, progresse demain !",
    status: { completed: "Maîtrisé", inprogress: "En cours", new: "Pas commencé" },
    tagline: {
      english: "Lire. Penser. Exprimer.",
      mathematics: "Résoudre. Raisonner. Grandir.",
      science: "Explorer. Découvrir. Appliquer.",
      computing: "Créer. Résoudre. Appartenir.",
    },
    note: {
      english: "Les mots ouvrent l'avenir !",
      mathematics: "Les nombres ouvrent l'avenir !",
      science: "La curiosité ouvre l'avenir !",
      computing: "Les idées ouvrent l'avenir !",
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
  // Not started, and open to choose: a book, not a padlock.
  new: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5a.5.5 0 0 0 0 1H20v2H6.5A2.5 2.5 0 0 1 4 18.5zM8 7v2h8V7z" />
    </svg>
  ),
};

type Area = LearningOverview["areas"][number];

type StrandGroup = {
  key: string;
  title: string;
  language: "en" | "fr";
  order: number;
  subStrands: Array<{
    key: string;
    title: string;
    language: "en" | "fr";
    order: number;
    topics: Area[];
  }>;
};

/*
 * Phase 2: topics grouped strand -> sub-strand in curriculum order;
 * within a sub-strand, topics keep their learning sequence.
 */
function groupByCurriculum(areas: Area[]): StrandGroup[] {
  const strands = new Map<string, StrandGroup>();
  // A topic without a curriculum place (an older overview) is still listed, ungrouped.
  const unplaced = { key: "", code: "", title: "", language: "en" as const, order: 0 };
  for (const area of [...areas].sort((a, b) => (a.sequence ?? 0) - (b.sequence ?? 0))) {
    const strandPlace = area.strand ?? unplaced;
    const subStrandPlace = area.subStrand ?? unplaced;
    let strand = strands.get(strandPlace.key);
    if (!strand) {
      strand = { ...strandPlace, subStrands: [] };
      strands.set(strandPlace.key, strand);
    }
    let subStrand = strand.subStrands.find((item) => item.key === subStrandPlace.key);
    if (!subStrand) {
      subStrand = { ...subStrandPlace, topics: [] };
      strand.subStrands.push(subStrand);
    }
    subStrand.topics.push(area);
  }
  const byPlace = (a: { order: number; code?: string }, b: { order: number; code?: string }) =>
    a.order - b.order || (a.code ?? "").localeCompare(b.code ?? "", undefined, { numeric: true });
  return [...strands.values()]
    .sort(byPlace)
    .map((strand) => ({ ...strand, subStrands: [...strand.subStrands].sort(byPlace) }));
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
  const stats = overview?.subjects[subject.subjectId];
  const areas =
    overview && overview.areasSubjectId === subject.subjectId ? overview.areas : [];
  const total = stats ? stats.total : areas.length;
  const done = stats ? stats.completed : 0;
  const percent = completionPercent(stats);
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
  const name = subjectLabel(subject.name, language);
  const strands = groupByCurriculum(areas);
  const topicHref = (competencyId: string) =>
    `/learn?lang=${language}&subjectId=${encodeURIComponent(subject.subjectId)}&competencyId=${encodeURIComponent(competencyId)}`;
  const topicList = (topics: Area[]) => (
    <ul>
      {topics.map((area) => {
        const current = area.id === currentArea?.id;
        return (
          <li key={area.id}>
            <Link
              href={topicHref(area.id)}
              className={`subjectArea ${area.status}${current ? " current" : ""}`}
              aria-current={current ? "step" : undefined}
            >
              <span className="subjectAreaIcon">{AREA_ICONS[area.status]}</span>
              <div>
                <strong>{area.title}</strong>
                {current ? <small>{t.here}</small> : null}
              </div>
              <span className="subjectAreaPill" style={{ flex: "0 1 45%", minWidth: 0, overflowWrap: "anywhere" }}>{area.progressStatus ? <ProgressStatus status={area.progressStatus} language={language} /> : t.status[area.status]}</span>
            </Link>
          </li>
        );
      })}
    </ul>
  );

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
            role={percent === null ? undefined : "progressbar"}
            aria-label={t.overall}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={percent ?? undefined}
          >
            <span style={{ width: `${percent ?? 0}%` }} />
          </span>
          <b>{percent === null ? "—" : `${percent}%`}</b>
        </div>
        <small>
          {stats ? `${done} ${t.of} ${total} ${t.topics}` : language === "fr" ? "Progression indisponible" : "Progress unavailable"}
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

      {strands.length > 0 ? (
        <section className="subjectAreas subjectTopics" aria-labelledby="subject-topics-heading">
          <div className="homeSectionHead">
            <h2 id="subject-topics-heading">{t.areas}</h2>
          </div>
          <p className="subjectTopicsHint">{t.hint}</p>
          {strands.map((strand, strandIndex) => (
            <section
              key={strand.key || "unplaced"}
              className="subjectStrand"
              aria-labelledby={strand.title ? `subject-strand-${strandIndex}` : undefined}
            >
              {strand.title ? (
                <h3 id={`subject-strand-${strandIndex}`} lang={strand.language}>{strand.title}</h3>
              ) : null}
              {strand.subStrands.map((subStrand) => {
                if (!subStrand.title) {
                  return <div key={subStrand.key || "unplaced"}>{topicList(subStrand.topics)}</div>;
                }
                const mastered = subStrand.topics.filter((area) => area.status === "completed").length;
                const holdsCurrent = subStrand.topics.some((area) => area.id === currentArea?.id);
                return (
                  <details
                    key={subStrand.key}
                    className="subjectSubStrand"
                    open={holdsCurrent || (!currentArea && subStrand === strands[0].subStrands[0])}
                  >
                    <summary>
                      <span lang={subStrand.language}>{subStrand.title}</span>
                      <small>{`${mastered} ${t.of} ${subStrand.topics.length} ${t.mastered}`}</small>
                    </summary>
                    {topicList(subStrand.topics)}
                  </details>
                );
              })}
            </section>
          ))}
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
