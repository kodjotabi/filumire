CREATE TABLE "learner_learning_context" (
	"learner_id" text PRIMARY KEY NOT NULL,
	"curriculum_version_id" text NOT NULL,
	"grade_id" text NOT NULL,
	"active_subject_id" text NOT NULL,
	"active_competency_id" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "learner_learning_context" ADD CONSTRAINT "learner_learning_context_learner_id_learners_id_fk" FOREIGN KEY ("learner_id") REFERENCES "public"."learners"("id") ON DELETE restrict ON UPDATE no action;