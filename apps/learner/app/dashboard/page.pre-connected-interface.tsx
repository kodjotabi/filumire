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

export default function LearnerDashboard() {
  const [language, setLanguage] =
    useState<"en" | "fr">("en");

  const [viewState, setViewState] =
    useState<ViewState>("loading");

  const [data, setData] =
    useState<LearningResponse | null>(null);

  useEffect(() => {
    const params =
      new URLSearchParams(window.location.search);

    setLanguage(
      params.get("lang") === "fr" ? "fr" : "en",
    );
  }, []);

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

  const progressPercent = data
    ? Math.max(
        0,
        Math.min(100, data.progress.percent),
      )
    : 0;

  const copy =
    language === "fr"
      ? {
          welcome: "Bienvenue",
          journey: "Ton parcours d'apprentissage",
          progress: "Ta progression",
          completed: "objectifs d'apprentissage terminÃƒÆ’Ã‚Â©s",
          continue: "Continuer ÃƒÆ’Ã‚Â  apprendre",
          preparing: "PrÃƒÆ’Ã‚Â©paration de ton parcours...",
          signIn: "Connecte-toi pour continuer",
          signInBody:
            "Connecte-toi pour poursuivre ton parcours d'apprentissage.",
          unavailable:
            "L'apprentissage n'est pas disponible pour le moment",
          unavailableBody:
            "Nous n'avons pas pu charger ton parcours. RÃƒÆ’Ã‚Â©essaie.",
          retry: "RÃƒÆ’Ã‚Â©essayer",
        }
      : {
          welcome: "Welcome back",
          journey: "Your learning journey",
          progress: "Your progress",
          completed: "learning goals completed",
          continue: "Continue Learning",
          preparing: "Preparing your learning journey...",
          signIn: "Please sign in",
          signInBody:
            "Sign in to continue your learning journey.",
          unavailable:
            "Learning isn't available right now",
          unavailableBody:
            "We couldn't load your learning journey. Please try again.",
          retry: "Try again",
        };

  return (
    <main className="page">
      <div className="dashboard">
        <header className="header">
          <Link
            href="/"
            className="brand"
            aria-label="FILUMIRE home"
          >
            FILUMIRE
          </Link>

          <div className="brand-subtitle">
            EduTutor
          </div>
        </header>

        {viewState === "loading" && (
          <section className="state-card">
            <div className="loader" />
            <p>{copy.preparing}</p>
          </section>
        )}

        {viewState === "unauthenticated" && (
          <section className="state-card">
            <h1>{copy.signIn}</h1>
            <p>{copy.signInBody}</p>
          </section>
        )}

        {viewState === "unavailable" && (
          <section className="state-card">
            <h1>{copy.unavailable}</h1>
            <p>{copy.unavailableBody}</p>

            <button
              type="button"
              onClick={load}
              className="primary-button"
            >
              {copy.retry}
            </button>
          </section>
        )}

        {viewState === "ready" && data && (
          <>
            <section className="welcome">
              <div className="welcome-label">
                {copy.welcome}
              </div>

              <h1>{copy.journey}</h1>
            </section>

            <section className="learning-card">
              <div className="subject">
                {data.progress.subjectName ??
                  "Your learning path"}
              </div>

              <h2>
                {data.progress.competencyTitle ??
                  "Ready to continue learning?"}
              </h2>

              <div className="progress-heading">
                <span>{copy.progress}</span>
                <strong>{progressPercent}%</strong>
              </div>

              <div
                className="progress-track"
                role="progressbar"
                aria-label={copy.progress}
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

              <div className="goal-count">
                <strong>
                  {data.progress.completedCompetencies}
                </strong>
                {" "}
                of{" "}
                <strong>
                  {data.progress.competencyCount}
                </strong>
                {" "}
                {copy.completed}
              </div>

              <Link
                href={`/learn?lang=${language}`}
                className="continue-link"
                style={{
                  textDecoration: "none",
                  color: "inherit",
                }}
              >
                <span className="continue-button">
                  {copy.continue}
                </span>
              </Link>
            </section>

            <section className="encouragement">
              <div className="encouragement-mark">
                {progressPercent}%
              </div>

              <div>
                <strong>
                  {data.progress.subjectName ??
                    "Learning"}
                </strong>
                <p>
                  {language === "fr"
                    ? "Continue. FILUMIRE adaptera la prochaine ÃƒÆ’Ã‚Â©tape ÃƒÆ’Ã‚Â  ton apprentissage."
                    : "Keep going. FILUMIRE will adapt the next step to your learning."}
                </p>
              </div>
            </section>
          </>
        )}
      </div>

      <style jsx>{`
        .page {
          min-height: 100vh;
          background: #ffffff;
          color: #123d6b;
        }

        .dashboard {
          box-sizing: border-box;
          width: 100%;
          max-width: 390px;
          min-height: 844px;
          margin: 0 auto;
          overflow: hidden;
          background: #ffffff;
        }

        .header {
          padding: 27px 24px 22px;
          background: #123d6b;
          color: #ffffff;
        }

        .brand {
          display: block;
          width: fit-content;
          color: #ffffff;
          font-size: 25px;
          font-weight: 800;
          letter-spacing: 0.045em;
          line-height: 1;
          text-decoration: none;
        }

        .brand-subtitle {
          margin-top: 5px;
          color: rgba(255, 255, 255, 0.82);
          font-size: 12px;
          font-weight: 500;
        }

        .welcome {
          padding: 32px 28px 18px;
        }

        .welcome-label {
          margin-bottom: 6px;
          color: #2589d8;
          font-size: 14px;
          font-weight: 700;
        }

        .welcome h1 {
          margin: 0;
          color: #123d6b;
          font-size: 27px;
          font-weight: 800;
          line-height: 1.16;
        }

        .learning-card {
          box-sizing: border-box;
          width: calc(100% - 40px);
          margin: 4px 20px 0;
          padding: 25px 22px 23px;
          border: 1px solid #dce8f2;
          border-radius: 20px;
          background: #ffffff;
          box-shadow: 0 8px 24px rgba(18, 61, 107, 0.08);
        }

        .subject {
          margin-bottom: 9px;
          color: #2589d8;
          font-size: 14px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.055em;
        }

        .learning-card h2 {
          margin: 0 0 26px;
          color: #123d6b;
          font-size: 24px;
          font-weight: 800;
          line-height: 1.2;
        }

        .progress-heading {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 9px;
          color: #466887;
          font-size: 13px;
          font-weight: 600;
        }

        .progress-heading strong {
          color: #123d6b;
          font-size: 14px;
          font-weight: 800;
        }

        .progress-track {
          width: 100%;
          height: 9px;
          overflow: hidden;
          border-radius: 999px;
          background: #e7f0f7;
        }

        .progress-fill {
          height: 100%;
          border-radius: inherit;
          background: #2589d8;
          transition: width 0.3s ease;
        }

        .goal-count {
          margin-top: 12px;
          color: #5d7891;
          font-size: 12px;
          line-height: 1.45;
        }

        .goal-count strong {
          color: #123d6b;
          font-weight: 800;
        }

        .continue-link {
          display: block;
          margin-top: 25px;
          color: inherit;
          text-decoration: none !important;
        }

        .continue-link * {
          text-decoration: none !important;
        }

        .continue-button {
          box-sizing: border-box;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          min-height: 54px;
          padding: 14px 18px;
          border-radius: 13px;
          background: #123d6b;
          color: #ffffff;
          font-size: 16px;
          font-weight: 800;
          text-align: center;
          text-decoration: none;
        }

        .continue-link:hover .continue-button {
          background: #0e345d;
        }

        .continue-button:focus-visible,
        .brand:focus-visible,
        .primary-button:focus-visible {
          outline: 3px solid #2589d8;
          outline-offset: 3px;
        }

        .encouragement {
          box-sizing: border-box;
          display: flex;
          align-items: center;
          gap: 15px;
          width: calc(100% - 40px);
          margin: 18px 20px 30px;
          padding: 17px 18px;
          border-radius: 16px;
          background: #edf6fc;
        }

        .encouragement-mark {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 52px;
          height: 52px;
          flex: 0 0 52px;
          border-radius: 50%;
          background: #ffffff;
          color: #2589d8;
          font-size: 15px;
          font-weight: 800;
        }

        .encouragement strong {
          display: block;
          margin-bottom: 3px;
          color: #123d6b;
          font-size: 14px;
          font-weight: 800;
        }

        .encouragement p {
          margin: 0;
          color: #466887;
          font-size: 12px;
          line-height: 1.45;
        }

        .state-card {
          box-sizing: border-box;
          width: calc(100% - 40px);
          min-height: 260px;
          margin: 38px 20px;
          padding: 30px 24px;
          border: 1px solid #dce8f2;
          border-radius: 20px;
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          justify-content: center;
          background: #ffffff;
          box-shadow: 0 8px 24px rgba(18, 61, 107, 0.08);
        }

        .state-card h1 {
          margin: 0 0 12px;
          color: #123d6b;
          font-size: 25px;
          line-height: 1.2;
        }

        .state-card p {
          margin: 0;
          color: #5d7891;
          font-size: 14px;
          line-height: 1.6;
        }

        .loader {
          width: 30px;
          height: 30px;
          margin-bottom: 18px;
          border: 3px solid #dce8f2;
          border-top-color: #2589d8;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        .primary-button {
          margin-top: 20px;
          padding: 13px 20px;
          border: 0;
          border-radius: 11px;
          background: #123d6b;
          color: #ffffff;
          font: inherit;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        @media (min-width: 391px) {
          .dashboard {
            box-shadow: 0 0 0 1px #e5e5e5;
          }
        }
      `}</style>
    </main>
  );
}