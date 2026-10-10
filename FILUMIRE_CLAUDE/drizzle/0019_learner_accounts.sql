-- FILUMIRE built-in accounts: credentials, adult profiles, learner
-- profiles and guardian consent records. Additive only: no existing
-- table or row is changed. Hand-written to follow 0018 on the
-- filumire-edututor migration history; regenerate the drizzle
-- snapshot/journal when the branches are combined.

CREATE TABLE IF NOT EXISTS "account_credentials" (
	"id" text PRIMARY KEY NOT NULL,
	"principal_id" text NOT NULL,
	"account_kind" text NOT NULL,
	"login_identifier" text NOT NULL,
	"password_hash" text NOT NULL,
	"password_updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"failed_attempt_count" integer DEFAULT 0 NOT NULL,
	"locked_until" timestamp with time zone,
	"last_sign_in_at" timestamp with time zone,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "account_credentials_principal_id_unique" UNIQUE("principal_id"),
	CONSTRAINT "account_credentials_login_identifier_unique" UNIQUE("login_identifier"),
	CONSTRAINT "account_credentials_account_kind_check" CHECK ("account_kind" in ('guardian', 'learner')),
	CONSTRAINT "account_credentials_principal_id_principals_id_fk" FOREIGN KEY ("principal_id") REFERENCES "public"."principals"("id") ON DELETE restrict ON UPDATE no action
);

CREATE TABLE IF NOT EXISTS "account_profiles" (
	"principal_id" text PRIMARY KEY NOT NULL,
	"display_name" text NOT NULL,
	"preferred_language" text DEFAULT 'en' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "account_profiles_principal_id_principals_id_fk" FOREIGN KEY ("principal_id") REFERENCES "public"."principals"("id") ON DELETE restrict ON UPDATE no action
);

CREATE TABLE IF NOT EXISTS "learner_profiles" (
	"learner_id" text PRIMARY KEY NOT NULL,
	"display_name" text NOT NULL,
	"avatar_id" text,
	"preferred_language" text DEFAULT 'en' NOT NULL,
	"onboarding_completed_at" timestamp with time zone,
	"sign_in_principal_id" text,
	"created_by_principal_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "learner_profiles_learner_id_learners_id_fk" FOREIGN KEY ("learner_id") REFERENCES "public"."learners"("id") ON DELETE restrict ON UPDATE no action,
	CONSTRAINT "learner_profiles_sign_in_principal_id_principals_id_fk" FOREIGN KEY ("sign_in_principal_id") REFERENCES "public"."principals"("id") ON DELETE restrict ON UPDATE no action,
	CONSTRAINT "learner_profiles_created_by_principal_id_principals_id_fk" FOREIGN KEY ("created_by_principal_id") REFERENCES "public"."principals"("id") ON DELETE restrict ON UPDATE no action
);

CREATE TABLE IF NOT EXISTS "guardian_consent_records" (
	"id" text PRIMARY KEY NOT NULL,
	"guardian_principal_id" text NOT NULL,
	"learner_id" text,
	"consent_type" text NOT NULL,
	"notice_version" text NOT NULL,
	"method" text NOT NULL,
	"verification_status" text DEFAULT 'unverified' NOT NULL,
	"recorded_at" timestamp with time zone DEFAULT now() NOT NULL,
	"withdrawn_at" timestamp with time zone,
	CONSTRAINT "guardian_consent_records_guardian_principal_id_principals_id_fk" FOREIGN KEY ("guardian_principal_id") REFERENCES "public"."principals"("id") ON DELETE restrict ON UPDATE no action,
	CONSTRAINT "guardian_consent_records_learner_id_learners_id_fk" FOREIGN KEY ("learner_id") REFERENCES "public"."learners"("id") ON DELETE restrict ON UPDATE no action
);

CREATE INDEX IF NOT EXISTS "guardian_consent_records_guardian_idx" ON "guardian_consent_records" USING btree ("guardian_principal_id");
CREATE INDEX IF NOT EXISTS "guardian_consent_records_learner_idx" ON "guardian_consent_records" USING btree ("learner_id");
