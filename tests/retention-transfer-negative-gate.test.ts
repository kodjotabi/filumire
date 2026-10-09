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

const learnerId = "learner-negative-gates";
const competencyId = "competency-test-001";

function ev(
  id: string,
  outcome: "correct" | "incorrect",
  type:
    | "practice"
    | "retention_check"
    | "transfer_check",
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
    independence: "independent" as const,
    strength: "strong" as const,
    difficulty: "standard" as const,
    representation:
      id.length % 2 === 0
        ? ("numeric" as const)
        : ("verbal" as const),
  };
}

let state = createInitialLearnerState(
  learnerId,
  competencyId,
);

const history: ReturnType<typeof ev>[] = [];

function apply(
  item: ReturnType<typeof ev>,
): void {
  history.push(item);

  state = applyEvidence(
    state,
    item,
    [...history],
  );
}

/* Establish mastery. */
for (let i = 1; i <= 4; i++) {
  apply(
    ev(
      `mastery-${i}`,
      "correct",
      "practice",
    ),
  );
}

assert(
  state.competencies[0].masteryEstimate >= 0.8,
  "mastery must be reached",
);

/* Retention failure blocks advancement. */
apply(
  ev(
    "retention-fail",
    "incorrect",
    "retention_check",
  ),
);

assert(
  state.competencies[0].retentionState
    ?.status === "not_retained",
  "retention failure must mark not_retained",
);

assert(
  state.competencies[0].readinessState
    ?.readyForAdvancement === false,
  "retention failure must block advancement",
);

/*
 * One later success is insufficient to erase
 * established retention failure.
 */
apply(
  ev(
    "retention-recovery-1",
    "correct",
    "retention_check",
  ),
);

assert(
  state.competencies[0].retentionState
    ?.status !== "retained",
  "one recovery success must not immediately restore retention",
);

/*
 * Further successful retrieval evidence can
 * eventually restore retention confidence.
 */
for (let i = 2; i <= 4; i++) {
  apply(
    ev(
      `retention-recovery-${i}`,
      "correct",
      "retention_check",
    ),
  );
}

assert(
  state.competencies[0].retentionState
    ?.status === "retained",
  "sufficient recovery evidence must restore retention",
);

/* Transfer failure still blocks advancement. */
apply(
  ev(
    "transfer-fail",
    "incorrect",
    "transfer_check",
  ),
);

assert(
  state.competencies[0].transferState
    ?.status === "not_demonstrated",
  "transfer failure must mark not_demonstrated",
);

assert(
  state.competencies[0].readinessState
    ?.readyForAdvancement === false,
  "transfer failure must block advancement",
);

console.log({
  retentionTransferNegativeGateTest:
    "PASS",
  retention:
    state.competencies[0].retentionState
      ?.status,
  transfer:
    state.competencies[0].transferState
      ?.status,
  readyForAdvancement:
    state.competencies[0].readinessState
      ?.readyForAdvancement,
});
