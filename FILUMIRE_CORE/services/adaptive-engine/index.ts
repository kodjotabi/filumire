import type { LearnerState } from "../../packages/domain";
import type {
  AdaptiveDecisionRequest,
  AdaptiveDecisionResponse,
} from "../../packages/contracts";
import { selectPedagogicalAction } from "../../packages/pedagogy";

export function makeAdaptiveDecision(
  request: AdaptiveDecisionRequest,
): AdaptiveDecisionResponse {
  const competency = request.learnerState.competencies[0];

  if (!competency) {
    throw new Error("No competency state available for adaptive decision.");
  }

  const context = {
    masteryEstimate: competency.masteryEstimate,
    confidence: competency.confidence,
    evidenceCount: competency.evidenceCount,
    consecutiveFailures: 0,
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
    evidenceIds: [],
    policyVersion: "policy-0.1",
    createdAt: new Date().toISOString(),
  };

  return {
    decision,
  };
}