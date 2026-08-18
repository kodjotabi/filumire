import type {
  AdaptiveAction,
  AdaptiveDecision,
  AssessmentItemId,
  CompetencyId,
  LearnerId,
  LearnerState,
  SessionId,
} from "../domain";

import type { LearningContent } from "../content";

export interface DiagnosticRequest {
  learnerId: LearnerId;
  sessionId: SessionId;
  competencyId: CompetencyId;
}

export interface DiagnosticResponse {
  sessionId: SessionId;
  learnerState: LearnerState;
  evidenceIds: string[];
}

export interface AssessmentSubmission {
  learnerId: LearnerId;
  sessionId: SessionId;
  assessmentItemId: AssessmentItemId;
  competencyId: CompetencyId;
  response: unknown;
}

export interface AssessmentResult {
  evidenceId: string;
  learnerId: LearnerId;
  sessionId: SessionId;
  assessmentItemId: AssessmentItemId;
  correct: boolean;
}

export interface AdaptiveDecisionRequest {
  learnerId: LearnerId;
  sessionId: SessionId;
  learnerState: LearnerState;
}

export interface AdaptiveDecisionResponse {
  decision: AdaptiveDecision;
  content?: LearningContent;
}

export interface LearningActionRequest {
  learnerId: LearnerId;
  sessionId: SessionId;
  action: AdaptiveAction;
  competencyId: CompetencyId;
}