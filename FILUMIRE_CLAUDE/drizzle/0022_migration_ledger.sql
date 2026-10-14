-- 0022: migration ledger (Phase 1 integration foundation, 14 Oct 2026).
-- Additive only. Records which reviewed migration files have been applied to
-- a database, with the SHA-256 of the exact file applied. Migrations 0004-0018
-- exist in no repository, so the first row on each database is a "baseline"
-- entry whose hash is the read-only catalog snapshot taken when it is recorded.
-- Applying this file, and recording rows, requires separate owner approval
-- per database branch. drizzle/MIGRATIONS.json is the ordered source of truth.

CREATE TABLE IF NOT EXISTS "filumire_schema_migrations" (
	"id" text PRIMARY KEY NOT NULL,
	"kind" text NOT NULL,
	"sha256" text NOT NULL,
	"applied_at" timestamp with time zone DEFAULT now() NOT NULL,
	"applied_by" text NOT NULL,
	"note" text,
	CONSTRAINT "filumire_schema_migrations_kind_check" CHECK ("kind" in ('baseline', 'migration')),
	CONSTRAINT "filumire_schema_migrations_sha256_check" CHECK ("sha256" ~ '^[0-9a-f]{64}$')
);
