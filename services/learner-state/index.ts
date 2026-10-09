import type {
  DiagnosticState,
  LearningEvidence,
  LearnerCompetencyState,
  LearnerInterventionRecord,
  LearnerState,
  InterventionOutcome,
  StrategyEffectiveness,
  LearningLanguage,
  InstructionalStrategy,
  ResponseMode,
} from "../../packages/domain";

import {
  persistenceStore,
} from "../persistence-provider";

import {
  diagnoseEvidence,
} from "../diagnosis";

import {
  evaluateMastery,
} from "../mastery";

import {
  inferInterventionOutcome,
} from "../intervention";

import {
  evaluateRetention,
  evaluateTransfer,
} from "../retention-transfer/evaluator";


/*
 * A misconception is a claim about HOW the learner thinks, so
 * a single wrong answer is not enough to make it. FILUMIRE
 * needs the same wrong thinking to show up in more than one
 * piece of evidence before it treats it as a probable
 * misconception and targets it.
 */
export const MISCONCEPTION_POLICY = {
  minimumSupportingEvidence: 2,
  uncorroboratedConfidenceCeiling: 0.5,
} as const;

function misconceptionKey(
  evidence: LearningEvidence,
): string | undefined {
  /*
   * Only evidence that names its misconception can be
   * corroborated. Older unnamed evidence keeps its diagnosis.
   */
  return evidence.misconceptionId;
}

function countSupportingEvidence(
  evidence: LearningEvidence,
  evidenceHistory: LearningEvidence[],
): number {
  const key = misconceptionKey(evidence);

  if (!key) {
    return 0;
  }

  const ids = new Set<string>([evidence.id]);

  for (const item of evidenceHistory) {
    if (
      item.outcome === "incorrect" &&
      misconceptionKey(item) === key
    ) {
      ids.add(item.id);
    }
  }

  return ids.size;
}

function updateErrorPatterns(
  existing: LearnerCompetencyState,
  evidence: LearningEvidence,
): string[] {
  if (!evidence.errorPattern) {
    return existing.errorPatterns;
  }

  if (
    existing.errorPatterns.includes(
      evidence.errorPattern,
    )
  ) {
    return existing.errorPatterns;
  }

  return [
    ...existing.errorPatterns,
    evidence.errorPattern,
  ];
}

function updateDiagnosticHistory(
  existing: LearnerCompetencyState,
  evidence: LearningEvidence,
  diagnosticState: DiagnosticState,
  diagnosticConfidence: number,
): LearnerCompetencyState["diagnosticHistory"] {
  if (
    diagnosticState === "unknown" ||
    diagnosticState === "insufficient_evidence" ||
    diagnosticState === "probable_mastery"
  ) {
    return existing.diagnosticHistory ?? [];
  }

  const current = existing.diagnosticHistory ?? [];
  const previous = current.find(
    (item) =>
      item.diagnosticState === diagnosticState,
  );
  const errorPatterns = evidence.errorPattern
    ? [
        ...new Set([
          ...(previous?.errorPatterns ?? []),
          evidence.errorPattern,
        ]),
      ]
    : previous?.errorPatterns ?? [];

  if (!previous) {
    return [
      ...current,
      {
        diagnosticState,
        evidenceCount: 1,
        lastEvidenceAt: evidence.timestamp,
        confidence: diagnosticConfidence,
        errorPatterns,
      },
    ];
  }

  return current.map((item) =>
    item.diagnosticState === diagnosticState
      ? {
          ...item,
          evidenceCount: item.evidenceCount + 1,
          lastEvidenceAt: evidence.timestamp,
          confidence: Math.max(
            item.confidence,
            diagnosticConfidence,
          ),
          errorPatterns,
        }
      : item,
  );
}

function updateMisconceptionHistory(
  existing: LearnerCompetencyState,
  evidence: LearningEvidence,
  diagnosticState: DiagnosticState,
  diagnosticConfidence: number,
): LearnerCompetencyState["misconceptionHistory"] {
  if (
    diagnosticState !== "misconception" &&
    diagnosticState !== "conceptual_misunderstanding" &&
    diagnosticState !== "prerequisite_gap"
  ) {
    return existing.misconceptionHistory ?? [];
  }

  return updateDiagnosticHistory(
    {
      ...existing,
      diagnosticHistory:
        existing.misconceptionHistory,
    },
    evidence,
    diagnosticState,
    diagnosticConfidence,
  );
}

