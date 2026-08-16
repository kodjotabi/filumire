import { createInitialLearnerState, applyEvidence } from "../services/learner-state/index.ts";
import { evaluateAssessment } from "../services/assessment/index.ts";
import { makeAdaptiveDecision } from "../services/adaptive-engine/index.ts";
import { generateInstruction } from "../services/edututor/index.ts";
import type { AssessmentSubmission } from "../packages/contracts";

async function runAdaptiveLearningLoop(): Promise<void> {
  const learnerId = "learner-test-001";
  const competencyId = "competency-test-001";
  const sessionId = "session-test-001";

  let learnerState = createInitialLearnerState(
    learnerId,
    competencyId,
  );

  const submission: AssessmentSubmission = {
    learnerId,
    sessionId,
    assessmentItemId: "item-test-001",
    competencyId,
    response: "correct-answer",
  };

  const assessment = evaluateAssessment(
    submission,
    "correct-answer",
  );

  learnerState = applyEvidence(
    learnerState,
    assessment.evidence,
  );

  const adaptiveDecision = makeAdaptiveDecision({
    learnerId,
    sessionId,
    learnerState,
  });

  const instruction = await generateInstruction({
    learnerState,
    decision: adaptiveDecision.decision,
    instructionalContext:
      "Test instructional context for the FILUMIRE adaptive-learning loop.",
  });

  console.log({
    learnerState,
    evidence: assessment.evidence,
    decision: adaptiveDecision.decision,
    instruction,
  });
}

runAdaptiveLearningLoop().catch((error) => {
  console.error(error);
});