import type {
  EvidenceOutcome,
  LearnerState,
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

  const updated:
    LearnerState = {
    ...state,

    competencies:
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
                  "state-0.3",
              }
            : competency,
      ),

    updatedAt:
      timestamp,

    stateVersion:
      "state-0.3",
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

  const updated:
    LearnerState = {
    ...state,

    competencies:
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
                  "state-0.3",
              }
            : competency,
      ),

    updatedAt:
      timestamp,

    stateVersion:
      "state-0.3",
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

  const result =
    await evaluateInterventionFromEvidence(
      interventionId,
      evidence,
    );

  return result;
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

  const result =
    await evaluateInterventionFromEvidence(
      interventionId,
      evidence,
    );

  return result;
}
