"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import {
  fetchLearningSession,
  LearningRequestError,
  type LearningResponse,
} from "../../services/learning-client";

type ViewState =
  | "loading"
  | "ready"
  | "unauthenticated"
  | "unavailable";

export default function LearnerHome() {
  const [language, setLanguage] =
    useState<"en" | "fr">("en");

  useEffect(() => {
    const params =
      new URLSearchParams(window.location.search);

    setLanguage(
      params.get("lang") === "fr" ? "fr" : "en",
    );
  }, []);
  const [viewState, setViewState] =
    useState<ViewState>("loading");

  const [data, setData] =
    useState<LearningResponse | null>(null);

  const load = useCallback(async () => {
    setViewState("loading");

    try {
      const result = await fetchLearningSession();

      setData(result);
      setViewState("ready");
    } catch (err) {
      setData(null);

      setViewState(
        err instanceof LearningRequestError &&
          err.status === 401
          ? "unauthenticated"
          : "unavailable",
      );
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const progressPercent =
    data
      ? Math.max(
          0,
          Math.min(100, data.progress.percent),
        )
      : 0;

  return (
    <main className="page">
      <div className="shell">
        <header className="header">
          <div className="brand">FILUMIRE</div>
          <div className="brand-subtitle">
            EduTutor
          </div>
        </header>

        {viewState === "loading" && (
          <section className="card loading-card">
            <div className="loader" />
            <p>Preparing your learning journey...</p>
          </section>
        )}

        {viewState === "unauthenticated" && (
          <section className="card">
            <h1>Please sign in</h1>
            <p>
              Sign in to continue your learning
              journey.
            </p>
          </section>
        )}

        {viewState === "unavailable" && (
          <section className="card">
            <h1>Learning isn&apos;t available right now</h1>
            <p>
              We couldn&apos;t load your learning
              journey. Please try again.
            </p>
            <button
              type="button"
              onClick={load}
              className="primary-button"
            >
              Try again
            </button>
          </section>
        )}

        {viewState === "ready" && data && (
          <section className="card">
            <div className="eyebrow">
              {data.progress.subjectName ??
                "Your learning path"}
            </div>

            <h1>
              {data.progress.competencyTitle
                ? `Continue with ${data.progress.competencyTitle}`
                : "Ready to continue learning?"}
            </h1>

            <p>
              FILUMIRE adapts each step to what
              you already know.
            </p>

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
                style={{
                  width: `${progressPercent}%`,
                }}
              />
            </div>

            <div className="progress-label">
              {progressPercent}% of the way there
            </div>

            <Link href="/learn">
              <button
                type="button"
                className="primary-button"
              >
                Continue Learning
              </button>
            </Link>
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
          box-shadow: 0 8px 30px rgba(0, 0, 0, 0.04);
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

        .eyebrow {
          margin-bottom: 14px;
          color: #777;
          font-size: 14px;
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }

        h1 {
          margin: 0 0 16px;
          max-width: 640px;
          font-size: clamp(28px, 5vw, 42px);
          line-height: 1.1;
        }

        p {
          max-width: 560px;
          line-height: 1.65;
          color: #4d4d4d;
        }

        .progress-track {
          height: 8px;
          margin-top: 28px;
          overflow: hidden;
          border-radius: 99px;
          background: #dedbd4;
        }

        .progress-fill {
          height: 100%;
          border-radius: 99px;
          background: #171717;
        }

        .progress-label {
          margin-top: 10px;
          color: #666;
          font-size: 14px;
        }

        .primary-button {
          margin-top: 26px;
          padding: 14px 24px;
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
            width: min(100% - 20px, 860px);
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
