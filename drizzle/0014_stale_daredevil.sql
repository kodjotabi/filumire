CREATE TABLE "parent_teacher_messages" (
	"id" text PRIMARY KEY NOT NULL,
	"learner_id" text NOT NULL,
	"author_principal_id" text NOT NULL,
	"sender_role" text NOT NULL,
	"text" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "parent_teacher_messages" ADD CONSTRAINT "parent_teacher_messages_learner_id_learners_id_fk" FOREIGN KEY ("learner_id") REFERENCES "public"."learners"("id") ON DELETE restrict ON UPDATE no action;