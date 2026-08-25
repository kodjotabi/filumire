export type LearnerId = string;
export type CompetencyId = string;
export type AssessmentItemId = string;
export type ContentId = string;
export type SessionId = string;
export type EvidenceId = string;
export type DecisionId = string;
export type InterventionId = string;

export type LearningLanguage =
  | "en"
  | "fr";

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

export type DiagnosticState =
  | "unknown"
  | "insufficient_evidence"
  | "prerequisite_gap"
  | "conceptual_misunderstanding"
  | "procedural_error"
  | "misconception"
  | "persistent_difficulty"
  | "probable_mastery";

export type InterventionType =
  | "diagnose"
  | "teach"
  | "practice"
  | "scaffold"
  | "remediate"
  | "reassess"
  | "retention_check"
  | "transfer_check"
  | "teacher_review";

export type InterventionStatus =
  | "active"
  | "completed"
  | "cancelled";

export type InterventionOutcome =
  | "not_yet_evaluated"
  | "ineffective"
  | "partial_recovery"
  | "effective"
  | "effective_with_retention"
  | "effective_with_transfer";

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
  errorPattern?: string;
  diagnosticState?: DiagnosticState;
  diagnosticConfidence?: number;
  interventionType?: InterventionType;
  interventionId?: InterventionId;
}

export interface LearnerInterventionRecord {
  interventionId: InterventionId;
  competencyId: CompetencyId;
  type: InterventionType;
  startedAt: string;
  completedAt?: string;
  outcome?: InterventionOutcome;
  evidenceIds: EvidenceId[];
}

export type PrerequisiteState =
  | "unknown"
  | "not_ready"
  | "developing"
  | "ready"
  | "mastered";

export interface RetentionState {
  status:
    | "not_tested"
    | "pending"
    | "retained"
    | "not_retained";
  lastCheckedAt?: string;
  confidence: number;
  evidenceIds: EvidenceId[];
}

export interface TransferState {
  status:
    | "not_tested"
    | "pending"
    | "demonstrated"
    | "not_demonstrated";
  lastCheckedAt?: string;
  confidence: number;
  evidenceIds: EvidenceId[];
}

export interface ReadinessState {
  readyForAdvancement: boolean;
  confidence: number;
  reasonCode?: string;
  evaluatedAt: string;
}

export interface LearnerCompetencyState {
  learnerId: LearnerId;
  competencyId: CompetencyId;
  masteryEstimate: number;
  evidenceCount: number;
  confidence: number;
  diagnosticState: DiagnosticState;
  diagnosticConfidence: number;
  errorPatterns: string[];
  interventionHistory: LearnerInterventionRecord[];
  prerequisiteState?: Record<
    CompetencyId,
    PrerequisiteState
  >;
  retentionState?: RetentionState;
  transferState?: TransferState;
  readinessState?: ReadinessState;
  lastUpdated: string;
  stateVersion: string;
}

export interface LearnerState {
  learnerId: LearnerId;

  language: LearningLanguage;

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
  | "retention_check"
  | "transfer_check"
  | "advance"
  | "complete"
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
  confidence?: number;
  interventionId?: InterventionId;
}

export interface Intervention {
  interventionId: InterventionId;
  learnerId: LearnerId;
  competencyId: CompetencyId;
  sessionId: SessionId;
  decisionId: DecisionId;
  type: InterventionType;
  status: InterventionStatus;
  outcome: InterventionOutcome;
  startedAt: string;
  completedAt?: string;
  evidenceIds: EvidenceId[];
  policyVersion: string;
}