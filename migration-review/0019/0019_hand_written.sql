-- Hand-written (Payments Phase 2, step 3, B3): settlement FK, canonical purchase hash, guards and seal.
-- Review: docs/handoff/PAYMENTS_PHASE2_STEP3.md (B3 sections). Same accepted pattern as 0018 (not in the drizzle snapshot).
-- Custom SQLSTATEs (mapped by services/payments/obligations/postgres-ledger.ts):
--   PF001 obligation already settled          PF002 obligation not payable (closed, expired, unsealed)
--   PF003 obligation needs review             PF004 beneficiary not authorised (guardian_v1)
--   PF005 obligation seal check failed        PF006 obligation already sealed
--   PF007 receipt does not match its attempt  PF008 attempt outcome not applied to its obligation
--   PF009 exception bound to another obligation   PF010 canonical purchase input refused
-- Deletes everywhere are refused except payment_test_cleanup_allowed() (0018: filumire_test + SET LOCAL flag).
-- Name resolution (B3 hardening, 9 Oct 2026): every function below pins
--   SET search_path = pg_catalog, public, pg_temp
-- so its unqualified tables, functions, types and %ROWTYPEs resolve to pg_catalog then public (the deployment
-- schema: every generated FK in 0005-0019 references "public"."..."; 0019_precondition.sql refuses any other
-- current_schema()). pg_temp is listed last, so a caller's temporary table cannot shadow a payment table.
-- Final corrections (B3, 9 Oct 2026): receipt required for every identifiable success (A1), deferred receipt
-- outcome check (A2), INSERT guards on both event tables (B1, B2; the 0018 table gains a trigger here, 0018 itself is
-- unchanged), clock_timestamp() expiry on attempt insert (C1), access rows locked in id order (D1).
-- Receipt integrity closeout (B3, 9 Oct 2026): payment_receipts_guard refuses a receipt whose attempt carries a
-- NON_RECEIPT_FAILURES code (PF007), as receiptCandidate does.

-- Settlement FK (circular with payment_receipts.obligation_id). NO ACTION + DEFERRABLE only so that the
-- flagged test clean-up can delete a settled obligation and its receipt in one transaction
-- (SET CONSTRAINTS payment_obligations_settlement_fk DEFERRED). MATCH SIMPLE: unchecked while settled_receipt_id IS NULL.
ALTER TABLE "payment_obligations" ADD CONSTRAINT "payment_obligations_settlement_fk"
  FOREIGN KEY ("settled_receipt_id", "id", "amount_minor", "currency", "mode")
  REFERENCES "public"."payment_receipts"("id", "obligation_id", "amount_minor", "currency", "mode")
  ON DELETE NO ACTION ON UPDATE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;--> statement-breakpoint

-- ---------- Canonical purchase representation (must equal packages/payments/obligation.ts) ----------
-- Vectors: tests/fixtures/payment-canonical-vectors.json; parity script: scripts/sql/payment-hash-parity-check.sql.
CREATE FUNCTION "payment_canonical_json"(j jsonb) RETURNS text LANGUAGE plpgsql IMMUTABLE STRICT
  SET search_path = pg_catalog, public, pg_temp AS $$
DECLARE
  result text;
  num text;
