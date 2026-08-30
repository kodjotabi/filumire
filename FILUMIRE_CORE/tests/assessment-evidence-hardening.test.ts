import { evaluateAssessment } from "../services/assessment";

function assert(
  condition: boolean,
  message: string,
): void {
  if (!condition) {
    throw new Error(`FAIL: ${message}`);
  }
}

const result =
  await evaluateAssessment(
    {
      learnerId: "learner-assessment-hardening",
      sessionId: "session-assessment-hardening",
      assessmentItemId: "item-assessment-hardening-001",
      competencyId: "competency-test-001",
      response: "20",
    },
    "20",
    "content-test-001",
    {
      instructionalStrategy:
        "worked_example",
      responseMode:
        "short_answer",
      interventionType:
        "practice",
    },
  );

assert(
  result.evidence.outcome === "correct",
  "correct response must remain correct",
);

assert(
  result.evidence.instructionalStrategy ===
    "worked_example",
  "instructional strategy must be recorded",
);

assert(
  result.evidence.responseMode ===
    "short_answer",
  "response mode must be recorded",
);

assert(
  result.evidence.interventionType ===
    "practice",
  "intervention type must be recorded",
);

assert(
  result.evidence.policyVersion ===
    "assessment-0.6",
  "assessment policy must be 0.5",
);

console.log({
  assessmentEvidenceHardeningTest: "PASS",
});
