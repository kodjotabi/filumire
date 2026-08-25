import type {
  DiagnosticState,
  LearningEvidence,
  LearnerCompetencyState,
  LearnerInterventionRecord,
  LearnerState,
  InterventionOutcome,
  LearningLanguage,
} from "../../packages/domain";

import {
  persistenceStore,
} from "../persistence-provider";

function inferDiagnosticState(
  evidence: LearningEvidence,
  existing: LearnerCompetencyState,
): DiagnosticState {
  if (
    evidence.diagnosticState &&
    evidence.diagnosticState !== "unknown"
  ) {
    return evidence.diagnosticState;
  }

  if (evidence.outcome === "correct") {
    if (existing.evidenceCount >= 3) {
      return "probable_mastery";
    }

    return existing.diagnosticState;
  }

  if (evidence.outcome === "partial") {
    return "conceptual_misunderstanding";
  }

  if (evidence.outcome === "incorrect") {
    if (evidence.errorPattern) {
      return "misconception";
    }

    if (existing.evidenceCount >= 2) {
      return "persistent_difficulty";
    }

    return "insufficient_evidence";
  }

  return existing.diagnosticState;
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

function inferInterventionOutcome(
  evidence: LearningEvidence,
): InterventionOutcome | undefined {
  if (evidence.outcome === "correct") {
    return "effective";
  }

  if (evidence.outcome === "incorrect") {
    return "ineffective";
  }

  if (evidence.outcome === "partial") {
    return "partial_recovery";
  }

  return undefined;
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
      evidence,
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

        diagnosticState:
          "unknown",

        diagnosticConfidence: 0,

        errorPatterns: [],

        interventionHistory: [],

        prerequisiteState: {},

        retentionState: {
          status:
            "not_tested",

          confidence: 0,

          evidenceIds: [],
        },

        transferState: {
          status:
            "not_tested",

          confidence: 0,

          evidenceIds: [],
        },

        readinessState: {
          readyForAdvancement:
            false,

          confidence: 0,

          evaluatedAt:
            now,
        },

        lastUpdated:
          now,

        stateVersion:
          "state-0.3",
      },
    ],

    stateVersion:
      "state-0.3",

    updatedAt:
      now,
  };
}

export function applyEvidence(
  state: LearnerState,
  evidence: LearningEvidence,
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

  const outcomeScore =
    evidence.outcome === "correct"
      ? 1
      : evidence.outcome === "partial"
        ? 0.5
        : evidence.outcome === "incorrect"
          ? 0
          : existing.masteryEstimate;

  const evidenceCount =
    existing.evidenceCount + 1;

  const masteryEstimate =
    (
      existing.masteryEstimate *
        existing.evidenceCount +
      outcomeScore
    ) /
    evidenceCount;

  const confidence =
    Math.min(
      evidenceCount / 5,
      1,
    );

  const diagnosticState =
    inferDiagnosticState(
      evidence,
      existing,
    );

  const diagnosticConfidence =
    evidence.diagnosticConfidence ??
    confidence;

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

  const readyForAdvancement =
    masteryEstimate >= 0.8 &&
    confidence >= 0.8;

  const updatedCompetency:
    LearnerCompetencyState = {
    ...existing,

    masteryEstimate,

    evidenceCount,

    confidence,

    diagnosticState,

    diagnosticConfidence,

    errorPatterns,

    interventionHistory,

    readinessState: {
      readyForAdvancement,

      confidence,

      reasonCode:
        readyForAdvancement
          ? "MASTERY_THRESHOLD_REACHED"
          : "MASTERY_THRESHOLD_NOT_REACHED",

      evaluatedAt:
        evidence.timestamp,
    },

    lastUpdated:
      evidence.timestamp,

    stateVersion:
      "state-0.3",
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
      "state-0.3",

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