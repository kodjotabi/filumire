"use client";
import Link from "next/link";
import { AdultHeader, AdultRoleSwitch, adultRole } from "../../components/filumire/AdultRoleSwitch";
import { fetchAccount, type Account } from "../../services/account-client";
import { useLanguage, type Language } from "../../components/filumire/language";
import { LEARNER_GRADES } from "../../components/filumire/grades";
import { ParentProgress } from "../../components/filumire/ParentProgress";
import { ProgressStatus } from "../../components/filumire/ProgressStatus";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  AdultRequestError,
  createParentTeacherMessage,
  fetchAdultSummary,
  fetchParentTeacherMessages,
  type AdultSummaryResponse,
  type ParentTeacherMessage,
} from "../../services/adult-client";

type ViewState =
  | "loading"
  | "ready"
  | "unauthenticated"
  | "unavailable";

/*
 * Interface copy only. Learning summaries (topic names, alerts,
 * home-support guidance) come from the server and are shown as
 * written.
 */
const TEXT = {
  en: {
    subtitle: "Parent & home",
    own: "Your own learning",
    learner: "Learner",
    loading: "Loading learning overview...",
    signIn: "Please sign in",
    signInBody: "Sign in to view this learner's progress.",
    goSignIn: "Go to sign in",
    unavailable: "Overview isn't available right now",
    unavailableBody: "We couldn't load the learning overview. Please try again.",
    retry: "Try again",
    noLearners: "No learners linked yet",
    noLearnersBody: "There is no learner linked to your account yet.",
    select: "Select a learner",
    overview: "Learning overview",
    current: "Current learning",
    ready: "Ready when they are",
    progress: "this topic",
    progressLabel: "FILUMIRE's mastery estimate for the current topic",
    estimateNote:
      "The circle is FILUMIRE's current estimate for this one topic, not overall progress. Overall progress is shown below.",
    next: "What comes next",
    notStarted:
      "Once learning begins, you will see progress, current learning and useful ways to support the learner here.",
    attention: "Needs your attention",
    going: "How learning is going",
    well: "Going well",
    support: "Needs more support",
    home: "What you can do at home",
    recent: "Recent learning",
    messages: "Parent-teacher messages",
    messagesIntro:
      "Share useful learning context with the teacher. Messages do not change FILUMIRE's learning decisions.",
    loadingMessages: "Loading messages...",
    parent: "Parent",
    teacher: "Teacher",
    noMessages: "No messages yet.",
    message: "Message",
    placeholder: "Share something that may help the teacher support this learner.",
    messageError: "The message service isn't available right now.",
    sending: "Sending...",
    send: "Send message",
    sent: "Message sent.",
    outcomes: {
      correct: "Correct",
      incorrect: "Needs practice",
      partial: "Partly correct",
      other: "Recorded",
    },
  },
  fr: {
    subtitle: "Parents et maison",
    own: "Votre propre apprentissage",
    learner: "Apprenant",
    loading: "Chargement de l'aperçu...",
    signIn: "Veuillez vous connecter",
    signInBody: "Connectez-vous pour voir la progression de cet apprenant.",
    goSignIn: "Aller à la connexion",
    unavailable: "L'aperçu n'est pas disponible pour le moment",
    unavailableBody: "Nous n'avons pas pu charger l'aperçu. Veuillez réessayer.",
    retry: "Réessayer",
    noLearners: "Aucun apprenant associé",
    noLearnersBody: "Aucun apprenant n'est encore associé à votre compte.",
    select: "Choisir un apprenant",
    overview: "Aperçu de l'apprentissage",
    current: "Apprentissage en cours",
    ready: "Prêt quand il le sera",
    progress: "ce thème",
    progressLabel: "Estimation de maîtrise de FILUMIRE pour le thème en cours",
    estimateNote:
      "Le cercle indique l'estimation actuelle de FILUMIRE pour ce seul thème, pas la progression globale. La progression globale est présentée plus bas.",
    next: "La suite",
    notStarted:
      "Dès que l'apprentissage commence, vous verrez ici la progression, le thème en cours et des idées pour aider l'apprenant.",
    attention: "À surveiller",
    going: "Comment se passe l'apprentissage",
    well: "Ce qui va bien",
    support: "Besoin de plus d'aide",
    home: "Ce que vous pouvez faire à la maison",
    recent: "Apprentissage récent",
    messages: "Messages parents-enseignant",
    messagesIntro:
      "Partagez des informations utiles avec l'enseignant. Les messages ne modifient pas les décisions d'apprentissage de FILUMIRE.",
    loadingMessages: "Chargement des messages...",
    parent: "Parent",
    teacher: "Enseignant",
    noMessages: "Aucun message pour le moment.",
    message: "Message",
    placeholder: "Partagez ce qui peut aider l'enseignant à accompagner cet apprenant.",
    messageError: "Le service de messagerie n'est pas disponible pour le moment.",
    sending: "Envoi...",
    send: "Envoyer le message",
    sent: "Message envoyé.",
    outcomes: {
      correct: "Correct",
      incorrect: "À retravailler",
      partial: "En partie correct",
      other: "Enregistré",
    },
  },
} as const;

