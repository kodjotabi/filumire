-- One-time creation of the LOCAL persistent development database filumire_dev and its two roles.
-- Run as the local postgres superuser, from PowerShell (not the SQL Shell shortcut):
--   & "C:\Program Files\PostgreSQL\17\bin\psql.exe" -h localhost -U postgres -d postgres -f FILUMIRE_CLAUDE/scripts/sql/create-filumire-dev.sql
-- psql asks for the postgres password once. Role passwords and the JWT secret are generated here,
-- written only to the two git-ignored env files below, and never displayed or logged.
-- Refuses to run unless connected as a superuser to a local server where none of the roles,
-- the database or the env files exist yet. Touches no other database.
\set ON_ERROR_STOP on
\set QUIET on
\set VERBOSITY terse
\set owner_env C:/Users/tabi/Desktop/filumire-batch1/FILUMIRE_CLAUDE/.env.dev-owner.local
\set app_env C:/Users/tabi/Desktop/filumire-batch1/FILUMIRE_CLAUDE/.env.dev.local

-- Keep statements (which carry generated passwords) out of the server log, even on error.
SET log_min_error_statement = panic;
SET log_statement = 'none';
SET log_min_duration_statement = -1;

SELECT current_setting('is_superuser') = 'on' AS is_super,
       coalesce(inet_server_addr() << '127.0.0.0/8'::inet OR inet_server_addr() = '::1'::inet, true) AS is_local,
       EXISTS (SELECT 1 FROM pg_roles WHERE rolname IN ('filumire_dev_owner', 'filumire_app')) AS roles_exist,
       EXISTS (SELECT 1 FROM pg_database WHERE datname = 'filumire_dev') AS db_exists \gset
\if :is_super
\else
  \echo 'Stopped: connect as the postgres superuser. Nothing was changed.'
  \quit
\endif
\if :is_local
\else
  \echo 'Stopped: this script only runs against the local server. Nothing was changed.'
  \quit
\endif
\if :roles_exist
  \echo 'Stopped: filumire_dev_owner or filumire_app already exists. Nothing was changed.'
  \quit
\endif
\if :db_exists
  \echo 'Stopped: database filumire_dev already exists. Nothing was changed.'
  \quit
\endif
-- Checked on this computer (cmd.exe), not by the server process, which may not see the user's Desktop.
\set env_check `if exist "C:\Users\tabi\Desktop\filumire-batch1\FILUMIRE_CLAUDE\.env.dev-owner.local" (echo true) else if exist "C:\Users\tabi\Desktop\filumire-batch1\FILUMIRE_CLAUDE\.env.dev.local" (echo true) else (echo false)`
-- Fail closed: anything other than exactly "false" (an error, odd output) counts as "a file exists".
SELECT btrim(:'env_check', E' \r\n') <> 'false' AS env_exists \gset
\if :env_exists
  \echo 'Stopped: .env.dev-owner.local or .env.dev.local already exists in FILUMIRE_CLAUDE. Nothing was changed.'
  \quit
\endif

-- 64 hex characters each (two random UUIDs): no characters that need URL encoding.
SELECT replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '') AS owner_pw,
       replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '') AS app_pw,
       replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '') AS jwt_secret \gset

-- Both roles or neither. CREATE DATABASE cannot run inside a transaction, so it follows the commit.
-- If it ever failed, remove only the two new roles before re-running:
--   DROP ROLE filumire_app; DROP ROLE filumire_dev_owner;
BEGIN;
CREATE ROLE filumire_dev_owner LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS
  CONNECTION LIMIT 5 PASSWORD :'owner_pw';
CREATE ROLE filumire_app LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS
  CONNECTION LIMIT 20 PASSWORD :'app_pw';
COMMIT;
CREATE DATABASE filumire_dev OWNER filumire_dev_owner ENCODING 'UTF8' TEMPLATE template0;
REVOKE CONNECT, TEMPORARY ON DATABASE filumire_dev FROM PUBLIC;
GRANT CONNECT ON DATABASE filumire_dev TO filumire_dev_owner;

SELECT 'DATABASE_URL=postgresql://filumire_dev_owner:' || :'owner_pw' || '@localhost:5432/filumire_dev' AS owner_line,
       'DATABASE_URL=postgresql://filumire_app:' || :'app_pw' || '@localhost:5432/filumire_dev' AS app_line,
       'FILUMIRE_AUTH_JWT_SECRET=' || :'jwt_secret' AS jwt_line \gset

\o :owner_env
\qecho '# Local filumire_dev OWNER connection: schema setup and grants only. Generated; never commit.'
\qecho :owner_line
\o :app_env
\qecho '# Local filumire_dev APP connection (least-privilege filumire_app). Generated; never commit.'
\qecho 'FILUMIRE_PERSISTENCE=postgres'
\qecho :app_line
\qecho :jwt_line
\o

\unset owner_pw
\unset app_pw
\unset jwt_secret
\unset owner_line
\unset app_line
\unset jwt_line
\echo 'Done: roles filumire_dev_owner and filumire_app, database filumire_dev, and both env files created. No password was displayed.'
