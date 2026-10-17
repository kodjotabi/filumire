-- Preview migration-history reconciliation: steps R1b and R1, READ-ONLY.
-- See docs/PREVIEW_MIGRATION_HISTORY_RECONCILIATION_PLAN.md. Run only after explicit
-- approval of the step, in the Neon SQL Editor, project proud-term-61114809,
-- database neondb, role neondb_owner, with exactly one of these branches selected:
--   R1b: integration-test   (br-long-leaf-b8wixqz2,       ep-rough-water-b8fcf7pe)
--   R1:  filumire-preview   (br-round-resonance-b8fm2nao, ep-icy-scene-b816974r)
-- Never main (ep-cold-bird-b8j437np) or any other branch.
--
-- Catalog metadata, ledger rows and row-count estimates only: no application
-- row contents, no credentials. Every statement after BEGIN is a SELECT; nothing
-- is created, changed or recorded. Catalog reads use pg_catalog, not
-- information_schema, so objects this role cannot access are not silently hidden.
-- Check Q0 first: read_only must be 'on'. If any statement errors, the rest of
-- the transaction fails too: stop and share the error text.

BEGIN READ ONLY;
SET LOCAL statement_timeout = '30s';
SET LOCAL lock_timeout = '5s';

-- Q0. Identity. timeline_id differs per Neon branch (informational; NULL if not exposed).
SELECT current_database() AS database, current_user AS role,
       (SELECT rolsuper FROM pg_roles WHERE rolname = current_user) AS superuser,
       current_setting('transaction_read_only') AS read_only,
       current_setting('server_version') AS server_version,
       current_setting('neon.timeline_id', true) AS neon_timeline_id,
       now() AS captured_at;

-- Q1. Any migration-history table or view, in any non-system schema (Drizzle uses drizzle.__drizzle_migrations).
SELECT n.nspname AS schema, c.relname AS history_relation, c.relkind
FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname NOT IN ('pg_catalog', 'information_schema') AND n.nspname NOT LIKE 'pg_toast%'
  AND c.relkind IN ('r', 'p', 'v', 'm', 'f')
  AND c.relname ~* '(migration|schema_version|changelog|flyway)'
ORDER BY 1, 2;

-- Q2. Contents of the two known history tables, only if they exist and this role may read them.
-- The queries are text, run by query_to_xml only in the matching CASE branch.
SELECT CASE WHEN to_regclass('public.filumire_schema_migrations') IS NULL THEN 'absent'
            WHEN NOT has_table_privilege(to_regclass('public.filumire_schema_migrations'), 'SELECT') THEN 'present, not readable by this role'
            ELSE query_to_xml('SELECT id, kind, sha256, applied_at, applied_by FROM public.filumire_schema_migrations ORDER BY applied_at, id', true, false, '')::text
       END AS filumire_ledger,
       CASE WHEN to_regclass('drizzle.__drizzle_migrations') IS NULL THEN 'absent'
            WHEN NOT has_schema_privilege('drizzle', 'USAGE')
              OR NOT has_table_privilege(to_regclass('drizzle.__drizzle_migrations'), 'SELECT') THEN 'present, not readable by this role'
            ELSE query_to_xml('SELECT * FROM drizzle.__drizzle_migrations ORDER BY 1', true, false, '')::text
       END AS drizzle_journal;

-- Q3. Every relation in public: kind, owner, options, row security (views and sequences included).
SELECT c.relname, c.relkind, pg_get_userbyid(c.relowner) AS owner, c.reloptions,
       c.relrowsecurity, c.relforcerowsecurity
FROM pg_class c
WHERE c.relnamespace = 'public'::regnamespace AND c.relkind IN ('r', 'p', 'v', 'm', 'S', 'f')
ORDER BY c.relkind, c.relname;

-- Q4. Objects that migrations 0019-0024 create or change: columns.
SELECT c.relname AS table_name, a.attnum, a.attname AS column_name,
       format_type(a.atttypid, a.atttypmod) AS data_type, a.attnotnull AS not_null,
       pg_get_expr(d.adbin, d.adrelid) AS column_default, a.attidentity, a.attgenerated
FROM pg_attribute a
JOIN pg_class c ON c.oid = a.attrelid
LEFT JOIN pg_attrdef d ON d.adrelid = a.attrelid AND d.adnum = a.attnum
WHERE c.relnamespace = 'public'::regnamespace AND a.attnum > 0 AND NOT a.attisdropped
  AND c.relname IN (
  'account_credentials', 'account_profiles', 'learner_profiles', 'guardian_consent_records',  -- 0019
  'auth_rate_limits',                                                                          -- 0020
  'teacher_link_codes',                                                                        -- 0021
  'filumire_schema_migrations',                                                                -- 0022
  'learner_learning_context',                                                                  -- 0023
  'filumire_deployment_migration_0023')                                                        -- 0024
ORDER BY 1, 2;

-- Q5. Same objects: constraints, with validation state (PostgreSQL 18 also lists NOT NULL as contype 'n').
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

-- Q7. Migration 0024's view, if present. to_regclass returns NULL when absent, and
-- pg_get_viewdef(NULL) is NULL, so an absent view cannot raise an error.
SELECT coalesce(pg_get_viewdef(to_regclass('public.filumire_deployment_migration_0023'), true), 'absent') AS view_definition;

