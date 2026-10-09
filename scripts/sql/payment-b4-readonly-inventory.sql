-- Payments Phase 2, step 3, B4 (artifact A4): read-only identity, journal and object inventory of filumire_test.
-- Run: node scripts/b4/pg-env-run.mjs psql -v phase=pre  -f scripts/sql/payment-b4-readonly-inventory.sql
--      node scripts/b4/pg-env-run.mjs psql -v phase=post -f scripts/sql/payment-b4-readonly-inventory.sql
-- phase=pre : before 0019 (journal 19, no 0019 object). phase=post: after 0019 (journal 20, every 0019 object).
-- READ ONLY transaction, always ROLLBACK. Any failed expectation raises -> psql exits non-zero (ON_ERROR_STOP).
BEGIN;
SET TRANSACTION READ ONLY;
SET LOCAL b4.phase = :'phase';

\echo '== identity'
SELECT current_database() AS db, inet_server_port() AS port, current_user AS usr, r.rolsuper, r.rolcreaterole,
       r.rolcreatedb, r.rolbypassrls, r.rolreplication, current_setting('server_version') AS version,
       (SELECT has_database_privilege(current_user, d.oid, 'CONNECT') FROM pg_database d WHERE d.datname = 'filumire') AS can_connect_filumire,
       has_schema_privilege('public', 'CREATE') AS create_on_public,
       has_schema_privilege('public', 'USAGE') AS usage_on_public,
       aclcontains(n.nspacl, makeaclitem(0, n.nspowner, 'CREATE', false)) AS public_role_create_on_public
  FROM pg_roles r, pg_namespace n WHERE r.rolname = current_user AND n.nspname = 'public';
\echo '== settings'
SELECT current_setting('server_encoding') AS server_encoding, current_schema() AS current_schema,
       current_setting('search_path') AS search_path, current_setting('standard_conforming_strings') AS scs,
       current_setting('default_transaction_isolation') AS isolation, current_setting('statement_timeout') AS statement_timeout,
       current_setting('lock_timeout') AS lock_timeout;
\echo '== other sessions in this database'
SELECT count(*)::int AS other_sessions FROM pg_stat_activity WHERE datname = current_database() AND pid <> pg_backend_pid();
\echo '== journal'
SELECT id, hash, created_at FROM drizzle.__drizzle_migrations ORDER BY created_at;
\echo '== table owners (public + journal)'
SELECT n.nspname, c.relname, pg_get_userbyid(c.relowner) AS owner
  FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
 WHERE c.relkind = 'r' AND (n.nspname = 'public' OR (n.nspname = 'drizzle' AND c.relname = '__drizzle_migrations'))
 ORDER BY 1, 2;
\echo '== REFERENCES privilege on identity tables'
SELECT t AS table_name, has_table_privilege(current_user, 'public.' || t, 'REFERENCES') AS can_reference
  FROM unnest(ARRAY['principals', 'learners', 'principal_learner_access']) AS t;
\echo '== payment tables and row counts'
SELECT c.relname, (xpath('/row/n/text()', query_to_xml(format('SELECT count(*) AS n FROM public.%I', c.relname), false, true, '')))[1]::text::int AS rows
  FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
 WHERE n.nspname = 'public' AND c.relkind = 'r' AND c.relname LIKE 'payment\_%' ORDER BY 1;
\echo '== payment functions'
SELECT p.proname, p.prosecdef AS security_definer, p.proconfig, p.provolatile
  FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
 WHERE n.nspname = 'public' AND p.proname LIKE 'payment\_%' ORDER BY 1;
\echo '== payment triggers (non-internal)'
SELECT c.relname AS table_name, t.tgname, t.tgdeferrable, t.tginitdeferred, t.tgenabled, p.proname AS function_name
  FROM pg_trigger t JOIN pg_class c ON c.oid = t.tgrelid JOIN pg_proc p ON p.oid = t.tgfoid
 WHERE NOT t.tgisinternal AND c.relname LIKE 'payment\_%' ORDER BY 1, 2;
