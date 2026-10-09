"use client";

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
      <div className="shell">
        <header className="header">
          <div>
            <div className="brand">FILUMIRE</div>
            <div className="brand-subtitle">
              Parent &amp; home
            </div>
          </div>
        </header>

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
            <>
              <section className="card hero-card">
                <div className="eyebrow">
                  {data.summary.subjectName ??
                    "Current learning"}
                </div>

                <h1>
                  {data.summary.hasActivity
                    ? data.summary.competencyTitle ??
                      "Current learning"
                    : "No learning activity yet"}
                </h1>

                {data.summary.hasActivity ? (
                  <>
                    <div className="stat-row">
                      <div className="stat">
                        <div className="stat-value">
                          {data.summary.masteryPercent}%
                        </div>
                        <div className="stat-label">
                          Progress
                        </div>
                      </div>

                      <div className="stat">
                        <div className="stat-value">
                          {data.summary.evidenceCount}
                        </div>
                        <div className="stat-label">
                          Learning attempts
                        </div>
                      </div>
                    </div>

                    {data.summary.nextFocus && (
                      <p className="section-text">
                        <strong>Current focus:</strong>{" "}
                        {data.summary.nextFocus}
                      </p>
                    )}

                    {data.summary.retentionStatus && (
                      <p className="section-text">
                        {data.summary.retentionStatus}
                      </p>
                    )}

                    {data.summary.transferStatus && (
                      <p className="section-text">
                        {data.summary.transferStatus}
                      </p>
                    )}
                  </>
                ) : (
                  <p>
                    This learner hasn&apos;t started a
                    learning session yet.
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
                <section className="card">
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
            </>
          )}
      </div>

      <style jsx>{`
        .page {
          min-height: 100vh;
          background: #f6f3ed;
          color: #171717;
          font-family: Arial, Helvetica, sans-serif;
        }

        .shell {
          width: min(720px, calc(100% - 32px));
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

        .brand-subtitle {
          margin-top: 4px;
          font-size: 16px;
          color: #666;
        }

        .card {
          margin-bottom: 18px;
          background: white;
          border: 1px solid #dedbd4;
          border-radius: 18px;
          padding: 30px;
          box-shadow: 0 8px 30px rgba(0, 0, 0, 0.04);
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
          color: #777;
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
          color: #4d4d4d;
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
          color: #777;
          font-size: 13px;
        }

        .stack {
          display: grid;
          gap: 12px;
        }

        .alert,
        .support-item {
          padding: 16px;
          border: 1px solid #dedbd4;
          border-radius: 12px;
          background: #f8f7f4;
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
          color: #777;
        }

        .plain-list {
          margin: 0;
          padding-left: 20px;
          color: #4d4d4d;
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
          border-bottom: 1px solid #eeeae3;
        }

        .activity-list li:last-child {
          border-bottom: 0;
        }

        .activity-list time {
          color: #777;
          font-size: 14px;
        }

        .learner-list {
          display: grid;
          gap: 10px;
        }

        .learner-option {
          padding: 16px 18px;
          border: 1px solid #d8d5ce;
          border-radius: 12px;
          background: white;
          font-size: 16px;
          text-align: left;
          cursor: pointer;
        }

        .learner-option.selected {
          border-color: #171717;
          background: #f3f1ec;
        }

        .message-list {
          display: grid;
          gap: 10px;
          margin: 20px 0;
        }

        .message {
          padding: 14px 16px;
          border-radius: 12px;
          background: #f8f7f4;
          border: 1px solid #e4e1da;
        }

        .message-meta {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          color: #777;
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
          border: 1px solid #d8d5ce;
          border-radius: 10px;
          font: inherit;
          line-height: 1.5;
        }

        textarea:focus {
          outline: 2px solid #171717;
          outline-offset: 2px;
        }

        .primary-button {
          margin-top: 14px;
          padding: 13px 22px;
          border: 0;
          border-radius: 10px;
          background: #171717;
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
      `}</style>
    </main>
  );
}
