CREATE TABLE "learner_states" (
	"learner_id" text NOT NULL,
	"competency_id" text NOT NULL,
	"state" jsonb NOT NULL,
	"evidence_count" integer NOT NULL,
	"mastery_estimate" real NOT NULL,
	"confidence" real NOT NULL,
	"last_updated" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "learning_evidence" (
	"id" text PRIMARY KEY NOT NULL,
	"learner_id" text NOT NULL,
	"competency_id" text NOT NULL,
	"source" text NOT NULL,
	"outcome" text NOT NULL,
	"timestamp" timestamp with time zone NOT NULL,
	"assessment_item_id" text,
	"session_id" text,
	"content_id" text,
	"policy_version" text NOT NULL
);
