import type { LearnerState } from "../../packages/domain";
import type {
  AdaptiveDecisionRequest,
  AdaptiveDecisionResponse,
} from "../../packages/contracts";
import { selectPedagogicalAction } from "../../packages/pedagogy";
import { selectLearningContent } from "../content-selection";
import { getEvidence } from "../evidence-store";

export function makeAdaptiveDecision(
  request: AdaptiveDecisionRequest,
): AdaptiveDecisionResponse {
  const competency = request.learnerState.competencies[0];

  if (!competency) {
    throw new Error("No competency state available for adaptive decision.");
  }

  const evidence = getEvidence(
    request.learnerId,
    competency.competencyId,
  );

  let consecutiveFailures = 0;

  for (let index = evidence.length - 1; index >= 0; index -= 1) {
    if (evidence[index].outcome !== "incorrect") {
      break;
    }

    consecutiveFailures += 1;
  }

  const context = {
    masteryEstimate: competency.masteryEstimate,
    confidence: competency.confidence,
    evidenceCount: competency.evidenceCount,
    consecutiveFailures,
    prerequisiteSatisfied: true,
  };

  const pedagogicalDecision = selectPedagogicalAction(context);

  const decision = {
    id: `decision-${request.sessionId}-${competency.competencyId}`,
    learnerId: request.learnerId,
    sessionId: request.sessionId,
    action: pedagogicalDecision.action,
    competencyId: competency.competencyId,
    reasonCode: pedagogicalDecision.reasonCode,
    evidenceIds: evidence.map((item) => item.id),
    policyVersion: "policy-0.1",
    createdAt: new Date().toISOString(),
  };

  const content = selectLearningContent(
    request.learnerState,
    pedagogicalDecision.action,
  );

  return {
    decision,
    content,
  };
}