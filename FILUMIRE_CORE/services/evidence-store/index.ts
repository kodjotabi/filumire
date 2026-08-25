import type {
  LearningEvidence,
} from "../../packages/domain";

import {
  persistenceStore,
} from "../persistence-provider";

export async function saveEvidence(
  evidence: LearningEvidence,
): Promise<void> {
  if (!evidence) {
    throw new Error(
      "Evidence store received undefined evidence.",
    );
  }

  await persistenceStore.saveEvidence(
    evidence,
  );
}

export async function getEvidence(
  learnerId: string,
  competencyId: string,
): Promise<LearningEvidence[]> {
  return persistenceStore.getEvidence(
    learnerId,
    competencyId,
  );
}

export async function getAllEvidence(): Promise<
  LearningEvidence[]
> {
  return persistenceStore.getAllEvidence();
}
