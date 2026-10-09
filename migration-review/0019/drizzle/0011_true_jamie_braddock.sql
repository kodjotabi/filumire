CREATE TABLE "pending_teacher_reviews" (
	"id" text PRIMARY KEY NOT NULL,
	"learner_id" text NOT NULL,
	"competency_id" text NOT NULL,
	"assessment_item_id" text NOT NULL,
	"content_id" text,
	"session_id" text NOT NULL,
	"response" text NOT NULL,
	"status" text NOT NULL,
	"submitted_at" timestamp with time zone NOT NULL,
	"reviewed_at" timestamp with time zone,
	"reviewed_by_principal_id" text,
	"evidence_id" text
);
--> statement-breakpoint
ALTER TABLE "pending_teacher_reviews" ADD CONSTRAINT "pending_teacher_reviews_learner_id_learners_id_fk" FOREIGN KEY ("learner_id") REFERENCES "public"."learners"("id") ON DELETE restrict ON UPDATE no action;