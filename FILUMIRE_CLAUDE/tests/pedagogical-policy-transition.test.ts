import {
  selectPedagogicalAction,
} from "../packages/pedagogy";

function assert(
  condition: boolean,
  message: string,
): void {
  if (!condition) {
    throw new Error(`FAIL: ${message}`);
  }
}

function test(
  name: string,
  context: Parameters<
    typeof selectPedagogicalAction
  >[0],
  expectedAction: string,
  expectedReason: string,
): void {
  const decision =
    selectPedagogicalAction(context);

  console.log({
    test: name,
    action: decision.action,
    reasonCode: decision.reasonCode,
  });

  assert(
    decision.action === expectedAction,
    `${name}: expected action ${expectedAction}, got ${decision.action}`,
  );

  assert(
    decision.reasonCode === expectedReason,
    `${name}: expected reason ${expectedReason}, got ${decision.reasonCode}`,
  );
}

const base = {
  masteryEstimate: 0.4,
  confidence: 0.4,
  evidenceCount: 0,
  consecutiveFailures: 0,
  diagnosticState: "unknown" as const,
  diagnosticConfidence: 0,
  errorPatterns: [],
  interventionHistory: [],
  prerequisiteSatisfied: true,
  hasNextCompetency: true,
  retentionStatus: "not_tested" as const,
  retentionConfidence: 0,
  transferStatus: "not_tested" as const,
  transferConfidence: 0,
  readyForAdvancement: false,
};

test(
  "initial state",
  {
    ...base,
  },
  "diagnose",
  "INSUFFICIENT_EVIDENCE",
);

test(
  "conceptual misunderstanding",
  {
    ...base,
    diagnosticState:
      "conceptual_misunderstanding",
    evidenceCount: 1,
  },
  "teach",
  "CONCEPTUAL_MISUNDERSTANDING",
);

test(
  "procedural error",
  {
    ...base,
    diagnosticState:
      "procedural_error",
    evidenceCount: 1,
  },
  "scaffold",
  "PROCEDURAL_ERROR",
);

test(
  "misconception",
  {
    ...base,
    diagnosticState:
      "misconception",
    evidenceCount: 1,
  },
  "remediate",
  "MISCONCEPTION",
);

test(
  "persistent failure",
  {
    ...base,
    evidenceCount: 3,
    consecutiveFailures: 3,
  },
  "remediate",
  "PERSISTENT_FAILURE",
);

test(
  "prerequisite not satisfied",
  {
    ...base,
    evidenceCount: 3,
    prerequisiteSatisfied: false,
  },
  "scaffold",
  "PREREQUISITE_NOT_SATISFIED",
);

test(
  "practice required",
  {
    ...base,
    evidenceCount: 3,
    masteryEstimate: 0.7,
    confidence: 0.8,
  },
  "practice",
  "PRACTICE_REQUIRED",
);

test(
  "retention required after mastery",
  {
    ...base,
    evidenceCount: 5,
    masteryEstimate: 0.9,
    confidence: 0.9,
    retentionStatus: "not_tested",
  },
  "retention_check",
  "RETENTION_REQUIRED",
);

test(
  "transfer required after retention",
  {
    ...base,
    evidenceCount: 5,
    masteryEstimate: 0.9,
    confidence: 0.9,
    retentionStatus: "retained",
    retentionConfidence: 0.9,
    transferStatus: "not_tested",
  },
  "transfer_check",
  "TRANSFER_REQUIRED",
);

test(
  "advancement",
  {
    ...base,
    evidenceCount: 7,
    masteryEstimate: 0.9,
    confidence: 0.9,
    retentionStatus: "retained",
    retentionConfidence: 0.9,
    transferStatus: "demonstrated",
    transferConfidence: 0.9,
    readyForAdvancement: true,
    hasNextCompetency: true,
  },
  "advance",
  "MASTERY_RETENTION_TRANSFER_CONFIRMED",
);

test(
  "completion",
  {
    ...base,
    evidenceCount: 7,
    masteryEstimate: 0.9,
    confidence: 0.9,
    retentionStatus: "retained",
    retentionConfidence: 0.9,
    transferStatus: "demonstrated",
    transferConfidence: 0.9,
    readyForAdvancement: true,
    hasNextCompetency: false,
  },
  "complete",
  "LEARNING_PATH_COMPLETE",
);

test(
  "ineffective intervention overrides normal progression",
  {
    ...base,
    evidenceCount: 3,
    interventionHistory: [
      {
        interventionId:
          "intervention-policy-test",
        competencyId:
          "competency-test-001",
        type: "teach",
        startedAt:
          "2026-08-27T00:00:00.000Z",
        completedAt:
          "2026-08-27T00:05:00.000Z",
        outcome: "ineffective",
        evidenceIds: [
          "evidence-policy-test",
        ],
      },
    ],
  },
  "reassess",
  "INEFFECTIVE_INTERVENTION",
);

console.log({
  pedagogicalPolicyTransitionTest:
    "PASS",
});
