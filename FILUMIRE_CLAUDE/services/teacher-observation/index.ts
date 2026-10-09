import { createHash } from "node:crypto";

import type {
  EvidenceDifficulty,
  EvidenceErrorClass,
  EvidenceIndependence,
  EvidenceOutcome,
  EvidenceRepresentation,
  EvidenceStrength,
  LearningEvidence,
} from "../../packages/domain";

import {
  saveEvidence,
} from "../evidence-store";

export const TEACHER_OBSERVATION_VERSION =
  "teacher-observation-v1";

export interface TeacherObservationInput {
  learnerId: string;
  competencyId: string;
  teacherId: string;
  outcome: EvidenceOutcome;
  independence?: EvidenceIndependence;
  supportLevel?: number;
  difficulty?: EvidenceDifficulty;
  representation?: EvidenceRepresentation;
  strength?: EvidenceStrength;
  errorClass?: EvidenceErrorClass;
  errorPattern?: string;
  prerequisiteCompetencyId?: string;
  misconceptionId?: string;
  clientRequestId: string;
}

function createEvidenceId(
  input: TeacherObservationInput,
): string {
  return `teacher-observation-${createHash("sha256")
    .update(
      [
        input.teacherId,
        input.learnerId,
        input.competencyId,
        input.clientRequestId,
      ].join("|"),
    )
    .digest("hex")
    .slice(0, 32)}`;
}

export async function recordTeacherObservation(
  input: TeacherObservationInput,
): Promise<{
  evidence: LearningEvidence;
  duplicate: boolean;
}> {
  const evidence: LearningEvidence = {
    id: createEvidenceId(input),
    learnerId: input.learnerId,
    competencyId: input.competencyId,
    source: "teacher",
    outcome: input.outcome,
    timestamp: new Date().toISOString(),
    policyVersion: TEACHER_OBSERVATION_VERSION,
    purpose: "teacher_observation",
    independence: input.independence ?? "unknown",
    supportLevel: input.supportLevel,
    difficulty: input.difficulty ?? "unknown",
    representation: input.representation ?? "unknown",
    strength: input.strength ?? "moderate",
    errorClass: input.errorClass,
    errorPattern: input.errorPattern,
    prerequisiteCompetencyId:
      input.prerequisiteCompetencyId,
    misconceptionId: input.misconceptionId,
    exposureCount: 1,
    evaluatorType: "teacher",
    evaluatorId: input.teacherId,
    evaluationPolicyVersion:
      TEACHER_OBSERVATION_VERSION,
    interpretationVersion:
      TEACHER_OBSERVATION_VERSION,
  };

  const inserted = await saveEvidence(evidence);

  return {
    evidence,
    duplicate: !inserted,
  };
}
