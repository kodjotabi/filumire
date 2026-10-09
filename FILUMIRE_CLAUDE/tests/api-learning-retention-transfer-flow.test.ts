import {
  createInitialLearnerState,
  applyEvidence,
  getLearnerState,
  saveLearnerState,
} from "../services/learner-state";
import {
  makeAdaptiveDecision,
} from "../services/adaptive-engine";

function assert(
  condition: boolean,
  message: string,
): void {
  if (!condition) throw new Error(`FAIL: ${message}`);
}

const learnerId =
  `learner-retention-transfer-flow-${Date.now()}`;
const competencyId = "competency-test-001";

function evidence(
  id: string,
  outcome: "correct" | "incorrect",
  interventionType:
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
    interventionType,
    interventionId: `intervention-${id}`,
    independence: "independent" as const,
    strength: "strong" as const,
    difficulty: "standard" as const,
    representation:
      Number(id.match(/\d+/)?.[0] ?? 1) % 2 === 0
        ? ("numeric" as const)
        : ("verbal" as const),
  };
}

async function testRetentionTransferFlow(): Promise<void> {
  let state =
    createInitialLearnerState(
      learnerId,
      competencyId,
    );

  const history: ReturnType<typeof evidence>[] = [];

  function apply(
    item: ReturnType<typeof evidence>,
  ): void {
    history.push(item);

    state = applyEvidence(
      state,
      item,
      [...history],
    );
  }

  console.log({
    test: "Full retention-transfer-advancement flow",
    learnerId,
    competencyId,
  });

  /* Step 1: Establish mastery. */
  for (let i = 1; i <= 4; i++) {
    apply(
      evidence(
        `mastery-${i}`,
        "correct",
        "practice",
      ),
    );
  }

  await saveLearnerState(state);

  let decision =
    await makeAdaptiveDecision({
      learnerId,
      sessionId: "session-mastery",
      learnerState: state,
    });

  assert(
    decision.decision.action === "retention_check",
    `Expected retention_check after mastery, got ${decision.decision.action}`,
  );

  /*
   * Step 2: Retention requires repeated
   * successful evidence.
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
    "First retention success must remain pending",
  );

  apply(
    evidence(
      "retention-002",
      "correct",
      "retention_check",
    ),
  );

  await saveLearnerState(state);

  assert(
    state.competencies[0].retentionState
      ?.status === "retained",
    "Repeated retention evidence must confirm retention",
  );

  decision =
    await makeAdaptiveDecision({
      learnerId,
      sessionId: "session-retention",
      learnerState: state,
    });

  assert(
    decision.decision.action === "transfer_check",
    `Expected transfer_check after retention, got ${decision.decision.action}`,
  );

  /*
   * Step 3: Transfer also requires repeated
   * successful evidence.
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
    "First transfer success must remain pending",
  );

  apply(
    evidence(
      "transfer-002",
      "correct",
      "transfer_check",
    ),
  );

  await saveLearnerState(state);

  assert(
    state.competencies[0].transferState
      ?.status === "demonstrated",
    "Repeated transfer evidence must demonstrate transfer",
  );

  decision =
    await makeAdaptiveDecision({
      learnerId,
      sessionId: "session-transfer",
      learnerState: state,
    });

  assert(
    decision.decision.action === "advance",
    `Expected advance after verified transfer, got ${decision.decision.action}`,
  );

  assert(
    state.competencies[0].readinessState
      ?.readyForAdvancement === true,
    "Competency should be ready for advancement",
  );

  const persistedState =
    await getLearnerState(
      learnerId,
      competencyId,
    );

  assert(
    persistedState?.competencies[0]
      .masteryEstimate ===
      state.competencies[0].masteryEstimate,
    "Persisted mastery estimate mismatch",
  );

  assert(
    persistedState?.competencies[0]
      .retentionState?.status === "retained",
    "Persisted retention state mismatch",
  );

  assert(
    persistedState?.competencies[0]
      .transferState?.status === "demonstrated",
    "Persisted transfer state mismatch",
  );

  console.log({
    retentionTransferApiFlow: "PASS",
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
}

testRetentionTransferFlow().catch(
  (error) => {
    console.error(error);
    process.exitCode = 1;
  },
);