\echo '== payment constraints'
SELECT c.conrelid::regclass AS table_name, c.conname, c.contype, c.condeferrable, c.condeferred
  FROM pg_constraint c JOIN pg_class r ON r.oid = c.conrelid
 WHERE r.relname LIKE 'payment\_%' ORDER BY 1, 2;
\echo '== payment indexes'
SELECT tablename, indexname FROM pg_indexes WHERE schemaname = 'public' AND tablename LIKE 'payment\_%' ORDER BY 1, 2;

\echo '== assertions'
DO $inv$
DECLARE
  phase text := current_setting('b4.phase');
  r record;
  n integer;
  t text;
  tables_0019 text[] := ARRAY['payment_obligations', 'payment_obligation_beneficiaries', 'payment_receipts',
    'payment_exceptions', 'payment_obligation_events'];
  functions_0019 text[] := ARRAY['payment_canonical_json', 'payment_purchase_canonical_text', 'payment_purchase_hash',
    'payment_obligation_hash', 'payment_obligations_insert_guard', 'payment_obligations_guard',
    'payment_obligations_seal_check', 'payment_obligation_beneficiaries_guard', 'payment_attempts_obligation_guard',
    'payment_attempt_outcome_assert', 'payment_attempts_outcome_check', 'payment_receipts_guard',
    'payment_receipts_outcome_check', 'payment_exceptions_guard', 'payment_obligation_events_guard',
    'payment_obligation_events_insert_guard', 'payment_attempt_events_insert_guard'];
  -- table:trigger:deferrable
  triggers_0019 text[] := ARRAY[
    'payment_obligations:payment_obligations_insert_guard:f', 'payment_obligations:payment_obligations_guard:f',
    'payment_obligations:payment_obligations_seal_check:t',
    'payment_obligation_beneficiaries:payment_obligation_beneficiaries_guard:f',
    'payment_attempts:payment_attempts_obligation_guard:f', 'payment_attempts:payment_attempts_outcome_check:t',
    'payment_receipts:payment_receipts_guard:f', 'payment_receipts:payment_receipts_outcome_check:t',
    'payment_exceptions:payment_exceptions_guard:f',
    'payment_obligation_events:payment_obligation_events_guard:f',
    'payment_obligation_events:payment_obligation_events_insert_guard:f',
    'payment_attempt_events:payment_attempt_events_insert_guard:f'];
  constraints_0018 text[] := ARRAY['payment_attempts_pkey', 'payment_attempts_idempotency_key_unique',
    'payment_attempts_our_reference_unique', 'payment_attempts_provider_reference_unique', 'payment_attempts_status_check',
    'payment_attempts_mode_check', 'payment_attempts_provider_check', 'payment_attempts_amount_check',
    'payment_attempts_currency_check', 'payment_attempts_obligation_check', 'payment_attempts_verify_count_check',
    'payment_attempts_succeeded_check', 'payment_attempts_payer_principal_id_principals_id_fk',
    'payment_attempt_events_pkey', 'payment_attempt_events_attempt_sequence_unique',
    'payment_attempt_events_sequence_check', 'payment_attempt_events_type_check',
    'payment_attempt_events_attempt_id_payment_attempts_id_fk'];
  indexes_0018 text[] := ARRAY['payment_attempt_events_one_success_per_attempt', 'payment_attempts_one_active_per_obligation',
    'payment_attempts_one_success_per_obligation', 'payment_attempts_status_updated_idx', 'payment_attempts_payer_idx'];
