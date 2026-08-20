import type {
  LearningEvidence,
  LearnerState,
} from "../packages/domain";
import type { PersistenceStore } from "./persistence";
import { db } from "./database";
import {
  learnerStates,
  learningEvidence,
} from "./database-schema";
import { and, eq } from "drizzle-orm";

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
          eq(learnerStates.learnerId, learnerId),
          eq(learnerStates.competencyId, competencyId),
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
    for (const competency of state.competencies) {
      const existing = await db
        .select()
        .from(learnerStates)
        .where(
          and(
            eq(learnerStates.learnerId, state.learnerId),
            eq(
              learnerStates.competencyId,
              competency.competencyId,
            ),
          ),
        )
        .limit(1);

      if (existing.length > 0) {
        await db
          .update(learnerStates)
          .set({
            state,
            evidenceCount: competency.evidenceCount,
            masteryEstimate: competency.masteryEstimate,
            confidence: competency.confidence,
            lastUpdated: new Date(competency.lastUpdated),
          })
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
        await db.insert(learnerStates).values({
          learnerId: state.learnerId,
          competencyId: competency.competencyId,
          state,
          evidenceCount: competency.evidenceCount,
          masteryEstimate: competency.masteryEstimate,
          confidence: competency.confidence,
          lastUpdated: new Date(competency.lastUpdated),
        });
      }
    }
  }

  async saveEvidence(
    evidence: LearningEvidence,
  ): Promise<void> {
    await db.insert(learningEvidence).values({
      id: evidence.id,
      learnerId: evidence.learnerId,
      competencyId: evidence.competencyId,
      source: evidence.source,
      outcome: evidence.outcome,
      timestamp: new Date(evidence.timestamp),
      assessmentItemId: evidence.assessmentItemId,
      sessionId: evidence.sessionId,
      contentId: evidence.contentId,
      policyVersion: evidence.policyVersion,
    });
  }

  async getEvidence(
    learnerId: string,
    competencyId: string,
  ): Promise<LearningEvidence[]> {
    const rows = await db
      .select()
      .from(learningEvidence)
      .where(
        and(
          eq(learningEvidence.learnerId, learnerId),
          eq(learningEvidence.competencyId, competencyId),
        ),
      );

    return rows.map((row) => ({
      id: row.id,
      learnerId: row.learnerId,
      competencyId: row.competencyId,
      source: row.source as LearningEvidence["source"],
      outcome: row.outcome as LearningEvidence["outcome"],
      timestamp: row.timestamp.toISOString(),
      assessmentItemId:
        row.assessmentItemId ?? undefined,
      sessionId: row.sessionId ?? undefined,
      contentId: row.contentId ?? undefined,
      policyVersion: row.policyVersion,
    }));
  }

  async getAllEvidence(): Promise<LearningEvidence[]> {
    const rows = await db
      .select()
      .from(learningEvidence);

    return rows.map((row) => ({
      id: row.id,
      learnerId: row.learnerId,
      competencyId: row.competencyId,
      source: row.source as LearningEvidence["source"],
      outcome: row.outcome as LearningEvidence["outcome"],
      timestamp: row.timestamp.toISOString(),
      assessmentItemId:
        row.assessmentItemId ?? undefined,
      sessionId: row.sessionId ?? undefined,
      contentId: row.contentId ?? undefined,
      policyVersion: row.policyVersion,
    }));
  }
}

export const postgresPersistence =
  new PostgresPersistenceStore();