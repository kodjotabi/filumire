-- Custom SQL migration file, put your code below! --
-- Validate the four Stage 1 learner foreign keys that 0005 created NOT VALID.
-- Changes no data and no schema shape; it only checks existing rows and marks
-- the constraints validated. Takes SHARE UPDATE EXCLUSIVE locks (reads and
-- writes continue). FAILS if any existing row references a missing learner:
-- run scripts/check-stage1-fk-violations.sql (read-only) first and expect 0.
ALTER TABLE "interventions" VALIDATE CONSTRAINT "interventions_learner_id_learners_id_fk";--> statement-breakpoint
ALTER TABLE "learner_states" VALIDATE CONSTRAINT "learner_states_learner_id_learners_id_fk";--> statement-breakpoint
ALTER TABLE "learning_evidence" VALIDATE CONSTRAINT "learning_evidence_learner_id_learners_id_fk";--> statement-breakpoint
ALTER TABLE "sessions" VALIDATE CONSTRAINT "sessions_learner_id_learners_id_fk";
