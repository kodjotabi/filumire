import type {
  AdaptiveAction,
  DiagnosticState,
  InstructionalStrategy,
  InterventionType,
  InterventionOutcome,
  StrategyEvidence,
  ResponseMode,
  ResponseModeEvidence,
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

  strategyEvidence?: StrategyEvidence[];

  responseModeEvidence?: ResponseModeEvidence[];
}

export interface PedagogicalDecision {
  action: AdaptiveAction;
  reasonCode: string;
}

export interface StrategyDecision {
  instructionalStrategy:
    | InstructionalStrategy
    | undefined;

  reasonCode: string;
}

export interface ResponseModeDecision {
  responseMode:
    | ResponseMode
    | undefined;

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

function getDefaultStrategiesForAction(
  action: AdaptiveAction,
): InstructionalStrategy[] {
  switch (action) {
    case "teach":
      return [
        "direct_explanation",
        "worked_example",
        "guided_practice",
        "visual_representation",
        "demonstration",
        "analogy",
        "story_context",
      ];

    case "practice":
      return [
        "guided_practice",
        "retrieval_practice",
        "worked_example",
        "mixed_representation",
      ];

    case "scaffold":
      return [
        "step_by_step_scaffold",
        "worked_example",
        "concrete_representation",
        "visual_representation",
        "guided_practice",
      ];

    case "remediate":
      return [
        "error_analysis",
        "direct_explanation",
        "worked_example",
        "concrete_representation",
        "analogy",
        "visual_representation",
      ];

    case "advance":
      return [
        "mixed_representation",
        "questioning",
        "story_context",
        "demonstration",
        "worked_example",
      ];

    default:
      return [];
  }
}

function getDefaultResponseModesForAction(
  action: AdaptiveAction,
): ResponseMode[] {
  switch (action) {
    case "diagnose":
      return [
        "multiple_choice",
        "short_answer",
        "error_identification",
        "explanation",
      ];

    case "teach":
      return [
        "short_answer",
        "explanation",
        "worked_solution",
        "constructed_response",
      ];

    case "practice":
      return [
        "short_answer",
        "worked_solution",
        "sequence_ordering",
        "multiple_choice",
        "constructed_response",
      ];

    case "scaffold":
      return [
        "worked_solution",
        "sequence_ordering",
        "short_answer",
        "matching",
        "constructed_response",
      ];

    case "remediate":
      return [
        "error_identification",
        "short_answer",
        "worked_solution",
        "explanation",
        "multiple_choice",
      ];

    case "reassess":
      return [
        "constructed_response",
        "worked_solution",
        "short_answer",
        "multiple_choice",
        "explanation",
      ];

    case "retention_check":
      return [
        "short_answer",
        "multiple_choice",
        "constructed_response",
        "explanation",
      ];

    case "transfer_check":
      return [
        "application",
        "constructed_response",
        "worked_solution",
        "explanation",
      ];

    case "advance":
      return [
        "application",
        "constructed_response",
        "worked_solution",
        "explanation",
      ];

    default:
      return [];
  }
}

function getEvidenceScore(
  evidence: StrategyEvidence,
): number {
  if (
    evidence.evidenceCount <= 0
  ) {
    return 0;
  }

  return (
    (
      evidence.successfulEvidenceCount /
      evidence.evidenceCount
    ) *
    evidence.confidence
  );
}

function getResponseModeEvidenceScore(
  evidence: ResponseModeEvidence,
): number {
  if (
    evidence.evidenceCount <= 0
  ) {
    return 0;
  }

  return (
    (
      evidence.successfulEvidenceCount /
      evidence.evidenceCount
    ) *
    evidence.confidence
  );
}

export function selectInstructionalStrategy(
  action: AdaptiveAction,
  strategyEvidence:
    | StrategyEvidence[]
    | undefined,
): StrategyDecision {
  const preferredStrategies =
    getDefaultStrategiesForAction(
      action,
    );

  if (
    preferredStrategies.length === 0
  ) {
    return {
      instructionalStrategy:
        undefined,

      reasonCode:
        "NO_TEACHING_STRATEGY_REQUIRED",
    };
  }

  const evidence =
    strategyEvidence ?? [];

  const effectiveStrategies =
    evidence
      .filter(
        (item) =>
          item.effectiveness ===
          "effective",
      )
      .filter(
        (item) =>
          preferredStrategies.includes(
            item.strategy,
          ),
      )
      .sort(
        (a, b) =>
          getEvidenceScore(b) -
          getEvidenceScore(a),
      );

  if (
    effectiveStrategies.length > 0
  ) {
    return {
      instructionalStrategy:
        effectiveStrategies[0]
          .strategy,

      reasonCode:
        "PREVIOUSLY_EFFECTIVE_STRATEGY",
    };
  }

  const partiallyEffectiveStrategies =
    evidence
      .filter(
        (item) =>
          item.effectiveness ===
          "partially_effective",
      )
      .filter(
        (item) =>
          preferredStrategies.includes(
            item.strategy,
          ),
      )
      .sort(
        (a, b) =>
          getEvidenceScore(b) -
          getEvidenceScore(a),
      );

  if (
    partiallyEffectiveStrategies.length >
    0
  ) {
    return {
      instructionalStrategy:
        partiallyEffectiveStrategies[0]
          .strategy,

      reasonCode:
        "PARTIALLY_EFFECTIVE_STRATEGY",
    };
  }

  const ineffectiveStrategies =
    new Set(
      evidence
        .filter(
          (item) =>
            item.effectiveness ===
            "ineffective",
        )
        .map(
          (item) =>
            item.strategy,
        ),
    );

  const untestedStrategy =
    preferredStrategies.find(
      (strategy) =>
        !ineffectiveStrategies.has(
          strategy,
        ),
    );

  if (untestedStrategy) {
    return {
      instructionalStrategy:
        untestedStrategy,

      reasonCode:
        evidence.length === 0
          ? "INITIAL_STRATEGY_SELECTION"
          : "ALTERNATIVE_STRATEGY_SELECTION",
    };
  }

  return {
    instructionalStrategy:
      preferredStrategies[0],

    reasonCode:
      "ALL_PREFERRED_STRATEGIES_HAVE_EVIDENCE",
  };
}

export function selectResponseMode(
  action: AdaptiveAction,
  responseModeEvidence:
    | ResponseModeEvidence[]
    | undefined,
): ResponseModeDecision {
  const preferredModes =
    getDefaultResponseModesForAction(
      action,
    );

  if (
    preferredModes.length === 0
  ) {
    return {
      responseMode:
        undefined,

      reasonCode:
        "NO_RESPONSE_MODE_REQUIRED",
    };
  }

  const evidence =
    responseModeEvidence ?? [];

  const ineffectiveModes =
    new Set(
      evidence
        .filter(
          (item) =>
            item.evidenceCount > 0 &&
            item.successfulEvidenceCount === 0,
        )
        .map(
          (item) =>
            item.responseMode,
        ),
    );

  const effectiveModes =
    evidence
      .filter(
        (item) =>
          preferredModes.includes(
            item.responseMode,
          ),
      )
      .filter(
        (item) =>
          !ineffectiveModes.has(
            item.responseMode,
          ),
      )
      .sort(
        (a, b) =>
          getResponseModeEvidenceScore(b) -
          getResponseModeEvidenceScore(a),
      );

  if (
    effectiveModes.length > 0
  ) {
    return {
      responseMode:
        effectiveModes[0]
          .responseMode,

      reasonCode:
        "PREVIOUSLY_EFFECTIVE_RESPONSE_MODE",
    };
  }

  const untestedMode =
    preferredModes.find(
      (mode) =>
        !ineffectiveModes.has(
          mode,
        ),
    );

  if (untestedMode) {
    return {
      responseMode:
        untestedMode,

      reasonCode:
        evidence.length === 0
          ? "INITIAL_RESPONSE_MODE_SELECTION"
          : "ALTERNATIVE_RESPONSE_MODE_SELECTION",
    };
  }

  return {
    responseMode:
      preferredModes[0],

    reasonCode:
      "ALL_PREFERRED_RESPONSE_MODES_HAVE_EVIDENCE",
  };
}
export function selectPedagogicalAction(
  context: PedagogicalContext,
): PedagogicalDecision {
  const mostRecentIntervention =
    getMostRecentIntervention(
      context.interventionHistory,
    );

  if (
    mostRecentIntervention?.outcome ===
      "ineffective" &&
    mostRecentIntervention.type !==
      "retention_check" &&
    mostRecentIntervention.type !==
      "transfer_check"
  ) {
    return {
      action: "reassess",
      reasonCode: "INEFFECTIVE_INTERVENTION",
    };
  }

  if (
    context.diagnosticState === "misconception"
  ) {
    return {
      action: "remediate",
      reasonCode: "MISCONCEPTION",
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
      reasonCode: "PROCEDURAL_ERROR",
    };
  }

  if (
    context.evidenceCount < 3
  ) {
    return {
      action: "diagnose",
      reasonCode: "INSUFFICIENT_EVIDENCE",
    };
  }

  if (
    context.consecutiveFailures >= 3
  ) {
    return {
      action: "remediate",
      reasonCode: "PERSISTENT_FAILURE",
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
      reasonCode: "PRACTICE_REQUIRED",
    };
  }

  if (
    context.retentionStatus ===
      "not_retained" ||
    (
      context.retentionStatus ===
        "pending" &&
      context.retentionConfidence < 0.8
    ) ||
    context.retentionStatus ===
      "not_tested"
  ) {
    return {
      action: "retention_check",
      reasonCode: "RETENTION_REQUIRED",
    };
  }

  if (
    context.transferStatus ===
      "not_demonstrated" ||
    (
      context.transferStatus ===
        "pending" &&
      context.transferConfidence < 0.8
    ) ||
    context.transferStatus ===
      "not_tested"
  ) {
    return {
      action: "transfer_check",
      reasonCode: "TRANSFER_REQUIRED",
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
    reasonCode: "PRACTICE_REQUIRED",
  };
}