function updateInterventionHistory(
  existing: LearnerCompetencyState,
  evidence: LearningEvidence,
): LearnerInterventionRecord[] {
  if (
    !evidence.interventionType ||
    !evidence.interventionId
  ) {
    return existing.interventionHistory;
  }

  const interventionOutcome =
    inferInterventionOutcome(
      evidence.interventionType,
      evidence.outcome,
    );

  const existingIntervention =
    existing.interventionHistory.find(
      (intervention) =>
        intervention.interventionId ===
        evidence.interventionId,
    );

  if (existingIntervention) {
    return existing.interventionHistory.map(
      (intervention) =>
        intervention.interventionId ===
        evidence.interventionId
          ? {
              ...intervention,
              completedAt:
                evidence.timestamp,
              outcome:
                interventionOutcome ??
                intervention.outcome,
              evidenceIds:
                intervention.evidenceIds.includes(
                  evidence.id,
                )
                  ? intervention.evidenceIds
                  : [
                      ...intervention.evidenceIds,
                      evidence.id,
                    ],
            }
          : intervention,
    );
  }

  return [
    ...existing.interventionHistory,
    {
      interventionId:
        evidence.interventionId,
      competencyId:
        evidence.competencyId,
      type:
        evidence.interventionType,
      startedAt:
        evidence.timestamp,
      completedAt:
        evidence.timestamp,
      outcome:
        interventionOutcome,
      evidenceIds: [
        evidence.id,
      ],
    },
  ];
}

function updateRetentionState(
  existing: LearnerCompetencyState,
  evidence: LearningEvidence,
  evidenceHistory: LearningEvidence[],
) {
  if (
    evidence.interventionType !==
    "retention_check"
  ) {
    return existing.retentionState;
  }

  const evaluation =
    evaluateRetention(
      evidenceHistory,
    );

  return {
    status: evaluation.status,
    lastCheckedAt: evidence.timestamp,
    confidence: evaluation.confidence,
    evidenceIds: evaluation.evidenceIds,
  };
}

function updateTransferState(
  existing: LearnerCompetencyState,
  evidence: LearningEvidence,
  evidenceHistory: LearningEvidence[],
) {
  if (
    evidence.interventionType !==
    "transfer_check"
  ) {
    return existing.transferState;
  }

  const evaluation =
    evaluateTransfer(
      evidenceHistory,
    );

  return {
    status: evaluation.status,
    lastCheckedAt: evidence.timestamp,
    confidence: evaluation.confidence,
    evidenceIds: evaluation.evidenceIds,
  };
}
function updatePerformanceSummary(
  current:
    | LearnerCompetencyState["retentionPerformance"]
    | LearnerCompetencyState["transferPerformance"],
  evidence: LearningEvidence,
): LearnerCompetencyState["retentionPerformance"] {
  const attempts = (current?.attempts ?? 0) + 1;
  const successfulAttempts =
    (current?.successfulAttempts ?? 0) +
    (evidence.outcome === "correct" ? 1 : 0);
  const unsuccessfulAttempts =
    attempts - successfulAttempts;

  return {
    attempts,
    successfulAttempts,
    unsuccessfulAttempts,
    lastOutcome: evidence.outcome,
    lastEvidenceAt: evidence.timestamp,
    confidence:
      successfulAttempts / attempts,
  };
}

function updateRetentionPerformance(
  existing: LearnerCompetencyState,
  evidence: LearningEvidence,
) {
  if (
    evidence.interventionType !==
    "retention_check"
  ) {
    return existing.retentionPerformance;
  }

  return updatePerformanceSummary(
    existing.retentionPerformance,
    evidence,
  );
}

function updateTransferPerformance(
  existing: LearnerCompetencyState,
  evidence: LearningEvidence,
) {
  if (
    evidence.interventionType !==
    "transfer_check"
  ) {
    return existing.transferPerformance;
  }

  return updatePerformanceSummary(
    existing.transferPerformance,
    evidence,
  );
}

