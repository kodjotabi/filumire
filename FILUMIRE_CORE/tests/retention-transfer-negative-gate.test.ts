import {
  createInitialLearnerState,
  applyEvidence,
} from "../services/learner-state";

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`FAIL: ${message}`);
}

const learnerId = "learner-negative-gates";
const competencyId = "competency-test-001";

function ev(
  id: string,
  outcome: "correct" | "incorrect",
  type: "practice" | "retention_check" | "transfer_check",
) {
  return {
    id,
    learnerId,
    competencyId,
    source: "assessment" as const,
    outcome,
    timestamp: new Date().toISOString(),
    assessmentItemId: id,
    sessionId: id,
    policyVersion: "test",
    interventionType: type,
    interventionId: `intervention-${id}`,
  };
}

/* Mastery */
let state = createInitialLearnerState(
  learnerId,
  competencyId,
);

for (let i = 1; i <= 4; i++) {
  state = applyEvidence(
    state,
    ev(`mastery-${i}`, "correct", "practice"),
  );
}

assert(
  state.competencies[0].masteryEstimate >= 0.8,
  "mastery must be reached",
);

/* Retention failure must block advancement. */
state = applyEvidence(
  state,
  ev("retention-fail", "incorrect", "retention_check"),
);

assert(
  state.competencies[0].retentionState?.status ===
    "not_retained",
  "retention failure must mark not_retained",
);

assert(
  state.competencies[0].readinessState
    ?.readyForAdvancement === false,
  "retention failure must block advancement",
);

/* Successful retention, but transfer failure must still block advancement. */
state = applyEvidence(
  state,
  ev("retention-pass", "correct", "retention_check"),
);

assert(
  state.competencies[0].retentionState?.status ===
    "retained",
  "successful retention must restore retained state",
);

state = applyEvidence(
  state,
  ev("transfer-fail", "incorrect", "transfer_check"),
);

assert(
  state.competencies[0].transferState?.status ===
    "not_demonstrated",
  "transfer failure must mark not_demonstrated",
);

assert(
  state.competencies[0].readinessState
    ?.readyForAdvancement === false,
  "transfer failure must block advancement",
);

console.log({
  retentionTransferNegativeGateTest: "PASS",
  retention:
    state.competencies[0].retentionState?.status,
  transfer:
    state.competencies[0].transferState?.status,
  readyForAdvancement:
    state.competencies[0].readinessState
      ?.readyForAdvancement,
});
