"use client";

import { LearnerHeader } from "../../components/filumire/LearnerHeader";
import { useLearnerAvatar } from "../../components/filumire/avatars";
import { fetchLearningOverview, type LearningOverview } from "../../services/learning-client";
import { findFilumireSubject, subjectLabel, toFilumireSubjects } from "../../components/filumire/subjects";
import { LearnerBottomNav } from "../../components/filumire/LearnerBottomNav";

import { useEffect, useState } from "react";

import {
  fetchLearningSession,
  getSessionId,
  isPendingTeacherReviewResponse,
  acknowledgeLearningStep,
  LearningNetworkError,
  LearningRequestError,
  submitAssessmentResponse,
  type LearningResponse,
} from "../../services/learning-client";

import {
  getConnectivityStatus,
  initConnectivityListeners,
  markConnected,
  markOffline,
  markReconnecting,
  subscribeConnectivity,
  type ConnectivityStatus,
} from "../../services/connectivity";

import {
  clearPendingSubmission,
  readPendingSubmission,
  writePendingSubmission,
  type PendingAssessmentSubmission,
} from "../../services/pending-submission";

function parseOptions(
  value?: string,
): string[] {
  if (!value) {
    return [];
  }

  try {
    const parsed = JSON.parse(value);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .filter(
        (item): item is string =>
          typeof item === "string",
      )
      .map((item) => item.trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

const FR_TEXT: Record<string, string> = {
  "Let\u2019s understand": "Comprenons",
  "Let\u2019s practise": "Entra\u00eenons-nous",
  "Let\u2019s apply": "Appliquons",
  "Let\u2019s check": "V\u00e9rifions",
  "Let\u2019s reflect": "R\u00e9fl\u00e9chissons",
  Understand: "D\u00e9couvrir",
  Practise: "S'exercer",
  Apply: "Appliquer",
  Check: "V\u00e9rifier",
  Reflect: "R\u00e9fl\u00e9chir",
  "Next:": "Suivant :",
  "Let's learn this together.": "Apprenons \u00e7a ensemble.",
  "Let's practise what you have learned.": "Pratiquons ce que tu as appris.",
  "Let's work through this step by step.": "Avan\u00e7ons pas \u00e0 pas.",
  "Let's look at this another way.": "Voyons \u00e7a autrement.",
  "Let's check what you understand now.": "V\u00e9rifions ce que tu comprends maintenant.",
  "Let's find out what you already know.": "Voyons ce que tu sais d\u00e9j\u00e0.",
  "Let's see what you remember.": "Voyons ce dont tu te souviens.",
  "Let's see if you can use it somewhere new.": "Voyons si tu peux l'utiliser ailleurs.",
  "You are ready for the next step.": "Tu es pr\u00eat pour la prochaine \u00e9tape.",
  "You have completed this learning sequence.": "Tu as termin\u00e9 cette s\u00e9quence d'apprentissage.",
  "You have done all you can here for now.": "Tu as fait tout ce que tu pouvais ici pour l'instant.",
  "Some topics need a little more help before you can go on. Your teacher can see which ones. Come back later to try them again.": "Certains sujets demandent un peu plus d'aide avant de continuer. Ton enseignant peut voir lesquels. Reviens plus tard pour les essayer à nouveau.",
  "You have worked through the learning sequence and demonstrated the required understanding.": "Tu as parcouru la séquence d'apprentissage et montré la compréhension demandée.",
  "Let's keep learning.": "Continuons \u00e0 apprendre.",
  "Continue learning": "Continuer d'apprendre",
  "Continue practising": "Continuer l'entra\u00eenement",
  Continue: "Continuer",
  "Try again": "R\u00e9essayer",
  Start: "Commencer",
  "Continue to the next step": "Passer \u00e0 l'\u00e9tape suivante",
  Correct: "Correct",
  "Not quite": "Pas tout \u00e0 fait",
  "Partly correct": "En partie correct",
  "Answer recorded": "R\u00e9ponse enregistr\u00e9e",
  "Well done. FILUMIRE has recorded this as successful evidence.": "Bravo. FILUMIRE l'a enregistr\u00e9 comme une r\u00e9ussite.",
  "That answer was not correct. FILUMIRE will use this evidence to decide what you need next.": "Cette r\u00e9ponse n'\u00e9tait pas correcte. FILUMIRE s'en servira pour choisir la suite.",
  "You have part of it right. FILUMIRE will use this evidence to guide what comes next.": "Tu as une partie de la bonne r\u00e9ponse. FILUMIRE s'en servira pour guider la suite.",
  "Your response has been recorded.": "Ta r\u00e9ponse a \u00e9t\u00e9 enregistr\u00e9e.",
  "Preparing your learning session...": "Pr\u00e9paration de ta s\u00e9ance...",
};

function tr(language: string, text: string): string {
  return language === "fr" ? (FR_TEXT[text] ?? text) : text;
}

function actionLabel(
  action: string,
): string {
  switch (action) {
    case "teach":
      return "Let's learn this together.";

    case "practice":
      return "Let's practise what you have learned.";

    case "scaffold":
      return "Let's work through this step by step.";

    case "remediate":
      return "Let's look at this another way.";

    case "reassess":
      return "Let's check what you understand now.";

    case "diagnose":
      return "Let's find out what you already know.";

    case "retention_check":
      return "Let's see what you remember.";

    case "transfer_check":
      return "Let's see if you can use it somewhere new.";

    case "advance":
      return "You are ready for the next step.";

    case "complete":
      return "You have completed this learning sequence.";

    default:
      return "Let's keep learning.";
  }
}

function buttonLabel(
  action: string,
): string {
  switch (action) {
    case "teach":
      return "Continue learning";

    case "practice":
      return "Continue practising";

    case "scaffold":
      return "Continue";

    case "remediate":
      return "Continue";

    case "reassess":
      return "Try again";

    case "diagnose":
      return "Start";

    case "retention_check":
      return "Continue";

    case "transfer_check":
      return "Continue";

    case "advance":
      return "Continue to the next step";

    default:
      return "Continue";
  }
}

function feedbackTitle(
  outcome: string,
): string {
  switch (outcome) {
    case "correct":
      return "Correct";

    case "incorrect":
      return "Not quite";

    case "partial":
      return "Partly correct";

    default:
      return "Answer recorded";
  }
}

function feedbackMessage(
  outcome: string,
): string {
  switch (outcome) {
    case "correct":
      return "Well done. FILUMIRE has recorded this as successful evidence.";

    case "incorrect":
      return "That answer was not correct. FILUMIRE will use this evidence to decide what you need next.";

    case "partial":
      return "You have part of it right. FILUMIRE will use this evidence to guide what comes next.";

    default:
      return "Your response has been recorded.";
  }
}

function feedbackIcon(
  outcome: string,
): string {
  switch (outcome) {
    case "correct":
      return "\u2713";

    case "incorrect":
      return "\u2715";

    case "partial":
      return "\u2022";

    default:
      return "\u2022";
  }
}

function BulbIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9 18h6M10 21h4" />
      <path d="M12 3a6 6 0 0 0-3.6 10.8c.6.5 1 1.2 1 2V16h5.2v-.2c0-.8.4-1.5 1-2A6 6 0 0 0 12 3Z" />
    </svg>
  );
}

function CalculatorIcon() {
  return (
    <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="5" y="2.5" width="14" height="19" rx="2.5" />
      <rect x="8" y="5.5" width="8" height="3.5" rx="0.8" />
      <path d="M8.5 13h.01M12 13h.01M15.5 13h.01M8.5 16h.01M12 16h.01M15.5 16h.01M8.5 19h.01M12 19h.01M15.5 19h.01" strokeWidth="2.4" />
    </svg>
  );
}

function LessonVisual({ topic }: { topic: string }) {
  if (!/equivalent fraction/i.test(topic)) {
    return null;
  }

  return (
    <svg
      className="lessonVisual" style={{ display: "block", width: "auto", height: 92, margin: "4px auto 2px" }}
      viewBox="0 0 260 150"
      role="img"
      aria-label="One half is equal to two quarters"
    >
      <circle cx="55" cy="42" r="38" fill="#e8f2fd" stroke="#0f2a6b" strokeWidth="2.5" />
      <path d="M55 4 A38 38 0 0 0 55 80 Z" fill="#2f8cf0" />
      <path d="M55 4 V80" stroke="#0f2a6b" strokeWidth="2.5" />
      <circle cx="55" cy="42" r="38" fill="none" stroke="#0f2a6b" strokeWidth="2.5" />
      <rect x="118" y="36" width="24" height="5" rx="2" fill="#0f2a6b" />
      <rect x="118" y="46" width="24" height="5" rx="2" fill="#0f2a6b" />
      <circle cx="205" cy="42" r="38" fill="#ffffff" />
      <path d="M205 42 V4 A38 38 0 0 0 167 42 Z" fill="#2f8cf0" />
      <path d="M205 4 V80 M167 42 H243" stroke="#0f2a6b" strokeWidth="2.5" />
      <circle cx="205" cy="42" r="38" fill="none" stroke="#0f2a6b" strokeWidth="2.5" />
      <g fill="#0f2a6b" fontSize="24" fontWeight="800" textAnchor="middle">
        <text x="55" y="106">1</text>
        <text x="55" y="140">2</text>
        <text x="205" y="106">2</text>
        <text x="205" y="140">4</text>
      </g>
      <path d="M40 114 H70 M190 114 H220" stroke="#0f2a6b" strokeWidth="2" />
    </svg>
  );
}

export default function LearnPage() {
  const [learnOverview, setLearnOverview] = useState<LearningOverview | null>(null);
  const [language, setLanguage] = useState<"en" | "fr">("en");
  const learnerAvatar = useLearnerAvatar();

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("lang") === "fr") {
      setLanguage("fr");
    }
  }, []);
  useEffect(() => { let alive = true; fetchLearningOverview(new URLSearchParams(window.location.search).get("subjectId") || undefined).then((r) => { if (alive) setLearnOverview(r); }); return () => { alive = false; }; }, []);
  const [data, setData] =
    useState<LearningResponse | null>(null);

  const [selectedResponse, setSelectedResponse] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  const [submitting, setSubmitting] =
    useState(false);

  const [error, setError] =
    useState("");

  const [assessmentFeedback, setAssessmentFeedback] =
    useState<string | null>(null);

  const [connectivity, setConnectivity] =
    useState<ConnectivityStatus>(
      getConnectivityStatus(),
    );

  const [pending, setPending] =
    useState<PendingAssessmentSubmission | null>(
      null,
    );

  const [syncing, setSyncing] =
    useState(false);

  const [syncError, setSyncError] =
    useState("");

  async function loadLearning() {
    setLoading(true);
    setError("");
    setAssessmentFeedback(null);

    try {
      const result =
        await fetchLearningSession(
          new URLSearchParams(window.location.search)
            .get("subjectId") ?? undefined,
        );

      setData(result);
      setSelectedResponse("");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load the learning session.",
      );
    } finally {
      setLoading(false);
    }
  }

  /*
   * Next on a teaching card (Tranche 4B): acknowledge it so the
   * engine can move on. Only this explicit press counts; loading
   * or refreshing the page never does.
   */
  async function continueLearning() {
    const interventionId =
      data?.decision.interventionId;

    if (
      !data ||
      !interventionId ||
      data.content?.assessmentItemId
    ) {
      await loadLearning();
      return;
    }

    setSubmitting(true);
    setError("");
    setAssessmentFeedback(null);

    try {
      const result =
        await acknowledgeLearningStep({
          sessionId: getSessionId(data),
          interventionId,
          competencyId:
            data.decision.competencyId,
        });

      setData(result);
      setSelectedResponse("");
    } catch (err) {
      if (
        err instanceof LearningRequestError &&
        err.status === 409
      ) {
        await loadLearning();
        return;
      }

      setError(
        err instanceof Error
          ? err.message
          : "Unable to continue.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function attemptSync(
    item: PendingAssessmentSubmission,
  ) {
    setSyncing(true);
    setSyncError("");
    markReconnecting();

    try {
      const result =
        await submitAssessmentResponse({
          learnerId: item.learnerId,
          sessionId: item.sessionId,
          interventionId: item.interventionId,
          assessmentItemId: item.assessmentItemId,
          competencyId: item.competencyId,
          response: item.response,
          clientRequestId: item.clientRequestId,
        });

      clearPendingSubmission();
      setPending(null);
      markConnected();

      if (isPendingTeacherReviewResponse(result)) {
        setAssessmentFeedback("pending-review");
        setSelectedResponse("");
        return;
      }

      setAssessmentFeedback(
        result.assessment
          ? result.assessment.result.correct
            ? "correct"
            : "incorrect"
          : null,
      );

      setData(result);
      setSelectedResponse("");
    } catch (err) {
      if (err instanceof LearningNetworkError) {
        markOffline();
        setSyncError(
          "Still unable to reach the server. Your answer is safely waiting and will be sent automatically when you're back online.",
        );
      } else {
        markConnected();
        setSyncError(
          err instanceof Error
            ? err.message
            : "Unable to send your waiting answer yet.",
        );
      }
    } finally {
      setSyncing(false);
    }
  }

  async function submitAssessment() {
    if (
      !data?.content?.assessmentItemId ||
      !selectedResponse
    ) {
      return;
    }

    setSubmitting(true);
    setError("");

    const submissionBody = {
      learnerId: data.learnerState.learnerId,
      sessionId: getSessionId(data),
      interventionId: data.decision.interventionId,
      assessmentItemId: data.content.assessmentItemId,
      competencyId: data.decision.competencyId,
      response: selectedResponse,
      clientRequestId:
        typeof crypto !== "undefined" &&
        "randomUUID" in crypto
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random()}`,
    };

    try {
      const result =
        await submitAssessmentResponse(
          submissionBody,
        );

      markConnected();

      /*
       * Preserve the assessment result while
       * FILUMIRE advances to the next adaptive
       * instructional response.
       *
       * The API returns:
       *
       * assessment.result.correct
       *
       * alongside the next decision/content.
       */
      if (isPendingTeacherReviewResponse(result)) {
        setAssessmentFeedback("pending-review");
        setSelectedResponse("");
        return;
      }

      if (result.assessment) {
        setAssessmentFeedback(
          result.assessment.result.correct
            ? "correct"
            : "incorrect",
        );
      } else {
        setAssessmentFeedback(null);
      }

      setData(result);
      setSelectedResponse("");
    } catch (err) {
      if (err instanceof LearningNetworkError) {
        // A connectivity failure never marks correctness,
        // updates mastery, or creates evidence locally. The
        // answer is only preserved for a trusted server retry.
        const queued: PendingAssessmentSubmission = {
          ...submissionBody,
          queuedAt: new Date().toISOString(),
        };

        writePendingSubmission(queued);
        setPending(queued);
        markOffline();
      } else {
        setError(
          err instanceof Error
            ? err.message
            : "Unable to submit your answer.",
        );
      }
    } finally {
      setSubmitting(false);
    }
  }

  useEffect(() => {
    loadLearning();

    const storedPending = readPendingSubmission();
    if (storedPending) {
      setPending(storedPending);

      if (getConnectivityStatus() !== "offline") {
        attemptSync(storedPending);
      }
    }

    const unsubscribe = subscribeConnectivity(
      setConnectivity,
    );
    const removeConnectivityListeners =
      initConnectivityListeners();

    setConnectivity(getConnectivityStatus());

    return () => {
      removeConnectivityListeners();
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (
      connectivity === "reconnecting" &&
      pending &&
      !syncing
    ) {
      attemptSync(pending);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connectivity]);

  if (loading) {
    return (
      <main className="page">
        <div className="shell">
          <header className="header">
            <div className="brand">
              FILUMIRE
            </div>
          </header>

          <section className="card loading-card">
            <div className="loader" />

            <p>
              Preparing your learning session...
            </p>
          </section>
        </div>

        <style jsx>{`
          .page {
            min-height: 100vh;
            background: #f6f3ed;
            color: #171717;
            font-family:
              Arial,
              Helvetica,
              sans-serif;
          }

          .shell {
            width: min(860px, calc(100% - 32px));
            margin: 0 auto;
            padding: 28px 0 64px;
          }

          .header {
            display: flex;
            align-items: baseline;
            gap: 10px;
            padding: 8px 0 28px;
          }

          .brand {
            font-size: 28px;
            font-weight: 800;
            letter-spacing: 0.04em;
          }

          .brand-subtitle {
            font-size: 16px;
            color: #666;
          }

          .card {
            background: white;
            border: 1px solid #dedbd4;
            border-radius: 18px;
            padding: 42px;
            box-shadow:
              0 8px 30px rgba(0, 0, 0, 0.04);
          }

          .loading-card {
            min-height: 260px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 18px;
          }

          .loader {
            width: 30px;
            height: 30px;
            border: 3px solid #ddd;
            border-top-color: #171717;
            border-radius: 50%;
            animation: spin 0.8s linear infinite;
          }

          @keyframes spin {
            to {
              transform: rotate(360deg);
            }
          }

          @media (max-width: 600px) {
            .shell {
              width: min(
                100% - 20px,
                860px
              );
              padding-top: 18px;
            }

            .card {
              padding: 26px 20px;
            }
          }
        `}</style>
      </main>
    );
  }

  if (error) {
    return (
      <main className="page">
        <div className="shell">
          <header className="header">
            <div className="brand">
              FILUMIRE
            </div>
          </header>

          <section className="card error-card">
            <h1>
              Something went wrong
            </h1>

            <p>{error}</p>

            <button
              onClick={loadLearning}
              disabled={loading}
              className="primary-button"
            >
              Try again
            </button>
          </section>
        </div>

        <style jsx>{`
          .page {
            min-height: 100vh;
            background: #f6f3ed;
            color: #171717;
            font-family:
              Arial,
              Helvetica,
              sans-serif;
          }

          .shell {
            width: min(860px, calc(100% - 32px));
            margin: 0 auto;
            padding: 28px 0 64px;
          }

          .header {
            display: flex;
            align-items: baseline;
            gap: 10px;
            padding: 8px 0 28px;
          }

          .brand {
            font-size: 28px;
            font-weight: 800;
            letter-spacing: 0.04em;
          }

          .brand-subtitle {
            font-size: 16px;
            color: #666;
          }

          .card {
            background: white;
            border: 1px solid #dedbd4;
            border-radius: 18px;
            padding: 42px;
            box-shadow:
              0 8px 30px rgba(0, 0, 0, 0.04);
          }

          h1 {
            margin: 0 0 12px;
            font-size: 30px;
          }

          p {
            line-height: 1.65;
            color: #4d4d4d;
          }

          .primary-button {
            margin-top: 18px;
            padding: 13px 22px;
            border: 0;
            border-radius: 10px;
            background: #171717;
            color: white;
            font-size: 16px;
            cursor: pointer;
          }

          @media (max-width: 600px) {
            .shell {
              width: min(
                100% - 20px,
                860px
              );
            }

            .card {
              padding: 26px 20px;
            }
          }
        `}</style>
      </main>
    );
  }

  if (!data) {
    return null;
  }

  const options =
    parseOptions(
      data.content?.metadata?.options,
    );
  const learnStat = learnOverview?.subjects[data?.progress.subjectId ?? ""];
  const learnSubject = findFilumireSubject(toFilumireSubjects(learnOverview?.availableSubjects), data?.progress.subjectId);
  const progressPercent = learnStat && learnStat.total > 0 ? Math.round((learnStat.completed / learnStat.total) * 100) : data ? Math.max(0, Math.min(100, data.progress.percent)) : 0;

  const competency =
    data.learnerState.competencies.find(
      (item) =>
        item.competencyId ===
        data.decision.competencyId,
    );

  const action =
    data.decision.action;

  const isComplete =
    action === "complete";

  /*
   * Tranche 4C: "complete" because every remaining topic needs
   * support (content ran out), not because the subject is finished.
   */
  const needsSupportPause =
    isComplete &&
    (data.decision.reasonCode ===
      "NO_ELIGIBLE_COMPETENCY_NEEDS_SUPPORT" ||
      data.decision.reasonCode ===
        "CONTENT_EXHAUSTED_NEEDS_SUPPORT");

  const requiresTrustedEvaluation =
    data.content?.metadata?.evaluationMethod ===
      "trusted_rubric_evaluation" ||
    data.content?.metadata?.expectedResponse ===
      "rubric_evaluated_performance";

  const hasAssessment =
    Boolean(data.content?.assessmentItemId) &&
    options.length > 0 &&
    !requiresTrustedEvaluation;

  const showContinue =
    Boolean(data.content) &&
    !hasAssessment &&
    !requiresTrustedEvaluation &&
    !isComplete;

  const learningStages = [
    "Understand",
    "Practise",
    "Apply",
    "Check",
    "Reflect",
  ] as const;

  const teachView = showContinue && action !== "diagnose";

  const currentStage =
    action === "practice" ||
    action === "scaffold" ||
    action === "remediate"
      ? 1
      : action === "transfer_check"
        ? 2
        : action === "reassess" ||
            action === "retention_check"
          ? 3
          : action === "advance" ||
              action === "complete"
            ? 4
            : 0;

  return (
    <main className="page">
      <div className="shell">
        <LearnerHeader
          backHref="/dashboard"
          showAskFilu={true} setupHeader language={language}
        />

        <div className="learnBody">
          <section className="learnBanner">
            <span className="bannerIcon">
              <CalculatorIcon />
            </span>
            <div className="bannerText">
              <h1>{subjectLabel(learnSubject?.name ?? data.progress.subjectName ?? "Learning", language)}</h1>
              <p>
                {data.progress.competencyTitle ??
                  data.content?.title ??
                  "Your learning session"}
              </p>
            </div>
            <strong>{progressPercent}%</strong>
            <div
              className="progress-track"
              role="progressbar"
              aria-label="Learning progress"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={progressPercent}
            >
              <div
                className="progress-fill"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </section>

          <nav className="learningStages" aria-label="Learning stages">
            {learningStages.map((stage, index) => (
              <div
                key={stage}
                className={`learningStage ${
                  index === currentStage
                    ? "active"
                    : index < currentStage
                      ? "complete"
                      : ""
                }`}
              >
                <span className="stageDot">
                  {index < currentStage ? "\u2713" : index + 1}
                </span>
                <span className="stageName">{tr(language, stage)}</span>
              </div>
            ))}
          </nav>

        {connectivity === "offline" && !pending && (
          <div
            className="connectivity-banner offline"
            role="status"
            aria-live="polite"
          >
            You&apos;re offline. You can keep reading,
            and answers will be sent once you&apos;re
            back online.
          </div>
        )}

        {pending && (
          <div
            className="connectivity-banner pending"
            role="status"
            aria-live="polite"
          >
            <div>
              {syncing
                ? "Sending your waiting answer..."
                : "Your answer is waiting to be sent. It hasn't been checked yet."}
            </div>

            {!syncing && (
              <button
                type="button"
                onClick={() => attemptSync(pending)}
                className="secondary-button"
              >
                Retry now
              </button>
            )}

            {syncError && (
              <div className="connectivity-banner-error">
                {syncError}
              </div>
            )}
          </div>
        )}

        <section className={`lessonPanel${teachView ? " teach" : ""}`}>
          {!teachView && (
            <div className="lessonHero">
              <small>{tr(language, "Let\u2019s " + learningStages[currentStage].toLowerCase())}</small>
              <h1>{tr(language, needsSupportPause ? "You have done all you can here for now." : actionLabel(action))}</h1>
              <img
                src={learnerAvatar}
                alt=""
              />
            </div>
          )}

        <section className="card">
          {teachView && (
            <span className="lessonPill">
              {tr(language, "Let\u2019s " + learningStages[currentStage].toLowerCase())}
            </span>
          )}

          {assessmentFeedback && (
            <div
              className={`assessment-feedback ${assessmentFeedback}`}
              role="status"
              aria-live="polite"
            >
              <div
                className="feedback-icon"
                aria-hidden="true"
              >
                {feedbackIcon(
                  assessmentFeedback,
                )}
              </div>

              <div className="feedback-content">
                <div className="feedback-title">
                  {tr(language, feedbackTitle(assessmentFeedback))}
                </div>

                <div className="feedback-message">
                  {tr(language, feedbackMessage(assessmentFeedback))}
                </div>
              </div>
            </div>
          )}

          {data.content && (
            <>
              <h2>
                {data.content.title}
              </h2>

              <div className="lesson-body">
                {data.content.body}
              </div>

              {teachView && (
                <LessonVisual
                  topic={`${data.progress.competencyTitle ?? ""} ${data.content.title}`}
                />
              )}
            </>
          )}

          {data.instruction?.structured?.elements?.length ? (
            <div className="tutor-message">
              <span className="tipIcon" aria-hidden="true">
                <BulbIcon />
              </span>
              <div className="instruction-elements">
                {/* A response prompt ("Give a short answer ...") only makes sense when there is a question to answer; teaching cards only have Next. */}
                {data.instruction.structured.elements.filter((element) => element.text.trim() !== (data.content?.body ?? "").trim() && (hasAssessment || element.type !== "next_prompt")).map(
                  (element, index) => (
                    <section
                      key={`${element.type}-${index}`}
                      className="instruction-element"
                    >

                      <p>{element.text}</p>
                    </section>
                  ),
                )}
              </div>
            </div>
          ) : data.instruction?.content ? (
            <div className="tutor-message">
              <span className="tipIcon" aria-hidden="true">
                <BulbIcon />
              </span>
              <p>
                {data.instruction.content}
              </p>
            </div>
          ) : null}

          {requiresTrustedEvaluation && !pending && (
            <div className="assessment">
              <div className="assessment-label">
                Your response
              </div>

              <div className="tutor-message">
                <span className="tipIcon" aria-hidden="true">
                  <BulbIcon />
                </span>
                <p>
                  Complete the activity above. Your response will be sent for teacher review before FILUMIRE uses it as learning evidence.
                </p>
              </div>

              <textarea
                className="rich-response"
                value={selectedResponse}
                onChange={(event) =>
                  setSelectedResponse(event.target.value)
                }
                placeholder="Write your response here..."
                rows={6}
                disabled={submitting}
                aria-label="Your response"
              />

              <button
                type="button"
                className="primary-button"
                onClick={submitAssessment}
                disabled={submitting || !selectedResponse.trim()}
              >
                {submitting ? "Sending..." : "Send for review"}
              </button>
            </div>
          )}

          {hasAssessment && !pending && (
            <div className="assessment">
              <div className="assessment-label">
                Your answer
              </div>

              <div className="options">
                {options.map(
                  (option, index) => (
                    <label
                      key={`${option}-${index}`}
                      className={
                        selectedResponse ===
                        option
                          ? "option selected"
                          : "option"
                      }
                    >
                      <input
                        type="radio"
                        name="answer"
                        value={option}
                        checked={
                          selectedResponse ===
                          option
                        }
                        onChange={() =>
                          setSelectedResponse(
                            option,
                          )
                        }
                        disabled={
                          submitting
                        }
                      />

                      <span className="option-text">
                        {option}
                      </span>
                    </label>
                  ),
                )}
              </div>

              <button
                onClick={
                  submitAssessment
                }
                disabled={
                  !selectedResponse ||
                  submitting
                }
                className="primary-button"
              >
                {submitting
                  ? "Checking..."
                  : "Submit answer"}
              </button>
            </div>
          )}

          {showContinue && !teachView && (
            <button
              onClick={continueLearning}
              disabled={submitting}
              className="primary-button"
            >
              {tr(language, buttonLabel(action))}
              <span className="arrow" aria-hidden="true">
                {"\u2192"}
              </span>
            </button>
          )}

          {teachView && (
            <div className="teachFoot">
              <span className="dots" aria-hidden="true">
                <i className="on" />
                <i />
                <i />
              </span>
              <img src={learnerAvatar} alt="" />
            </div>
          )}

          {isComplete && (
            <div className="complete-card">
              <div className="complete-mark">
                {"\u2713"}
              </div>

              <h2>
                {tr(
                  language,
                  needsSupportPause
                    ? "You have done all you can here for now."
                    : "You have completed this learning sequence.",
                )}
              </h2>

              <p>
                {tr(
                  language,
                  needsSupportPause
                    ? "Some topics need a little more help before you can go on. Your teacher can see which ones. Come back later to try them again."
                    : "You have worked through the learning sequence and demonstrated the required understanding.",
                )}
              </p>
            </div>
          )}

          {submitting && (
            <div className="status">
              Updating your learning session...
            </div>
          )}
        </section>
        </section>

        {teachView && (
          <button
            onClick={continueLearning}
            disabled={submitting}
            className="primary-button nextButton"
          >
            {tr(language, "Next:") + " " + tr(language, learningStages[Math.min(currentStage + 1, 4)])}
            <span className="arrow" aria-hidden="true">
              {"\u2192"}
            </span>
          </button>
        )}
        </div>

        <footer className="learnFooter">
          <img src="/images/home/landscape%20footer.png" alt="" />
        </footer>

        <LearnerBottomNav active="learning" language={language} />
      </div>

      <style jsx>{`
        .page {
          min-height: 100dvh;
          background: var(--filumire-bg);
          color: var(--filumire-text);
        }

        .shell {
          display: flex;
          width: 100%;
          max-width: 760px;
          min-height: 100dvh;
          margin: 0 auto;
          flex-direction: column;
          background: var(--filumire-surface);
        }

        .learnBody {
          display: flex;
          flex: 1;
          flex-direction: column;
          gap: 8px;
          padding: 8px 16px 8px;
        }

        .learnBanner {
          display: grid;
          grid-template-columns: 46px minmax(0, 1fr) auto;
          align-items: center;
          column-gap: 12px;
          padding: 8px 14px 10px;
          border-radius: 16px;
          background: #fdf3de;
        }

        .bannerIcon {
          display: grid;
          width: 46px;
          height: 46px;
          place-items: center;
          border-radius: 50%;
          background: #fbe3b0;
          color: #f08a00;
        }

        .bannerText h1 {
          margin: 0;
          color: var(--filumire-navy);
          font-size: 20px;
          line-height: 1.1;
          font-weight: 800;
        }

        .bannerText p {
          margin: 3px 0 0;
          color: #5b6b7a;
          font-size: 15px;
          line-height: 1.2;
        }

        .learnBanner strong {
          align-self: start;
          color: var(--filumire-navy);
          font-size: 20px;
          line-height: 1.1;
        }

        .progress-track {
          grid-column: 1 / -1;
          height: 8px;
          margin-top: 10px;
          overflow: hidden;
          border-radius: 999px;
          background: #dbe6ee;
        }

        .progress-fill {
          height: 100%;
          border-radius: inherit;
          background: var(--filumire-green);
          transition: width 220ms ease;
        }

        .learningStages {
          display: grid;
          grid-template-columns: repeat(5, minmax(0, 1fr));
          padding: 2px 0;
        }

        .learningStage {
          position: relative;
          display: flex;
          min-width: 0;
          flex-direction: column;
          align-items: center;
          gap: 5px;
          color: #7c8c9b;
          text-align: center;
          font-size: 0.7rem;
          font-weight: 700;
        }

        .learningStage:not(:last-child)::after {
          content: "";
          position: absolute;
          top: 17px;
          left: calc(50% + 19px);
          width: calc(100% - 38px);
          height: 2px;
          background: #dce5eb;
        }

        .learningStage.complete:not(:last-child)::after {
          background: #f5a00f;
        }

        .stageDot {
          position: relative;
          z-index: 1;
          display: grid;
          width: 34px;
          height: 34px;
          place-items: center;
          border-radius: 50%;
          background: #e3ebf2;
          font-size: 0.95rem;
          font-weight: 800;
        }

        .learningStage.active,
        .learningStage.complete {
          color: #f08a00;
        }

        .learningStage.active .stageDot,
        .learningStage.complete .stageDot {
          background: #f5a00f;
          color: #ffffff;
        }

        .stageName {
          overflow: hidden;
          max-width: 100%;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .offline,
        .pending {
          padding: 10px 12px;
          border-radius: 12px;
          font-size: 0.84rem;
          line-height: 1.4;
        }

        .offline {
          border: 1px solid #f0c76a;
          background: #fff8e6;
          color: #714f00;
        }

        .pending {
          border: 1px solid #b9dceb;
          background: var(--filumire-blue-soft);
          color: var(--filumire-navy);
        }

        .connectivity-banner-error {
          margin-top: 6px;
        }

        .lessonPanel {
          display: flex;
          flex: 1;
          flex-direction: column;
          padding: 0 12px 12px;
          border-radius: 18px;
          background: linear-gradient(#d6ebfa, #e9f4fc);
        }

        .lessonHero {
          position: relative;
          min-height: 112px;
          padding: 12px 0 8px 4px;
        }

        .lessonHero small {
          display: block;
          color: var(--filumire-navy);
          font-size: 14px;
        }

        .lessonHero h1 {
          position: relative;
          z-index: 1;
          max-width: 68%;
          margin: 6px 0 0;
          color: var(--filumire-navy);
          font-size: 20px;
          line-height: 1.12;
          font-weight: 800;
        }

        .lessonHero h1::after {
          content: "";
          display: block;
          width: 70px;
          height: 3px;
          margin-top: 10px;
          border-radius: 2px;
          background: #f5a00f;
          transform: rotate(-3deg);
        }

        .lessonHero img {
          position: absolute;
          right: -4px;
          bottom: 0;
          width: auto;
          height: 112px;
        }

        .card {
          display: flex;
          flex: 1;
          flex-direction: column;
          padding: 12px 14px 12px;
          border-radius: 16px;
          background: #ffffff;
          box-shadow: var(--filumire-shadow);
        }

        .card h2 {
          margin: 0 0 6px;
          color: var(--filumire-navy);
          font-size: 20px;
          line-height: 1.15;
          font-weight: 800;
        }

        .lesson-body {
          color: #4a5d70;
          font-size: 15px;
          line-height: 1.45;
        }

        .tutor-message {
          position: relative;
          min-height: 62px;
          margin: 8px 0;
          padding: 12px 12px 12px 62px;
          border-left: 4px solid #f5a00f;
          border-radius: 12px;
          background: #fdf3de;
        }

        .tutor-message p {
          margin: 0;
          color: #4a5d70;
          font-size: 14px;
          line-height: 1.4;
        }

        .instruction-element + .instruction-element {
          margin-top: 6px;
        }

        .tipIcon {
          position: absolute;
          top: 12px;
          left: 12px;
          display: grid;
          width: 38px;
          height: 38px;
          place-items: center;
          border-radius: 50%;
          background: #f58a07;
          color: #ffffff;
        }

        .assessment {
          margin-top: 4px;
        }

        .assessment-label {
          color: var(--filumire-navy);
          font-size: 0.78rem;
          font-weight: 800;
          letter-spacing: 0.06em;
          text-transform: uppercase;
        }

        .assessment-feedback {
          display: flex;
          gap: 10px;
          align-items: flex-start;
          margin-bottom: 12px;
          padding: 10px 12px;
          border: 1px solid var(--filumire-border);
          border-radius: 12px;
          background: #f7fafc;
        }

        .assessment-feedback.correct {
          border-color: #b9dfba;
          background: #f1faf1;
        }

        .assessment-feedback.incorrect {
          border-color: #efc0c0;
          background: #fff4f4;
        }

        .assessment-feedback.partial,
        .assessment-feedback.pending-review {
          border-color: #f0d29c;
          background: #fff8ea;
        }

        .feedback-icon {
          display: grid;
          flex: 0 0 auto;
          width: 30px;
          height: 30px;
          place-items: center;
          border-radius: 50%;
          background: #ffffff;
          font-weight: 900;
        }

        .feedback-title {
          color: var(--filumire-navy);
          font-weight: 800;
        }

        .feedback-message {
          margin-top: 2px;
          color: #4a5d70;
          font-size: 0.84rem;
          line-height: 1.4;
        }

        .options {
          display: grid;
          gap: 8px;
          margin: 10px 0;
        }

        .option {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          padding: 11px 12px;
          border: 1px solid var(--filumire-border);
          border-radius: 12px;
          background: #ffffff;
          color: var(--filumire-text);
          font-size: 15px;
          line-height: 1.35;
        }

        .option:has(input:checked) {
          border-color: #f58a07;
          background: #fdf3de;
        }

        .option input {
          flex: 0 0 auto;
          margin-top: 3px;
          accent-color: #f58a07;
        }

        .rich-response {
          width: 100%;
          min-height: 110px;
          margin: 10px 0;
          padding: 12px;
          resize: vertical;
          border: 1px solid var(--filumire-border);
          border-radius: 12px;
          background: #ffffff;
          color: var(--filumire-text);
          font: inherit;
          line-height: 1.45;
        }

        button {
          min-height: 46px;
          padding: 10px 16px;
          border: 0;
          border-radius: 14px;
          font: inherit;
          font-weight: 800;
          line-height: 1.2;
        }

        button:disabled {
          opacity: 0.55;
        }

        .primary-button {
          display: inline-flex;
          width: 100%;
          align-items: center;
          justify-content: center;
          gap: 10px;
          margin-top: auto;
          background: #f58a07;
          color: #ffffff;
          font-size: 18px;
        }

        .assessment .primary-button {
          margin-top: 6px;
        }

        .secondary-button {
          margin-top: 8px;
          border: 1px solid var(--filumire-border);
          background: #ffffff;
          color: var(--filumire-navy);
        }

        .complete-card {
          margin-top: 8px;
          padding: 14px;
          border: 1px solid #b9dfba;
          border-radius: 12px;
          background: #f1faf1;
        }

        .complete-mark {
          display: grid;
          width: 34px;
          height: 34px;
          place-items: center;
          border-radius: 50%;
          background: #ffffff;
          color: #257b2a;
          font-weight: 900;
        }

        .complete-card h2 {
          margin-top: 8px;
          color: #257b2a;
          font-size: 1.05rem;
        }

        .complete-card p {
          margin: 0;
          color: #4a5d70;
          line-height: 1.5;
        }

        .status {
          margin-top: 10px;
          color: var(--filumire-muted);
          font-size: 0.84rem;
          font-weight: 600;
        }

        .lessonPanel.teach {
          padding: 8px;
          background: #eaf3fc;
        }

        .lessonPanel.teach .card {
          position: relative;
          overflow: hidden;
          padding: 12px 14px 0;
          border: 1px solid #d6e6f5;
          box-shadow: none;
        }

        .lessonPill {
          align-self: flex-start;
          margin-bottom: 8px;
          padding: 5px 14px;
          border-radius: 999px;
          background: #fbe3b0;
          color: var(--filumire-navy);
          font-size: 14px;
          font-weight: 800;
        }


        .lessonPanel.teach .tutor-message {
          min-height: 0;
          padding: 10px 12px;
          border-left: 0;
          background: #e9eff8;
        }

        .lessonPanel.teach .tipIcon {
          display: none;
        }

        .teachFoot {
          position: relative;
          display: flex;
          flex: 1;
          min-height: 52px;
          align-items: flex-end;
          padding-bottom: 10px;
        }

        .teachFoot .dots {
          display: flex;
          gap: 8px;
        }

        .teachFoot .dots i {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background: #d6e6f5;
        }

        .teachFoot .dots i.on {
          background: #1677ff;
        }

        .teachFoot img {
          position: absolute;
          right: 4px;
          bottom: 0;
          width: auto;
          height: 84px;
        }

        .nextButton {
          margin-top: 0;
          background: #1677ff;
        }

        .learnFooter {
          position: relative;
          height: 80px;
          margin-top: auto;
          overflow: hidden;
          border-top: 12px solid var(--filumire-surface);
        }

        .learnFooter img {
          position: absolute;
          top: 0;
          left: 0;
          display: block;
          width: 100%;
          height: auto;
        }

        @media (min-width: 768px) {
          .shell {
            min-height: calc(100dvh - 48px);
            margin-top: 24px;
            margin-bottom: 24px;
            overflow: hidden;
            border: 1px solid var(--filumire-border);
            border-radius: 24px;
            box-shadow: var(--filumire-shadow);
          }
        }
      `}</style>
    </main>
  );
}