function updateInterventionResponse(
  existing: LearnerCompetencyState,
  evidence: LearningEvidence,
): LearnerCompetencyState["interventionResponse"] {
  if (!evidence.interventionType) {
    return existing.interventionResponse ?? [];
  }

  const outcome = inferInterventionOutcome(
    evidence.interventionType,
    evidence.outcome,
  );

  if (!outcome) {
    return existing.interventionResponse ?? [];
  }

  const current = existing.interventionResponse ?? [];
  const previous = current.find(
    (item) =>
      item.interventionType ===
      evidence.interventionType,
  );
  const successful =
    outcome === "effective" ||
    outcome === "effective_with_retention" ||
    outcome === "effective_with_transfer";

  function resolveEffectiveness(
    attempts: number,
    successfulAttempts: number,
  ): StrategyEffectiveness {
    if (successfulAttempts === attempts) {
      return "effective";
    }

    if (successfulAttempts === 0) {
      return "ineffective";
    }

    return "partially_effective";
  }

  if (!previous) {
    return [
      ...current,
      {
        interventionType:
          evidence.interventionType,
        attempts: 1,
        successfulAttempts:
          successful ? 1 : 0,
        unsuccessfulAttempts:
          successful ? 0 : 1,
        lastOutcome: outcome,
        lastEvidenceAt: evidence.timestamp,
        effectiveness:
          successful
            ? "effective"
            : outcome === "partial_recovery"
              ? "partially_effective"
              : "ineffective",
      },
    ];
  }

  const attempts = previous.attempts + 1;
  const successfulAttempts =
    previous.successfulAttempts +
    (successful ? 1 : 0);

  return current.map((item) =>
    item.interventionType ===
    evidence.interventionType
      ? {
          ...item,
          attempts,
          successfulAttempts,
          unsuccessfulAttempts:
            attempts - successfulAttempts,
          lastOutcome: outcome,
          lastEvidenceAt: evidence.timestamp,
          effectiveness: resolveEffectiveness(
            attempts,
            successfulAttempts,
          ),
        }
      : item,
  );
}

function updateStrategyEvidence(
  existing: LearnerCompetencyState,
  evidence: LearningEvidence,
): LearnerCompetencyState["strategyEvidence"] {
  const strategy =
    evidence.instructionalStrategy;

  if (!strategy) {
    return existing.strategyEvidence;
  }

  const current =
    existing.strategyEvidence ?? [];

  const previous =
    current.find(
      (item) =>
        item.strategy === strategy,
    );

  const successful =
    evidence.outcome === "correct";

  if (!previous) {
    return [
      ...current,
      {
        strategy,
        effectiveness:
          successful
            ? "effective"
            : evidence.outcome === "partial"
              ? "partially_effective"
              : "ineffective",
        evidenceCount: 1,
        successfulEvidenceCount:
          successful ? 1 : 0,
        lastUsedAt:
          evidence.timestamp,
        confidence: 1,
      },
    ];
  }

  const evidenceCount =
    previous.evidenceCount + 1;

  const successfulEvidenceCount =
    previous.successfulEvidenceCount +
    (successful ? 1 : 0);

  let effectiveness:
    | "unknown"
    | "ineffective"
    | "partially_effective"
    | "effective";

  if (
    successfulEvidenceCount ===
      evidenceCount
  ) {
    effectiveness = "effective";
  } else if (
    successfulEvidenceCount === 0
  ) {
    effectiveness = "ineffective";
  } else {
    effectiveness = "partially_effective";
  }

  return current.map(
    (item) =>
      item.strategy === strategy
        ? {
            ...item,
            effectiveness,
            evidenceCount,
            successfulEvidenceCount,
            lastUsedAt:
              evidence.timestamp,
            confidence:
              Math.min(
                evidenceCount / 5,
                1,
              ),
          }
        : item,
  );
}

