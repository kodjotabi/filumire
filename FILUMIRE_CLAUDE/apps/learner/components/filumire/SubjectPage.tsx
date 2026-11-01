"use client";

import Link from "next/link";
import { ProgressStatus } from "./ProgressStatus";
import { Fragment, type ReactNode } from "react";

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
    coverage: (available: number, total: number) => string;
    upcoming: string;
    upcomingCount: (count: number) => string;
    upcomingHint: string;
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
    coverage: (available, total) => `Official curriculum: ${available} of ${total} learning goals available in FILUMIRE`,
    upcoming: "In development",
    upcomingCount: (count) => `${count} in development`,
    upcomingHint: "Goals marked “In development” are part of the official curriculum. Their lessons are not ready yet.",
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
    coverage: (available, total) => `Programme officiel : ${available} sur ${total} objectifs d’apprentissage disponibles dans FILUMIRE`,
    upcoming: "En préparation",
    upcomingCount: (count) => `${count} en préparation`,
    upcomingHint: "Les objectifs « En préparation » font partie du programme officiel. Leurs leçons ne sont pas encore prêtes.",
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

// An official goal whose lesson is still being written: a clock, nothing to open.
const UPCOMING_ICON = (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm0 2a8 8 0 1 1 0 16 8 8 0 0 1 0-16zm1 3h-2v6l5 3 1-1.7-4-2.3z" />
  </svg>
);

/*
 * Display only: official wording such as "topics/texts/issues" may
 * break after a slash between words instead of mid-word. The text
 * itself is unchanged, and slashes in numbers (1/2) are left whole.
 */
function withSlashBreaks(text: string): ReactNode {
  const parts = text.split(/(?<=\p{L})\/(?=\p{L})/u);
  if (parts.length === 1) return text;
  return parts.map((part, index) => (
    <Fragment key={index}>
      {part}
      {index < parts.length - 1 ? <>/<wbr /></> : null}
    </Fragment>
  ));
}

/* A description that only repeats the title is not shown twice. */
function sameText(a: string, b: string): boolean {
  const plain = (text: string) => text.replace(/\s+/g, " ").trim().replace(/[.\s]+$/, "").toLowerCase();
  return plain(a) === plain(b);
}

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
    upcoming: UpcomingGoal[];
  }>;
};

type UpcomingGoal = NonNullable<LearningOverview["curriculumCoverage"]>["upcoming"][number];
type Place = NonNullable<Area["strand"]>;

/*
 * Phase 2: topics grouped strand -> sub-strand in curriculum order;
 * within a sub-strand, topics keep their learning sequence. Official
 * goals still in development join the same groups, after the topics,
 * in source order.
 */
function groupByCurriculum(areas: Area[], upcoming: UpcomingGoal[] = []): StrandGroup[] {
  const strands = new Map<string, StrandGroup>();
  // A topic without a curriculum place (an older overview) is still listed, ungrouped.
  const unplaced = { key: "", code: "", title: "", language: "en" as const, order: 0 };
  const groupFor = (strandPlace: Place, subStrandPlace: Place) => {
    let strand = strands.get(strandPlace.key);
    if (!strand) {
      strand = { ...strandPlace, subStrands: [] };
      strands.set(strandPlace.key, strand);
    }
    let subStrand = strand.subStrands.find((item) => item.key === subStrandPlace.key);
    if (!subStrand) {
      subStrand = { ...subStrandPlace, topics: [], upcoming: [] };
      strand.subStrands.push(subStrand);
    }
    return subStrand;
  };
  for (const area of [...areas].sort((a, b) => (a.sequence ?? 0) - (b.sequence ?? 0))) {
    groupFor(area.strand ?? unplaced, area.subStrand ?? unplaced).topics.push(area);
  }
  for (const goal of [...upcoming].sort((a, b) => a.order - b.order)) {
    groupFor(goal.strand, goal.subStrand).upcoming.push(goal);
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
  // Coverage belongs to the same subject as the areas; mastery figures never include upcoming goals.
  const coverage =
    overview && overview.areasSubjectId === subject.subjectId ? overview.curriculumCoverage ?? null : null;
  const upcoming = coverage?.upcoming ?? [];
  const strands = groupByCurriculum(areas, upcoming);
  const firstWithTopics = strands.flatMap((strand) => strand.subStrands).find((item) => item.topics.length > 0);
  const topicHref = (competencyId: string) =>
    `/learn?lang=${language}&subjectId=${encodeURIComponent(subject.subjectId)}&competencyId=${encodeURIComponent(competencyId)}`;
  const topicList = (topics: Area[], upcomingGoals: UpcomingGoal[] = []) => (
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
                {/* The current topic's full title is in the Current Topic card above; here one line is enough
                    (the full text stays in the link's accessible name and tooltip). */}
                <strong className={current && topicTitle ? "subjectAreaShort" : undefined} title={current && topicTitle ? area.title : undefined}>
                  {withSlashBreaks(area.title)}
                </strong>
                {current ? <small>{t.here}</small> : null}
              </div>
              <span className="subjectAreaPill">{area.progressStatus ? <ProgressStatus status={area.progressStatus} language={language} /> : t.status[area.status]}</span>
            </Link>
          </li>
        );
      })}
      {/* Not a link and not focusable: there is no lesson to open yet. */}
      {upcomingGoals.map((goal) => (
        <li key={goal.id}>
          <div className="subjectArea upcoming">
            <span className="subjectAreaIcon">{UPCOMING_ICON}</span>
            <div>
              <strong lang={goal.language}>{withSlashBreaks(goal.title)}</strong>
            </div>
            <span className="subjectAreaPill">{t.upcoming}</span>
          </div>
        </li>
      ))}
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
        {upcoming.length > 0 && coverage ? (
          <small className="subjectCoverage">{t.coverage(coverage.available, coverage.total)}</small>
        ) : null}
      </section>

      {topicTitle ? (
        <section className="subjectCurrent">
          <div className="subjectCurrentBody">
            <span className="homeSubjectIcon">{icon}</span>
            <div>
              <span className="subjectTag">{t.current}</span>
              <h2>{withSlashBreaks(topicTitle)}</h2>
              {topic?.description && !sameText(topic.description, topicTitle) ? <p>{topic.description}</p> : null}
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
          {upcoming.length > 0 ? <p className="subjectTopicsHint">{t.upcomingHint}</p> : null}
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
                  return <div key={subStrand.key || "unplaced"}>{topicList(subStrand.topics, subStrand.upcoming)}</div>;
                }
                const mastered = subStrand.topics.filter((area) => area.status === "completed").length;
                const holdsCurrent = subStrand.topics.some((area) => area.id === currentArea?.id);
                const counts = [
                  subStrand.topics.length > 0 ? `${mastered} ${t.of} ${subStrand.topics.length} ${t.mastered}` : "",
                  subStrand.upcoming.length > 0 ? t.upcomingCount(subStrand.upcoming.length) : "",
                ].filter(Boolean).join(" · ");
                return (
                  <details
                    key={subStrand.key}
                    className="subjectSubStrand"
                    open={holdsCurrent || (!currentArea && subStrand === firstWithTopics)}
                  >
                    <summary>
                      <span lang={subStrand.language}>{subStrand.title}</span>
                      <small>{counts}</small>
                    </summary>
                    {topicList(subStrand.topics, subStrand.upcoming)}
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
