import assert from "node:assert/strict";
import type {
  LearnerCompetencyState,
  LearningEvidence,
} from "../packages/domain";
import {
  diagnoseEvidence,
} from "../services/diagnosis";
import { createInitialLearnerState } from "../services/learner-state";

function state(
  overrides: Partial<LearnerCompetencyState> = {},
): LearnerCompetencyState {
  const initial = createInitialLearnerState(
    "learner-diagnosis-v1",
    "competency-diagnosis-v1",
  );

  return {
    ...initial.competencies[0],
    masteryEstimate: 0.2,
    confidence: 0.2,
    ...overrides,
  };
}

function evidence(
  overrides: Partial<LearningEvidence> = {},
): LearningEvidence {
  return {
    id: "evidence-diagnosis-v1",
    learnerId: "learner-diagnosis-v1",
    competencyId: "competency-diagnosis-v1",
    source: "assessment",
    outcome: "incorrect",
    timestamp: new Date().toISOString(),
    policyVersion: "assessment-0.9",
    interpretationVersion: "evidence-v1",
    ...overrides,
  };
}

const ambiguous = diagnoseEvidence(
  evidence(),
  state(),
  0.2,
);

assert.equal(
  ambiguous.diagnosticState,
  "insufficient_evidence",
);
assert.equal(ambiguous.hypotheses.length, 0);

const prerequisite = diagnoseEvidence(
  evidence({
    id: "evidence-prerequisite",
    errorClass: "prerequisite_gap",
    prerequisiteCompetencyId:
      "competency-prerequisite",
    strength: "strong",
  }),
  state(),
  0.2,
);

assert.equal(
  prerequisite.diagnosticState,
  "prerequisite_gap",
);
assert.ok(prerequisite.hypotheses.length >= 1);
assert.equal(
  prerequisite.hypotheses[0]
    .prerequisiteCompetencyId,
  "competency-prerequisite",
);

const misconception = diagnoseEvidence(
  evidence({
    id: "evidence-misconception",
    errorClass: "misconception",
    misconceptionId:
      "misconception-place-value",
    strength: "strong",
  }),
  state(),
  0.2,
);

assert.equal(
  misconception.diagnosticState,
  "misconception",
);
assert.ok(misconception.hypotheses.length >= 1);

const competing = diagnoseEvidence(
  evidence({
    id: "evidence-competing",
    errorClass: "misconception",
    misconceptionId:
      "misconception-number-rule",
    prerequisiteCompetencyId:
      "competency-number-facts",
    strength: "moderate",
  }),
  state(),
  0.2,
);

assert.ok(competing.hypotheses.length >= 2);

const competingStates =
  competing.hypotheses.map(
    (item) => item.diagnosticState,
  );

assert.ok(
  competingStates.includes(
    "misconception",
  ),
);

assert.ok(
  competingStates.includes(
    "prerequisite_gap",
  ),
);

console.log({
  test: "Diagnosis V1 competing hypotheses",
  ambiguous:
    ambiguous.diagnosticState,
  prerequisite:
    prerequisite.diagnosticState,
  misconception:
    misconception.diagnosticState,
  competingHypotheses:
    competingStates,
  result: "PASS",
});



