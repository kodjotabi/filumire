import type {
  DecisionId,
  EvidenceId,
  LearnerId,
  CompetencyId,
  SessionId,
  InstructionalStrategy,
  ResponseMode,
} from "./index";

export type InterventionId = string;

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

export interface LearningIntervention {
  interventionId: InterventionId;

  learnerId: LearnerId;

  competencyId: CompetencyId;

  sessionId: SessionId;

  decisionId: DecisionId;

  type: InterventionType;

  instructionalStrategy?: InstructionalStrategy;

  responseMode?: ResponseMode;

  status: InterventionStatus;

  startedAt: string;

  completedAt?: string;

  outcome: InterventionOutcome;

  evidenceIds: EvidenceId[];

  policyVersion: string;

  createdAt: string;

  updatedAt: string;
}