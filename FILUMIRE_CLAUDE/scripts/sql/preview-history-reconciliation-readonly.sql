-- Preview migration-history reconciliation: step R1, READ-ONLY.
-- Run only after explicit approval, in the Neon SQL Editor with project
-- proud-term-61114809 / branch filumire-preview (br-round-resonance-b8fm2nao) /
-- database neondb selected. Not for main, integration-test or any other branch.
-- See docs/PREVIEW_MIGRATION_HISTORY_RECONCILIATION_PLAN.md.
--
-- Catalog metadata, ledger rows and row-count estimates only: no application
-- row contents, no credentials. One READ ONLY transaction, ended by ROLLBACK.
-- Every statement is a SELECT; nothing is created, changed or recorded.
-- If any statement errors, the rest fail too: stop and share the error text.

BEGIN READ ONLY;
SET LOCAL statement_timeout = '30s';
SET LOCAL lock_timeout = '5s';

-- Q0. Identity. Neon settings are informational; NULL when not exposed.
SELECT current_database() AS database, current_user AS role,
       (SELECT rolsuper FROM pg_roles WHERE rolname = current_user) AS superuser,
       current_setting('transaction_read_only') AS read_only,
       current_setting('server_version') AS server_version,
       current_setting('neon.timeline_id', true) AS neon_timeline_id,
       current_setting('neon.tenant_id', true) AS neon_tenant_id,
       now() AS captured_at;

-- Q1. Any migration-history table, in any non-system schema (Drizzle uses drizzle.__drizzle_migrations).
SELECT n.nspname AS schema, c.relname AS history_table, c.relkind
FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname NOT IN ('pg_catalog', 'information_schema') AND n.nspname NOT LIKE 'pg_toast%'
  AND c.relname ~* '(migration|schema_version|changelog|flyway)'
ORDER BY 1, 2;

-- Q2. Contents of the two known history tables, only if they exist.
SELECT CASE WHEN to_regclass('public.filumire_schema_migrations') IS NULL THEN 'absent'
       ELSE query_to_xml('SELECT id, kind, sha256, applied_at, applied_by FROM public.filumire_schema_migrations ORDER BY applied_at, id', true, false, '')::text
       END AS filumire_ledger,
       CASE WHEN to_regclass('drizzle.__drizzle_migrations') IS NULL THEN 'absent'
       ELSE query_to_xml('SELECT * FROM drizzle.__drizzle_migrations ORDER BY 1', true, false, '')::text
       END AS drizzle_journal;

-- Q3. Every relation in public: kind, owner, options (views and sequences included).
SELECT c.relname, c.relkind, pg_get_userbyid(c.relowner) AS owner, c.reloptions, c.relrowsecurity
FROM pg_class c
WHERE c.relnamespace = 'public'::regnamespace AND c.relkind IN ('r', 'p', 'v', 'm', 'S', 'f')
ORDER BY c.relkind, c.relname;

-- Q4. Objects owned by migrations 0019-0024: columns.
SELECT table_name, ordinal_position, column_name, data_type, udt_name, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name IN (
  'account_credentials', 'account_profiles', 'learner_profiles', 'guardian_consent_records',  -- 0019
  'auth_rate_limits',                                                                          -- 0020
  'teacher_link_codes',                                                                        -- 0021
  'filumire_schema_migrations',                                                                -- 0022
  'learner_learning_context',                                                                  -- 0023
  'filumire_deployment_migration_0023')                                                        -- 0024
ORDER BY table_name, ordinal_position;

-- Q5. Same objects: constraints, with validation state.
SELECT t.relname AS table_name, c.conname, c.contype, c.convalidated, pg_get_constraintdef(c.oid) AS definition
FROM pg_constraint c JOIN pg_class t ON t.oid = c.conrelid
WHERE t.relnamespace = 'public'::regnamespace AND t.relname IN (
  'account_credentials', 'account_profiles', 'learner_profiles', 'guardian_consent_records',
  'auth_rate_limits', 'teacher_link_codes', 'filumire_schema_migrations', 'learner_learning_context')
ORDER BY 1, 2;

