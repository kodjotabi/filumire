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

function evidence(
  id: string,
  learnerId: string,
  competencyId: string,
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
  };
}

async function testRetentionTransferFlow(): Promise<void> {
  const learnerId =
    `learner-retention-transfer-flow-${Date.now()}`;
  const competencyId = "competency-test-001";

  console.log({
    test: "Full retention-transfer-advancement flow",
    learnerId,
    competencyId,
  });

  let state = createInitialLearnerState(
    learnerId,
    competencyId,
  );

  // Step 1: Build mastery through practice
  console.log("Step 1: Building mastery...");
  for (let i = 1; i <= 4; i++) {
    state = applyEvidence(
      state,
      evidence(
        `mastery-${i}`,
        learnerId,
        competencyId,
        "correct",
        "practice",
      ),
    );
  }

  await saveLearnerState(state);

  let decision = await makeAdaptiveDecision({
    learnerId,
    sessionId: "session-mastery",
    learnerState: state,
  });

  console.log({
    step: 1,
    action: decision.decision.action,
    reasonCode: decision.decision.reasonCode,
    masteryEstimate:
      state.competencies[0].masteryEstimate,
  });

  assert(
    decision.decision.action === "retention_check",
    `Expected retention_check after mastery, got ${decision.decision.action}`,
  );

  // Step 2: Confirm retention
  console.log("Step 2: Confirming retention...");
  state = applyEvidence(
    state,
    evidence(
      "retention-001",
      learnerId,
      competencyId,
      "correct",
      "retention_check",
    ),
  );

  await saveLearnerState(state);

  decision = await makeAdaptiveDecision({
    learnerId,
    sessionId: "session-retention",
    learnerState: state,
  });

  console.log({
    step: 2,
    action: decision.decision.action,
    reasonCode: decision.decision.reasonCode,
    retentionStatus:
      state.competencies[0].retentionState?.status,
  });

  assert(
    decision.decision.action === "transfer_check",
    `Expected transfer_check after retention, got ${decision.decision.action}`,
  );

  assert(
    state.competencies[0].retentionState?.status ===
      "retained",
    "Retention status should be 'retained'",
  );

  // Step 3: Confirm transfer
  console.log("Step 3: Confirming transfer...");
  state = applyEvidence(
    state,
    evidence(
      "transfer-001",
      learnerId,
      competencyId,
      "correct",
      "transfer_check",
    ),
  );

  await saveLearnerState(state);

  decision = await makeAdaptiveDecision({
    learnerId,
    sessionId: "session-transfer",
    learnerState: state,
  });

  console.log({
    step: 3,
    action: decision.decision.action,
    reasonCode: decision.decision.reasonCode,
    transferStatus:
      state.competencies[0].transferState?.status,
  });

  assert(
    decision.decision.action === "advance",
    `Expected advance after transfer, got ${decision.decision.action}`,
  );

  assert(
    state.competencies[0].transferState?.status ===
      "demonstrated",
    "Transfer status should be 'demonstrated'",
  );

  // Step 4: Verify advancement readiness
  console.log(
    "Step 4: Verifying advancement readiness...",
  );
  const readiness =
    state.competencies[0].readinessState
      ?.readyForAdvancement;

  console.log({
    step: 4,
    readyForAdvancement: readiness,
  });

  assert(
    readiness === true,
    "Competency should be ready for advancement",
  );

  // Step 5: Verify persisted state matches
  const persistedState = await getLearnerState(
    learnerId,
    competencyId,
  );

  assert(
    persistedState?.competencies[0].masteryEstimate ===
      state.competencies[0].masteryEstimate,
    "Persisted mastery estimate mismatch",
  );

  assert(
    persistedState?.competencies[0].retentionState
      ?.status === "retained",
    "Persisted retention state mismatch",
  );

  assert(
    persistedState?.competencies[0].transferState
      ?.status === "demonstrated",
    "Persisted transfer state mismatch",
  );

  console.log({
    test: "Full retention-transfer-advancement flow",
    result: "PASS",
    mastery: state.competencies[0].masteryEstimate,
    retention:
      state.competencies[0].retentionState?.status,
    transfer:
      state.competencies[0].transferState?.status,
    readyForAdvancement: readiness,
  });
}

testRetentionTransferFlow().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
