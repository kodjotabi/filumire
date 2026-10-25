"use client";

import Link from "next/link";
import { ProgressStatus, ProgressBreakdown } from "./ProgressStatus";
import { PROGRESS_TEXT, type LearningProgressStatus } from "../../../../services/learner-progress/reporting";
import type { CSSProperties, ReactNode } from "react";

import type { LearningOverview } from "../../services/learning-client";
import { completionPercent, estimatePercent } from "../../services/learning-presentation";
import type { AgeBand } from "./ageBand";
import { subjectLabel, toFilumireSubjects } from "./subjects";

type ProgressPageProps = {
  language: "en" | "fr";
  overview: LearningOverview | null;
  overviewState?: "loading" | "ready" | "unavailable";
  onRetry?: () => void;
  /* The learner's active topic, from the learning session. */
  current?: {
    subjectName: string;
    title: string;
    mastery: number;
    confidence: number;
    evidenceCount: number;
    readiness: boolean;
    progressStatus?: LearningProgressStatus;
    assessmentScope?: "full" | "understanding_only";
    learnHref: string;
  };
  renderIcon: (key: string) => ReactNode;
  band?: AgeBand;
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
    overall: "Curriculum goals mastered",
    across: "Across all subjects",
    onTrack: "You’re on track. Keep going!",
    notStarted: "Start a subject to see your progress grow.",
    loading: "Loading your progress...",
    unavailable: "Your progress couldn’t be loaded right now.",
    retry: "Try again",
    mastery: "Estimated current topic mastery",
    confidence: "Confidence in this estimate",
    mastered: "goals mastered",
    masteryHelp:
      "This is an estimate of understanding, not lesson completion. Confidence describes how certain FILUMIRE is. Moving on also requires the engine's readiness checks.",
    answers: "answers checked",
    ready: "Ready to move on",
    building: "Still building",
    practise: "Practise this topic",
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
    overall: "Objectifs du programme maîtrisés",
    across: "Dans toutes les matières",
    onTrack: "Tu es sur la bonne voie. Continue !",
    notStarted: "Commence une matière pour voir ta progression.",
    loading: "Chargement de ta progression...",
    unavailable: "Ta progression n’a pas pu être chargée pour le moment.",
    retry: "Réessayer",
    mastery: "Estimation de la maîtrise du thème actuel",
    confidence: "Confiance dans cette estimation",
    mastered: "objectifs maîtrisés",
    masteryHelp:
      "C'est une estimation de ta compréhension, pas de l'achèvement d'une leçon. La confiance indique la certitude de FILUMIRE. La suite dépend aussi des vérifications du moteur adaptatif.",
    answers: "réponses vérifiées",
    ready: "Prêt pour la suite",
    building: "En construction",
    practise: "Travailler ce thème",
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

/* Basic 7-9 wording: same figures, mastery language. */
const JUNIOR_TEXT = {
  en: {
    title: "Progress",
    intro: "Your mastery across subjects.",
    overall: "Overall mastery",
    across: "Topics mastered, all subjects",
    onTrack: "Based on topics mastered so far.",
    subjects: "Subjects",
    viewAll: "All subjects",
    good: "Strong",
    learning: "In progress",
    growing: "Next goal",
    growingBody: "Each topic you master raises your overall mastery.",
    strengths: "Strongest subjects",
    strengthsSub: "Highest mastery so far:",
    keepUp: "Maintain this level.",
    noStrengths: "Master a topic to see your strongest subjects.",
    noFocus: "Start a subject to see your focus areas.",
    focus: "Focus areas",
    focusSub: "Lowest mastery among started subjects:",
    youCan: "Plan your next session here.",
  },
  fr: {
    title: "Progression",
    intro: "Ta maîtrise dans chaque matière.",
    overall: "Maîtrise globale",
    across: "Sujets maîtrisés, toutes matières",
    onTrack: "Selon les sujets maîtrisés jusqu’ici.",
    subjects: "Matières",
    viewAll: "Toutes les matières",
    good: "Solide",
    learning: "En cours",
    growing: "Prochain objectif",
    growingBody: "Chaque sujet maîtrisé augmente ta maîtrise globale.",
    strengths: "Matières les plus solides",
    strengthsSub: "Meilleure maîtrise jusqu’ici :",
    keepUp: "Maintiens ce niveau.",
    noStrengths: "Maîtrise un sujet pour voir tes matières les plus solides.",
    noFocus: "Commence une matière pour voir tes priorités.",
    focus: "Priorités",
    focusSub: "Maîtrise la plus faible parmi les matières commencées :",
    youCan: "Prévois ta prochaine séance ici.",
  },
} as const;

export function ProgressPage({
  language,
  overview,
  overviewState = "ready",
  onRetry,
  current,
  renderIcon,
  band = "primary",
}: ProgressPageProps) {
  const t = band === "junior-high" ? { ...TEXT[language], ...JUNIOR_TEXT[language] } : TEXT[language];

  if (!overview) {
    return (
      <div className="progressPage">
        {overviewState === "loading" ? (
          <section className="fState inline" aria-busy="true">
            <div className="fSpinner" />
            <p role="status">{t.loading}</p>
          </section>
        ) : (
          <section className="fState inline" role="alert">
            <span className="fStateIcon warn" aria-hidden="true">!</span>
            <h1>{t.title}</h1>
            <p>{t.unavailable}</p>
            {onRetry ? (
              <div className="fStateActions">
                <button type="button" className="fButton" onClick={onRetry}>
                  {t.retry}
                </button>
              </div>
            ) : null}
          </section>
        )}
      </div>
    );
  }

  const masteryPercent = current ? estimatePercent(current.mastery) : null;
  const confidencePercent = current ? estimatePercent(current.confidence) : null;

  const rows = toFilumireSubjects(overview?.availableSubjects).map((subject) => {
    const stats = overview?.subjects[subject.subjectId];
    const total = stats?.total ?? 0;
    const done = stats?.completed ?? 0;
    const started = (stats?.tracked ?? 0) > 0 || done > 0;
    const percent = completionPercent(stats);
    const tone = ((percent ?? 0) >= 60 ? "good" : started ? "learning" : "fresh") as
      | "good"
      | "learning"
      | "fresh";
    return { subject, total, done, percent, tone, understandingOnly: stats?.understandingOnly ?? 0, provisional: stats?.provisional ?? 0 };
  });

  const totalAll = rows.reduce((sum, row) => sum + row.total, 0);
  const doneAll = rows.reduce((sum, row) => sum + row.done, 0);
  const overall = completionPercent({ total: totalAll, completed: doneAll });

  // Only real evidence: a strength needs a completed goal, a focus area
  // needs a started subject. Untouched subjects at 0% are neither.
  const strengths = rows
    .filter((row) => row.done > 0)
    .sort((a, b) => (b.percent ?? 0) - (a.percent ?? 0))
    .slice(0, 2);
  const focus = rows
    .filter(
      (row) =>
        row.tone === "learning" &&
        !strengths.some((s) => s.subject.key === row.subject.key),
    )
    .sort((a, b) => (a.percent ?? 0) - (b.percent ?? 0))
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
          <b>{overall === null ? "—" : `${overall}%`}</b>
          <div
            className="pTrack"
            role={overall === null ? undefined : "progressbar"}
            aria-label={t.overall}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={overall ?? undefined}
          >
            <span style={{ width: `${overall ?? 0}%` }} />
          </div>
          <small>
            {doneAll} / {totalAll} {t.mastered}
          </small>
          <ProgressBreakdown language={language} full={doneAll}
            understandingOnly={rows.reduce((sum, row) => sum + row.understandingOnly, 0)}
            provisional={rows.reduce((sum, row) => sum + row.provisional, 0)} />
        </div>
      </section>

      {current && current.evidenceCount > 0 ? (
        <section className="pMastery" aria-labelledby="p-mastery-title">
          <div className="pMasteryHead">
            <div>
              <strong id="p-mastery-title">{t.mastery}</strong>
              <small>
                {current.subjectName} · {current.title}
              </small>
            </div>
            <b>{masteryPercent === null ? "—" : `${masteryPercent}%`}</b>
          </div>
          <div
            className="pTrack"
            role={masteryPercent === null ? undefined : "progressbar"}
            aria-labelledby="p-mastery-title"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={masteryPercent ?? undefined}
          >
            <span style={{ width: `${masteryPercent ?? 0}%` }} />
          </div>
          <div className="pMasteryMeta">
            <span>{t.confidence}: {confidencePercent === null ? "—" : `${confidencePercent}%`}</span>
            <span className={`pChip ${current.readiness ? "good" : "learning"}`}>
              {current.progressStatus ? <ProgressStatus status={current.progressStatus} language={language} /> : current.readiness ? t.ready : t.building}
            </span>
            <span>
              {current.evidenceCount} {t.answers}
            </span>
          </div>
          <p>{t.masteryHelp}</p>
          {current.assessmentScope === "understanding_only" ? <p>{PROGRESS_TEXT[language].scopeNote}</p> : null}
          <Link href={current.learnHref} className="pMasteryLink">
            {t.practise} <span aria-hidden="true">{"→"}</span>
          </Link>
        </section>
      ) : null}

      <section className="pSubjects">
        <div className="pHead">
          <h2>{t.subjects}</h2>
          <Link href={`/dashboard?lang=${language}&view=learning`}>
            {t.viewAll} <span aria-hidden="true">{"→"}</span>
          </Link>
        </div>
        <div className="pGrid">
          {rows.map(({ subject, percent, tone, done, total, understandingOnly, provisional }) => (
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
                <strong>{subjectLabel(subject.name, language)}</strong>
                <b>{percent === null ? "—" : `${percent}%`}</b>
              </span>
              <span className="pArrow" aria-hidden="true">
                {"›"}
              </span>
              <span
                className="pTrack small"
                role={percent === null ? undefined : "progressbar"}
                aria-label={`${subjectLabel(subject.name, language)}: ${t.mastered}`}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={percent ?? undefined}
              >
                <span style={{ width: `${percent ?? 0}%` }} />
              </span>
              <span className="pCardMeta">
                <span className={`pChip ${tone}`}>{t[tone]}</span>
                <small>{done} / {total} {t.mastered}</small>
              </span>
              <div style={{ gridColumn: "1 / -1", minWidth: 0 }}>
                <ProgressBreakdown language={language} full={done} understandingOnly={understandingOnly} provisional={provisional} />
              </div>
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
                <b>{row.done} / {row.total} {t.mastered}</b>
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
                <b>{row.done} / {row.total} {t.mastered}</b>
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
        .pMastery {
          display: grid;
          gap: 8px;
          padding: 14px 16px;
          border: 1px solid var(--filumire-border);
          border-radius: 16px;
          background: #ffffff;
        }

        .pMasteryHead {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
        }

        .pMasteryHead strong {
          display: block;
          color: var(--filumire-navy);
          font-size: 16px;
          font-weight: 800;
        }

        .pMasteryHead small {
          display: block;
          margin-top: 2px;
          color: #3d5a78;
          font-size: 13px;
          line-height: 1.4;
        }

        .pMasteryHead b {
          color: var(--filumire-navy);
          font-size: 22px;
          font-weight: 800;
        }

        .pMasteryMeta {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          color: #3d5a78;
          font-size: 13px;
        }

        .pMastery p {
          margin: 0;
          color: #3d5a78;
          font-size: 14px;
          line-height: 1.45;
        }

        .pMastery :global(.pMasteryLink) {
          justify-self: start;
          color: #0b7bff;
          font-size: 14px;
          font-weight: 800;
          text-decoration: none;
        }

        /* Phones first: one column, white cards, nothing positioned over text. */
        .progressPage {
          display: flex;
          flex: 1;
          flex-direction: column;
          gap: 12px;
        }

        .pHero {
          position: relative;
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          align-items: end;
          column-gap: 12px;
          padding: 8px 0 0 4px;
        }

        .pHero h1 {
          margin: 0;
          color: var(--filumire-navy);
          font-size: 28px;
          line-height: 1.15;
          font-weight: 800;
        }

        .pHero p {
          margin: 6px 0 0;
          color: #3d5a78;
          font-size: 15px;
          line-height: 1.4;
        }

        .pHero img {
          grid-column: 2;
          grid-row: 1 / span 2;
          width: auto;
          height: 84px;
        }

        /* The decorative bubble only appears where there is room beside the title. */
        .pBubble {
          position: absolute;
          top: 0;
          right: 70px;
          display: none;
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
          grid-template-columns: 44px minmax(0, 1fr);
          align-items: center;
          gap: 12px;
          padding: 14px 16px;
          border: 1px solid #dbe6f0;
          border-radius: 16px;
          background: #ffffff;
        }

        .pOverallBar {
          grid-column: 1 / -1;
        }

        .pOverallIcon {
          display: grid;
          width: 44px;
          height: 44px;
          place-items: center;
          border-radius: 50%;
          background: #e8f2fc;
        }

        .pOverallIcon svg {
          width: 24px;
          height: 24px;
          fill: #0b7bff;
        }

        .pOverallText strong {
          display: block;
          color: var(--filumire-navy);
          font-size: 16px;
          line-height: 1.25;
        }

        .pOverallText small {
          color: #4a6580;
          font-size: 13px;
        }

        .pOverallBar b {
          display: block;
          color: var(--filumire-navy);
          font-size: 22px;
          line-height: 1;
        }

        .pOverallBar small {
          display: block;
          margin-top: 6px;
          color: #4a6580;
          font-size: 13px;
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
          flex-wrap: wrap;
          align-items: baseline;
          justify-content: space-between;
          gap: 4px 12px;
          margin-bottom: 8px;
        }

        .pHead h2 {
          margin: 0;
          color: var(--filumire-navy);
          font-size: 20px;
          font-weight: 800;
        }

        .pHead :global(a) {
          color: #0b7bff;
          font-size: 14px;
          font-weight: 700;
          text-decoration: none;
        }

        .pGrid {
          display: grid;
          grid-template-columns: minmax(0, 1fr);
          gap: 10px;
        }

        /* Icon, name and percentage on one row; bar and status underneath at full width. */
        .pGrid :global(.pCard) {
          display: grid;
          grid-template-columns: 40px minmax(0, 1fr) auto;
          gap: 10px;
          align-items: center;
          padding: 12px 14px;
          border: 1px solid #dbe6f0;
          border-radius: 16px;
          background: #ffffff;
          color: inherit;
          text-decoration: none;
        }

        .pIcon {
          display: grid;
          width: 40px;
          height: 40px;
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
          gap: 8px;
        }

        /* Full subject name, wrapping between words only. */
        .pCardName strong {
          min-width: 0;
          color: var(--filumire-navy);
          font-size: 16px;
          line-height: 1.25;
          overflow-wrap: normal;
          hyphens: manual;
        }

        .pCardName b {
          flex: 0 0 auto;
          color: var(--filumire-navy);
          font-size: 16px;
        }

        .pTrack.small {
          grid-column: 1 / -1;
          height: 8px;
          margin-top: 0;
        }

        .pCardMeta {
          display: flex;
          grid-column: 1 / -1;
          flex-wrap: wrap;
          align-items: center;
          justify-content: space-between;
          gap: 6px 12px;
          min-width: 0;
        }

        .pCardMeta small {
          color: #4a6580;
          font-size: 13px;
          line-height: 1.35;
          white-space: nowrap;
        }

        .pChip {
          justify-self: start;
          padding: 3px 10px;
          border-radius: 8px;
          font-size: 12px;
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
          color: var(--filumire-navy);
          font-size: 22px;
          line-height: 1;
        }

        .pGrowing {
          position: relative;
          display: grid;
          grid-template-columns: 40px minmax(0, 1fr);
          align-items: center;
          gap: 8px 12px;
          padding: 14px 16px;
          border: 1px solid #cfe9d8;
          border-left: 5px solid #22a85a;
          border-radius: 16px;
          background: #ffffff;
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
          font-size: 16px;
        }

        .pGrowing p {
          margin: 4px 0 0;
          color: #3d5a78;
          font-size: 14px;
          line-height: 1.45;
        }

        /* On phones the handwritten note sits on its own line below the text. */
        .pGrowNote {
          display: flex;
          grid-column: 1 / -1;
          flex-wrap: wrap;
          gap: 0 5px;
          color: #1a6fd1;
          font-family: var(--font-hand), cursive;
          font-size: 15px;
          line-height: 1.2;
        }

        .pLists {
          display: grid;
          grid-template-columns: minmax(0, 1fr);
          gap: 12px;
        }

        .pList {
          padding: 14px 16px;
          border: 1px solid #dbe6f0;
          border-radius: 16px;
          background: #ffffff;
        }

        .pList.strengths {
          border-top: 5px solid #22a85a;
        }

        .pList.focus {
          border-top: 5px solid #0b7bff;
        }

        .pList strong {
          display: block;
          color: var(--filumire-navy);
          font-size: 16px;
        }

        .pList small {
          display: block;
          margin-top: 2px;
          color: #4a6580;
          font-size: 13px;
          line-height: 1.35;
        }

        .pList ol {
          margin: 8px 0 0;
          padding: 0;
          list-style: none;
        }

        .pList li {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 4px 10px;
          padding: 4px 0;
          color: var(--filumire-navy);
          font-size: 14px;
          line-height: 1.4;
        }

        .pList li span {
          flex: 1 1 8em;
          min-width: 0;
        }

        .pList li b {
          font-size: 13px;
          white-space: nowrap;
        }

        .pList li i {
          display: grid;
          width: 22px;
          height: 22px;
          flex: 0 0 22px;
          place-items: center;
          border-radius: 50%;
          color: #ffffff;
          font-size: 11px;
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
          grid-template-columns: 30px minmax(0, 1fr);
          align-items: start;
          gap: 4px 10px;
          padding: 14px 16px;
          border: 1px solid #e2dbf6;
          border-left: 5px solid #9b86e8;
          border-radius: 16px;
          background: #ffffff;
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
          font-size: 14px;
          line-height: 1.5;
        }

        .pQuote b {
          grid-column: 2;
          justify-self: end;
          color: #3d3a66;
          font-size: 13px;
        }

        /* Large phones: two cards per row once each has room for its full name. */
        @media (min-width: 560px) {
          .pGrid,
          .pLists {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        /* Tablet: same order, roomier cards and readable text */
        @media (min-width: 768px) {
          .progressPage {
            gap: 14px;
          }

          .pHero {
            min-height: 128px;
          }

          .pHero h1 {
            font-size: 34px;
          }

          .pHero p {
            max-width: 340px;
            font-size: 16px;
          }

          .pHero img {
            height: 124px;
          }

          .pBubble {
            display: flex;
            right: 120px;
            width: 118px;
            height: 92px;
            font-size: 16px;
          }

          .pOverall {
            grid-template-columns: 56px minmax(0, 1fr) minmax(0, 1.4fr);
            column-gap: 16px;
            padding: 16px 20px;
            border-radius: 18px;
          }

          .pOverallBar {
            grid-column: auto;
          }

          .pOverallIcon {
            width: 56px;
            height: 56px;
          }

          .pOverallText strong {
            font-size: 18px;
          }

          .pOverallText small,
          .pOverallBar small {
            font-size: 13px;
          }

          .pOverallBar b {
            font-size: 26px;
          }

          .pTrack {
            height: 10px;
          }

          .pHead h2 {
            font-size: 22px;
          }

          .pHead :global(a) {
            font-size: 14px;
          }

          .pGrid {
            gap: 12px;
          }

          .pGrid :global(.pCard) {
            grid-template-columns: 44px minmax(0, 1fr) auto;
            column-gap: 12px;
            row-gap: 10px;
            padding: 14px 16px;
            border-radius: 16px;
          }

          .pIcon {
            width: 44px;
            height: 44px;
          }

          .pIcon :global(svg) {
            width: 26px;
            height: 26px;
          }

          .pCardName strong,
          .pCardName b {
            font-size: 15px;
          }

          .pChip {
            font-size: 12px;
          }

          .pGrowing {
            grid-template-columns: 48px minmax(0, 1fr);
            padding: 16px 20px;
            border-radius: 18px;
          }

          .pSprout {
            width: 48px;
            height: 48px;
          }

          .pGrowing strong {
            font-size: 17px;
          }

          .pGrowing p {
            font-size: 13px;
          }

          .pLists {
            gap: 12px;
          }

          .pList {
            padding: 16px;
            border-radius: 18px;
          }

          .pList strong {
            font-size: 16px;
          }

          .pList small {
            font-size: 12px;
          }

          .pList li {
            gap: 10px;
            padding: 5px 0;
            font-size: 14px;
          }

          .pList li b {
            font-size: 14px;
          }

          .pList li i {
            width: 22px;
            height: 22px;
            flex-basis: 22px;
            font-size: 11px;
          }

          .pQuote {
            grid-template-columns: 40px minmax(0, 1fr);
            padding: 16px 20px;
            border-radius: 18px;
          }

          .pQuote p,
          .pQuote b {
            font-size: 14px;
          }
        }

        /* Laptop and desktop: subjects beside growth and focus lists */
        @media (min-width: 1024px) {
          .progressPage {
            display: grid;
            grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr);
            grid-template-areas:
              "hero hero"
              "overall overall"
              "mastery mastery"
              "subjects growing"
              "subjects lists"
              "quote quote"
              "footer footer";
            grid-template-rows: auto auto auto auto auto auto 1fr;
            gap: 20px 24px;
            align-items: start;
          }

          .pHero {
            grid-area: hero;
            padding-top: 0;
          }

          .pMastery {
            grid-area: mastery;
          }

          .progressPage > .fState {
            grid-column: 1 / -1;
          }

          .pHero h1 {
            font-size: 36px;
          }

          .pHero img {
            right: 12px;
          }

          .pOverall {
            grid-area: overall;
          }

          .pSubjects {
            grid-area: subjects;
          }

          .pGrid {
            grid-template-columns: minmax(0, 1fr);
          }

          .pGrowing {
            grid-area: growing;
            padding: 14px 16px;
          }

          .pGrowNote {
            position: static;
            grid-column: 1 / -1;
            flex-direction: row;
            flex-wrap: wrap;
            gap: 0 5px;
            width: auto;
            margin-top: 8px;
            transform: none;
          }

          .pLists {
            grid-area: lists;
            grid-template-columns: minmax(0, 1fr);
          }

          .pQuote {
            grid-area: quote;
          }

          .homeFooter {
            grid-area: footer;
            align-self: end;
          }
        }

        @media (min-width: 1280px) {
          .progressPage {
            column-gap: 32px;
          }

          .pGrid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .pGrid :global(.pCard) {
            min-height: 132px;
            align-content: center;
          }
        }
      `}</style>
    </div>
  );
}
