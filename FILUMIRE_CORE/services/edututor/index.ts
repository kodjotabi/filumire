import type {
  AdaptiveDecision,
  LearnerState,
} from "../../packages/domain";
import {
  MockEduTutor,
  type EduTutorResponse,
} from "../../packages/ai";

export interface EduTutorServiceRequest {
  learnerState: LearnerState;
  decision: AdaptiveDecision;
  instructionalContext: string;
}

export async function generateInstruction(
  request: EduTutorServiceRequest,
): Promise<EduTutorResponse> {
  const tutor = new MockEduTutor();

  return tutor.generate({
    learnerId: request.decision.learnerId,
    sessionId: request.decision.sessionId,
    competencyId: request.decision.competencyId,
    action: request.decision.action,
    instructionalContext: request.instructionalContext,
  });
}