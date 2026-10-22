"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type { CSSProperties } from "react";
import { LearnerSignOut } from "../../components/filumire/LearnerSignOut";
import { LearningNotices } from "../../components/filumire/LearningNotices";
import { useLearnerAppearance } from "../../services/interface-preferences";
import { LearnerHeader } from "../../components/filumire/LearnerHeader";
import { useLearnerAvatar } from "../../components/filumire/avatars";
import { fetchLearningOverview, type LearningOverview } from "../../services/learning-client";
import { findFilumireSubject, subjectLabel, toFilumireSubjects } from "../../components/filumire/subjects";
import { LearnerBottomNav } from "../../components/filumire/LearnerBottomNav";
import { askFiluHref } from "../../services/dashboard-navigation";
import { SubjectIcon } from "../../components/filumire/SubjectIcon";
import { useLanguage, withLang, type Language } from "../../components/filumire/language";

import { Suspense, useEffect, useRef, useState } from "react";
import { LearningRequestOrder, restoreLearningActivity, submitPendingAnswer, acknowledgeCurrentActivity, checkKnowledgeFirstForActivity } from "../../services/learning-continuity";
import { completionPercent, correctionFor, stageIndicators, evaluatedFeedback, type ActivityFeedback } from "../../services/learning-presentation";
import { AnswerCorrectionPanel, type CorrectionPhase } from "../../components/filumire/AnswerCorrectionPanel";
import { useLessonClosure } from "../../services/use-lesson-closure";
import { isTeachingFirstStep as isIntroductionStep } from "../../services/lesson-closure-client";
import { LessonClosureCard } from "../../components/filumire/LessonClosureCard";
import { ReadAloudControls } from "../../components/filumire/ReadAloudControls";
import { ActivityOutlineVisuals } from "../../components/filumire/OutlineVisual";
import { LearnerLoadingState } from "../../components/filumire/LearnerLoadingState";
import { learnerErrorText, translateLearnerError, lessonLanguageNotice } from "../../services/learner-interface";

