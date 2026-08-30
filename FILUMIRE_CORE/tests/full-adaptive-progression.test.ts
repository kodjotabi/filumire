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

function evidence(
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
  const learnerId = "learner-full-progression";
  const competencyId = "competency-test-001";

  let state = createInitialLearnerState(
    learnerId,
    competencyId,
  );

  /*
   * Mastery is not enough to advance.
   */
  for (let i = 1; i <= 4; i++) {
    state = applyEvidence(
      state,
      evidence(
        `practice-${i}`,
        learnerId,
        competencyId,
        "correct",
        "practice",
      ),
    );
  }

  const practiceDecision =
    await makeAdaptiveDecision({
      learnerId,
      sessionId: "session-practice",
      learnerState: state,
    });

  assert(
    practiceDecision.decision.action === "retention_check",
    "mastery must transition to retention_check",
  );

  /*
   * Retention is not enough to advance.
   */
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

  const retentionDecision =
    await makeAdaptiveDecision({
      learnerId,
      sessionId: "session-retention",
      learnerState: state,
    });

  assert(
    retentionDecision.decision.action === "transfer_check",
    "retained mastery must transition to transfer_check",
  );

  /*
   * Transfer confirmation is required before advancement.
   */
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

  const finalDecision =
    await makeAdaptiveDecision({
      learnerId,
      sessionId: "session-advance",
      learnerState: state,
    });

  assert(
    finalDecision.decision.action === "advance",
    "confirmed mastery, retention, and transfer must advance",
  );

  assert(
    finalDecision.decision.reasonCode ===
      "MASTERY_RETENTION_TRANSFER_CONFIRMED",
    "advancement must use the confirmed progression reason",
  );

  console.log({
    fullAdaptiveProgressionTest: "PASS",
    progression: [
      practiceDecision.decision.action,
      retentionDecision.decision.action,
      finalDecision.decision.action,
    ],
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
