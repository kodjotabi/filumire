import type { LearnerState } from "../../packages/domain";
import { persistenceStore } from "../persistence-provider";

export async function getLearnerState(
  learnerId: string,
  competencyId: string,
): Promise<LearnerState | undefined> {
  return persistenceStore.getLearnerState(
    learnerId,
    competencyId,
  );
}

export async function getLearnerStates(
  learnerId: string,
): Promise<LearnerState[]> {
  return persistenceStore.getLearnerStates(
    learnerId,
  );
}
export async function saveLearnerState(
  state: LearnerState,
): Promise<void> {
  await persistenceStore.saveLearnerState(state);
}

export async function updateLearnerState(
  learnerId: string,
  competencyId: string,
  mutator: (
    currentState: LearnerState | undefined,
  ) => Promise<LearnerState> | LearnerState,
): Promise<LearnerState> {
  return persistenceStore.updateLearnerState(
    learnerId,
    competencyId,
    mutator,
  );
}
