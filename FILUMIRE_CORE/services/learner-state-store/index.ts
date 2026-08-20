import type { LearnerState } from "../../packages/domain";
import { memoryPersistence } from "../persistence-memory";

export function getLearnerState(
  learnerId: string,
  competencyId: string,
): LearnerState | undefined {
  return memoryPersistence.getLearnerState(
    learnerId,
    competencyId,
  );
}

export function saveLearnerState(
  state: LearnerState,
): void {
  memoryPersistence.saveLearnerState(state);
}