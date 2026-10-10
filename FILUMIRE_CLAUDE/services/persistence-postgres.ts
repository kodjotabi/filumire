import type {
  LearningEvidence,
  LearnerState,
} from "../packages/domain";

import type {
  LearningIntervention,
} from "../packages/domain/intervention";

import type {
  PersistenceStore,
  PrincipalLearnerRelationshipType,
  PrincipalLearnerAccessRecord,
  PrincipalAuthSessionRecord,
  PrincipalAuthSessionRenewal,
  PrincipalAuthSessionStatus,
  LearnerLearningContextRecord,
  PendingTeacherReviewRecord,
  TeacherProfessionalNoteRecord,
  ParentTeacherMessageRecord,
  ControlledTeacherActionRecord,
  PilotMeasurementEventRecord,
} from "./persistence";

import {
  db,
  pool,
} from "./database";

import {
  principals,
  externalIdentities,
  principalLearnerAccess,
  authSessions,
  learners,
  learnerStates,
  learningEvidence,
  sessions,
  interventions,
  learnerLearningContext,
  pendingTeacherReviews,
  teacherProfessionalNotes,
  parentTeacherMessages,
  controlledTeacherActions,
  pilotMeasurementEvents,
} from "./database-schema";

import {
  and,
  eq,
  gt,
  isNull,
  sql,
} from "drizzle-orm";

function mapPrincipalAuthSession(
  row: typeof authSessions.$inferSelect,
): PrincipalAuthSessionRecord {
  return {
    id: row.id,
    principalId: row.principalId,
    status: row.status as PrincipalAuthSessionStatus,
    createdAt: row.createdAt.toISOString(),
    expiresAt: row.expiresAt.toISOString(),
    lastActivityAt: row.lastActivityAt.toISOString(),
    revokedAt: row.revokedAt
      ? row.revokedAt.toISOString()
      : undefined,
    updatedAt: row.updatedAt.toISOString(),
  };
}

/* snake_case column names -> drizzle property names (learning_evidence uses this convention). */
function camelCaseRow(
  row: Record<string, unknown>,
): typeof learningEvidence.$inferSelect {
  return Object.fromEntries(
    Object.entries(row).map(([key, value]) => [
      key.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase()),
      value,
    ]),
  ) as typeof learningEvidence.$inferSelect;
}

function mapEvidence(
  row: typeof learningEvidence.$inferSelect,
): LearningEvidence {
  return {
    id:
      row.id,

    learnerId:
      row.learnerId,

    competencyId:
      row.competencyId,

    source:
      row.source as LearningEvidence["source"],

    outcome:
      row.outcome as LearningEvidence["outcome"],

    timestamp:
      row.timestamp.toISOString(),

    assessmentItemId:
      row.assessmentItemId ??
      undefined,

    sessionId:
      row.sessionId ??
      undefined,

    contentId:
      row.contentId ??
      undefined,

    policyVersion:
      row.policyVersion,

    errorPattern:
      row.errorPattern ??
      undefined,

    diagnosticState:
      row.diagnosticState as
        | LearningEvidence["diagnosticState"]
        | undefined,

    diagnosticConfidence:
      row.diagnosticConfidence ??
      undefined,

    interventionType:
      row.interventionType as
        | LearningEvidence["interventionType"]
        | undefined,

    interventionId:
      row.interventionId ??
      undefined,

    instructionalStrategy:
      row.instructionalStrategy as
        | LearningEvidence["instructionalStrategy"]
        | undefined,

    responseMode:
      row.responseMode as
        | LearningEvidence["responseMode"]
        | undefined,

    purpose:
      row.purpose as
        | LearningEvidence["purpose"]
        | undefined,

    independence:
      row.independence as
        | LearningEvidence["independence"]
        | undefined,

    supportLevel:
      row.supportLevel ??
      undefined,

    difficulty:
      row.difficulty as
        | LearningEvidence["difficulty"]
        | undefined,

    representation:
      row.representation as
        | LearningEvidence["representation"]
        | undefined,

    strength:
      row.strength as
        | LearningEvidence["strength"]
        | undefined,

    errorClass:
      row.errorClass as
        | LearningEvidence["errorClass"]
        | undefined,

    prerequisiteCompetencyId:
      row.prerequisiteCompetencyId ??
      undefined,

    misconceptionId:
      row.misconceptionId ??
      undefined,

    exposureCount:
      row.exposureCount ??
      undefined,

    attemptCount:
      row.attemptCount ??
      undefined,

    contextTags:
      Array.isArray(row.contextTags)
        ? (row.contextTags as string[])
        : undefined,

    evaluatorType:
      row.evaluatorType as
        | LearningEvidence["evaluatorType"]
        | undefined,

    evaluatorId:
      row.evaluatorId ??
      undefined,

    evaluationPolicyVersion:
      row.evaluationPolicyVersion ??
      undefined,

    interpretationVersion:
      row.interpretationVersion ??
      undefined,
  };
}
function mapIntervention(
  row: typeof interventions.$inferSelect,
): LearningIntervention {
  return {
    interventionId:
      row.interventionId,

    learnerId:
      row.learnerId,

    competencyId:
      row.competencyId,

    sessionId:
      row.sessionId,

    decisionId:
      row.decisionId,

    type:
      row.type as LearningIntervention["type"],

    status:
      row.status as LearningIntervention["status"],

    startedAt:
      row.startedAt.toISOString(),

    completedAt:
      row.completedAt
        ? row.completedAt.toISOString()
        : undefined,

    outcome:
      row.outcome as LearningIntervention["outcome"],

    evidenceIds:
      Array.isArray(row.evidenceIds)
        ? (row.evidenceIds as string[])
        : [],

    policyVersion:
      row.policyVersion,

    createdAt:
      row.createdAt.toISOString(),

    updatedAt:
      row.updatedAt.toISOString(),
  };
}

