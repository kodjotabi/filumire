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
        throw new Error(data.error ?? "Learning request failed.");
      }

      setSubmitted(true);

      setResult({
        correct: data.assessment.result.correct,
        instruction: data.instruction.content,
        action: data.decision.action,
      });
    } catch (error) {
      console.error(error);
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
    <main>
      <header>
        <p>FILUMIRE EduTutor</p>
        <h1>Learning Session</h1>
        <p>Let&apos;s learn step by step.</p>
      </header>

      <section>
        <p>Question 1 of 1</p>

        <h2>{question.question}</h2>

        <div>
          {question.options.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setSelected(option)}
              disabled={submitted || loading}
            >
              {option}
            </button>
          ))}
        </div>

        {!submitted && (
          <button
            type="button"
            onClick={submitAnswer}
            disabled={!selected || loading}
          >
            {loading ? "Processing..." : "Submit Answer"}
          </button>
        )}

        {result && (
          <section>
            <p>
              {result.correct
                ? "Correct."
                : "Not quite. FILUMIRE has recorded the response."}
            </p>

            <p>{result.instruction}</p>
            <p>Next learning action: {result.action}</p>
          </section>
        )}
      </section>
    </main>
  );
}