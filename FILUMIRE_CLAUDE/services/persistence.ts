import type {
  AdaptiveDecision,
  LearningEvidence,
  LearnerState,
} from "../packages/domain";

import type {
  LearningIntervention,
  InterventionId,
} from "../packages/domain/intervention";

export type PrincipalLearnerRelationshipType =
  | "self"
  | "guardian"
  | "teacher";

export type PrincipalLearnerAccessStatus =
  | "active"
  | "revoked";

export interface PrincipalLearnerAccessRecord {
  id: string;
  principalId: string;
  learnerId: string;
  relationshipType: PrincipalLearnerRelationshipType;
  status: PrincipalLearnerAccessStatus;
  createdAt: string;
  updatedAt: string;
}

export type PrincipalAuthSessionStatus =
  | "active"
  | "revoked";

export interface PrincipalAuthSessionRenewal {
  idleSeconds: number;
  maxLifetimeSeconds: number;
}

export interface PrincipalAuthSessionRecord {
  id: string;
  principalId: string;
  status: PrincipalAuthSessionStatus;
  createdAt: string;
  expiresAt: string;
  lastActivityAt: string;
  revokedAt?: string;
  updatedAt: string;
}

/*
 * A learner's current position within the curriculum
 * knowledge model - separate from identity/account data and
 * from the adaptive learner-state/evidence engine. This never
 * carries provider identity, email, session or other PII.
 */
export interface LearnerLearningContextRecord {
  learnerId: string;
  curriculumVersionId: string;
  gradeId: string;
  activeSubjectId: string;
  activeCompetencyId?: string;
  updatedAt: string;
}

export type PendingTeacherReviewStatus =
  | "pending"
  | "reviewed";

export interface PendingTeacherReviewRecord {
  id: string;
  learnerId: string;
  competencyId: string;
  assessmentItemId: string;
  contentId?: string;
  sessionId: string;
  response: string;
  status: PendingTeacherReviewStatus;
  submittedAt: string;
  reviewedAt?: string;
  reviewedByPrincipalId?: string;
  evidenceId?: string;
}

export type TeacherProfessionalNoteType =
  | "context"
  | "instructional"
  | "professional_feedback";

export interface TeacherProfessionalNoteRecord {
  id: string;
  learnerId: string;
  competencyId?: string;
  authorPrincipalId: string;
  noteType: TeacherProfessionalNoteType;
  text: string;
  createdAt: string;
}
export type ParentTeacherMessageSenderRole =
  | "guardian"
  | "teacher";

export interface ParentTeacherMessageRecord {
  id: string;
  learnerId: string;
  authorPrincipalId: string;
  senderRole: ParentTeacherMessageSenderRole;
  text: string;
  createdAt: string;
}

export type ControlledTeacherActionType =
  | "request_practice"
  | "request_explanation"
  | "request_review"
  | "request_reassessment";

export type ControlledTeacherActionStatus =
  | "pending"
  | "accepted"
  | "declined"
  | "completed";

export interface ControlledTeacherActionRecord {
  id: string;
  learnerId: string;
  competencyId: string;
  teacherPrincipalId: string;
  actionType: ControlledTeacherActionType;
  reason?: string;
  status: ControlledTeacherActionStatus;
  createdAt: string;
  resolvedAt?: string;
}
export type PilotMeasurementEventType =
  | "session_started"
  | "learning_presented"
  | "response_submitted"
  | "evidence_recorded"
  | "adaptive_decision"
  | "intervention_started"
  | "intervention_completed"
  | "retention_check"
  | "transfer_check"
  | "sync_completed"
  | "runtime_error";

export interface PilotMeasurementEventRecord {
  id: string;
  learnerId: string;
  competencyId?: string;
  sessionId?: string;
  subjectId?: string;
  eventType: PilotMeasurementEventType;
  metadata: Record<
    string,
    string | number | boolean | null
  >;
  measurementVersion: string;
  createdAt: string;
}
export interface PersistenceStore {
  createPrincipal(
    principalId: string,
  ): Promise<void>;

  getPrincipalStatus(
    principalId: string,
  ): Promise<string | undefined>;

  createExternalIdentity(
    externalIdentityId: string,
    principalId: string,
    providerNamespace: string,
    providerSubject: string,
  ): Promise<void>;

  getPrincipalIdByExternalIdentity(
    providerNamespace: string,
    providerSubject: string,
  ): Promise<string | undefined>;

  resolveOrCreatePrincipalForExternalIdentity(
    providerNamespace: string,
    providerSubject: string,
  ): Promise<string>;

  createPrincipalLearnerAccess(
    accessId: string,
    principalId: string,
    learnerId: string,
    relationshipType: PrincipalLearnerRelationshipType,
  ): Promise<void>;

  getPrincipalLearnerAccess(
    principalId: string,
    learnerId: string,
    relationshipType: PrincipalLearnerRelationshipType,
  ): Promise<PrincipalLearnerAccessRecord | undefined>;

  listLearnersForPrincipal(
    principalId: string,
  ): Promise<string[]>;

  isPrincipalAuthorizedForLearner(
    principalId: string,
    learnerId: string,
  ): Promise<boolean>;

  revokePrincipalLearnerAccess(
    principalId: string,
    learnerId: string,
    relationshipType: PrincipalLearnerRelationshipType,
  ): Promise<void>;

