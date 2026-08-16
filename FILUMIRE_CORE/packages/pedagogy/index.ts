export type PedagogicalAction =
  | "diagnose"
  | "teach"
  | "practice"
  | "scaffold"
  | "remediate"
  | "reassess"
  | "advance"
  | "teacher_review";

export interface PedagogicalPolicy {
  version: string;
  minimumEvidenceForMastery: number;
  minimumConfidenceForAdvancement: number;
  allowAdvancementWithUncertainty: boolean;
  maxConsecutiveRemediationAttempts: number;
}

export interface PedagogicalContext {
  masteryEstimate: number;
  confidence: number;
  evidenceCount: number;
  consecutiveFailures: number;
  prerequisiteSatisfied: boolean;
}

export interface PedagogicalDecision {
  action: PedagogicalAction;
  reasonCode: string;
}

export const DEFAULT_PEDAGOGICAL_POLICY: PedagogicalPolicy = {
  version: "policy-0.1",
  minimumEvidenceForMastery: 3,
  minimumConfidenceForAdvancement: 0.8,
  allowAdvancementWithUncertainty: false,
  maxConsecutiveRemediationAttempts: 3,
};

export function selectPedagogicalAction(
  context: PedagogicalContext,
  policy: PedagogicalPolicy = DEFAULT_PEDAGOGICAL_POLICY,
): PedagogicalDecision {
  if (!context.prerequisiteSatisfied) {
    return {
      action: "remediate",
      reasonCode: "PREREQUISITE_NOT_SATISFIED",
    };
  }

  if (context.evidenceCount < policy.minimumEvidenceForMastery) {
    return {
      action: "diagnose",
      reasonCode: "INSUFFICIENT_EVIDENCE",
    };
  }

  if (context.consecutiveFailures >= policy.maxConsecutiveRemediationAttempts) {
    return {
      action: "teacher_review",
      reasonCode: "PERSISTENT_DIFFICULTY",
    };
  }

  if (
    context.masteryEstimate >= 0.8 &&
    context.confidence >= policy.minimumConfidenceForAdvancement
  ) {
    return {
      action: "advance",
      reasonCode: "MASTERY_THRESHOLD_REACHED",
    };
  }

  if (context.masteryEstimate < 0.5) {
    return {
      action: "teach",
      reasonCode: "LOW_MASTERY_ESTIMATE",
    };
  }

  if (context.consecutiveFailures > 0) {
    return {
      action: "scaffold",
      reasonCode: "RECENT_DIFFICULTY",
    };
  }

  return {
    action: "practice",
    reasonCode: "PRACTICE_REQUIRED",
  };
}