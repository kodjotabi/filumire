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

function getMostRecentIntervention(
  history: PedagogicalContext["interventionHistory"],
) {
  if (history.length === 0) {
    return undefined;
  }

  return [...history].sort(
    (a, b) => {
      const aTime =
        new Date(
          a.completedAt ??
            a.startedAt,
        ).getTime();

      const bTime =
        new Date(
          b.completedAt ??
            b.startedAt,
        ).getTime();

      return bTime - aTime;
    },
  )[0];
}

export function selectPedagogicalAction(
  context: PedagogicalContext,
): PedagogicalDecision {
  const mostRecentIntervention =
    getMostRecentIntervention(
      context.interventionHistory,
    );

  /*
   * A completed ineffective intervention is
   * actionable evidence. Reassessment must
   * take priority over repeating the same
   * pedagogical response.
   */
  if (
    mostRecentIntervention?.outcome ===
    "ineffective"
  ) {
    return {
      action: "reassess",
      reasonCode:
        "INEFFECTIVE_INTERVENTION",
    };
  }

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