  /*
   * Creates the relationship, or makes a revoked one active again
   * (used when a teacher is re-linked). Returns false when it was
   * already active.
   */
  activatePrincipalLearnerAccess(
    accessId: string,
    principalId: string,
    learnerId: string,
    relationshipType: PrincipalLearnerRelationshipType,
  ): Promise<boolean>;

  createPrincipalAuthSession(
    sessionId: string,
    principalId: string,
    expiresAt: string,
  ): Promise<void>;

  getPrincipalAuthSession(
    sessionId: string,
  ): Promise<PrincipalAuthSessionRecord | undefined>;

  isPrincipalAuthSessionValid(
    sessionId: string,
    principalId: string,
    at?: string,
  ): Promise<boolean>;

  /*
   * Records activity on a still-valid session. With a renewal
   * policy the expiry also slides to the earlier of
   * lastActivityAt + idleSeconds and createdAt + maxLifetimeSeconds.
   */
  updatePrincipalAuthSessionLastActivity(
    sessionId: string,
    principalId: string,
    lastActivityAt: string,
    renewal?: PrincipalAuthSessionRenewal,
  ): Promise<void>;

  revokePrincipalAuthSession(
    sessionId: string,
    principalId: string,
    revokedAt: string,
  ): Promise<void>;

  /*
   * Revokes every active session of the Principal, except the one
   * named (the device making the change). Returns how many ended.
   */
  revokeOtherPrincipalAuthSessions(
    principalId: string,
    exceptSessionId: string | undefined,
    revokedAt: string,
  ): Promise<number>;

  ensureLearnerExists(
    learnerId: string,
  ): Promise<void>;

  getLearnerState(
    learnerId: string,
    competencyId: string,
  ): Promise<LearnerState | undefined>;

  getLearnerStates(
    learnerId: string,
  ): Promise<LearnerState[]>;

  saveLearnerState(
    state: LearnerState,
  ): Promise<void>;

  updateLearnerState(
    learnerId: string,
    competencyId: string,
    mutator: (
      currentState: LearnerState | undefined,
    ) => Promise<LearnerState> | LearnerState,
  ): Promise<LearnerState>;

  /*
   * Returns true only when this call actually inserted a
   * new evidence row. Returns false when an evidence row
   * with the same id already existed (a safe, idempotent
   * synchronization retry), so callers can avoid re-applying
   * evidence to learner state.
   */
  savePendingTeacherReview(
    review: PendingTeacherReviewRecord,
  ): Promise<boolean>;

  getPendingTeacherReview(
    reviewId: string,
  ): Promise<PendingTeacherReviewRecord | undefined>;

  getPendingTeacherReviews(
    learnerId: string,
  ): Promise<PendingTeacherReviewRecord[]>;

  markPendingTeacherReviewReviewed(
    reviewId: string,
    reviewedByPrincipalId: string,
    evidenceId: string,
    reviewedAt: string,
  ): Promise<void>;
  saveTeacherProfessionalNote(
    note: TeacherProfessionalNoteRecord,
  ): Promise<boolean>;

  getTeacherProfessionalNotes(
    learnerId: string,
  ): Promise<TeacherProfessionalNoteRecord[]>;
  saveParentTeacherMessage(
    message: ParentTeacherMessageRecord,
  ): Promise<boolean>;

  getParentTeacherMessages(
    learnerId: string,
  ): Promise<ParentTeacherMessageRecord[]>;

  savePilotMeasurementEvent(
    event: PilotMeasurementEventRecord,
  ): Promise<boolean>;

  getPilotMeasurementEvents(
    learnerId: string,
  ): Promise<PilotMeasurementEventRecord[]>;
  saveEvidence(
    evidence: LearningEvidence,
  ): Promise<boolean>;

  /*
   * Atomically records evidence and updates learner state as
   * a single unit of work, guaranteeing evidence is never
   * persisted without its corresponding learner-state effect
   * (or vice versa) even under concurrent/duplicate retries.
   * `mutator` receives whether the evidence write was new so
   * it can skip re-applying evidence on a duplicate retry.
   */
  saveEvidenceAndUpdateLearnerState(
    evidence: LearningEvidence,
    competencyId: string,
    mutator: (
      currentState: LearnerState | undefined,
      isNewEvidence: boolean,
      evidenceHistory: LearningEvidence[],
    ) => LearnerState,
  ): Promise<{
    learnerState: LearnerState;
    isNewEvidence: boolean;
  }>;

  getEvidence(
    learnerId: string,
    competencyId: string,
  ): Promise<LearningEvidence[]>;

  getEvidenceForLearner(
    learnerId: string,
  ): Promise<LearningEvidence[]>;

  getAllEvidence(): Promise<LearningEvidence[]>;


  createSession(
    sessionId: string,
    learnerId: string,
  ): Promise<void>;

  getSessionLearnerId(
    sessionId: string,
  ): Promise<string | undefined>;

  isSessionActive(sessionId: string, learnerId: string): Promise<boolean>;

  revokeSession(sessionId: string, learnerId: string): Promise<void>;

  saveControlledTeacherAction(
    action: ControlledTeacherActionRecord,
  ): Promise<boolean>;

  getControlledTeacherActions(
    learnerId: string,
    competencyId?: string,
  ): Promise<ControlledTeacherActionRecord[]>;
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

  getLearnerLearningContext(
    learnerId: string,
  ): Promise<LearnerLearningContextRecord | undefined>;

  saveLearnerLearningContext(
    context: LearnerLearningContextRecord,
  ): Promise<void>;
}














