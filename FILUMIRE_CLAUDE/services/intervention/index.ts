import type {
  EvidenceOutcome,
  InterventionType,
  LearningEvidence,
} from "../../packages/domain";

import type {
  InterventionOutcome,
  LearningIntervention,
} from "../../packages/domain/intervention";

export const INTERVENTION_ENGINE_VERSION = "intervention-v1";

export type InterventionFamily =
  | "conceptual_reteach"
  | "prerequisite_repair"
  | "misconception_correction"
  | "procedural_guidance"
  | "representation_change"
  | "language_support"
  | "guided_practice"
  | "scaffold_fade"
  | "independent_practice"
  | "retrieval"
  | "transfer"
  | "extension";

export type InterventionPlanStatus =
  | "planned"
  | "active"
  | "paused"
  | "completed"
  | "failed"
  | "superseded"
  | "escalated";

export type InterventionSupportLevel =
  | "worked_example"
  | "guided_solution"
  | "partial_scaffold"
  | "strategic_hint"
  | "conceptual_prompt"
  | "attention_cue"
  | "independent";

export interface InterventionPlan {
  originalTarget: string;
  interventionTarget: string;
  diagnosis?: string;
  interventionFamily: InterventionFamily;
  objective: string;
  supportLevel: InterventionSupportLevel;
  representations: string[];
  steps: string[];
  successCriteria: string[];
  failureCriteria: string[];
  exitCriteria: string[];
  returnTarget: string;
  maximumCycles: number;
  status: InterventionPlanStatus;
  version: string;
}

export interface InterventionEvaluation {
  outcome: InterventionOutcome;
  successful: boolean;
  shouldExit: boolean;
  shouldEscalate: boolean;
  reasonCode:
    | "INTERVENTION_EFFECTIVE"
    | "INTERVENTION_PARTIAL_RECOVERY"
    | "INTERVENTION_INEFFECTIVE"
    | "RETENTION_CONFIRMED"
    | "TRANSFER_CONFIRMED"
    | "INTERVENTION_NOT_EVALUATED";
  version: string;
}

export function inferInterventionOutcome(
  interventionType: InterventionType,
  evidenceOutcome: EvidenceOutcome,
): InterventionOutcome {
  if (evidenceOutcome === "correct") {
    if (interventionType === "retention_check") {
      return "effective_with_retention";
    }

    if (interventionType === "transfer_check") {
      return "effective_with_transfer";
    }

    return "effective";
  }

  if (evidenceOutcome === "partial") {
    return "partial_recovery";
  }

  if (evidenceOutcome === "incorrect") {
    return "ineffective";
  }

  return "not_yet_evaluated";
}

export function evaluateInterventionEvidence(
  intervention: Pick<LearningIntervention, "type" | "outcome">,
  evidence: Pick<LearningEvidence, "outcome">,
): InterventionEvaluation {
  const outcome = inferInterventionOutcome(
    intervention.type,
    evidence.outcome,
  );

  switch (outcome) {
    case "effective_with_retention":
      return {
        outcome,
        successful: true,
        shouldExit: true,
        shouldEscalate: false,
        reasonCode: "RETENTION_CONFIRMED",
        version: INTERVENTION_ENGINE_VERSION,
      };

    case "effective_with_transfer":
      return {
        outcome,
        successful: true,
        shouldExit: true,
        shouldEscalate: false,
        reasonCode: "TRANSFER_CONFIRMED",
        version: INTERVENTION_ENGINE_VERSION,
      };

    case "effective":
      return {
        outcome,
        successful: true,
        shouldExit: true,
        shouldEscalate: false,
        reasonCode: "INTERVENTION_EFFECTIVE",
        version: INTERVENTION_ENGINE_VERSION,
      };

    case "partial_recovery":
      return {
        outcome,
        successful: false,
        shouldExit: false,
        shouldEscalate: false,
        reasonCode: "INTERVENTION_PARTIAL_RECOVERY",
        version: INTERVENTION_ENGINE_VERSION,
      };

    case "ineffective":
      return {
        outcome,
        successful: false,
        shouldExit: false,
        shouldEscalate: true,
        reasonCode: "INTERVENTION_INEFFECTIVE",
        version: INTERVENTION_ENGINE_VERSION,
      };

    default:
      return {
        outcome,
        successful: false,
        shouldExit: false,
        shouldEscalate: false,
        reasonCode: "INTERVENTION_NOT_EVALUATED",
        version: INTERVENTION_ENGINE_VERSION,
      };
  }
}
