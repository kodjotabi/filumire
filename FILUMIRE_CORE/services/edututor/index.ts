import type {
  AdaptiveDecision,
  LearnerState,
} from "../../packages/domain";
import type { LearningContent } from "../../packages/content";
import {
  MockEduTutor,
  type EduTutorResponse,
} from "../../packages/ai";

export interface EduTutorServiceRequest {
  learnerState: LearnerState;
  decision: AdaptiveDecision;
  content?: LearningContent;
  instructionalContext: string;
}

export async function generateInstruction(
  request: EduTutorServiceRequest,
): Promise<EduTutorResponse> {
  const tutor = new MockEduTutor();

  const contentContext = request.content
    ? `Learning content: ${request.content.title}\n${request.content.body}`
    : "";

  return tutor.generate({
    learnerId: request.decision.learnerId,
    sessionId: request.decision.sessionId,
    competencyId: request.decision.competencyId,
    action: request.decision.action,
    instructionalContext: [
      request.instructionalContext,
      contentContext,
    ]
      .filter(Boolean)
      .join("\n\n"),
  });
}