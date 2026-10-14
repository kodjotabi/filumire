-- BLOCKED PROPOSAL ONLY: do not execute without a fresh approved safety gate.
-- Target: neon-champagne-school / filumire-preview (br-round-resonance-b8fm2nao) / neondb.
-- Endpoint mapping, Production/main isolation and usable recovery remain unverified.
-- This artifact contains the exact committed 0020 and 0021 SQL, in that order.
-- The deliberate exception prevents schema changes if this proposal is run accidentally.
-- It must remain until isolation/recovery evidence is reviewed and execution is authorized.
BEGIN;
SET LOCAL search_path = public, pg_catalog;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';
SET LOCAL idle_in_transaction_session_timeout = '60s';
DO $filumire_blocked$
BEGIN
  RAISE EXCEPTION 'BLOCKED: Preview isolation/recovery verification and migration authorization required';
END;
$filumire_blocked$;

-- BEGIN 0020_auth_rate_limits.sql; SHA-256 f3c77a33a20759cc7ff22f90699b3a0b639169a14b7e6e37cf1c618d5f80a74e
-- FILUMIRE shared sign-in rate limits. Additive only: creates one
-- new table and changes no existing table or row. Hand-written to
-- follow 0019_learner_accounts.sql; regenerate the drizzle
-- snapshot/journal when the branches are combined.

CREATE TABLE IF NOT EXISTS "auth_rate_limits" (
	"key_hash" text PRIMARY KEY NOT NULL,
	"request_count" integer NOT NULL,
	"window_ends_at" timestamp with time zone NOT NULL
);

CREATE INDEX IF NOT EXISTS "auth_rate_limits_window_ends_at_idx" ON "auth_rate_limits" USING btree ("window_ends_at");

-- END 0020_auth_rate_limits.sql

-- BEGIN 0021_teacher_accounts.sql; SHA-256 f4276c21c24d034e86acdec99ac124284b5f2adb375d5282e352021294e0ddeb
-- FILUMIRE teacher accounts and guardian-issued teacher link codes.
-- Additive: one new table, and the account-kind check widened to
-- also allow 'teacher'. No existing row is changed or removed.
-- Hand-written to follow 0020_auth_rate_limits.sql.

ALTER TABLE "account_credentials" DROP CONSTRAINT IF EXISTS "account_credentials_account_kind_check";
ALTER TABLE "account_credentials" ADD CONSTRAINT "account_credentials_account_kind_check" CHECK ("account_kind" in ('guardian', 'learner', 'teacher'));

CREATE TABLE IF NOT EXISTS "teacher_link_codes" (
	"id" text PRIMARY KEY NOT NULL,
	"code_hash" text NOT NULL,
	"learner_id" text NOT NULL,
	"created_by_principal_id" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone,
	"used_by_principal_id" text,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "teacher_link_codes_code_hash_unique" UNIQUE("code_hash"),
	CONSTRAINT "teacher_link_codes_learner_id_learners_id_fk" FOREIGN KEY ("learner_id") REFERENCES "public"."learners"("id") ON DELETE restrict ON UPDATE no action,
	CONSTRAINT "teacher_link_codes_created_by_principal_id_principals_id_fk" FOREIGN KEY ("created_by_principal_id") REFERENCES "public"."principals"("id") ON DELETE restrict ON UPDATE no action,
	CONSTRAINT "teacher_link_codes_used_by_principal_id_principals_id_fk" FOREIGN KEY ("used_by_principal_id") REFERENCES "public"."principals"("id") ON DELETE restrict ON UPDATE no action
);

CREATE INDEX IF NOT EXISTS "teacher_link_codes_learner_idx" ON "teacher_link_codes" USING btree ("learner_id");

-- END 0021_teacher_accounts.sql

-- Authorized execution must verify exact resulting definitions and existing data
-- inside the same transaction before committing. This disabled proposal does
-- not implement that executor or establish endpoint-to-branch identity.
COMMIT;
