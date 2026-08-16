import type {
  LearningEvidence,
  LearnerCompetencyState,
  LearnerState,
} from "../../packages/domain";

export function createInitialLearnerState(
  learnerId: string,
  competencyId: string,
): LearnerState {
  const now = new Date().toISOString();

  return {
    learnerId,
    competencies: [
      {
        learnerId,
        competencyId,
        masteryEstimate: 0,
        evidenceCount: 0,
        confidence: 0,
        lastUpdated: now,
        stateVersion: "state-0.1",
      },
    ],
    stateVersion: "state-0.1",
    updatedAt: now,
  };
}

export function applyEvidence(
  state: LearnerState,
  evidence: LearningEvidence,
): LearnerState {
  const existing = state.competencies.find(
    (competency) => competency.competencyId === evidence.competencyId,
  );

  if (!existing) {
    return state;
  }

  const outcomeScore =
    evidence.outcome === "correct"
      ? 1
      : evidence.outcome === "partial"
        ? 0.5
        : evidence.outcome === "incorrect"
          ? 0
          : existing.masteryEstimate;

  const evidenceCount = existing.evidenceCount + 1;

  const masteryEstimate =
    (existing.masteryEstimate * existing.evidenceCount + outcomeScore) /
    evidenceCount;

  const confidence = Math.min(evidenceCount / 5, 1);

  const updatedCompetency: LearnerCompetencyState = {
    ...existing,
    masteryEstimate,
    evidenceCount,
    confidence,
    lastUpdated: evidence.timestamp,
    stateVersion: "state-0.1",
  };

  return {
    ...state,
    competencies: state.competencies.map((competency) =>
      competency.competencyId === evidence.competencyId
        ? updatedCompetency
        : competency,
    ),
    stateVersion: "state-0.1",
    updatedAt: evidence.timestamp,
  };
}