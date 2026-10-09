import {
  selectPedagogicalAction,
} from "../packages/pedagogy";

function assert(
  condition: boolean,
  message: string,
): void {
  if (!condition) {
    throw new Error(
      `FAIL: ${message}`,
    );
  }
}

const base = {
  masteryEstimate: 0.9,
  confidence: 1,
  evidenceCount: 7,
  consecutiveFailures: 0,

  diagnosticState:
    "probable_mastery" as const,

  diagnosticConfidence: 1,

  errorPatterns: [],

  interventionHistory: [],

  prerequisiteSatisfied: true,

  hasNextCompetency: true,

  readyForAdvancement: true,
};

const retentionDecision =
  selectPedagogicalAction({
    ...base,

    retentionStatus:
      "not_tested",

    retentionConfidence:
      0,

    transferStatus:
      "not_tested",

    transferConfidence:
      0,
  });

console.log({
  test:
    "retention required",

  action:
    retentionDecision.action,

  reasonCode:
    retentionDecision.reasonCode,
});

assert(
  retentionDecision.action ===
    "retention_check",
  "mastery without retention must require retention check",
);

const transferDecision =
  selectPedagogicalAction({
    ...base,

    retentionStatus:
      "retained",

    retentionConfidence:
      1,

    transferStatus:
      "not_tested",

    transferConfidence:
      0,
  });

console.log({
  test:
    "transfer required",

  action:
    transferDecision.action,

  reasonCode:
    transferDecision.reasonCode,
});

assert(
  transferDecision.action ===
    "transfer_check",
  "retention without transfer must require transfer check",
);

const advancementDecision =
  selectPedagogicalAction({
    ...base,

    retentionStatus:
      "retained",

    retentionConfidence:
      1,

    transferStatus:
      "demonstrated",

    transferConfidence:
      1,
  });

console.log({
  test:
    "advancement after retention and transfer",

  action:
    advancementDecision.action,

  reasonCode:
    advancementDecision.reasonCode,
});

assert(
  advancementDecision.action ===
    "advance",
  "advancement requires confirmed retention and transfer",
);

const noNextCompetencyDecision =
  selectPedagogicalAction({
    ...base,

    hasNextCompetency:
      false,

    retentionStatus:
      "retained",

    retentionConfidence:
      1,

    transferStatus:
      "demonstrated",

    transferConfidence:
      1,
  });

console.log({
  test:
    "completion after retention and transfer",

  action:
    noNextCompetencyDecision.action,

  reasonCode:
    noNextCompetencyDecision.reasonCode,
});

assert(
  noNextCompetencyDecision.action ===
    "complete",
  "completed learning path must terminate after retention and transfer",
);

console.log({
  retentionTransferPolicy:
    "PASS",
});
