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

/*
 * FILUMIRE instructional strategy repertoire.
 *
 * These describe HOW a competency is taught.
 * They are not learner labels. FILUMIRE must
 * evaluate strategy effectiveness from evidence.
 */
export type InstructionalStrategy =
  | "direct_explanation"
  | "worked_example"
  | "guided_practice"
  | "questioning"
  | "visual_representation"
  | "concrete_representation"
  | "analogy"
  | "demonstration"
  | "story_context"
  | "step_by_step_scaffold"
  | "error_analysis"
  | "retrieval_practice"
  | "mixed_representation";

/*
 * FILUMIRE response modes.
 *
 * These describe HOW a learner demonstrates
 * a competency.
 */
export type ResponseMode =
  | "multiple_choice"
  | "short_answer"
  | "constructed_response"
  | "worked_solution"
  | "explanation"
  | "error_identification"
  | "sequence_ordering"
  | "matching"
  | "classification"
  | "application"
  | "oral_response"
  | "observed_performance";

/*
 * Evidence about whether a particular instructional
 * strategy helped this learner.
 */
export type StrategyEffectiveness =
  | "unknown"
  | "ineffective"
  | "partially_effective"
  | "effective";

export interface StrategyEvidence {
  strategy: InstructionalStrategy;
  effectiveness: StrategyEffectiveness;
  evidenceCount: number;
  successfulEvidenceCount: number;
  lastUsedAt?: string;
  confidence: number;
}

/*
 * Evidence about how effectively a learner can
 * demonstrate a competency through a response mode.
 */
export interface ResponseModeEvidence {
  responseMode: ResponseMode;
  evidenceCount: number;
  successfulEvidenceCount: number;
  lastUsedAt?: string;
  confidence: number;
}

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

  /*
   * The instructional strategy that preceded
   * this evidence, when applicable.
   */
  instructionalStrategy?: InstructionalStrategy;

  /*
   * The response mode through which the learner
   * demonstrated the evidence, when applicable.
   */
  responseMode?: ResponseMode;

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

  /*
   * Strategy used by this intervention.
   */
  instructionalStrategy?: InstructionalStrategy;

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

  /*
   * FILUMIRE's evolving evidence about which
   * instructional approaches work for this learner
   * on this competency.
   */
  strategyEvidence?: StrategyEvidence[];

  /*
   * FILUMIRE's evolving evidence about the learner's
   * ability to demonstrate the competency through
   * different response modes.
   */
  responseModeEvidence?: ResponseModeEvidence[];

  /*
   * The strategies and response modes most recently
   * selected by the adaptive system.
   */
  currentInstructionalStrategy?: InstructionalStrategy;

  currentResponseMode?: ResponseMode;

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

  /*
   * The adaptive system may explicitly select
   * HOW the next intervention should teach.
   */
  instructionalStrategy?: InstructionalStrategy;

  /*
   * The adaptive system may explicitly select
   * HOW the learner should demonstrate the competency.
   */
  responseMode?: ResponseMode;
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

  /*
   * Strategy used by the intervention.
   */
  instructionalStrategy?: InstructionalStrategy;

  /*
   * Response mode expected from the learner,
   * where applicable.
   */
  responseMode?: ResponseMode;

  startedAt: string;

  completedAt?: string;

  evidenceIds: EvidenceId[];

  policyVersion: string;
}