function updateResponseModeEvidence(
  existing: LearnerCompetencyState,
  evidence: LearningEvidence,
): LearnerCompetencyState["responseModeEvidence"] {
  const responseMode =
    evidence.responseMode;

  if (!responseMode) {
    return existing.responseModeEvidence;
  }

  const current =
    existing.responseModeEvidence ?? [];

  const previous =
    current.find(
      (item) =>
        item.responseMode === responseMode,
    );

  const successful =
    evidence.outcome === "correct";

  if (!previous) {
    return [
      ...current,
      {
        responseMode,
        evidenceCount: 1,
        successfulEvidenceCount:
          successful ? 1 : 0,
        lastUsedAt:
          evidence.timestamp,
        confidence: 1,
      },
    ];
  }

  const evidenceCount =
    previous.evidenceCount + 1;

  const successfulEvidenceCount =
    previous.successfulEvidenceCount +
    (successful ? 1 : 0);

  return current.map(
    (item) =>
      item.responseMode === responseMode
        ? {
            ...item,
            evidenceCount,
            successfulEvidenceCount,
            lastUsedAt:
              evidence.timestamp,
            confidence:
              Math.min(
                evidenceCount / 5,
                1,
              ),
          }
        : item,
  );
}

  function calculateMasteryEstimate(
    existing: LearnerCompetencyState,
    evidence: LearningEvidence,
    outcomeScore: number,
  ): number {
    if (
      evidence.interventionType ===
      "retention_check"
    ) {
      if (evidence.outcome === "correct") {
        return Math.max(
          existing.masteryEstimate,
          0.85,
        );
      }

      return Math.max(
        0,
        existing.masteryEstimate - 0.25,
      );
    }

    if (
      evidence.interventionType ===
      "transfer_check"
    ) {
      if (evidence.outcome === "correct") {
        return Math.max(
          existing.masteryEstimate,
          0.85,
        );
      }

      return Math.max(
        0,
        existing.masteryEstimate - 0.1,
      );
    }

    return (
      existing.masteryEstimate *
        existing.evidenceCount +
      outcomeScore
    ) / (existing.evidenceCount + 1);
  }

  function calculateConfidence(
    existing: LearnerCompetencyState,
    evidence: LearningEvidence,
    evidenceCount: number,
  ): number {
    const baseConfidence = Math.min(
      evidenceCount / 5,
      1,
    );

    if (
      evidence.interventionType ===
        "retention_check" &&
      evidence.outcome !== "correct"
    ) {
      return Math.min(
        existing.confidence,
        0.6,
      );
    }

    if (
      evidence.interventionType ===
        "retention_check" &&
      evidence.outcome === "correct"
    ) {
      return Math.max(baseConfidence, 0.85);
    }

    if (
      evidence.interventionType ===
        "transfer_check" &&
      evidence.outcome === "correct"
    ) {
      return Math.max(baseConfidence, 0.85);
    }

    return baseConfidence;
  }

export function createInitialLearnerState(
  learnerId: string,
  competencyId: string,
  language: LearningLanguage = "en",
): LearnerState {
  const now =
    new Date().toISOString();

  return {
    learnerId,
    language,
    competencies: [
      {
        learnerId,
        competencyId,
        masteryEstimate: 0,
        evidenceCount: 0,
        confidence: 0,
        diagnosticState: "unknown",
        diagnosticConfidence: 0,
        errorPatterns: [],
        diagnosticHistory: [],
        misconceptionHistory: [],
        interventionHistory: [],
        interventionResponse: [],
        retentionPerformance: {
          attempts: 0,
          successfulAttempts: 0,
          unsuccessfulAttempts: 0,
          confidence: 0,
        },
        transferPerformance: {
          attempts: 0,
          successfulAttempts: 0,
          unsuccessfulAttempts: 0,
          confidence: 0,
        },
        strategyEvidence: [],
        responseModeEvidence: [],
        prerequisiteState: {},
        retentionState: {
          status: "not_tested",
          confidence: 0,
          evidenceIds: [],
        },
        transferState: {
          status: "not_tested",
          confidence: 0,
          evidenceIds: [],
        },
        readinessState: {
          readyForAdvancement: false,
          confidence: 0,
          evaluatedAt: now,
        },
        lastUpdated: now,
        stateVersion: "state-0.4",
      },
    ],
    stateVersion: "state-0.4",
    updatedAt: now,
  };
}

