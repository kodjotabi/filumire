"use client";

import { useState } from "react";

const question = {
  question: "Which number comes next?",
  options: ["2", "3", "4", "5"],
  answer: "4",
};

export default function LearningSession() {
  const [selected, setSelected] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    correct: boolean;
    instruction: string;
    action: string;
  } | null>(null);

  function selectAnswer(option: string) {
    if (submitted || loading) {
      return;
    }

    setSelected(option);
    setResult(null);
  }

  async function submitAnswer() {
    if (!selected || loading) {
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/learning", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          learnerId: "learner-test-001",
          sessionId: "session-test-001",
          assessmentItemId: "item-test-001",
          competencyId: "competency-test-001",
          response: selected,
          expectedResponse: question.answer,
          instructionalContext:
            "Test instructional context for the FILUMIRE adaptive-learning loop.",
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ?? "Learning request failed.",
        );
      }

      setSubmitted(true);

      setResult({
        correct: data.assessment.result.correct,
        instruction: data.instruction.content,
        action: data.decision.action,
      });
    } catch (error) {
      console.error(
        "FILUMIRE learner interaction error:",
        error,
      );

      setResult({
        correct: false,
        instruction:
          "The learning interaction could not be processed. Please try again.",
        action: "error",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <main
      style={{
        maxWidth: "700px",
        margin: "0 auto",
        padding: "40px 24px",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <header style={{ marginBottom: "40px" }}>
        <p
          style={{
            fontSize: "14px",
            fontWeight: 700,
            marginBottom: "8px",
          }}
        >
          FILUMIRE EduTutor
        </p>

        <h1
          style={{
            fontSize: "32px",
            margin: "0 0 8px",
          }}
        >
          Learning Session
        </h1>

        <p style={{ margin: 0 }}>
          Let&apos;s learn step by step.
        </p>
      </header>

      <section>
        <p
          style={{
            fontSize: "14px",
            fontWeight: 600,
            marginBottom: "12px",
          }}
        >
          Question 1 of 1
        </p>

        <h2
          style={{
            fontSize: "24px",
            marginBottom: "24px",
          }}
        >
          {question.question}
        </h2>

        <div
          style={{
            display: "flex",
            gap: "12px",
            flexWrap: "wrap",
            marginBottom: "24px",
          }}
        >
          {question.options.map((option) => {
            const isSelected = selected === option;

            return (
              <button
                key={option}
                type="button"
                onClick={() => selectAnswer(option)}
                disabled={submitted || loading}
                style={{
                  minWidth: "70px",
                  padding: "14px 20px",
                  fontSize: "18px",
                  fontWeight: isSelected ? 700 : 400,
                  border: isSelected
                    ? "3px solid #000"
                    : "1px solid #999",
                  borderRadius: "8px",
                  background: isSelected
                    ? "#e8e8e8"
                    : "#ffffff",
                  cursor:
                    submitted || loading
                      ? "default"
                      : "pointer",
                }}
              >
                {option}
              </button>
            );
          })}
        </div>

        {selected && !submitted && (
          <p
            style={{
              marginBottom: "16px",
              fontWeight: 600,
            }}
          >
            Selected answer: {selected}
          </p>
        )}

        {!submitted && (
          <button
            type="button"
            onClick={submitAnswer}
            disabled={!selected || loading}
            style={{
              padding: "14px 24px",
              fontSize: "16px",
              fontWeight: 700,
              border: "none",
              borderRadius: "8px",
              cursor:
                !selected || loading
                  ? "not-allowed"
                  : "pointer",
              opacity:
                !selected || loading ? 0.5 : 1,
            }}
          >
            {loading ? "Processing..." : "Submit Answer"}
          </button>
        )}

        {result && (
          <section
            style={{
              marginTop: "32px",
              padding: "24px",
              border: "1px solid #ccc",
              borderRadius: "8px",
            }}
          >
            <p style={{ fontWeight: 700 }}>
              {result.correct
                ? "Correct."
                : "Not quite. FILUMIRE has recorded the response."}
            </p>

            <p>{result.instruction}</p>

            <p>
              <strong>Next learning action:</strong>{" "}
              {result.action}
            </p>
          </section>
        )}
      </section>
    </main>
  );
}