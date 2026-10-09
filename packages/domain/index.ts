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
 * Why this evidence was collected.
 *
 * Purpose is distinct from source. An assessment source,
 * for example, may be used for diagnosis, mastery
 * verification, retention, or transfer.
 */
export type EvidencePurpose =
  | "diagnostic"
  | "practice"
  | "mastery"
  | "retention"
  | "transfer"
  | "intervention_evaluation"
  | "teacher_observation";

/*
 * How independently the learner produced the response.
 *
 * Supported success is valid positive evidence but must
 * not be treated as equivalent to independent success.
 */
export type EvidenceIndependence =
  | "independent"
  | "light_support"
  | "guided"
  | "fully_supported"
  | "unknown";

export type EvidenceDifficulty =
  | "foundational"
  | "standard"
  | "challenging"
  | "extension"
  | "unknown";

/*
 * Representation through which the competency was
 * presented or demonstrated.
 */
export type EvidenceRepresentation =
  | "symbolic"
  | "numeric"
  | "verbal"
  | "visual"
  | "concrete"
  | "diagram"
  | "table"
  | "graph"
  | "story_context"
  | "mixed"
  | "unknown";

/*
 * Strength is an interpretation of how much weight the
 * evidence should carry. It is not a mastery score.
 */
export type EvidenceStrength =
  | "weak"
  | "moderate"
  | "strong";

/*
 * Structured error classes allow diagnosis to reason
 * across attempts without relying on free-text strings.
 */
export type EvidenceErrorClass =
  | "knowledge_gap"
  | "prerequisite_gap"
  | "misconception"
  | "procedural_error"
  | "application_error"
  | "language_comprehension"
  | "careless_execution"
  | "retention_failure"
  | "transfer_failure"
  | "unknown";

/*
 * Provenance identifies how an evidence interpretation
 * was produced. Raw learner responses remain distinct
 * from the interpretation derived from them.
 */
export type EvidenceEvaluatorType =
  | "system_exact_match"
  | "system_rubric"
  | "teacher"
  | "ai_rubric"
  | "observer";

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
  | "careless_execution"
  | "forgotten_knowledge"
  | "transfer_failure"
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

export interface DiagnosticEvidenceSummary {
  diagnosticState: DiagnosticState;
  evidenceCount: number;
  lastEvidenceAt: string;
  confidence: number;
  errorPatterns: string[];
}

export interface OutcomePerformanceSummary {
  attempts: number;
  successfulAttempts: number;
  unsuccessfulAttempts: number;
  lastOutcome?: EvidenceOutcome;
  lastEvidenceAt?: string;
  confidence: number;
}

export interface InterventionResponseSummary {
  interventionType: InterventionType;
  attempts: number;
  successfulAttempts: number;
  unsuccessfulAttempts: number;
  lastOutcome?: InterventionOutcome;
  lastEvidenceAt?: string;
  effectiveness: StrategyEffectiveness;
}

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
   * Evidence V1 semantics.
   *
   * These fields allow downstream engines to distinguish
   * what was being measured, under what conditions, and
   * how strongly the observation should influence an
   * educational conclusion.
   */
  purpose?: EvidencePurpose;
  independence?: EvidenceIndependence;
  supportLevel?: number;
  difficulty?: EvidenceDifficulty;
  representation?: EvidenceRepresentation;
  strength?: EvidenceStrength;

  /*
   * Structured interpretation signals.
   *
   * errorPattern remains for backward compatibility while
   * errorClass provides a controlled diagnostic vocabulary.
   */
  errorClass?: EvidenceErrorClass;
  errorPattern?: string;

  prerequisiteCompetencyId?: CompetencyId;
  misconceptionId?: string;

  /*
   * Exposure information helps FILUMIRE avoid treating
   * repeated familiarity with the same item as equivalent
   * to varied demonstrations of competence.
   */
  exposureCount?: number;

  /*
   * Evidence V1.1 context.
   *
   * attemptCount is the learner's attempt number for this
   * item. contextTags record the real-life contexts the item
   * was set in, so FILUMIRE can tell varied demonstrations of
   * competence apart from repeated familiar ones.
   */
  attemptCount?: number;
  contextTags?: string[];

  /*
   * Interpretation provenance.
   *
   * evaluatorId and evaluationPolicyVersion identify who
   * or what produced the educational interpretation.
   */
  evaluatorType?: EvidenceEvaluatorType;
  evaluatorId?: string;
  evaluationPolicyVersion?: string;
  interpretationVersion?: string;

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

  /*
   * Legacy diagnostic fields remain during the V1
   * migration. Diagnosis will subsequently become a
   * separate, revisable interpretation layer.
   */
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

  diagnosticHistory?: DiagnosticEvidenceSummary[];

  misconceptionHistory?: DiagnosticEvidenceSummary[];

  interventionHistory: LearnerInterventionRecord[];

  interventionResponse?: InterventionResponseSummary[];

  retentionPerformance?: OutcomePerformanceSummary;

  transferPerformance?: OutcomePerformanceSummary;

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

  /*
   * Tranche 4G: the learner was on this competency without its
   * prerequisites and was sent to learn this prerequisite first
   * (decision PREREQUISITE_REPAIR). Kept as history; the teacher
   * summary works out whether the repair is done.
   */
  prerequisiteRepair?: {
    repairCompetencyId: CompetencyId;
    startedAt: string;
  };

  /*
   * When the competency was first acquired (mastery and
   * confidence both established), and when evidence last arrived.
   * They let FILUMIRE reason about time: how long since the
   * learner demonstrated this, and when retention is worth testing.
   */
  masteredAt?: string;

  lastEvidenceAt?: string;

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
