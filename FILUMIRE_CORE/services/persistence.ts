import type {
  LearningEvidence,
  LearnerState,
} from "../packages/domain";

import type {
  LearningIntervention,
  InterventionId,
} from "../packages/domain/intervention";

export interface PersistenceStore {
  getLearnerState(
    learnerId: string,
    competencyId: string,
  ): Promise<LearnerState | undefined>;

  saveLearnerState(
    state: LearnerState,
  ): Promise<void>;

  saveEvidence(
    evidence: LearningEvidence,
  ): Promise<void>;

  getEvidence(
    learnerId: string,
    competencyId: string,
  ): Promise<LearningEvidence[]>;

  getAllEvidence(): Promise<LearningEvidence[]>;

  createSession(
    sessionId: string,
    learnerId: string,
  ): Promise<void>;

  getSessionLearnerId(
    sessionId: string,
  ): Promise<string | undefined>;

  saveIntervention(
    intervention: LearningIntervention,
  ): Promise<void>;

  getIntervention(
    interventionId: InterventionId,
  ): Promise<LearningIntervention | undefined>;

  getLearnerInterventions(
    learnerId: string,
    competencyId?: string,
  ): Promise<LearningIntervention[]>;
}
