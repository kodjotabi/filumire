import {
  createInitialLearnerState,
  applyEvidence,
} from "../services/learner-state";

function assert(
  condition: boolean,
  message: string,
): void {
  if (!condition) {
    throw new Error(`FAIL: ${message}`);
  }
}

const learnerId = "learner-retention-transfer";
const competencyId = "competency-test-001";

let state = createInitialLearnerState(
  learnerId,
  competencyId,
);

function evidence(
  id: string,
  outcome: "correct" | "incorrect",
  interventionType:
    | "practice"
    | "retention_check"
    | "transfer_check",
): any {
  return {
    id,
    learnerId,
    competencyId,
    source: "assessment",
    outcome,
    timestamp: new Date().toISOString(),
    assessmentItemId: id,
    sessionId: id,
    policyVersion: "test",
    interventionType,
    interventionId: `intervention-${id}`,
  };
}

/*
 * 1. Build mastery.
 */
for (let i = 1; i <= 4; i++) {
  state = applyEvidence(
    state,
    evidence(
      `mastery-${i}`,
      "correct",
      "practice",
    ),
  );
}

assert(
  state.competencies[0].masteryEstimate >= 0.8,
  "mastery threshold must be reached",
);

assert(
  state.competencies[0].readinessState
    ?.readyForAdvancement === false,
  "mastery alone must not permit advancement",
);

/*
 * 2. Confirm retention.
 */
state = applyEvidence(
  state,
  evidence(
    "retention-001",
    "correct",
    "retention_check",
  ),
);

assert(
  state.competencies[0].retentionState
    ?.status === "retained",
  "correct retention evidence must mark retention as retained",
);

assert(
  state.competencies[0].readinessState
    ?.readyForAdvancement === false,
  "retention alone must not permit advancement",
);

/*
 * 3. Confirm transfer.
 */
state = applyEvidence(
  state,
  evidence(
    "transfer-001",
    "correct",
    "transfer_check",
  ),
);

assert(
  state.competencies[0].transferState
    ?.status === "demonstrated",
  "correct transfer evidence must demonstrate transfer",
);

assert(
  state.competencies[0].readinessState
    ?.readyForAdvancement === true,
  "mastery + retention + transfer must permit advancement",
);

console.log({
  retentionTransferAdvancementTest: "PASS",
  mastery:
    state.competencies[0].masteryEstimate,
  retention:
    state.competencies[0].retentionState?.status,
  transfer:
    state.competencies[0].transferState?.status,
  readyForAdvancement:
    state.competencies[0].readinessState
      ?.readyForAdvancement,
});