-- Q6. Same objects: indexes.
SELECT tablename, indexname, indexdef FROM pg_indexes
WHERE schemaname = 'public' AND tablename IN (
  'account_credentials', 'account_profiles', 'learner_profiles', 'guardian_consent_records',
  'auth_rate_limits', 'teacher_link_codes', 'filumire_schema_migrations', 'learner_learning_context')
ORDER BY 1, 2;

-- Q7. Migration 0024's view, if present.
SELECT CASE WHEN to_regclass('public.filumire_deployment_migration_0023') IS NULL THEN 'absent'
       ELSE pg_get_viewdef('public.filumire_deployment_migration_0023'::regclass, true) END AS view_definition;

-- Q8. Whole-schema fingerprints, comparable between branches when this same file is run on each.
-- (Not the catalog-snapshot.mjs hash; that one is computed by the reviewed tooling.)
SELECT
  (SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE') AS base_tables,
  (SELECT encode(sha256(convert_to(coalesce(string_agg(format('%s|%s|%s|%s|%s|%s', table_name, column_name, data_type, udt_name, is_nullable, column_default), E'\n' ORDER BY table_name, column_name), ''), 'UTF8')), 'hex')
     FROM information_schema.columns WHERE table_schema = 'public') AS columns_sha256,
  (SELECT encode(sha256(convert_to(coalesce(string_agg(format('%s|%s|%s|%s', conrelid::regclass, conname, contype, pg_get_constraintdef(oid)), E'\n' ORDER BY conrelid::regclass::text, conname), ''), 'UTF8')), 'hex')
     FROM pg_constraint WHERE connamespace = 'public'::regnamespace) AS constraints_sha256,
  (SELECT encode(sha256(convert_to(coalesce(string_agg(format('%s|%s|%s', tablename, indexname, indexdef), E'\n' ORDER BY tablename, indexname), ''), 'UTF8')), 'hex')
     FROM pg_indexes WHERE schemaname = 'public') AS indexes_sha256;

-- Q9. Roles relevant to later steps: the application role and its memberships, if it exists.
SELECT r.rolname, r.rolsuper, r.rolcreaterole, r.rolcreatedb, r.rolreplication, r.rolbypassrls,
       r.rolcanlogin, r.rolconnlimit,
       ARRAY(SELECT g.rolname FROM pg_auth_members m JOIN pg_roles g ON g.oid = m.roleid WHERE m.member = r.oid ORDER BY 1) AS member_of
FROM pg_roles r WHERE r.rolname IN ('filumire_app', current_user) ORDER BY 1;

-- Q10. Privileges filumire_app holds on public relations (empty if the role does not exist).
SELECT c.relname, a.privilege_type
FROM pg_class c, aclexplode(c.relacl) a
WHERE c.relnamespace = 'public'::regnamespace
  AND a.grantee = (SELECT oid FROM pg_roles WHERE rolname = 'filumire_app')
ORDER BY 1, 2;

-- Q11. Default privileges in public (they apply to objects a future migration creates).
SELECT pg_get_userbyid(d.defaclrole) AS creator, d.defaclobjtype, d.defaclacl::text AS acl
FROM pg_default_acl d
WHERE d.defaclnamespace IN (0, 'public'::regnamespace)
ORDER BY 1, 2;

-- Q12. Row-count estimates per public table (statistics only, no row contents).
SELECT relname, n_live_tup FROM pg_stat_user_tables WHERE schemaname = 'public' ORDER BY relname;

-- Q13. Concurrent activity and locks that would matter to a later migration.
SELECT count(*) FILTER (WHERE pid <> pg_backend_pid()) AS other_sessions,
       count(*) FILTER (WHERE pid <> pg_backend_pid() AND state <> 'idle') AS other_active,
       count(*) FILTER (WHERE query = '<insufficient privilege>') AS sessions_not_visible
FROM pg_stat_activity WHERE datname = current_database();
SELECT l.locktype, l.mode, l.granted, l.relation::regclass AS relation, l.objid
FROM pg_locks l
WHERE l.pid <> pg_backend_pid() AND l.database = (SELECT oid FROM pg_database WHERE datname = current_database())
  AND (l.locktype = 'advisory' OR l.mode IN ('AccessExclusiveLock', 'ExclusiveLock', 'ShareRowExclusiveLock') OR NOT l.granted)
ORDER BY 1, 2;

ROLLBACK;
