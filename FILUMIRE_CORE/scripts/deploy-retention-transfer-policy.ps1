$ErrorActionPreference = "Stop"

$Root = "C:\Users\tabi\Desktop\filumire\FILUMIRE_CORE"

New-Item -ItemType Directory -Force "$Root\scripts" | Out-Null
New-Item -ItemType Directory -Force "$Root\tests" | Out-Null

# ============================================================
# packages/pedagogy/index.ts
# ============================================================

@'
import type {
  AdaptiveAction,
  DiagnosticState,
  InterventionType,
  InterventionOutcome,
} from "../domain";

export interface PedagogicalContext {
  masteryEstimate: number;
  confidence: number;
  evidenceCount: number;

  consecutiveFailures: number;

  diagnosticState: DiagnosticState;
  diagnosticConfidence: number;

  errorPatterns: string[];

  interventionHistory: {
    interventionId: string;
    competencyId: string;
    type: InterventionType;
    startedAt: string;
    completedAt?: string;
    outcome?: InterventionOutcome;
    evidenceIds: string[];
  }[];

  prerequisiteSatisfied: boolean;
  hasNextCompetency: boolean;

  retentionStatus:
    | "not_tested"
    | "pending"
    | "retained"
    | "not_retained";

  retentionConfidence: number;

  transferStatus:
    | "not_tested"
    | "pending"
    | "demonstrated"
    | "not_demonstrated";

  transferConfidence: number;

  readyForAdvancement: boolean;
}

export interface PedagogicalDecision {
  action: AdaptiveAction;
  reasonCode: string;
}

export function selectPedagogicalAction(
  context: PedagogicalContext,
): PedagogicalDecision {
  if (
    context.diagnosticState ===
    "misconception"
  ) {
    return {
      action: "remediate",
      reasonCode:
        "MISCONCEPTION",
    };
  }

  if (
    context.diagnosticState ===
    "conceptual_misunderstanding"
  ) {
    return {
      action: "teach",
      reasonCode:
        "CONCEPTUAL_MISUNDERSTANDING",
    };
  }

  if (
    context.diagnosticState ===
    "procedural_error"
  ) {
    return {
      action: "scaffold",
      reasonCode:
        "PROCEDURAL_ERROR",
    };
  }

  const ineffectiveIntervention =
    context.interventionHistory.some(
      (intervention) =>
        intervention.outcome ===
        "ineffective",
    );

  if (ineffectiveIntervention) {
    return {
      action: "reassess",
      reasonCode:
        "INEFFECTIVE_INTERVENTION",
    };
  }

  if (
    context.evidenceCount < 3
  ) {
    return {
      action: "diagnose",
      reasonCode:
        "INSUFFICIENT_EVIDENCE",
    };
  }

  if (
    context.consecutiveFailures >= 3
  ) {
    return {
      action: "remediate",
      reasonCode:
        "PERSISTENT_FAILURE",
    };
  }

  if (
    !context.prerequisiteSatisfied
  ) {
    return {
      action: "scaffold",
      reasonCode:
        "PREREQUISITE_NOT_SATISFIED",
    };
  }

  if (
    context.masteryEstimate < 0.8 ||
    context.confidence < 0.8
  ) {
    return {
      action: "practice",
      reasonCode:
        "PRACTICE_REQUIRED",
    };
  }

  if (
    context.retentionStatus ===
      "not_retained" ||
    (
      context.retentionStatus ===
        "pending" &&
      context.retentionConfidence <
        0.8
    )
  ) {
    return {
      action: "retention_check",
      reasonCode:
        "RETENTION_REQUIRED",
    };
  }

  if (
    context.retentionStatus ===
      "not_tested"
  ) {
    return {
      action: "retention_check",
      reasonCode:
        "RETENTION_REQUIRED",
    };
  }

  if (
    context.retentionStatus ===
      "retained" &&
    context.transferStatus ===
      "not_tested"
  ) {
    return {
      action: "transfer_check",
      reasonCode:
        "TRANSFER_REQUIRED",
    };
  }

  if (
    context.transferStatus ===
      "not_demonstrated" ||
    (
      context.transferStatus ===
        "pending" &&
      context.transferConfidence <
        0.8
    )
  ) {
    return {
      action: "transfer_check",
      reasonCode:
        "TRANSFER_REQUIRED",
    };
  }

  if (
    context.transferStatus ===
      "demonstrated" &&
    context.readyForAdvancement &&
    context.hasNextCompetency
  ) {
    return {
      action: "advance",
      reasonCode:
        "MASTERY_RETENTION_TRANSFER_CONFIRMED",
    };
  }

  if (
    context.transferStatus ===
      "demonstrated" &&
    context.readyForAdvancement &&
    !context.hasNextCompetency
  ) {
    return {
      action: "complete",
      reasonCode:
        "LEARNING_PATH_COMPLETE",
    };
  }

  return {
    action: "practice",
    reasonCode:
      "PRACTICE_REQUIRED",
  };
}
'@ | Set-Content `
  "$Root\packages\pedagogy\index.ts" `
  -Encoding UTF8

# ============================================================
# tests/retention-transfer-policy.test.ts
# ============================================================

@'
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
'@ | Set-Content `
  "$Root\tests\retention-transfer-policy.test.ts" `
  -Encoding UTF8

Write-Host ""
Write-Host "Retention and transfer adaptive policy installed."
Write-Host ""
Write-Host "Run:"
Write-Host "npx tsx --env-file=.env.local ./tests/retention-transfer-policy.test.ts"