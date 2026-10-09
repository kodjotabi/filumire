$ErrorActionPreference = "Stop"

$Root = "C:\Users\tabi\Desktop\filumire\FILUMIRE_CORE"

@'
import type {
  LearningEvidence,
  LearnerState,
} from "../packages/domain";

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
} from "./database-schema";

import {
  and,
  eq,
} from "drizzle-orm";

function mapEvidence(
  row: typeof learningEvidence.$inferSelect,
): LearningEvidence {
  return {
    id: row.id,

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

export class PostgresPersistenceStore
  implements PersistenceStore
{
  async getLearnerState(
    learnerId: string,
    competencyId: string,
  ): Promise<LearnerState | undefined> {
    const rows = await db
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

    const row = rows[0];

    if (!row) {
      return undefined;
    }

    return row.state as LearnerState;
  }

  async saveLearnerState(
    state: LearnerState,
  ): Promise<void> {
    for (
      const competency
      of state.competencies
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
    if (!evidence) {
      throw new Error(
        "Cannot persist undefined learning evidence.",
      );
    }

    if (!evidence.id) {
      throw new Error(
        "Cannot persist learning evidence without an id.",
      );
    }

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

    return rows.map(mapEvidence);
  }

  async getAllEvidence(): Promise<LearningEvidence[]> {
    const rows =
      await db
        .select()
        .from(learningEvidence);

    return rows.map(mapEvidence);
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
}

export const postgresPersistence =
  new PostgresPersistenceStore();
'@ | Set-Content `
  "$Root\services\persistence-postgres.ts" `
  -Encoding UTF8

Write-Host ""
Write-Host "PostgreSQL evidence persistence fixed."
Write-Host ""
Write-Host "Run:"
Write-Host "npm test"