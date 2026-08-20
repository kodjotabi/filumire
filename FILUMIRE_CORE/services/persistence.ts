import type {
  LearningEvidence,
  LearnerState,
} from "../packages/domain";

export interface PersistenceStore {
  getLearnerState(
    learnerId: string,
    competencyId: string,
  ): LearnerState | undefined;

  saveLearnerState(
    state: LearnerState,
  ): void;

  saveEvidence(
    evidence: LearningEvidence,
  ): void;

  getEvidence(
    learnerId: string,
    competencyId: string,
  ): LearningEvidence[];

  getAllEvidence(): LearningEvidence[];
}