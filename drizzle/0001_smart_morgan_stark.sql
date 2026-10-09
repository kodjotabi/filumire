CREATE TABLE "sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"learner_id" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"last_activity_at" timestamp with time zone NOT NULL,
	"status" text NOT NULL
);
