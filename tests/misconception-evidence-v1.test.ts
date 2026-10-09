import assert from "node:assert/strict";
import {
  createInitialLearnerState,
  applyEvidence,
  MISCONCEPTION_POLICY,
} from "../services/learner-state";
import { decideNextBestAction } from "../services/adaptive-policy";

const L = "learner-misconception-v1";
const C = "competency-misconception-v1";
let n = 0;
function ev(outcome: "correct" | "incorrect", extra: Record<string, unknown> = {}) {
  n += 1;
  return {
    id: `ev-${n}`,
    learnerId: L,
    competencyId: C,
    source: "assessment" as const,
    outcome,
    timestamp: new Date(2026, 9, 1, 0, n).toISOString(),
    policyVersion: "test",
    interventionType: "practice" as const,
    ...extra,
  };
}
const wrong = (id: string) =>
  ev("incorrect", {
    misconceptionId: id,
    errorPattern: id,
    errorClass: "misconception" as const,
    diagnosticState: "misconception" as const,
    diagnosticConfidence: 0.8,
  });

function policyFor(state: any) {
  const c = state.competencies[0];
  return decideNextBestAction({
    masteryEstimate: c.masteryEstimate,
    confidence: c.confidence,
    evidenceCount: Math.max(c.evidenceCount, 3),
    consecutiveFailures: 0,
    diagnosticState: c.diagnosticState,
    diagnosticConfidence: c.diagnosticConfidence,
    errorPatterns: c.errorPatterns,
    interventionHistory: c.interventionHistory,
    prerequisiteSatisfied: true,
    hasNextCompetency: true,
    retentionStatus: "not_tested",
    retentionConfidence: 0,
    transferStatus: "not_tested",
    transferConfidence: 0,
    readyForAdvancement: false,
  } as any);
}

assert.equal(MISCONCEPTION_POLICY.minimumSupportingEvidence, 2);

// 1. A single wrong answer is not a misconception.
let state = createInitialLearnerState(L, C);
const first = wrong("larger_denominator_means_larger");
state = applyEvidence(state, first, [first]);
let c = state.competencies[0];
assert.equal(c.diagnosticState, "conceptual_misunderstanding");
assert.ok(c.diagnosticConfidence <= 0.5);
assert.equal(policyFor(state).action, "teach");

// 2. The same wrong thinking again confirms a probable misconception.
const second = wrong("larger_denominator_means_larger");
state = applyEvidence(state, second, [first, second]);
c = state.competencies[0];
assert.equal(c.diagnosticState, "misconception");
assert.equal(policyFor(state).action, "remediate");

// 3. Two different wrong ideas do not add up to one misconception.
let s2 = createInitialLearnerState(L, C);
const a = wrong("idea_a");
s2 = applyEvidence(s2, a, [a]);
const b = wrong("idea_b");
s2 = applyEvidence(s2, b, [a, b]);
assert.notEqual(s2.competencies[0].diagnosticState, "misconception");

// 4. Correct answers in between do not erase the pattern.
let s3 = createInitialLearnerState(L, C);
const w1 = wrong("idea_c");
s3 = applyEvidence(s3, w1, [w1]);
const ok = ev("correct");
s3 = applyEvidence(s3, ok, [w1, ok]);
const w2 = wrong("idea_c");
s3 = applyEvidence(s3, w2, [w1, ok, w2]);
assert.equal(s3.competencies[0].diagnosticState, "misconception");

// 5. Evidence with no misconception name is left as diagnosed.
let s4 = createInitialLearnerState(L, C);
const unnamed = ev("incorrect", {
  errorClass: "misconception",
  diagnosticState: "misconception",
  diagnosticConfidence: 0.8,
});
s4 = applyEvidence(s4, unnamed, [unnamed]);
assert.equal(s4.competencies[0].diagnosticState, "misconception");

console.log("MISCONCEPTION TESTS PASS");
