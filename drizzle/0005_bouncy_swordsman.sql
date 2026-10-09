CREATE TABLE "learners" (
	"id" text PRIMARY KEY NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
INSERT INTO "learners" ("id")
SELECT "learner_id"
FROM (
	SELECT "learner_id" FROM "learner_states"
	UNION
	SELECT "learner_id" FROM "learning_evidence"
	UNION
	SELECT "learner_id" FROM "sessions"
	UNION
	SELECT "learner_id" FROM "interventions"
) AS "distinct_learner_ids";
--> statement-breakpoint
DO $$
DECLARE
	expected_count bigint;
	actual_count bigint;
BEGIN
	SELECT COUNT(*)
	INTO expected_count
	FROM (
		SELECT "learner_id" FROM "learner_states"
		UNION
		SELECT "learner_id" FROM "learning_evidence"
		UNION
		SELECT "learner_id" FROM "sessions"
		UNION
		SELECT "learner_id" FROM "interventions"
	) AS "distinct_learner_ids";

	SELECT COUNT(*)
	INTO actual_count
	FROM "learners";

	IF actual_count <> expected_count THEN
		RAISE EXCEPTION 'Learner backfill count mismatch: expected %, found %', expected_count, actual_count;
	END IF;
END $$;
--> statement-breakpoint
ALTER TABLE "interventions" ADD CONSTRAINT "interventions_learner_id_learners_id_fk" FOREIGN KEY ("learner_id") REFERENCES "public"."learners"("id") ON DELETE restrict ON UPDATE no action NOT VALID;--> statement-breakpoint
ALTER TABLE "learner_states" ADD CONSTRAINT "learner_states_learner_id_learners_id_fk" FOREIGN KEY ("learner_id") REFERENCES "public"."learners"("id") ON DELETE restrict ON UPDATE no action NOT VALID;--> statement-breakpoint
ALTER TABLE "learning_evidence" ADD CONSTRAINT "learning_evidence_learner_id_learners_id_fk" FOREIGN KEY ("learner_id") REFERENCES "public"."learners"("id") ON DELETE restrict ON UPDATE no action NOT VALID;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_learner_id_learners_id_fk" FOREIGN KEY ("learner_id") REFERENCES "public"."learners"("id") ON DELETE restrict ON UPDATE no action NOT VALID;