"use client";

import { useCallback, useEffect, useState } from "react";

import {
  AdultRequestError,
  fetchAdultSummary,
  type AdultSummaryResponse,
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
  return relationshipType === "self"
    ? "Your own learning"
    : `Learner ${index + 1}`;
}

function formatDate(value: string): string {
  try {
    return new Date(value).toLocaleDateString();
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

  const load = useCallback(
    async (learnerId?: string) => {
      setViewState("loading");

      try {
        const result = await fetchAdultSummary(learnerId);

        setData(result);
        setViewState("ready");
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
    load();
  }, [load]);

  return (
    <main className="page">
      <div className="shell">
        <header className="header">
          <div className="brand">FILUMIRE</div>
          <div className="brand-subtitle">
            Learning overview
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
            <h1>Overview isn&apos;t available right now</h1>
            <p>
              We couldn&apos;t load the learning
              overview. Please try again.
            </p>
            <button
              type="button"
              onClick={() => load()}
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
                        load(learner.learnerId)
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
          data &&
          data.learners.length > 0 &&
          data.summary && (
            <section className="card">
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
                        {data.summary.confidencePercent}%
                      </div>
                      <div className="stat-label">
                        Confidence
                      </div>
                    </div>

                    <div className="stat">
                      <div className="stat-value">
                        {data.summary.evidenceCount}
                      </div>
                      <div className="stat-label">
                        Attempts recorded
                      </div>
                    </div>
                  </div>

                  {data.summary.readyForAdvancement && (
                    <p className="callout positive">
                      Ready to move on to the next
                      topic.
                    </p>
                  )}

                  {data.summary.needsSupport && (
                    <p className="callout">
                      Needs support with:{" "}
                      {data.summary.needsSupport}
                    </p>
                  )}

                  {data.summary.nextFocus && (
                    <p className="section-text">
                      Next learning focus:{" "}
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

                  {data.summary.recentActivity.length > 0 && (
                    <div className="activity">
                      <div className="section-label">
                        Recent learning activity
                      </div>

                      <ul>
                        {data.summary.recentActivity.map(
                          (entry, index) => (
                            <li key={index}>
                              {formatDate(entry.occurredAt)}
                              {" — "}
                              {outcomeLabel(entry.outcome)}
                            </li>
                          ),
                        )}
                      </ul>
                    </div>
                  )}
                </>
              ) : (
                <p>
                  This learner hasn&apos;t started a
                  learning session yet.
                </p>
              )}
            </section>
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
          padding: 38px;
          box-shadow: 0 8px 30px rgba(0, 0, 0, 0.04);
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
          font-size: 14px;
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }

        h1 {
          margin: 0 0 18px;
          font-size: clamp(24px, 4vw, 32px);
          line-height: 1.15;
        }

        p {
          line-height: 1.6;
          color: #4d4d4d;
        }

        .section-text {
          margin-top: 14px;
        }

        .section-label {
          margin: 24px 0 10px;
          font-size: 13px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          color: #666;
        }

        .stat-row {
          display: flex;
          gap: 24px;
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

        .callout {
          margin-top: 14px;
          padding: 14px 16px;
          border-radius: 10px;
          background: #f7f5f0;
          border: 1px solid #dedbd4;
        }

        .callout.positive {
          background: #f3f8f3;
          border-color: #b8cdb8;
        }

        .activity ul {
          margin: 0;
          padding-left: 20px;
          color: #4d4d4d;
        }

        .activity li {
          margin-bottom: 6px;
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

        .primary-button {
          margin-top: 18px;
          padding: 13px 22px;
          border: 0;
          border-radius: 10px;
          background: #171717;
          color: white;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
        }

        @media (max-width: 600px) {
          .shell {
            width: min(100% - 20px, 720px);
            padding-top: 18px;
          }

          .card {
            padding: 24px 20px;
          }

          .stat-row {
            gap: 16px;
          }
        }
      `}</style>
    </main>
  );
}
