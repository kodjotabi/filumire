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

export async function saveLearnerState(
  state: LearnerState,
): Promise<void> {
  await persistenceStore.saveLearnerState(state);
}