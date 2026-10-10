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
