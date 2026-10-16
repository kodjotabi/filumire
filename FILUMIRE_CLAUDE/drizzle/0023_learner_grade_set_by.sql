-- 0023: who placed the learner in their grade (16 Oct 2026).
-- Additive only: one nullable column on learner_learning_context, no row
-- changed. NULL means nobody chose the grade (the lazily created default,
-- or a row written before this migration); 'guardian' or 'learner' records
-- an explicit choice. A grade the guardian chose is preselected and locked
-- in the learner's first-time setup.
-- Applying this file requires separate owner approval per database.

ALTER TABLE "learner_learning_context"
	ADD COLUMN IF NOT EXISTS "grade_set_by" text;

ALTER TABLE "learner_learning_context"
	ADD CONSTRAINT "learner_learning_context_grade_set_by_check"
	CHECK ("grade_set_by" IS NULL OR "grade_set_by" in ('guardian', 'learner'));
