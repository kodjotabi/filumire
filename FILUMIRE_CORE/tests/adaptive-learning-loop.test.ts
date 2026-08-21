import { createInitialLearnerState, applyEvidence } from "../services/learner-state/index";
import { evaluateAssessment } from "../services/assessment/index";
import { makeAdaptiveDecision } from "../services/adaptive-engine/index";
import { generateInstruction } from "../services/edututor/index";
import { saveEvidence } from "../services/evidence-store/index";
import type { AssessmentSubmission } from "../packages/contracts";

async function runAdaptiveLearningLoop(): Promise<void> {
  const learnerId = "learner-test-validation";
  const competencyId = "competency-test-001";
  const sessionId = "session-adaptive-validation";

  let learnerState = createInitialLearnerState(
    learnerId,
    competencyId,
  );

  const responses = [
    "incorrect-answer",
    "incorrect-answer",
    "incorrect-answer",
    "correct-answer",
    "correct-answer",
  ];

  for (let index = 0; index < responses.length; index += 1) {
    const submission: AssessmentSubmission = {
      learnerId,
      sessionId: `${sessionId}-${index + 1}`,
      assessmentItemId: `item-validation-${index + 1}`,
      competencyId,
      response: responses[index],
    };

    const assessment = evaluateAssessment(
      submission,
      "correct-answer",
    );

    await saveEvidence(assessment.evidence);

    learnerState = applyEvidence(
      learnerState,
      assessment.evidence,
    );

    const adaptiveDecision = await makeAdaptiveDecision({
      learnerId,
      sessionId: submission.sessionId,
      learnerState,
    });

    const instruction = await generateInstruction({
      learnerState,
      decision: adaptiveDecision.decision,
      content: adaptiveDecision.content,
      instructionalContext:
        "Controlled adaptive-learning validation test using the persistence flow.",
    });

    const competency = learnerState.competencies[0];

    console.log({
      attempt: index + 1,
      outcome: assessment.evidence.outcome,
      masteryEstimate: competency.masteryEstimate,
      confidence: competency.confidence,
      evidenceCount: competency.evidenceCount,
      action: adaptiveDecision.decision.action,
      reasonCode: adaptiveDecision.decision.reasonCode,
      instruction: instruction.content,
    });
  }
}

runAdaptiveLearningLoop().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
