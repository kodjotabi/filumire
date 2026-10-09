-- 0019 REVERSAL: filumire_test ONLY. PREPARED IN B3, NEVER EXECUTED. Needs explicit approval to run.
--
-- Purpose: recover filumire_test to the exact 0018 schema if 0019 is applied in B4 and must be withdrawn.
-- Usable ONLY while every 0019 table and payment_attempts are empty. Once any obligation, receipt or attempt
-- exists, reversal is refused and only forward fixes are allowed (financial evidence is never dropped).
--
-- Run (single transaction, stops on first error):
--   psql "<filumire_test url>" -v ON_ERROR_STOP=1 -f migration-review/0019/0019_reverse_filumire_test_only.sql
-- Before: pg_dump --schema-only of filumire_test + the 15-table fingerprint. After: schema diff against the
-- pre-0019 dump must be empty and the fingerprint identical; drizzle journal back to 19 rows.
-- The drizzle journal entry is identified by created_at = 1791460353751 (journal "when" of 0019); if 0019 is
-- regenerated before B4, update this value.
--
-- Fail-closed ordering (B3 hardening, 9 Oct 2026): every payment table and the migrations journal are locked
-- BEFORE the emptiness and journal checks, and the checks, drops and post-checks share one transaction.
-- ACCESS EXCLUSIVE waits for every in-flight writer to finish and then blocks new readers and writers until
-- COMMIT/ROLLBACK; READ COMMITTED gives each later statement a fresh snapshot, so the emptiness check sees
-- every committed row and nothing can be inserted between the check and the DROPs. A lock that cannot be
-- obtained within lock_timeout aborts the whole script with nothing changed.

BEGIN ISOLATION LEVEL READ COMMITTED;
SET LOCAL lock_timeout = '5s';
SET LOCAL search_path = pg_catalog, public, pg_temp;

DO $$
BEGIN
  IF current_database() <> 'filumire_test' THEN
    RAISE EXCEPTION '0019 reversal runs on filumire_test only (connected to %)', current_database();
  END IF;
END
$$;

-- Same order as the application (obligation before attempt). Fails here if 0019 is not applied.
LOCK TABLE "public"."payment_obligations", "public"."payment_attempts", "public"."payment_obligation_beneficiaries",
  "public"."payment_receipts", "public"."payment_exceptions", "public"."payment_obligation_events",
  "public"."payment_attempt_events" IN ACCESS EXCLUSIVE MODE;
LOCK TABLE drizzle.__drizzle_migrations IN EXCLUSIVE MODE;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "public"."payment_obligations") OR EXISTS (SELECT 1 FROM "public"."payment_obligation_beneficiaries")
     OR EXISTS (SELECT 1 FROM "public"."payment_receipts") OR EXISTS (SELECT 1 FROM "public"."payment_exceptions")
     OR EXISTS (SELECT 1 FROM "public"."payment_obligation_events") OR EXISTS (SELECT 1 FROM "public"."payment_attempts")
     OR EXISTS (SELECT 1 FROM "public"."payment_attempt_events") THEN
    RAISE EXCEPTION '0019 reversal refused: payment tables hold rows (forward fix only)';
  END IF;
  IF (SELECT max(created_at) FROM drizzle.__drizzle_migrations) IS DISTINCT FROM 1791460353751
     OR (SELECT count(*) FROM drizzle.__drizzle_migrations WHERE created_at = 1791460353751) <> 1 THEN
    RAISE EXCEPTION '0019 reversal refused: 0019 is not the single latest applied migration';
  END IF;
END
$$;

-- Triggers and constraints added to the existing 0018 tables (payment_attempts, payment_attempt_events).
DROP TRIGGER "payment_attempts_outcome_check" ON "public"."payment_attempts";
DROP TRIGGER "payment_attempts_obligation_guard" ON "public"."payment_attempts";
DROP TRIGGER "payment_attempt_events_insert_guard" ON "public"."payment_attempt_events";
ALTER TABLE "public"."payment_attempts" DROP CONSTRAINT "payment_attempts_obligation_fk";

-- New tables (one DROP: their mutual FKs, including the circular settlement FK, go with them; no CASCADE).
DROP TABLE "public"."payment_exceptions", "public"."payment_obligation_events", "public"."payment_obligation_beneficiaries",
  "public"."payment_receipts", "public"."payment_obligations";

-- Only after payment_receipts_attempt_fk is gone.
ALTER TABLE "public"."payment_attempts" DROP CONSTRAINT "payment_attempts_obligation_binding_unique";

-- Functions (their triggers were dropped with the tables above).
DROP FUNCTION "public"."payment_obligations_insert_guard"();
DROP FUNCTION "public"."payment_obligations_guard"();
DROP FUNCTION "public"."payment_obligations_seal_check"();
DROP FUNCTION "public"."payment_obligation_beneficiaries_guard"();
DROP FUNCTION "public"."payment_attempts_obligation_guard"();
DROP FUNCTION "public"."payment_attempts_outcome_check"();
DROP FUNCTION "public"."payment_attempt_outcome_assert"(text);
DROP FUNCTION "public"."payment_receipts_guard"();
DROP FUNCTION "public"."payment_receipts_outcome_check"();
DROP FUNCTION "public"."payment_exceptions_guard"();
DROP FUNCTION "public"."payment_obligation_events_guard"();
DROP FUNCTION "public"."payment_obligation_events_insert_guard"();
DROP FUNCTION "public"."payment_attempt_events_insert_guard"();
DROP FUNCTION "public"."payment_obligation_hash"(text);
DROP FUNCTION "public"."payment_purchase_hash"(text, text, text, text, text, jsonb, integer, text, text, text[]);
DROP FUNCTION "public"."payment_purchase_canonical_text"(text, text, text, text, text, jsonb, integer, text, text, text[]);
DROP FUNCTION "public"."payment_canonical_json"(jsonb);

