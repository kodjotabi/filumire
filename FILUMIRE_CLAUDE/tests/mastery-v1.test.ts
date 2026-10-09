import assert from "node:assert/strict";
import type { LearningEvidence } from "../packages/domain";
import { evaluateMastery } from "../services/mastery";

function evidence(
  id: string,
  overrides: Partial<LearningEvidence> = {},
): LearningEvidence {
  return {
    id,
    learnerId: "learner-mastery-v1",
    competencyId: "competency-mastery-v1",
    source: "assessment",
    outcome: "correct",
    timestamp: new Date().toISOString(),
    policyVersion: "assessment-0.9",
    interpretationVersion: "evidence-v1",
    purpose: "mastery",
    independence: "independent",
    strength: "strong",
    difficulty: "standard",
    representation: "numeric",
    ...overrides,
  };
}

/* One correct answer cannot establish mastery. */
assert.notEqual(
  evaluateMastery([evidence("e1")]).reasonCode,
  "STRONG_MASTERY_EVIDENCE",
);

/* Independent success must count more than fully supported success. */
assert.ok(
  evaluateMastery([
    evidence("e1", { independence: "independent" }),
  ]).masteryEstimate >
  evaluateMastery([
    evidence("e1", { independence: "fully_supported" }),
  ]).masteryEstimate,
);

/* Supported-only performance cannot establish mastery. */
assert.notEqual(
  evaluateMastery([
    evidence("e1", { independence: "fully_supported" }),
    evidence("e2", { independence: "fully_supported" }),
    evidence("e3", { independence: "fully_supported" }),
    evidence("e4", { independence: "fully_supported" }),
    evidence("e5", { independence: "fully_supported" }),
  ]).reasonCode,
  "STRONG_MASTERY_EVIDENCE",
);

/* Variation must strengthen confidence. */
const narrow = evaluateMastery([
  evidence("e1"),
  evidence("e2"),
  evidence("e3"),
]);

const varied = evaluateMastery([
  evidence("e1", { representation: "numeric" }),
  evidence("e2", { representation: "visual" }),
  evidence("e3", { representation: "verbal" }),
]);

assert.ok(varied.confidence > narrow.confidence);

/* Retention evidence must not alter mastery. */
const retention = evaluateMastery([
  evidence("e1"),
  evidence("e2"),
  evidence("e3"),
  evidence("r1", {
    purpose: "retention",
    interventionType: "retention_check",
    outcome: "incorrect",
  }),
]);

assert.equal(
  retention.masteryEstimate,
  narrow.masteryEstimate,
);

/* Transfer evidence must not alter mastery. */
const transfer = evaluateMastery([
  evidence("e1"),
  evidence("e2"),
  evidence("e3"),
  evidence("t1", {
    purpose: "transfer",
    interventionType: "transfer_check",
    outcome: "correct",
  }),
]);

assert.equal(
  transfer.masteryEstimate,
  narrow.masteryEstimate,
);

/* Missing V1 metadata cannot become strong mastery proof. */
assert.notEqual(
  evaluateMastery([
    evidence("e1", {
      independence: undefined,
      strength: undefined,
      difficulty: undefined,
      representation: undefined,
    }),
    evidence("e2", {
      independence: undefined,
      strength: undefined,
      difficulty: undefined,
      representation: undefined,
    }),
    evidence("e3", {
      independence: undefined,
      strength: undefined,
      difficulty: undefined,
      representation: undefined,
    }),
  ]).reasonCode,
  "STRONG_MASTERY_EVIDENCE",
);

console.log("Mastery V1 invariant tests: PASS");
