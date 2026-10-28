import type {
  AdaptiveDecision,
  LearnerState,
} from "../../packages/domain";
import type { LearningContent } from "../../packages/content";
import {
  DeterministicGovernedInstructionalEngine,
  type EduTutorResponse,
} from "../../packages/ai";
import {
  getCompetency,
} from "../../packages/curriculum";

export interface EduTutorServiceRequest {
  learnerState: LearnerState;
  decision: AdaptiveDecision;
  content?: LearningContent;
  instructionalContext: string;
}

/* Options are stored as a JSON array of strings (see the learn page). */
function hasAnswerOptions(value?: string): boolean {
  try {
    const parsed: unknown = value ? JSON.parse(value) : [];
    return Array.isArray(parsed) && parsed.some(item => typeof item === "string" && item.trim() !== "");
  } catch {
    return false;
  }
}

export async function generateInstruction(
  request: EduTutorServiceRequest,
): Promise<EduTutorResponse> {
  const competency = getCompetency(
    request.decision.competencyId,
  );

  if (!competency) {
    throw new Error(
      "Instructional competency context is required.",
    );
  }

  const learnerCompetency =
    request.learnerState.competencies.find(
      (item) =>
        item.competencyId ===
        request.decision.competencyId,
    );

  if (!learnerCompetency) {
    throw new Error(
      "Learner competency context is required for instruction.",
    );
  }

  const engine =
    new DeterministicGovernedInstructionalEngine();

  return engine.generate({
    language: request.learnerState.language === "fr" ? "fr" : "en",
    learnerId: request.decision.learnerId,
    sessionId: request.decision.sessionId,
    competency: {
      id: competency.id,
      title: competency.title,
      description: competency.description,
      prerequisiteCompetencyIds:
        competency.prerequisiteCompetencyIds,
      misconceptions:
        competency.misconceptions,
    },
    decision: {
      id: request.decision.id,
      action: request.decision.action,
      reasonCode: request.decision.reasonCode,
      competencyId: request.decision.competencyId,
      interventionId:
        request.decision.interventionId,
      instructionalStrategy:
        request.decision.instructionalStrategy,
      responseMode:
        request.decision.responseMode,
    },
    learnerProfile: {
      masteryEstimate:
        learnerCompetency.masteryEstimate,
      confidence:
        learnerCompetency.confidence,
      diagnosticState:
        learnerCompetency.diagnosticState,
      diagnosticConfidence:
        learnerCompetency.diagnosticConfidence,
      errorPatterns:
        learnerCompetency.errorPatterns,
    },
    content: request.content
      ? {
          id: request.content.id,
          competencyId:
            request.content.competencyId,
          type: request.content.type,
          title: request.content.title,
          body: request.content.body,
          assessmentItemId:
            request.content.assessmentItemId,
          presentsOptions:
            hasAnswerOptions(request.content.metadata?.options),
        }
      : undefined,
    instructionalContext:
      request.instructionalContext,
  });
}
