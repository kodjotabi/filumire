import type { LearnerState } from "../../packages/domain";

const learnerStates = new Map<string, LearnerState>();

function getKey(learnerId: string, competencyId: string): string {
  return `${learnerId}:${competencyId}`;
}

export function getLearnerState(
  learnerId: string,
  competencyId: string,
): LearnerState | undefined {
  return learnerStates.get(getKey(learnerId, competencyId));
}

export function saveLearnerState(state: LearnerState): void {
  for (const competency of state.competencies) {
    learnerStates.set(
      getKey(state.learnerId, competency.competencyId),
      state,
    );
  }
}