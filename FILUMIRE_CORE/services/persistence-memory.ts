import type {
  LearningEvidence,
  LearnerState,
} from "../packages/domain";

import type {
  LearningIntervention,
  InterventionId,
} from "../packages/domain/intervention";

import type { PersistenceStore } from "./persistence";

const learnerStates =
  new Map<string, LearnerState>();

const evidenceStore =
  new Map<string, LearningEvidence[]>();

const sessions =
  new Map<string, string>();

const interventions =
  new Map<
    InterventionId,
    LearningIntervention
  >();

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
      getKey(
        learnerId,
        competencyId,
      ),
    );
  }

  async saveLearnerState(
    state: LearnerState,
  ): Promise<void> {
    for (
      const competency of
        state.competencies
    ) {
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
    const key =
      getKey(
        evidence.learnerId,
        evidence.competencyId,
      );

    const existing =
      evidenceStore.get(key) ??
      [];

    evidenceStore.set(
      key,
      [
        ...existing,
        evidence,
      ],
    );
  }

  async getEvidence(
    learnerId: string,
    competencyId: string,
  ): Promise<LearningEvidence[]> {
    return (
      evidenceStore.get(
        getKey(
          learnerId,
          competencyId,
        ),
      ) ?? []
    );
  }

  async getAllEvidence(): Promise<LearningEvidence[]> {
    return Array.from(
      evidenceStore.values(),
    ).flat();
  }

  async createSession(
    sessionId: string,
    learnerId: string,
  ): Promise<void> {
    sessions.set(
      sessionId,
      learnerId,
    );
  }

  async getSessionLearnerId(
    sessionId: string,
  ): Promise<string | undefined> {
    return sessions.get(
      sessionId,
    );
  }

  async saveIntervention(
    intervention: LearningIntervention,
  ): Promise<void> {
    interventions.set(
      intervention.interventionId,
      {
        ...intervention,
        evidenceIds: [
          ...intervention.evidenceIds,
        ],
      },
    );
  }

  async getIntervention(
    interventionId: InterventionId,
  ): Promise<LearningIntervention | undefined> {
    const intervention =
      interventions.get(
        interventionId,
      );

    return intervention
      ? {
          ...intervention,
          evidenceIds: [
            ...intervention.evidenceIds,
          ],
        }
      : undefined;
  }

  async getLearnerInterventions(
    learnerId: string,
    competencyId?: string,
  ): Promise<LearningIntervention[]> {
    return Array.from(
      interventions.values(),
    ).filter(
      (intervention) =>
        intervention.learnerId ===
          learnerId &&
        (
          competencyId ===
            undefined ||
          intervention.competencyId ===
            competencyId
        ),
    );
  }
}

export const memoryPersistence =
  new MemoryPersistenceStore();
