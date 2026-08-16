import type { LearningEvidence } from "../../packages/domain";
import type {
  AssessmentResult,
  AssessmentSubmission,
} from "../../packages/contracts";

export function evaluateAssessment(
  submission: AssessmentSubmission,
  expectedResponse: unknown,
): {
  result: AssessmentResult;
  evidence: LearningEvidence;
} {
  const correct =
    JSON.stringify(submission.response) ===
    JSON.stringify(expectedResponse);

  const now = new Date().toISOString();

  const evidence: LearningEvidence = {
    id: `ev-${submission.sessionId}-${submission.assessmentItemId}`,
    learnerId: submission.learnerId,
    competencyId: submission.competencyId,
    source: "assessment",
    outcome: correct ? "correct" : "incorrect",
    timestamp: now,
    assessmentItemId: submission.assessmentItemId,
    sessionId: submission.sessionId,
    policyVersion: "assessment-0.1",
  };

  return {
    result: {
      evidenceId: evidence.id,
      learnerId: submission.learnerId,
      sessionId: submission.sessionId,
      assessmentItemId: submission.assessmentItemId,
      correct,
    },
    evidence,
  };
}