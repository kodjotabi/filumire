import type { LearningEvidence } from "../../packages/domain";

const evidenceStore = new Map<string, LearningEvidence[]>();

function getKey(
  learnerId: string,
  competencyId: string,
): string {
  return `${learnerId}:${competencyId}`;
}

export function saveEvidence(
  evidence: LearningEvidence,
): void {
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

export function getEvidence(
  learnerId: string,
  competencyId: string,
): LearningEvidence[] {
  return (
    evidenceStore.get(
      getKey(learnerId, competencyId),
    ) ?? []
  );
}

export function getAllEvidence(): LearningEvidence[] {
  return Array.from(evidenceStore.values()).flat();
}