import {
  getSessionId,
  isPendingTeacherReviewResponse,
  LearningNetworkError,
  LearningRequestError,
  submitAssessmentResponse,
  type AnswerCorrection,
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

/*
 * Interface copy is written in English and looked up here for
 * French. Curriculum content (titles, bodies, options) comes from
 * the server in the learner's content language and is never
 * translated on the client.
 */
const FR_TEXT: Record<string, string> = {
  "Let’s understand": "Comprenons",
  "Let’s practise": "Entraînons-nous",
  "Let’s apply": "Appliquons",
  "Let’s check": "Vérifions",
  "Let’s reflect": "Réfléchissons",
  Understand: "Découvrir",
  Practise: "S'exercer",
  Apply: "Appliquer",
  Check: "Vérifier",
  Reflect: "Réfléchir",
  "Next:": "Suivant :",
  "Let's learn this together.": "Apprenons ça ensemble.",
  "Let's practise what you have learned.": "Pratiquons ce que tu as appris.",
  "Let's work through this step by step.": "Avançons pas à pas.",
  "Let's look at this another way.": "Voyons ça autrement.",
  "Let's check what you understand now.": "Vérifions ce que tu comprends maintenant.",
  "Let's find out what you already know.": "Voyons ce que tu sais déjà.",
  "Let's see what you remember.": "Voyons ce dont tu te souviens.",
  "Let's see if you can use it somewhere new.": "Voyons si tu peux l'utiliser ailleurs.",
  "You are ready for the next step.": "Tu es prêt pour la prochaine étape.",
  "You have completed this learning sequence.": "Tu as terminé cette séquence d'apprentissage.",
  "You have done all you can here for now.": "Tu as fait tout ce que tu pouvais ici pour l'instant.",
  "Some topics need a little more help before you can go on. Your teacher can see which ones. Come back later to try them again.": "Certains sujets demandent un peu plus d'aide avant de continuer. Ton enseignant peut voir lesquels. Reviens plus tard pour les essayer à nouveau.",
  "You have worked through the learning sequence and demonstrated the required understanding.": "Tu as parcouru la séquence d'apprentissage et montré la compréhension demandée.",
  "Let's keep learning.": "Continuons à apprendre.",
  "Continue learning": "Continuer d'apprendre",
  "Continue practising": "Continuer l'entraînement",
  Continue: "Continuer",
  "Try again": "Réessayer",
  Start: "Commencer",
  "Continue to the next step": "Passer à l'étape suivante",
  "Check my knowledge first": "Vérifier d'abord mes connaissances",
  "All topics": "Tous les thèmes",
  "Where you are": "Où tu en es",
  "Step 1 of 3: Explanation": "Étape 1 sur 3 : explication",
  "Step 2 of 3: Worked example": "Étape 2 sur 3 : exemple résolu",
  "Step 3 of 3: Guided practice": "Étape 3 sur 3 : entraînement guidé",
  "Revisiting this topic": "Tu revois ce thème",
  "Already know this topic? Answer a few questions first. If you need help, FILUMIRE will teach you.": "Tu connais déjà ce sujet ? Réponds d'abord à quelques questions. Si tu as besoin d'aide, FILUMIRE t'expliquera.",
  Correct: "Correct",
  "Not quite": "Pas tout à fait",
  "Partly correct": "En partie correct",
  "Answer recorded": "Réponse enregistrée",
  "Well done. FILUMIRE has recorded this as successful evidence.": "Bravo. FILUMIRE l'a enregistré comme une réussite.",
  "That answer was not correct. FILUMIRE will use this evidence to decide what you need next.": "Cette réponse n'était pas correcte. FILUMIRE s'en servira pour choisir la suite.",
  "You have part of it right. FILUMIRE will use this evidence to guide what comes next.": "Tu as une partie de la bonne réponse. FILUMIRE s'en servira pour guider la suite.",
  "Your response has been recorded.": "Ta réponse a été enregistrée.",
  "Sent to your teacher": "Envoyé à ton enseignant",
  "Your teacher will look at your work. It will count towards your learning once it has been reviewed.": "Ton enseignant va regarder ton travail. Il comptera pour ton apprentissage une fois relu.",
  "Preparing your learning session...": "Préparation de ta séance...",
  "Something went wrong": "Un problème est survenu",
  "We couldn't load this learning step. Please try again.": "Nous n'avons pas pu charger cette étape. Réessaie.",
  "Please sign in": "Connecte-toi",
  "Sign in to continue your learning journey.": "Connecte-toi pour poursuivre ton parcours d'apprentissage.",
  "Go to sign in": "Aller à la connexion",
  "You're offline": "Tu es hors ligne",
  "FILUMIRE can't reach the server. Check your connection and try again.": "FILUMIRE n'arrive pas à joindre le serveur. Vérifie ta connexion puis réessaie.",
  "Back to My Learning": "Retour à mon apprentissage",
  "View my progress": "Voir ma progression",
  "Choose another subject": "Choisir une autre matière",
  "Ask FILU for help": "Demander de l'aide à FILU",
  "You're offline. You can keep reading, and answers will be sent once you're back online.": "Tu es hors ligne. Tu peux continuer à lire ; tes réponses seront envoyées dès ton retour en ligne.",
  "Sending your waiting answer...": "Envoi de ta réponse en attente...",
  "Your answer is waiting to be sent. It hasn't been checked yet.": "Ta réponse attend d'être envoyée. Elle n'a pas encore été vérifiée.",
  "Retry now": "Réessayer maintenant",
  "Still unable to reach the server. Your answer is safely waiting and will be sent automatically when you're back online.": "Toujours impossible de joindre le serveur. Ta réponse est gardée et sera envoyée automatiquement dès ton retour en ligne.",
  "Unable to send your waiting answer yet.": "Impossible d'envoyer ta réponse pour le moment.",
  "Unable to submit your answer.": "Impossible d'envoyer ta réponse.",
  "Unable to continue.": "Impossible de continuer.",
  "Your response": "Ta réponse",
  "Your answer": "Ta réponse",
  "Choose one answer": "Choisis une réponse",
  "Complete the activity above. Your response will be sent for teacher review before FILUMIRE uses it as learning evidence.": "Fais l'activité ci-dessus. Ta réponse sera relue par ton enseignant avant que FILUMIRE l'utilise.",
  "Write your response here...": "Écris ta réponse ici...",
  "Sending...": "Envoi...",
  "Send for review": "Envoyer pour relecture",
  "Checking...": "Vérification...",
  "Submit answer": "Valider ma réponse",
  "Updating your learning session...": "Mise à jour de ta séance...",
  "Learning progress": "Progression",
  "Learning stages": "Étapes d'apprentissage",
  "Subject goals mastered": "Objectifs maîtrisés dans cette matière",
  "Progress unavailable": "Progression indisponible",
  "Current recommendation. These stages are not a completion checklist.": "Étape recommandée. Ces étapes ne sont pas une liste de réalisations.",
  "FILUMIRE may revisit an earlier stage to strengthen your understanding. Your recorded work is kept.": "FILUMIRE peut revenir à une étape précédente pour renforcer ta compréhension. Ton travail enregistré est conservé.",
  "Feedback on your submitted activity": "Résultat de ton activité envoyée",
  "your first answer": "ta première réponse",
  "Check my new answer": "Vérifier ma nouvelle réponse",
  "The following activity is your next learning step.": "L'activité suivante est ta prochaine étape d'apprentissage.",
  "Your submitted answer": "Ta réponse envoyée",
  "Your answer is waiting to synchronise. No result has been confirmed on this device.": "Ta réponse attend d'être synchronisée. Aucun résultat n'a été confirmé sur cet appareil.",
  "Correct answer to the submitted question": "Réponse correcte à la question envoyée",
  "Incorrect answer to the submitted question": "Réponse incorrecte à la question envoyée",
  "Partly correct answer to the submitted question": "Réponse partiellement correcte à la question envoyée",
  "Activity reviewed by your teacher": "Activité relue par ton enseignant",
  "Your teacher has reviewed the submitted activity. This message does not indicate its score.": "Ton enseignant a relu l'activité envoyée. Ce message n'indique pas son résultat.",
  "Your learning session": "Ta séance d'apprentissage",
  Learning: "Apprentissage",
  "Think about it": "Réfléchis",
  "What did you learn in this topic?": "Qu'as-tu appris dans ce thème ?",
  "What helped you most?": "Qu'est-ce qui t'a le plus aidé ?",
  "What would you like to practise again?": "Que voudrais-tu travailler encore ?",
};

function tr(language: Language, text: string): string {
  return translateLearnerError(text, language) ?? (language === "fr" ? (FR_TEXT[text] ?? text) : text);
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

/* Phase 2: where the learner is within a topic's introduction. */
function introductionStepText(reasonCode: string): string | undefined {
  switch (reasonCode) {
    case "NEW_TOPIC_INSTRUCTION":
      return "Step 1 of 3: Explanation";
    case "NEW_TOPIC_WORKED_EXAMPLE":
      return "Step 2 of 3: Worked example";
    case "GUIDED_PRACTICE":
      return "Step 3 of 3: Guided practice";
    case "TOPIC_REVISIT":
      return "Revisiting this topic";
    default:
      return undefined;
  }
}

function clearSelectedTopicFromUrl() {
  const url = new URL(window.location.href);
  if (!url.searchParams.has("competencyId")) return;
  url.searchParams.delete("competencyId");
  window.history.replaceState(window.history.state, "", url.toString());
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
      return "Correct answer to the submitted question";

    case "incorrect":
      return "Incorrect answer to the submitted question";

    case "partial":
      return "Partly correct answer to the submitted question";

    case "reviewed":
      return "Activity reviewed by your teacher";

    case "pending-review":
      return "Sent to your teacher";

    default:
      return "Answer recorded";
  }
}

function feedbackMessage(
  outcome: string,
): string {
  switch (outcome) {
    case "reviewed":
      return "Your teacher has reviewed the submitted activity. This message does not indicate its score.";
    case "correct":
      return "Well done. FILUMIRE has recorded this as successful evidence.";

    case "incorrect":
      return "That answer was not correct. FILUMIRE will use this evidence to decide what you need next.";

    case "partial":
      return "You have part of it right. FILUMIRE will use this evidence to guide what comes next.";

    case "pending-review":
      return "Your teacher will look at your work. It will count towards your learning once it has been reviewed.";

    default:
      return "Your response has been recorded.";
  }
}

function feedbackIcon(
  outcome: string,
): string {
  switch (outcome) {
    case "correct":
      return "✓";

    case "incorrect":
      return "✕";

    case "pending-review":
      return "✉";

    default:
      return "•";
  }
}

/* Banner colours follow the subject (same palette as the dashboard). */
const SUBJECT_TINTS: Record<string, { tint: string; soft: string; accent: string }> = {
  english: { tint: "#dcecfb", soft: "#c4defa", accent: "#0b7bff" },
  mathematics: { tint: "#fdf3de", soft: "#fbe3b0", accent: "#f08a00" },
  science: { tint: "#dff5e7", soft: "#bfe9cf", accent: "#12b350" },
  computing: { tint: "#ece8fb", soft: "#d8cff7", accent: "#8466dc" },
};

type LoadFailure = "unauthenticated" | "offline" | "unavailable";

function BulbIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9 18h6M10 21h4" />
      <path d="M12 3a6 6 0 0 0-3.6 10.8c.6.5 1 1.2 1 2V16h5.2v-.2c0-.8.4-1.5 1-2A6 6 0 0 0 12 3Z" />
    </svg>
  );
}

