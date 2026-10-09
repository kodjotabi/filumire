"use client";
import Link from "next/link";
import { AdultRoleSwitch } from "../../components/filumire/AdultRoleSwitch";

import {
  useCallback,
  useEffect,
  useMemo,
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

function relationshipLabel(
  relationshipType: string,
  index: number,
): string {
  if (relationshipType === "self") {
    return "Your own learning";
  }

  if (relationshipType === "guardian") {
    return `Learner ${index + 1}`;
  }

  return `Learner ${index + 1}`;
}

function formatDate(value: string): string {
  try {
    return new Date(value).toLocaleDateString();
  } catch {
    return value;
  }
}

function formatDateTime(value: string): string {
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

function outcomeLabel(outcome: string): string {
  switch (outcome) {
    case "correct":
      return "Correct";
    case "incorrect":
      return "Needs practice";
    case "partial":
      return "Partly correct";
    default:
      return "Recorded";
  }
}

export default function AdultSupervisionPage() {
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
      "idle" | "loading" | "sending" | "error"
    >("idle");

  const load = useCallback(
    async (learnerId?: string) => {
      setViewState("loading");
      setMessages([]);
      setMessageState("idle");

      try {
        const result =
          await fetchAdultSummary(learnerId);

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

            setMessages(messageResult.messages);
            setMessageState("idle");
          } catch {
            setMessageState("error");
          }
        }
      } catch (err) {
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
    void load();
  }, [load]);

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
      setMessageState("idle");
    } catch {
      setMessageState("error");
    }
  }

  return (
    <main className="page">
      <header className="filumireLearnerHeader"><Link href="/" className="filumireHeaderLogo" aria-label="FILUMIRE home"><img src="/filumire-logo-white.svg" alt="FILUMIRE" /></Link></header>
      <AdultRoleSwitch active="parent" />
      <div className="shell">
        <div className="brand-subtitle">Parent &amp; home</div>

        {viewState === "loading" && (
          <section className="card loading-card">
            <div className="loader" />
            <p>Loading learning overview...</p>
          </section>
        )}

        {viewState === "unauthenticated" && (
          <section className="card">
            <h1>Please sign in</h1>
            <p>
              Sign in to view this learner&apos;s
              progress.
            </p>
            <a href="/login" className="primary-button">
              Go to sign in
            </a>
          </section>
        )}

        {viewState === "unavailable" && (
          <section className="card">
            <h1>
              Overview isn&apos;t available right now
            </h1>
            <p>
              We couldn&apos;t load the learning
              overview. Please try again.
            </p>
            <button
              type="button"
              onClick={() => void load()}
              className="primary-button"
            >
              Try again
            </button>
          </section>
        )}

        {viewState === "ready" &&
          data &&
          data.learners.length === 0 && (
            <section className="card">
              <h1>No learners linked yet</h1>
              <p>
                There is no learner linked to your
                account yet.
              </p>
            </section>
          )}

        {viewState === "ready" &&
          data &&
          data.learners.length > 1 && (
            <section className="card">
              <div className="eyebrow">
                Select a learner
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
                          ? "learner-option selected"
                          : "learner-option"
                      }
                      onClick={() =>
                        void load(learner.learnerId)
                      }
                    >
                      {relationshipLabel(
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
                      Learning overview
                    </div>
                    <h1>
                      {data.summary.hasActivity
                        ? data.summary.competencyTitle ??
                          "Current learning"
                        : "Ready when they are"}
                    </h1>
                    <p className="parent-subject">
                      {data.summary.subjectName ??
                        "Current learning"}
                    </p>
                  </div>

                  {data.summary.hasActivity && (
                    <div
                      className="parent-progress-ring"
                      aria-label={`${data.summary.masteryPercent}% progress`}
                    >
                      <strong>
                        {data.summary.masteryPercent}%
                      </strong>
                      <span>progress</span>
                    </div>
                  )}
                </div>

                {data.summary.hasActivity ? (
                  <>
                    <div className="parent-progress-track">
                      <div
                        className="parent-progress-fill"
                        style={{
                          width: `${Math.max(
                            0,
                            Math.min(
                              100,
                              data.summary.masteryPercent,
                            ),
                          )}%`,
                        }}
                      />
                    </div>

                    {data.summary.nextFocus && (
                      <div className="parent-focus">
                        <span>What comes next</span>
                        <strong>
                          {data.summary.nextFocus}
                        </strong>
                      </div>
                    )}
                  </>
                ) : (
                  <p className="section-text">
                    Once learning begins, you will see progress,
                    current learning and useful ways to support
                    the learner here.
                  </p>
                )}
              </section>

              {data.summary.alerts &&
                data.summary.alerts.length > 0 && (
                  <section className="card">
                    <div className="section-heading">
                      Needs your attention
                    </div>

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
                  <div className="section-heading">
                    How learning is going
                  </div>

                  {data.summary.strengths &&
                    data.summary.strengths.length >
                      0 && (
                      <div>
                        <div className="section-label">
                          Going well
                        </div>
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
                        <div className="section-label">
                          Needs more support
                        </div>
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
                    <div className="section-heading">
                      What you can do at home
                    </div>

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
                  <div className="section-heading">
                    Recent learning
                  </div>

                  <ul className="activity-list">
                    {data.summary.recentActivity.map(
                      (entry, index) => (
                        <li key={index}>
                          <span>
                            {outcomeLabel(
                              entry.outcome,
                            )}
                          </span>
                          <time>
                            {formatDate(
                              entry.occurredAt,
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
                  <div className="section-heading">
                    Parent-teacher messages
                  </div>

                  <p className="section-intro">
                    Share useful learning context with
                    the teacher. Messages do not change
                    FILUMIRE&apos;s learning decisions.
                  </p>

                  {messageState === "loading" && (
                    <p>Loading messages...</p>
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
                                ? "Parent"
                                : "Teacher"}
                            </strong>
                            <span>
                              {formatDateTime(
                                message.createdAt,
                              )}
                            </span>
                          </div>
                          <p>{message.text}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {messageState !== "loading" &&
                    messages.length === 0 && (
                      <p>
                        No messages yet.
                      </p>
                    )}

                  <label
                    className="message-label"
                    htmlFor="parent-message"
                  >
                    Message
                  </label>

                  <textarea
                    id="parent-message"
                    value={messageText}
                    onChange={(event) =>
                      setMessageText(
                        event.target.value,
                      )
                    }
                    rows={4}
                    placeholder="Share something that may help the teacher support this learner."
                  />

                  {messageState === "error" && (
                    <p className="error-text">
                      The message service isn&apos;t
                      available right now.
                    </p>
                  )}

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
                      ? "Sending..."
                      : "Send message"}
                  </button>
                </section>
              )}
            </div>
          )}
      </div>

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
