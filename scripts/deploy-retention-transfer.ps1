$ErrorActionPreference = "Stop"

$Root = "C:\Users\tabi\Desktop\filumire\FILUMIRE_CORE"

New-Item -ItemType Directory -Force "$Root\services\retention-transfer" | Out-Null
New-Item -ItemType Directory -Force "$Root\tests" | Out-Null

# ============================================================
# services/retention-transfer/index.ts
# ============================================================

@'
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
'@ | Set-Content `
  "$Root\services\retention-transfer\index.ts" `
  -Encoding UTF8

# ============================================================
# tests/retention-transfer.test.ts
# ============================================================

@'
import {
  createInitialLearnerState,
} from "../services/learner-state";

import {
  createIntervention,
} from "../services/intervention-store";

import {
  recordRetentionCheck,
  recordTransferCheck,
} from "../services/retention-transfer";

import {
  saveLearnerState,
} from "../services/learner-state";

function assert(
  condition: boolean,
  message: string,
): void {
  if (!condition) {
    throw new Error(
      `FAIL: ${message}`,
    );
  }
}

const learnerId =
  "learner-retention-transfer";

const competencyId =
  "competency-retention-transfer";

const sessionId =
  "session-retention-transfer";

let state =
  createInitialLearnerState(
    learnerId,
    competencyId,
  );

await saveLearnerState(
  state,
);

const retentionIntervention =
  await createIntervention({
    learnerId,
    competencyId,
    sessionId,
    decisionId:
      "decision-retention-001",
    type:
      "retention_check",
  });

const retention =
  await recordRetentionCheck({
    learnerId,
    competencyId,
    evidenceId:
      "evidence-retention-001",
    outcome:
      "correct",
  });

console.log({
  test:
    "retention check",
  interventionId:
    retentionIntervention.interventionId,
  status:
    retention.status,
  confidence:
    retention.confidence,
});

assert(
  retention.status ===
    "retained",
  "correct retention evidence must establish retention",
);

assert(
  retention.confidence ===
    1,
  "correct retention evidence must have full confidence",
);

state =
  createInitialLearnerState(
    learnerId,
    competencyId,
  );

await saveLearnerState(
  state,
);

const transferIntervention =
  await createIntervention({
    learnerId,
    competencyId,
    sessionId,
    decisionId:
      "decision-transfer-001",
    type:
      "transfer_check",
  });

const transfer =
  await recordTransferCheck({
    learnerId,
    competencyId,
    evidenceId:
      "evidence-transfer-001",
    outcome:
      "correct",
  });

console.log({
  test:
    "transfer check",
  interventionId:
    transferIntervention.interventionId,
  status:
    transfer.status,
  confidence:
    transfer.confidence,
});

assert(
  transfer.status ===
    "demonstrated",
  "correct transfer evidence must establish demonstrated transfer",
);

assert(
  transfer.confidence ===
    1,
  "correct transfer evidence must have full confidence",
);

console.log({
  retentionTransferTest:
    "PASS",
});
'@ | Set-Content `
  "$Root\tests\retention-transfer.test.ts" `
  -Encoding UTF8

Write-Host ""
Write-Host "Retention and transfer foundation installed."
Write-Host ""
Write-Host "Run:"
Write-Host "npx tsx --env-file=.env.local ./tests/retention-transfer.test.ts"