function mapLearnerLearningContext(
  row: typeof learnerLearningContext.$inferSelect,
): LearnerLearningContextRecord {
  return {
    learnerId: row.learnerId,
    curriculumVersionId: row.curriculumVersionId,
    gradeId: row.gradeId,
    activeSubjectId: row.activeSubjectId,
    activeCompetencyId:
      row.activeCompetencyId ?? undefined,
    updatedAt: row.updatedAt.toISOString(),
  };
}

export class PostgresPersistenceStore
  implements PersistenceStore
{
  async createPrincipal(
    principalId: string,
  ): Promise<void> {
    await db
      .insert(principals)
      .values({
        id: principalId,
      })
      .onConflictDoNothing({
        target:
          principals.id,
      });
  }

  async getPrincipalStatus(
    principalId: string,
  ): Promise<string | undefined> {
    const rows =
      await db
        .select({
          status:
            principals.status,
        })
        .from(principals)
        .where(
          eq(
            principals.id,
            principalId,
          ),
        )
        .limit(1);

    return rows[0]?.status;
  }

  async createExternalIdentity(
    externalIdentityId: string,
    principalId: string,
    providerNamespace: string,
    providerSubject: string,
  ): Promise<void> {
    await db
      .insert(externalIdentities)
      .values({
        id: externalIdentityId,
        principalId,
        providerNamespace,
        providerSubject,
      });
  }

  async getPrincipalIdByExternalIdentity(
    providerNamespace: string,
    providerSubject: string,
  ): Promise<string | undefined> {
    const rows =
      await db
        .select({
          principalId:
            externalIdentities.principalId,
        })
        .from(externalIdentities)
        .where(
          and(
            eq(
              externalIdentities.providerNamespace,
              providerNamespace,
            ),
            eq(
              externalIdentities.providerSubject,
              providerSubject,
            ),
          ),
        )
        .limit(1);

    return rows[0]?.principalId;
  }

  async resolveOrCreatePrincipalForExternalIdentity(
    providerNamespace: string,
    providerSubject: string,
  ): Promise<string> {
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      const existing = await client.query(
        `SELECT principal_id FROM external_identities
         WHERE provider_namespace = $1 AND provider_subject = $2
         LIMIT 1`,
        [providerNamespace, providerSubject],
      );

      if (existing.rows[0]) {
        await client.query("COMMIT");
        return existing.rows[0].principal_id as string;
      }

      // Speculative principal; removed below if a concurrent mapping wins.
      const candidatePrincipalId = crypto.randomUUID();
      const candidateExternalIdentityId = crypto.randomUUID();

      await client.query(
        "INSERT INTO principals (id) VALUES ($1)",
        [candidatePrincipalId],
      );

      const inserted = await client.query(
        `INSERT INTO external_identities
           (id, principal_id, provider_namespace, provider_subject)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (provider_namespace, provider_subject) DO NOTHING
         RETURNING principal_id`,
        [
          candidateExternalIdentityId,
          candidatePrincipalId,
          providerNamespace,
          providerSubject,
        ],
      );

      if (inserted.rows[0]) {
        await client.query("COMMIT");
        return inserted.rows[0].principal_id as string;
      }

      await client.query(
        "DELETE FROM principals WHERE id = $1",
        [candidatePrincipalId],
      );

      const winner = await client.query(
        `SELECT principal_id FROM external_identities
         WHERE provider_namespace = $1 AND provider_subject = $2
         LIMIT 1`,
        [providerNamespace, providerSubject],
      );

      await client.query("COMMIT");

      const winningPrincipalId =
        winner.rows[0]?.principal_id as
          | string
          | undefined;

      if (!winningPrincipalId) {
        throw new Error(
          "Failed to resolve principal after external identity conflict.",
        );
      }

      return winningPrincipalId;
    } catch (error) {
      await client.query("ROLLBACK").catch(() => {});
      throw error;
    } finally {
      client.release();
    }
  }

  async createPrincipalLearnerAccess(
    accessId: string,
    principalId: string,
    learnerId: string,
    relationshipType: PrincipalLearnerRelationshipType,
  ): Promise<void> {
    await db
      .insert(principalLearnerAccess)
      .values({
        id: accessId,
        principalId,
        learnerId,
        relationshipType,
      });
  }

  async getPrincipalLearnerAccess(
    principalId: string,
    learnerId: string,
    relationshipType: PrincipalLearnerRelationshipType,
  ): Promise<PrincipalLearnerAccessRecord | undefined> {
    const rows =
      await db
        .select()
        .from(principalLearnerAccess)
        .where(
          and(
            eq(
              principalLearnerAccess.principalId,
              principalId,
            ),
            eq(
              principalLearnerAccess.learnerId,
              learnerId,
            ),
            eq(
              principalLearnerAccess.relationshipType,
              relationshipType,
            ),
          ),
        )
        .limit(1);

    const row = rows[0];

    if (!row) {
      return undefined;
    }

    return {
      id: row.id,
      principalId: row.principalId,
      learnerId: row.learnerId,
      relationshipType:
        row.relationshipType as PrincipalLearnerRelationshipType,
      status:
        row.status as PrincipalLearnerAccessRecord["status"],
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  async listLearnersForPrincipal(
    principalId: string,
  ): Promise<string[]> {
    const rows =
      await db
        .selectDistinct({
          learnerId:
            principalLearnerAccess.learnerId,
        })
        .from(principalLearnerAccess)
        .where(
          and(
            eq(
              principalLearnerAccess.principalId,
              principalId,
            ),
            eq(
              principalLearnerAccess.status,
              "active",
            ),
          ),
        );

    return rows.map((row) => row.learnerId);
  }

  async isPrincipalAuthorizedForLearner(
    principalId: string,
    learnerId: string,
  ): Promise<boolean> {
    const rows =
      await db
        .select({
          id: principalLearnerAccess.id,
        })
        .from(principalLearnerAccess)
        .where(
          and(
            eq(
              principalLearnerAccess.principalId,
              principalId,
            ),
            eq(
              principalLearnerAccess.learnerId,
              learnerId,
            ),
            eq(
              principalLearnerAccess.status,
              "active",
            ),
          ),
        )
        .limit(1);

    return rows.length > 0;
  }

  async revokePrincipalLearnerAccess(
    principalId: string,
    learnerId: string,
    relationshipType: PrincipalLearnerRelationshipType,
  ): Promise<void> {
    await db
      .update(principalLearnerAccess)
      .set({
        status: "revoked",
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(
            principalLearnerAccess.principalId,
            principalId,
          ),
          eq(
            principalLearnerAccess.learnerId,
            learnerId,
          ),
          eq(
            principalLearnerAccess.relationshipType,
            relationshipType,
          ),
        ),
      );
  }

  async createPrincipalAuthSession(
    sessionId: string,
    principalId: string,
    expiresAt: string,
  ): Promise<void> {
    await db
      .insert(authSessions)
      .values({
        id: sessionId,
        principalId,
        expiresAt: new Date(expiresAt),
      });
  }

  async getPrincipalAuthSession(
    sessionId: string,
  ): Promise<PrincipalAuthSessionRecord | undefined> {
    const rows =
      await db
        .select()
        .from(authSessions)
        .where(
          eq(
            authSessions.id,
            sessionId,
          ),
        )
        .limit(1);

    const row = rows[0];

    return row
      ? mapPrincipalAuthSession(row)
      : undefined;
  }

  async isPrincipalAuthSessionValid(
    sessionId: string,
    principalId: string,
    at = new Date().toISOString(),
  ): Promise<boolean> {
    const rows =
      await db
        .select({
          id: authSessions.id,
        })
        .from(authSessions)
        .where(
          and(
            eq(
              authSessions.id,
              sessionId,
            ),
            eq(
              authSessions.principalId,
              principalId,
            ),
            eq(
              authSessions.status,
              "active",
            ),
            gt(
              authSessions.expiresAt,
              new Date(at),
            ),
            isNull(
              authSessions.revokedAt,
            ),
          ),
        )
        .limit(1);

    return rows.length > 0;
  }

  async updatePrincipalAuthSessionLastActivity(
    sessionId: string,
    principalId: string,
    lastActivityAt: string,
    renewal?: PrincipalAuthSessionRenewal,
  ): Promise<void> {
    const activityDate = new Date(lastActivityAt);
    const slidingExpiry = renewal
      ? {
          expiresAt: sql`least(
            ${new Date(activityDate.getTime() + renewal.idleSeconds * 1000).toISOString()}::timestamptz,
            ${authSessions.createdAt} + make_interval(secs => ${renewal.maxLifetimeSeconds})
          )`,
        }
      : {};

    await db
      .update(authSessions)
      .set({
        lastActivityAt: activityDate,
        updatedAt: activityDate,
        ...slidingExpiry,
      })
      .where(
        and(
          eq(
            authSessions.id,
            sessionId,
          ),
          eq(
            authSessions.principalId,
            principalId,
          ),
          eq(
            authSessions.status,
            "active",
          ),
          gt(
            authSessions.expiresAt,
            activityDate,
          ),
          isNull(
            authSessions.revokedAt,
          ),
        ),
      );
  }

  async revokePrincipalAuthSession(
    sessionId: string,
    principalId: string,
    revokedAt: string,
  ): Promise<void> {
    const revokedDate = new Date(revokedAt);

    await db
      .update(authSessions)
      .set({
        status: "revoked",
        revokedAt: revokedDate,
        updatedAt: revokedDate,
      })
      .where(
        and(
          eq(
            authSessions.id,
            sessionId,
          ),
          eq(
            authSessions.principalId,
            principalId,
          ),
        ),
      );
  }

  async ensureLearnerExists(
    learnerId: string,
  ): Promise<void> {
    await db
      .insert(learners)
      .values({
        id: learnerId,
      })
      .onConflictDoNothing({
        target:
          learners.id,
      });
  }

  async getLearnerState(
    learnerId: string,
    competencyId: string,
  ): Promise<LearnerState | undefined> {
    const rows =
      await db
        .select()
        .from(learnerStates)
        .where(
          and(
            eq(
              learnerStates.learnerId,
              learnerId,
            ),
            eq(
              learnerStates.competencyId,
              competencyId,
            ),
          ),
        )
        .limit(1);

    const row =
      rows[0];

    if (!row) {
      return undefined;
    }

    return row.state as LearnerState;
  }

  async getLearnerStates(
    learnerId: string,
  ): Promise<LearnerState[]> {
    const rows = await db
      .select()
      .from(learnerStates)
      .where(
        eq(
          learnerStates.learnerId,
          learnerId,
        ),
      );

    const uniqueStates = new Map<string, LearnerState>();

    for (const row of rows) {
      const state = row.state as LearnerState;

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
      const values = {
        learnerId:
          state.learnerId,

        competencyId:
          competency.competencyId,

        state,

        evidenceCount:
          competency.evidenceCount,

        masteryEstimate:
          competency.masteryEstimate,

        confidence:
          competency.confidence,

        lastUpdated:
          new Date(
            competency.lastUpdated,
          ),
      };

      await db
        .insert(learnerStates)
        .values(values)
        .onConflictDoUpdate({
          target: [
            learnerStates.learnerId,
            learnerStates.competencyId,
          ],
          set: values,
        });
    }
  }

  async updateLearnerState(
    learnerId: string,
    competencyId: string,
    mutator: (
      currentState: LearnerState | undefined,
    ) => Promise<LearnerState> | LearnerState,
  ): Promise<LearnerState> {
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      await client.query(
        "SELECT pg_advisory_xact_lock(hashtext($1), hashtext($2))",
        [learnerId, competencyId],
      );

      const rows = await client.query(
        "SELECT state FROM learner_states WHERE learner_id = $1 AND competency_id = $2 LIMIT 1",
        [learnerId, competencyId],
      );

      const currentState = rows.rows[0]?.state as
        | LearnerState
        | undefined;

      const nextState = await mutator(currentState);

      for (
        const competency of
          nextState.competencies
      ) {
        const values = [
          nextState.learnerId,
          competency.competencyId,
          JSON.stringify(nextState),
          competency.evidenceCount,
          competency.masteryEstimate,
          competency.confidence,
          new Date(
            competency.lastUpdated,
          ),
        ];

        await client.query(
          `INSERT INTO learner_states (
             learner_id,
             competency_id,
             state,
             evidence_count,
             mastery_estimate,
             confidence,
             last_updated
           ) VALUES ($1, $2, $3, $4, $5, $6, $7)
           ON CONFLICT (learner_id, competency_id)
           DO UPDATE SET
             state = EXCLUDED.state,
             evidence_count = EXCLUDED.evidence_count,
             mastery_estimate = EXCLUDED.mastery_estimate,
             confidence = EXCLUDED.confidence,
             last_updated = EXCLUDED.last_updated`,
          values,
        );
      }

      await client.query("COMMIT");
      return nextState;
    } catch (error) {
      await client.query("ROLLBACK").catch(() => {});
      throw error;
    } finally {
      client.release();
    }
  }

  async saveParentTeacherMessage(
    message: ParentTeacherMessageRecord,
  ): Promise<boolean> {
    await this.ensureLearnerExists(
      message.learnerId,
    );

    const rows = await db
      .insert(parentTeacherMessages)
      .values({
        id: message.id,
        learnerId: message.learnerId,
        authorPrincipalId:
          message.authorPrincipalId,
        senderRole: message.senderRole,
        text: message.text,
        createdAt: new Date(message.createdAt),
      })
      .onConflictDoNothing({
        target: parentTeacherMessages.id,
      })
      .returning({
        id: parentTeacherMessages.id,
      });

    return rows.length === 1;
  }

  async getParentTeacherMessages(
    learnerId: string,
  ): Promise<ParentTeacherMessageRecord[]> {
    const rows = await db
      .select()
      .from(parentTeacherMessages)
      .where(
        eq(
          parentTeacherMessages.learnerId,
          learnerId,
        ),
      );

    return rows
      .map((row) => ({
        id: row.id,
        learnerId: row.learnerId,
        authorPrincipalId:
          row.authorPrincipalId,
        senderRole:
          row.senderRole as ParentTeacherMessageRecord["senderRole"],
        text: row.text,
        createdAt:
          row.createdAt.toISOString(),
      }))
      .sort((a, b) =>
        b.createdAt.localeCompare(a.createdAt),
      );
  }

  async saveTeacherProfessionalNote(
    note: TeacherProfessionalNoteRecord,
  ): Promise<boolean> {
    await this.ensureLearnerExists(
      note.learnerId,
    );

    const rows = await db
      .insert(teacherProfessionalNotes)
      .values({
        id: note.id,
        learnerId: note.learnerId,
        competencyId: note.competencyId,
        authorPrincipalId: note.authorPrincipalId,
        noteType: note.noteType,
        text: note.text,
        createdAt: new Date(note.createdAt),
      })
      .onConflictDoNothing({
        target: teacherProfessionalNotes.id,
      })
      .returning({
        id: teacherProfessionalNotes.id,
      });

    return rows.length === 1;
  }

  async getTeacherProfessionalNotes(
    learnerId: string,
  ): Promise<TeacherProfessionalNoteRecord[]> {
    const rows = await db
      .select()
      .from(teacherProfessionalNotes)
      .where(
        eq(
          teacherProfessionalNotes.learnerId,
          learnerId,
        ),
      );

    return rows
      .map((row) => ({
        id: row.id,
        learnerId: row.learnerId,
        competencyId:
          row.competencyId ?? undefined,
        authorPrincipalId:
          row.authorPrincipalId,
        noteType:
          row.noteType as TeacherProfessionalNoteRecord["noteType"],
        text: row.text,
        createdAt:
          row.createdAt.toISOString(),
      }))
      .sort((a, b) =>
        b.createdAt.localeCompare(a.createdAt),
      );
  }
  async savePendingTeacherReview(
    review: PendingTeacherReviewRecord,
  ): Promise<boolean> {
    await this.ensureLearnerExists(
      review.learnerId,
    );

    const rows = await db
      .insert(pendingTeacherReviews)
      .values({
        id: review.id,
        learnerId: review.learnerId,
        competencyId: review.competencyId,
        assessmentItemId: review.assessmentItemId,
        contentId: review.contentId,
        sessionId: review.sessionId,
        response: review.response,
        status: review.status,
        submittedAt: new Date(review.submittedAt),
        reviewedAt: review.reviewedAt
          ? new Date(review.reviewedAt)
          : null,
        reviewedByPrincipalId:
          review.reviewedByPrincipalId,
        evidenceId: review.evidenceId,
      })
      .onConflictDoNothing({
        target: pendingTeacherReviews.id,
      })
      .returning({
        id: pendingTeacherReviews.id,
      });

    return rows.length > 0;
  }

  async getPendingTeacherReview(
    reviewId: string,
  ): Promise<PendingTeacherReviewRecord | undefined> {
    const rows = await db
      .select()
      .from(pendingTeacherReviews)
      .where(
        eq(
          pendingTeacherReviews.id,
          reviewId,
        ),
      )
      .limit(1);

    const row = rows[0];

    if (!row) {
      return undefined;
    }

    return {
      id: row.id,
      learnerId: row.learnerId,
      competencyId: row.competencyId,
      assessmentItemId: row.assessmentItemId,
      contentId: row.contentId ?? undefined,
      sessionId: row.sessionId,
      response: row.response,
      status:
        row.status as PendingTeacherReviewRecord["status"],
      submittedAt:
        row.submittedAt.toISOString(),
      reviewedAt:
        row.reviewedAt?.toISOString(),
      reviewedByPrincipalId:
        row.reviewedByPrincipalId ?? undefined,
      evidenceId:
        row.evidenceId ?? undefined,
    };
  }

  async getPendingTeacherReviews(
    learnerId: string,
  ): Promise<PendingTeacherReviewRecord[]> {
    const rows = await db
      .select()
      .from(pendingTeacherReviews)
      .where(
        and(
          eq(
            pendingTeacherReviews.learnerId,
            learnerId,
          ),
          eq(
            pendingTeacherReviews.status,
            "pending",
          ),
        ),
      );

    return rows
      .map((row) => ({
        id: row.id,
        learnerId: row.learnerId,
        competencyId: row.competencyId,
        assessmentItemId: row.assessmentItemId,
        contentId: row.contentId ?? undefined,
        sessionId: row.sessionId,
        response: row.response,
        status:
          row.status as PendingTeacherReviewRecord["status"],
        submittedAt:
          row.submittedAt.toISOString(),
        reviewedAt:
          row.reviewedAt?.toISOString(),
        reviewedByPrincipalId:
          row.reviewedByPrincipalId ?? undefined,
        evidenceId:
          row.evidenceId ?? undefined,
      }))
      .sort((a, b) =>
        b.submittedAt.localeCompare(
          a.submittedAt,
        ),
      );
  }

  async markPendingTeacherReviewReviewed(
    reviewId: string,
    reviewedByPrincipalId: string,
    evidenceId: string,
    reviewedAt: string,
  ): Promise<void> {
    await db
      .update(pendingTeacherReviews)
      .set({
        status: "reviewed",
        reviewedAt:
          new Date(reviewedAt),
        reviewedByPrincipalId,
        evidenceId,
      })
      .where(
        eq(
          pendingTeacherReviews.id,
          reviewId,
        ),
      );
  }
  async saveEvidence(
    evidence: LearningEvidence,
  ): Promise<boolean> {
    const rows = await db
      .insert(learningEvidence)
      .values({
        id:
          evidence.id,

        learnerId:
          evidence.learnerId,

        competencyId:
          evidence.competencyId,

        source:
          evidence.source,

        outcome:
          evidence.outcome,

        timestamp:
          new Date(
            evidence.timestamp,
          ),

        assessmentItemId:
          evidence.assessmentItemId,

        sessionId:
          evidence.sessionId,

        contentId:
          evidence.contentId,

        policyVersion:
          evidence.policyVersion,

        errorPattern:
          evidence.errorPattern,

        diagnosticState:
          evidence.diagnosticState,

        diagnosticConfidence:
          evidence.diagnosticConfidence,

        interventionType:
          evidence.interventionType,

        interventionId:
          evidence.interventionId,

        instructionalStrategy:
          evidence.instructionalStrategy,

        responseMode:
          evidence.responseMode,

        purpose:
          evidence.purpose,

        independence:
          evidence.independence,

        supportLevel:
          evidence.supportLevel,

        difficulty:
          evidence.difficulty,

        representation:
          evidence.representation,

        strength:
          evidence.strength,

        errorClass:
          evidence.errorClass,

        prerequisiteCompetencyId:
          evidence.prerequisiteCompetencyId,

        misconceptionId:
          evidence.misconceptionId,

        exposureCount:
          evidence.exposureCount,

        attemptCount:
          evidence.attemptCount,

        contextTags:
          evidence.contextTags,

        evaluatorType:
          evidence.evaluatorType,

        evaluatorId:
          evidence.evaluatorId,

        evaluationPolicyVersion:
          evidence.evaluationPolicyVersion,

        interpretationVersion:
          evidence.interpretationVersion,
      })
      .onConflictDoNothing({
        target:
          learningEvidence.id,
      })
      .returning({
        id:
          learningEvidence.id,
      });

    return rows.length > 0;
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
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      await client.query(
        "SELECT pg_advisory_xact_lock(hashtext($1), hashtext($2))",
        [evidence.learnerId, competencyId],
      );

      const insertResult =
        await client.query(
          `INSERT INTO learning_evidence (
             id,
             learner_id,
             competency_id,
             source,
             outcome,
             timestamp,
             assessment_item_id,
             session_id,
             content_id,
             policy_version,
             error_pattern,
             diagnostic_state,
             diagnostic_confidence,
             intervention_type,
             intervention_id,
             instructional_strategy,
             response_mode,
             purpose,
             independence,
             support_level,
             difficulty,
             representation,
             strength,
             error_class,
             prerequisite_competency_id,
             misconception_id,
             exposure_count,
             evaluator_type,
             evaluator_id,
             evaluation_policy_version,
             interpretation_version,
             attempt_count,
             context_tags
           ) VALUES (
             $1, $2, $3, $4, $5, $6, $7, $8,
             $9, $10, $11, $12, $13, $14, $15, $16,
             $17, $18, $19, $20, $21, $22, $23, $24,
             $25, $26, $27, $28, $29, $30, $31, $32,
             $33
           )
           ON CONFLICT (id) DO NOTHING
           RETURNING id`,
          [
            evidence.id,
            evidence.learnerId,
            evidence.competencyId,
            evidence.source,
            evidence.outcome,
            new Date(evidence.timestamp),
            evidence.assessmentItemId ?? null,
            evidence.sessionId ?? null,
            evidence.contentId ?? null,
            evidence.policyVersion,
            evidence.errorPattern ?? null,
            evidence.diagnosticState ?? null,
            evidence.diagnosticConfidence ?? null,
            evidence.interventionType ?? null,
            evidence.interventionId ?? null,
            evidence.instructionalStrategy ?? null,
            evidence.responseMode ?? null,
            evidence.purpose ?? null,
            evidence.independence ?? null,
            evidence.supportLevel ?? null,
            evidence.difficulty ?? null,
            evidence.representation ?? null,
            evidence.strength ?? null,
            evidence.errorClass ?? null,
            evidence.prerequisiteCompetencyId ?? null,
            evidence.misconceptionId ?? null,
            evidence.exposureCount ?? null,
            evidence.evaluatorType ?? null,
            evidence.evaluatorId ?? null,
            evidence.evaluationPolicyVersion ?? null,
            evidence.interpretationVersion ?? null,
            evidence.attemptCount ?? null,
            evidence.contextTags
              ? JSON.stringify(evidence.contextTags)
              : null,
          ],
        );
      const isNewEvidence =
        (insertResult.rowCount ?? 0) > 0;

      const stateRows = await client.query(
        "SELECT state FROM learner_states WHERE learner_id = $1 AND competency_id = $2 LIMIT 1",
        [evidence.learnerId, competencyId],
      );

      const currentState = stateRows.rows[0]?.state as
        | LearnerState
        | undefined;

      const evidenceRows = await client.query(
        "SELECT * FROM learning_evidence WHERE learner_id = $1 AND competency_id = $2 ORDER BY timestamp ASC",
        [evidence.learnerId, competencyId],
      );

      /*
       * 8 Oct 2026: raw rows have snake_case columns; mapEvidence reads the
       * drizzle (camelCase) shape. Without this every multi-word field of the
       * history (assessmentItemId, interventionType, exposureCount, ...) was
       * undefined, so repeats counted as fresh and Option B lost its anchor.
       */
      const evidenceHistory = evidenceRows.rows.map((row) =>
        mapEvidence(camelCaseRow(row)),
      );

      const nextState = mutator(
        currentState,
        isNewEvidence,
        evidenceHistory,
      );

      for (
        const competency of
          nextState.competencies
      ) {
        const values = [
          nextState.learnerId,
          competency.competencyId,
          JSON.stringify(nextState),
          competency.evidenceCount,
          competency.masteryEstimate,
          competency.confidence,
          new Date(
            competency.lastUpdated,
          ),
        ];

        await client.query(
          `INSERT INTO learner_states (
             learner_id,
             competency_id,
             state,
             evidence_count,
             mastery_estimate,
             confidence,
             last_updated
           ) VALUES ($1, $2, $3, $4, $5, $6, $7)
           ON CONFLICT (learner_id, competency_id)
           DO UPDATE SET
             state = EXCLUDED.state,
             evidence_count = EXCLUDED.evidence_count,
             mastery_estimate = EXCLUDED.mastery_estimate,
             confidence = EXCLUDED.confidence,
             last_updated = EXCLUDED.last_updated`,
          values,
        );
      }

      await client.query("COMMIT");

      return {
        learnerState: nextState,
        isNewEvidence,
      };
    } catch (error) {
      await client.query("ROLLBACK").catch(() => {});
      throw error;
    } finally {
      client.release();
    }
  }

  async getEvidence(
    learnerId: string,
    competencyId: string,
  ): Promise<LearningEvidence[]> {
    const rows =
      await db
        .select()
        .from(learningEvidence)
        .where(
          and(
            eq(
              learningEvidence.learnerId,
              learnerId,
            ),
            eq(
              learningEvidence.competencyId,
              competencyId,
            ),
          ),
        );

    return rows.map(
      mapEvidence,
    );
  }

  async getEvidenceForLearner(
    learnerId: string,
  ): Promise<LearningEvidence[]> {
    const rows =
      await db
        .select()
        .from(learningEvidence)
        .where(
          eq(
            learningEvidence.learnerId,
            learnerId,
          ),
        );

    return rows.map(
      mapEvidence,
    );
  }
  async getAllEvidence(): Promise<
    LearningEvidence[]
  > {
    const rows =
      await db
        .select()
        .from(learningEvidence);

    return rows.map(
      mapEvidence,
    );
  }

  async createSession(
    sessionId: string,
    learnerId: string,
  ): Promise<void> {
    const now =
      new Date();

    await db
      .insert(sessions)
      .values({
        id:
          sessionId,

        learnerId,

        createdAt:
          now,

        lastActivityAt:
          now,

        status:
          "active",
      })
      .onConflictDoNothing({
        target:
          sessions.id,
      });
  }

  async getSessionLearnerId(
    sessionId: string,
  ): Promise<string | undefined> {
    const rows =
      await db
        .select({
          learnerId:
            sessions.learnerId,
        })
        .from(sessions)
        .where(
          eq(
            sessions.id,
            sessionId,
          ),
        )
        .limit(1);

    return rows[0]?.learnerId;
  }

  async isSessionActive(
    sessionId: string,
    learnerId: string,
  ): Promise<boolean> {
    const rows = await db
      .select({
        id: sessions.id,
      })
      .from(sessions)
      .where(
        and(
          eq(sessions.id, sessionId),
          eq(sessions.learnerId, learnerId),
          eq(sessions.status, "active"),
        ),
      )
      .limit(1);

    return rows.length > 0;
  }

  async revokeSession(
    sessionId: string,
    learnerId: string,
  ): Promise<void> {
    await db
      .update(sessions)
      .set({
        status: "revoked",
        lastActivityAt: new Date(),
      })
      .where(
        and(
          eq(sessions.id, sessionId),
          eq(sessions.learnerId, learnerId),
        ),
      );
  }

  async saveControlledTeacherAction(
    action: ControlledTeacherActionRecord,
  ): Promise<boolean> {
    await this.ensureLearnerExists(
      action.learnerId,
    );

    const rows = await db
      .insert(controlledTeacherActions)
      .values({
        id: action.id,
        learnerId: action.learnerId,
        competencyId: action.competencyId,
        teacherPrincipalId:
          action.teacherPrincipalId,
        actionType: action.actionType,
        reason: action.reason,
        status: action.status,
        createdAt: new Date(action.createdAt),
        resolvedAt: action.resolvedAt
          ? new Date(action.resolvedAt)
          : null,
      })
      .onConflictDoNothing({
        target: controlledTeacherActions.id,
      })
      .returning({
        id: controlledTeacherActions.id,
      });

    return rows.length === 1;
  }

  async getControlledTeacherActions(
    learnerId: string,
    competencyId?: string,
  ): Promise<ControlledTeacherActionRecord[]> {
    const condition =
      competencyId === undefined
        ? eq(
            controlledTeacherActions.learnerId,
            learnerId,
          )
        : and(
            eq(
              controlledTeacherActions.learnerId,
              learnerId,
            ),
            eq(
              controlledTeacherActions.competencyId,
              competencyId,
            ),
          );

    const rows = await db
      .select()
      .from(controlledTeacherActions)
      .where(condition);

    return rows
      .map((row) => ({
        id: row.id,
        learnerId: row.learnerId,
        competencyId: row.competencyId,
        teacherPrincipalId:
          row.teacherPrincipalId,
        actionType:
          row.actionType as ControlledTeacherActionRecord["actionType"],
        reason: row.reason ?? undefined,
        status:
          row.status as ControlledTeacherActionRecord["status"],
        createdAt:
          row.createdAt.toISOString(),
        resolvedAt:
          row.resolvedAt?.toISOString(),
      }))
      .sort((a, b) =>
        b.createdAt.localeCompare(a.createdAt),
      );
  }
  async savePilotMeasurementEvent(
    event: PilotMeasurementEventRecord,
  ): Promise<boolean> {
    await this.ensureLearnerExists(
      event.learnerId,
    );

    const rows =
      await db
        .insert(pilotMeasurementEvents)
        .values({
          id: event.id,
          learnerId: event.learnerId,
          competencyId:
            event.competencyId ?? null,
          sessionId:
            event.sessionId ?? null,
          subjectId:
            event.subjectId ?? null,
          eventType: event.eventType,
          metadata: event.metadata,
          measurementVersion:
            event.measurementVersion,
          createdAt:
            new Date(event.createdAt),
        })
        .onConflictDoNothing({
          target:
            pilotMeasurementEvents.id,
        })
        .returning({
          id: pilotMeasurementEvents.id,
        });

    return rows.length === 1;
  }

  async getPilotMeasurementEvents(
    learnerId: string,
  ): Promise<PilotMeasurementEventRecord[]> {
    const rows =
      await db
        .select()
        .from(pilotMeasurementEvents)
        .where(
          eq(
            pilotMeasurementEvents.learnerId,
            learnerId,
          ),
        );

    return rows
      .map((row) => ({
        id: row.id,
        learnerId: row.learnerId,
        competencyId:
          row.competencyId ?? undefined,
        sessionId:
          row.sessionId ?? undefined,
        subjectId:
          row.subjectId ?? undefined,
        eventType:
          row.eventType as PilotMeasurementEventRecord["eventType"],
        metadata:
          (row.metadata ?? {}) as PilotMeasurementEventRecord["metadata"],
        measurementVersion:
          row.measurementVersion,
        createdAt:
          row.createdAt.toISOString(),
      }))
      .sort((a, b) =>
        a.createdAt.localeCompare(b.createdAt),
      );
  }
  async saveIntervention(
    intervention: LearningIntervention,
  ): Promise<void> {
    const now =
      new Date();

    await db
      .insert(interventions)
      .values({
        interventionId:
          intervention.interventionId,

        learnerId:
          intervention.learnerId,

        competencyId:
          intervention.competencyId,

        sessionId:
          intervention.sessionId,

        decisionId:
          intervention.decisionId,

        type:
          intervention.type,

        status:
          intervention.status,

        startedAt:
          new Date(
            intervention.startedAt,
          ),

        completedAt:
          intervention.completedAt
            ? new Date(
                intervention.completedAt,
              )
            : undefined,

        outcome:
          intervention.outcome,

        evidenceIds:
          intervention.evidenceIds,

        policyVersion:
          intervention.policyVersion,

        createdAt:
          new Date(
            intervention.createdAt,
          ),

        updatedAt:
          now,
      })
      .onConflictDoUpdate({
        target:
          interventions.interventionId,

        set: {
          status:
            intervention.status,

          completedAt:
            intervention.completedAt
              ? new Date(
                  intervention.completedAt,
                )
              : undefined,

          outcome:
            intervention.outcome,

          evidenceIds:
            intervention.evidenceIds,

          updatedAt:
            now,
        },
      });
  }

  async getIntervention(
    interventionId: string,
  ): Promise<
    LearningIntervention | undefined
  > {
    const rows =
      await db
        .select()
        .from(interventions)
        .where(
          eq(
            interventions.interventionId,
            interventionId,
          ),
        )
        .limit(1);

    const row =
      rows[0];

    if (!row) {
      return undefined;
    }

    return mapIntervention(
      row,
    );
  }

  async getLearnerInterventions(
    learnerId: string,
    competencyId?: string,
  ): Promise<LearningIntervention[]> {
    const rows =
      competencyId
        ? await db
            .select()
            .from(interventions)
            .where(
              and(
                eq(
                  interventions.learnerId,
                  learnerId,
                ),
                eq(
                  interventions.competencyId,
                  competencyId,
                ),
              ),
            )
        : await db
            .select()
            .from(interventions)
            .where(
              eq(
                interventions.learnerId,
                learnerId,
              ),
            );

    return rows.map(
      mapIntervention,
    );
  }

  async getLearnerLearningContext(
    learnerId: string,
  ): Promise<LearnerLearningContextRecord | undefined> {
    const rows = await db
      .select()
      .from(learnerLearningContext)
      .where(
        eq(
          learnerLearningContext.learnerId,
          learnerId,
        ),
      )
      .limit(1);

    const row = rows[0];

    return row
      ? mapLearnerLearningContext(row)
      : undefined;
  }

  async saveLearnerLearningContext(
    context: LearnerLearningContextRecord,
  ): Promise<void> {
    const values = {
      learnerId: context.learnerId,
      curriculumVersionId: context.curriculumVersionId,
      gradeId: context.gradeId,
      activeSubjectId: context.activeSubjectId,
      activeCompetencyId:
        context.activeCompetencyId ?? null,
      updatedAt: new Date(context.updatedAt),
    };

    await db
      .insert(learnerLearningContext)
      .values(values)
      .onConflictDoUpdate({
        target: learnerLearningContext.learnerId,
        set: values,
      });
  }
}

export const postgresPersistence =
  new PostgresPersistenceStore();















