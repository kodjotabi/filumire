import type {
  AdaptiveAction,
  AdaptiveDecision,
  AssessmentItemId,
  CompetencyId,
  EvidenceId,
  LearnerId,
  LearnerState,
  SessionId,
} from "../domain";

export interface DiagnosticRequest {
  learnerId: LearnerId;
  sessionId: SessionId;
  competencyId: CompetencyId;
}

export interface DiagnosticResponse {
  sessionId: SessionId;
  learnerState: LearnerState;
  evidenceIds: EvidenceId[];
}

export interface AssessmentSubmission {
  learnerId: LearnerId;
  sessionId: SessionId;
  assessmentItemId: AssessmentItemId;
  competencyId: CompetencyId;
  response: unknown;
}

export interface AssessmentResult {
  evidenceId: EvidenceId;
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
}

export interface LearningActionRequest {
  learnerId: LearnerId;
  sessionId: SessionId;
  action: AdaptiveAction;
  competencyId: CompetencyId;
}