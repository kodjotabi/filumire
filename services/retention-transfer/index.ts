import type {
  EvidenceOutcome,
  LearnerState,
  LearnerCompetencyState,
} from "../../packages/domain";

import {
  getIntervention,
  evaluateInterventionFromEvidence,
} from "../intervention-store";

import {
  getLearnerState,
  saveLearnerState,
} from "../learner-state";

export type RetentionCheckResult = {
  competencyId: string;
  status:
    | "retained"
    | "not_retained";
  confidence: number;
  evidenceId: string;
};

export type TransferCheckResult = {
  competencyId: string;
  status:
    | "demonstrated"
    | "not_demonstrated";
  confidence: number;
  evidenceId: string;
};

function confidenceFromOutcome(
  outcome: EvidenceOutcome,
): number {
  if (outcome === "correct") {
    return 1;
  }

  if (outcome === "partial") {
    return 0.5;
  }

  return 0;
}

function calculateReadiness(
  competency: LearnerCompetencyState,
) {
  const ready =
    competency.masteryEstimate >= 0.8 &&
    competency.confidence >= 0.8 &&
    competency.retentionState?.status ===
      "retained" &&
    competency.retentionState?.confidence >=
      0.8 &&
    competency.transferState?.status ===
      "demonstrated" &&
    competency.transferState?.confidence >=
      0.8;

  return {
    readyForAdvancement: ready,
    confidence: ready ? 1 : 0,
    reasonCode: ready
      ? "MASTERY_RETENTION_TRANSFER_CONFIRMED"
      : "MASTERY_RETENTION_TRANSFER_NOT_CONFIRMED",
    evaluatedAt:
      new Date().toISOString(),
  };
}

export async function recordRetentionCheck(
  input: {
    learnerId: string;
    competencyId: string;
    evidenceId: string;
    outcome: EvidenceOutcome;
  },
): Promise<RetentionCheckResult> {
  const state =
    await getLearnerState(
      input.learnerId,
      input.competencyId,
    );

  if (!state) {
    throw new Error(
      "Learner state not found for retention check.",
    );
  }

  const retained =
    input.outcome === "correct";

  const timestamp =
    new Date().toISOString();

  const confidence =
    confidenceFromOutcome(
      input.outcome,
    );

  const updatedCompetencies:
    LearnerCompetencyState[] =
    state.competencies.map(
      (competency) =>
        competency.competencyId ===
        input.competencyId
          ? {
              ...competency,

              retentionState: {
                status:
                  retained
                    ? "retained"
                    : "not_retained",

                lastCheckedAt:
                  timestamp,

                confidence,

                evidenceIds: [
                  ...(competency
                    .retentionState
                    ?.evidenceIds ??
                    []),

                  input.evidenceId,
                ],
              },

              lastUpdated:
                timestamp,

              stateVersion:
                "state-0.4",
            }
          : competency,
    );

  const updatedCompetency =
    updatedCompetencies.find(
      (competency) =>
        competency.competencyId ===
        input.competencyId,
    );

  if (!updatedCompetency) {
    throw new Error(
      "Competency not found after retention update.",
    );
  }

  const readinessState =
    calculateReadiness(
      updatedCompetency,
    );

  const finalCompetencies:
    LearnerCompetencyState[] =
    updatedCompetencies.map(
      (competency) =>
        competency.competencyId ===
        input.competencyId
          ? {
              ...competency,
              readinessState,
            }
          : competency,
    );

  const updated: LearnerState = {
    ...state,

    competencies:
      finalCompetencies,

    updatedAt:
      timestamp,

    stateVersion:
      "state-0.4",
  };

  await saveLearnerState(
    updated,
  );

  return {
    competencyId:
      input.competencyId,

    status:
      retained
        ? "retained"
        : "not_retained",

    confidence,

    evidenceId:
      input.evidenceId,
  };
}

export async function recordTransferCheck(
  input: {
    learnerId: string;
    competencyId: string;
    evidenceId: string;
    outcome: EvidenceOutcome;
  },
): Promise<TransferCheckResult> {
  const state =
    await getLearnerState(
      input.learnerId,
      input.competencyId,
    );

  if (!state) {
    throw new Error(
      "Learner state not found for transfer check.",
    );
  }

  const demonstrated =
    input.outcome === "correct";

  const timestamp =
    new Date().toISOString();

  const confidence =
    confidenceFromOutcome(
      input.outcome,
    );

  const updatedCompetencies:
    LearnerCompetencyState[] =
    state.competencies.map(
      (competency) =>
        competency.competencyId ===
        input.competencyId
          ? {
              ...competency,

              transferState: {
                status:
                  demonstrated
                    ? "demonstrated"
                    : "not_demonstrated",

                lastCheckedAt:
                  timestamp,

                confidence,

                evidenceIds: [
                  ...(competency
                    .transferState
                    ?.evidenceIds ??
                    []),

                  input.evidenceId,
                ],
              },

              lastUpdated:
                timestamp,

              stateVersion:
                "state-0.4",
            }
          : competency,
    );

  const updatedCompetency =
    updatedCompetencies.find(
      (competency) =>
        competency.competencyId ===
        input.competencyId,
    );

  if (!updatedCompetency) {
    throw new Error(
      "Competency not found after transfer update.",
    );
  }

  const readinessState =
    calculateReadiness(
      updatedCompetency,
    );

  const finalCompetencies:
    LearnerCompetencyState[] =
    updatedCompetencies.map(
      (competency) =>
        competency.competencyId ===
        input.competencyId
          ? {
              ...competency,
              readinessState,
            }
          : competency,
    );

  const updated: LearnerState = {
    ...state,

    competencies:
      finalCompetencies,

    updatedAt:
      timestamp,

    stateVersion:
      "state-0.4",
  };

  await saveLearnerState(
    updated,
  );

  return {
    competencyId:
      input.competencyId,

    status:
      demonstrated
        ? "demonstrated"
        : "not_demonstrated",

    confidence,

    evidenceId:
      input.evidenceId,
  };
}

export async function evaluateRetentionIntervention(
  interventionId: string,
  evidence: {
    id: string;
    outcome: EvidenceOutcome;
  },
) {
  const intervention =
    await getIntervention(
      interventionId,
    );

  if (!intervention) {
    throw new Error(
      `Intervention not found: ${interventionId}`,
    );
  }

  return evaluateInterventionFromEvidence(
    interventionId,
    evidence,
  );
}

export async function evaluateTransferIntervention(
  interventionId: string,
  evidence: {
    id: string;
    outcome: EvidenceOutcome;
  },
) {
  const intervention =
    await getIntervention(
      interventionId,
    );

  if (!intervention) {
    throw new Error(
      `Intervention not found: ${interventionId}`,
    );
  }

  return evaluateInterventionFromEvidence(
    interventionId,
    evidence,
  );
}