import {
  pgTable,
  text,
  jsonb,
  integer,
  real,
  timestamp,
} from "drizzle-orm/pg-core";

export const sessions = pgTable("sessions", {
  id: text("id").primaryKey(),

  learnerId: text(
    "learner_id",
  ).notNull(),

  createdAt: timestamp(
    "created_at",
    {
      withTimezone: true,
    },
  ).notNull(),

  lastActivityAt: timestamp(
    "last_activity_at",
    {
      withTimezone: true,
    },
  ).notNull(),

  status: text(
    "status",
  ).notNull(),
});

export const learnerStates =
  pgTable(
    "learner_states",
    {
      learnerId: text(
        "learner_id",
      ).notNull(),

      competencyId: text(
        "competency_id",
      ).notNull(),

      state: jsonb(
        "state",
      ).notNull(),

      evidenceCount: integer(
        "evidence_count",
      ).notNull(),

      masteryEstimate: real(
        "mastery_estimate",
      ).notNull(),

      confidence: real(
        "confidence",
      ).notNull(),

      lastUpdated: timestamp(
        "last_updated",
        {
          withTimezone: true,
        },
      ).notNull(),
    },
  );

export const learningEvidence =
  pgTable(
    "learning_evidence",
    {
      id: text("id")
        .primaryKey()
        .notNull(),

      learnerId: text(
        "learner_id",
      ).notNull(),

      competencyId: text(
        "competency_id",
      ).notNull(),

      source: text(
        "source",
      ).notNull(),

      outcome: text(
        "outcome",
      ).notNull(),

      timestamp: timestamp(
        "timestamp",
        {
          withTimezone: true,
        },
      ).notNull(),

      assessmentItemId:
        text(
          "assessment_item_id",
        ),

      sessionId: text(
        "session_id",
      ),

      contentId: text(
        "content_id",
      ),

      policyVersion: text(
        "policy_version",
      ).notNull(),

      errorPattern: text(
        "error_pattern",
      ),

      diagnosticState: text(
        "diagnostic_state",
      ),

      diagnosticConfidence:
        real(
          "diagnostic_confidence",
        ),

      interventionType:
        text(
          "intervention_type",
        ),

      interventionId:
        text(
          "intervention_id",
        ),
    },
  );

export const interventions =
  pgTable(
    "interventions",
    {
      interventionId:
        text(
          "intervention_id",
        )
          .primaryKey()
          .notNull(),

      learnerId:
        text(
          "learner_id",
        ).notNull(),

      competencyId:
        text(
          "competency_id",
        ).notNull(),

      sessionId:
        text(
          "session_id",
        ).notNull(),

      decisionId:
        text(
          "decision_id",
        ).notNull(),

      type:
        text(
          "type",
        ).notNull(),

      status:
        text(
          "status",
        ).notNull(),

      startedAt:
        timestamp(
          "started_at",
          {
            withTimezone: true,
          },
        ).notNull(),

      completedAt:
        timestamp(
          "completed_at",
          {
            withTimezone: true,
          },
        ),

      outcome:
        text(
          "outcome",
        ).notNull(),

      evidenceIds:
        jsonb(
          "evidence_ids",
        ).notNull(),

      policyVersion:
        text(
          "policy_version",
        ).notNull(),

      createdAt:
        timestamp(
          "created_at",
          {
            withTimezone: true,
          },
        ).notNull(),

      updatedAt:
        timestamp(
          "updated_at",
          {
            withTimezone: true,
          },
        ).notNull(),
    },
  );
