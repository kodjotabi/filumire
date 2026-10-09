-- Read-only pre-flight for migration 0017_validate_stage1_learner_fks.
--
-- Migration 0005 created four learner foreign keys NOT VALID (existing rows
-- were never checked). VALIDATE CONSTRAINT fails if any existing row points
-- at a learner that does not exist. This script reports such rows WITHOUT
-- changing anything: it runs in a READ ONLY transaction (PostgreSQL rejects
-- any write) and ends with ROLLBACK.
--
-- Run (example):  psql -d <database> -f scripts/check-stage1-fk-violations.sql
-- Expected before migrating: every orphan_rows value is 0.

BEGIN TRANSACTION READ ONLY;

-- 1. Current state of the four constraints (convalidated = false means not yet validated).
SELECT conrelid::regclass AS table_name, conname AS constraint_name, convalidated
FROM pg_constraint
WHERE conname IN (
  'interventions_learner_id_learners_id_fk',
  'learner_states_learner_id_learners_id_fk',
  'learning_evidence_learner_id_learners_id_fk',
  'sessions_learner_id_learners_id_fk'
)
ORDER BY 1;

-- 2. Rows whose learner_id has no matching learner (these would make VALIDATE fail).
SELECT 'interventions' AS table_name, count(*) AS orphan_rows
FROM interventions c
WHERE c.learner_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM learners l WHERE l.id = c.learner_id)
UNION ALL
SELECT 'learner_states', count(*)
FROM learner_states c
WHERE c.learner_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM learners l WHERE l.id = c.learner_id)
UNION ALL
SELECT 'learning_evidence', count(*)
FROM learning_evidence c
WHERE c.learner_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM learners l WHERE l.id = c.learner_id)
UNION ALL
SELECT 'sessions', count(*)
FROM sessions c
WHERE c.learner_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM learners l WHERE l.id = c.learner_id);

-- 3. Up to 20 distinct orphaned learner ids per table, to investigate if any count above is not 0.
SELECT table_name, learner_id FROM (
  SELECT 'interventions' AS table_name, c.learner_id, row_number() OVER (PARTITION BY 1 ORDER BY c.learner_id) AS n
  FROM (SELECT DISTINCT learner_id FROM interventions) c
  WHERE c.learner_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM learners l WHERE l.id = c.learner_id)
  UNION ALL
  SELECT 'learner_states', c.learner_id, row_number() OVER (PARTITION BY 1 ORDER BY c.learner_id)
  FROM (SELECT DISTINCT learner_id FROM learner_states) c
  WHERE c.learner_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM learners l WHERE l.id = c.learner_id)
  UNION ALL
  SELECT 'learning_evidence', c.learner_id, row_number() OVER (PARTITION BY 1 ORDER BY c.learner_id)
  FROM (SELECT DISTINCT learner_id FROM learning_evidence) c
  WHERE c.learner_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM learners l WHERE l.id = c.learner_id)
  UNION ALL
  SELECT 'sessions', c.learner_id, row_number() OVER (PARTITION BY 1 ORDER BY c.learner_id)
  FROM (SELECT DISTINCT learner_id FROM sessions) c
  WHERE c.learner_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM learners l WHERE l.id = c.learner_id)
) orphans
WHERE n <= 20
ORDER BY 1, 2;

ROLLBACK;
