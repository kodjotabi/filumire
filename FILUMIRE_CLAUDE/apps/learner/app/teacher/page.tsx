"use client";
import { ProgressStatus, ProgressBreakdown } from "../../components/filumire/ProgressStatus";
import { PROGRESS_TEXT } from "../../../../services/learner-progress/reporting";
import {PerformanceEvidenceForm} from '../../components/filumire/PerformanceEvidenceForm';
import type {PerformanceAttestation} from '../../../../services/teacher-review/jhs-performance';
import { AdultHeader, AdultRoleSwitch, adultRole, alsoTeacher } from "../../components/filumire/AdultRoleSwitch";
import { useLanguage, type Language } from "../../components/filumire/language";
import { TeacherLinkLearner } from "../../components/filumire/TeacherLinkLearner";
import { TeacherLeaveLearner } from "../../components/filumire/TeacherLeaveLearner";
import { AccountSecurity } from "../../components/filumire/AccountSecurity";
import { accountErrorMessage, fetchAccount, signOut, type Account } from "../../services/account-client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  createTeacherAction,
  createTeacherNote,
  createTeacherMessage,
  createTeacherObservation,
  fetchTeacherMessages,
  fetchTeacherSummary,
  submitTeacherReview,
  TeacherRequestError,
  type ControlledTeacherActionType,
  type TeacherProfessionalNoteType,
  type TeacherReviewOutcome,
  type TeacherSummaryResponse,
  type TeacherThreadMessage,
} from "../../../../services/teacher-client";

type ViewState =
  | "loading"
  | "ready"
  | "unauthenticated"
  | "unavailable";

type SubmissionState =
  | "idle"
  | "saving";

const REVIEW_OUTCOMES: TeacherReviewOutcome[] = [
  "correct",
  "partial",
  "incorrect",
  "skipped",
  "observed",
];

const ACTION_TYPES: {
  value: ControlledTeacherActionType;
  label: string;
}[] = [
  { value: "request_practice", label: "Request practice" },
  { value: "request_explanation", label: "Request explanation" },
  { value: "request_review", label: "Request review" },
  { value: "request_reassessment", label: "Request reassessment" },
];

const NOTE_TYPES: {
  value: TeacherProfessionalNoteType;
  label: string;
}[] = [
  { value: "context", label: "Context" },
  { value: "instructional", label: "Instructional" },
  {
    value: "professional_feedback",
    label: "Professional feedback",
  },
];

/*
 * French interface text, keyed by the English wording. Learner
 * content, topic names and engine codes without an entry stay as
 * the server sent them.
 */
const TEACHER_FR: Record<string, string> = {
  "Teacher Workspace": "Espace enseignant",
  "Loading teacher workspace...": "Chargement de l'espace enseignant...",
  "Please sign in": "Veuillez vous connecter",
  "Teacher authorization is required to view learner information.": "Une autorisation enseignant est nécessaire pour voir les informations de l'apprenant.",
  "Go to sign in": "Aller à la connexion",
  "Workspace unavailable": "Espace indisponible",
  "The teacher workspace could not be loaded.": "L'espace enseignant n'a pas pu être chargé.",
  "Try again": "Réessayer",
  "No learners assigned": "Aucun apprenant attribué",
  "Sign out": "Se déconnecter",
  "Enter a code from a learner's parent or guardian below to link your first learner.": "Saisissez ci-dessous le code donné par le parent ou le tuteur d'un apprenant pour associer votre premier apprenant.",
  "No active teacher-learner relationships are available.": "Aucune relation enseignant-apprenant active n'est disponible.",
  "Learner": "Apprenant",
  "Select a learner": "Choisir un apprenant",
  "Choose a learner to view their teaching priorities and progress.": "Choisissez un apprenant pour voir ses priorités et sa progression.",
  "Need attention": "À surveiller",
  "Teacher reviews": "Relectures enseignant",
  "Active subjects": "Matières actives",
  "Mastery check": "Contrôle de la maîtrise",
  "How solid is this learner's mastery?": "La maîtrise de cet apprenant est-elle solide ?",
  "Topics mastered": "Thèmes maîtrisés",
  "Mastery not confirmed later": "Maîtrise non confirmée ensuite",
  "Remembered after a day or more": "Retenu après un jour ou plus",
  "Used in a new situation": "Utilisé dans une situation nouvelle",
  "Teacher marking agrees": "Accord avec la correction enseignant",
  "Stuck or out of questions": "Bloqué ou sans questions",
  "Answers to reach mastery (median)": "Réponses pour atteindre la maîtrise (médiane)",
  "Learning priorities": "Priorités d'apprentissage",
  "Learners who may need support": "Apprenants qui peuvent avoir besoin d'aide",
  "No competencies currently require teacher attention.": "Aucune compétence ne demande actuellement l'attention de l'enseignant.",
  "Learning overview": "Aperçu de l'apprentissage",
  "Teacher review": "Relecture enseignant",
  "Learner responses to review teacher judgment": "Réponses d'apprenants à évaluer par l'enseignant",
  "Competency": "Compétence",
  "Assessment item": "Question d'évaluation",
  "Submitted": "Envoyé",
  "Learner response": "Réponse de l'apprenant",
  "Learning detail": "Détail de l'apprentissage",
  "Learning progression": "Progression",
  "Retention": "Rétention",
  "Transfer": "Transfert",
  "Sent back to learn first": "Renvoyé vers un prérequis",
  "Sent back on": "Renvoyé le",
  "Ran out of questions": "Plus de questions disponibles",
  "FILUMIRE tries again from": "FILUMIRE réessaie à partir du",
  "Learning insight": "Analyse de l'apprentissage",
  "Patterns noticed": "Tendances observées",
  "Earlier learning to revisit": "Notions antérieures à revoir",
  "Possible misunderstandings": "Erreurs de compréhension possibles",
  "FILUMIRE learning response": "Réponse pédagogique de FILUMIRE",
  "Current instructional direction": "Orientation pédagogique actuelle",
  "Learning approach": "Approche d'apprentissage",
  "Support approach": "Approche de soutien",
  "Current learning state": "État d'apprentissage actuel",
  "Recent learning considered": "Apprentissage récent pris en compte",
  "Evidence": "Preuves",
  "Recent learning record": "Historique récent",
  "No evidence has been recorded for this competency.": "Aucune preuve n'a été enregistrée pour cette compétence.",
  "Support history": "Historique du soutien",
  "Instructional interventions": "Interventions pédagogiques",
  "No interventions recorded.": "Aucune intervention enregistrée.",
  "Learning over time": "Évolution dans le temps",
  "Learning history": "Historique d'apprentissage",
  "No progress history recorded.": "Aucun historique de progression enregistré.",
  "Teacher support": "Soutien de l'enseignant",
  "Add professional context": "Ajouter un contexte professionnel",
  "Record observation": "Enregistrer une observation",
  "Outcome": "Résultat",
  "Professional note": "Note professionnelle",
  "Note type": "Type de note",
  "Note": "Note",
  "Save note": "Enregistrer la note",
  "Request learning support": "Demander un soutien",
  "Request": "Demande",
  "Reason (optional)": "Motif (facultatif)",
  "Submit request": "Envoyer la demande",
  "Parent-teacher messages": "Messages parents-enseignant",
  "Messages with home": "Messages avec la famille",
  "Messages share context with the learner's parent. They do not change FILUMIRE's learning decisions.": "Les messages partagent du contexte avec le parent de l'apprenant. Ils ne modifient pas les décisions d'apprentissage de FILUMIRE.",
  "Loading messages...": "Chargement des messages...",
  "No messages yet.": "Aucun message pour le moment.",
  "Reply": "Répondre",
  "The message service isn't available right now.": "Le service de messagerie n'est pas disponible pour le moment.",
  " of ": " sur ",
  " started": " commencés",
  "No data yet": "Pas encore de données",
  "Ready": "Prêt",
  "Not yet ready": "Pas encore prêt",
  " (done)": " (terminé)",
  " (in progress)": " (en cours)",
  "None recorded": "Rien d'enregistré",
  "None identified": "Rien d'identifié",
  "Parent": "Parent",
  "Teacher": "Enseignant",
  "Sending...": "Envoi...",
  "Send message": "Envoyer le message",
  "of": "sur",
  "competencies need attention": "compétences à surveiller",
  "mastery": "maîtrise",
  "records": "éléments",
  "Updated": "Mis à jour",
  "Not recorded": "Non enregistré",
  "Teacher observation recorded.": "Observation enregistrée.",
  "Professional note saved.": "Note professionnelle enregistrée.",
  "Teacher request submitted.": "Demande envoyée.",
  "Review recorded as": "Relecture enregistrée :",
  "Your teacher session is no longer authorized. Please sign in again.": "Votre session enseignant n'est plus autorisée. Veuillez vous reconnecter.",
  "You do not have permission to perform this action for this learner.": "Vous n'avez pas l'autorisation d'effectuer cette action pour cet apprenant.",
  "The request could not be completed.": "La demande n'a pas pu aboutir.",
  "Request practice": "Demander de l'entraînement",
  "Request explanation": "Demander une explication",
  "Request review": "Demander une révision",
  "Request reassessment": "Demander une réévaluation",
  "Context": "Contexte",
  "Instructional": "Pédagogique",
  "Professional feedback": "Retour professionnel",
  "Correct": "Correct",
  "Partial": "Partiel",
  "Incorrect": "Incorrect",
  "Skipped": "Passé",
  "Observed": "Observé",
  "Message": "Message",
};

