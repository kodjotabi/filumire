import type {
  LearningEvidence,
  LearnerState,
} from "../packages/domain";

import type {
  LearningIntervention,
} from "../packages/domain/intervention";

import type {
  PersistenceStore,
} from "./persistence";

import {
  db,
} from "./database";

import {
  learnerStates,
  learningEvidence,
  sessions,
  interventions,
} from "./database-schema";

import {
  and,
  eq,
} from "drizzle-orm";

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

export class PostgresPersistenceStore
  implements PersistenceStore
{
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

  async saveLearnerState(
    state: LearnerState,
  ): Promise<void> {
    for (
      const competency of
        state.competencies
    ) {
      const existing =
        await db
          .select()
          .from(learnerStates)
          .where(
            and(
              eq(
                learnerStates.learnerId,
                state.learnerId,
              ),
              eq(
                learnerStates.competencyId,
                competency.competencyId,
              ),
            ),
          )
          .limit(1);

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

      if (
        existing.length > 0
      ) {
        await db
          .update(learnerStates)
          .set(values)
          .where(
            and(
              eq(
                learnerStates.learnerId,
                state.learnerId,
              ),
              eq(
                learnerStates.competencyId,
                competency.competencyId,
              ),
            ),
          );
      } else {
        await db
          .insert(learnerStates)
          .values(values);
      }
    }
  }

  async saveEvidence(
    evidence: LearningEvidence,
  ): Promise<void> {
    await db
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
      })
      .onConflictDoNothing({
        target:
          learningEvidence.id,
      });
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
}

export const postgresPersistence =
  new PostgresPersistenceStore();