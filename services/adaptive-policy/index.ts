import type {
  AdaptiveAction,
  InterventionOutcome,
  InterventionType,
} from "../../packages/domain";

export const ADAPTIVE_POLICY_VERSION = "adaptive-policy-v1";

export interface AdaptivePolicyContext {
  masteryEstimate: number;
  confidence: number;
  evidenceCount: number;
  consecutiveFailures: number;

  diagnosticState:
    | "unknown"
    | "insufficient_evidence"
    | "probable_mastery"
    | "prerequisite_gap"
    | "misconception"
    | "conceptual_misunderstanding"
    | "procedural_error"
    | "careless_execution"
    | "forgotten_knowledge"
    | "transfer_failure"
    | "persistent_difficulty";

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

  retentionPerformance?: {
    attempts: number;
    confidence: number;
  };

  transferPerformance?: {
    attempts: number;
    confidence: number;
  };

  /*
   * Time-aware retention. Optional, so existing callers behave
   * exactly as before. "not_yet_open" means the learner has only
   * just acquired this competency and a retention check now would
   * measure short-term memory, so the learner may move on and
   * come back.
   */
  retentionWindow?: "open" | "not_yet_open";
}

export interface AdaptivePolicyDecision {
  action: AdaptiveAction;
  reasonCode: string;
  policyVersion: string;
}

function getMostRecentIntervention(
  history: AdaptivePolicyContext["interventionHistory"],
) {
  if (history.length === 0) {
    return undefined;
  }

  return [...history].sort((a, b) => {
    const aTime = new Date(
      a.completedAt ?? a.startedAt,
    ).getTime();

    const bTime = new Date(
      b.completedAt ?? b.startedAt,
    ).getTime();

    return bTime - aTime;
  })[0];
}

export function decideNextBestAction(
  context: AdaptivePolicyContext,
): AdaptivePolicyDecision {
  const decide = (
    action: AdaptiveAction,
    reasonCode: string,
  ): AdaptivePolicyDecision => ({
    action,
    reasonCode,
    policyVersion: ADAPTIVE_POLICY_VERSION,
  });

  const mostRecentIntervention =
    getMostRecentIntervention(
      context.interventionHistory,
    );

  /*
   * A wrong answer to a diagnostic question shows what teaching
   * is needed; it is not evidence that teaching failed, so it is
   * left to the diagnostic state below (Tranche 4B).
   */
  if (
    mostRecentIntervention?.outcome === "ineffective" &&
    mostRecentIntervention.type !== "diagnose" &&
    mostRecentIntervention.type !== "retention_check" &&
    mostRecentIntervention.type !== "transfer_check"
  ) {
    return decide(
      "reassess",
      "INEFFECTIVE_INTERVENTION",
    );
  }

  if (context.diagnosticState === "prerequisite_gap") {
    return decide("scaffold", "PREREQUISITE_GAP");
  }

  if (context.diagnosticState === "misconception") {
    return decide("remediate", "MISCONCEPTION");
  }

  if (
    context.diagnosticState ===
    "conceptual_misunderstanding"
  ) {
    return decide(
      "teach",
      "CONCEPTUAL_MISUNDERSTANDING",
    );
  }

  if (context.diagnosticState === "procedural_error") {
    return decide("scaffold", "PROCEDURAL_ERROR");
  }

  if (context.diagnosticState === "careless_execution") {
    return decide(
      "reassess",
      "CARELESS_EXECUTION_CHECK",
    );
  }

  if (context.diagnosticState === "forgotten_knowledge") {
    return decide(
      "practice",
      "FORGOTTEN_KNOWLEDGE_REVIEW",
    );
  }

  if (context.diagnosticState === "transfer_failure") {
    return decide(
      "practice",
      "TRANSFER_FAILURE_PRACTICE",
    );
  }

  if (context.evidenceCount < 3) {
    return decide(
      "diagnose",
      "INSUFFICIENT_EVIDENCE",
    );
  }

  if (context.consecutiveFailures >= 3) {
    return decide(
      "remediate",
      "PERSISTENT_FAILURE",
    );
  }

  if (!context.prerequisiteSatisfied) {
    return decide(
      "scaffold",
      "PREREQUISITE_NOT_SATISFIED",
    );
  }

  if (
    context.masteryEstimate < 0.8 ||
    context.confidence < 0.8
  ) {
    return decide(
      "practice",
      "PRACTICE_REQUIRED",
    );
  }

  if (
    context.retentionPerformance &&
    context.retentionPerformance.attempts > 0 &&
    context.retentionPerformance.confidence < 0.5
  ) {
    return decide(
      "practice",
      "RETENTION_HISTORY_WEAK",
    );
  }

  const retentionNeeded =
    context.retentionStatus === "not_retained" ||
    (
      context.retentionStatus === "pending" &&
      context.retentionConfidence < 0.8
    ) ||
    context.retentionStatus === "not_tested";

  /*
   * Retention is deferred only when there is somewhere to move
   * on to. The last competency keeps the original behaviour.
   */
  const retentionDeferred =
    retentionNeeded &&
    context.retentionWindow === "not_yet_open" &&
    context.hasNextCompetency;

  if (retentionNeeded && !retentionDeferred) {
    return decide(
      "retention_check",
      "RETENTION_REQUIRED",
    );
  }

  if (
    context.transferPerformance &&
    context.transferPerformance.attempts > 0 &&
    context.transferPerformance.confidence < 0.5
  ) {
    return decide(
      "practice",
      "TRANSFER_HISTORY_WEAK",
    );
  }

  if (
    context.transferStatus === "not_demonstrated" ||
    (
      context.transferStatus === "pending" &&
      context.transferConfidence < 0.8
    ) ||
    context.transferStatus === "not_tested"
  ) {
    return decide(
      "transfer_check",
      "TRANSFER_REQUIRED",
    );
  }

  if (
    retentionDeferred &&
    context.transferStatus === "demonstrated"
  ) {
    return decide(
      "advance",
      "ACQUIRED_RETENTION_PENDING_MOVE_ON",
    );
  }

  if (
    context.transferStatus === "demonstrated" &&
    context.readyForAdvancement &&
    context.hasNextCompetency
  ) {
    return decide(
      "advance",
      "MASTERY_RETENTION_TRANSFER_CONFIRMED",
    );
  }

  if (
    context.transferStatus === "demonstrated" &&
    context.readyForAdvancement &&
    !context.hasNextCompetency
  ) {
    return decide(
      "complete",
      "LEARNING_PATH_COMPLETE",
    );
  }

  return decide(
    "practice",
    "PRACTICE_REQUIRED",
  );
}

