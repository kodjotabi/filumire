-- Select neon-champagne-school / filumire-preview
-- (br-round-resonance-b8fm2nao) / neondb in Neon before execution.
-- Execute the entire script together. SQL does not prove branch isolation.
-- After any failure or interruption, inspect the schema before retrying.

BEGIN;
SET LOCAL statement_timeout = '30s';
SET LOCAL lock_timeout = '5s';
SET LOCAL search_path = public, pg_catalog;

DO $prerequisites$
DECLARE
    relation_name text;
    specification record;
    relation_oid oid;
    id_attribute smallint;
BEGIN
    IF current_database() <> 'neondb' THEN
        RAISE EXCEPTION 'Incorrect database: expected neondb';
    END IF;
    IF current_setting('transaction_read_only') <> 'off' THEN
        RAISE EXCEPTION 'Migration requires a writable transaction';
    END IF;
    IF NOT has_schema_privilege(current_user, 'public', 'USAGE')
       OR NOT has_schema_privilege(current_user, 'public', 'CREATE') THEN
        RAISE EXCEPTION 'Insufficient privileges on public schema';
    END IF;
    IF NOT pg_try_advisory_xact_lock(702021::bigint) THEN
        RAISE EXCEPTION 'Another cooperating migration holds the migration lock';
    END IF;
    FOREACH relation_name IN ARRAY ARRAY[
        'principals', 'learners', 'principal_learner_access', 'auth_sessions',
        'account_credentials', 'account_profiles', 'learner_profiles',
        'guardian_consent_records'
    ] LOOP
        IF NOT EXISTS (
            SELECT 1 FROM pg_class c
            JOIN pg_namespace n ON n.oid = c.relnamespace
            WHERE n.nspname = 'public' AND c.relname = relation_name
              AND c.relkind = 'r'
        ) THEN
            RAISE EXCEPTION 'Missing or incompatible prerequisite table: public.%', relation_name;
        END IF;
    END LOOP;
    IF to_regclass('account_credentials')
       IS DISTINCT FROM to_regclass('public.account_credentials') THEN
        RAISE EXCEPTION 'account_credentials is shadowed by another relation';
    END IF;
    FOREACH relation_name IN ARRAY ARRAY[
        'auth_rate_limits', 'auth_rate_limits_pkey',
        'auth_rate_limits_window_ends_at_idx', 'teacher_link_codes',
        'teacher_link_codes_pkey', 'teacher_link_codes_code_hash_unique',
        'teacher_link_codes_learner_idx'
    ] LOOP
        IF to_regclass(format('public.%I', relation_name)) IS NOT NULL THEN
            RAISE EXCEPTION 'Migration object already exists: public.%. Inspect before retrying.', relation_name;
        END IF;
    END LOOP;
    IF EXISTS (
        SELECT 1 FROM pg_type t
        JOIN pg_namespace n ON n.oid = t.typnamespace
        WHERE n.nspname = 'public'
          AND t.typname IN ('auth_rate_limits', 'teacher_link_codes')
    ) THEN
        RAISE EXCEPTION 'A conflicting migration row type already exists';
    END IF;
    IF NOT pg_has_role(
        current_user,
        (SELECT relowner FROM pg_class
         WHERE oid = 'public.account_credentials'::regclass), 'USAGE'
    ) THEN
        RAISE EXCEPTION 'Current role cannot alter account_credentials';
    END IF;
    LOCK TABLE public.account_credentials IN ACCESS EXCLUSIVE MODE;
    LOCK TABLE public.learners, public.principals IN SHARE ROW EXCLUSIVE MODE;
    FOR specification IN
        SELECT * FROM (VALUES
            ('account_credentials', 'account_kind'),
            ('learners', 'id'), ('principals', 'id')
        ) AS required(table_name, column_name)
    LOOP
        IF NOT EXISTS (
            SELECT 1 FROM pg_attribute a
            WHERE a.attrelid = to_regclass(format('public.%I', specification.table_name))
              AND a.attname = specification.column_name
              AND a.attnum > 0 AND NOT a.attisdropped
              AND a.atttypid = 'pg_catalog.text'::regtype AND a.attnotnull
              AND a.attgenerated = '' AND a.attidentity = ''
        ) THEN
            RAISE EXCEPTION 'Expected ordinary, non-null text column: public.%.%', specification.table_name, specification.column_name;
        END IF;
    END LOOP;
    FOREACH relation_name IN ARRAY ARRAY['learners', 'principals'] LOOP
        relation_oid := to_regclass(format('public.%I', relation_name));
        SELECT a.attnum INTO id_attribute FROM pg_attribute a
        WHERE a.attrelid = relation_oid AND a.attname = 'id' AND NOT a.attisdropped;
        IF NOT EXISTS (
            SELECT 1 FROM pg_constraint c
            JOIN pg_index i ON i.indexrelid = c.conindid
            WHERE c.conrelid = relation_oid AND c.contype IN ('p', 'u')
              AND c.conkey = ARRAY[id_attribute]::smallint[]
              AND c.convalidated AND NOT c.condeferrable
              AND i.indisunique AND i.indisvalid AND i.indisready
              AND i.indpred IS NULL AND i.indexprs IS NULL
        ) THEN
            RAISE EXCEPTION 'Missing valid non-deferrable single-column key: public.%.id', relation_name;
        END IF;
    END LOOP;
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint c
        WHERE c.conrelid = 'public.account_credentials'::regclass
          AND c.conname = 'account_credentials_account_kind_check'
          AND c.contype = 'c' AND c.convalidated AND NOT c.connoinherit
          AND pg_get_constraintdef(c.oid, false) =
              'CHECK ((account_kind = ANY (ARRAY[''guardian''::text, ''learner''::text])))'
    ) THEN
        RAISE EXCEPTION 'Unexpected existing account-kind constraint; inspect before migrating';
    END IF;
    IF EXISTS (
        SELECT 1 FROM public.account_credentials
        WHERE account_kind IS NULL OR account_kind NOT IN ('guardian', 'learner')
    ) THEN
        RAISE EXCEPTION 'Existing account kinds are incompatible';
    END IF;
