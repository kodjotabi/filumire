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
      "intervention-0.3",

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

  let outcome:
    InterventionOutcome =
    "not_yet_evaluated";

  if (
    evidence.outcome ===
    "correct"
  ) {
    if (
      intervention.type ===
      "retention_check"
    ) {
      outcome =
        "effective_with_retention";
    } else if (
      intervention.type ===
      "transfer_check"
    ) {
      outcome =
        "effective_with_transfer";
    } else {
      outcome =
        "effective";
    }
  } else if (
    evidence.outcome ===
    "partial"
  ) {
    outcome =
      "partial_recovery";
  } else if (
    evidence.outcome ===
    "incorrect"
  ) {
    outcome =
      "ineffective";
  }

  return completeIntervention(
    interventionId,
    outcome,
  );
}