BEGIN
  CASE jsonb_typeof(j)
    WHEN 'null' THEN
      RETURN 'null';
    WHEN 'boolean' THEN
      RETURN j::text;
    WHEN 'string' THEN
      IF NOT ((j #>> '{}') IS NFC NORMALIZED) THEN
        RAISE EXCEPTION 'canonical json: text must be NFC' USING ERRCODE = 'PF010';
      END IF;
      RETURN to_json(j #>> '{}')::text;
    WHEN 'number' THEN
      num := j::text;
      IF num !~ '^-?[0-9]+$' OR abs(num::numeric) > 9007199254740991 THEN
        RAISE EXCEPTION 'canonical json: safe integers only' USING ERRCODE = 'PF010';
      END IF;
      RETURN (num::numeric)::bigint::text;
    WHEN 'array' THEN
      SELECT '[' || coalesce(string_agg("payment_canonical_json"(e.value), ',' ORDER BY e.ordinality), '') || ']'
        INTO result
        FROM jsonb_array_elements(j) WITH ORDINALITY AS e(value, ordinality);
      RETURN result;
    ELSE
      IF EXISTS (SELECT 1 FROM jsonb_object_keys(j) AS k(key) WHERE k.key !~ '^[A-Za-z][A-Za-z0-9_]{0,63}$') THEN
        RAISE EXCEPTION 'canonical json: keys must be ASCII identifiers' USING ERRCODE = 'PF010';
      END IF;
      SELECT '{' || coalesce(string_agg(to_json(e.key)::text || ':' || "payment_canonical_json"(e.value), ',' ORDER BY e.key COLLATE "C"), '') || '}'
        INTO result
        FROM jsonb_each(j) AS e(key, value);
      RETURN result;
  END CASE;
END
$$;--> statement-breakpoint
CREATE FUNCTION "payment_purchase_canonical_text"(
  p_id text, p_payer text, p_product_code text, p_product_version text, p_product_label text,
  p_terms jsonb, p_amount_minor integer, p_currency text, p_mode text, p_learner_ids text[]
) RETURNS text LANGUAGE plpgsql IMMUTABLE
  SET search_path = pg_catalog, public, pg_temp AS $$
DECLARE
  n integer := coalesce(cardinality(p_learner_ids), 0);
  learners text;
BEGIN
  IF p_id IS NULL OR p_id !~ '^[A-Za-z0-9._:-]{1,200}$' THEN
    RAISE EXCEPTION 'canonical purchase: bad obligation id' USING ERRCODE = 'PF010';
  END IF;
  IF p_payer IS NULL OR length(p_payer) NOT BETWEEN 1 AND 200 OR NOT (p_payer IS NFC NORMALIZED) THEN
    RAISE EXCEPTION 'canonical purchase: bad payer id' USING ERRCODE = 'PF010';
  END IF;
  IF p_product_code IS NULL OR p_product_code !~ '^[a-z][a-z0-9_]{2,63}$' THEN
    RAISE EXCEPTION 'canonical purchase: bad product code' USING ERRCODE = 'PF010';
  END IF;
  IF p_product_version IS NULL OR p_product_version !~ '^[A-Za-z0-9._-]{1,32}$' THEN
    RAISE EXCEPTION 'canonical purchase: bad product version' USING ERRCODE = 'PF010';
  END IF;
  IF p_product_label IS NULL OR length(p_product_label) NOT BETWEEN 1 AND 120 OR NOT (p_product_label IS NFC NORMALIZED)
     OR p_product_label ~ '^[ \t\n\v\f\r\u00a0\u1680\u2000-\u200a\u2028\u2029\u202f\u205f\u3000\ufeff]*$' THEN
    RAISE EXCEPTION 'canonical purchase: bad product label' USING ERRCODE = 'PF010';
  END IF;
  IF p_terms IS NULL OR jsonb_typeof(p_terms) <> 'object' THEN
    RAISE EXCEPTION 'canonical purchase: terms must be an object' USING ERRCODE = 'PF010';
  END IF;
  IF p_amount_minor IS NULL OR p_amount_minor <= 0 THEN
    RAISE EXCEPTION 'canonical purchase: bad amount' USING ERRCODE = 'PF010';
  END IF;
  IF p_currency IS NULL OR p_currency !~ '^[A-Z]{3}$' THEN
    RAISE EXCEPTION 'canonical purchase: bad currency' USING ERRCODE = 'PF010';
  END IF;
  IF p_mode IS NULL OR p_mode NOT IN ('sandbox', 'live') THEN
    RAISE EXCEPTION 'canonical purchase: bad mode' USING ERRCODE = 'PF010';
  END IF;
  IF n < 1 OR n > 20
     OR EXISTS (SELECT 1 FROM unnest(p_learner_ids) AS u(l) WHERE u.l IS NULL OR u.l !~ '^[A-Za-z0-9._:-]{1,200}$')
     OR (SELECT count(DISTINCT u.l) FROM unnest(p_learner_ids) AS u(l)) <> n THEN
    RAISE EXCEPTION 'canonical purchase: 1-20 distinct ASCII learner ids required' USING ERRCODE = 'PF010';
  END IF;
  SELECT string_agg(u.l, ',' ORDER BY u.l COLLATE "C") INTO learners FROM unnest(p_learner_ids) AS u(l);
  RETURN concat_ws('|',
    to_json('v1'::text)::text,
    to_json(p_id)::text,
    to_json(p_payer)::text,
    to_json(p_product_code)::text,
    to_json(p_product_version)::text,
    to_json(p_product_label)::text,
    to_json("payment_canonical_json"(p_terms))::text,
    to_json(p_amount_minor::text)::text,
    to_json(p_currency)::text,
    to_json(p_mode)::text,
    to_json(learners)::text);
END
$$;--> statement-breakpoint
CREATE FUNCTION "payment_purchase_hash"(
  p_id text, p_payer text, p_product_code text, p_product_version text, p_product_label text,
  p_terms jsonb, p_amount_minor integer, p_currency text, p_mode text, p_learner_ids text[]
) RETURNS text LANGUAGE sql IMMUTABLE
  SET search_path = pg_catalog, public, pg_temp AS $$
  SELECT encode(sha256(convert_to("payment_purchase_canonical_text"(
    p_id, p_payer, p_product_code, p_product_version, p_product_label, p_terms, p_amount_minor, p_currency, p_mode, p_learner_ids
  ), 'UTF8')), 'hex')
$$;--> statement-breakpoint
CREATE FUNCTION "payment_obligation_hash"(p_obligation_id text) RETURNS text LANGUAGE sql STABLE
  SET search_path = pg_catalog, public, pg_temp AS $$
  SELECT "payment_purchase_hash"(
    o.id, o.payer_principal_id, o.product_code, o.product_version, o.product_label, o.product_terms,
    o.amount_minor, o.currency, o.mode,
    ARRAY(SELECT b.learner_id FROM "payment_obligation_beneficiaries" b WHERE b.obligation_id = o.id))
  FROM "payment_obligations" o WHERE o.id = p_obligation_id
$$;--> statement-breakpoint

-- ---------- payment_obligations ----------
CREATE FUNCTION "payment_obligations_insert_guard"() RETURNS trigger LANGUAGE plpgsql
  SET search_path = pg_catalog, public, pg_temp AS $$
BEGIN
  IF NEW.status <> 'open' OR NEW.sealed_at IS NOT NULL OR NEW.settled_receipt_id IS NOT NULL OR NEW.settled_at IS NOT NULL THEN
    RAISE EXCEPTION 'a new obligation must be open, unsealed and unsettled' USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END
$$;--> statement-breakpoint
CREATE TRIGGER "payment_obligations_insert_guard" BEFORE INSERT ON "payment_obligations"
  FOR EACH ROW EXECUTE FUNCTION "payment_obligations_insert_guard"();--> statement-breakpoint
CREATE FUNCTION "payment_obligations_guard"() RETURNS trigger LANGUAGE plpgsql
  SET search_path = pg_catalog, public, pg_temp AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF NOT payment_test_cleanup_allowed() THEN
      RAISE EXCEPTION 'payment_obligations rows cannot be deleted' USING ERRCODE = 'P0001';
    END IF;
    RETURN OLD;
  END IF;
  IF OLD.status = 'settled' THEN
    RAISE EXCEPTION 'settled obligations are immutable' USING ERRCODE = 'P0001';
  END IF;
  IF NEW.id IS DISTINCT FROM OLD.id OR NEW.payer_principal_id IS DISTINCT FROM OLD.payer_principal_id
     OR NEW.creation_key IS DISTINCT FROM OLD.creation_key OR NEW.product_code IS DISTINCT FROM OLD.product_code
     OR NEW.product_version IS DISTINCT FROM OLD.product_version OR NEW.product_label IS DISTINCT FROM OLD.product_label
     OR NEW.product_terms IS DISTINCT FROM OLD.product_terms OR NEW.amount_minor IS DISTINCT FROM OLD.amount_minor
     OR NEW.currency IS DISTINCT FROM OLD.currency OR NEW.mode IS DISTINCT FROM OLD.mode
     OR NEW.beneficiary_count IS DISTINCT FROM OLD.beneficiary_count OR NEW.snapshot_hash IS DISTINCT FROM OLD.snapshot_hash
     OR NEW.expires_at IS DISTINCT FROM OLD.expires_at OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'obligation purchase fields are immutable' USING ERRCODE = 'P0001';
  END IF;
  IF OLD.sealed_at IS NOT NULL AND NEW.sealed_at IS DISTINCT FROM OLD.sealed_at THEN
    RAISE EXCEPTION 'sealed_at is set once' USING ERRCODE = 'P0001';
  END IF;
  IF OLD.sealed_at IS NULL AND NEW.sealed_at IS NOT NULL AND (OLD.status <> 'open' OR NEW.status <> 'open') THEN
    RAISE EXCEPTION 'only an open obligation can be sealed' USING ERRCODE = 'P0001';
  END IF;
  IF NEW.status = OLD.status THEN
    IF NEW.settled_receipt_id IS NOT NULL OR NEW.settled_at IS NOT NULL THEN
      RAISE EXCEPTION 'settlement fields change only on settlement' USING ERRCODE = 'P0001';
    END IF;
    RETURN NEW;
  END IF;
  IF OLD.sealed_at IS NULL THEN
    RAISE EXCEPTION 'an unsealed obligation cannot change status' USING ERRCODE = 'P0001';
  END IF;
  IF OLD.status = 'review' THEN
    -- review -> settled / cancelled are operator decisions; no operator path exists in step 3.
    RAISE EXCEPTION 'obligation transition review -> % needs an operator (not available)', NEW.status USING ERRCODE = 'P0001';
  END IF;
  IF NOT ((OLD.status = 'open' AND NEW.status IN ('settled', 'cancelled', 'expired', 'review'))
       OR (OLD.status IN ('cancelled', 'expired') AND NEW.status = 'review')) THEN
    RAISE EXCEPTION 'obligation transition % -> % is not allowed', OLD.status, NEW.status USING ERRCODE = 'P0001';
  END IF;
  IF NEW.status = 'settled' THEN
    IF NEW.settled_receipt_id IS NULL OR NOT EXISTS (
         SELECT 1 FROM "payment_receipts" r JOIN "payment_attempts" a ON a.id = r.attempt_id
          WHERE r.id = NEW.settled_receipt_id AND r.obligation_id = NEW.id AND a.status = 'succeeded') THEN
      RAISE EXCEPTION 'settlement requires a receipt of a succeeded attempt of this obligation' USING ERRCODE = 'P0001';
    END IF;
  ELSIF NEW.settled_receipt_id IS NOT NULL OR NEW.settled_at IS NOT NULL THEN
    RAISE EXCEPTION 'settlement fields change only on settlement' USING ERRCODE = 'P0001';
  END IF;
  IF NEW.status = 'cancelled' AND (
       EXISTS (SELECT 1 FROM "payment_attempts" a WHERE a.obligation_id = NEW.id AND a.status IN ('created', 'pending', 'unknown'))
    OR EXISTS (SELECT 1 FROM "payment_receipts" r WHERE r.obligation_id = NEW.id)) THEN
    RAISE EXCEPTION 'an obligation with an active attempt or a receipt cannot be cancelled' USING ERRCODE = 'P0001';
  END IF;
  IF NEW.status = 'expired' AND (now() < OLD.expires_at
    OR EXISTS (SELECT 1 FROM "payment_attempts" a WHERE a.obligation_id = NEW.id AND a.status IN ('created', 'pending', 'unknown'))) THEN
    RAISE EXCEPTION 'an obligation expires only after expires_at and with no active attempt' USING ERRCODE = 'P0001';
  END IF;
  IF NEW.status = 'review' AND NOT (
       EXISTS (SELECT 1 FROM "payment_receipts" r WHERE r.obligation_id = NEW.id)
    OR EXISTS (SELECT 1 FROM "payment_attempts" a WHERE a.obligation_id = NEW.id AND a.status = 'needs_review')) THEN
    RAISE EXCEPTION 'review requires a receipt or an attempt in needs_review' USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END
$$;--> statement-breakpoint
CREATE TRIGGER "payment_obligations_guard" BEFORE UPDATE OR DELETE ON "payment_obligations"
  FOR EACH ROW EXECUTE FUNCTION "payment_obligations_guard"();--> statement-breakpoint
-- Seal check at COMMIT: no unsealed obligation, beneficiary count or hash mismatch can ever be committed.
CREATE FUNCTION "payment_obligations_seal_check"() RETURNS trigger LANGUAGE plpgsql
  SET search_path = pg_catalog, public, pg_temp AS $$
DECLARE
  o "payment_obligations"%ROWTYPE;
  n integer;
BEGIN
  SELECT * INTO o FROM "payment_obligations" WHERE id = NEW.id;
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;
  IF o.sealed_at IS NULL THEN
    RAISE EXCEPTION 'obligation % was not sealed', o.id USING ERRCODE = 'PF005';
  END IF;
  SELECT count(*) INTO n FROM "payment_obligation_beneficiaries" WHERE obligation_id = o.id;
  IF n <> o.beneficiary_count THEN
    RAISE EXCEPTION 'obligation % has % beneficiaries, expected %', o.id, n, o.beneficiary_count USING ERRCODE = 'PF005';
  END IF;
  IF o.snapshot_hash IS DISTINCT FROM "payment_obligation_hash"(o.id) THEN
    RAISE EXCEPTION 'obligation % snapshot hash does not match its columns and beneficiaries', o.id USING ERRCODE = 'PF005';
  END IF;
  RETURN NULL;
END
$$;--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "payment_obligations_seal_check" AFTER INSERT ON "payment_obligations"
  DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION "payment_obligations_seal_check"();--> statement-breakpoint

-- ---------- payment_obligation_beneficiaries (immutable evidence) ----------
CREATE FUNCTION "payment_obligation_beneficiaries_guard"() RETURNS trigger LANGUAGE plpgsql
  SET search_path = pg_catalog, public, pg_temp AS $$
DECLARE
  o "payment_obligations"%ROWTYPE;
  acc record;
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF NOT payment_test_cleanup_allowed() THEN
      RAISE EXCEPTION 'payment_obligation_beneficiaries rows cannot be deleted' USING ERRCODE = 'P0001';
    END IF;
    RETURN OLD;
  END IF;
  IF TG_OP = 'UPDATE' THEN
    RAISE EXCEPTION 'beneficiary evidence is immutable' USING ERRCODE = 'P0001';
  END IF;
  SELECT * INTO o FROM "payment_obligations" WHERE id = NEW.obligation_id FOR SHARE;
  IF NOT FOUND THEN
    RETURN NEW; -- the FK refuses it (23503)
  END IF;
  IF o.sealed_at IS NOT NULL THEN
    RAISE EXCEPTION 'obligation % is sealed', o.id USING ERRCODE = 'PF006';
  END IF;
  SELECT a.principal_id, a.learner_id, a.relationship_type, a.status INTO acc
    FROM "principal_learner_access" a WHERE a.id = NEW.access_id FOR SHARE;
  IF NOT FOUND OR acc.status <> 'active' OR acc.relationship_type <> 'guardian'
     OR acc.principal_id <> o.payer_principal_id OR acc.learner_id <> NEW.learner_id THEN
    RAISE EXCEPTION 'beneficiary not authorised' USING ERRCODE = 'PF004';
  END IF;
  RETURN NEW;
END
$$;--> statement-breakpoint
CREATE TRIGGER "payment_obligation_beneficiaries_guard" BEFORE INSERT OR UPDATE OR DELETE ON "payment_obligation_beneficiaries"
  FOR EACH ROW EXECUTE FUNCTION "payment_obligation_beneficiaries_guard"();--> statement-breakpoint

-- ---------- payment_attempts (0018 guard unchanged; new INSERT guard + settlement invariant) ----------
-- FOR SHARE on the obligation (not only the FK's KEY SHARE, which is taken after the row is written) makes a
-- raw insert wait for a concurrent cancel / settle / expiry and then see its result.
-- Expiry uses clock_timestamp() (C1): the wall clock when the row is checked, not the transaction start, so a
-- transaction that began before expires_at cannot add an attempt after it. Same boundary as the ledger
-- (payable while t < expires_at) and the expiry guard (expirable once now() >= expires_at, unchanged).
-- Access rows are locked in id order (D1), the ledger's order (postgres-ledger.ts evidenceStillValid).
CREATE FUNCTION "payment_attempts_obligation_guard"() RETURNS trigger LANGUAGE plpgsql
  SET search_path = pg_catalog, public, pg_temp AS $$
DECLARE
  o "payment_obligations"%ROWTYPE;
  valid integer;
BEGIN
  IF NEW.status <> 'created' OR NEW.provider_reference IS NOT NULL OR NEW.observed_status IS NOT NULL
     OR NEW.observed_amount_minor IS NOT NULL OR NEW.observed_currency IS NOT NULL OR NEW.confirmed_at IS NOT NULL
     OR NEW.verify_count <> 0 THEN
    RAISE EXCEPTION 'a new payment attempt must be created unobserved (status created)' USING ERRCODE = 'P0001';
  END IF;
  SELECT * INTO o FROM "payment_obligations" WHERE id = NEW.obligation_id FOR SHARE;
  IF NOT FOUND THEN
    RETURN NEW; -- the composite FK refuses it (23503)
  END IF;
  IF o.status = 'settled' THEN
    RAISE EXCEPTION 'obligation % is already settled', o.id USING ERRCODE = 'PF001';
  END IF;
  IF o.status = 'review' THEN
    RAISE EXCEPTION 'obligation % needs review', o.id USING ERRCODE = 'PF003';
  END IF;
  IF o.status <> 'open' OR o.sealed_at IS NULL OR clock_timestamp() >= o.expires_at THEN
    RAISE EXCEPTION 'obligation % is not payable', o.id USING ERRCODE = 'PF002';
  END IF;
  SELECT count(*) INTO valid FROM (
    SELECT 1 FROM "payment_obligation_beneficiaries" b
      JOIN "principal_learner_access" a ON a.id = b.access_id
     WHERE b.obligation_id = o.id AND a.status = 'active' AND a.relationship_type = 'guardian'
       AND a.principal_id = o.payer_principal_id AND a.learner_id = b.learner_id
     ORDER BY a.id
       FOR SHARE OF a) s;
  IF valid <> o.beneficiary_count THEN
    RAISE EXCEPTION 'a beneficiary of obligation % is no longer authorised', o.id USING ERRCODE = 'PF004';
  END IF;
  RETURN NEW;
END
$$;--> statement-breakpoint
CREATE TRIGGER "payment_attempts_obligation_guard" BEFORE INSERT ON "payment_attempts"
  FOR EACH ROW EXECUTE FUNCTION "payment_attempts_obligation_guard"();--> statement-breakpoint
-- At COMMIT: an attempt that became succeeded has its receipt, and an attempt that became succeeded or
-- needs_review left its obligation not open (settled / review). A store that updates attempts without
-- applying the obligation outcome (e.g. the step 2 PostgresPaymentAttemptStore) therefore fails at commit.
-- AD9 (B3 hardening): a clean provider success recorded as needs_review must also have its receipt; money that
-- moved for an unsettled purchase puts it in review (C.2: cancelled / expired -> review); and every attempt that
-- did not settle its obligation is covered by an exception for that attempt, blocking unless the obligation is
-- settled (H; AD10 duplicate_charge).
-- A1 (final corrections): a receipt is required for every successful observation that is identifiably ours,
-- including underpayment, overpayment and currency mismatch (Stage A; receiptCandidate in
-- packages/payments/obligation.ts). The ARRAY below must equal NON_RECEIPT_FAILURES there (the failures that mean the
-- charge may not be ours); tests/payment-migration-0019-static.test.ts fails on any drift. Such a receipt records
-- money that moved; it settles nothing (settlement still needs the exact composite FK and a succeeded attempt).
-- The rules live in payment_attempt_outcome_assert so that the receipt INSERT check (A2) applies the identical
-- predicate to the identical committed state.
CREATE FUNCTION "payment_attempt_outcome_assert"(p_attempt_id text) RETURNS void LANGUAGE plpgsql
  SET search_path = pg_catalog, public, pg_temp AS $$
DECLARE
  a "payment_attempts"%ROWTYPE;
  o "payment_obligations"%ROWTYPE;
  receipt_id text;
BEGIN
  SELECT * INTO a FROM "payment_attempts" WHERE id = p_attempt_id;
  IF NOT FOUND THEN
    RETURN;
  END IF;
  SELECT r.id INTO receipt_id FROM "payment_receipts" r WHERE r.attempt_id = a.id;
  IF a.status = 'succeeded' AND receipt_id IS NULL THEN
    RAISE EXCEPTION 'succeeded attempt % has no receipt', a.id USING ERRCODE = 'PF008';
  END IF;
  IF a.status = 'needs_review' AND receipt_id IS NULL AND a.observed_status = 'successful'
     AND a.provider_reference IS NOT NULL AND a.provider_reference <> ''
     AND a.observed_amount_minor > 0 AND a.observed_currency ~ '^[A-Z]{3}$'
     AND NOT (coalesce(a.verification_failures, '[]'::jsonb) ?| ARRAY['PROVIDER_MISMATCH', 'REFERENCE_MISMATCH',
       'PROVIDER_REFERENCE_MISMATCH', 'EXPECTATION_CONFLICT', 'AMOUNT_NOT_INTEGER', 'VERIFICATION_UNAVAILABLE']) THEN
    RAISE EXCEPTION 'identifiable successful payment on attempt % has no receipt', a.id USING ERRCODE = 'PF008';
  END IF;
  SELECT * INTO o FROM "payment_obligations" WHERE id = a.obligation_id;
  IF NOT FOUND THEN
    RETURN; -- the composite FK makes this unreachable
  END IF;
  IF o.status = 'open' THEN
    RAISE EXCEPTION 'attempt % outcome was not applied to its obligation', a.id USING ERRCODE = 'PF008';
  END IF;
  IF receipt_id IS NOT NULL AND o.status NOT IN ('settled', 'review') THEN
    RAISE EXCEPTION 'receipt of attempt % left obligation % %', a.id, o.id, o.status USING ERRCODE = 'PF008';
  END IF;
  -- Exempt only the attempt whose own receipt settled the obligation (NULL never matches).
  IF (receipt_id IS NULL OR o.settled_receipt_id IS DISTINCT FROM receipt_id) AND NOT EXISTS (
       SELECT 1 FROM "payment_exceptions" e
        WHERE e.attempt_id = a.id AND e.obligation_id = a.obligation_id AND (o.status = 'settled' OR e.blocks_fulfilment)) THEN
    RAISE EXCEPTION 'attempt % outcome has no financial exception', a.id USING ERRCODE = 'PF008';
  END IF;
END
$$;--> statement-breakpoint
CREATE FUNCTION "payment_attempts_outcome_check"() RETURNS trigger LANGUAGE plpgsql
  SET search_path = pg_catalog, public, pg_temp AS $$
BEGIN
  PERFORM "payment_attempt_outcome_assert"(NEW.id);
  RETURN NULL;
END
$$;--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "payment_attempts_outcome_check" AFTER UPDATE ON "payment_attempts"
  DEFERRABLE INITIALLY DEFERRED FOR EACH ROW
  WHEN (NEW.status IN ('succeeded', 'needs_review'))
  EXECUTE FUNCTION "payment_attempts_outcome_check"();--> statement-breakpoint

-- ---------- payment_receipts (append-only financial events) ----------
CREATE FUNCTION "payment_receipts_guard"() RETURNS trigger LANGUAGE plpgsql
  SET search_path = pg_catalog, public, pg_temp AS $$
DECLARE
  a "payment_attempts"%ROWTYPE;
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF NOT payment_test_cleanup_allowed() THEN
      RAISE EXCEPTION 'payment_receipts rows cannot be deleted' USING ERRCODE = 'P0001';
    END IF;
    RETURN OLD;
  END IF;
  IF TG_OP = 'UPDATE' THEN
    RAISE EXCEPTION 'payment_receipts is append-only' USING ERRCODE = 'P0001';
  END IF;
  SELECT * INTO a FROM "payment_attempts" WHERE id = NEW.attempt_id;
  IF NOT FOUND THEN
    RETURN NEW; -- the composite FK refuses it (23503)
  END IF;
  IF a.status NOT IN ('succeeded', 'needs_review') OR a.observed_status IS DISTINCT FROM 'successful'
     OR a.provider_reference IS DISTINCT FROM NEW.provider_reference
     OR a.observed_amount_minor IS DISTINCT FROM NEW.amount_minor OR a.observed_currency IS DISTINCT FROM NEW.currency THEN
    RAISE EXCEPTION 'receipt does not match the provider observation recorded on attempt %', a.id USING ERRCODE = 'PF007';
  END IF;
  -- Receipt integrity (B3 closeout, 9 Oct 2026): no receipt for a charge that may not be ours (receiptCandidate in
  -- packages/payments/obligation.ts). Same ARRAY as payment_attempt_outcome_assert (= NON_RECEIPT_FAILURES; the static
  -- test fails on drift). UNDERPAYMENT, OVERPAYMENT and CURRENCY_MISMATCH are not in it: those receipts stay valid.
  IF coalesce(a.verification_failures, '[]'::jsonb) ?| ARRAY['PROVIDER_MISMATCH', 'REFERENCE_MISMATCH',
       'PROVIDER_REFERENCE_MISMATCH', 'EXPECTATION_CONFLICT', 'AMOUNT_NOT_INTEGER', 'VERIFICATION_UNAVAILABLE'] THEN
    RAISE EXCEPTION 'attempt % has a verification failure that refuses a receipt', a.id USING ERRCODE = 'PF007';
  END IF;
  RETURN NEW;
END
$$;--> statement-breakpoint
CREATE TRIGGER "payment_receipts_guard" BEFORE INSERT OR UPDATE OR DELETE ON "payment_receipts"
  FOR EACH ROW EXECUTE FUNCTION "payment_receipts_guard"();--> statement-breakpoint
-- A2 (final corrections): at COMMIT, a transaction that inserted a receipt must also have applied its outcome
-- (obligation settled or review; an exception for the attempt unless this receipt settled it), even when it never
-- updated the attempt. The only legitimate writer (postgres-ledger.ts recordReceipt, called from
-- applyAttemptOutcome) inserts a receipt only in a transaction that also updated the same attempt to succeeded or
-- needs_review, so payment_attempts_outcome_check already runs payment_attempt_outcome_assert for that attempt at
-- the same COMMIT. Neither check writes, so this one cannot refuse a transaction the attempt check accepts. It does
-- NOT re-compare the receipt with the attempt's observation: re-observing a needs_review attempt after its receipt
-- (reversal detection) is legitimate, and the BEFORE INSERT guard already compared them at insert.
CREATE FUNCTION "payment_receipts_outcome_check"() RETURNS trigger LANGUAGE plpgsql
  SET search_path = pg_catalog, public, pg_temp AS $$
BEGIN
  PERFORM "payment_attempt_outcome_assert"(NEW.attempt_id);
  RETURN NULL;
END
$$;--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "payment_receipts_outcome_check" AFTER INSERT ON "payment_receipts"
  DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION "payment_receipts_outcome_check"();--> statement-breakpoint

-- ---------- payment_exceptions (no resolution path in step 3) ----------
CREATE FUNCTION "payment_exceptions_guard"() RETURNS trigger LANGUAGE plpgsql
  SET search_path = pg_catalog, public, pg_temp AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF NOT payment_test_cleanup_allowed() THEN
      RAISE EXCEPTION 'payment_exceptions rows cannot be deleted' USING ERRCODE = 'P0001';
    END IF;
    RETURN OLD;
  END IF;
  IF TG_OP = 'UPDATE' THEN
    RAISE EXCEPTION 'payment exceptions cannot be changed in step 3 (no resolution path)' USING ERRCODE = 'P0001';
  END IF;
  IF NEW.status <> 'open' THEN
    RAISE EXCEPTION 'a new payment exception must be open' USING ERRCODE = 'P0001';
  END IF;
  IF NEW.attempt_id IS NOT NULL AND NOT EXISTS (
       SELECT 1 FROM "payment_attempts" a WHERE a.id = NEW.attempt_id AND a.obligation_id = NEW.obligation_id) THEN
    RAISE EXCEPTION 'exception attempt belongs to another obligation' USING ERRCODE = 'PF009';
  END IF;
  IF NEW.receipt_id IS NOT NULL AND NOT EXISTS (
       SELECT 1 FROM "payment_receipts" r WHERE r.id = NEW.receipt_id AND r.obligation_id = NEW.obligation_id) THEN
    RAISE EXCEPTION 'exception receipt belongs to another obligation' USING ERRCODE = 'PF009';
  END IF;
  RETURN NEW;
END
$$;--> statement-breakpoint
CREATE TRIGGER "payment_exceptions_guard" BEFORE INSERT OR UPDATE OR DELETE ON "payment_exceptions"
  FOR EACH ROW EXECUTE FUNCTION "payment_exceptions_guard"();--> statement-breakpoint

-- ---------- payment_obligation_events (append-only) ----------
CREATE FUNCTION "payment_obligation_events_guard"() RETURNS trigger LANGUAGE plpgsql
  SET search_path = pg_catalog, public, pg_temp AS $$
BEGIN
  IF TG_OP = 'DELETE' AND payment_test_cleanup_allowed() THEN
    RETURN OLD;
  END IF;
  RAISE EXCEPTION 'payment_obligation_events is append-only' USING ERRCODE = 'P0001';
END
$$;--> statement-breakpoint
CREATE TRIGGER "payment_obligation_events_guard" BEFORE UPDATE OR DELETE ON "payment_obligation_events"
  FOR EACH ROW EXECUTE FUNCTION "payment_obligation_events_guard"();--> statement-breakpoint
-- B1 (final corrections): INSERT guard. The only writer (postgres-ledger.ts appendObligationEvent) appends with
-- sequence = max + 1 while holding the obligation row lock: "created" (NULL -> open) in the creating transaction,
-- each status change right after the UPDATE it records, and "exception_opened" with both statuses NULL. Locking the
-- obligation here (FOR UPDATE, the ledger's first lock; already held on every ledger path) queues any other inserter
-- behind it, so a forged row cannot take a sequence out of order (e.g. 2147483647, which would make the next
-- max + 1 overflow) and cannot take the one-settlement index slot before the real settlement: a status event must
-- record a change into the obligation's status as it is at that moment.
CREATE FUNCTION "payment_obligation_events_insert_guard"() RETURNS trigger LANGUAGE plpgsql
  SET search_path = pg_catalog, public, pg_temp AS $$
DECLARE
  current_status text;
  next_sequence integer;
BEGIN
  SELECT o.status INTO current_status FROM "payment_obligations" o WHERE o.id = NEW.obligation_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN NEW; -- the FK refuses it (23503)
  END IF;
  SELECT coalesce(max(e.sequence), 0) + 1 INTO next_sequence
    FROM "payment_obligation_events" e WHERE e.obligation_id = NEW.obligation_id;
  IF NEW.sequence IS DISTINCT FROM next_sequence THEN
    RAISE EXCEPTION 'obligation event sequence must be % (got %)', next_sequence, NEW.sequence USING ERRCODE = 'P0001';
  END IF;
  IF NEW.to_status IS NULL THEN
    IF NEW.from_status IS NOT NULL THEN
      RAISE EXCEPTION 'an obligation event without to_status cannot have from_status' USING ERRCODE = 'P0001';
    END IF;
  ELSIF NEW.to_status IS DISTINCT FROM current_status OR NEW.from_status IS NOT DISTINCT FROM NEW.to_status THEN
    RAISE EXCEPTION 'an obligation status event must record a change into the current status (%)', current_status USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END
$$;--> statement-breakpoint
CREATE TRIGGER "payment_obligation_events_insert_guard" BEFORE INSERT ON "payment_obligation_events"
  FOR EACH ROW EXECUTE FUNCTION "payment_obligation_events_insert_guard"();--> statement-breakpoint

-- ---------- payment_attempt_events (0018 table; 0018 guard unchanged, INSERT guard added here) ----------
-- B2 (final corrections): the writers (services/payments/store/postgres.ts insertAttempt and
-- applyAttemptTransition, also used by the ledger) append sequence 1 "created" -> created right after the attempt
-- INSERT, then max + 1 right after each attempt UPDATE (to_status = the new status, which may equal from_status for a
-- re-observation), always with the attempt row locked. Same rule as B1: lock the attempt (FOR UPDATE, as lockAttempt
-- does), sequence = max + 1, to_status = the attempt's status now. A forged 'succeeded' event can therefore no longer
-- take payment_attempt_events_one_success_per_attempt before the real success (the attempt is not succeeded yet),
-- and after success the attempt is immutable (0018) and its event already exists. Removed by the 0019 reversal.
CREATE FUNCTION "payment_attempt_events_insert_guard"() RETURNS trigger LANGUAGE plpgsql
  SET search_path = pg_catalog, public, pg_temp AS $$
DECLARE
  current_status text;
  next_sequence integer;
BEGIN
  SELECT a.status INTO current_status FROM "payment_attempts" a WHERE a.id = NEW.attempt_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN NEW; -- the FK refuses it (23503)
  END IF;
  SELECT coalesce(max(e.sequence), 0) + 1 INTO next_sequence
    FROM "payment_attempt_events" e WHERE e.attempt_id = NEW.attempt_id;
  IF NEW.sequence IS DISTINCT FROM next_sequence THEN
    RAISE EXCEPTION 'attempt event sequence must be % (got %)', next_sequence, NEW.sequence USING ERRCODE = 'P0001';
  END IF;
  IF NEW.to_status IS DISTINCT FROM current_status THEN
    RAISE EXCEPTION 'an attempt event must record the attempt''s current status (%)', current_status USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END
$$;--> statement-breakpoint
CREATE TRIGGER "payment_attempt_events_insert_guard" BEFORE INSERT ON "payment_attempt_events"
  FOR EACH ROW EXECUTE FUNCTION "payment_attempt_events_insert_guard"();
