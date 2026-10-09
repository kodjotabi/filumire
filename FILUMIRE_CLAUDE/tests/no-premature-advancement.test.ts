import {
  createInitialLearnerState,
  applyEvidence as applyEvidenceWithHistory,
} from "../services/learner-state";

import type { LearningEvidence } from "../packages/domain";
import { seedContent } from "../services/content-store/seed";

/*
 * Tranche 4C: modernised. Evidence is applied with the learner's
 * accumulated history (as POST /api/learning does) and carries the
 * Evidence V1 semantics mastery-v2 needs: independent, strong, four
 * DIFFERENT items, varied representation. Authored content is
 * seeded so every question action has a question.
 */
seedContent();

const history: LearningEvidence[] = [];

function applyEvidence(
  state: Parameters<typeof applyEvidenceWithHistory>[0],
  item: LearningEvidence,
) {
  history.push(item);
  return applyEvidenceWithHistory(state, item, [...history]);
}

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
    purpose:
      interventionType === "retention_check"
        ? ("retention" as const)
        : interventionType === "transfer_check"
          ? ("transfer" as const)
          : ("mastery" as const),
    independence: "independent" as const,
    strength: "strong" as const,
    difficulty: "standard" as const,
    representation: (Number(id.replace(/D/g, "")) % 2 === 0 ? "numeric" : "verbal") as "numeric" | "verbal",
  } as LearningEvidence;
}

async function main(): Promise<void> {
  const learnerId = `learner-no-premature-advance-${Date.now()}`;
  const competencyId = "competency-test-001";

  let state = createInitialLearnerState(
    learnerId,
    competencyId,
  );

  const decide = async (tag: string) =>
    makeAdaptiveDecision({
      learnerId,
      sessionId: `session-${tag}`,
      learnerState: state,
    });

  for (let i = 1; i <= 4; i++) {
    state = applyEvidence(state, ev(`practice-${i}`, learnerId, competencyId, "correct", "practice"));
  }

  let decision = await decide("retention");

  assert(
    decision.decision.action === "retention_check",
    "mastery must require retention verification",
  );

  state = applyEvidence(state, ev("retention-001", learnerId, competencyId, "incorrect", "retention_check"));

  decision = await decide("retention-failure");

  /* A failed retention check is reviewed, never advanced. */
  assert(
    decision.decision.action === "practice" ||
      decision.decision.action === "retention_check",
    `failed retention must lead to review or another retention check (${decision.decision.action})`,
  );

  assert(
    decision.decision.action !== "advance" &&
      decision.decision.action !== "transfer_check",
    "failed retention must never advance or skip to transfer",
  );

  const failedRetentionAction = decision.decision.action;

  /* Retention must be re-verified before transfer is even asked. */
  let retentionChecksAfterFailure = 0;

  for (let i = 2; i <= 8 && decision.decision.action !== "transfer_check"; i++) {
    assert(decision.decision.action !== "advance", "no advance while retention is unconfirmed");
    state = applyEvidence(state, ev(`retention-00${i}`, learnerId, competencyId, "correct", "retention_check"));
    retentionChecksAfterFailure += 1;
    decision = await decide(`retention-${i}`);
  }

  assert(
    retentionChecksAfterFailure >= 2,
    "one correct answer after a failed retention check is not enough",
  );

  assert(
    state.competencies[0].retentionState?.status === "retained",
    "transfer is asked only once retention is confirmed",
  );

  assert(
    decision.decision.action === "transfer_check",
    "retained mastery must require transfer verification",
  );

  console.log({
    noPrematureAdvancementTest: "PASS",
    failedRetentionAction,
    retentionChecksAfterFailure,
    recoveredRetentionAction: decision.decision.action,
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
