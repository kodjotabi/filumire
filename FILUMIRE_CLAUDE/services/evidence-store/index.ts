import type {
  LearningEvidence,
  LearnerState,
} from "../../packages/domain";

import {
  persistenceStore,
} from "../persistence-provider";

export async function saveEvidence(
  evidence: LearningEvidence,
): Promise<boolean> {
  if (!evidence) {
    throw new Error(
      "Evidence store received undefined evidence.",
    );
  }

  return persistenceStore.saveEvidence(
    evidence,
  );
}

/*
 * Records evidence and updates learner state as a single
 * atomic unit, so evidence is never persisted without its
 * corresponding state effect (or vice versa) even under
 * concurrent/duplicate retries.
 */
export async function saveEvidenceAndUpdateLearnerState(
  evidence: LearningEvidence,
  competencyId: string,
  mutator: (
    currentState: LearnerState | undefined,
    isNewEvidence: boolean,
    evidenceHistory: LearningEvidence[],
  ) => LearnerState,
): Promise<{
  learnerState: LearnerState;
  isNewEvidence: boolean;
}> {
  if (!evidence) {
    throw new Error(
      "Evidence store received undefined evidence.",
    );
  }

  return persistenceStore.saveEvidenceAndUpdateLearnerState(
    evidence,
    competencyId,
    mutator,
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

export async function getEvidenceForLearner(
  learnerId: string,
): Promise<LearningEvidence[]> {
  return persistenceStore.getEvidenceForLearner(
    learnerId,
  );
}

export async function getAllEvidence(): Promise<
  LearningEvidence[]
> {
  return persistenceStore.getAllEvidence();
}


