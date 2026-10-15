-- Least-privilege grants for the application role (audit S-DB2), for TEST branches first.
-- Run as the database owner AFTER migrations, in the target database. The role itself
-- (filumire_app) is created in the Neon console so Neon generates and holds its password;
-- this file never contains credentials.
-- The app reads and writes rows only: no CREATE, ALTER, DROP, TRUNCATE or role management.
-- Migrations keep running as the owner role, separately approved.

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'filumire_app') THEN
    RAISE EXCEPTION 'Create role filumire_app in the Neon console first';
  END IF;
END $$;

REVOKE CREATE ON SCHEMA public FROM PUBLIC;
REVOKE CREATE ON SCHEMA public FROM filumire_app;
DO $$ BEGIN EXECUTE format('GRANT CONNECT ON DATABASE %I TO filumire_app', current_database()); END $$;
GRANT USAGE ON SCHEMA public TO filumire_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO filumire_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO filumire_app;
-- The ledger is written by the owner only; the app may read it.
REVOKE INSERT, UPDATE, DELETE ON filumire_schema_migrations FROM filumire_app;
-- Tables created later by the owner (future migrations) get the same row-level rights.
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO filumire_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO filumire_app;
