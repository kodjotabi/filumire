import assert from "node:assert/strict";
import type { LearnerCompetencyState } from "../packages/domain";
import {
  getAllCompetencies,
  getNextCompetency,
} from "../packages/curriculum";
import { createInitialLearnerState } from "../services/learner-state";
import { makeAdaptiveDecision } from "../services/adaptive-engine";
import { seedContent } from "../services/content-store/seed";

/* Tranche 4B step 3: no question available is content exhaustion, so load authored content. */
seedContent();

const HOUR = 3600 * 1000;
const DAY = 24 * HOUR;
const T0 = new Date("2026-10-01T09:00:00.000Z").getTime();
const iso = (ms: number) => new Date(ms).toISOString();

const first = getAllCompetencies().find(
  (c) => (c.prerequisiteCompetencyIds ?? []).length === 0 && getNextCompetency(c.id),
);
assert.ok(first, "the curriculum must have a competency with a next competency");
const A = first.id;
const B = getNextCompetency(A)!.id;

const learnerId = "time-aware-engine-test";

function state(id: string, o: Partial<LearnerCompetencyState> = {}): LearnerCompetencyState {
  const base = createInitialLearnerState(learnerId, id).competencies[0];
  return { ...base, ...o };
}

function acquiredA(): LearnerCompetencyState {
  return state(A, {
    masteryEstimate: 0.95,
    confidence: 0.9,
    evidenceCount: 6,
    diagnosticState: "probable_mastery",
    diagnosticConfidence: 0.9,
    masteredAt: iso(T0),
    lastUpdated: iso(T0),
    transferState: { status: "demonstrated", confidence: 0.9 } as LearnerCompetencyState["transferState"],
  });
}

function learnerStateOf(competencies: LearnerCompetencyState[]) {
  const base = createInitialLearnerState(learnerId, A);
  return { ...base, competencies };
}

async function decide(
  competencies: LearnerCompetencyState[],
  options: { timeAwareRetention: boolean; now: Date },
) {
  // Each scenario is independent; unanswered deliveries from another scenario
  // must not masquerade as this learner's active assessment.
  const isolatedId = `${learnerId}-${crypto.randomUUID()}`;
  const isolatedState = { ...learnerStateOf(competencies), learnerId: isolatedId,
    competencies: competencies.map(item => ({ ...item, learnerId: isolatedId })) };
  return makeAdaptiveDecision(
    { learnerId: isolatedId, sessionId: "s-" + Math.random(), learnerState: isolatedState },
    options,
  );
}

async function main() {
  // Legacy behaviour is unchanged when the feature is off.
  {
    const r = await decide([acquiredA()], { timeAwareRetention: false, now: new Date(T0 + 2 * HOUR) });
    assert.equal(r.decision.action, "retention_check");
    assert.equal(r.decision.competencyId, A);
  }

  // Feature on, just acquired: move on to the next competency.
  {
    const r = await decide([acquiredA()], { timeAwareRetention: true, now: new Date(T0 + 2 * HOUR) });
    assert.equal(r.decision.action, "advance");
    assert.equal(r.decision.reasonCode, "ACQUIRED_RETENTION_PENDING_MOVE_ON");
    assert.equal(r.decision.competencyId, B);
  }

  // Feature on, a day later with nothing else started: retention is testable.
  {
    const r = await decide([acquiredA()], { timeAwareRetention: true, now: new Date(T0 + 25 * HOUR) });
    assert.equal(r.decision.action, "retention_check");
    assert.equal(r.decision.competencyId, A);
  }

  // Moved on to B; two days later the learner comes back to A.
  {
    const r = await decide([state(B), acquiredA()], { timeAwareRetention: true, now: new Date(T0 + 2 * DAY) });
    assert.equal(r.decision.action, "retention_check");
    assert.equal(r.decision.reasonCode, "RETENTION_REVIEW_DUE");
    assert.equal(r.decision.competencyId, A);
    const contentCompetency = (r.content as { competencyId?: string } | undefined)?.competencyId;
    if (contentCompetency) assert.equal(contentCompetency, A, "review content must belong to the reviewed competency");
  }

  // Moved on to B; only hours later the learner stays on B.
  {
    const r = await decide([state(B), acquiredA()], { timeAwareRetention: true, now: new Date(T0 + 3 * HOUR) });
    assert.notEqual(r.decision.reasonCode, "RETENTION_REVIEW_DUE");
    assert.equal(r.decision.competencyId, B);
  }

  // B is not blocked by A's pending retention.
  {
    const r = await decide(
      [
        state(B, { masteryEstimate: 0.5, confidence: 0.4, evidenceCount: 4, lastUpdated: iso(T0 + 4 * HOUR) }),
        acquiredA(),
      ],
      { timeAwareRetention: true, now: new Date(T0 + 5 * HOUR) },
    );
    assert.notEqual(r.decision.reasonCode, "PREREQUISITE_NOT_SATISFIED");
  }

  console.log("TIME-AWARE RETENTION ENGINE TESTS PASS");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
