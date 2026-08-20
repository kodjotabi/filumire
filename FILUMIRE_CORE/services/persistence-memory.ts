import type {
  LearningEvidence,
  LearnerState,
} from "../packages/domain";
import type { PersistenceStore } from "./persistence";

const learnerStates = new Map<string, LearnerState>();
const evidenceStore = new Map<string, LearningEvidence[]>();

function getKey(
  learnerId: string,
  competencyId: string,
): string {
  return `${learnerId}:${competencyId}`;
}

export class MemoryPersistenceStore
  implements PersistenceStore
{
  async getLearnerState(
    learnerId: string,
    competencyId: string,
  ): Promise<LearnerState | undefined> {
    return learnerStates.get(
      getKey(learnerId, competencyId),
    );
  }

  async saveLearnerState(
    state: LearnerState,
  ): Promise<void> {
    for (const competency of state.competencies) {
      learnerStates.set(
        getKey(
          state.learnerId,
          competency.competencyId,
        ),
        state,
      );
    }
  }

  async saveEvidence(
    evidence: LearningEvidence,
  ): Promise<void> {
    const key = getKey(
      evidence.learnerId,
      evidence.competencyId,
    );

    const existing = evidenceStore.get(key) ?? [];

    evidenceStore.set(key, [
      ...existing,
      evidence,
    ]);
  }

  async getEvidence(
    learnerId: string,
    competencyId: string,
  ): Promise<LearningEvidence[]> {
    return (
      evidenceStore.get(
        getKey(learnerId, competencyId),
      ) ?? []
    );
  }

  async getAllEvidence(): Promise<LearningEvidence[]> {
    return Array.from(
      evidenceStore.values(),
    ).flat();
  }
}

export const memoryPersistence =
  new MemoryPersistenceStore();