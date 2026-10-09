"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  fetchTeacherSummary,
  TeacherRequestError,
  type TeacherSummaryResponse,
} from "../../../../services/teacher-client";

type ViewState =
  | "loading"
  | "ready"
  | "unauthenticated"
  | "unavailable";

function percent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function reasonLabel(value: string): string {
  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase(),
    );
}

export default function TeacherPage() {
  const [viewState, setViewState] =
    useState<ViewState>("loading");

  const [data, setData] =
    useState<TeacherSummaryResponse | null>(null);

  const load = useCallback(
    async (learnerId?: string) => {
      setViewState("loading");

      try {
        const result =
          await fetchTeacherSummary(learnerId);

        setData(result);
        setViewState("ready");
      } catch (error) {
        setData(null);

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
    load();
  }, [load]);

  return (
    <main className="page">
      <div className="shell">
        <header className="header">
          <div>
            <div className="brand">FILUMIRE</div>
            <div className="subtitle">
              Teacher workspace
            </div>
          </div>

          {data?.summary && (
            <div className="updated">
              {data.summary.updatedAt
                ? `Updated ${new Date(
                    data.summary.updatedAt,
                  ).toLocaleDateString()}`
                : "Learning overview"}
            </div>
          )}
        </header>

        {viewState === "loading" && (
          <section className="card status-card">
            Loading teacher workspace...
          </section>
        )}

        {viewState === "unauthenticated" && (
          <section className="card status-card">
            <h1>Please sign in</h1>
            <p>
              Teacher authorization is required to
              view learner information.
            </p>
          </section>
        )}

        {viewState === "unavailable" && (
          <section className="card status-card">
            <h1>Workspace unavailable</h1>
            <p>
              The teacher workspace could not be
              loaded.
            </p>
            <button
              type="button"
              className="primary-button"
              onClick={() => load()}
            >
              Try again
            </button>
          </section>
        )}

        {viewState === "ready" &&
          data &&
          data.learners.length === 0 && (
            <section className="card status-card">
              <h1>No learners assigned</h1>
              <p>
                No active teacher-learner
                relationships are available.
              </p>
            </section>
          )}

        {viewState === "ready" &&
          data &&
          data.learners.length > 1 && (
            <section className="card selector">
              <div className="section-label">
                Learner
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
                        load(learner.learnerId)
                      }
                    >
                      Learner {index + 1}
                    </button>
                  ),
                )}
              </div>
            </section>
          )}

        {viewState === "ready" &&
          data?.requiresSelection && (
            <section className="card status-card">
              <h1>Select a learner</h1>
              <p>
                Choose a learner to view their
                teaching priorities and progress.
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
                    Need attention
                  </div>
                </div>

                <div className="metric-card">
                  <div className="metric-value">
                    {data.summary.pendingReviewCount}
                  </div>
                  <div className="metric-label">
                    Pending reviews
                  </div>
                </div>

                <div className="metric-card">
                  <div className="metric-value">
                    {data.summary.subjects.length}
                  </div>
                  <div className="metric-label">
                    Active subjects
                  </div>
                </div>
              </section>

              <section className="card">
                <div className="section-label">
                  Attention queue
                </div>

                <h1>What needs attention now</h1>

                {data.summary.attentionQueue
                  .length === 0 ? (
                  <p>
                    No competencies currently
                    require teacher attention.
                  </p>
                ) : (
                  <div className="attention-list">
                    {data.summary.attentionQueue.map(
                      (item) => (
                        <article
                          key={item.competencyId}
                          className="attention-item"
                        >
                          <div className="attention-top">
                            <div>
                              <div className="subject">
                                {item.subjectName}
                              </div>
                              <h2>
                                {item.competencyTitle}
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
                                  {reasonLabel(reason)}
                                </span>
                              ),
                            )}
                          </div>

                          <div className="mini-stats">
                            <span>
                              Mastery{" "}
                              <strong>
                                {percent(
                                  item.masteryEstimate,
                                )}
                              </strong>
                            </span>
                            <span>
                              Confidence{" "}
                              <strong>
                                {percent(
                                  item.confidence,
                                )}
                              </strong>
                            </span>
                            <span>
                              Evidence{" "}
                              <strong>
                                {item.evidenceCount}
                              </strong>
                            </span>
                          </div>
                        </article>
                      ),
                    )}
                  </div>
                )}
              </section>

              <section className="card">
                <div className="section-label">
                  Subjects
                </div>

                <h1>Learning overview</h1>

                <div className="subject-list">
                  {data.summary.subjects.map(
                    (subject) => (
                      <article
                        key={subject.subjectId}
                        className="subject-item"
                      >
                        <div>
                          <h2>
                            {subject.subjectName}
                          </h2>
                          <p>
                            {
                              subject.competenciesNeedingAttention
                            }{" "}
                            of{" "}
                            {subject.competencyCount}{" "}
                            competencies need
                            attention
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
                      </article>
                    ),
                  )}
                </div>
              </section>
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
        .updated {
          margin-top: 4px;
          color: #666;
        }

        .card,
        .metric-card {
          background: white;
          border: 1px solid #dedbd4;
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
          gap: 16px;
          margin-bottom: 20px;
        }

        .metric-card {
          padding: 24px;
        }

        .metric-value {
          font-size: 34px;
          font-weight: 800;
        }

        .metric-label {
          margin-top: 5px;
          color: #666;
          font-size: 14px;
        }

        .section-label {
          margin-bottom: 10px;
          color: #777;
          font-size: 13px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.07em;
        }

        h1 {
          margin: 0 0 22px;
          font-size: 26px;
        }

        h2 {
          margin: 4px 0 0;
          font-size: 18px;
        }

        p {
          color: #555;
          line-height: 1.5;
        }

        .learner-list {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
        }

        .learner {
          padding: 11px 16px;
          border: 1px solid #d8d5ce;
          border-radius: 10px;
          background: white;
          font-size: 15px;
        }

        .learner.selected {
          border-color: #171717;
          background: #f3f1ec;
        }

        .attention-list,
        .subject-list {
          display: grid;
          gap: 12px;
        }

        .attention-item,
        .subject-item {
          padding: 20px;
          border: 1px solid #dedbd4;
          border-radius: 14px;
        }

        .attention-top,
        .subject-item {
          display: flex;
          justify-content: space-between;
          gap: 20px;
        }

        .subject {
          color: #777;
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
          display: flex;
          flex-wrap: wrap;
          gap: 7px;
          margin-top: 14px;
        }

        .chip {
          padding: 6px 9px;
          border-radius: 8px;
          background: #f6f3ed;
          font-size: 12px;
        }

        .mini-stats,
        .subject-stats {
          display: flex;
          flex-wrap: wrap;
          gap: 18px;
          margin-top: 16px;
          color: #666;
          font-size: 13px;
        }

        .subject-stats {
          margin-top: 0;
          align-items: center;
        }

        .primary-button {
          margin-top: 12px;
          padding: 12px 18px;
          border: 0;
          border-radius: 10px;
          background: #171717;
          color: white;
          font-size: 15px;
          font-weight: 600;
        }

        @media (max-width: 700px) {
          .shell {
            width: min(100% - 20px, 1040px);
            padding-top: 18px;
          }

          .header,
          .attention-top,
          .subject-item {
            align-items: flex-start;
            flex-direction: column;
          }

          .overview-grid {
            grid-template-columns: 1fr;
          }

          .card {
            padding: 22px 18px;
          }

          .subject-stats {
            margin-top: 8px;
          }
        }
      `}</style>
    </main>
  );
}