export default function LearnPage() {
  return <Suspense fallback={<main className="page learnerUi"><LearnerLoadingState /></main>}><LearnRoute /></Suspense>;
}

function LearnRoute() {
  const params = useSearchParams();
  // A subject navigation starts a new screen lifecycle. Outstanding mutations
  // are reconciled by the shared restoration coordinator before it loads.
  return <LearnPageContent key={params.get("subjectId") ?? "current"} selectedTopicId={params.get("competencyId")} />;
}

function LearnPageContent({ selectedTopicId }: { selectedTopicId: string | null }) {
  const consumedSelection = useRef<string | null>(null);
  const requestOrder = useRef(new LearningRequestOrder());
  const operationBusy = useRef(false);
  const closureContinueBusy = useRef(false);
  const [learnOverview, setLearnOverview] = useState<LearningOverview | null>(null);
  const [language] = useLanguage();
  const [subjectId, setSubjectId] = useState<string | null>(null);
  const learnerAvatar = useLearnerAvatar();
  const feedbackRef = useRef<HTMLDivElement | null>(null);

  const [data, setData] =
    useState<LearningResponse | null>(null);
  const lessonClosure = useLessonClosure(data, language);
  const appearance = useLearnerAppearance(data?.learnerState.learnerId);

  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("subjectId");
    setSubjectId(id);
    if (!data) return;
    let alive = true;
    setLearnOverview(null);
    // Refresh the read-only roll-up after reconciliation or evaluation, never
    // publish a subject total fetched before an in-flight answer committed.
    fetchLearningOverview(data.progress.subjectId || id || undefined).then((r) => {
      if (alive) setLearnOverview(r);
    });
    return () => { alive = false; };
  }, [data, language]);

  const [selectedResponse, setSelectedResponse] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  const [submitting, setSubmitting] =
    useState(false);

  const [error, setError] =
    useState("");

  const [loadFailure, setLoadFailure] =
    useState<LoadFailure | null>(null);

  const [assessmentFeedback, setAssessmentFeedback] =
    useState<ActivityFeedback | null>(null);

  /*
   * Immediate correction: after a wrong answer the question stays on screen
   * with FILU's explanation and one retry. The server's next step waits in
   * `next` until the learner continues.
   */
  const [correction, setCorrection] =
    useState<{ value: AnswerCorrection; phase: CorrectionPhase; next: LearningResponse } | null>(null);

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

  /*
   * An answer saved offline and sent after reconnecting gets the same
   * correction as a live one: back on its question, with one retry.
   */
  function showReplayedCorrection(restored: Awaited<ReturnType<typeof restoreLearningActivity>>): boolean {
    const { submission, submittedAnswer, question } = restored;
    if (!submission || !submittedAnswer || !question || isPendingTeacherReviewResponse(submission) || submission.assessment?.result.correct !== false) return false;
    const value = correctionFor(submission, submittedAnswer.assessmentItemId);
    if (!value) return false;
    setData(question);
    setCorrection({ value, phase: "explain", next: restored.data });
    setAssessmentFeedback(null);
    setSelectedResponse("");
    return true;
  }

  async function loadLearning() {
    if (operationBusy.current) return;
    const ticket = requestOrder.current.begin();
    setLoading(true);
    setError("");
    setSyncError("");
    setLoadFailure(null);
    setAssessmentFeedback(null);
    setCorrection(null);

    try {
      const query = new URLSearchParams(window.location.search);
      const result =
        await restoreLearningActivity(
          query.get("subjectId") ?? undefined,
          undefined,
          undefined,
          query.get("competencyId") ?? undefined,
        );

      if (!requestOrder.current.accepts(ticket)) return;
      // Phase 2: the chosen topic is now the learner's current topic, so
      // a later reload continues from wherever the learner has moved on to.
      if (!result.syncError) {
        consumedSelection.current = query.get("competencyId");
        clearSelectedTopicFromUrl();
      }
      setPending(result.pending ?? null);
      if (!showReplayedCorrection(result)) {
        setData(result.data);
        if (result.submission && result.submittedAnswer) {
          setAssessmentFeedback(evaluatedFeedback(result.submission, result.submittedAnswer));
        }
      }
      if (result.syncError) {
        setSyncError(learnerErrorText(result.syncError, "en"));
      }
      setSelectedResponse("");
    } catch (err) {
      if (!requestOrder.current.accepts(ticket)) return;
      setData(null);
      setLoadFailure(
        err instanceof LearningRequestError && err.status === 401
          ? "unauthenticated"
          : err instanceof LearningNetworkError
            ? "offline"
            : "unavailable",
      );
    } finally {
      if (requestOrder.current.accepts(ticket)) setLoading(false);
    }
  }

  /*
   * Next on a teaching card (Tranche 4B): acknowledge it so the
   * engine can move on. Only this explicit press counts; loading
   * or refreshing the page never does.
   */
  async function continueLearning() {
    if (operationBusy.current || pending) return;
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

    operationBusy.current = true;
    const ticket = requestOrder.current.begin();
    setSubmitting(true);
    setError("");
    setAssessmentFeedback(null);
    // Save only the server's delivery receipt, before an acknowledgement could
    // commit and lose its response. Completion is checked read-only afterwards.
    // Teaching-first: a topic's introduction (explanation, worked example)
    // runs straight on to guided practice without a summary between steps.
    if (!isIntroductionStep(data.decision)) {
      lessonClosure.prepare(data.lessonReceipt);
    }

    try {
      const result =
        await acknowledgeCurrentActivity({
          sessionId: getSessionId(data),
          interventionId,
          competencyId:
            data.decision.competencyId,
        });

      if (!requestOrder.current.accepts(ticket)) return;
      setData(result);
      setSelectedResponse("");
    } catch (err) {
      if (!requestOrder.current.accepts(ticket)) return;
      if (
        err instanceof LearningRequestError &&
        err.status === 409
      ) {
        operationBusy.current = false;
        setSubmitting(false);
        await loadLearning();
        return;
      }

      if (data.lessonReceipt && (err instanceof LearningNetworkError || (err instanceof LearningRequestError && err.status >= 500))) {
        operationBusy.current = false;
        setSubmitting(false);
        // Reconcile delivery via the authoritative activity and the saved
        // receipt, without automatically sending another acknowledgement.
        await loadLearning();
        return;
      }

      lessonClosure.dismiss();

      setError(learnerErrorText(err, "en"));
    } finally {
      operationBusy.current = false;
      if (requestOrder.current.accepts(ticket)) setSubmitting(false);
    }
  }

  /*
   * Teaching-first (Phase 1): "Check my knowledge first" on a new
   * topic's introduction skips to its check questions. No evidence
   * is recorded by the press itself.
   */
  async function checkKnowledgeFirst() {
    if (operationBusy.current || pending || !data) return;

    operationBusy.current = true;
    const ticket = requestOrder.current.begin();
    setSubmitting(true);
    setError("");
    setAssessmentFeedback(null);

    try {
      const result =
        await checkKnowledgeFirstForActivity({
          sessionId: getSessionId(data),
          competencyId:
            data.decision.competencyId,
        });

      if (!requestOrder.current.accepts(ticket)) return;
      setData(result);
      setSelectedResponse("");
    } catch (err) {
      if (!requestOrder.current.accepts(ticket)) return;
      setError(learnerErrorText(err, "en"));
    } finally {
      operationBusy.current = false;
      if (requestOrder.current.accepts(ticket)) setSubmitting(false);
    }
  }

  async function startRecommendedActivity() {
    if (operationBusy.current || closureContinueBusy.current || pending) return;
    // Viewing closure never mutates progress. On leaving it, restore the
    // current server activity in case another tab or teacher changed it.
    closureContinueBusy.current = true;
    lessonClosure.dismiss();
    try { await loadLearning(); } finally { closureContinueBusy.current = false; }
  }

  async function attemptSync() {
    if (operationBusy.current) return;
    operationBusy.current = true;
    const ticket = requestOrder.current.begin();
    setSyncing(true);
    setSyncError("");
    markReconnecting();
    try {
      const restored = await restoreLearningActivity(
        new URLSearchParams(window.location.search).get("subjectId") ?? undefined,
        undefined, pending ?? undefined,
        new URLSearchParams(window.location.search).get("competencyId") ?? undefined,
      );
      if (!requestOrder.current.accepts(ticket)) return;
      setCorrection(null);
      setPending(restored.pending ?? null);
      if (!showReplayedCorrection(restored)) {
        setData(restored.data);
        if (restored.submission && restored.submittedAnswer) {
          setAssessmentFeedback(evaluatedFeedback(restored.submission, restored.submittedAnswer));
          setSelectedResponse("");
        }
      }
      if (restored.syncError) throw restored.syncError;
      markConnected();
    } catch (err) {
      if (!requestOrder.current.accepts(ticket)) return;
      if (err instanceof LearningNetworkError) markOffline();
      else markConnected();
      setSyncError(learnerErrorText(err, "en"));
    } finally {
      operationBusy.current = false;
      if (requestOrder.current.accepts(ticket)) {
        setSyncing(false);
        setLoading(false);
      }
    }
  }

  async function submitAssessment() {
    if (operationBusy.current || pending) return;
    if (
      !data?.content?.assessmentItemId ||
      !selectedResponse
    ) {
      return;
    }

    setSubmitting(true);
    setError("");

    operationBusy.current = true;
    setAssessmentFeedback(null);
    const ticket = requestOrder.current.begin();
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

    const queued: PendingAssessmentSubmission = { ...submissionBody, queuedAt: new Date().toISOString() };
    writePendingSubmission(queued);
    setPending(queued);
    try {
      const result = await submitPendingAnswer(queued);
      clearPendingSubmission(queued.clientRequestId);
      if (!requestOrder.current.accepts(ticket)) return;
      setPending(null);

      markConnected();
      const wrongAnswerCorrection = isPendingTeacherReviewResponse(result) || result.assessment?.result.correct !== false
        ? null : correctionFor(result, submissionBody.assessmentItemId);
      if (wrongAnswerCorrection && !isPendingTeacherReviewResponse(result)) {
        // Stay on this question: explain, re-teach, then offer one retry.
        setCorrection({ value: wrongAnswerCorrection, phase: "explain", next: result });
        setSelectedResponse("");
        return;
      }
      setAssessmentFeedback(evaluatedFeedback(result, {
        assessmentItemId: submissionBody.assessmentItemId,
        title: data.content.title,
      }));

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
        setSelectedResponse("");
        return;
      }

      setData(result);
      setSelectedResponse("");
    } catch (err) {
      if (!requestOrder.current.accepts(ticket)) return;
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
        // A server failure can follow a committed assessment. Keep its retry
        // key until reconciliation establishes whether it was accepted.
        if (err instanceof LearningRequestError && err.status >= 400 && err.status < 500 && err.status !== 401 && err.status !== 429) {
          clearPendingSubmission(queued.clientRequestId);
          setPending(null);
        }
        setError(learnerErrorText(err, "en"));
      }
    } finally {
      operationBusy.current = false;
      if (requestOrder.current.accepts(ticket)) setSubmitting(false);
    }
  }

  /* The one retry after FILU's correction. Scored as guided practice by the server. */
  async function submitCorrectiveRetry() {
    if (operationBusy.current || !correction || correction.phase !== "retry" || !data?.content?.assessmentItemId || !selectedResponse) return;
    const assessmentItemId = data.content.assessmentItemId;
    operationBusy.current = true;
    setSubmitting(true);
    setError("");
    const ticket = requestOrder.current.begin();
    try {
      const result = await submitAssessmentResponse({
        learnerId: data.learnerState.learnerId,
        sessionId: getSessionId(data),
        interventionId: data.decision.interventionId,
        assessmentItemId,
        competencyId: data.decision.competencyId,
        response: selectedResponse,
        clientRequestId: typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
      }, "corrective_retry");
      if (!requestOrder.current.accepts(ticket)) return;
      markConnected();
      const retried = correctionFor(result, assessmentItemId);
      if (isPendingTeacherReviewResponse(result) || !retried?.retryOutcome) {
        setCorrection(null);
        if (!isPendingTeacherReviewResponse(result)) setData(result);
        return;
      }
      setCorrection({ value: { ...retried, chosen: correction.value.chosen }, phase: "done", next: result });
      setSelectedResponse("");
    } catch (err) {
      if (!requestOrder.current.accepts(ticket)) return;
      if (err instanceof LearningNetworkError) markOffline();
      setError(learnerErrorText(err, "en"));
    } finally {
      operationBusy.current = false;
      if (requestOrder.current.accepts(ticket)) setSubmitting(false);
    }
  }

  function continueAfterCorrection() {
    if (!correction || operationBusy.current) return;
    setData(correction.next);
    setCorrection(null);
    setAssessmentFeedback(null);
    setSelectedResponse("");
  }

  useEffect(() => {
    // A different topic in the same subject is a new selection too. Consuming
    // the URL parameter after a successful restore must not reload the old topic.
    if (!selectedTopicId && consumedSelection.current) {
      consumedSelection.current = null;
      return;
    }
    loadLearning();
  }, [selectedTopicId]);

  useEffect(() => {
    const unsubscribe = subscribeConnectivity(
      setConnectivity,
    );
    const removeConnectivityListeners =
      initConnectivityListeners();

    setConnectivity(getConnectivityStatus());

    return () => {
      requestOrder.current.invalidate();
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
      attemptSync();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connectivity]);

  /* Move focus to the result so screen-reader and keyboard users
     hear the feedback and continue from it. */
  useEffect(() => {
    if (assessmentFeedback) {
      feedbackRef.current?.focus();
    }
  }, [assessmentFeedback]);

  const askSubjectId = subjectId ?? data?.progress.subjectId;
  // A lesson opened without ?subjectId (Home's "Continue Learning") still
  // belongs to a subject: "All topics" must open that subject's topic list.
  const backHref = askSubjectId
    ? `/dashboard?view=learning&subjectId=${encodeURIComponent(askSubjectId)}`
    : "/dashboard";
  const learningHref = withLang("/dashboard?view=learning", language);
  const progressHref = withLang("/dashboard?view=progress", language);
  const askHref = askFiluHref(language, askSubjectId);

  /* Loading and failure screens keep the learner's header and
     navigation so there is always a way back. */
  if (loading || !data) {
    return (
      <main className="page learnerUi" lang={language} data-appearance={appearance}>
        <a className="filumireSkipLink" href="#learn-main">
          {language === "fr" ? "Aller au contenu" : "Skip to content"}
        </a>
        <div className="shell learnerShell">
          <LearnerHeader backHref={backHref} setupHeader language={language} subjectId={askSubjectId} />

          <div id="learn-main" className="learnBody" tabIndex={-1}>
            {loading ? (
              <section className="fState inline" aria-busy="true">
                <div className="fSpinner" />
                <p role="status">{tr(language, "Preparing your learning session...")}</p>
              </section>
            ) : loadFailure === "unauthenticated" ? (
              <section className="fState inline">
                <span className="fStateIcon" aria-hidden="true">?</span>
                <h1>{tr(language, "Please sign in")}</h1>
                <p>{tr(language, "Sign in to continue your learning journey.")}</p>
                <div className="fStateActions">
                  <Link href={withLang("/login", language)} className="fButton">
                    {tr(language, "Go to sign in")}
                  </Link>
                </div>
              </section>
            ) : (
              <section className="fState inline" role="alert">
                <span className="fStateIcon warn" aria-hidden="true">!</span>
                <h1>
                  {tr(language, loadFailure === "offline" ? "You're offline" : "Something went wrong")}
                </h1>
                <p>
                  {tr(
                    language,
                    loadFailure === "offline"
                      ? "FILUMIRE can't reach the server. Check your connection and try again."
                      : "We couldn't load this learning step. Please try again.",
                  )}
                </p>
                <div className="fStateActions">
                  <button type="button" onClick={loadLearning} className="fButton">
                    {tr(language, "Try again")}
                  </button>
                  <Link href={learningHref} className="fButton secondary">
                    {tr(language, "Back to My Learning")}
                  </Link>
                </div>
              </section>
            )}
          </div>

          <LearnerBottomNav active="learning" language={language} subjectId={askSubjectId} />
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
            flex: 1;
            padding: 8px 16px;
          }

          .learnBody:focus {
            outline: none;
          }

          @media (min-width: 1024px) {
            .page {
              padding: 0 32px 0 calc(var(--filumire-sidebar-width) + 32px);
            }

            .shell {
              max-width: var(--filumire-content-max);
            }

            .learnBody {
              width: 100%;
              max-width: 760px;
              margin: 0 auto;
              padding: 32px var(--filumire-gutter-desktop);
            }
          }
        `}</style>
      </main>
    );
  }

  const options =
    parseOptions(
      data.content?.metadata?.options,
    );
  const learnStat = learnOverview?.subjects[data?.progress.subjectId ?? ""];
  const learnSubject = findFilumireSubject(toFilumireSubjects(learnOverview?.availableSubjects), data?.progress.subjectId);
  const progressPercent = completionPercent(learnStat);
  const tint = SUBJECT_TINTS[learnSubject?.key ?? "mathematics"];

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

  /*
   * Work sent for teacher review is not evidence yet. Until the
   * learner moves on, the same activity is not offered again.
   */
  const awaitingReview =
    assessmentFeedback?.assessmentItemId === data.content?.assessmentItemId &&
    (assessmentFeedback?.outcome === "pending-review" || assessmentFeedback?.outcome === "reviewed");

  const hasAssessment =
    Boolean(data.content?.assessmentItemId) &&
    options.length > 0 &&
    !requiresTrustedEvaluation;

  const activeCorrection =
    correction && correction.value.assessmentItemId === data.content?.assessmentItemId ? correction : null;
  const retrying = activeCorrection?.phase === "retry";

  const showContinue =
    Boolean(data.content) &&
    !hasAssessment &&
    !requiresTrustedEvaluation &&
    !isComplete;

  const learningStages = stageIndicators(action);

  const teachView = showContinue && action !== "diagnose";

  /* Teaching-first (Phase 1): offered only on a new topic's introduction. */
  const canCheckFirst =
    teachView && isIntroductionStep(data.decision);

  const currentStage = learningStages.findIndex((stage) => stage.current);
  const introductionStep = introductionStepText(data.decision.reasonCode);
  const stageLabel = introductionStep
    ? tr(language, introductionStep)
    : currentStage >= 0 ? tr(language, "Let’s " + learningStages[currentStage].label.toLowerCase()) : tr(language, "Your learning session");

  /* Phase 2: where the learner is in the curriculum, and the way back to the topic list. */
  const currentTopic = learnOverview?.areas.find((area) => area.id === data.decision.competencyId);
  const topicsHref = withLang(backHref, language);

  return (
    <main className="page learnerUi" lang={language} data-appearance={appearance}>
      <a className="filumireSkipLink" href="#learn-main">
        {language === "fr" ? "Aller au contenu" : "Skip to content"}
      </a>
      <div className="shell learnerShell">
        <LearnerHeader
          backHref={backHref}
          showAskFilu={true} setupHeader language={language}
            subjectId={askSubjectId}
        />

        <div className="learnBody">
          {/* learnSide / learnMain are layout-only (display: contents on
              mobile and tablet); from 1024px they form two columns. */}
          <div className="learnSide">
          <nav className="topicTrail" aria-label={tr(language, "Where you are")}>
            <Link href={topicsHref} className="topicTrailBack">
              <span aria-hidden="true">{"←"}</span> {tr(language, "All topics")}
            </Link>
            {currentTopic?.strand && currentTopic.subStrand && (
              <ol>
                <li>
                  <Link href={topicsHref}>
                    {subjectLabel(learnSubject?.name ?? data.progress.subjectName ?? tr(language, "Learning"), language)}
                  </Link>
                </li>
                <li lang={currentTopic.strand.language}>{currentTopic.strand.title}</li>
                <li lang={currentTopic.subStrand.language}>{currentTopic.subStrand.title}</li>
                <li aria-current="page">{currentTopic.title}</li>
              </ol>
            )}
          </nav>

          <section
            className="learnBanner"
            style={{
              "--bannerTint": tint.tint,
              "--bannerSoft": tint.soft,
              "--bannerAccent": tint.accent,
            } as CSSProperties}
          >
            <span className="bannerIcon">
              <SubjectIcon name={learnSubject?.key ?? "mathematics"} />
            </span>
            <div className="bannerText">
              <h1>{subjectLabel(learnSubject?.name ?? data.progress.subjectName ?? tr(language, "Learning"), language)}</h1>
              <p>
                {data.progress.competencyTitle ??
                  data.content?.title ??
                  tr(language, "Your learning session")}
              </p>
            </div>
            <strong>{progressPercent === null ? "—" : `${progressPercent}%`}</strong>
            <small>{tr(language, progressPercent === null ? "Progress unavailable" : "Subject goals mastered")}</small>
            <div
              className="progress-track"
              role={progressPercent === null ? undefined : "progressbar"}
              aria-label={tr(language, "Subject goals mastered")}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={progressPercent ?? undefined}
            >
              <div
                className="progress-fill"
                style={{ width: `${progressPercent ?? 0}%` }}
              />
            </div>
          </section>

          <nav aria-label={tr(language, "Learning stages")}>
          <p className="stageExplanation">{tr(language, "Current recommendation. These stages are not a completion checklist.")}</p>
          <ol className="learningStages">
            {learningStages.map((stage, index) => (
              <li
                key={stage.label}
                className={`learningStage ${
                  index === currentStage
                    ? "active"
                    : ""
                }`}
                aria-current={index === currentStage ? "step" : undefined}
              >
                <span className="stageDot" aria-hidden="true">
                  {index + 1}
                </span>
                <span className="stageName">{tr(language, stage.label)}</span>
              </li>
            ))}
          </ol>
          </nav>
          <p className="stageExplanation">{tr(language, "FILUMIRE may revisit an earlier stage to strengthen your understanding. Your recorded work is kept.")}</p>
          </div>

          <div id="learn-main" className="learnMain" tabIndex={-1}>

        {connectivity === "offline" && !pending && (
          <div
            className="connectivity-banner offline"
            role="status"
            aria-live="polite"
          >
            {tr(language, "You're offline. You can keep reading, and answers will be sent once you're back online.")}
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
                ? tr(language, "Sending your waiting answer...")
                : tr(language, "Your answer is waiting to synchronise. No result has been confirmed on this device.")}
            </div>

            {!syncing && (
              <button
                type="button"
                onClick={() => attemptSync()}
                className="secondary-button"
              >
                {tr(language, "Retry now")}
              </button>
            )}

            {syncError && (
              <div className="connectivity-banner-error">
                {tr(language, syncError)}
              </div>
            )}
          </div>
        )}

          {assessmentFeedback && (
            <div ref={feedbackRef} tabIndex={-1} className={`assessment-feedback ${assessmentFeedback.outcome}`} role="status" aria-live="polite">
              <div className="feedback-icon" aria-hidden="true">{feedbackIcon(assessmentFeedback.outcome)}</div>
              <div className="feedback-content">
                <small>{tr(language, "Feedback on your submitted activity")}: {assessmentFeedback.title || tr(language, "Your submitted answer")}</small>
                <div className="feedback-title">{tr(language, feedbackTitle(assessmentFeedback.outcome))}</div>
                <div className="feedback-message">{tr(language, feedbackMessage(assessmentFeedback.outcome))}</div>
                {assessmentFeedback.assessmentItemId !== data.content?.assessmentItemId && <small>{tr(language, "The following activity is your next learning step.")}</small>}
              </div>
            </div>
          )}
        {lessonClosure.loading && <section className="fState inline" aria-busy="true"><p role="status">{language === "fr" ? "Préparation de ton résumé…" : "Preparing your lesson summary…"}</p></section>}
        {lessonClosure.error && <section className="fState inline" role="alert">
          <p>{language === "fr" ? "Le résumé n’est pas disponible pour le moment. Ton travail enregistré est conservé." : "Your summary is unavailable just now. Your recorded work is kept."}</p>
          <button type="button" className="fButton" onClick={lessonClosure.retry}>{tr(language, "Try again")}</button>
          <button type="button" className="fButton secondary" onClick={lessonClosure.dismiss}>{tr(language, "Continue learning")}</button>
        </section>}
        {lessonClosure.closure && <LessonClosureCard closure={lessonClosure.closure} decision={data.decision} phase={lessonClosure.phase} visualContextSafe={!data.content?.assessmentItemId && !pending}
          learnerId={data.learnerState.learnerId}
          onPhase={lessonClosure.changePhase} onContinue={startRecommendedActivity} busy={submitting || syncing || Boolean(pending)} />}
        {!lessonClosure.loading && !lessonClosure.closure && <section className={`lessonPanel${teachView ? " teach" : ""}`}>
          {!teachView && (
            <div className="lessonHero">
              <small>{stageLabel}</small>
              <h2>{tr(language, needsSupportPause ? "You have done all you can here for now." : actionLabel(action))}</h2>
              <img
                src={learnerAvatar}
                alt=""
              />
            </div>
          )}

        <section className="card">
          {teachView && (
            <span className="lessonPill">
              {stageLabel}
            </span>
          )}

          {error && (
            <div className="assessment-feedback incorrect" role="alert">
              <div className="feedback-icon" aria-hidden="true">!</div>
              <div className="feedback-content">
                <div className="feedback-message">{tr(language, error)}</div>
              </div>
            </div>
          )}

          {data.content && (
            <>
              {lessonLanguageNotice(data.content.language, language, Boolean(activeCorrection)) && <p className="contentLanguageNotice" role="note">{lessonLanguageNotice(data.content.language, language, Boolean(activeCorrection))}</p>}
              <h2 lang={data.content.language}>
                {data.content.title}
              </h2>

              <div className="lesson-body" lang={data.content.language}>
                {data.content.body}
              </div>
              {data.content.language && <ReadAloudControls learnerId={data.learnerState.learnerId} text={data.content.body} language={data.content.language} surface={hasAssessment ? "question" : "lesson"} />}

              <ActivityOutlineVisuals visuals={data.visuals} content={data.content} decision={data.decision} language={language} />
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

          {requiresTrustedEvaluation && !pending && !awaitingReview && (
            <div className="assessment">
              <label className="assessment-label" htmlFor="learner-response">
                {tr(language, "Your response")}
              </label>

              <div className="tutor-message">
                <span className="tipIcon" aria-hidden="true">
                  <BulbIcon />
                </span>
                <p>
                  {tr(language, "Complete the activity above. Your response will be sent for teacher review before FILUMIRE uses it as learning evidence.")}
                </p>
              </div>

              <textarea
                id="learner-response"
                className="rich-response"
                value={selectedResponse}
                onChange={(event) => {
                  setAssessmentFeedback(null);
                  setSelectedResponse(event.target.value);
                }}
                placeholder={tr(language, "Write your response here...")}
                rows={6}
                disabled={submitting || syncing || Boolean(pending)}
              />

              <button
                type="button"
                className="primary-button"
                onClick={submitAssessment}
                disabled={submitting || syncing || Boolean(pending) || !selectedResponse.trim()}
              >
                {tr(language, submitting ? "Sending..." : "Send for review")}
              </button>
            </div>
          )}

          {/* Below the question, above its options: explain, re-teach, then retry. */}
          {activeCorrection && <AnswerCorrectionPanel correction={activeCorrection.value} phase={activeCorrection.phase} language={language} busy={submitting}
            learnerId={data.learnerState.learnerId} speechLanguage={data.content?.language}
            onRetry={() => {
              setSelectedResponse(""); setCorrection({ ...activeCorrection, phase: "retry" });
              // Take keyboard and screen-reader users straight to the answers.
              setTimeout(() => document.querySelector<HTMLInputElement>('input[name="answer"]:not(:disabled)')?.focus(), 0);
            }} onContinue={continueAfterCorrection} />}

          {hasAssessment && !pending && (!activeCorrection || retrying) && (
            <fieldset className="assessment">
              <legend className="assessment-label">
                {tr(language, "Your answer")}
                <span className="visuallyHidden">
                  {" – "}
                  {tr(language, "Choose one answer")}
                </span>
              </legend>

              <div className="options">
                {options.map(
                  (option, index) => (
                    <label
                      key={`${option}-${index}`}
                      className={
                        retrying && option === activeCorrection?.value.chosen
                          ? "option ruledOut"
                          : selectedResponse ===
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
                        onChange={() => {
                          setAssessmentFeedback(null);
                          setSelectedResponse(option);
                        }}
                        disabled={
                          submitting || syncing || Boolean(pending) ||
                          (retrying && option === activeCorrection?.value.chosen)
                        }
                      />

                      <span className="option-text">
                        {option}
                        {retrying && option === activeCorrection?.value.chosen && <span className="visuallyHidden"> ({tr(language, "your first answer")})</span>}
                      </span>
                    </label>
                  ),
                )}
              </div>

              <button
                type="button"
                onClick={
                  retrying ? submitCorrectiveRetry : submitAssessment
                }
                disabled={
                  !selectedResponse ||
                  submitting || syncing || Boolean(pending)
                }
                className="primary-button"
              >
                {tr(language, submitting
                  ? "Checking..."
                  : retrying ? "Check my new answer" : "Submit answer")}
              </button>
            </fieldset>
          )}

          {showContinue && !teachView && (
            <button
              type="button"
              onClick={continueLearning}
              disabled={submitting || syncing || Boolean(pending)}
              className="primary-button"
            >
              {tr(language, buttonLabel(action))}
              <span className="arrow" aria-hidden="true">
                {"→"}
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
              <div className="complete-mark" aria-hidden="true">
                {needsSupportPause ? "!" : "✓"}
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

          {(currentStage === 4 || (isComplete && !needsSupportPause)) && (
            <div className="reflectCard">
              <strong>{tr(language, "Think about it")}</strong>
              <ul>
                <li>{tr(language, "What did you learn in this topic?")}</li>
                <li>{tr(language, "What helped you most?")}</li>
                <li>{tr(language, "What would you like to practise again?")}</li>
              </ul>
            </div>
          )}

          {(isComplete || awaitingReview) && (
            <div className="lessonActions">
              <Link href={learningHref} className="fButton">
                {tr(language, isComplete ? "Choose another subject" : "Back to My Learning")}
              </Link>
              <Link href={progressHref} className="fButton secondary">
                {tr(language, "View my progress")}
              </Link>
            </div>
          )}

          {submitting && (
            <div className="status" role="status">
              {tr(language, "Updating your learning session...")}
            </div>
          )}
        </section>
        </section>}

        {teachView && !lessonClosure.loading && !lessonClosure.closure && (
          <button
            type="button"
            onClick={continueLearning}
            disabled={submitting || syncing || Boolean(pending)}
            className="primary-button nextButton"
          >
            {tr(language, "Continue learning")}
            <span className="arrow" aria-hidden="true">
              {"→"}
            </span>
          </button>
        )}

        {canCheckFirst && !lessonClosure.loading && !lessonClosure.closure && (
          <div className="checkFirst">
            <p id="check-first-hint">
              {tr(language, "Already know this topic? Answer a few questions first. If you need help, FILUMIRE will teach you.")}
            </p>
            <button
              type="button"
              onClick={checkKnowledgeFirst}
              disabled={submitting || syncing || Boolean(pending)}
              className="fButton secondary"
              aria-describedby="check-first-hint"
            >
              {tr(language, "Check my knowledge first")}
            </button>
          </div>
        )}

        {!isComplete && (
          <Link href={askHref} className="askFiluLink">
            {tr(language, "Ask FILU for help")}
          </Link>
        )}
          </div>
        </div>

        <LearningNotices learnerId={data.learnerState.learnerId} completed={data.progress.completedCompetencies} language={language} />
        <footer className="learnFooter">
          <img src="/images/home/landscape%20footer.png" alt="" />
        </footer>

        <LearnerSignOut language={language} />
        <LearnerBottomNav active="learning" language={language} subjectId={askSubjectId} />
      </div>

      <style jsx>{`
        /* Overhaul additions: subject-coloured banner, stage list,
           answer fieldset, reflection and next-step actions. */
        .learnBanner {
          background: var(--bannerTint, #fdf3de) !important;
        }

        .bannerIcon {
          background: var(--bannerSoft, #fbe3b0) !important;
          color: var(--bannerAccent, #f08a00) !important;
        }

        .bannerIcon :global(svg) {
          width: 26px;
          height: 26px;
          fill: currentColor;
        }

        .bannerIcon :global(.cut) {
          fill: var(--bannerSoft, #fbe3b0);
        }

        .bannerIcon :global(.cutline) {
          fill: none;
          stroke: var(--bannerSoft, #fbe3b0);
          stroke-width: 1.8;
          stroke-linecap: round;
        }

        .bannerIcon :global(.line) {
          fill: none;
          stroke: currentColor;
          stroke-width: 2;
          stroke-linecap: round;
        }

        ol.learningStages {
          margin: 0;
          list-style: none;
        }

        fieldset.assessment {
          min-width: 0;
          margin: 4px 0 0;
          padding: 0;
          border: 0;
        }

        fieldset.assessment legend {
          padding: 0;
          margin-bottom: 8px;
        }

        .assessment-feedback:focus {
          outline: 3px solid var(--filumire-navy);
          outline-offset: 2px;
        }

        .reflectCard {
          margin-top: 12px;
          padding: 12px 14px;
          border-radius: 12px;
          background: #ece8fb;
          color: var(--filumire-navy);
        }

        .reflectCard strong {
          font-size: 15px;
          font-weight: 800;
        }

        .reflectCard ul {
          margin: 6px 0 0;
          padding-left: 18px;
          font-size: 14px;
          line-height: 1.5;
        }

        .lessonActions {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          margin-top: 14px;
        }

        .topicTrail {
          display: flex;
          flex-direction: column;
          gap: 4px;
          margin-bottom: 10px;
          font-size: 0.88rem;
          color: var(--filumire-text);
        }

        .topicTrail :global(.topicTrailBack) {
          align-self: flex-start;
          font-weight: 700;
          color: var(--filumire-navy);
          text-decoration: none;
          padding: 4px 0;
        }

        .topicTrail :global(.topicTrailBack:hover),
        .topicTrail :global(.topicTrailBack:focus-visible) {
          text-decoration: underline;
        }

        .topicTrail ol {
          display: flex;
          flex-wrap: wrap;
          gap: 2px 6px;
          margin: 0;
          padding: 0;
          list-style: none;
        }

        /* Phones: the subject banner just below already names the subject
           and topic, so only "All topics" stays. */
        @media (max-width: 767px) {
          .topicTrail ol {
            display: none;
          }
        }

        .topicTrail li + li::before {
          content: "›";
          margin-right: 6px;
          opacity: 0.6;
        }

        .topicTrail li[aria-current="page"] {
          font-weight: 700;
        }

        .topicTrail :global(a) {
          color: var(--filumire-navy);
        }

        .checkFirst {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          margin-top: 12px;
          text-align: center;
        }

        .checkFirst p {
          margin: 0;
          max-width: 34rem;
          font-size: 0.92rem;
          color: var(--filumire-text);
        }

        .learnMain :global(.askFiluLink) {
          align-self: center;
          margin: 6px 0 4px;
          color: #0b7bff;
          font-size: 14px;
          font-weight: 800;
          text-decoration: none;
        }

        .learnMain:focus {
          outline: none;
        }
      `}</style>
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

        .learnBanner > small {
          grid-column: 1 / -1;
          margin-top: 6px;
          line-height: 1.4;
        }

        .stageExplanation {
          margin: 8px 0;
          color: var(--filumire-navy);
          font-size: 0.8rem;
          line-height: 1.5;
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
          color: #526575;
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
          color: #855000;
        }

        .learningStage.active .stageDot,
        .learningStage.complete .stageDot {
          background: #f5a00f;
          color: #12304a;
        }

        .stageName {
          max-width: 100%;
          overflow-wrap: break-word;
          white-space: normal;
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

        .lessonHero h2 {
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

        /* The first, wrong answer during FILU's one retry. */
        .option.ruledOut {
          opacity: .65;
          border-style: dashed;
        }

        .option.ruledOut .option-text {
          text-decoration: line-through;
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
          /* Navy on FILUMIRE orange: white text here was 2.5:1 and hard to read. */
          color: #12304a;
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

        .learnSide,
        .learnMain {
          display: contents;
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

          .learnBody {
            gap: 14px;
            padding: 20px 28px 16px;
          }

          .learnBanner {
            padding: 14px 18px 16px;
            border-radius: 18px;
          }

          .bannerText h1 {
            font-size: 24px;
          }

          .bannerText p {
            font-size: 16px;
          }

          .learnBanner strong {
            font-size: 24px;
          }

          .learningStage {
            font-size: 0.82rem;
          }

          .lessonPanel {
            padding: 0 18px 18px;
            border-radius: 22px;
          }

          .lessonHero {
            min-height: 136px;
            padding-top: 18px;
          }

          .lessonHero small {
            font-size: 15px;
          }

          .lessonHero h2 {
            font-size: 26px;
          }

          .lessonHero img {
            height: 136px;
          }

          .card {
            padding: 20px 24px;
            border-radius: 18px;
          }

          .card h2 {
            font-size: 24px;
          }

          .lesson-body {
            font-size: 17px;
            line-height: 1.55;
          }

          .tutor-message p {
            font-size: 15.5px;
          }

          .option {
            padding: 14px 16px;
            font-size: 16px;
          }

          .lessonPanel.teach {
            padding: 14px;
          }

          .lessonPanel.teach .card {
            padding: 20px 24px 0;
          }

          .teachFoot img {
            height: 104px;
          }

          .learnFooter {
            height: 104px;
          }
        }

        /* Laptop: the learner sidebar is fixed on the left and the
           lesson sits in a centred frame beside it. */
        @media (min-width: 1024px) {
          .page {
            padding: 0 32px 0 calc(var(--filumire-sidebar-width) + 32px);
          }

          .shell {
            max-width: var(--filumire-content-max);
            min-height: calc(100dvh - 48px);
            /* clip (not hidden) so the sticky side column can stick */
            overflow: clip;
          }

          .learnBody {
            padding: 28px 32px 20px;
          }

          .lessonHero h1 {
            max-width: 72%;
            font-size: 28px;
          }

          .card {
            padding: 24px 30px;
          }

          .options {
            grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
            gap: 12px;
          }

          .primary-button {
            font-size: 17px;
          }

          .assessment .primary-button {
            display: flex;
            width: auto;
            min-width: 260px;
            margin-left: auto;
          }

          .nextButton {
            align-self: flex-end;
            width: auto;
            min-width: 260px;
          }

          .learnFooter {
            height: clamp(120px, 12vw, 168px);
          }
        }

        /* Desktop: session summary and stages in a sticky column
           beside the activity. */
        @media (min-width: 1280px) {
          .learnBody {
            display: grid;
            grid-template-columns: 300px minmax(0, 1fr);
            align-items: start;
            gap: 28px;
            padding: 32px 36px 24px;
          }

          .learnSide {
            position: sticky;
            top: 24px;
            display: flex;
            flex-direction: column;
            gap: 16px;
          }

          .learnMain {
            display: flex;
            min-height: 100%;
            flex-direction: column;
            gap: 14px;
          }

          .bannerText h1 {
            font-size: 20px;
          }

          .bannerText p {
            font-size: 14px;
          }

          .learnBanner strong {
            font-size: 20px;
          }

          /* Stages become a vertical stepper */
          .learningStages {
            grid-template-columns: minmax(0, 1fr);
            gap: 0;
            padding: 16px 18px;
            border: 1px solid var(--filumire-border);
            border-radius: 18px;
            background: var(--filumire-surface);
          }

          .learningStage {
            flex-direction: row;
            gap: 12px;
            padding: 6px 0;
            font-size: 0.9rem;
            text-align: left;
          }

          .learningStage:not(:last-child)::after {
            top: 40px;
            left: 16px;
            width: 2px;
            height: calc(100% - 34px);
          }
        }
      `}</style>
    </main>
  );
}