export function applyEvidence(
  state: LearnerState,
  evidence: LearningEvidence,
  evidenceHistory: LearningEvidence[] = [evidence],
): LearnerState {
  const existing =
    state.competencies.find(
      (competency) =>
        competency.competencyId ===
        evidence.competencyId,
    );

  if (!existing) {
    return state;
  }

  const evidenceCount = evidenceHistory.length;

  const mastery = evaluateMastery(evidenceHistory);
  const masteryEstimate = mastery.masteryEstimate;
  const confidence = mastery.confidence;

  const diagnosis = diagnoseEvidence(
    evidence,
    existing,
    confidence,
  );

  let diagnosticState =
    diagnosis.diagnosticState;

  let diagnosticConfidence =
    diagnosis.confidence;

  /*
   * One wrong answer is a signal, not a diagnosis. Until the
   * same wrong thinking is supported by more evidence, treat
   * the difficulty as a conceptual one, at modest confidence.
   */
  if (
    diagnosticState === "misconception" &&
    misconceptionKey(evidence) !== undefined &&
    countSupportingEvidence(
      evidence,
      evidenceHistory,
    ) <
      MISCONCEPTION_POLICY.minimumSupportingEvidence
  ) {
    diagnosticState =
      "conceptual_misunderstanding";

    diagnosticConfidence = Math.min(
      diagnosticConfidence,
      MISCONCEPTION_POLICY.uncorroboratedConfidenceCeiling,
    );
  }

  const errorPatterns =
    updateErrorPatterns(
      existing,
      evidence,
    );

  const interventionHistory =
    updateInterventionHistory(
      existing,
      evidence,
    );

  const diagnosticHistory =
    updateDiagnosticHistory(
      existing,
      evidence,
      diagnosticState,
      diagnosticConfidence,
    );

  const misconceptionHistory =
    updateMisconceptionHistory(
      existing,
      evidence,
      diagnosticState,
      diagnosticConfidence,
    );

  const interventionResponse =
    updateInterventionResponse(
      existing,
      evidence,
    );

  const retentionState =
    updateRetentionState(
      existing,
      evidence,
      evidenceHistory,
    );

  const transferState =
    updateTransferState(
      existing,
      evidence,
      evidenceHistory,
    );

  const retentionPerformance =
    updateRetentionPerformance(
      existing,
      evidence,
    );

  const transferPerformance =
    updateTransferPerformance(
      existing,
      evidence,
    );

  const strategyEvidence =
    updateStrategyEvidence(
      existing,
      evidence,
    );

  const responseModeEvidence =
    updateResponseModeEvidence(
      existing,
      evidence,
    );

  const readyForAdvancement =
    masteryEstimate >= 0.8 &&
    confidence >= 0.8 &&
    retentionState?.status ===
      "retained" &&
    transferState?.status ===
      "demonstrated";

  const updatedCompetency:
    LearnerCompetencyState = {
    ...existing,

    masteryEstimate,
    evidenceCount,
    confidence,

    diagnosticState,
    diagnosticConfidence,

    errorPatterns,
    diagnosticHistory,
    misconceptionHistory,
    interventionHistory,
    interventionResponse,
    retentionPerformance,
    transferPerformance,

    strategyEvidence,
    responseModeEvidence,

    retentionState,
    transferState,

    readinessState: {
      readyForAdvancement,
      confidence,
      reasonCode:
        readyForAdvancement
          ? "MASTERY_RETENTION_TRANSFER_CONFIRMED"
          : "MASTERY_RETENTION_TRANSFER_NOT_CONFIRMED",
      evaluatedAt:
        evidence.timestamp,
    },

    masteredAt:
      masteryEstimate >= 0.8 &&
      confidence >= 0.8
        ? existing.masteredAt ??
          evidence.timestamp
        : undefined,

    lastEvidenceAt:
      evidence.timestamp,

    lastUpdated:
      evidence.timestamp,

    stateVersion:
      "state-0.4",
  };

  return {
    ...state,

    competencies:
      state.competencies.map(
        (competency) =>
          competency.competencyId ===
          evidence.competencyId
            ? updatedCompetency
            : competency,
      ),

    stateVersion:
      "state-0.4",

    updatedAt:
      evidence.timestamp,
  };
}

export async function getLearnerState(
  learnerId: string,
  competencyId: string,
): Promise<LearnerState | undefined> {
  return persistenceStore.getLearnerState(
    learnerId,
    competencyId,
  );
}

export async function saveLearnerState(
  state: LearnerState,
): Promise<void> {
  await persistenceStore.saveLearnerState(
    state,
  );
}

export async function updateLearnerState(
  learnerId: string,
  competencyId: string,
  mutator: (
    currentState: LearnerState | undefined,
  ) => Promise<LearnerState> | LearnerState,
): Promise<LearnerState> {
  return persistenceStore.updateLearnerState(
    learnerId,
    competencyId,
    mutator,
  );
}








