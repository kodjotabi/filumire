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

const learnerId =
  "learner-retention-transfer";

const competencyId =
  "competency-test-001";

let state =
  createInitialLearnerState(
    learnerId,
    competencyId,
  );

const history: any[] = [];

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
    independence: "independent",
    strength: "strong",
    difficulty: "standard",
    representation:
      Number(id.match(/\d+/)?.[0] ?? 1) % 2 === 0
        ? "numeric"
        : "verbal",
  };
}

function apply(item: any): void {
  history.push(item);

  state = applyEvidence(
    state,
    item,
    [...history],
  );
}

/*
 * 1. Build mastery.
 */
for (let i = 1; i <= 4; i++) {
  apply(
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
 * 2. Verify retention.
 * One success remains pending.
 */
apply(
  evidence(
    "retention-001",
    "correct",
    "retention_check",
  ),
);

assert(
  state.competencies[0].retentionState
    ?.status === "pending",
  "one retention success must remain pending",
);

assert(
  state.competencies[0].readinessState
    ?.readyForAdvancement === false,
  "pending retention must block advancement",
);

apply(
  evidence(
    "retention-002",
    "correct",
    "retention_check",
  ),
);

assert(
  state.competencies[0].retentionState
    ?.status === "retained",
  "repeated successful retention evidence must confirm retention",
);

assert(
  state.competencies[0].readinessState
    ?.readyForAdvancement === false,
  "retention without transfer must not permit advancement",
);

/*
 * 3. Verify transfer.
 * One success remains pending.
 */
apply(
  evidence(
    "transfer-001",
    "correct",
    "transfer_check",
  ),
);

assert(
  state.competencies[0].transferState
    ?.status === "pending",
  "one transfer success must remain pending",
);

assert(
  state.competencies[0].readinessState
    ?.readyForAdvancement === false,
  "pending transfer must block advancement",
);

apply(
  evidence(
    "transfer-002",
    "correct",
    "transfer_check",
  ),
);

assert(
  state.competencies[0].transferState
    ?.status === "demonstrated",
  "repeated successful transfer evidence must demonstrate transfer",
);

assert(
  state.competencies[0].readinessState
    ?.readyForAdvancement === true,
  "mastery + verified retention + verified transfer must permit advancement",
);

console.log({
  retentionTransferAdvancementTest:
    "PASS",
  mastery:
    state.competencies[0].masteryEstimate,
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

