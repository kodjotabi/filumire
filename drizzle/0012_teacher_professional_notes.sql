CREATE TABLE "teacher_professional_notes" (
	"id" text PRIMARY KEY NOT NULL,
	"learner_id" text NOT NULL,
	"competency_id" text,
	"author_principal_id" text NOT NULL,
	"note_type" text NOT NULL,
	"text" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "teacher_professional_notes" ADD CONSTRAINT "teacher_professional_notes_learner_id_learners_id_fk" FOREIGN KEY ("learner_id") REFERENCES "public"."learners"("id") ON DELETE restrict ON UPDATE no action;