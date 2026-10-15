-- Least-privilege grants for the application role (audit S-DB2), for TEST branches first.
-- Run as the database owner AFTER migrations, in the target database. The role itself
-- (filumire_app) is created separately through SQL, NOT the Neon console: console-created
-- roles are made members of neon_superuser. This file never contains credentials.
-- The app reads and writes rows only: no CREATE, ALTER, DROP, TRUNCATE or role management.
-- Migrations keep running as the owner role, separately approved.

-- Privilege guard: refuse to grant anything to an elevated or misconfigured role.
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'filumire_app') THEN
    RAISE EXCEPTION 'Role filumire_app does not exist; create it as a restricted SQL login role first';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'filumire_app'
             AND (rolsuper OR rolcreaterole OR rolcreatedb OR rolreplication OR rolbypassrls
                  OR NOT rolcanlogin OR rolconnlimit NOT BETWEEN 1 AND 20)) THEN
    RAISE EXCEPTION 'filumire_app has elevated attributes or no connection limit; stop and review';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_auth_members m JOIN pg_roles r ON r.oid = m.member
             WHERE r.rolname = 'filumire_app') THEN
    RAISE EXCEPTION 'filumire_app is a member of another role (e.g. neon_superuser); stop and review';
  END IF;
END $$;

-- Per-table grants, derived from what runtime code does (services/**, 15 Oct 2026, schema after
-- 0022). Default deny: every public table must appear below either as granted or as denied,
-- otherwise the final check fails, so a new migration's tables need an explicit decision here.
-- Must match APP_ROLE_MATRIX in scripts/test-app-role-permissions.mjs.
BEGIN;

-- Coverage check: refuse if the schema has a table this file has not classified.
DO $$
DECLARE unclassified text;
BEGIN
  SELECT string_agg(tablename, ', ') INTO unclassified FROM pg_tables
  WHERE schemaname = 'public' AND tablename NOT IN (
    'account_credentials', 'account_profiles', 'auth_rate_limits', 'auth_sessions',
    'controlled_teacher_actions', 'external_identities', 'guardian_consent_records', 'interventions',
    'learner_learning_context', 'learner_profiles', 'learner_states', 'learners', 'learning_evidence',
    'parent_teacher_messages', 'pending_teacher_reviews', 'pilot_measurement_events',
    'principal_learner_access', 'principals', 'sessions', 'teacher_link_codes',
    'teacher_professional_notes',
    -- denied:
    'filumire_schema_migrations', 'payment_attempt_events', 'payment_attempts', 'payment_exceptions',
    'payment_obligation_beneficiaries', 'payment_obligation_events', 'payment_obligations',
    'payment_receipts');
  IF unclassified IS NOT NULL THEN
    RAISE EXCEPTION 'Unclassified tables, decide their app grants first: %', unclassified;
  END IF;
END $$;

-- Clean slate, so re-running converges on exactly this list.
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM filumire_app;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM filumire_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM filumire_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM filumire_app;
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
REVOKE CREATE ON SCHEMA public FROM filumire_app;
DO $$ BEGIN EXECUTE format('GRANT CONNECT ON DATABASE %I TO filumire_app', current_database()); END $$;
GRANT USAGE ON SCHEMA public TO filumire_app;

-- Append-only records: read and add, never change or remove.
GRANT SELECT, INSERT ON account_profiles, controlled_teacher_actions, external_identities,
  guardian_consent_records, learners, learning_evidence, parent_teacher_messages,
  pilot_measurement_events, teacher_professional_notes TO filumire_app;
-- Records the app updates in place (including upserts).
GRANT SELECT, INSERT, UPDATE ON account_credentials, auth_sessions, interventions,
  learner_learning_context, learner_profiles, learner_states, pending_teacher_reviews,
  principal_learner_access, sessions, teacher_link_codes TO filumire_app;
-- Rate-limit windows are upserted and expired windows are swept.
GRANT SELECT, INSERT, UPDATE, DELETE ON auth_rate_limits TO filumire_app;
-- Principals: DELETE only to discard an unused candidate after losing a sign-up race
-- (persistence-postgres.ts); foreign keys are ON DELETE RESTRICT.
GRANT SELECT, INSERT, DELETE ON principals TO filumire_app;
-- Denied, by not granting: filumire_schema_migrations (owner only) and all payment_* tables
-- (payments are blocked; no runtime code uses them). No TRUNCATE, REFERENCES or TRIGGER anywhere.

COMMIT;
