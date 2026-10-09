CREATE TABLE "controlled_teacher_actions" (
	"id" text PRIMARY KEY NOT NULL,
	"learner_id" text NOT NULL,
	"competency_id" text NOT NULL,
	"teacher_principal_id" text NOT NULL,
	"action_type" text NOT NULL,
	"reason" text,
	"status" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"resolved_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "controlled_teacher_actions" ADD CONSTRAINT "controlled_teacher_actions_learner_id_learners_id_fk" FOREIGN KEY ("learner_id") REFERENCES "public"."learners"("id") ON DELETE restrict ON UPDATE no action;