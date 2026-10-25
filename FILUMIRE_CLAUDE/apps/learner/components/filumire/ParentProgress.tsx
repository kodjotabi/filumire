"use client";

import type { LearnerProgress } from "../../services/adult-client";
import type { Language } from "./language";
import { ProgressBreakdown } from "./ProgressStatus";
import {
  isFilumireSubjectKey,
  SUBJECT_PRESENTATION,
  subjectLabel,
} from "./subjects";

const TEXT = {
  en: {
    title: (grade: string) => (grade ? `Progress in ${grade}` : "Progress"),
    intro:
      "Three different things, shown separately: how much your child has practised, which topics FILUMIRE has judged mastered, and how far that goes through the class.",
    activity: "Activity",
    answers: (n: number) => (n === 1 ? "1 answer recorded" : `${n} answers recorded`),
    lastActive: (date: string) => `Last active ${date}`,
    activityNote: "Shows effort and practice, not understanding.",
    mastery: "Mastery",
    mastered: (n: number) => (n === 1 ? "1 topic mastered" : `${n} topics mastered`),
    inProgress: (n: number) => (n === 1 ? "1 topic in progress" : `${n} topics in progress`),
    masteryNote:
      "Full mastery requires confirmed readiness and assessment of the whole topic. Understanding-only and provisional progress are counted separately.",
    curriculum: "Through the class",
    ofTotal: (m: number, t: number) => `${m} of ${t} topics mastered`,
    curriculumNote: "Mastered topics out of every topic FILUMIRE offers for this class.",
    bySubject: "By subject",
    subjectRow: (m: number, t: number, p: number) =>
      `${m} of ${t} mastered${p > 0 ? `, ${p} in progress` : ""}`,
  },
  fr: {
    title: (grade: string) => (grade ? `Progression en ${grade}` : "Progression"),
    intro:
      "Trois choses différentes, présentées séparément : combien votre enfant s’est exercé, les thèmes que FILUMIRE considère comme maîtrisés, et la part de la classe que cela représente.",
    activity: "Activité",
    answers: (n: number) => (n <= 1 ? `${n} réponse enregistrée` : `${n} réponses enregistrées`),
    lastActive: (date: string) => `Dernière activité le ${date}`,
    activityNote: "Montre l’effort et l’entraînement, pas la compréhension.",
    mastery: "Maîtrise",
    mastered: (n: number) => (n <= 1 ? `${n} thème maîtrisé` : `${n} thèmes maîtrisés`),
    inProgress: (n: number) => (n <= 1 ? `${n} thème en cours` : `${n} thèmes en cours`),
    masteryNote:
      "La maîtrise complète exige une progression confirmée et l’évaluation de tout le sujet. La compréhension seule et la progression provisoire sont comptées séparément.",
    curriculum: "Dans la classe",
    ofTotal: (m: number, t: number) =>
      `${m} thème${m > 1 ? "s" : ""} maîtrisé${m > 1 ? "s" : ""} sur ${t}`,
    curriculumNote:
      "Thèmes maîtrisés sur l’ensemble des thèmes proposés par FILUMIRE pour cette classe.",
    bySubject: "Par matière",
    subjectRow: (m: number, t: number, p: number) =>
      `${m} sur ${t} maîtrisé${m > 1 ? "s" : ""}${p > 0 ? `, ${p} en cours` : ""}`,
  },
};

function percent(part: number, whole: number): number {
  return whole > 0
    ? Math.max(0, Math.min(100, Math.round((part / whole) * 100)))
    : 0;
}

function subjectName(discipline: string, fallback: string, language: Language): string {
  const name = isFilumireSubjectKey(discipline)
    ? SUBJECT_PRESENTATION[discipline].name
    : fallback;
  return subjectLabel(name, language);
}

/*
 * Parent view of a learner's progress. Activity, mastery and
 * curriculum coverage are different measures and are never merged
 * into one percentage.
 */