-- 0018 objects are untouched: payment_test_cleanup_allowed(), payment_attempts_guard, payment_attempt_events_guard,
-- and every 0018 constraint and index (only the exact 0019 names above are dropped; no CASCADE).

DELETE FROM drizzle.__drizzle_migrations WHERE created_at = 1791460353751;

-- Post-checks inside the transaction: nothing of 0019 remains (exact names only: 0018's own
-- payment_attempts_obligation_check must survive), and the 0018 objects are still present.
DO $$
BEGIN
  IF to_regclass('public.payment_obligations') IS NOT NULL OR to_regclass('public.payment_obligation_beneficiaries') IS NOT NULL
     OR to_regclass('public.payment_receipts') IS NOT NULL OR to_regclass('public.payment_exceptions') IS NOT NULL
     OR to_regclass('public.payment_obligation_events') IS NOT NULL
     OR EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
                 WHERE n.nspname = 'public' AND p.proname IN (
                   'payment_obligations_insert_guard', 'payment_obligations_guard', 'payment_obligations_seal_check',
                   'payment_obligation_beneficiaries_guard', 'payment_attempts_obligation_guard',
                   'payment_attempts_outcome_check', 'payment_attempt_outcome_assert', 'payment_receipts_guard',
                   'payment_receipts_outcome_check', 'payment_exceptions_guard',
                   'payment_obligation_events_guard', 'payment_obligation_events_insert_guard',
                   'payment_attempt_events_insert_guard', 'payment_obligation_hash', 'payment_purchase_hash',
                   'payment_purchase_canonical_text', 'payment_canonical_json'))
     OR EXISTS (SELECT 1 FROM pg_constraint
                 WHERE conrelid = 'public.payment_attempts'::regclass
                   AND conname IN ('payment_attempts_obligation_fk', 'payment_attempts_obligation_binding_unique'))
     OR EXISTS (SELECT 1 FROM pg_trigger
                 WHERE tgrelid IN ('public.payment_attempts'::regclass, 'public.payment_attempt_events'::regclass)
                   AND tgname IN ('payment_attempts_obligation_guard', 'payment_attempts_outcome_check',
                                  'payment_attempt_events_insert_guard'))
     OR (SELECT count(*) FROM drizzle.__drizzle_migrations) <> 19 THEN
    RAISE EXCEPTION '0019 reversal post-check failed (0019 object remains); rolling back';
  END IF;
  -- Every named 0018 constraint, index and trigger survives, and the two 0018 tables carry no other trigger.
  IF (SELECT count(*) FROM pg_constraint
       WHERE conrelid = 'public.payment_attempts'::regclass AND conname IN (
         'payment_attempts_idempotency_key_unique', 'payment_attempts_our_reference_unique',
         'payment_attempts_provider_reference_unique', 'payment_attempts_status_check', 'payment_attempts_mode_check',
         'payment_attempts_provider_check', 'payment_attempts_amount_check', 'payment_attempts_currency_check',
         'payment_attempts_obligation_check', 'payment_attempts_verify_count_check', 'payment_attempts_succeeded_check',
         'payment_attempts_payer_principal_id_principals_id_fk')) <> 12
     OR (SELECT count(*) FROM pg_constraint
          WHERE conrelid = 'public.payment_attempt_events'::regclass AND conname IN (
            'payment_attempt_events_attempt_sequence_unique', 'payment_attempt_events_sequence_check',
            'payment_attempt_events_type_check', 'payment_attempt_events_attempt_id_payment_attempts_id_fk')) <> 4
     OR to_regclass('public.payment_attempt_events_one_success_per_attempt') IS NULL
     OR to_regclass('public.payment_attempts_one_active_per_obligation') IS NULL
     OR to_regclass('public.payment_attempts_one_success_per_obligation') IS NULL
     OR to_regclass('public.payment_attempts_status_updated_idx') IS NULL
     OR to_regclass('public.payment_attempts_payer_idx') IS NULL
     OR (SELECT array_agg(tgname::text ORDER BY tgname::text) FROM pg_trigger
          WHERE tgrelid = 'public.payment_attempts'::regclass AND NOT tgisinternal) IS DISTINCT FROM ARRAY['payment_attempts_guard']
     OR (SELECT array_agg(tgname::text ORDER BY tgname::text) FROM pg_trigger
          WHERE tgrelid = 'public.payment_attempt_events'::regclass AND NOT tgisinternal) IS DISTINCT FROM ARRAY['payment_attempt_events_guard']
     OR to_regprocedure('public.payment_test_cleanup_allowed()') IS NULL THEN
    RAISE EXCEPTION '0019 reversal post-check failed (0018 object missing); rolling back';
  END IF;
END
$$;

COMMIT;
