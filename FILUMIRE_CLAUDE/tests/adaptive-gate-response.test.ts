import type { LearningEvidence } from "../packages/domain";
import { createInitialLearnerState, applyEvidence } from "../services/learner-state";
import { makeAdaptiveDecision } from "../services/adaptive-engine";
import { seedContent } from "../services/content-store/seed";

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`FAIL: ${message}`);
}

const learnerId = "learner-gate-adaptation";
const competencyId = "competency-test-001";

function evidence(id: string, outcome: "correct" | "incorrect",
  interventionType: "practice" | "retention_check" | "transfer_check",
): LearningEvidence {
  return {
    id, learnerId, competencyId, source: "assessment", outcome,
    timestamp: new Date().toISOString(), assessmentItemId: id, sessionId: id,
    policyVersion: "test", interventionType, interventionId: `intervention-${id}`,
    independence: "independent", strength: "strong", difficulty: "standard",
    representation: Number(id.match(/\d+/)?.[0] ?? 1) % 2 === 0 ? "numeric" : "verbal",
  };
}

async function main(): Promise<void> {
  seedContent();
  let state = createInitialLearnerState(learnerId, competencyId);
  const history: LearningEvidence[] = [];
  function apply(item: LearningEvidence): void {
    history.push(item);
    state = applyEvidence(state, item, [...history]);
  }
  for (let i = 1; i <= 5; i++) apply(evidence(`mastery-${i}`, "correct", "practice"));
  apply(evidence("retention-pass-1", "correct", "retention_check"));
  apply(evidence("retention-pass-2", "correct", "retention_check"));
  assert(state.competencies[0].masteryEstimate >= 0.8, "fixture must establish mastery estimate");
  assert(state.competencies[0].confidence >= 0.8, "fixture must establish confidence");
  assert(state.competencies[0].retentionState?.status === "retained", "fixture must verify retention");

  apply(evidence("transfer-fail", "incorrect", "transfer_check"));
  assert(state.competencies[0].transferState?.status === "not_demonstrated", "failed transfer must remain unverified");
  assert(state.competencies[0].readinessState?.readyForAdvancement === false, "failed transfer must block advancement");

  const { decision } = await makeAdaptiveDecision({
    learnerId, sessionId: "session-gate-adaptation", learnerState: state,
  });
  // The established policy teaches through practice after failed transfer;
  // another transfer check is appropriate only after recovery.
  assert(decision.action === "practice", "failed transfer must trigger corrective practice");
  assert(decision.reasonCode === "TRANSFER_FAILURE_PRACTICE", "failed transfer must use the established recovery reason");
  assert(Boolean(decision.interventionId), "failed transfer must create a new intervention");
  console.log({ adaptiveGateResponseTest: "PASS" });
}
main().catch(error => { console.error(error); process.exitCode = 1; });
