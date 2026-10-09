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
  const learnerId = `learner-full-progression-${Date.now()}`;
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

  /*
   * Mastery is not enough to advance.
   */
  for (let i = 1; i <= 4; i++) {
    state = applyEvidence(state, evidence(`practice-${i}`, learnerId, competencyId, "correct", "practice"));
  }

  const practiceDecision = await decide("practice");

  assert(
    practiceDecision.decision.action === "retention_check",
    "mastery must transition to retention_check",
  );

  /*
   * Retention is not enough to advance: retention checks continue
   * until retention is confirmed, then transfer is required.
   */
  let decision = practiceDecision;
  let retentionChecks = 0;

  while (decision.decision.action === "retention_check" && retentionChecks < 5) {
    retentionChecks += 1;
    state = applyEvidence(state, evidence(`retention-00${retentionChecks}`, learnerId, competencyId, "correct", "retention_check"));
    decision = await decide(`retention-${retentionChecks}`);
  }

  const retentionDecision = decision;

  assert(
    state.competencies[0].retentionState?.status === "retained",
    "retention must be confirmed before moving on",
  );

  assert(
    retentionDecision.decision.action === "transfer_check",
    "retained mastery must transition to transfer_check",
  );

  /*
   * Transfer confirmation is required before advancement.
   */
  let transferChecks = 0;

  while (decision.decision.action === "transfer_check" && transferChecks < 5) {
    transferChecks += 1;
    state = applyEvidence(state, evidence(`transfer-00${transferChecks}`, learnerId, competencyId, "correct", "transfer_check"));
    decision = await decide(`transfer-${transferChecks}`);
  }

  const finalDecision = decision;

  assert(
    state.competencies[0].transferState?.status === "demonstrated",
    "transfer must be demonstrated before advancing",
  );

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
    retentionChecks,
    transferChecks,
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
