import type {
  LearningEvidence,
  LearnerState,
} from "../packages/domain";

import type {
  LearningIntervention,
  InterventionId,
} from "../packages/domain/intervention";

import type { PersistenceStore } from "./persistence";
import type {
  PrincipalLearnerRelationshipType,
  PrincipalLearnerAccessRecord,
  PrincipalAuthSessionRecord,
  PrincipalAuthSessionRenewal,
  LearnerLearningContextRecord,
  PendingTeacherReviewRecord,
  TeacherProfessionalNoteRecord,
  ParentTeacherMessageRecord,
  ControlledTeacherActionRecord,
  PilotMeasurementEventRecord,
} from "./persistence";

const principals =
  new Map<string, string>();

const externalIdentitiesByProviderKey =
  new Map<string, string>();

const externalIdentityIds =
  new Set<string>();

const learners =
  new Set<string>();

const principalLearnerAccessRecords =
  new Map<string, PrincipalLearnerAccessRecord>();

const authSessions =
  new Map<string, PrincipalAuthSessionRecord>();

const learnerStates =
  new Map<string, LearnerState>();

const learnerLearningContexts =
  new Map<string, LearnerLearningContextRecord>();

const pendingTeacherReviews =
  new Map<string, PendingTeacherReviewRecord>();
const teacherProfessionalNotes =
  new Map<string, TeacherProfessionalNoteRecord>();
const parentTeacherMessages =
  new Map<string, ParentTeacherMessageRecord>();
const controlledTeacherActions =
  new Map<string, ControlledTeacherActionRecord>();
const pilotMeasurementEvents =
  new Map<string, PilotMeasurementEventRecord>();
const evidenceStore =
  new Map<string, LearningEvidence[]>();


const sessions =
  new Map<string, string>();

const sessionStatuses =
  new Map<string, "active" | "revoked">();

const interventions =
  new Map<
    InterventionId,
    LearningIntervention
  >();

const learnerStateLocks =
  new Map<string, Promise<void>>();

const providerIdentityLocks =
  new Map<string, Promise<void>>();

async function withProviderIdentityLock<T>(
  key: string,
  fn: () => Promise<T>,
): Promise<T> {
  const currentLock =
    providerIdentityLocks.get(key) ?? Promise.resolve();

  let releaseLock!: () => void;

  const nextLock = new Promise<void>((resolve) => {
    releaseLock = resolve;
  });

  const queuedLock = currentLock.then(
    () => nextLock,
    () => nextLock,
  );

  providerIdentityLocks.set(
    key,
    queuedLock,
  );

  await currentLock;

  try {
    return await fn();
  } finally {
    releaseLock();

    if (providerIdentityLocks.get(key) === queuedLock) {
      providerIdentityLocks.delete(key);
    }
  }
}

async function withLearnerLock<T>(
  key: string,
  fn: () => Promise<T>,
): Promise<T> {
  const currentLock =
    learnerStateLocks.get(key) ?? Promise.resolve();

  let releaseLock!: () => void;

  const nextLock = new Promise<void>((resolve) => {
    releaseLock = resolve;
  });

  const queuedLock = currentLock.then(
    () => nextLock,
    () => nextLock,
  );

  learnerStateLocks.set(
    key,
    queuedLock,
  );

  await currentLock;

  try {
    return await fn();
  } finally {
    releaseLock();

    if (learnerStateLocks.get(key) === queuedLock) {
      learnerStateLocks.delete(key);
    }
  }
}

function getKey(
  learnerId: string,
  competencyId: string,
): string {
  return `${learnerId}:${competencyId}`;
}

function getProviderKey(
  providerNamespace: string,
  providerSubject: string,
): string {
  return JSON.stringify([
    providerNamespace,
    providerSubject,
  ]);
}

function getPrincipalLearnerAccessKey(
  principalId: string,
  learnerId: string,
  relationshipType: string,
): string {
  return JSON.stringify([
    principalId,
    learnerId,
    relationshipType,
  ]);
}

