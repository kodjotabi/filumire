import type {
  AdaptiveDecision,
  CompetencyId,
  LearnerId,
  SessionId,
  LearnerState,
} from "../domain";

import type {
  LearningContent,
} from "../content";

export interface AssessmentSubmission {
  learnerId: LearnerId;
  sessionId: SessionId;
  competencyId: CompetencyId;
  assessmentItemId: string;
  response: string;
  clientExpectedResponse?: string;
  interventionId?: string;
}

export interface AssessmentResult {
  evidenceId: string;
  learnerId: LearnerId;
  sessionId: SessionId;
  assessmentItemId: string;
  correct: boolean;
}

export interface AdaptiveDecisionRequest {
  learnerId: LearnerId;
  sessionId: SessionId;
  learnerState: LearnerState;
}

export interface AdaptiveDecisionResponse {
  decision: AdaptiveDecision;
  content: LearningContent | undefined;
  nextCompetency?: CompetencyId;
}