-- Run only in Neon SQL Editor with neon-champagne-school / filumire-preview selected.
-- Read-only metadata; no migrations, application rows or credentials.
BEGIN READ ONLY;
SET LOCAL statement_timeout = '30s';
SET LOCAL lock_timeout = '5s';
SELECT current_database() AS database, current_user AS role,
       current_setting('transaction_read_only') AS read_only;

WITH required(table_name) AS (VALUES
  ('principals'), ('learners'), ('principal_learner_access'), ('auth_sessions'),
  ('account_credentials'), ('account_profiles'), ('learner_profiles'),
  ('guardian_consent_records'), ('auth_rate_limits'), ('teacher_link_codes'))
SELECT table_name, to_regclass(format('public.%I', table_name)) IS NOT NULL AS present
FROM required ORDER BY table_name;

SELECT table_name, column_name, data_type, udt_name, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name IN (
  'account_credentials', 'account_profiles', 'learner_profiles',
  'guardian_consent_records', 'auth_rate_limits', 'teacher_link_codes')
ORDER BY table_name, ordinal_position;

SELECT t.relname AS table_name, c.conname, c.contype, c.convalidated,
       pg_get_constraintdef(c.oid) AS definition
FROM pg_constraint c JOIN pg_class t ON t.oid = c.conrelid
JOIN pg_namespace n ON n.oid = t.relnamespace
WHERE n.nspname = 'public' AND t.relname IN (
  'account_credentials', 'account_profiles', 'learner_profiles',
  'guardian_consent_records', 'auth_rate_limits', 'teacher_link_codes')
ORDER BY t.relname, c.conname;

SELECT tablename, indexname, indexdef FROM pg_indexes
WHERE schemaname = 'public' AND tablename IN ('auth_rate_limits', 'teacher_link_codes')
ORDER BY tablename, indexname;

SELECT n.nspname AS schema, c.relname AS history_table
FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE c.relkind IN ('r','p') AND n.nspname NOT IN ('pg_catalog','information_schema')
AND c.relname ~* '(migration|schema_version|databasechangelog)'
ORDER BY n.nspname, c.relname;
ROLLBACK;
