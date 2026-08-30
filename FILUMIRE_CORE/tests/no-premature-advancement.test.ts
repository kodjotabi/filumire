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

function ev(
  id: string,
  learnerId: string,
  competencyId: string,
  outcome: "correct" | "incorrect",
  interventionType: "practice" | "retention_check" | "transfer_check",
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

async function main(): Promise<void> {
  const learnerId = "learner-no-premature-advance";
  const competencyId = "competency-test-001";

  let state = createInitialLearnerState(
    learnerId,
    competencyId,
  );

  for (let i = 1; i <= 4; i++) {
    state = applyEvidence(
      state,
      ev(
        `practice-${i}`,
        learnerId,
        competencyId,
        "correct",
        "practice",
      ),
    );
  }

  let decision = await makeAdaptiveDecision({
    learnerId,
    sessionId: "session-retention",
    learnerState: state,
  });

  assert(
    decision.decision.action === "retention_check",
    "mastery must require retention verification",
  );

  state = applyEvidence(
    state,
    ev(
      "retention-001",
      learnerId,
      competencyId,
      "incorrect",
      "retention_check",
    ),
  );

  decision = await makeAdaptiveDecision({
    learnerId,
    sessionId: "session-retention-failure",
    learnerState: state,
  });

  assert(
    decision.decision.action === "retention_check",
    "failed retention must require another retention check",
  );

  assert(
    decision.decision.action !== "advance",
    "failed retention must never advance",
  );

  state = applyEvidence(
    state,
    ev(
      "retention-002",
      learnerId,
      competencyId,
      "correct",
      "retention_check",
    ),
  );

  decision = await makeAdaptiveDecision({
    learnerId,
    sessionId: "session-transfer",
    learnerState: state,
  });

  assert(
    decision.decision.action === "transfer_check",
    "retained mastery must require transfer verification",
  );

  console.log({
    noPrematureAdvancementTest: "PASS",
    failedRetentionAction: "retention_check",
    recoveredRetentionAction: decision.decision.action,
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