BEGIN
  IF phase NOT IN ('pre', 'post') THEN RAISE EXCEPTION 'B4 inventory: phase must be pre or post'; END IF;
  IF current_database() <> 'filumire_test' THEN RAISE EXCEPTION 'B4 inventory: not filumire_test'; END IF;
  IF inet_server_port() IS DISTINCT FROM 5432 THEN RAISE EXCEPTION 'B4 inventory: port is not 5432'; END IF;
  SELECT * INTO r FROM pg_roles WHERE rolname = current_user;
  IF r.rolsuper OR r.rolcreaterole OR r.rolcreatedb OR r.rolbypassrls OR r.rolreplication THEN
    RAISE EXCEPTION 'B4 inventory: role % has elevated attributes', current_user;
  END IF;
  IF current_setting('server_encoding') <> 'UTF8' OR current_schema() IS DISTINCT FROM 'public'
     OR current_setting('standard_conforming_strings') <> 'on' THEN
    RAISE EXCEPTION 'B4 inventory: encoding/schema/standard_conforming_strings check failed';
  END IF;
  SELECT count(*) INTO n FROM pg_stat_activity WHERE datname = current_database() AND pid <> pg_backend_pid();
  IF n <> 0 THEN RAISE EXCEPTION 'B4 inventory: % other session(s) connected', n; END IF;
  SELECT count(*) INTO n FROM pg_class c JOIN pg_namespace s ON s.oid = c.relnamespace
   WHERE c.relkind = 'r' AND (s.nspname = 'public' OR (s.nspname = 'drizzle' AND c.relname = '__drizzle_migrations'))
     AND c.relowner <> (SELECT oid FROM pg_roles WHERE rolname = current_user);
  IF n <> 0 THEN RAISE EXCEPTION 'B4 inventory: % table(s) not owned by %', n, current_user; END IF;
  IF NOT (has_table_privilege('public.principals', 'REFERENCES') AND has_table_privilege('public.learners', 'REFERENCES')
          AND has_table_privilege('public.principal_learner_access', 'REFERENCES') AND has_schema_privilege('public', 'CREATE')) THEN
    RAISE EXCEPTION 'B4 inventory: missing REFERENCES or CREATE privilege';
  END IF;
  IF payment_test_cleanup_allowed() THEN RAISE EXCEPTION 'B4 inventory: cleanup flag is on'; END IF;
  IF EXISTS (SELECT 1 FROM public.payment_attempts) OR EXISTS (SELECT 1 FROM public.payment_attempt_events) THEN
    RAISE EXCEPTION 'B4 inventory: 0018 payment tables hold rows';
  END IF;

  -- 0018 objects intact in both phases.
  FOREACH t IN ARRAY constraints_0018 LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = t
                     AND conrelid IN ('public.payment_attempts'::regclass, 'public.payment_attempt_events'::regclass)) THEN
      RAISE EXCEPTION 'B4 inventory: 0018 constraint % missing', t;
    END IF;
  END LOOP;
  FOREACH t IN ARRAY indexes_0018 LOOP
    IF to_regclass('public.' || t) IS NULL THEN RAISE EXCEPTION 'B4 inventory: 0018 index % missing', t; END IF;
  END LOOP;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'payment_attempts_guard' AND tgrelid = 'public.payment_attempts'::regclass)
     OR NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'payment_attempt_events_guard' AND tgrelid = 'public.payment_attempt_events'::regclass)
     OR to_regprocedure('public.payment_test_cleanup_allowed()') IS NULL THEN
    RAISE EXCEPTION 'B4 inventory: 0018 trigger or payment_test_cleanup_allowed() missing';
  END IF;

  IF phase = 'pre' THEN
    SELECT count(*) INTO n FROM drizzle.__drizzle_migrations;
    IF n <> 19 OR (SELECT max(created_at) FROM drizzle.__drizzle_migrations) <> 1791454653882 THEN
      RAISE EXCEPTION 'B4 inventory (pre): journal has % rows / unexpected last created_at', n;
    END IF;
    FOREACH t IN ARRAY tables_0019 LOOP
      IF to_regclass('public.' || t) IS NOT NULL THEN RAISE EXCEPTION 'B4 inventory (pre): % already exists', t; END IF;
    END LOOP;
    IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace s ON s.oid = p.pronamespace
                WHERE s.nspname = 'public' AND p.proname = ANY (functions_0019)) THEN
      RAISE EXCEPTION 'B4 inventory (pre): a 0019 function already exists';
    END IF;
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname IN ('payment_attempts_obligation_fk', 'payment_attempts_obligation_binding_unique'))
       OR EXISTS (SELECT 1 FROM pg_trigger WHERE tgname IN ('payment_attempts_obligation_guard', 'payment_attempts_outcome_check',
                                                            'payment_attempt_events_insert_guard')) THEN
      RAISE EXCEPTION 'B4 inventory (pre): a 0019 constraint or trigger already exists';
    END IF;
  ELSE
    SELECT count(*) INTO n FROM drizzle.__drizzle_migrations;
    IF n <> 20 THEN RAISE EXCEPTION 'B4 inventory (post): journal has % rows, expected 20', n; END IF;
    SELECT * INTO r FROM drizzle.__drizzle_migrations ORDER BY created_at DESC LIMIT 1;
    IF r.hash <> '7543cc7cc341b075684f9eefe72fb020d579ac2f7010cee934c12abbdbb9d563' OR r.created_at <> 1791460353751 THEN
      RAISE EXCEPTION 'B4 inventory (post): last journal row is % / %', r.hash, r.created_at;
    END IF;
    FOREACH t IN ARRAY tables_0019 LOOP
      IF to_regclass('public.' || t) IS NULL THEN RAISE EXCEPTION 'B4 inventory (post): table % missing', t; END IF;
      EXECUTE format('SELECT count(*) FROM public.%I', t) INTO n;
      IF n <> 0 THEN RAISE EXCEPTION 'B4 inventory (post): % holds % row(s)', t, n; END IF;
    END LOOP;
    FOREACH t IN ARRAY functions_0019 LOOP
      SELECT count(*) INTO n FROM pg_proc p JOIN pg_namespace s ON s.oid = p.pronamespace
       WHERE s.nspname = 'public' AND p.proname = t AND NOT p.prosecdef
         AND p.proconfig = ARRAY['search_path=pg_catalog, public, pg_temp'];
      IF n <> 1 THEN RAISE EXCEPTION 'B4 inventory (post): function % missing, duplicated, SECURITY DEFINER or search_path not pinned', t; END IF;
    END LOOP;
    SELECT count(*) INTO n FROM pg_proc p JOIN pg_namespace s ON s.oid = p.pronamespace
     WHERE s.nspname = 'public' AND p.proname LIKE 'payment\_%';
    IF n <> 17 + 3 THEN RAISE EXCEPTION 'B4 inventory (post): % payment functions, expected 20 (17 from 0019 + 3 from 0018)', n; END IF;
    FOREACH t IN ARRAY triggers_0019 LOOP
      SELECT count(*) INTO n FROM pg_trigger tr JOIN pg_class c ON c.oid = tr.tgrelid
       WHERE c.relname = split_part(t, ':', 1) AND tr.tgname = split_part(t, ':', 2) AND tr.tgenabled = 'O'
         AND tr.tgdeferrable = (split_part(t, ':', 3) = 't') AND tr.tginitdeferred = (split_part(t, ':', 3) = 't');
      IF n <> 1 THEN RAISE EXCEPTION 'B4 inventory (post): trigger % missing or wrong timing', t; END IF;
    END LOOP;
    SELECT count(*) INTO n FROM pg_trigger tr JOIN pg_class c ON c.oid = tr.tgrelid
     WHERE NOT tr.tgisinternal AND c.relname LIKE 'payment\_%';
    IF n <> 12 + 2 THEN RAISE EXCEPTION 'B4 inventory (post): % payment triggers, expected 14', n; END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payment_obligations_settlement_fk'
                     AND conrelid = 'public.payment_obligations'::regclass AND condeferrable AND NOT condeferred) THEN
      RAISE EXCEPTION 'B4 inventory (post): settlement FK missing or not DEFERRABLE INITIALLY IMMEDIATE';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payment_attempts_obligation_fk' AND conrelid = 'public.payment_attempts'::regclass)
       OR NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payment_attempts_obligation_binding_unique' AND conrelid = 'public.payment_attempts'::regclass)
       OR NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payment_receipts_attempt_fk' AND conrelid = 'public.payment_receipts'::regclass) THEN
      RAISE EXCEPTION 'B4 inventory (post): attempt binding constraints missing';
    END IF;
  END IF;
  RAISE NOTICE 'B4 inventory (%) OK', phase;
END
$inv$;
ROLLBACK;
