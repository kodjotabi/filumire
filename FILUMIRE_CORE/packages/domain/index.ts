export type LearnerId = string;
export type CompetencyId = string;
export type AssessmentItemId = string;
export type ContentId = string;
export type SessionId = string;
export type EvidenceId = string;
export type DecisionId = string;

export type EvidenceSource =
  | "diagnostic"
  | "practice"
  | "assessment"
  | "teacher"
  | "system";

export type EvidenceOutcome =
  | "correct"
  | "incorrect"
  | "partial"
  | "skipped"
  | "observed";

export interface LearningEvidence {
  id: EvidenceId;
  learnerId: LearnerId;
  competencyId: CompetencyId;
  source: EvidenceSource;
  outcome: EvidenceOutcome;
  timestamp: string;
  assessmentItemId?: AssessmentItemId;
  sessionId?: SessionId;
  contentId?: ContentId;
  policyVersion: string;
}

export interface LearnerCompetencyState {
  learnerId: LearnerId;
  competencyId: CompetencyId;
  masteryEstimate: number;
  evidenceCount: number;
  confidence: number;
  lastUpdated: string;
  stateVersion: string;
}

export interface LearnerState {
  learnerId: LearnerId;
  competencies: LearnerCompetencyState[];
  stateVersion: string;
  updatedAt: string;
}

export type AdaptiveAction =
  | "diagnose"
  | "teach"
  | "practice"
  | "scaffold"
  | "remediate"
  | "reassess"
  | "advance"
  | "teacher_review";

export interface AdaptiveDecision {
  id: DecisionId;
  learnerId: LearnerId;
  sessionId: SessionId;
  action: AdaptiveAction;
  competencyId: CompetencyId;
  reasonCode: string;
  evidenceIds: EvidenceId[];
  policyVersion: string;
  createdAt: string;
}