type Translate = (text: string) => string;

const identity: Translate = (text) => text;

function percent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function label(value?: string, t: Translate = identity): string {
  if (!value) {
    return t("Not recorded");
  }

  return t(value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase()));
}

/* Tranche 4F: a pilot measure with its counts, or an honest "no data". */
function measure(
  value?: { numerator: number; denominator: number; rate: number | null },
  t: Translate = identity,
): string {
  if (!value || value.rate === null) {
    return t("No data yet");
  }

  return `${percent(value.rate)} (${value.numerator}${t(" of ")}${value.denominator})`;
}

function dateTime(value?: string, language: Language = "en"): string {
  if (!value) {
    return language === "fr" ? "Non enregistré" : "Not recorded";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString(language === "fr" ? "fr-FR" : "en-GB");
}

function requestId(prefix: string): string {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2)}`;
}

function errorMessage(error: unknown, t: Translate = identity): string {
  if (error instanceof TeacherRequestError) {
    if (error.status === 401) {
      return t("Your teacher session is no longer authorized. Please sign in again.");
    }

    if (error.status === 403) {
      return t("You do not have permission to perform this action for this learner.");
    }

    return error.message;
  }

  return t("The request could not be completed.");
}

export default function TeacherPage() {
  const [language, setLanguage] = useLanguage();
  const t = useCallback<Translate>((text) =>
    language === "fr" ? (TEACHER_FR[text] ?? text) : text, [language]);
  const [viewState, setViewState] =
    useState<ViewState>("loading");
  // A built-in teacher account (names its learners and may link
  // more); null for development identities.
  // undefined while loading, null when nobody is signed in.
  const [account, setAccount] = useState<Account | null | undefined>(undefined);
  const [data, setData] =
    useState<TeacherSummaryResponse | null>(null);
  const [selectedCompetencyId, setSelectedCompetencyId] =
    useState<string | null>(null);

  const [submissionState, setSubmissionState] =
    useState<SubmissionState>("idle");
  const [submissionMessage, setSubmissionMessage] =
    useState<string | null>(null);
  const [submissionError, setSubmissionError] =
    useState<string | null>(null);

  const [observationOutcome, setObservationOutcome] =
    useState<TeacherReviewOutcome>("observed");
  const [noteType, setNoteType] =
    useState<TeacherProfessionalNoteType>("context");
  const [noteText, setNoteText] = useState("");
  const [actionType, setActionType] =
    useState<ControlledTeacherActionType>(
      "request_practice",
    );
  const [actionReason, setActionReason] = useState("");

  const load = useCallback(
    async (
      learnerId?: string,
      preferredCompetencyId?: string | null,
      background = false,
    ) => {
      // A refresh after saving keeps the workspace on screen (and the
      // teacher's place in it) instead of swapping to the loader.
      if (!background) {
        setViewState("loading");
      }

      try {
        const result = await fetchTeacherSummary(learnerId);

        setData(result);

        if (result.summary) {
          const allCompetencies =
            result.summary.subjects.flatMap(
              (subject) => subject.competencies,
            );

          const preserved =
            preferredCompetencyId &&
            allCompetencies.some(
              (item) =>
                item.competencyId ===
                preferredCompetencyId,
            )
              ? preferredCompetencyId
              : null;

          const nextCompetencyId =
            preserved ??
            result.summary.attentionQueue[0]
              ?.competencyId ??
            allCompetencies[0]?.competencyId ??
            null;

          setSelectedCompetencyId(nextCompetencyId);
        } else {
          setSelectedCompetencyId(null);
        }

        setViewState("ready");
      } catch (error) {
        setData(null);
        setSelectedCompetencyId(null);

        setViewState(
          error instanceof TeacherRequestError &&
            error.status === 401
            ? "unauthenticated"
            : "unavailable",
        );
      }
    },
    [],
  );

  useEffect(() => {
    void load();
    fetchAccount()
      .then((value) => setAccount(value))
      .catch(() => setAccount(null));
  }, [load]);

  const teacherAccount = account?.accountKind === "teacher" || alsoTeacher(account);

  function learnerName(learnerId: string, index: number): string {
    return (
      account?.learners.find((learner) => learner.learnerId === learnerId)
        ?.displayName || `${t("Learner")} ${index + 1}`
    );
  }

  async function afterLink(learnerId: string) {
    setAccount(await fetchAccount().catch(() => account));
    // In the background, so the link form and its message stay.
    await load(learnerId, null, true);
  }

  async function afterLeave() {
    setAccount(await fetchAccount().catch(() => account));
    await load();
  }

  const selectedCompetency = useMemo(() => {
    if (!data?.summary || !selectedCompetencyId) {
      return null;
    }

    for (const subject of data.summary.subjects) {
      const competency = subject.competencies.find(
        (item) =>
          item.competencyId === selectedCompetencyId,
      );

      if (competency) {
        return competency;
      }
    }

    return null;
  }, [data, selectedCompetencyId]);

  const runSubmission = useCallback(
    async (
      operation: () => Promise<unknown>,
      successMessage: string,
    ): Promise<boolean> => {
      setSubmissionState("saving");
      setSubmissionMessage(null);
      setSubmissionError(null);

      try {
        await operation();
        setSubmissionMessage(successMessage);

        if (data?.selectedLearnerId) {
          await load(
            data.selectedLearnerId,
            selectedCompetencyId,
            true,
          );
        }

        return true;
      } catch (error) {
        setSubmissionError(errorMessage(error, t));
        return false;
      } finally {
        setSubmissionState("idle");
      }
    },
    [
      data?.selectedLearnerId,
      load,
      selectedCompetencyId,
      t,
    ],
  );

  const selectLearner = useCallback(
    (learnerId: string) => {
      setSubmissionMessage(null);
      setSubmissionError(null);
      setSelectedCompetencyId(null);
      void load(learnerId);
    },
    [load],
  );

  const recordObservation = useCallback(async () => {
    if (
      !data?.selectedLearnerId ||
      !selectedCompetency
    ) {
      return;
    }

    await runSubmission(
      () =>
        createTeacherObservation({
          learnerId: data.selectedLearnerId!,
          competencyId:
            selectedCompetency.competencyId,
          outcome: observationOutcome,
          clientRequestId: requestId(
            "teacher-observation",
          ),
        }),
      t("Teacher observation recorded."),
    );
  }, [
    data?.selectedLearnerId,
    observationOutcome,
    runSubmission,
    selectedCompetency,
    t,
  ]);

  const saveNote = useCallback(async () => {
    if (
      !data?.selectedLearnerId ||
      !selectedCompetency ||
      !noteText.trim()
    ) {
      return;
    }

    const success = await runSubmission(
      () =>
        createTeacherNote({
          learnerId: data.selectedLearnerId!,
          competencyId:
            selectedCompetency.competencyId,
          noteType,
          text: noteText.trim(),
          clientRequestId: requestId("teacher-note"),
        }),
      t("Professional note saved."),
    );

    if (success) {
      setNoteText("");
    }
  }, [
    data?.selectedLearnerId,
    noteText,
    noteType,
    runSubmission,
    selectedCompetency,
    t,
  ]);

  const submitAction = useCallback(async () => {
    if (
      !data?.selectedLearnerId ||
      !selectedCompetency
    ) {
      return;
    }

    const success = await runSubmission(
      () =>
        createTeacherAction({
          learnerId: data.selectedLearnerId!,
          competencyId:
            selectedCompetency.competencyId,
          actionType,
          reason: actionReason.trim() || undefined,
          clientRequestId: requestId(
            "teacher-action",
          ),
        }),
      t("Teacher request submitted."),
    );

    if (success) {
      setActionReason("");
    }
  }, [
    actionReason,
    actionType,
    data?.selectedLearnerId,
    runSubmission,
    selectedCompetency,
    t,
  ]);

  const reviewPendingItem = useCallback(
    async (
      reviewId: string,
      outcome: TeacherReviewOutcome,
      performanceEvidence?: PerformanceAttestation,
    ) => {
      await runSubmission(
        () =>
          submitTeacherReview({
            reviewId,
            outcome,
            performanceEvidence,
          }),
        `${t("Review recorded as")} ${label(
          outcome,
          t,
        ).toLowerCase()}.`,
      );
    },
    [runSubmission, t],
  );

  const [thread, setThread] =
    useState<TeacherThreadMessage[]>([]);
  const [threadText, setThreadText] = useState("");
  const [threadState, setThreadState] =
    useState<"idle" | "loading" | "sending" | "error">(
      "idle",
    );

  const threadLearnerId = data?.selectedLearnerId;

  useEffect(() => {
    if (!threadLearnerId) {
      setThread([]);
      return;
    }

    let alive = true;
    setThreadState("loading");

    fetchTeacherMessages(threadLearnerId)
      .then((messages) => {
        if (!alive) return;
        setThread(messages);
        setThreadState("idle");
      })
      .catch(() => {
        if (alive) setThreadState("error");
      });

    return () => {
      alive = false;
    };
  }, [threadLearnerId]);

  const sendThreadMessage = useCallback(async () => {
    if (!threadLearnerId || !threadText.trim()) {
      return;
    }

    setThreadState("sending");

    try {
      await createTeacherMessage({
        learnerId: threadLearnerId,
        text: threadText.trim(),
        clientRequestId: requestId("teacher-message"),
      });
      setThreadText("");
      setThread(
        await fetchTeacherMessages(threadLearnerId),
      );
      setThreadState("idle");
    } catch {
      setThreadState("error");
    }
  }, [threadLearnerId, threadText]);

  const busy = submissionState === "saving";

  return (
    <main className="page" lang={language}>
      <a className="filumireSkipLink" href="#teacher-main">
        {language === "fr" ? "Aller au contenu" : "Skip to content"}
      </a>
      <AdultHeader active="teacher" role={adultRole(account)} language={language} onLanguage={setLanguage} />
      <AdultRoleSwitch active="teacher" role={adultRole(account)} alsoTeacher={alsoTeacher(account)} language={language} />
      <div className="shell" id="teacher-main">
        <div className="teacherTitle">{t("Teacher Workspace")}</div>
        {data?.summary && (
            <div className="updated">
              {data.summary.updatedAt
                ? `${t("Updated")} ${dateTime(
                    data.summary.updatedAt,
                    language,
                  )}`
                : t("Learning overview")}
            </div>
          )}

        {viewState === "loading" && (
          <section className="card status-card" role="status" aria-busy="true">
            {t("Loading teacher workspace...")}
          </section>
        )}

        {viewState === "unauthenticated" && (
          <section className="card status-card">
            <h1>{t("Please sign in")}</h1>
            <p>
              {t("Teacher authorization is required to view learner information.")}
            </p>
            <a href={`/login?lang=${language}`} className="primary-button">
              {t("Go to sign in")}
            </a>
          </section>
        )}

        {viewState === "unavailable" && (
          <section className="card status-card">
            <h1>{t("Workspace unavailable")}</h1>
            <p>
              {t("The teacher workspace could not be loaded.")}
            </p>
            <button
              type="button"
              className="primary-button"
              onClick={() => void load()}
            >
              {t("Try again")}
            </button>
          </section>
        )}

        {viewState === "ready" &&
          data &&
          data.learners.length === 0 && (
            <section className="card status-card">
              <h1>{t("No learners assigned")}</h1>
              <p>
                {teacherAccount
                  ? t("Enter a code from a learner's parent or guardian below to link your first learner.")
                  : t("No active teacher-learner relationships are available.")}
              </p>
            </section>
          )}

        {viewState === "ready" && teacherAccount && data?.learners.length === 0 && (
          <TeacherLinkLearner
            language={language}
            onLinked={(learnerId) => void afterLink(learnerId)}
          />
        )}

        {viewState === "ready" &&
          data &&
          data.learners.length > 1 && (
            <section className="card selector">
              <div className="section-label">
                {t("Learner")}
              </div>
              <div className="learner-list">
                {data.learners.map(
                  (learner, index) => (
                    <button
                      key={learner.learnerId}
                      type="button"
                      className={
                        learner.learnerId ===
                        data.selectedLearnerId
                          ? "learner selected"
                          : "learner"
                      }
                      onClick={() =>
                        selectLearner(
                          learner.learnerId,
                        )
                      }
                    >
                      {learnerName(learner.learnerId, index)}
                    </button>
                  ),
                )}
              </div>
            </section>
          )}

        {viewState === "ready" &&
          data?.requiresSelection && (
            <section className="card status-card">
              <h1>{t("Select a learner")}</h1>
              <p>
                {t("Choose a learner to view their teaching priorities and progress.")}
              </p>
            </section>
          )}

        {viewState === "ready" &&
          data?.summary && (
            <>
              <section className="overview-grid">
                <div className="metric-card">
                  <div className="metric-value">
                    {
                      data.summary.attentionQueue
                        .length
                    }
                  </div>
                  <div className="metric-label">
                    {t("Need attention")}
                  </div>
                </div>

                <div className="metric-card">
                  <div className="metric-value">
                    {
                      data.summary
                        .pendingReviewCount
                    }
                  </div>
                  <div className="metric-label">
                    {t("Teacher reviews")}
                  </div>
                </div>

                <div className="metric-card">
                  <div className="metric-value">
                    {data.summary.subjects.length}
                  </div>
                  <div className="metric-label">
                    {t("Active subjects")}
                  </div>
                </div>
              </section>

              {data.summary.progress ? <section className="card">
                <h2>{t("Learning progression")}</h2>
                <ProgressBreakdown language={language} full={data.summary.progress.mastery.masteredCompetencies}
                  understandingOnly={data.summary.progress.mastery.understandingMasteredCompetencies}
                  provisional={data.summary.progress.mastery.provisionalCompetencies} />
              </section> : null}

              {data.summary.masteryMeasures && (
                <section className="card">
                  <div className="section-label">
                    {t("Mastery check")}
                  </div>
                  <h2>
                    {t("How solid is this learner's mastery?")}
                  </h2>
                  <p className="section-text">{language === "fr"
                    ? "Ces mesures d’acquisition incluent les sujets évalués pour la compréhension seule et ceux dont la progression reste à confirmer."
                    : "These acquisition measures include understanding-only topics and topics whose progress is still to be confirmed."}</p>

                  <div className="detail-grid">
                    <div>
                      <span className="detail-label">
                        {language === "fr" ? "Sujets acquis (confirmation à suivre)" : "Topics acquired (confirmation may remain)"}
                      </span>
                      <strong>
                        {data.summary.masteryMeasures.competenciesMastered}
                        {t(" of ")}
                        {data.summary.masteryMeasures.competenciesAttempted}
                        {t(" started")}
                      </strong>
                    </div>
                    <div>
                      <span className="detail-label">
                        {t("Mastery not confirmed later")}
                      </span>
                      <strong>
                        {measure(data.summary.masteryMeasures.falseMasteryRate, t)}
                      </strong>
                    </div>
                    <div>
                      <span className="detail-label">
                        {t("Remembered after a day or more")}
                      </span>
                      <strong>
                        {measure(data.summary.masteryMeasures.delayedRetentionAfterMastery, t)}
                      </strong>
                    </div>
                    <div>
                      <span className="detail-label">
                        {t("Used in a new situation")}
                      </span>
                      <strong>
                        {measure(data.summary.masteryMeasures.transferAfterMastery, t)}
                      </strong>
                    </div>
                    <div>
                      <span className="detail-label">
                        {t("Teacher marking agrees")}
                      </span>
                      <strong>
                        {measure(data.summary.masteryMeasures.teacherAgreementAfterMastery, t)}
                      </strong>
                    </div>
                    <div>
                      <span className="detail-label">
                        {t("Stuck or out of questions")}
                      </span>
                      <strong>
                        {measure(data.summary.masteryMeasures.stuckRate, t)}
                      </strong>
                    </div>
                    <div>
                      <span className="detail-label">
                        {t("Answers to reach mastery (median)")}
                      </span>
                      <strong>
                        {data.summary.masteryMeasures.medianAnswersToMastery ??
                          t("No data yet")}
                      </strong>
                    </div>
                  </div>
                </section>
              )}

              {submissionMessage && (
                <div
                  className="feedback success"
                  role="status"
                >
                  {submissionMessage}
                </div>
              )}

              {submissionError && (
                <div
                  className="feedback error"
                  role="alert"
                >
                  {submissionError}
                </div>
              )}

              <div className="workspace-split">
              <section className="card">
                <div className="section-label">
                  {t("Learning priorities")}
                </div>
                <h1>{t("Learners who may need support")}</h1>

                {data.summary.attentionQueue
                  .length === 0 ? (
                  <p>
                    {t("No competencies currently require teacher attention.")}
                  </p>
                ) : (
                  <div className="attention-list">
                    {data.summary.attentionQueue.map(
                      (item) => (
                        <button
                          key={item.competencyId}
                          type="button"
                          className="attention-item attention-button"
                          onClick={() =>
                            setSelectedCompetencyId(
                              item.competencyId,
                            )
                          }
                        >
                          <div className="attention-top">
                            <div>
                              <div className="subject">
                                {item.subjectName}
                              </div>
                              <h2>
                                {
                                  item.competencyTitle
                                }
                              </h2>
                            </div>

                            {item.attentionPriority && (
                              <span
                                className={`priority ${item.attentionPriority}`}
                              >
                                {
                                  item.attentionPriority
                                }
                              </span>
                            )}
                          </div>

                          <div className="chips">
                            {item.attentionReasons.map(
                              (reason) => (
                                <span
                                  key={reason}
                                  className="chip"
                                >
                                  {label(reason, t)}
                                </span>
                              ),
                            )}
                          </div>
                        </button>
                      ),
                    )}
                  </div>
                )}
              </section>

              <section className="card">
                <div className="section-label">
                  {t("Learning overview")}
                </div>
                <h1>{t("Learning overview")}</h1>

                <div className="subject-list">
                  {data.summary.subjects.map(
                    (subject) => (
                      <article
                        key={subject.subjectId}
                        className="subject-block"
                      >
                        <div className="subject-item">
                          <div>
                            <h2>
                              {subject.subjectName}
                            </h2>
                            <p>
                              {
                                subject.competenciesNeedingAttention
                              }{" "}
                              {t("of")}{" "}
                              {
                                subject.competencyCount
                              }{" "}
                              {t("competencies need attention")}
                            </p>
                          </div>

                          <div className="subject-stats">
                            <span>
                              Mastery{" "}
                              <strong>
                                {percent(
                                  subject.averageMastery,
                                )}
                              </strong>
                            </span>
                            <span>
                              Confidence{" "}
                              <strong>
                                {percent(
                                  subject.averageConfidence,
                                )}
                              </strong>
                            </span>
                          </div>
                        </div>

                        <div className="competency-list">
                          {subject.competencies.map(
                            (competency) => (
                              <button
                                key={
                                  competency.competencyId
                                }
                                type="button"
                                className={
                                  competency.competencyId ===
                                  selectedCompetencyId
                                    ? "competency-button selected"
                                    : "competency-button"
                                }
                                onClick={() =>
                                  setSelectedCompetencyId(
                                    competency.competencyId,
                                  )
                                }
                              >
                                <span>
                                  {
                                    competency.competencyTitle
                                  }
                                </span>
                                <span className="competency-meta">
                                  {percent(
                                    competency.masteryEstimate,
                                  )}{" "}
                                  {t("mastery")}
                                </span>
                              </button>
                            ),
                          )}
                        </div>
                      </article>
                    ),
                  )}
                </div>
              </section>
              </div>

              {data.summary.pendingReviews.length >
                0 && (
                <section className="card">
                  <div className="section-label">
                    {t("Teacher review")}
                  </div>
                  <h1>
                    {t("Learner responses to review teacher judgment")}
                  </h1>

                  <div className="review-list">
                    {data.summary.pendingReviews.map(
                      (review) => (
                        <article
                          key={review.id}
                          className="review-item"
                        >
                          <div className="detail-grid">
                            <div>
                              <span className="detail-label">
                                {t("Competency")}
                              </span>
                              <strong>
                                {
                                  review.competencyId
                                }
                              </strong>
                            </div>
                            <div>
                              <span className="detail-label">
                                {t("Assessment item")}
                              </span>
                              <strong>
                                {
                                  review.assessmentItemId
                                }
                              </strong>
                            </div>
                            <div>
                              <span className="detail-label">
                                {t("Submitted")}
                              </span>
                              <strong>
                                {dateTime(review.submittedAt, language)}
                              </strong>
                            </div>
                          </div>

                          <div className="response-box">
                            <span className="detail-label">
                              {t("Learner response")}
                            </span>
                            <div>{review.response}</div>
                          </div>

                          {review.evidenceRequirements ? <PerformanceEvidenceForm language={language} busy={busy} requirements={review.evidenceRequirements} onReview={(outcome,evidence)=>reviewPendingItem(review.id,outcome,evidence)} /> : <div className="review-actions">
                            {REVIEW_OUTCOMES.map(
                              (outcome) => (
                                <button
                                  key={outcome}
                                  type="button"
                                  className="secondary-button"
                                  disabled={busy}
                                  onClick={() =>
                                    void reviewPendingItem(
                                      review.id,
                                      outcome,
                                    )
                                  }
                                >
                                  {label(outcome, t)}
                                </button>
                              ),
                            )}
                          </div>}
                        </article>
                      ),
                    )}
                  </div>
                </section>
              )}

              {selectedCompetency && (
                <>
                  <section className="card">
                    <div className="section-label">
                      {t("Learning detail")}
                    </div>
                    <div className="detail-heading">
                      <div>
                        <div className="subject">
                          {
                            selectedCompetency.subjectName
                          }
                        </div>
                        <h1>
                          {
                            selectedCompetency.competencyTitle
                          }
                        </h1>
                      </div>

                      {selectedCompetency.attentionPriority && (
                        <span
                          className={`priority ${selectedCompetency.attentionPriority}`}
                        >
                          {
                            selectedCompetency.attentionPriority
                          }
                        </span>
                      )}
                    </div>

                    <div className="detail-grid">
                  <div>
                    <span className="detail-label">
                      {t("Learning progression")}
                    </span>
                        <strong>
                          <ProgressStatus status={selectedCompetency.progressStatus} language={language} />
                        </strong>
                        {selectedCompetency.assessmentScope === "understanding_only" ? <p>{PROGRESS_TEXT[language].scopeNote}</p> : null}
                      </div>
                      <div>
                        <span className="detail-label">
                          {t("Retention")}
                        </span>
                        <strong>
                          {label(selectedCompetency.retentionStatus, t)}
                        </strong>
                      </div>
                      <div>
                        <span className="detail-label">
                          {t("Transfer")}
                        </span>
                        <strong>
                          {label(selectedCompetency.transferStatus, t)}
                        </strong>
                      </div>
                      {selectedCompetency.prerequisiteRepair && (
                        <>
                          <div>
                            <span className="detail-label">
                              {t("Sent back to learn first")}
                            </span>
                            <strong>
                              {
                                selectedCompetency.prerequisiteRepair
                                  .competencyTitle
                              }
                              {selectedCompetency.prerequisiteRepair
                                .completed
                                ? t(" (done)")
                                : t(" (in progress)")}
                            </strong>
                          </div>
                          <div>
                            <span className="detail-label">
                              {t("Sent back on")}
                            </span>
                            <strong>
                              {dateTime(selectedCompetency.prerequisiteRepair
                                  .startedAt, language)}
                            </strong>
                          </div>
                        </>
                      )}
                      {selectedCompetency.needsSupportSince && (
                        <>
                          <div>
                            <span className="detail-label">
                              {t("Ran out of questions")}
                            </span>
                            <strong>
                              {dateTime(selectedCompetency.needsSupportSince, language)}
                            </strong>
                          </div>
                          <div>
                            <span className="detail-label">
                              {t("FILUMIRE tries again from")}
                            </span>
                            <strong>
                              {dateTime(selectedCompetency.needsSupportRetryAt, language)}
                            </strong>
                          </div>
                        </>
                      )}
                    </div>

                    {selectedCompetency.attentionReasons
                      .length > 0 && (
                      <div className="chips">
                        {selectedCompetency.attentionReasons.map(
                          (reason) => (
                            <span
                              key={reason}
                              className="chip"
                            >
                              {label(reason, t)}
                            </span>
                          ),
                        )}
                      </div>
                    )}
                  </section>

                  <section className="two-column">
                    <article className="card">
                      <div className="section-label">
                        {t("Learning insight")}
                      </div>
                      <h2>
                        {label(selectedCompetency
                            .diagnosisExplanation
                            .diagnosticState, t)}
                      </h2>
                      <p>
                        Strength of current learning signal:{" "}
                        <strong>
                          {percent(
                            selectedCompetency
                              .diagnosisExplanation
                              .confidence,
                          )}
                        </strong>
                      </p>

                      <div className="detail-stack">
                        <div>
                          <span className="detail-label">
                            {t("Patterns noticed")}
                          </span>
                          <div>
                            {selectedCompetency
                              .diagnosisExplanation
                              .errorPatterns.length >
                            0
                              ? selectedCompetency.diagnosisExplanation.errorPatterns.join(
                                  ", ",
                                )
                              : t("None recorded")}
                          </div>
                        </div>
                        <div>
                          <span className="detail-label">
                            {t("Earlier learning to revisit")}
                          </span>
                          <div>
                            {selectedCompetency
                              .diagnosisExplanation
                              .prerequisiteCompetencyIds
                              .length > 0
                              ? selectedCompetency.diagnosisExplanation.prerequisiteCompetencyIds.join(
                                  ", ",
                                )
                              : t("None identified")}
                          </div>
                        </div>
                        <div>
                          <span className="detail-label">
                            {t("Possible misunderstandings")}
                          </span>
                          <div>
                            {selectedCompetency
                              .diagnosisExplanation
                              .misconceptionIds
                              .length > 0
                              ? selectedCompetency.diagnosisExplanation.misconceptionIds.join(
                                  ", ",
                                )
                              : t("None identified")}
                          </div>
                        </div>
                      </div>
                    </article>

                    <article className="card">
                      <div className="section-label">
                        {t("FILUMIRE learning response")}
                      </div>
                      <h2>
                        {t("Current instructional direction")}
                      </h2>
                      <div className="detail-stack">
                        <div>
                          <span className="detail-label">
                            {t("Learning approach")}
                          </span>
                          <strong>
                            {label(selectedCompetency
                                .adaptiveExplanation
                                .instructionalStrategy, t)}
                          </strong>
                        </div>
                        <div>
                          <span className="detail-label">
                            {t("Support approach")}
                          </span>
                          <strong>
                            {label(selectedCompetency
                                .adaptiveExplanation
                                .responseMode, t)}
                          </strong>
                        </div>
                        <div>
                          <span className="detail-label">
                            {t("Current learning state")}
                          </span>
                          <strong>
                            {label(selectedCompetency
                                .adaptiveExplanation
                                .diagnosticState, t)}
                          </strong>
                        </div>
                        <div>
                          <span className="detail-label">
                            {t("Recent learning considered")}
                          </span>
                          <strong>
                            {
                              selectedCompetency
                                .adaptiveExplanation
                                .relevantEvidenceIds
                                .length
                            }{" "}
                            {t("records")}
                          </strong>
                        </div>
                      </div>
                    </article>
                  </section>

                  <section className="card">
                    <div className="section-label">
                      {t("Evidence")}
                    </div>
                    <h1>{t("Recent learning record")}</h1>

                    {selectedCompetency.evidence
                      .length === 0 ? (
                      <p>
                        {t("No evidence has been recorded for this competency.")}
                      </p>
                    ) : (
                      <div className="timeline">
                        {selectedCompetency.evidence.map(
                          (item) => (
                            <article
                              key={item.id}
                              className="timeline-item"
                            >
                              <div className="timeline-top">
                                <strong>
                                  {label(item.outcome, t)}
                                </strong>
                                <span>
                                  {dateTime(item.timestamp, language)}
                                </span>
                              </div>
                              <div className="chips">
                                <span className="chip">
                                  {label(item.source, t)}
                                </span>
                                {item.purpose && (
                                  <span className="chip">
                                    {label(item.purpose, t)}
                                  </span>
                                )}
                                {item.independence && (
                                  <span className="chip">
                                    {label(item.independence, t)}
                                  </span>
                                )}
                                {item.difficulty && (
                                  <span className="chip">
                                    {label(item.difficulty, t)}
                                  </span>
                                )}
                                {item.strength && (
                                  <span className="chip">
                                    {label(item.strength, t)}
                                  </span>
                                )}
                              </div>
                              {(item.errorClass ||
                                item.errorPattern) && (
                                <p>
                                  {item.errorClass
                                    ? `Error: ${label(item.errorClass, t)}`
                                    : ""}
                                  {item.errorClass &&
                                  item.errorPattern
                                    ? " | "
                                    : ""}
                                  {item.errorPattern ??
                                    ""}
                                </p>
                              )}
                            </article>
                          ),
                        )}
                      </div>
                    )}
                  </section>

                  <section className="two-column">
                    <article className="card">
                      <div className="section-label">
                        {t("Support history")}
                      </div>
                      <h1>
                        {t("Instructional interventions")}
                      </h1>

                      {selectedCompetency
                        .interventionHistory.length ===
                      0 ? (
                        <p>
                          {t("No interventions recorded.")}
                        </p>
                      ) : (
                        <div className="timeline">
                          {selectedCompetency.interventionHistory.map(
                            (item) => (
                              <div
                                key={
                                  item.interventionId
                                }
                                className="timeline-item"
                              >
                                <strong>
                                  {label(item.type, t)}
                                </strong>
                                <p>
                                  {label(item.instructionalStrategy, t)}
                                </p>
                                <div className="small">
                                  Started{" "}
                                  {dateTime(item.startedAt, language)}
                                  {item.completedAt
                                    ? ` | Completed ${dateTime(item.completedAt, language)}`
                                    : ""}
                                </div>
                                {item.outcome && (
                                  <div className="small">
                                    Outcome:{" "}
                                    {label(item.outcome, t)}
                                  </div>
                                )}
                              </div>
                            ),
                          )}
                        </div>
                      )}
                    </article>

                    <article className="card">
                      <div className="section-label">
                        {t("Learning over time")}
                      </div>
                      <h1>{t("Learning history")}</h1>

                      {selectedCompetency
                        .progressHistory.length ===
                      0 ? (
                        <p>
                          {t("No progress history recorded.")}
                        </p>
                      ) : (
                        <div className="timeline">
                          {selectedCompetency.progressHistory.map(
                            (item) => (
                              <div
                                key={
                                  item.evidenceId
                                }
                                className="timeline-item"
                              >
                                <div className="timeline-top">
                                  <strong>
                                    {label(item.outcome, t)}
                                  </strong>
                                  <span>
                                    {dateTime(item.timestamp, language)}
                                  </span>
                                </div>
                                <div className="small">
                                  {item.purpose
                                    ? `${label(item.purpose, t)}`
                                    : t("Evidence")}
                                  {item.diagnosticState
                                    ? ` | ${label(item.diagnosticState, t)}`
                                    : ""}
                                  {typeof item.diagnosticConfidence ===
                                  "number"
                                    ? ` | ${percent(
                                        item.diagnosticConfidence,
                                      )} diagnostic confidence`
                                    : ""}
                                </div>
                              </div>
                            ),
                          )}
                        </div>
                      )}
                    </article>
                  </section>

                  <section className="card">
                    <div className="section-label">
                      {t("Teacher support")}
                    </div>
                    <h1>
                      {t("Add professional context")}
                    </h1>

                    <div className="teacher-tools">
                      <article className="tool-panel">
                        <h2>
                          {t("Record observation")}
                        </h2>
                        <label>
                          {t("Outcome")}
                          <select
                            value={
                              observationOutcome
                            }
                            onChange={(event) =>
                              setObservationOutcome(
                                event.target
                                  .value as TeacherReviewOutcome,
                              )
                            }
                            disabled={busy}
                          >
                            {REVIEW_OUTCOMES.map(
                              (outcome) => (
                                <option
                                  key={outcome}
                                  value={outcome}
                                >
                                  {label(outcome, t)}
                                </option>
                              ),
                            )}
                          </select>
                        </label>
                        <button
                          type="button"
                          className="primary-button"
                          disabled={busy}
                          onClick={() =>
                            void recordObservation()
                          }
                        >
                          {t("Record observation")}
                        </button>
                      </article>

                      <article className="tool-panel">
                        <h2>
                          {t("Professional note")}
                        </h2>
                        <label>
                          {t("Note type")}
                          <select
                            value={noteType}
                            onChange={(event) =>
                              setNoteType(
                                event.target
                                  .value as TeacherProfessionalNoteType,
                              )
                            }
                            disabled={busy}
                          >
                            {NOTE_TYPES.map(
                              (option) => (
                                <option
                                  key={
                                    option.value
                                  }
                                  value={
                                    option.value
                                  }
                                >
                                  {t(option.label)}
                                </option>
                              ),
                            )}
                          </select>
                        </label>
                        <label>
                          {t("Note")}
                          <textarea
                            value={noteText}
                            onChange={(event) =>
                              setNoteText(
                                event.target.value,
                              )
                            }
                            rows={4}
                            disabled={busy}
                          />
                        </label>
                        <button
                          type="button"
                          className="primary-button"
                          disabled={
                            busy || !noteText.trim()
                          }
                          onClick={() =>
                            void saveNote()
                          }
                        >
                          {t("Save note")}
                        </button>
                      </article>

                      <article className="tool-panel">
                        <h2>
                          {t("Request learning support")}
                        </h2>
                        <label>
                          {t("Request")}
                          <select
                            value={actionType}
                            onChange={(event) =>
                              setActionType(
                                event.target
                                  .value as ControlledTeacherActionType,
                              )
                            }
                            disabled={busy}
                          >
                            {ACTION_TYPES.map(
                              (option) => (
                                <option
                                  key={
                                    option.value
                                  }
                                  value={
                                    option.value
                                  }
                                >
                                  {t(option.label)}
                                </option>
                              ),
                            )}
                          </select>
                        </label>
                        <label>
                          {t("Reason (optional)")}
                          <textarea
                            value={actionReason}
                            onChange={(event) =>
                              setActionReason(
                                event.target.value,
                              )
                            }
                            rows={4}
                            disabled={busy}
                          />
                        </label>
                        <button
                          type="button"
                          className="primary-button"
                          disabled={busy}
                          onClick={() =>
                            void submitAction()
                          }
                        >
                          {t("Submit request")}
                        </button>
                      </article>
                    </div>
                  </section>
                </>
              )}

              {data?.selectedLearnerId && (
                <section className="card">
                  <div className="section-label">
                    {t("Parent-teacher messages")}
                  </div>
                  <h1>{t("Messages with home")}</h1>
                  <p className="thread-intro">
                    {t("Messages share context with the learner's parent. They do not change FILUMIRE's learning decisions.")}
                  </p>

                  {threadState === "loading" && (
                    <p>{t("Loading messages...")}</p>
                  )}

                  {thread.length > 0 && (
                    <div className="thread-list">
                      {thread.map((message) => (
                        <div
                          key={message.id}
                          className="thread-message"
                        >
                          <div className="thread-meta">
                            <strong>
                              {message.senderRole ===
                              "guardian"
                                ? t("Parent")
                                : t("Teacher")}
                            </strong>
                            <span>
                              {dateTime(message.createdAt, language)}
                            </span>
                          </div>
                          <p>{message.text}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {threadState !== "loading" &&
                    thread.length === 0 && (
                      <p>{t("No messages yet.")}</p>
                    )}

                  <label>
                    {t("Reply")}
                    <textarea
                      value={threadText}
                      onChange={(event) =>
                        setThreadText(
                          event.target.value,
                        )
                      }
                      rows={3}
                      disabled={threadState === "sending"}
                    />
                  </label>

                  {threadState === "error" && (
                    <p className="thread-error">
                      {t("The message service isn't available right now.")}
                    </p>
                  )}

                  <button
                    type="button"
                    className="primary-button"
                    disabled={
                      threadState === "sending" ||
                      !threadText.trim()
                    }
                    onClick={() =>
                      void sendThreadMessage()
                    }
                  >
                    {threadState === "sending"
                      ? t("Sending...")
                      : t("Send message")}
                  </button>
                </section>
              )}
            </>
          )}

        {teacherAccount && (
          <div className="teacherAccount">
            {data && data.learners.length > 0 ? (
              <TeacherLinkLearner
                language={language}
                onLinked={(learnerId) => void afterLink(learnerId)}
              />
            ) : null}
            {data?.selectedLearnerId && (
              <TeacherLeaveLearner
                key={data.selectedLearnerId}
                language={language}
                learnerId={data.selectedLearnerId}
                learnerName={learnerName(
                  data.selectedLearnerId,
                  Math.max(0, data.learners.findIndex((learner) => learner.learnerId === data.selectedLearnerId)),
                )}
                onLeft={() => void afterLeave()}
              />
            )}
            <AccountSecurity language={language} minLength={8} />
            <button
              type="button"
              className="secondary-button"
              onClick={async () => {
                try {
                  await signOut();
                  window.location.assign(`/login?lang=${language}`);
                } catch (error) {
                  setSubmissionError(accountErrorMessage(error, language));
                }
              }}
            >
              {t("Sign out")}
            </button>
            {submissionError ? <p role="alert">{submissionError}</p> : null}
          </div>
        )}
      </div>

      <style jsx>{`
        .teacherAccount {
          display: grid;
          gap: 12px;
          justify-items: start;
          margin-top: 16px;
        }

        .teacherAccount :global(.secPanel),
        .teacherAccount :global(.tlCard) {
          justify-self: stretch;
        }

        .thread-intro {
          margin: 0 0 12px;
        }

        .thread-list {
          display: grid;
          gap: 10px;
          margin-bottom: 14px;
        }

        .thread-message {
          padding: 10px 12px;
          border-radius: 12px;
          background: #f4f7fc;
        }

        .thread-message p {
          margin: 4px 0 0;
          overflow-wrap: anywhere;
        }

        .thread-meta {
          display: flex;
          justify-content: space-between;
          gap: 8px;
          font-size: 13px;
        }

        .thread-error {
          color: #b42318;
        }

        .adultFooter {
          margin-top: auto;
          padding-top: 8px;
        }

        .adultFooter img {
          display: block;
          width: 100%;
          height: auto;
        }

        .teacherTitle {
          margin: 0 0 14px;
          font-size: 18px;
          font-weight: 700;
          color: #0f2a6b;
        }

        /* FILUMIRE_TEACHER_INTERFACE_PASS */

        .page {
          display: flex;
          flex-direction: column;
          --teacher-surface: #ffffff;
          --teacher-soft: #f4f9fc;
          --teacher-border: #d8e7ef;
          --teacher-muted: #5e7080;
        }
        .page {
          display: flex;
          flex-direction: column;
          min-height: 100vh;
          background: var(--filumire-bg);
          color: var(--filumire-text);
          font-family: inherit;
        }

        .shell {
          width: min(1040px, calc(100% - 32px));
          margin: 0 auto;
          padding: 28px 0 64px;
        }

        .header {
          display: flex;
          justify-content: space-between;
          align-items: end;
          gap: 20px;
          padding: 8px 0 28px;
        }

        .brand {
          font-size: 28px;
          font-weight: 800;
          letter-spacing: 0.04em;
        }

        .subtitle,
        .updated,
        .small {
          margin-top: 4px;
          color: var(--teacher-muted);
        }

        .small {
          font-size: 12px;
          line-height: 1.5;
        }

        .card,
        .metric-card {
          background: var(--teacher-surface);
          border: 1px solid var(--teacher-border);
          border-radius: 18px;
          box-shadow: 0 8px 30px
            rgba(0, 0, 0, 0.04);
        }

        .card {
          padding: 30px;
          margin-bottom: 20px;
        }

        .status-card {
          min-height: 180px;
        }

        .overview-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 8px;
          margin-bottom: 20px;
        }

        .metric-card { padding: 12px 8px; text-align: center;
        }

        .metric-value {
          font-size: 26px;
          font-weight: 800;
        }

        .metric-label {
          margin-top: 5px;
          color: var(--teacher-muted);
          font-size: 12px;
        }

        .section-label,
        .detail-label {
          color: var(--teacher-muted);
          font-size: 12px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.07em;
        }

        .section-label {
          margin-bottom: 10px;
        }

        .detail-label {
          display: block;
          margin-bottom: 5px;
        }

        h1 {
          margin: 0 0 22px;
          font-size: 26px;
        }

        h2 {
          margin: 4px 0 10px;
          font-size: 18px;
        }

        p {
          color: #555;
          line-height: 1.5;
        }

        button,
        select,
        textarea {
          font: inherit;
        }

        button {
          cursor: pointer;
        }

        button:disabled {
          cursor: not-allowed;
          opacity: 0.55;
        }

        .learner-list,
        .chips,
        .review-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
        }

        .learner {
          padding: 11px 16px;
          border: 1px solid var(--teacher-border);
          border-radius: 10px;
          background: var(--teacher-surface);
          font-size: 15px;
        }

        .learner.selected {
          border-color: var(--filumire-blue);
          background: #f3f1ec;
        }

        .attention-list,
        .subject-list,
        .review-list,
        .timeline,
        .detail-stack {
          display: grid;
          gap: 12px;
        }

        .attention-item,
        .subject-item,
        .review-item,
        .timeline-item,
        .tool-panel {
          padding: 20px;
          border: 1px solid var(--teacher-border);
          border-radius: 14px;
        }

        .attention-button {
          width: 100%;
          background: var(--teacher-surface);
          color: inherit;
          text-align: left;
        }

        .attention-button:hover,
        .competency-button:hover {
          border-color: #99958c;
        }

        .attention-top,
        .subject-item,
        .detail-heading,
        .timeline-top {
          display: flex;
          justify-content: space-between;
          gap: 20px;
        }

        .timeline-top {
          align-items: baseline;
        }

        .timeline-top span {
          color: var(--teacher-muted);
          font-size: 12px;
        }

        .subject {
          color: var(--teacher-muted);
          font-size: 13px;
          font-weight: 700;
        }

        .priority {
          height: fit-content;
          padding: 6px 9px;
          border-radius: 999px;
          background: #f3f1ec;
          font-size: 12px;
          font-weight: 700;
          text-transform: uppercase;
        }

        .priority.critical {
          border: 1px solid #b97878;
        }

        .priority.high {
          border: 1px solid #c7a46a;
        }

        .priority.medium {
          border: 1px solid #aaa;
        }

        .chips {
          margin-top: 14px;
          gap: 7px;
        }

        .chip {
          padding: 6px 9px;
          border-radius: 8px;
          background: var(--filumire-bg);
          font-size: 12px;
        }

        .mini-stats,
        .subject-stats {
          display: flex;
          flex-wrap: wrap;
          gap: 18px;
          margin-top: 16px;
          color: var(--teacher-muted);
          font-size: 13px;
        }

        .subject-stats {
          margin-top: 0;
          align-items: center;
        }

        .subject-block {
          border: 1px solid var(--teacher-border);
          border-radius: 14px;
          overflow: hidden;
        }

        .subject-block .subject-item {
          border: 0;
          border-radius: 0;
        }

        .competency-list {
          display: grid;
          border-top: 1px solid #e6e2da;
        }

        .competency-button {
          display: flex;
          justify-content: space-between;
          gap: 16px;
          padding: 13px 20px;
          border: 0;
          border-bottom: 1px solid #eeeae3;
          background: var(--teacher-surface);
          color: var(--filumire-text);
          text-align: left;
        }

        .competency-button:last-child {
          border-bottom: 0;
        }

        .competency-button.selected {
          background: #f3f1ec;
          font-weight: 700;
        }

        .competency-meta {
          flex: 0 0 auto;
          color: var(--teacher-muted);
          font-size: 12px;
          font-weight: 400;
        }

        .feedback {
          padding: 14px 18px;
          margin-bottom: 20px;
          border-radius: 12px;
          font-size: 14px;
        }

        .feedback.success {
          border: 1px solid #9cb69d;
          background: #f4f8f2;
        }

        .feedback.error {
          border: 1px solid #c89595;
          background: #fff5f5;
        }

        .detail-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 18px;
        }

        .two-column {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 20px;
        }

        .two-column .card {
          min-width: 0;
        }

        .response-box {
          padding: 16px;
          margin: 16px 0;
          border-radius: 10px;
          background: var(--filumire-bg);
          white-space: pre-wrap;
          overflow-wrap: anywhere;
        }

        .review-actions {
          margin-top: 16px;
        }

        .primary-button,
        .secondary-button {
          padding: 11px 15px;
          border-radius: 10px;
          font-weight: 600;
        }

        .primary-button {
          margin-top: 12px;
          border: 0;
          background: var(--filumire-blue);
          color: white;
        }

        .secondary-button {
          border: 1px solid #cbc7bf;
          background: var(--teacher-surface);
          color: var(--filumire-text);
        }

        .boundary-note {
          padding: 14px 16px;
          border-left: 3px solid #777;
          background: var(--filumire-bg);
        }

        .teacher-tools {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 14px;
          margin-top: 22px;
        }

        .tool-panel {
          min-width: 0;
        }

        label {
          display: grid;
          gap: 7px;
          margin-top: 14px;
          color: #555;
          font-size: 13px;
          font-weight: 700;
        }

        select,
        textarea {
          width: 100%;
          box-sizing: border-box;
          padding: 10px 11px;
          border: 1px solid #cbc7bf;
          border-radius: 9px;
          background: var(--teacher-surface);
          color: var(--filumire-text);
          font-weight: 400;
        }

        textarea {
          resize: vertical;
        }

        @media (max-width: 800px) {
          .two-column,
          .teacher-tools {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 700px) {
          .shell {
            width: min(100% - 20px, 1040px);
            padding-top: 18px;
          }

          .header,
          .attention-top,
          .subject-item,
          .detail-heading,
          .timeline-top {
            align-items: flex-start;
            flex-direction: column;
          }

          .detail-grid {
            grid-template-columns: 1fr;
          }

          .card {
            padding: 22px 18px;
          }

          .subject-stats {
            margin-top: 8px;
          }

          .competency-button {
            flex-direction: column;
            gap: 5px;
          }

          .review-actions {
            display: grid;
            grid-template-columns: 1fr 1fr;
          }
        }
        .header {
          color: var(--filumire-navy);
        }

        .brand {
          color: var(--filumire-navy);
        }

        .subtitle,
        .updated {
          color: var(--teacher-muted);
        }

        .metric-card {
          border-color: var(--teacher-border);
          background:
            linear-gradient(145deg, #ffffff 0%, #f3faff 100%);
        }

        .metric-value {
          color: var(--filumire-navy);
        }

        .metric-label,
        .section-label {
          color: var(--filumire-blue);
        }

        .card h1,
        .card h2 {
          color: var(--filumire-navy);
        }

        .attention-item,
        .subject-item,
        .review-item,
        .timeline-item,
        .tool-panel {
          border-color: var(--teacher-border);
          background: var(--teacher-surface);
        }

        .attention-button:hover,
        .competency-button:hover,
        .learner:hover {
          border-color: var(--filumire-blue);
          background: var(--teacher-soft);
        }

        .competency-button.selected,
        .learner.selected {
          border-color: var(--filumire-blue);
          background: #eef9fe;
        }

        .chip {
          border-color: #cce7f3;
          background: #eef9fe;
          color: var(--filumire-navy);
        }

        .primary-button {
          min-height: 46px;
          border-radius: 10px;
          background: var(--filumire-blue);
          color: white;
          font-weight: 700;
        }

        .secondary-button {
          border-color: var(--filumire-blue);
          color: var(--filumire-navy);
          background: white;
          font-weight: 700;
        }

        .secondary-button:hover {
          background: #eef9fe;
        }

        select,
        textarea {
          border-color: var(--teacher-border);
          background: white;
          color: var(--filumire-text);
        }

        select:focus,
        textarea:focus {
          outline-color: var(--filumire-blue);
        }

        .response-box {
          border-color: var(--teacher-border);
          background: var(--teacher-soft);
        }

        @media (max-width: 760px) {
          .header {
            align-items: flex-start;
            flex-direction: column;
            gap: 8px;
          }

          .two-column,
          .teacher-tools {
            grid-template-columns: 1fr;
          }
        }

        /* Tablet: two mastery measures per row instead of one long list */
        @media (min-width: 768px) and (max-width: 1023px) {
          .detail-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (min-width: 768px) {
          .adultFooter {
            height: clamp(140px, 18vw, 240px);
            overflow: hidden;
          }

          .adultFooter img {
            height: 100%;
            object-fit: cover;
            object-position: center 15%;
          }
        }

        /* Laptop and desktop: wider frame, metrics and measures in rows */
        @media (min-width: 1024px) {
          .shell {
            width: min(var(--filumire-frame-max), calc(100% - 64px));
            padding-top: 32px;
          }

          .overview-grid {
            gap: 20px;
            margin-bottom: 24px;
          }

          .metric-card {
            padding: 22px 16px;
          }

          .metric-value {
            font-size: 34px;
          }

          .metric-label {
            font-size: 14px;
          }

          .detail-grid {
            grid-template-columns: repeat(4, minmax(0, 1fr));
            gap: 22px;
          }

          .teacher-tools {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }
        }

        /* Desktop: priorities beside the subject overview */
        @media (min-width: 1280px) {
          .workspace-split {
            display: grid;
            grid-template-columns: minmax(0, 1fr) minmax(0, 1.25fr);
            align-items: start;
            gap: 24px;
            margin-bottom: 20px;
          }

          .workspace-split > .card {
            margin-bottom: 0;
          }
        }
      `}</style>
    <footer className="adultFooter"><img src="/images/home/landscape%20footer.png" alt="" /></footer>
    </main>
  );
}