-- Q8. Whole-schema fingerprints, comparable between branches when this same file runs on each
-- (same Neon project, so same PostgreSQL version; confirm with Q0). Not the catalog-snapshot.mjs hash.
-- Separator is chr(10), a newline: the Neon SQL Editor stops splitting statements at the
-- first backslash, so this file must contain none (an escape-string newline broke R1b run 1).
SELECT
  (SELECT count(*) FROM pg_class WHERE relnamespace = 'public'::regnamespace AND relkind IN ('r', 'p')) AS base_tables,
  (SELECT encode(sha256(convert_to(coalesce(string_agg(
            format('%s|%s|%s|%s|%s', c.relname, a.attname, format_type(a.atttypid, a.atttypmod), a.attnotnull, pg_get_expr(d.adbin, d.adrelid)),
            chr(10) ORDER BY c.relname, a.attname), ''), 'UTF8')), 'hex')
     FROM pg_attribute a JOIN pg_class c ON c.oid = a.attrelid
     LEFT JOIN pg_attrdef d ON d.adrelid = a.attrelid AND d.adnum = a.attnum
     WHERE c.relnamespace = 'public'::regnamespace AND c.relkind IN ('r', 'p', 'v', 'm', 'f')
       AND a.attnum > 0 AND NOT a.attisdropped) AS columns_sha256,
  (SELECT encode(sha256(convert_to(coalesce(string_agg(
            format('%s|%s|%s|%s', conrelid::regclass, conname, contype, pg_get_constraintdef(oid)),
            chr(10) ORDER BY conrelid::regclass::text, conname), ''), 'UTF8')), 'hex')
     FROM pg_constraint WHERE connamespace = 'public'::regnamespace) AS constraints_sha256,
  (SELECT encode(sha256(convert_to(coalesce(string_agg(
            format('%s|%s|%s', tablename, indexname, indexdef),
            chr(10) ORDER BY tablename, indexname), ''), 'UTF8')), 'hex')
     FROM pg_indexes WHERE schemaname = 'public') AS indexes_sha256;

-- Q9. Triggers and row-security policies on public relations (either could change what a migration does).
SELECT 'trigger' AS kind, tgrelid::regclass::text AS relation, tgname AS name, pg_get_triggerdef(oid) AS definition
FROM pg_trigger
WHERE NOT tgisinternal AND tgrelid IN (SELECT oid FROM pg_class WHERE relnamespace = 'public'::regnamespace)
UNION ALL
SELECT 'policy', polrelid::regclass::text, polname, pg_get_expr(polqual, polrelid)
FROM pg_policy
WHERE polrelid IN (SELECT oid FROM pg_class WHERE relnamespace = 'public'::regnamespace)
ORDER BY 1, 2, 3;

-- Q10. Roles relevant to later steps: this role and filumire_app (if it exists), with memberships.
SELECT r.rolname, r.rolsuper, r.rolcreaterole, r.rolcreatedb, r.rolreplication, r.rolbypassrls,
       r.rolcanlogin, r.rolconnlimit,
       ARRAY(SELECT g.rolname FROM pg_auth_members m JOIN pg_roles g ON g.oid = m.roleid WHERE m.member = r.oid ORDER BY 1) AS member_of
FROM pg_roles r WHERE r.rolname IN ('filumire_app', current_user) ORDER BY 1;

-- Q11. Table- and column-level privileges held by filumire_app or PUBLIC on public relations.
SELECT c.relname, NULL::name AS column_name,
       CASE a.grantee WHEN 0 THEN 'PUBLIC' ELSE pg_get_userbyid(a.grantee)::text END AS grantee, a.privilege_type
FROM pg_class c, aclexplode(c.relacl) a
WHERE c.relnamespace = 'public'::regnamespace
  AND (a.grantee = 0 OR a.grantee = (SELECT oid FROM pg_roles WHERE rolname = 'filumire_app'))
UNION ALL
SELECT c.relname, att.attname,
       CASE a.grantee WHEN 0 THEN 'PUBLIC' ELSE pg_get_userbyid(a.grantee)::text END, a.privilege_type
FROM pg_attribute att JOIN pg_class c ON c.oid = att.attrelid, aclexplode(att.attacl) a
WHERE c.relnamespace = 'public'::regnamespace AND att.attacl IS NOT NULL
  AND (a.grantee = 0 OR a.grantee = (SELECT oid FROM pg_roles WHERE rolname = 'filumire_app'))
ORDER BY 1, 2, 3, 4;

-- Q12. Default privileges, global or in public (they apply to objects a future migration creates).
SELECT pg_get_userbyid(d.defaclrole) AS creator, d.defaclnamespace = 0 AS global, d.defaclobjtype, d.defaclacl::text AS acl
FROM pg_default_acl d
WHERE d.defaclnamespace = 0 OR d.defaclnamespace = 'public'::regnamespace
ORDER BY 1, 2, 3;

-- Q13. Row-count estimates per public table (statistics only, no row contents; may read 0
-- after a compute restart, so they are indicative, not exact).
SELECT relname, n_live_tup FROM pg_stat_user_tables WHERE schemaname = 'public' ORDER BY relname;

-- Q14. Concurrent activity and locks that would matter to a later migration.
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
