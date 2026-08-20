import type { LearningEvidence } from "../../packages/domain";
import { memoryPersistence } from "../persistence-memory";

export function saveEvidence(
  evidence: LearningEvidence,
): void {
  memoryPersistence.saveEvidence(evidence);
}

export function getEvidence(
  learnerId: string,
  competencyId: string,
): LearningEvidence[] {
  return memoryPersistence.getEvidence(
    learnerId,
    competencyId,
  );
}

export function getAllEvidence(): LearningEvidence[] {
  return memoryPersistence.getAllEvidence();
}