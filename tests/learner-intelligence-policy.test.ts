import {
  selectPedagogicalAction,
} from "../packages/pedagogy";

function assert(
  condition: boolean,
  message: string,
) {
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
) {
  const decision =
    selectPedagogicalAction(context);

  console.log({
    test: name,
    action: decision.action,
    reasonCode: decision.reasonCode,
  });

  assert(
    decision.action === expectedAction,
    `${name}: expected ${expectedAction}, got ${decision.action}`,
  );
}

const base = {
  masteryEstimate: 0.4,
  confidence: 0.8,
  evidenceCount: 5,
  consecutiveFailures: 0,
  diagnosticState: "unknown" as const,
  diagnosticConfidence: 0.8,
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
  "misconception",
  {
    ...base,
    diagnosticState: "misconception",
  },
  "remediate",
);

test(
  "conceptual misunderstanding",
  {
    ...base,
    diagnosticState:
      "conceptual_misunderstanding",
  },
  "teach",
);

test(
  "procedural error",
  {
    ...base,
    diagnosticState:
      "procedural_error",
  },
  "scaffold",
);

test(
  "ineffective intervention",
  {
    ...base,
    interventionHistory: [
      {
        interventionId:
          "intervention-001",

        competencyId:
          "competency-test-001",

        type: "teach",

        startedAt:
          "2026-08-23T15:00:00.000Z",

        outcome:
          "ineffective",

        evidenceIds: [
          "evidence-001",
        ],
      },
    ],
  },
  "reassess",
);

test(
  "retention required",
  {
    ...base,
    masteryEstimate: 0.9,
    confidence: 1,
    evidenceCount: 5,
    readyForAdvancement: true,
  },
  "retention_check",
);

test(
  "transfer required",
  {
    ...base,
    masteryEstimate: 0.9,
    confidence: 1,
    evidenceCount: 6,
    retentionStatus: "retained",
    retentionConfidence: 1,
    readyForAdvancement: true,
  },
  "transfer_check",
);

test(
  "advancement",
  {
    ...base,
    masteryEstimate: 0.9,
    confidence: 1,
    evidenceCount: 7,
    retentionStatus: "retained",
    retentionConfidence: 1,
    transferStatus: "demonstrated",
    transferConfidence: 1,
    readyForAdvancement: true,
  },
  "advance",
);

console.log({
  intelligencePolicyTest:
    "PASS",
});