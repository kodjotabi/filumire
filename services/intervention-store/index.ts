import type {
  EvidenceId,
  InstructionalStrategy,
  ResponseMode,
  InterventionType,
  LearnerId,
  CompetencyId,
  SessionId,
} from "../../packages/domain";

import type {
  InterventionId,
  InterventionOutcome,
  LearningIntervention,
} from "../../packages/domain/intervention";

import {
  persistenceStore,
} from "../persistence-provider";

import {
  evaluateInterventionEvidence,
  INTERVENTION_ENGINE_VERSION,
} from "../intervention";

function now(): string {
  return new Date().toISOString();
}

export async function createIntervention(
  input: {
    interventionId?: InterventionId;
    learnerId: LearnerId;
    competencyId: CompetencyId;
    sessionId: SessionId;
    decisionId: string;
    type: InterventionType;
    instructionalStrategy?: InstructionalStrategy;
    responseMode?: ResponseMode;
    policyVersion?: string;
  },
): Promise<LearningIntervention> {
  const timestamp = now();

  const intervention:
    LearningIntervention = {
    interventionId:
      input.interventionId ??
      `intervention-${crypto.randomUUID()}`,

    learnerId:
      input.learnerId,

    competencyId:
      input.competencyId,

    sessionId:
      input.sessionId,

    decisionId:
      input.decisionId,

    type:
      input.type,

    instructionalStrategy:
      input.instructionalStrategy,

    responseMode:
      input.responseMode,

    status:
      "active",

    startedAt:
      timestamp,

    outcome:
      "not_yet_evaluated",

    evidenceIds: [],

    policyVersion:
      input.policyVersion ??
      INTERVENTION_ENGINE_VERSION,

    createdAt:
      timestamp,

    updatedAt:
      timestamp,
  };

  await persistenceStore
    .saveIntervention(
      intervention,
    );

  return intervention;
}

export async function getIntervention(
  interventionId: InterventionId,
): Promise<
  LearningIntervention | undefined
> {
  return persistenceStore
    .getIntervention(
      interventionId,
    );
}

export async function getLearnerInterventions(
  learnerId: LearnerId,
  competencyId?: CompetencyId,
): Promise<LearningIntervention[]> {
  return persistenceStore
    .getLearnerInterventions(
      learnerId,
      competencyId,
    );
}

export async function attachEvidenceToIntervention(
  interventionId: InterventionId,
  evidenceId: EvidenceId,
): Promise<LearningIntervention> {
  const intervention =
    await getIntervention(
      interventionId,
    );

  if (!intervention) {
    throw new Error(
      `Intervention not found: ${interventionId}`,
    );
  }

  if (
    !intervention.evidenceIds.includes(
      evidenceId,
    )
  ) {
    intervention.evidenceIds.push(
      evidenceId,
    );
  }

  intervention.updatedAt =
    now();

  await persistenceStore
    .saveIntervention(
      intervention,
    );

  return intervention;
}

export async function completeIntervention(
  interventionId: InterventionId,
  outcome: InterventionOutcome,
): Promise<LearningIntervention> {
  const intervention =
    await getIntervention(
      interventionId,
    );

  if (!intervention) {
    throw new Error(
      `Intervention not found: ${interventionId}`,
    );
  }

  const timestamp =
    now();

  intervention.status =
    "completed";

  intervention.completedAt =
    timestamp;

  intervention.outcome =
    outcome;

  intervention.updatedAt =
    timestamp;

  await persistenceStore
    .saveIntervention(
      intervention,
    );

  return intervention;
}

export async function evaluateInterventionFromEvidence(
  interventionId: InterventionId,
  evidence: {
    id: EvidenceId;
    outcome:
      | "correct"
      | "incorrect"
      | "partial"
      | "skipped"
      | "observed";
  },
): Promise<LearningIntervention> {
  await attachEvidenceToIntervention(
    interventionId,
    evidence.id,
  );

  const intervention =
    await getIntervention(
      interventionId,
    );

  if (!intervention) {
    throw new Error(
      `Intervention not found: ${interventionId}`,
    );
  }

  const evaluation =
    evaluateInterventionEvidence(
      intervention,
      evidence,
    );

  if (
    evaluation.outcome ===
    "not_yet_evaluated"
  ) {
    return intervention;
  }

  return completeIntervention(
    interventionId,
    evaluation.outcome,
  );
}

/*
 * Card acknowledgement (Tranche 4B step 2).
 *
 * A teaching card (lesson, example, scaffold, remediation) is
 * acknowledged only when the learner presses Next. Displaying it,
 * refreshing or a dropped connection does not. Acknowledgement
 * marks the existing intervention delivered (status "completed",
 * outcome still "not_yet_evaluated"); it records no evidence and
 * does not change mastery. The next answered question is evaluated
 * under this intervention.
 */
export const INSTRUCTIONAL_INTERVENTION_TYPES:
  InterventionType[] = [
  "teach",
  "practice",
  "scaffold",
  "remediate",
];

export function isAwaitingInstructionCheck(
  intervention: LearningIntervention,
): boolean {
  return (
    intervention.status === "completed" &&
    intervention.outcome === "not_yet_evaluated" &&
    INSTRUCTIONAL_INTERVENTION_TYPES.includes(
      intervention.type,
    )
  );
}

export type AcknowledgeInterventionResult =
  | {
      status:
        | "acknowledged"
        | "already_acknowledged";
      intervention: LearningIntervention;
    }
  | {
      status:
        | "not_found"
        | "not_instructional"
        | "not_active";
    };

export async function acknowledgeIntervention(
  input: {
    interventionId: InterventionId;
    learnerId: LearnerId;
    competencyId: CompetencyId;
  },
): Promise<AcknowledgeInterventionResult> {
  const intervention =
    await getIntervention(
      input.interventionId,
    );

  /*
   * Another learner's (or another topic's) intervention is
   * reported as not found, so ids cannot be probed.
   */
  if (
    !intervention ||
    intervention.learnerId !==
      input.learnerId ||
    intervention.competencyId !==
      input.competencyId
  ) {
    return { status: "not_found" };
  }

  if (
    !INSTRUCTIONAL_INTERVENTION_TYPES.includes(
      intervention.type,
    )
  ) {
    return { status: "not_instructional" };
  }

  if (
    isAwaitingInstructionCheck(
      intervention,
    )
  ) {
    return {
      status: "already_acknowledged",
      intervention,
    };
  }

  if (
    intervention.status !== "active" ||
    intervention.evidenceIds.length > 0
  ) {
    return { status: "not_active" };
  }

  const timestamp =
    now();

  intervention.status =
    "completed";
  intervention.completedAt =
    timestamp;
  intervention.updatedAt =
    timestamp;

  await persistenceStore
    .saveIntervention(
      intervention,
    );

  return {
    status: "acknowledged",
    intervention,
  };
}

/*
 * An open intervention superseded by a different decision before
 * the learner acted on it.
 */
export async function cancelIntervention(
  interventionId: InterventionId,
): Promise<void> {
  const intervention =
    await getIntervention(
      interventionId,
    );

  if (
    !intervention ||
    intervention.status !== "active"
  ) {
    return;
  }

  const timestamp =
    now();

  intervention.status =
    "cancelled";
  intervention.completedAt =
    timestamp;
  intervention.updatedAt =
    timestamp;

  await persistenceStore
    .saveIntervention(
      intervention,
    );
}
