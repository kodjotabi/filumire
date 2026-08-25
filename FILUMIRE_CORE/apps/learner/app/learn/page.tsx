"use client";

const DEVELOPMENT_LEARNER_ID =
  "learner-demo-001";

const SESSION_ID =
  `session-${DEVELOPMENT_LEARNER_ID}`;

import { useEffect, useState } from "react";

type LearningContent = {
  id: string;
  competencyId: string;
  type: string;
  title: string;
  body: string;
  assessmentItemId?: string;
  metadata?: {
    options?: string;
    expectedResponse?: string;
  };
};

type LearningResponse = {
  learnerState: {
    learnerId: string;
    competencies: Array<{
      competencyId: string;
      masteryEstimate: number;
      confidence: number;
      evidenceCount: number;
    }>;
  };
  decision: {
    action: string;
    competencyId: string;
    reasonCode: string;
  };
  content?: LearningContent;
  instruction: {
    content: string;
  };
  interaction?: {
    type: string;
    evidenceId: string;
    outcome: string;
  };
};

type InteractionType =
  | "assessment"
  | "retention"
  | "transfer";

type EvidenceOutcome =
  | "correct"
  | "incorrect"
  | "partial"
  | "skipped"
  | "observed";





const API_HEADERS = {
  "Content-Type": "application/json",
  "x-filumire-learner-id":
    DEVELOPMENT_LEARNER_ID,
};

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

  async function loadLearning() {
    setLoading(true);
    setError("");

    try {
      const response =
        await fetch(
          `/api/learning?sessionId=${SESSION_ID}`,
          {
            headers: {
              "x-filumire-learner-id":
                DEVELOPMENT_LEARNER_ID,
            },
          },
        );

      if (!response.ok) {
        const result =
          await response.json().catch(() => null);

        throw new Error(
          result?.error ??
            "Unable to load learning session.",
        );
      }

      const result =
        (await response.json()) as LearningResponse;

      setData(result);
      setSelectedResponse("");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load learning session.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function submitInteraction(
    interactionType: InteractionType,
    outcome: EvidenceOutcome,
  ) {
    if (!data) {
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const response =
        await fetch("/api/learning", {
          method: "POST",
          headers: API_HEADERS,
          body: JSON.stringify({
            learnerId:
              data.learnerState.learnerId,

            sessionId:
              SESSION_ID,

            interactionType,

            competencyId:
              data.decision.competencyId,

            outcome,
          }),
        });

      if (!response.ok) {
        const result =
          await response.json().catch(() => null);

        throw new Error(
          result?.error ??
            "Unable to submit learning interaction.",
        );
      }

      const result =
        (await response.json()) as LearningResponse;

      setData(result);
      setSelectedResponse("");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to submit learning interaction.",
      );
    } finally {
      setSubmitting(false);
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

    try {
      const response =
        await fetch("/api/learning", {
          method: "POST",
          headers: API_HEADERS,
          body: JSON.stringify({
            learnerId:
              data.learnerState.learnerId,

            sessionId:
              SESSION_ID,

            interactionType:
              "assessment",

            assessmentItemId:
              data.content.assessmentItemId,

            competencyId:
              data.decision.competencyId,

            response:
              selectedResponse,
          }),
        });

      if (!response.ok) {
        const result =
          await response.json().catch(() => null);

        throw new Error(
          result?.error ??
            "Unable to submit assessment.",
        );
      }

      const result =
        (await response.json()) as LearningResponse;

      setData(result);
      setSelectedResponse("");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to submit assessment.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  useEffect(() => {
    loadLearning();
  }, []);

  if (loading) {
    return (
      <main
        style={{
          maxWidth: 720,
          margin: "0 auto",
          padding: 32,
          fontFamily: "Arial, sans-serif",
        }}
      >
        <h1>FILUMIRE EduTutor</h1>
        <p>Loading learning session...</p>
      </main>
    );
  }

  if (error) {
    return (
      <main
        style={{
          maxWidth: 720,
          margin: "0 auto",
          padding: 32,
          fontFamily: "Arial, sans-serif",
        }}
      >
        <h1>FILUMIRE EduTutor</h1>

        <p>{error}</p>

        <button
          onClick={loadLearning}
          disabled={loading}
        >
          Try again
        </button>
      </main>
    );
  }

  if (!data) {
    return null;
  }

  const options =
    data.content?.metadata?.options
      ? (JSON.parse(
          data.content.metadata.options,
        ) as string[])
      : [];

  const competency =
    data.learnerState.competencies.find(
      (item) =>
        item.competencyId ===
        data.decision.competencyId,
    );

  const isRetentionCheck =
    data.decision.action ===
    "retention_check";

  const isTransferCheck =
    data.decision.action ===
    "transfer_check";

  const isLesson =
    data.content?.type === "lesson";

  const isComplete =
    data.decision.action ===
    "complete";

  return (
    <main
      style={{
        maxWidth: 720,
        margin: "0 auto",
        padding: 32,
        fontFamily:
          "Arial, sans-serif",
      }}
    >
      <h1>
        FILUMIRE EduTutor
      </h1>

      <p>
        Learn step by step.
      </p>

      <hr />

      <p>
        <strong>
          Current action:
        </strong>{" "}
        {data.decision.action}
      </p>

      <p>
        <strong>
          Competency:
        </strong>{" "}
        {data.decision.competencyId}
      </p>

      {competency && (
        <p>
          Evidence:{" "}
          {competency.evidenceCount}
          {" | "}
          Confidence:{" "}
          {competency.confidence}
          {" | "}
          Mastery:{" "}
          {competency.masteryEstimate}
        </p>
      )}

      {data.content && (
        <>
          <h2>
            {data.content.title}
          </h2>

          <p>
            {data.content.body}
          </p>

          {isRetentionCheck && (
            <div
              style={{
                marginTop: 24,
                padding: 20,
                border: "1px solid #ccc",
                borderRadius: 8,
              }}
            >
              <h3>
                Retention check
              </h3>

              <p>
                Do you remember and understand
                what you just learned?
              </p>

              <button
                onClick={() =>
                  submitInteraction(
                    "retention",
                    "correct",
                  )
                }
                disabled={submitting}
                style={{
                  marginRight: 12,
                  padding: "10px 16px",
                }}
              >
                {submitting
                  ? "Checking..."
                  : "Yes, I retained it"}
              </button>

              <button
                onClick={() =>
                  submitInteraction(
                    "retention",
                    "incorrect",
                  )
                }
                disabled={submitting}
                style={{
                  padding: "10px 16px",
                }}
              >
                I need more practice
              </button>
            </div>
          )}

          {isTransferCheck && (
            <div
              style={{
                marginTop: 24,
                padding: 20,
                border: "1px solid #ccc",
                borderRadius: 8,
              }}
            >
              <h3>
                Transfer check
              </h3>

              <p>
                Can you apply what you learned
                in a new situation?
              </p>

              <button
                onClick={() =>
                  submitInteraction(
                    "transfer",
                    "correct",
                  )
                }
                disabled={submitting}
                style={{
                  marginRight: 12,
                  padding: "10px 16px",
                }}
              >
                {submitting
                  ? "Checking..."
                  : "Yes, I can apply it"}
              </button>

              <button
                onClick={() =>
                  submitInteraction(
                    "transfer",
                    "incorrect",
                  )
                }
                disabled={submitting}
                style={{
                  padding: "10px 16px",
                }}
              >
                I need more practice
              </button>
            </div>
          )}

          {options.length > 0 && (
            <div
              style={{
                marginTop: 20,
              }}
            >
              {options.map(
                (option) => (
                  <label
                    key={option}
                    style={{
                      display: "block",
                      marginBottom: 12,
                    }}
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
                    />{" "}
                    {option}
                  </label>
                ),
              )}

              <button
                onClick={
                  submitAssessment
                }
                disabled={
                  !selectedResponse ||
                  submitting
                }
              >
                {submitting
                  ? "Checking..."
                  : "Submit answer"}
              </button>
            </div>
          )}

          {isLesson &&
            options.length === 0 &&
            !isRetentionCheck &&
            !isTransferCheck && (
              <button
                onClick={loadLearning}
                disabled={loading}
              >
                Continue
              </button>
            )}
        </>
      )}

      {isComplete && (
        <p>
          You have completed this
          learning sequence.
        </p>
      )}
    </main>
  );
}

