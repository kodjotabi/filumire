-- Select neon-champagne-school / filumire-preview / neondb in Neon.
-- Run this entire read-only script after migration or before an uncertain retry.
-- No data is changed. Branch selection is the operator's responsibility.
-- The same definition checks used before COMMIT raise errors on mismatch.
-- Populated new tables are allowed here: later application use is legitimate.
BEGIN READ ONLY;
SET LOCAL statement_timeout = '30s';
SET LOCAL lock_timeout = '5s';
SET LOCAL search_path = public, pg_catalog;
DO $database_check$
BEGIN
    IF current_database() <> 'neondb' THEN
        RAISE EXCEPTION 'Incorrect database: expected neondb';
    END IF;
END;
$database_check$;

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
END;
$verification$;

SELECT 'PASS: 0020 and 0021 schema definitions verified' AS result,
       current_database() AS database,
       current_setting('transaction_read_only') AS read_only;
ROLLBACK;