export class MemoryPersistenceStore
  implements PersistenceStore
{
  async createPrincipal(
    principalId: string,
  ): Promise<void> {
    if (!principals.has(principalId)) {
      principals.set(
        principalId,
        "active",
      );
    }
  }

  async getPrincipalStatus(
    principalId: string,
  ): Promise<string | undefined> {
    return principals.get(
      principalId,
    );
  }

  async createExternalIdentity(
    externalIdentityId: string,
    principalId: string,
    providerNamespace: string,
    providerSubject: string,
  ): Promise<void> {
    if (!principals.has(principalId)) {
      throw new Error(
        `Principal not found: ${principalId}`,
      );
    }

    if (externalIdentityIds.has(externalIdentityId)) {
      throw new Error(
        `External identity already exists: ${externalIdentityId}`,
      );
    }

    const providerKey =
      getProviderKey(
        providerNamespace,
        providerSubject,
      );

    if (
      externalIdentitiesByProviderKey.has(
        providerKey,
      )
    ) {
      throw new Error(
        `External identity already mapped for provider namespace and subject: ${providerKey}`,
      );
    }

    externalIdentitiesByProviderKey.set(
      providerKey,
      principalId,
    );

    externalIdentityIds.add(
      externalIdentityId,
    );
  }

  async getPrincipalIdByExternalIdentity(
    providerNamespace: string,
    providerSubject: string,
  ): Promise<string | undefined> {
    return externalIdentitiesByProviderKey.get(
      getProviderKey(
        providerNamespace,
        providerSubject,
      ),
    );
  }

  async resolveOrCreatePrincipalForExternalIdentity(
    providerNamespace: string,
    providerSubject: string,
  ): Promise<string> {
    const providerKey =
      getProviderKey(
        providerNamespace,
        providerSubject,
      );

    return withProviderIdentityLock(
      providerKey,
      async () => {
        const existingPrincipalId =
          externalIdentitiesByProviderKey.get(
            providerKey,
          );

        if (existingPrincipalId) {
          return existingPrincipalId;
        }

        const principalId = crypto.randomUUID();
        const externalIdentityId = crypto.randomUUID();

        principals.set(
          principalId,
          "active",
        );

        externalIdentitiesByProviderKey.set(
          providerKey,
          principalId,
        );

        externalIdentityIds.add(
          externalIdentityId,
        );

        return principalId;
      },
    );
  }

  async activatePrincipalLearnerAccess(
    accessId: string,
    principalId: string,
    learnerId: string,
    relationshipType: PrincipalLearnerRelationshipType,
  ): Promise<boolean> {
    const existing = principalLearnerAccessRecords.get(
      getPrincipalLearnerAccessKey(principalId, learnerId, relationshipType),
    );

    if (!existing) {
      await this.createPrincipalLearnerAccess(
        accessId,
        principalId,
        learnerId,
        relationshipType,
      );
      return true;
    }

    if (existing.status === "active") {
      return false;
    }

    existing.status = "active";
    existing.updatedAt = new Date().toISOString();
    return true;
  }

  async createPrincipalLearnerAccess(
    accessId: string,
    principalId: string,
    learnerId: string,
    relationshipType: PrincipalLearnerRelationshipType,
  ): Promise<void> {
    if (!principals.has(principalId)) {
      throw new Error(
        `Principal not found: ${principalId}`,
      );
    }

    if (!learners.has(learnerId)) {
      throw new Error(
        `Learner not found: ${learnerId}`,
      );
    }

    const key =
      getPrincipalLearnerAccessKey(
        principalId,
        learnerId,
        relationshipType,
      );

    if (principalLearnerAccessRecords.has(key)) {
      throw new Error(
        `Principal-learner access already exists for relationship: ${key}`,
      );
    }

    const now = new Date().toISOString();

    principalLearnerAccessRecords.set(key, {
      id: accessId,
      principalId,
      learnerId,
      relationshipType,
      status: "active",
      createdAt: now,
      updatedAt: now,
    });
  }

  async getPrincipalLearnerAccess(
    principalId: string,
    learnerId: string,
    relationshipType: PrincipalLearnerRelationshipType,
  ): Promise<PrincipalLearnerAccessRecord | undefined> {
    const record =
      principalLearnerAccessRecords.get(
        getPrincipalLearnerAccessKey(
          principalId,
          learnerId,
          relationshipType,
        ),
      );

    return record ? { ...record } : undefined;
  }

  async listLearnersForPrincipal(
    principalId: string,
  ): Promise<string[]> {
    const learnerIds = new Set<string>();

    for (const record of principalLearnerAccessRecords.values()) {
      if (
        record.principalId === principalId &&
        record.status === "active"
      ) {
        learnerIds.add(record.learnerId);
      }
    }

    return Array.from(learnerIds);
  }

  async isPrincipalAuthorizedForLearner(
    principalId: string,
    learnerId: string,
  ): Promise<boolean> {
    for (const record of principalLearnerAccessRecords.values()) {
      if (
        record.principalId === principalId &&
        record.learnerId === learnerId &&
        record.status === "active"
      ) {
        return true;
      }
    }

    return false;
  }

  async revokeAllLearnerAccess(learnerId: string): Promise<void> {
    const now = new Date().toISOString();
    for (const record of principalLearnerAccessRecords.values()) {
      if (record.learnerId === learnerId) {
        record.status = "revoked";
        record.updatedAt = now;
      }
    }
  }

  async revokePrincipalLearnerAccess(
    principalId: string,
    learnerId: string,
    relationshipType: PrincipalLearnerRelationshipType,
  ): Promise<void> {
    const record =
      principalLearnerAccessRecords.get(
        getPrincipalLearnerAccessKey(
          principalId,
          learnerId,
          relationshipType,
        ),
      );

    if (!record) {
      return;
    }

    record.status = "revoked";
    record.updatedAt = new Date().toISOString();
  }

  async createPrincipalAuthSession(
    sessionId: string,
    principalId: string,
    expiresAt: string,
  ): Promise<void> {
    if (!principals.has(principalId)) {
      throw new Error(
        `Principal not found: ${principalId}`,
      );
    }

    if (authSessions.has(sessionId)) {
      throw new Error(
        `Principal auth session already exists: ${sessionId}`,
      );
    }

    const now = new Date().toISOString();

    authSessions.set(sessionId, {
      id: sessionId,
      principalId,
      status: "active",
      createdAt: now,
      expiresAt,
      lastActivityAt: now,
      updatedAt: now,
    });
  }

  async getPrincipalAuthSession(
    sessionId: string,
  ): Promise<PrincipalAuthSessionRecord | undefined> {
    const record = authSessions.get(sessionId);

    return record ? { ...record } : undefined;
  }

  async isPrincipalAuthSessionValid(
    sessionId: string,
    principalId: string,
    at = new Date().toISOString(),
  ): Promise<boolean> {
    const record = authSessions.get(sessionId);

    return (
      record?.principalId === principalId &&
      record.status === "active" &&
      new Date(record.expiresAt).getTime() >
        new Date(at).getTime() &&
      record.revokedAt === undefined
    );
  }

  async updatePrincipalAuthSessionLastActivity(
    sessionId: string,
    principalId: string,
    lastActivityAt: string,
    renewal?: PrincipalAuthSessionRenewal,
  ): Promise<void> {
    const record = authSessions.get(sessionId);
    const activityTime = new Date(lastActivityAt).getTime();

    if (
      !record ||
      record.principalId !== principalId ||
      record.status !== "active" ||
      record.revokedAt !== undefined ||
      new Date(record.expiresAt).getTime() <= activityTime
    ) {
      return;
    }

    record.lastActivityAt = lastActivityAt;
    record.updatedAt = lastActivityAt;

    if (renewal) {
      record.expiresAt = new Date(
        Math.min(
          activityTime + renewal.idleSeconds * 1000,
          new Date(record.createdAt).getTime() +
            renewal.maxLifetimeSeconds * 1000,
        ),
      ).toISOString();
    }
  }

  async revokePrincipalAuthSession(
    sessionId: string,
    principalId: string,
    revokedAt: string,
  ): Promise<void> {
    const record = authSessions.get(sessionId);

    if (!record || record.principalId !== principalId) {
      return;
    }

    record.status = "revoked";
    record.revokedAt = revokedAt;
    record.updatedAt = revokedAt;
  }

  async revokeOtherPrincipalAuthSessions(
    principalId: string,
    exceptSessionId: string | undefined,
    revokedAt: string,
  ): Promise<number> {
    let revoked = 0;

    for (const record of authSessions.values()) {
      if (
        record.principalId === principalId &&
        record.id !== exceptSessionId &&
        record.status === "active"
      ) {
        record.status = "revoked";
        record.revokedAt = revokedAt;
        record.updatedAt = revokedAt;
        revoked += 1;
      }
    }

    return revoked;
  }

  async ensureLearnerExists(
    learnerId: string,
  ): Promise<void> {
    learners.add(
      learnerId,
    );
  }

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

  async getLearnerStates(
    learnerId: string,
  ): Promise<LearnerState[]> {
    const uniqueStates = new Map<string, LearnerState>();

    for (const state of learnerStates.values()) {
      if (state.learnerId !== learnerId) {
        continue;
      }

      const competencyIds = state.competencies
        .map((competency) => competency.competencyId)
        .sort()
        .join("|");

      uniqueStates.set(
        `${state.learnerId}:${competencyIds}`,
        state,
      );
    }

    return [...uniqueStates.values()];
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

  async updateLearnerState(
    learnerId: string,
    competencyId: string,
    mutator: (
      currentState: LearnerState | undefined,
    ) => Promise<LearnerState> | LearnerState,
  ): Promise<LearnerState> {
    const key =
      getKey(
        learnerId,
        competencyId,
      );

    return withLearnerLock(
      key,
      async () => {
        const currentState =
          await this.getLearnerState(
            learnerId,
            competencyId,
          );

        const nextState =
          await mutator(
            currentState,
          );

        await this.saveLearnerState(
          nextState,
        );

        return nextState;
      },
    );
  }

  async saveParentTeacherMessage(
    message: ParentTeacherMessageRecord,
  ): Promise<boolean> {
    if (parentTeacherMessages.has(message.id)) {
      return false;
    }

    parentTeacherMessages.set(
      message.id,
      { ...message },
    );

    return true;
  }

  async getParentTeacherMessages(
    learnerId: string,
  ): Promise<ParentTeacherMessageRecord[]> {
    return Array.from(
      parentTeacherMessages.values(),
    )
      .filter(
        (message) =>
          message.learnerId === learnerId,
      )
      .map((message) => ({
        ...message,
      }))
      .sort((a, b) =>
        b.createdAt.localeCompare(a.createdAt),
      );
  }

  async saveTeacherProfessionalNote(
    note: TeacherProfessionalNoteRecord,
  ): Promise<boolean> {
    if (teacherProfessionalNotes.has(note.id)) {
      return false;
    }

    teacherProfessionalNotes.set(
      note.id,
      { ...note },
    );

    return true;
  }

  async getTeacherProfessionalNotes(
    learnerId: string,
  ): Promise<TeacherProfessionalNoteRecord[]> {
    return Array.from(
      teacherProfessionalNotes.values(),
    )
      .filter(
        (note) => note.learnerId === learnerId,
      )
      .map((note) => ({ ...note }))
      .sort((a, b) =>
        b.createdAt.localeCompare(a.createdAt),
      );
  }
  async savePendingTeacherReview(
    review: PendingTeacherReviewRecord,
  ): Promise<boolean> {
    if (pendingTeacherReviews.has(review.id)) {
      return false;
    }

    pendingTeacherReviews.set(
      review.id,
      { ...review },
    );

    return true;
  }

  async getPendingTeacherReview(
    reviewId: string,
  ): Promise<PendingTeacherReviewRecord | undefined> {
    const review =
      pendingTeacherReviews.get(reviewId);

    return review
      ? { ...review }
      : undefined;
  }

  async getPendingTeacherReviews(
    learnerId: string,
  ): Promise<PendingTeacherReviewRecord[]> {
    return Array.from(
      pendingTeacherReviews.values(),
    )
      .filter(
        (review) =>
          review.learnerId === learnerId &&
          review.status === "pending",
      )
      .map((review) => ({ ...review }))
      .sort((a, b) =>
        b.submittedAt.localeCompare(a.submittedAt),
      );
  }

  async markPendingTeacherReviewReviewed(
    reviewId: string,
    reviewedByPrincipalId: string,
    evidenceId: string,
    reviewedAt: string,
  ): Promise<void> {
    const review =
      pendingTeacherReviews.get(reviewId);

    if (!review) {
      throw new Error(
        "Pending teacher review not found.",
      );
    }

    pendingTeacherReviews.set(
      reviewId,
      {
        ...review,
        status: "reviewed",
        reviewedAt,
        reviewedByPrincipalId,
        evidenceId,
      },
    );
  }
  async saveEvidence(
    evidence: LearningEvidence,
  ): Promise<boolean> {
    const key =
      getKey(
        evidence.learnerId,
        evidence.competencyId,
      );

    const existing =
      evidenceStore.get(key) ?? [];

    if (
      existing.some(
        (item) => item.id === evidence.id,
      )
    ) {
      return false;
    }

    evidenceStore.set(
      key,
      [
        ...existing,
        evidence,
      ],
    );

    return true;
  }

  async saveEvidenceAndUpdateLearnerState(
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
  }> {
    const stateKey =
      getKey(
        evidence.learnerId,
        competencyId,
      );

    return withLearnerLock(
      stateKey,
      async () => {
        const isNewEvidence =
          await this.saveEvidence(
            evidence,
          );

        const currentState =
          await this.getLearnerState(
            evidence.learnerId,
            competencyId,
          );

        const evidenceHistory =
          await this.getEvidence(
            evidence.learnerId,
            competencyId,
          );

        const nextState =
          mutator(
            currentState,
            isNewEvidence,
            evidenceHistory,
          );

        await this.saveLearnerState(
          nextState,
        );

        return {
          learnerState: nextState,
          isNewEvidence,
        };
      },
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

  async getEvidenceForLearner(
    learnerId: string,
  ): Promise<LearningEvidence[]> {
    return Array.from(
      evidenceStore.values(),
    )
      .flat()
      .filter(
        (evidence) => evidence.learnerId === learnerId,
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

    sessionStatuses.set(
      sessionId,
      "active",
    );
  }

  async getSessionLearnerId(
    sessionId: string,
  ): Promise<string | undefined> {
    return sessions.get(
      sessionId,
    );
  }

  async isSessionActive(
    sessionId: string,
    learnerId: string,
  ): Promise<boolean> {
    const owner =
      sessions.get(
        sessionId,
      );

    const status =
      sessionStatuses.get(
        sessionId,
      ) ?? "active";

    return (
      owner === learnerId &&
      status === "active"
    );
  }

  async revokeSession(
    sessionId: string,
    learnerId: string,
  ): Promise<void> {
    const owner =
      sessions.get(
        sessionId,
      );

    if (owner === learnerId) {
      sessionStatuses.set(
        sessionId,
        "revoked",
      );
    }
  }

  async saveControlledTeacherAction(
    action: ControlledTeacherActionRecord,
  ): Promise<boolean> {
    if (controlledTeacherActions.has(action.id)) {
      return false;
    }

    controlledTeacherActions.set(
      action.id,
      { ...action },
    );

    return true;
  }

  async getControlledTeacherActions(
    learnerId: string,
    competencyId?: string,
  ): Promise<ControlledTeacherActionRecord[]> {
    return Array.from(
      controlledTeacherActions.values(),
    )
      .filter(
        (action) =>
          action.learnerId === learnerId &&
          (
            competencyId === undefined ||
            action.competencyId === competencyId
          ),
      )
      .map((action) => ({ ...action }))
      .sort((a, b) =>
        b.createdAt.localeCompare(a.createdAt),
      );
  }
  async savePilotMeasurementEvent(
    event: PilotMeasurementEventRecord,
  ): Promise<boolean> {
    if (pilotMeasurementEvents.has(event.id)) {
      return false;
    }

    pilotMeasurementEvents.set(
      event.id,
      {
        ...event,
        metadata: { ...event.metadata },
      },
    );

    return true;
  }

  async getPilotMeasurementEvents(
    learnerId: string,
  ): Promise<PilotMeasurementEventRecord[]> {
    return Array.from(
      pilotMeasurementEvents.values(),
    )
      .filter(
        (event) =>
          event.learnerId === learnerId,
      )
      .map((event) => ({
        ...event,
        metadata: { ...event.metadata },
      }))
      .sort((a, b) =>
        a.createdAt.localeCompare(b.createdAt),
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

  async getLearnerLearningContext(
    learnerId: string,
  ): Promise<LearnerLearningContextRecord | undefined> {
    const context =
      learnerLearningContexts.get(learnerId);

    return context ? { ...context } : undefined;
  }

  async saveLearnerLearningContext(
    context: LearnerLearningContextRecord,
  ): Promise<void> {
    learnerLearningContexts.set(
      context.learnerId,
      { ...context },
    );
  }
}

export const memoryPersistence =
  new MemoryPersistenceStore();













