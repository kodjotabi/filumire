CREATE TABLE "payment_attempt_events" (
	"id" text PRIMARY KEY NOT NULL,
	"attempt_id" text NOT NULL,
	"sequence" integer NOT NULL,
	"event_type" text NOT NULL,
	"from_status" text,
	"to_status" text,
	"detail" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payment_attempt_events_attempt_sequence_unique" UNIQUE("attempt_id","sequence"),
	CONSTRAINT "payment_attempt_events_sequence_check" CHECK ("payment_attempt_events"."sequence" >= 1),
	CONSTRAINT "payment_attempt_events_type_check" CHECK ("payment_attempt_events"."event_type" ~ '^[a-z][a-z_]{2,48}$')
);
--> statement-breakpoint
CREATE TABLE "payment_attempts" (
	"id" text PRIMARY KEY NOT NULL,
	"idempotency_key" text NOT NULL,
	"obligation_id" text NOT NULL,
	"our_reference" text NOT NULL,
	"request_fingerprint" text NOT NULL,
	"provider" text NOT NULL,
	"mode" text NOT NULL,
	"provider_reference" text,
	"payer_principal_id" text NOT NULL,
	"billing_account_id" text,
	"amount_minor" integer NOT NULL,
	"currency" text NOT NULL,
	"status" text NOT NULL,
	"observed_status" text,
	"observed_amount_minor" integer,
	"observed_currency" text,
	"verification_failures" jsonb,
	"last_error_code" text,
	"verify_count" integer DEFAULT 0 NOT NULL,
	"confirmed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payment_attempts_idempotency_key_unique" UNIQUE("idempotency_key"),
	CONSTRAINT "payment_attempts_our_reference_unique" UNIQUE("our_reference"),
	CONSTRAINT "payment_attempts_provider_reference_unique" UNIQUE("provider","provider_reference"),
	CONSTRAINT "payment_attempts_status_check" CHECK ("payment_attempts"."status" in ('created', 'pending', 'unknown', 'succeeded', 'failed', 'needs_review')),
	CONSTRAINT "payment_attempts_mode_check" CHECK ("payment_attempts"."mode" in ('sandbox', 'live')),
	CONSTRAINT "payment_attempts_provider_check" CHECK ("payment_attempts"."provider" ~ '^[a-z][a-z0-9_]{1,31}$'),
	CONSTRAINT "payment_attempts_amount_check" CHECK ("payment_attempts"."amount_minor" > 0),
	CONSTRAINT "payment_attempts_currency_check" CHECK ("payment_attempts"."currency" ~ '^[A-Z]{3}$'),
	CONSTRAINT "payment_attempts_obligation_check" CHECK (length("payment_attempts"."obligation_id") between 1 and 200),
	CONSTRAINT "payment_attempts_verify_count_check" CHECK ("payment_attempts"."verify_count" >= 0),
	CONSTRAINT "payment_attempts_succeeded_check" CHECK ("payment_attempts"."status" <> 'succeeded' or ("payment_attempts"."observed_status" = 'successful' and "payment_attempts"."observed_amount_minor" = "payment_attempts"."amount_minor" and "payment_attempts"."observed_currency" = "payment_attempts"."currency" and "payment_attempts"."confirmed_at" is not null and "payment_attempts"."provider_reference" is not null))
);
--> statement-breakpoint
ALTER TABLE "payment_attempt_events" ADD CONSTRAINT "payment_attempt_events_attempt_id_payment_attempts_id_fk" FOREIGN KEY ("attempt_id") REFERENCES "public"."payment_attempts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_attempts" ADD CONSTRAINT "payment_attempts_payer_principal_id_principals_id_fk" FOREIGN KEY ("payer_principal_id") REFERENCES "public"."principals"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "payment_attempt_events_one_success_per_attempt" ON "payment_attempt_events" USING btree ("attempt_id") WHERE to_status = 'succeeded';--> statement-breakpoint
CREATE UNIQUE INDEX "payment_attempts_one_active_per_obligation" ON "payment_attempts" USING btree ("obligation_id") WHERE status in ('created', 'pending', 'unknown');--> statement-breakpoint
CREATE UNIQUE INDEX "payment_attempts_one_success_per_obligation" ON "payment_attempts" USING btree ("obligation_id") WHERE status = 'succeeded';--> statement-breakpoint
CREATE INDEX "payment_attempts_status_updated_idx" ON "payment_attempts" USING btree ("status","updated_at");--> statement-breakpoint
CREATE INDEX "payment_attempts_payer_idx" ON "payment_attempts" USING btree ("payer_principal_id");--> statement-breakpoint
-- Hand-written (Payments Phase 2, step 2): lifecycle, immutability and append-only guards.
-- Deletes are refused everywhere except an explicit, transaction-local test clean-up in filumire_test.
CREATE FUNCTION "payment_test_cleanup_allowed"() RETURNS boolean LANGUAGE sql STABLE AS $$
  SELECT current_database() = 'filumire_test'
     AND coalesce(current_setting('filumire.payment_test_cleanup', true), '') = 'on'
