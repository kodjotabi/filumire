CREATE TABLE "principal_learner_access" (
	"id" text PRIMARY KEY NOT NULL,
	"principal_id" text NOT NULL,
	"learner_id" text NOT NULL,
	"relationship_type" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "principal_learner_access_principal_learner_relationship_unique" UNIQUE("principal_id","learner_id","relationship_type")
);
--> statement-breakpoint
ALTER TABLE "principal_learner_access" ADD CONSTRAINT "principal_learner_access_principal_id_principals_id_fk" FOREIGN KEY ("principal_id") REFERENCES "public"."principals"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "principal_learner_access" ADD CONSTRAINT "principal_learner_access_learner_id_learners_id_fk" FOREIGN KEY ("learner_id") REFERENCES "public"."learners"("id") ON DELETE restrict ON UPDATE no action;