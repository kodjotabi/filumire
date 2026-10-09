-- Hand-written precondition (Payments Phase 2, step 3, B3). Runs first, inside drizzle's migration transaction.
-- Locks the 0018 tables against concurrent writers for the rest of the transaction, then refuses (atomically:
-- nothing in 0019 is applied) unless no payment attempt exists and the database encodes text as UTF8.
-- Existing attempts are never bound to invented obligations, rewritten or deleted (Stage A, AD4).
-- The generated part creates tables unqualified but references them as "public"."..." in every FK, and the
-- hand-written functions pin search_path to pg_catalog, public, pg_temp: so 0019 also refuses unless the
-- migration session creates objects in public.
SET LOCAL lock_timeout = '5s';--> statement-breakpoint
LOCK TABLE "public"."payment_attempts", "public"."payment_attempt_events" IN SHARE ROW EXCLUSIVE MODE;--> statement-breakpoint
DO $$
BEGIN
  IF current_schema() IS DISTINCT FROM 'public' THEN
    RAISE EXCEPTION '0019 refused: objects would be created in schema %, expected public', current_schema() USING ERRCODE = 'P0001';
  END IF;
  IF EXISTS (SELECT 1 FROM "public"."payment_attempts") OR EXISTS (SELECT 1 FROM "public"."payment_attempt_events") THEN
    RAISE EXCEPTION '0019 refused: payment_attempts or payment_attempt_events holds rows (a legacy-binding design must be approved first)'
      USING ERRCODE = 'P0001';
  END IF;
  IF current_setting('server_encoding') <> 'UTF8' THEN
    RAISE EXCEPTION '0019 refused: server_encoding must be UTF8 for the canonical purchase hash' USING ERRCODE = 'P0001';
  END IF;
END
$$;--> statement-breakpoint