$$;--> statement-breakpoint
CREATE FUNCTION "payment_attempts_guard"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF NOT payment_test_cleanup_allowed() THEN
      RAISE EXCEPTION 'payment_attempts rows cannot be deleted' USING ERRCODE = 'P0001';
    END IF;
    RETURN OLD;
  END IF;
  IF OLD.status = 'succeeded' THEN
    RAISE EXCEPTION 'succeeded payment attempts are immutable' USING ERRCODE = 'P0001';
  END IF;
  IF NEW.id IS DISTINCT FROM OLD.id OR NEW.idempotency_key IS DISTINCT FROM OLD.idempotency_key
     OR NEW.obligation_id IS DISTINCT FROM OLD.obligation_id OR NEW.our_reference IS DISTINCT FROM OLD.our_reference
     OR NEW.request_fingerprint IS DISTINCT FROM OLD.request_fingerprint OR NEW.provider IS DISTINCT FROM OLD.provider
     OR NEW.mode IS DISTINCT FROM OLD.mode OR NEW.payer_principal_id IS DISTINCT FROM OLD.payer_principal_id
     OR NEW.billing_account_id IS DISTINCT FROM OLD.billing_account_id OR NEW.amount_minor IS DISTINCT FROM OLD.amount_minor
     OR NEW.currency IS DISTINCT FROM OLD.currency OR NEW.created_at IS DISTINCT FROM OLD.created_at
     OR (OLD.provider_reference IS NOT NULL AND NEW.provider_reference IS DISTINCT FROM OLD.provider_reference) THEN
    RAISE EXCEPTION 'payment attempt identity fields are immutable' USING ERRCODE = 'P0001';
  END IF;
  IF NEW.status <> OLD.status AND NOT (
       (OLD.status = 'created' AND NEW.status IN ('pending', 'unknown', 'succeeded', 'failed', 'needs_review'))
    OR (OLD.status = 'pending' AND NEW.status IN ('succeeded', 'failed', 'needs_review'))
    OR (OLD.status = 'unknown' AND NEW.status IN ('pending', 'succeeded', 'failed', 'needs_review'))
    OR (OLD.status = 'failed' AND NEW.status = 'needs_review')
  ) THEN
    RAISE EXCEPTION 'payment attempt transition % -> % is not allowed', OLD.status, NEW.status USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END
$$;--> statement-breakpoint
CREATE TRIGGER "payment_attempts_guard" BEFORE UPDATE OR DELETE ON "payment_attempts"
  FOR EACH ROW EXECUTE FUNCTION "payment_attempts_guard"();--> statement-breakpoint
CREATE FUNCTION "payment_attempt_events_guard"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' AND payment_test_cleanup_allowed() THEN
    RETURN OLD;
  END IF;
  RAISE EXCEPTION 'payment_attempt_events is append-only' USING ERRCODE = 'P0001';
END
$$;--> statement-breakpoint
CREATE TRIGGER "payment_attempt_events_guard" BEFORE UPDATE OR DELETE ON "payment_attempt_events"
  FOR EACH ROW EXECUTE FUNCTION "payment_attempt_events_guard"();
