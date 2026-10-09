import {
  createInitialLearnerState,
  applyEvidence,
} from "../services/learner-state";

import {
  makeAdaptiveDecision,
} from "../services/adaptive-engine";

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`FAIL: ${message}`);
}

const learnerId = "learner-gate-adaptation";
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

async function main() {
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

  state = applyEvidence(
    state,
    ev("retention-pass", "correct", "retention_check"),
  );

  state = applyEvidence(
    state,
    ev("transfer-fail", "incorrect", "transfer_check"),
  );

  const decision = await makeAdaptiveDecision({
    learnerId,
    sessionId: "session-gate-adaptation",
    learnerState: state,
  });

  console.log({
    action: decision.decision.action,
    reasonCode: decision.decision.reasonCode,
    interventionId: decision.decision.interventionId,
  });

  assert(
    decision.decision.action === "transfer_check",
    "failed transfer must trigger another transfer check",
  );

  assert(
    decision.decision.reasonCode === "TRANSFER_REQUIRED",
    "failed transfer must produce TRANSFER_REQUIRED",
  );

  assert(
    Boolean(decision.decision.interventionId),
    "failed transfer must create a new intervention",
  );

  console.log({
    adaptiveGateResponseTest: "PASS",
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