END;
$prerequisites$;

-- MIGRATION_0020_START
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

-- MIGRATION_0020_END

-- MIGRATION_0021_START
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

-- MIGRATION_0021_END

DO $verification$
DECLARE
    specification record;
    actual_constraint record;
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_class WHERE oid = to_regclass('public.auth_rate_limits') AND relkind = 'r'
    ) OR NOT EXISTS (
        SELECT 1 FROM pg_class WHERE oid = to_regclass('public.teacher_link_codes') AND relkind = 'r'
    ) THEN
        RAISE EXCEPTION 'Required migration tables are missing or incorrect';
    END IF;
    IF EXISTS (
        WITH expected(table_name, column_name, position, type_name, not_null, default_expression) AS (
            VALUES
            ('auth_rate_limits', 'key_hash', 1, 'text', true, NULL::text),
            ('auth_rate_limits', 'request_count', 2, 'integer', true, NULL),
            ('auth_rate_limits', 'window_ends_at', 3, 'timestamp with time zone', true, NULL),
            ('teacher_link_codes', 'id', 1, 'text', true, NULL),
            ('teacher_link_codes', 'code_hash', 2, 'text', true, NULL),
            ('teacher_link_codes', 'learner_id', 3, 'text', true, NULL),
            ('teacher_link_codes', 'created_by_principal_id', 4, 'text', true, NULL),
            ('teacher_link_codes', 'expires_at', 5, 'timestamp with time zone', true, NULL),
            ('teacher_link_codes', 'used_at', 6, 'timestamp with time zone', false, NULL),
            ('teacher_link_codes', 'used_by_principal_id', 7, 'text', false, NULL),
            ('teacher_link_codes', 'revoked_at', 8, 'timestamp with time zone', false, NULL),
            ('teacher_link_codes', 'created_at', 9, 'timestamp with time zone', true, 'now()')
        ), actual AS (
            SELECT c.relname::text, a.attname::text, a.attnum::integer,
                   format_type(a.atttypid, a.atttypmod), a.attnotnull,
                   pg_get_expr(d.adbin, d.adrelid, false)
            FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
            JOIN pg_attribute a ON a.attrelid = c.oid
            LEFT JOIN pg_attrdef d ON d.adrelid = a.attrelid AND d.adnum = a.attnum
            WHERE n.nspname = 'public'
              AND c.relname IN ('auth_rate_limits', 'teacher_link_codes')
              AND a.attnum > 0 AND NOT a.attisdropped
        )
        SELECT 1 FROM (
            (SELECT * FROM expected EXCEPT SELECT * FROM actual)
            UNION ALL
            (SELECT * FROM actual EXCEPT SELECT * FROM expected)
        ) AS differences
    ) THEN
        RAISE EXCEPTION 'Migration column definitions do not match';
    END IF;
    IF EXISTS (
        SELECT 1 FROM pg_attribute a
        WHERE a.attrelid IN ('public.auth_rate_limits'::regclass, 'public.teacher_link_codes'::regclass)
          AND a.attnum > 0 AND NOT a.attisdropped
          AND (a.attgenerated <> '' OR a.attidentity <> '')
    ) THEN
        RAISE EXCEPTION 'Unexpected generated or identity column';
    END IF;
    FOR specification IN
        SELECT * FROM (VALUES
            ('auth_rate_limits', 'auth_rate_limits_pkey', 'p', 'key_hash', NULL::text),
            ('teacher_link_codes', 'teacher_link_codes_pkey', 'p', 'id', NULL),
            ('teacher_link_codes', 'teacher_link_codes_code_hash_unique', 'u', 'code_hash', NULL),
            ('teacher_link_codes', 'teacher_link_codes_learner_id_learners_id_fk', 'f', 'learner_id', 'learners'),
            ('teacher_link_codes', 'teacher_link_codes_created_by_principal_id_principals_id_fk', 'f', 'created_by_principal_id', 'principals'),
            ('teacher_link_codes', 'teacher_link_codes_used_by_principal_id_principals_id_fk', 'f', 'used_by_principal_id', 'principals')
        ) AS required(table_name, constraint_name, kind, column_name, referenced_table)
    LOOP
        SELECT c.*,
               ARRAY(SELECT a.attname::text
                     FROM unnest(c.conkey) WITH ORDINALITY AS k(num, position)
                     JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = k.num
                     ORDER BY k.position) AS local_columns,
               ARRAY(SELECT a.attname::text
                     FROM unnest(c.confkey) WITH ORDINALITY AS k(num, position)
                     JOIN pg_attribute a ON a.attrelid = c.confrelid AND a.attnum = k.num
                     ORDER BY k.position) AS referenced_columns
        INTO actual_constraint FROM pg_constraint c
        WHERE c.conrelid = to_regclass(format('public.%I', specification.table_name))
          AND c.conname = specification.constraint_name;
        IF NOT FOUND THEN
            RAISE EXCEPTION 'Missing constraint: %', specification.constraint_name;
        END IF;
        IF actual_constraint.contype::text <> specification.kind
           OR NOT actual_constraint.convalidated OR actual_constraint.condeferrable
           OR actual_constraint.condeferred
           OR actual_constraint.local_columns IS DISTINCT FROM ARRAY[specification.column_name]::text[] THEN
            RAISE EXCEPTION 'Incorrect constraint: %', specification.constraint_name;
        END IF;
        IF specification.kind = 'f' THEN
            IF actual_constraint.confrelid IS DISTINCT FROM to_regclass(format('public.%I', specification.referenced_table))
               OR actual_constraint.referenced_columns IS DISTINCT FROM ARRAY['id']::text[]
               OR actual_constraint.confdeltype <> 'r' OR actual_constraint.confupdtype <> 'a'
               OR actual_constraint.confmatchtype <> 's' THEN
                RAISE EXCEPTION 'Incorrect foreign key: %', specification.constraint_name;
            END IF;
        ELSE
            IF NOT EXISTS (
                SELECT 1 FROM pg_index i WHERE i.indexrelid = actual_constraint.conindid
                  AND i.indisunique AND i.indisvalid AND i.indisready AND i.indislive
                  AND i.indpred IS NULL AND i.indexprs IS NULL
                  AND (specification.kind <> 'p' OR i.indisprimary)
            ) THEN
                RAISE EXCEPTION 'Invalid supporting index: %', specification.constraint_name;
            END IF;
        END IF;
    END LOOP;
    IF (
        SELECT count(*) FROM pg_constraint c
        WHERE c.conrelid IN ('public.auth_rate_limits'::regclass, 'public.teacher_link_codes'::regclass)
          AND c.contype <> 'n'
    ) <> 6 THEN
        RAISE EXCEPTION 'Unexpected constraint set on new tables';
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint c
        WHERE c.conrelid = 'public.account_credentials'::regclass
          AND c.conname = 'account_credentials_account_kind_check'
          AND c.contype = 'c' AND c.convalidated AND NOT c.connoinherit
          AND pg_get_constraintdef(c.oid, false) =
              'CHECK ((account_kind = ANY (ARRAY[''guardian''::text, ''learner''::text, ''teacher''::text])))'
    ) THEN
        RAISE EXCEPTION 'Teacher account-kind constraint is incorrect';
    END IF;
    FOR specification IN
        SELECT * FROM (VALUES
            ('auth_rate_limits', 'auth_rate_limits_window_ends_at_idx', 'window_ends_at'),
            ('teacher_link_codes', 'teacher_link_codes_learner_idx', 'learner_id')
        ) AS required(table_name, index_name, column_name)
    LOOP
        IF NOT EXISTS (
            SELECT 1 FROM pg_index i
            JOIN pg_class idx ON idx.oid = i.indexrelid
            JOIN pg_namespace n ON n.oid = idx.relnamespace
            JOIN pg_am am ON am.oid = idx.relam
            JOIN pg_attribute a ON a.attrelid = i.indrelid
              AND a.attname = specification.column_name AND NOT a.attisdropped
            WHERE n.nspname = 'public' AND idx.relname = specification.index_name
              AND i.indrelid = to_regclass(format('public.%I', specification.table_name))
              AND am.amname = 'btree' AND i.indisvalid AND i.indisready AND i.indislive
              AND NOT i.indisunique AND i.indnatts = 1 AND i.indnkeyatts = 1
              AND i.indkey[0] = a.attnum AND i.indoption[0] = 0
              AND i.indpred IS NULL AND i.indexprs IS NULL
        ) THEN
            RAISE EXCEPTION 'Missing or incorrect index: %', specification.index_name;
        END IF;
    END LOOP;
    IF EXISTS (SELECT 1 FROM public.auth_rate_limits)
       OR EXISTS (SELECT 1 FROM public.teacher_link_codes) THEN
        RAISE EXCEPTION 'New migration tables are unexpectedly populated';
    END IF;
END;
$verification$;

COMMIT;
