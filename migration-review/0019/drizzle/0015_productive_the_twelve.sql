CREATE TABLE "pilot_measurement_events" (
	"id" text PRIMARY KEY NOT NULL,
	"learner_id" text NOT NULL,
	"competency_id" text,
	"session_id" text,
	"subject_id" text,
	"event_type" text NOT NULL,
	"metadata" jsonb NOT NULL,
	"measurement_version" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "pilot_measurement_events" ADD CONSTRAINT "pilot_measurement_events_learner_id_learners_id_fk" FOREIGN KEY ("learner_id") REFERENCES "public"."learners"("id") ON DELETE restrict ON UPDATE no action;