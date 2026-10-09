import {
  evaluateAssessment,
  type TrustedAssessmentEvaluation,
} from "../services/assessment";

function assert(
  condition: boolean,
  message: string,
): void {
  if (!condition) {
    throw new Error(`FAIL: ${message}`);
  }
}

const trustedOralEvaluation:
  TrustedAssessmentEvaluation = {
  outcome: "correct",
  evaluatorType: "teacher",
  evaluatorId: "teacher-english-test-001",
  evaluationPolicyVersion:
    "english-oral-rubric-0.1",
};

const oralEvidence =
  await evaluateAssessment(
    {
      learnerId: "learner-english-evidence",
      sessionId: "session-english-evidence",
      assessmentItemId:
        "item-english-oral-001",
      competencyId:
        "competency-gh-english-test",
      response:
        "oral-response-reference-001",
    },
    "",
    "content-english-oral-001",
    {
      responseMode: "oral_response",
      interventionType: "reassessment",
    },
    trustedOralEvaluation,
  );

assert(
  oralEvidence.result.correct === true,
  "trusted oral evaluation must be accepted",
);

assert(
  oralEvidence.evidence.outcome ===
    "correct",
  "trusted oral outcome must be recorded",
);

assert(
  oralEvidence.evidence.responseMode ===
    "oral_response",
  "oral response mode must be preserved",
);

assert(
  oralEvidence.evidence.policyVersion ===
    "assessment-0.8",
  "trusted evidence must use assessment policy 0.8",
);

const trustedWritingEvaluation:
  TrustedAssessmentEvaluation = {
  outcome: "incorrect",
  evaluatorType: "system_rubric",
  evaluatorId:
    "english-writing-rubric-engine",
  evaluationPolicyVersion:
    "english-writing-rubric-0.1",
};

const writingEvidence =
  await evaluateAssessment(
    {
      learnerId: "learner-english-evidence",
      sessionId:
        "session-english-evidence",
      assessmentItemId:
        "item-english-writing-001",
      competencyId:
        "competency-gh-english-test",
      response:
        "Learner constructed response",
    },
    "",
    "content-english-writing-001",
    {
      responseMode:
        "constructed_response",
      interventionType: "reassessment",
    },
    trustedWritingEvaluation,
  );

assert(
  writingEvidence.result.correct === false,
  "trusted incorrect evaluation must remain incorrect",
);

assert(
  writingEvidence.evidence.outcome ===
    "incorrect",
  "trusted incorrect outcome must be recorded",
);

assert(
  writingEvidence.evidence.responseMode ===
    "constructed_response",
  "constructed response mode must be preserved",
);

/*
 * Missing provenance must fail closed.
 */

let rejectedMissingProvenance = false;

try {
  await evaluateAssessment(
    {
      learnerId:
        "learner-english-untrusted",
      sessionId:
        "session-english-untrusted",
      assessmentItemId:
        "item-english-untrusted-001",
      competencyId:
        "competency-gh-english-test",
      response:
        "untrusted-response",
    },
    "",
    "content-english-untrusted-001",
    {
      responseMode:
        "constructed_response",
    },
    {
      outcome: "correct",
      evaluatorType: "system_rubric",
      evaluatorId: "",
      evaluationPolicyVersion: "",
    },
  );
}
catch {
  rejectedMissingProvenance = true;
}

assert(
  rejectedMissingProvenance,
  "trusted evaluation without provenance must fail closed",
);

console.log({
  assessmentExternalEvidenceTest:
    "PASS",
  trustedOralEvaluator:
    trustedOralEvaluation.evaluatorType,
  trustedWritingEvaluator:
    trustedWritingEvaluation.evaluatorType,
  missingProvenanceRejected:
    rejectedMissingProvenance,
});