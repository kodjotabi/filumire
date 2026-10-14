import type { LearningEvidence } from "../packages/domain";
﻿import {
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

const learnerId = "learner-state-hardening";
const competencyId = "competency-test-001";

let state = createInitialLearnerState(
  learnerId,
  competencyId,
);

const history: LearningEvidence[] = [];
function apply(item: LearningEvidence): void {
  history.push(item);
  state = applyEvidence(state, item, [...history]);
}

const initial = state.competencies[0];

assert(
  initial.evidenceCount === 0,
  "initial evidence count must be zero",
);

assert(
  initial.masteryEstimate === 0,
  "initial mastery must be zero",
);

assert(
  initial.confidence === 0,
  "initial confidence must be zero",
);

/*
 * Correct evidence should update mastery.
 */
apply({
  id: "evidence-hardening-001",
  learnerId,
  competencyId,
  source: "assessment",
  outcome: "correct",
  timestamp: "2026-08-27T06:00:00.000Z",
  assessmentItemId: "item-hardening-001",
  sessionId: "session-hardening-001",
  policyVersion: "assessment-0.4",
});

let competency = state.competencies[0];

assert(
  competency.evidenceCount === 1,
  "correct evidence must increase evidence count",
);

assert(
  Math.abs(competency.masteryEstimate - 0.86) < 1e-10,
  "correct evidence with unspecified independence must produce mastery estimate 0.86",
);

/*
 * Skipped evidence must not be treated as
 * successful mastery evidence.
 */
const beforeSkipped = competency;

apply({
  id: "evidence-hardening-002",
  learnerId,
  competencyId,
  source: "assessment",
  outcome: "skipped",
  timestamp: "2026-08-27T06:01:00.000Z",
  assessmentItemId: "item-hardening-002",
  sessionId: "session-hardening-001",
  policyVersion: "assessment-0.4",
});

competency = state.competencies[0];

assert(
  competency.masteryEstimate <=
    beforeSkipped.masteryEstimate,
  "skipped evidence must not increase mastery",
);

/*
 * Observed evidence must not automatically become
 * equivalent to a correct assessment response.
 */
const beforeObserved = competency;

apply({
  id: "evidence-hardening-003",
  learnerId,
  competencyId,
  source: "system",
  outcome: "observed",
  timestamp: "2026-08-27T06:02:00.000Z",
  policyVersion: "learner-state-0.1",
});

competency = state.competencies[0];

assert(
  competency.masteryEstimate <=
    beforeObserved.masteryEstimate,
  "observed evidence must not automatically increase mastery",
);

/*
 * Readiness must not imply advancement merely because
 * mastery and confidence are high.
 */
assert(
  competency.readinessState?.readyForAdvancement === false ||
    (
      competency.retentionState?.status ===
        "retained" &&
      competency.transferState?.status ===
        "demonstrated"
    ),
  "readiness must not bypass retention and transfer",
);

console.log({
  learnerStateHardeningTest: "PASS",
});

