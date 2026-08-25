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
