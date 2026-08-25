CREATE TABLE "interventions" (
	"intervention_id" text PRIMARY KEY NOT NULL,
	"learner_id" text NOT NULL,
	"competency_id" text NOT NULL,
	"session_id" text NOT NULL,
	"decision_id" text NOT NULL,
	"type" text NOT NULL,
	"status" text NOT NULL,
	"started_at" timestamp with time zone NOT NULL,
	"completed_at" timestamp with time zone,
	"outcome" text NOT NULL,
	"evidence_ids" jsonb NOT NULL,
	"policy_version" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
