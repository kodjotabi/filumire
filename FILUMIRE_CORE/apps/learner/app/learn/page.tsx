"use client";

import { useState } from "react";

const questions = [
  {
    question: "Which number comes next?",
    options: ["2", "3", "4", "5"],
    answer: "4",
  },
];

export default function LearningSession() {
  const [selected, setSelected] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const currentQuestion = questions[0];

  function submitAnswer() {
    if (selected) {
      setSubmitted(true);
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

        <h2>{currentQuestion.question}</h2>

        <div>
          {currentQuestion.options.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setSelected(option)}
              disabled={submitted}
            >
              {option}
            </button>
          ))}
        </div>

        {!submitted && (
          <button type="button" onClick={submitAnswer} disabled={!selected}>
            Submit Answer
          </button>
        )}

        {submitted && (
          <p>
            {selected === currentQuestion.answer
              ? "Correct. FILUMIRE has recorded your learning evidence."
              : "Not quite. FILUMIRE will use this response to guide the next learning step."}
          </p>
        )}
      </section>
    </main>
  );
}