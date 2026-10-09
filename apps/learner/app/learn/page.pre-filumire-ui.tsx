"use client";

import { useEffect, useState } from "react";

import {
  fetchLearningSession,
  getSessionId,
  isPendingTeacherReviewResponse,
  LearningNetworkError,
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
      return "✓";

    case "incorrect":
      return "✕";

    case "partial":
      return "•";

    default:
      return "•";
  }
}

export default function LearnPage() {
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
        await fetchLearningSession();

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

            <div className="brand-subtitle">
              EduTutor
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

            <div className="brand-subtitle">
              EduTutor
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
  const progressPercent =
    Math.max(
      0,
      Math.min(
        100,
        data.progress.percent,
      ),
    );

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

  return (
    <main className="page">
      <div className="shell">
        <header className="header">
          <div>
            <div className="brand">
              FILUMIRE
            </div>

            <div className="brand-subtitle">
              EduTutor
            </div>
          </div>
        </header>

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

        <section className="card">
          <div className="welcome">
            <span>
              {data.progress.subjectName ??
                "Your learning session"}
            </span>
          </div>

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
                  {feedbackTitle(
                    assessmentFeedback,
                  )}
                </div>

                <div className="feedback-message">
                  {feedbackMessage(
                    assessmentFeedback,
                  )}
                </div>
              </div>
            </div>
          )}

          <h1>
            {actionLabel(action)}
          </h1>

          {data.content && (
            <>
              <h2>
                {data.content.title}
              </h2>

              <div className="lesson-body">
                {data.content.body}
              </div>
            </>
          )}

          {data.instruction?.structured?.elements?.length ? (
            <div className="tutor-message">
              <div className="tutor-label">
                EduTutor
              </div>

              <div className="instruction-elements">
                {data.instruction.structured.elements.map(
                  (element, index) => (
                    <section
                      key={`${element.type}-${index}`}
                      className="instruction-element"
                    >
                      <div className="instruction-element-type">
                        {element.type.replaceAll(
                          "_",
                          " ",
                        )}
                      </div>

                      <p>{element.text}</p>
                    </section>
                  ),
                )}
              </div>
            </div>
          ) : data.instruction?.content ? (
            <div className="tutor-message">
              <div className="tutor-label">
                EduTutor
              </div>

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

          {showContinue && (
            <button
              onClick={loadLearning}
              disabled={submitting}
              className="primary-button"
            >
              {buttonLabel(action)}
            </button>
          )}

          {isComplete && (
            <div className="complete-card">
              <div className="complete-mark">
                ✓
              </div>

              <h2>
                You have completed this
                learning sequence.
              </h2>

              <p>
                You have worked through the
                learning sequence and demonstrated
                the required understanding.
              </p>
            </div>
          )}

          {submitting && (
            <div className="status">
              Updating your learning session...
            </div>
          )}

          {competency && (
            <div className="learner-footer">
              <span>
                Mastery {Math.round(
                  data.progress.masteryEstimate *
                    100,
                )}% · Confidence {Math.round(
                  data.progress.confidence *
                    100,
                )}% · Evidence {data.progress.evidenceCount}
              </span>
            </div>
          )}
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
          justify-content: space-between;
          padding: 8px 0 22px;
        }

        .brand {
          font-size: 30px;
          font-weight: 800;
          letter-spacing: 0.04em;
        }

        .brand-subtitle {
          margin-top: 3px;
          color: #666;
          font-size: 15px;
        }

        .progress-track {
          height: 5px;
          margin-bottom: 24px;
          overflow: hidden;
          border-radius: 99px;
          background: #dedbd4;
        }

        .progress-fill {
          height: 100%;
          border-radius: 99px;
          background: #171717;
        }

        .card {
          background: white;
          border: 1px solid #dedbd4;
          border-radius: 20px;
          padding: 44px;
          box-shadow:
            0 10px 36px rgba(0, 0, 0, 0.045);
        }

        .welcome {
          margin-bottom: 16px;
          color: #777;
          font-size: 14px;
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }

        h1 {
          margin: 0 0 28px;
          max-width: 700px;
          font-size: clamp(30px, 5vw, 46px);
          line-height: 1.08;
        }

        h2 {
          margin: 0 0 18px;
          font-size: 28px;
          line-height: 1.2;
        }

        h3 {
          margin: 0 0 10px;
          font-size: 22px;
        }

        .lesson-body {
          max-width: 720px;
          white-space: pre-line;
          font-size: 19px;
          line-height: 1.75;
          color: #333;
        }

        .tutor-message {
          margin-top: 28px;
          padding: 20px 22px;
          border-left: 4px solid #171717;
          background: #f7f5f0;
          border-radius: 0 12px 12px 0;
        }

        .tutor-label {
          margin-bottom: 7px;
          font-size: 13px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.06em;
        }

        .tutor-message p {
          margin: 0;
          line-height: 1.6;
          color: #444;
        }

        .instruction-elements {
          display: grid;
          gap: 16px;
        }

        .instruction-element {
          margin: 0;
        }

        .instruction-element-type {
          margin-bottom: 6px;
          font-size: 12px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          color: #666;
        }

        .assessment {
          margin-top: 32px;
          padding-top: 28px;
          border-top: 1px solid #e5e2dc;
        }

        .assessment-label {
          margin-bottom: 14px;
          font-size: 14px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.06em;
        }

        .options {
          display: grid;
          grid-template-columns: 1fr;
          gap: 10px;
          width: 100%;
          margin-bottom: 20px;
        }

        .option {
          box-sizing: border-box;
          display: flex;
          align-items: center;
          gap: 13px;
          width: 100%;
          min-height: 54px;
          padding: 16px 18px;
          border: 1px solid #d8d5ce;
          border-radius: 12px;
          cursor: pointer;
          font-size: 17px;
          line-height: 1.2;
        }

        .option:hover {
          background: #faf9f6;
        }

        .option.selected {
          border-color: #171717;
          background: #f3f1ec;
        }

        .option input {
          width: 18px;
          height: 18px;
          flex: 0 0 18px;
        }

        .option-text {
          display: block;
          min-width: 0;
          white-space: nowrap;
        }

        .assessment-feedback {
          display: flex;
          align-items: center;
          gap: 16px;
          margin-bottom: 28px;
          padding: 18px 20px;
          border-radius: 14px;
          border: 1px solid #d8d5ce;
          background: #faf9f6;
        }

        .assessment-feedback.correct {
          border-color: #b8cdb8;
          background: #f3f8f3;
        }

        .assessment-feedback.incorrect {
          border-color: #d8bcbc;
          background: #fbf4f4;
        }

        .assessment-feedback.partial {
          border-color: #d8cdb2;
          background: #faf7ef;
        }

        .feedback-icon {
          width: 44px;
          height: 44px;
          flex: 0 0 44px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          background: #171717;
          color: white;
          font-size: 25px;
          font-weight: 700;
        }

        .feedback-title {
          font-size: 19px;
          font-weight: 700;
        }

        .feedback-message {
          margin-top: 4px;
          color: #555;
          line-height: 1.5;
        }

        .primary-button {
          padding: 13px 21px;
          border-radius: 10px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
        }

        .primary-button {
          margin-top: 22px;
          border: 0;
          background: #171717;
          color: white;
        }

        .primary-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .secondary-button {
          padding: 11px 18px;
          border-radius: 10px;
          border: 1px solid #cfcac1;
          background: white;
          color: #171717;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
        }

        .connectivity-banner {
          margin-bottom: 20px;
          padding: 14px 18px;
          border-radius: 12px;
          font-size: 14px;
          line-height: 1.5;
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 12px;
          justify-content: space-between;
        }

        .connectivity-banner.offline {
          background: #f7f5f0;
          border: 1px solid #dedbd4;
          color: #4d4d4d;
        }

        .connectivity-banner.pending {
          background: #faf7ef;
          border: 1px solid #d8cdb2;
          color: #4d4d4d;
        }

        .connectivity-banner-error {
          width: 100%;
          margin-top: 6px;
          color: #7a4b4b;
        }

        .complete-card {
          margin-top: 30px;
          padding: 28px;
          border-radius: 15px;
          background: #f3f1ec;
          text-align: center;
        }

        .complete-mark {
          width: 48px;
          height: 48px;
          margin: 0 auto 18px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          background: #171717;
          color: white;
          font-size: 24px;
        }

        .complete-card h2 {
          font-size: 25px;
        }

        .complete-card p {
          max-width: 560px;
          margin: 0 auto;
          color: #555;
          line-height: 1.6;
        }

        .status {
          margin-top: 18px;
          color: #777;
          font-size: 14px;
        }

        .learner-footer {
          margin-top: 34px;
          padding-top: 20px;
          border-top: 1px solid #e5e2dc;
          color: #777;
          font-size: 13px;
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
            padding: 28px 20px;
            border-radius: 16px;
          }

          .brand {
            font-size: 25px;
          }

          .lesson-body {
            font-size: 17px;
          }

          .assessment-feedback {
            align-items: flex-start;
          }
        }
      `}</style>
    </main>
  );
}







