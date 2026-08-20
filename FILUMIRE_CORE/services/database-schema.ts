import {
  pgTable,
  text,
  integer,
  real,
  timestamp,
  jsonb,
} from "drizzle-orm/pg-core";

export const learnerStates = pgTable("learner_states", {
  learnerId: text("learner_id").notNull(),
  competencyId: text("competency_id").notNull(),
  state: jsonb("state").notNull(),
  evidenceCount: integer("evidence_count").notNull(),
  masteryEstimate: real("mastery_estimate").notNull(),
  confidence: real("confidence").notNull(),
  lastUpdated: timestamp("last_updated", {
    withTimezone: true,
  }).notNull(),
});

export const learningEvidence = pgTable("learning_evidence", {
  id: text("id").primaryKey(),
  learnerId: text("learner_id").notNull(),
  competencyId: text("competency_id").notNull(),
  source: text("source").notNull(),
  outcome: text("outcome").notNull(),
  timestamp: timestamp("timestamp", {
    withTimezone: true,
  }).notNull(),
  assessmentItemId: text("assessment_item_id"),
  sessionId: text("session_id"),
  contentId: text("content_id"),
  policyVersion: text("policy_version").notNull(),
});