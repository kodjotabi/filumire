CREATE TABLE "payment_exceptions" (
	"id" text PRIMARY KEY NOT NULL,
	"obligation_id" text NOT NULL,
	"attempt_id" text,
	"receipt_id" text,
	"kind" text NOT NULL,
	"blocks_fulfilment" boolean NOT NULL,
	"dedupe_key" text NOT NULL,
	"status" text NOT NULL,
	"opened_at" timestamp with time zone NOT NULL,
	"opened_by" text NOT NULL,
	"resolution_code" text,
	"resolved_at" timestamp with time zone,
	"resolved_by_principal_id" text,
	CONSTRAINT "payment_exceptions_dedupe_unique" UNIQUE("obligation_id","kind","dedupe_key"),
	CONSTRAINT "payment_exceptions_kind_check" CHECK ("payment_exceptions"."kind" in ('amount_mismatch', 'currency_mismatch', 'identity_mismatch', 'attempt_needs_review', 'duplicate_charge', 'success_after_failed', 'success_after_cancel', 'success_after_expiry', 'success_during_review', 'beneficiary_authorization_revoked', 'provider_record_missing', 'initiated_after_resolution', 'reversal_reported', 'post_settlement_status_change')),
	CONSTRAINT "payment_exceptions_blocking_check" CHECK ("payment_exceptions"."blocks_fulfilment" = ("payment_exceptions"."kind" <> 'duplicate_charge')),
	CONSTRAINT "payment_exceptions_dedupe_check" CHECK (length("payment_exceptions"."dedupe_key") between 1 and 200),
	CONSTRAINT "payment_exceptions_status_check" CHECK ("payment_exceptions"."status" in ('open', 'resolved')),
	CONSTRAINT "payment_exceptions_opened_by_check" CHECK ("payment_exceptions"."opened_by" = 'system'),
	CONSTRAINT "payment_exceptions_resolution_check" CHECK (("payment_exceptions"."status" = 'open' and "payment_exceptions"."resolution_code" is null and "payment_exceptions"."resolved_at" is null and "payment_exceptions"."resolved_by_principal_id" is null) or ("payment_exceptions"."status" = 'resolved' and "payment_exceptions"."resolution_code" is not null and "payment_exceptions"."resolved_at" is not null and "payment_exceptions"."resolved_by_principal_id" is not null))
);
--> statement-breakpoint
CREATE TABLE "payment_obligation_beneficiaries" (
	"obligation_id" text NOT NULL,
	"learner_id" text NOT NULL,
	"access_id" text NOT NULL,
	"policy_code" text NOT NULL,
	"relationship_type" text NOT NULL,
	"authorized_at" timestamp with time zone NOT NULL,
	CONSTRAINT "payment_obligation_beneficiaries_pk" PRIMARY KEY("obligation_id","learner_id"),
	CONSTRAINT "payment_obligation_beneficiaries_learner_check" CHECK ("payment_obligation_beneficiaries"."learner_id" ~ '^[A-Za-z0-9._:-]{1,200}$'),
	CONSTRAINT "payment_obligation_beneficiaries_policy_check" CHECK ("payment_obligation_beneficiaries"."policy_code" = 'guardian_v1'),
	CONSTRAINT "payment_obligation_beneficiaries_relationship_check" CHECK ("payment_obligation_beneficiaries"."relationship_type" = 'guardian')
);
--> statement-breakpoint
CREATE TABLE "payment_obligation_events" (
	"id" text PRIMARY KEY NOT NULL,
	"obligation_id" text NOT NULL,
	"sequence" integer NOT NULL,
	"event_type" text NOT NULL,
	"from_status" text,
	"to_status" text,
	"actor_type" text NOT NULL,
	"actor_principal_id" text,
	"detail" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payment_obligation_events_sequence_unique" UNIQUE("obligation_id","sequence"),
	CONSTRAINT "payment_obligation_events_sequence_check" CHECK ("payment_obligation_events"."sequence" >= 1),
	CONSTRAINT "payment_obligation_events_type_check" CHECK ("payment_obligation_events"."event_type" ~ '^[a-z][a-z_]{2,48}$'),
	CONSTRAINT "payment_obligation_events_from_check" CHECK ("payment_obligation_events"."from_status" is null or "payment_obligation_events"."from_status" in ('open', 'settled', 'cancelled', 'expired', 'review')),
	CONSTRAINT "payment_obligation_events_to_check" CHECK ("payment_obligation_events"."to_status" is null or "payment_obligation_events"."to_status" in ('open', 'settled', 'cancelled', 'expired', 'review')),
	CONSTRAINT "payment_obligation_events_actor_check" CHECK (("payment_obligation_events"."actor_type" = 'system' and "payment_obligation_events"."actor_principal_id" is null) or ("payment_obligation_events"."actor_type" = 'payer' and "payment_obligation_events"."actor_principal_id" is not null))
);
--> statement-breakpoint
CREATE TABLE "payment_obligations" (
	"id" text PRIMARY KEY NOT NULL,
	"payer_principal_id" text NOT NULL,
	"creation_key" text NOT NULL,
	"product_code" text NOT NULL,
	"product_version" text NOT NULL,
	"product_label" text NOT NULL,
	"product_terms" jsonb NOT NULL,
	"amount_minor" integer NOT NULL,
	"currency" text NOT NULL,
	"mode" text NOT NULL,
	"beneficiary_count" integer NOT NULL,
	"snapshot_hash" text NOT NULL,
	"status" text NOT NULL,
	"sealed_at" timestamp with time zone,
	"expires_at" timestamp with time zone NOT NULL,
	"settled_receipt_id" text,
	"settled_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payment_obligations_payer_creation_key_unique" UNIQUE("payer_principal_id","creation_key"),
	CONSTRAINT "payment_obligations_binding_unique" UNIQUE("id","payer_principal_id","amount_minor","currency","mode"),
	CONSTRAINT "payment_obligations_settled_receipt_unique" UNIQUE("settled_receipt_id"),
	CONSTRAINT "payment_obligations_id_check" CHECK ("payment_obligations"."id" ~ '^[A-Za-z0-9._:-]{1,200}$'),
	CONSTRAINT "payment_obligations_creation_key_check" CHECK ("payment_obligations"."creation_key" ~ '^[A-Za-z0-9._:-]{8,200}$'),
	CONSTRAINT "payment_obligations_product_code_check" CHECK ("payment_obligations"."product_code" ~ '^[a-z][a-z0-9_]{2,63}$'),
	CONSTRAINT "payment_obligations_product_version_check" CHECK ("payment_obligations"."product_version" ~ '^[A-Za-z0-9._-]{1,32}$'),
	CONSTRAINT "payment_obligations_product_label_check" CHECK (length("payment_obligations"."product_label") between 1 and 120 and "payment_obligations"."product_label" !~ '^[ \t\n\v\f\r\u00a0\u1680\u2000-\u200a\u2028\u2029\u202f\u205f\u3000\ufeff]*$'),
	CONSTRAINT "payment_obligations_terms_check" CHECK (jsonb_typeof("payment_obligations"."product_terms") = 'object'),
	CONSTRAINT "payment_obligations_amount_check" CHECK ("payment_obligations"."amount_minor" > 0),
	CONSTRAINT "payment_obligations_currency_check" CHECK ("payment_obligations"."currency" = 'GHS'),
	CONSTRAINT "payment_obligations_sandbox_only_check" CHECK ("payment_obligations"."mode" = 'sandbox'),
	CONSTRAINT "payment_obligations_beneficiary_count_check" CHECK ("payment_obligations"."beneficiary_count" between 1 and 20),
	CONSTRAINT "payment_obligations_snapshot_hash_check" CHECK ("payment_obligations"."snapshot_hash" ~ '^[0-9a-f]{64}$'),
	CONSTRAINT "payment_obligations_status_check" CHECK ("payment_obligations"."status" in ('open', 'settled', 'cancelled', 'expired', 'review')),
	CONSTRAINT "payment_obligations_expiry_check" CHECK ("payment_obligations"."expires_at" > "payment_obligations"."created_at"),
	CONSTRAINT "payment_obligations_settled_receipt_check" CHECK (("payment_obligations"."status" = 'settled') = ("payment_obligations"."settled_receipt_id" is not null)),
	CONSTRAINT "payment_obligations_settled_at_check" CHECK (("payment_obligations"."settled_receipt_id" is null) = ("payment_obligations"."settled_at" is null))
);
--> statement-breakpoint
CREATE TABLE "payment_receipts" (
	"id" text PRIMARY KEY NOT NULL,
	"attempt_id" text NOT NULL,
	"obligation_id" text NOT NULL,
	"provider" text NOT NULL,
	"mode" text NOT NULL,
	"merchant_context" text NOT NULL,
	"provider_reference" text NOT NULL,
	"amount_minor" integer NOT NULL,
	"currency" text NOT NULL,
	"verified_at" timestamp with time zone NOT NULL,
	"recorded_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payment_receipts_attempt_unique" UNIQUE("attempt_id"),
	CONSTRAINT "payment_receipts_provider_charge_unique" UNIQUE("provider","mode","merchant_context","provider_reference"),
	CONSTRAINT "payment_receipts_settlement_binding_unique" UNIQUE("id","obligation_id","amount_minor","currency","mode"),
	CONSTRAINT "payment_receipts_provider_check" CHECK ("payment_receipts"."provider" ~ '^[a-z][a-z0-9_]{1,31}$'),
	CONSTRAINT "payment_receipts_mode_check" CHECK ("payment_receipts"."mode" in ('sandbox', 'live')),
	CONSTRAINT "payment_receipts_merchant_context_check" CHECK ("payment_receipts"."merchant_context" ~ '^[a-z0-9][a-z0-9:._-]{2,63}$'),
	CONSTRAINT "payment_receipts_provider_reference_check" CHECK (length("payment_receipts"."provider_reference") between 1 and 200),
	CONSTRAINT "payment_receipts_amount_check" CHECK ("payment_receipts"."amount_minor" > 0),
	CONSTRAINT "payment_receipts_currency_check" CHECK ("payment_receipts"."currency" ~ '^[A-Z]{3}$')
);
--> statement-breakpoint
ALTER TABLE "payment_exceptions" ADD CONSTRAINT "payment_exceptions_obligation_fk" FOREIGN KEY ("obligation_id") REFERENCES "public"."payment_obligations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_exceptions" ADD CONSTRAINT "payment_exceptions_attempt_fk" FOREIGN KEY ("attempt_id") REFERENCES "public"."payment_attempts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_exceptions" ADD CONSTRAINT "payment_exceptions_receipt_fk" FOREIGN KEY ("receipt_id") REFERENCES "public"."payment_receipts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_exceptions" ADD CONSTRAINT "payment_exceptions_resolver_fk" FOREIGN KEY ("resolved_by_principal_id") REFERENCES "public"."principals"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_obligation_beneficiaries" ADD CONSTRAINT "payment_obligation_beneficiaries_obligation_fk" FOREIGN KEY ("obligation_id") REFERENCES "public"."payment_obligations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_obligation_beneficiaries" ADD CONSTRAINT "payment_obligation_beneficiaries_learner_fk" FOREIGN KEY ("learner_id") REFERENCES "public"."learners"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_obligation_beneficiaries" ADD CONSTRAINT "payment_obligation_beneficiaries_access_fk" FOREIGN KEY ("access_id") REFERENCES "public"."principal_learner_access"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_obligation_events" ADD CONSTRAINT "payment_obligation_events_obligation_fk" FOREIGN KEY ("obligation_id") REFERENCES "public"."payment_obligations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_obligation_events" ADD CONSTRAINT "payment_obligation_events_actor_fk" FOREIGN KEY ("actor_principal_id") REFERENCES "public"."principals"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_obligations" ADD CONSTRAINT "payment_obligations_payer_fk" FOREIGN KEY ("payer_principal_id") REFERENCES "public"."principals"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_receipts" ADD CONSTRAINT "payment_receipts_obligation_fk" FOREIGN KEY ("obligation_id") REFERENCES "public"."payment_obligations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_receipts" ADD CONSTRAINT "payment_receipts_attempt_fk" FOREIGN KEY ("attempt_id","obligation_id","provider","mode") REFERENCES "public"."payment_attempts"("id","obligation_id","provider","mode") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "payment_exceptions_open_idx" ON "payment_exceptions" USING btree ("obligation_id") WHERE status = 'open';--> statement-breakpoint
CREATE INDEX "payment_exceptions_attempt_idx" ON "payment_exceptions" USING btree ("attempt_id");--> statement-breakpoint
CREATE INDEX "payment_exceptions_receipt_idx" ON "payment_exceptions" USING btree ("receipt_id");--> statement-breakpoint
CREATE INDEX "payment_obligation_beneficiaries_learner_idx" ON "payment_obligation_beneficiaries" USING btree ("learner_id");--> statement-breakpoint
CREATE INDEX "payment_obligation_beneficiaries_access_idx" ON "payment_obligation_beneficiaries" USING btree ("access_id");--> statement-breakpoint
CREATE UNIQUE INDEX "payment_obligation_events_one_settlement" ON "payment_obligation_events" USING btree ("obligation_id") WHERE to_status = 'settled';--> statement-breakpoint
CREATE INDEX "payment_obligations_payer_created_idx" ON "payment_obligations" USING btree ("payer_principal_id","created_at");--> statement-breakpoint
CREATE INDEX "payment_obligations_open_expiry_idx" ON "payment_obligations" USING btree ("expires_at") WHERE status = 'open';--> statement-breakpoint
CREATE INDEX "payment_receipts_obligation_idx" ON "payment_receipts" USING btree ("obligation_id");--> statement-breakpoint
ALTER TABLE "payment_attempts" ADD CONSTRAINT "payment_attempts_obligation_fk" FOREIGN KEY ("obligation_id","payer_principal_id","amount_minor","currency","mode") REFERENCES "public"."payment_obligations"("id","payer_principal_id","amount_minor","currency","mode") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_attempts" ADD CONSTRAINT "payment_attempts_obligation_binding_unique" UNIQUE("id","obligation_id","provider","mode");