import type {
  LearningEvidence,
  LearnerState,
} from "../packages/domain";

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
}