export function ParentProgress({
  progress,
  gradeLabel,
  language,
}: {
  progress: LearnerProgress;
  gradeLabel: string;
  language: Language;
}) {
  const t = TEXT[language];
  const curriculumPercent = percent(
    progress.curriculum.masteredCompetencies,
    progress.curriculum.totalCompetencies,
  );
  const lastActive = progress.lastActiveAt
    ? new Date(progress.lastActiveAt).toLocaleDateString(
        language === "fr" ? "fr-FR" : "en-GB",
        { day: "numeric", month: "long" },
      )
    : undefined;

  return (
    <section className="card ppCard" aria-labelledby="parent-progress-title">
      <h2 id="parent-progress-title" className="section-heading">
        {t.title(gradeLabel)}
      </h2>
      <p className="section-text">{t.intro}</p>

      <div className="ppTiles">
        <div className="ppTile">
          <h3>{t.activity}</h3>
          <strong>{t.answers(progress.activity.answersRecorded)}</strong>
          {lastActive ? <span>{t.lastActive(lastActive)}</span> : null}
          <p>{t.activityNote}</p>
        </div>

        <div className="ppTile">
          <h3>{t.mastery}</h3>
          <ProgressBreakdown language={language} full={progress.mastery.masteredCompetencies}
            understandingOnly={progress.mastery.understandingMasteredCompetencies}
            provisional={progress.mastery.provisionalCompetencies} />
          <span>{t.inProgress(progress.mastery.inProgressCompetencies)}</span>
          <p>{t.masteryNote}</p>
        </div>

        <div className="ppTile">
          <h3>{t.curriculum}</h3>
          <strong>
            {t.ofTotal(
              progress.curriculum.masteredCompetencies,
              progress.curriculum.totalCompetencies,
            )}
          </strong>
          <div
            className="ppBar"
            role="progressbar"
            aria-label={t.curriculum}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={curriculumPercent}
            aria-valuetext={`${curriculumPercent}%`}
          >
            <div style={{ width: `${curriculumPercent}%` }} />
          </div>
          <p>{t.curriculumNote}</p>
        </div>
      </div>

      {progress.subjects.length > 0 ? (
        <div className="ppSubjects">
          <h3 className="section-label">{t.bySubject}</h3>
          <ul>
            {progress.subjects.map((subject) => {
              const value = percent(
                subject.masteredCompetencies,
                subject.totalCompetencies,
              );
              const label = subjectName(subject.discipline, subject.name, language);
              const accent = isFilumireSubjectKey(subject.discipline)
                ? SUBJECT_PRESENTATION[subject.discipline].accent
                : "#1f5fbf";

              return (
                <li key={subject.subjectId}>
                  <div className="ppSubjectTop">
                    <span>{label}</span>
                    <em>
                      {t.subjectRow(
                        subject.masteredCompetencies,
                        subject.totalCompetencies,
                        subject.inProgressCompetencies,
                      )}
                    </em>
                  </div>
                  <ProgressBreakdown language={language} full={subject.masteredCompetencies}
                    understandingOnly={subject.understandingMasteredCompetencies}
                    provisional={subject.provisionalCompetencies} />
                  <div
                    className="ppBar small"
                    role="progressbar"
                    aria-label={label}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={value}
                    aria-valuetext={`${value}%`}
                  >
                    <div style={{ width: `${value}%`, background: accent }} />
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

      <style>{`
        .ppCard { display: grid; gap: 12px; }
        .ppTiles { display: grid; gap: 10px; }
        .ppTile { display: grid; gap: 4px; align-content: start; padding: 14px; border-radius: 14px; background: #f5f9ff; }
        .ppTile h3 { margin: 0; font-size: 13px; font-weight: 800; letter-spacing: 0.04em; text-transform: uppercase; color: #4a5d7a; }
        .ppTile strong { font-size: 18px; font-weight: 800; color: #14213d; }
        .ppTile span { font-size: 14px; color: #33476a; }
        .ppTile p { margin: 4px 0 0; font-size: 13px; line-height: 1.4; color: #4a5d7a; }
        .ppBar { height: 10px; border-radius: 999px; background: #dfe8f5; overflow: hidden; }
        .ppBar > div { height: 100%; border-radius: 999px; background: #1f5fbf; }
        .ppBar.small { height: 8px; }
        .ppSubjects ul { list-style: none; margin: 0; padding: 0; display: grid; gap: 10px; }
        .ppSubjectTop { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 4px 12px; margin-bottom: 4px; font-size: 15px; font-weight: 700; color: #14213d; }
        .ppSubjectTop em { font-style: normal; font-weight: 600; font-size: 13px; color: #4a5d7a; }
        @media (min-width: 760px) {
          .ppTiles { grid-template-columns: repeat(3, 1fr); }
        }
      `}</style>
    </section>
  );
}