function locale(language: Language): string {
  return language === "fr" ? "fr-FR" : "en-GB";
}

function formatDate(value: string, language: Language): string {
  try {
    return new Date(value).toLocaleDateString(locale(language));
  } catch {
    return value;
  }
}

function formatDateTime(value: string, language: Language): string {
  try {
    return new Date(value).toLocaleString(locale(language));
  } catch {
    return value;
  }
}

export default function AdultSupervisionPage() {
  const [language, setLanguage] = useLanguage();
  const t = TEXT[language];

  const [viewState, setViewState] =
    useState<ViewState>("loading");

  const [data, setData] =
    useState<AdultSummaryResponse | null>(null);

  const [messages, setMessages] =
    useState<ParentTeacherMessage[]>([]);

  const [messageText, setMessageText] =
    useState("");

  const [messageState, setMessageState] =
    useState<
      "idle" | "loading" | "sending" | "sent" | "error"
    >("idle");

  // undefined while loading, null when nobody is signed in.
  const [account, setAccount] =
    useState<Account | null | undefined>(undefined);

  useEffect(() => {
    fetchAccount()
      .then((value) => setAccount(value))
      .catch(() => setAccount(null));
  }, []);

  const role = adultRole(account);

  const selectedLearnerId = useRef<string | undefined>(undefined);
  const loadSequence = useRef(0);

  const load = useCallback(
    async (learnerId?: string) => {
      const sequence = ++loadSequence.current;
      selectedLearnerId.current = learnerId;
      setViewState("loading");
      setMessages([]);
      setMessageState("idle");

      try {
        const result =
          await fetchAdultSummary(learnerId);

        if (sequence !== loadSequence.current) return;
        selectedLearnerId.current = result.selectedLearnerId;
        setData(result);
        setViewState("ready");

        const selected =
          result.learners.find(
            (learner) =>
              learner.learnerId ===
              result.selectedLearnerId,
          );

        if (
          result.selectedLearnerId &&
          selected?.relationshipType === "guardian"
        ) {
          setMessageState("loading");

          try {
            const messageResult =
              await fetchParentTeacherMessages(
                result.selectedLearnerId,
              );

            if (sequence !== loadSequence.current) return;
            setMessages(messageResult.messages);
            setMessageState("idle");
          } catch {
            if (sequence !== loadSequence.current) return;
            setMessageState("error");
          }
        }
      } catch (err) {
        if (sequence !== loadSequence.current) return;
        setData(null);

        setViewState(
          err instanceof AdultRequestError &&
            err.status === 401
            ? "unauthenticated"
            : "unavailable",
        );
      }
    },
    [],
  );

  useEffect(() => {
    void load(selectedLearnerId.current);
    return () => { loadSequence.current += 1; };
  }, [load, language]);

  const selectedLearner = useMemo(
    () =>
      data?.learners.find(
        (learner) =>
          learner.learnerId ===
          data.selectedLearnerId,
      ),
    [data],
  );

  const isGuardian =
    selectedLearner?.relationshipType === "guardian";

  function relationshipLabel(
    relationshipType: string,
    index: number,
  ): string {
    return relationshipType === "self"
      ? t.own
      : `${t.learner} ${index + 1}`;
  }

  function outcomeLabel(outcome: string): string {
    switch (outcome) {
      case "correct":
        return t.outcomes.correct;
      case "incorrect":
        return t.outcomes.incorrect;
      case "partial":
        return t.outcomes.partial;
      default:
        return t.outcomes.other;
    }
  }

  async function sendMessage() {
    if (
      !data?.selectedLearnerId ||
      !isGuardian ||
      !messageText.trim()
    ) {
      return;
    }

    setMessageState("sending");

    try {
      await createParentTeacherMessage({
        learnerId: data.selectedLearnerId,
        text: messageText.trim(),
        clientRequestId: crypto.randomUUID(),
      });

      setMessageText("");

      const refreshed =
        await fetchParentTeacherMessages(
          data.selectedLearnerId,
        );

      setMessages(refreshed.messages);
      setMessageState("sent");
    } catch {
      setMessageState("error");
    }
  }

  return (
    <main className="page" lang={language}>
      <a className="filumireSkipLink" href="#adult-main">
        {language === "fr" ? "Aller au contenu" : "Skip to content"}
      </a>
      <AdultHeader active="parent" role={role} language={language} onLanguage={setLanguage} />
      <AdultRoleSwitch active="parent" role={role} language={language} />
      <div className="shell" id="adult-main">
        <div className="brand-subtitle">{t.subtitle}</div>

        {viewState === "loading" && (
          <section className="card loading-card" aria-busy="true">
            <div className="loader" />
            <p role="status">{t.loading}</p>
          </section>
        )}

        {viewState === "unauthenticated" && (
          <section className="card">
            <h1>{t.signIn}</h1>
            <p>{t.signInBody}</p>
            <Link href={`/login?lang=${language}&returnTo=family`} className="primary-button">
              {t.goSignIn}
            </Link>
          </section>
        )}

        {viewState === "unavailable" && (
          <section className="card" role="alert">
            <h1>{t.unavailable}</h1>
            <p>{t.unavailableBody}</p>
            <button
              type="button"
              onClick={() => void load()}
              className="primary-button"
            >
              {t.retry}
            </button>
          </section>
        )}

        {viewState === "ready" &&
          data &&
          data.learners.length === 0 && (
            <section className="card">
              <h1>{t.noLearners}</h1>
              <p>{t.noLearnersBody}</p>
            </section>
          )}

        {viewState === "ready" &&
          data &&
          data.learners.length > 1 && (
            <section className="card">
              <div className="eyebrow" id="learner-select-label">
                {t.select}
              </div>

              <div className="learner-list" role="group" aria-labelledby="learner-select-label">
                {data.learners.map(
                  (learner, index) => (
                    <button
                      key={learner.learnerId}
                      type="button"
                      aria-pressed={learner.learnerId === data.selectedLearnerId}
                      className={
                        learner.learnerId ===
                        data.selectedLearnerId
                          ? "learner-option selected"
                          : "learner-option"
                      }
                      onClick={() =>
                        void load(learner.learnerId)
                      }
                    >
                      {account?.learners.find((profile) => profile.learnerId === learner.learnerId)?.displayName || relationshipLabel(
                        learner.relationshipType,
                        index,
                      )}
                    </button>
                  ),
                )}
              </div>
            </section>
          )}

        {viewState === "ready" &&
          data?.summary && (
            <div className="parent-grid">
              <section className="card hero-card parent-overview">
                <div className="parent-overview-top">
                  <div>
                    <div className="eyebrow">
                      {t.overview}
                    </div>
                    <h1>
                      {data.summary.hasActivity
                        ? data.summary.competencyTitle ??
                          t.current
                        : t.ready}
                    </h1>
                    <p className="parent-subject">
                      {data.summary.subjectName ??
                        t.current}
                    </p>
                  </div>

                  {data.summary.hasActivity && (
                    <div
                      className="parent-progress-ring"
                      role="img"
                      aria-label={`${t.progressLabel}: ${data.summary.masteryPercent}%`}
                    >
                      <strong aria-hidden="true">
                        {data.summary.masteryPercent}%
                      </strong>
                      <span aria-hidden="true">{t.progress}</span>
                    </div>
                  )}
                </div>

                {data.summary.hasActivity ? (
                  <>
                    <p className="section-text">
                      {t.estimateNote}
                    </p>
                    {data.summary.progressStatus ? <p><ProgressStatus status={data.summary.progressStatus} language={language} /></p> : null}
                    {data.summary.assessmentScopeNote ? <p className="section-text">{data.summary.assessmentScopeNote}</p> : null}

                    {data.summary.nextFocus && (
                      <div className="parent-focus">
                        <span>{t.next}</span>
                        <strong>
                          {data.summary.nextFocus}
                        </strong>
                      </div>
                    )}
                  </>
                ) : (
                  <p className="section-text">
                    {t.notStarted}
                  </p>
                )}
              </section>

              {data.summary.progress && (
                <ParentProgress
                  progress={data.summary.progress}
                  gradeLabel={
                    LEARNER_GRADES.find(
                      (grade) => grade.id === data.summary?.progress?.gradeId,
                    )?.name[language] ?? data.summary.progress.gradeName
                  }
                  language={language}
                />
              )}

              {data.summary.alerts &&
                data.summary.alerts.length > 0 && (
                  <section className="card">
                    <h2 className="section-heading">
                      {t.attention}
                    </h2>

                    <div className="stack">
                      {data.summary.alerts.map(
                        (alert) => (
                          <div
                            key={alert.id}
                            className={`alert ${alert.level}`}
                          >
                            <strong>{alert.title}</strong>
                            <p>{alert.message}</p>
                          </div>
                        ),
                      )}
                    </div>
                  </section>
                )}

              {((data.summary.strengths?.length ??
                0) > 0 ||
                (data.summary.supportAreas?.length ??
                  0) > 0) && (
                <section className="card">
                  <h2 className="section-heading">
                    {t.going}
                  </h2>

                  {data.summary.strengths &&
                    data.summary.strengths.length >
                      0 && (
                      <div>
                        <h3 className="section-label">
                          {t.well}
                        </h3>
                        <ul className="plain-list">
                          {data.summary.strengths.map(
                            (item) => (
                              <li key={item}>
                                {item}
                              </li>
                            ),
                          )}
                        </ul>
                      </div>
                    )}

                  {data.summary.supportAreas &&
                    data.summary.supportAreas.length >
                      0 && (
                      <div>
                        <h3 className="section-label">
                          {t.support}
                        </h3>
                        <ul className="plain-list">
                          {data.summary.supportAreas.map(
                            (item) => (
                              <li key={item}>
                                {item}
                              </li>
                            ),
                          )}
                        </ul>
                      </div>
                    )}
                </section>
              )}

              {data.summary.homeSupport &&
                data.summary.homeSupport.length >
                  0 && (
                  <section className="card">
                    <h2 className="section-heading">
                      {t.home}
                    </h2>

                    <div className="stack">
                      {data.summary.homeSupport.map(
                        (item) => (
                          <div
                            key={item.id}
                            className="support-item"
                          >
                            <strong>{item.title}</strong>
                            <p>{item.guidance}</p>
                            <div className="boundary">
                              {item.boundary}
                            </div>
                          </div>
                        ),
                      )}
                    </div>
                  </section>
                )}

              {data.summary.recentActivity.length >
                0 && (
                <section className="card">
                  <h2 className="section-heading">
                    {t.recent}
                  </h2>

                  <ul className="activity-list">
                    {data.summary.recentActivity.map(
                      (entry, index) => (
                        <li key={index}>
                          <span>
                            {outcomeLabel(
                              entry.outcome,
                            )}
                          </span>
                          <time dateTime={entry.occurredAt}>
                            {formatDate(
                              entry.occurredAt,
                              language,
                            )}
                          </time>
                        </li>
                      ),
                    )}
                  </ul>
                </section>
              )}

              {isGuardian && (
                <section className="card parent-messages">
                  <h2 className="section-heading">
                    {t.messages}
                  </h2>

                  <p className="section-intro">
                    {t.messagesIntro}
                  </p>

                  {messageState === "loading" && (
                    <p role="status">{t.loadingMessages}</p>
                  )}

                  {messages.length > 0 && (
                    <div className="message-list">
                      {messages.map((message) => (
                        <div
                          key={message.id}
                          className="message"
                        >
                          <div className="message-meta">
                            <strong>
                              {message.senderRole ===
                              "guardian"
                                ? t.parent
                                : t.teacher}
                            </strong>
                            <time dateTime={message.createdAt}>
                              {formatDateTime(
                                message.createdAt,
                                language,
                              )}
                            </time>
                          </div>
                          <p>{message.text}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {messageState !== "loading" &&
                    messages.length === 0 && (
                      <p>
                        {t.noMessages}
                      </p>
                    )}

                  <label
                    className="message-label"
                    htmlFor="parent-message"
                  >
                    {t.message}
                  </label>

                  <textarea
                    id="parent-message"
                    value={messageText}
                    onChange={(event) => {
                      setMessageText(
                        event.target.value,
                      );
                      if (messageState === "sent") setMessageState("idle");
                    }}
                    rows={4}
                    maxLength={2000}
                    placeholder={t.placeholder}
                  />

                  <p className="message-status" role="status" aria-live="polite">
                    {messageState === "error"
                      ? t.messageError
                      : messageState === "sent"
                        ? t.sent
                        : ""}
                  </p>

                  <button
                    type="button"
                    className="primary-button"
                    disabled={
                      messageState === "sending" ||
                      !messageText.trim()
                    }
                    onClick={() =>
                      void sendMessage()
                    }
                  >
                    {messageState === "sending"
                      ? t.sending
                      : t.send}
                  </button>
                </section>
              )}
            </div>
          )}
      </div>

      <style jsx>{`
        /* Overhaul: real headings keep the card look; message status */
        h2.section-heading {
          margin-top: 0;
        }

        h3.section-label {
          line-height: 1.3;
        }

        .message-status {
          margin: 8px 0 0;
          color: #1c6b3a;
          font-weight: 700;
        }

        .message-status:empty {
          margin: 0;
        }
      `}</style>
      <style jsx>{`
        .adultFooter {
          margin-top: auto;
          padding-top: 8px;
        }

        .adultFooter img {
          display: block;
          width: 100%;
          height: auto;
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
          width: min(920px, calc(100% - 32px));
          margin: 0 auto;
          padding: 28px 0 64px;
        }

        .header {
          padding: 8px 0 28px;
        }

        .brand {
          font-size: 28px;
          font-weight: 800;
          letter-spacing: 0.04em;
        }

        .brand-subtitle { margin: 0 0 14px; font-size: 18px; font-weight: 700; color: #0f2a6b; }

        .card {
          margin-bottom: 18px;
          background: white;
          border: 1px solid var(--filumire-border);
          border-radius: var(--filumire-radius-lg);
          padding: 30px;
          box-shadow: var(--filumire-shadow);
        }

        .parent-overview {
          border-color: #cfe5f2;
          background:
            linear-gradient(145deg, #ffffff 0%, #f3faff 100%);
        }

        .parent-overview-top {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 28px;
        }

        .parent-overview h1 {
          margin: 7px 0 0;
          max-width: 560px;
          color: var(--filumire-navy);
          font-size: clamp(26px, 4vw, 38px);
          line-height: 1.12;
        }

        .parent-subject {
          margin: 9px 0 0;
          color: var(--filumire-muted);
          font-size: 15px;
          font-weight: 700;
        }

        .parent-progress-ring {
          width: 108px;
          min-width: 108px;
          height: 108px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          border: 9px solid #dff2fb;
          border-radius: 50%;
          background: white;
          color: var(--filumire-navy);
          box-shadow: var(--filumire-shadow);
        }

        .parent-progress-ring strong {
          font-size: 25px;
          line-height: 1;
        }

        .parent-progress-ring span {
          margin-top: 5px;
          color: var(--filumire-muted);
          font-size: 10px;
          font-weight: 800;
          text-transform: uppercase;
        }

        .parent-progress-track {
          height: 10px;
          margin-top: 26px;
          overflow: hidden;
          border-radius: 999px;
          background: #e4edf3;
        }

        .parent-progress-fill {
          height: 100%;
          border-radius: inherit;
          background: var(--filumire-green);
        }

        .parent-focus {
          display: flex;
          flex-direction: column;
          gap: 5px;
          margin-top: 22px;
          padding: 16px 18px;
          border-radius: var(--filumire-radius-md);
          background: white;
          border: 1px solid var(--filumire-border);
        }

        .parent-focus span {
          color: var(--filumire-blue);
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.05em;
          text-transform: uppercase;
        }

        .parent-focus strong {
          color: var(--filumire-text);
          font-size: 16px;
          line-height: 1.4;
        }

        @media (max-width: 600px) {
          .parent-overview-top {
            flex-direction: column;
          }

          .parent-progress-ring {
            width: 92px;
            min-width: 92px;
            height: 92px;
          }
        }
        .hero-card {
          padding-top: 34px;
        }

        .loading-card {
          min-height: 220px;
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

        .eyebrow {
          margin-bottom: 12px;
          color: var(--filumire-muted);
          font-size: 13px;
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }

        h1 {
          margin: 0 0 20px;
          font-size: clamp(24px, 4vw, 32px);
          line-height: 1.15;
        }

        p {
          line-height: 1.6;
          color: var(--filumire-muted);
        }

        .adult-section-accent {
          width: 42px;
          height: 4px;
          margin-bottom: 12px;
          border-radius: 999px;
          background: var(--filumire-blue);
        }

        .section-heading {
          color: var(--filumire-navy);
        }

        .section-label {
          color: var(--filumire-blue);
        }

        .alert,
        .support-item,
        .message {
          line-height: 1.5;
        }

        .alert strong,
        .support-item strong,
        .message strong {
          color: var(--filumire-navy);
        }

        .boundary {
          padding-top: 10px;
          border-top: 1px solid var(--filumire-border);
        }

        textarea {
          background: white;
          color: var(--filumire-text);
        }

        .primary-button {
          min-height: 48px;
          transition:
            transform 120ms ease,
            box-shadow 120ms ease;
        }

        .primary-button:not(:disabled):hover {
          transform: translateY(-1px);
          box-shadow: var(--filumire-shadow);
        }
        .section-heading {
          margin-bottom: 18px;
          font-size: 20px;
          font-weight: 800;
        }

        .section-intro {
          margin-top: -6px;
        }

        .section-label {
          margin: 20px 0 10px;
          font-size: 13px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          color: #666;
        }

        .section-text {
          margin-top: 14px;
        }

        .stat-row {
          display: flex;
          gap: 32px;
          margin-bottom: 20px;
        }

        .stat-value {
          font-size: 30px;
          font-weight: 800;
        }

        .stat-label {
          margin-top: 4px;
          color: var(--filumire-muted);
          font-size: 13px;
        }

        .stack {
          display: grid;
          gap: 12px;
        }

        .alert,
        .support-item {
          padding: 16px;
          border: 1px solid var(--filumire-border);
          border-radius: 12px;
          background: #f8fbfd;
        }

        .alert p,
        .support-item p,
        .message p {
          margin: 7px 0 0;
        }

        .alert.positive {
          background: #f3f8f3;
          border-color: #b8cdb8;
        }

        .alert.attention {
          background: #fff9ed;
          border-color: #e5d4a8;
        }

        .boundary {
          margin-top: 10px;
          font-size: 13px;
          line-height: 1.5;
          color: var(--filumire-muted);
        }

        .plain-list {
          margin: 0;
          padding-left: 20px;
          color: var(--filumire-muted);
          line-height: 1.6;
        }

        .plain-list li {
          margin-bottom: 7px;
        }

        .activity-list {
          list-style: none;
          margin: 0;
          padding: 0;
        }

        .activity-list li {
          display: flex;
          justify-content: space-between;
          gap: 20px;
          padding: 12px 0;
          border-bottom: 1px solid var(--filumire-border);
        }

        .activity-list li:last-child {
          border-bottom: 0;
        }

        .activity-list time {
          color: var(--filumire-muted);
          font-size: 14px;
        }

        .learner-list {
          display: grid;
          gap: 10px;
        }

        .learner-option {
          padding: 16px 18px;
          border: 1px solid var(--filumire-border);
          border-radius: 12px;
          background: white;
          font-size: 16px;
          text-align: left;
          cursor: pointer;
        }

        .learner-option.selected {
          border-color: var(--filumire-blue);
          background: var(--filumire-blue-soft);
        }

        .message-list {
          display: grid;
          gap: 10px;
          margin: 20px 0;
        }

        .message {
          padding: 14px 16px;
          border-radius: 12px;
          background: #f8fbfd;
          border: 1px solid var(--filumire-border);
        }

        .message-meta {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          color: var(--filumire-muted);
          font-size: 13px;
        }

        .message-label {
          display: block;
          margin: 20px 0 8px;
          font-weight: 700;
        }

        textarea {
          width: 100%;
          box-sizing: border-box;
          resize: vertical;
          padding: 13px;
          border: 1px solid var(--filumire-border);
          border-radius: 10px;
          font: inherit;
          line-height: 1.5;
        }

        textarea:focus {
          outline: 3px solid var(--filumire-blue);
          outline-offset: 2px;
        }

        .primary-button {
          margin-top: 14px;
          padding: 13px 22px;
          border: 0;
          border-radius: 10px;
          background: var(--filumire-blue);
          color: white;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
        }

        .primary-button:disabled {
          opacity: 0.5;
          cursor: default;
        }

        .error-text {
          color: #8a2c2c;
        }

        @media (max-width: 600px) {
          .shell {
            width: min(100% - 20px, 720px);
            padding-top: 18px;
          }

          .card {
            padding: 22px 18px;
          }

          .stat-row {
            gap: 24px;
          }

          .activity-list li,
          .message-meta {
            align-items: flex-start;
            flex-direction: column;
            gap: 4px;
          }
        }

        /* Tablet: a little more room inside the overview */
        @media (min-width: 768px) {
          .brand-subtitle {
            margin-bottom: 18px;
            font-size: 22px;
          }

          .parent-progress-ring {
            width: 124px;
            min-width: 124px;
            height: 124px;
          }

          .parent-progress-ring strong {
            font-size: 30px;
          }

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

        /* Laptop and desktop: overview across the top, the detail
           cards in two columns, messages full width underneath */
        @media (min-width: 1024px) {
          .shell {
            width: min(var(--filumire-frame-max), calc(100% - 64px));
            padding-top: 32px;
          }

          .parent-grid {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            align-items: start;
            gap: 24px;
          }

          .parent-grid > .card {
            margin-bottom: 0;
          }

          .parent-grid > .parent-overview,
          .parent-grid > .parent-messages {
            grid-column: 1 / -1;
          }

          .parent-overview {
            padding: 36px 40px;
          }

          .parent-messages .message-list {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .parent-messages textarea {
            max-width: 760px;
          }
        }
      `}</style>
    <footer className="adultFooter"><img src="/images/home/landscape%20footer.png" alt="" /></footer>
    </main>
  );
}
