import type {
  AdaptiveDecision,
  CompetencyId,
  LearnerId,
  SessionId,
  LearnerState,
} from "../domain";

import type {
  LearningContent,
} from "../content";

/*
 * What assistance the learner received before answering.
 * Optional and reported by the client. It can only lower the
 * strength of evidence, never raise it above what the
 * delivering intervention allows.
 */
export interface SubmissionAssistance {
  hintsUsed?: number;
  workedExampleViewed?: boolean;
  filuAnswerRevealed?: boolean;
  attemptNumber?: number;
}

export interface AssessmentSubmission {
  learnerId: LearnerId;
  sessionId: SessionId;
  competencyId: CompetencyId;
  assessmentItemId: string;
  response: string;
  clientExpectedResponse?: string;
  interventionId?: string;

  /*
   * Optional client-generated retry key, stable across
   * repeated submissions of the exact same intended
   * answer. Used only for server-side idempotent evidence
   * writes; it never establishes correctness or trust.
   */
  clientRequestId?: string;

  assistance?: SubmissionAssistance;
}

export interface AssessmentResult {
  evidenceId: string;
  learnerId: LearnerId;
  sessionId: SessionId;
  assessmentItemId: string;
  correct: boolean;

  /*
   * True when this submission matched an already-recorded
   * evidence write (safe synchronization retry), so the
   * caller knows learner state was not re-applied.
   */
  duplicate?: boolean;
}

export interface AdaptiveDecisionRequest {
  learnerId: LearnerId;
  sessionId: SessionId;
  learnerState: LearnerState;
}

export interface AdaptiveDecisionResponse {
  decision: AdaptiveDecision;
  content: LearningContent | undefined;
  nextCompetency?: CompetencyId;
}