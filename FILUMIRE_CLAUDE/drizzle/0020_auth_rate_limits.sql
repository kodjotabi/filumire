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
