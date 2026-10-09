-- Payments Phase 2, step 3, B4 (artifact A3): behaviour harness for migration 0019 on filumire_test.
-- Run: node scripts/b4/pg-env-run.mjs psql -f scripts/sql/payment-0019-behaviour-check.sql
--
-- One transaction that always ends in ROLLBACK (this file never commits). Fixtures (ids prefixed b4t-) are created
-- inside it. Each case runs in its own subtransaction (a plpgsql BEGIN ... EXCEPTION block) that is ALWAYS rolled
-- back: a case that raises no error is ended by a sentinel exception (SQLSTATE P0B40) so its writes are discarded too.
-- The expected outcome is matched on SQLSTATE plus, where given, the constraint name (":"), the raising function in
-- the error context ("@") or a message fragment ("~"). Deferred checks are forced inside a case with
-- SET CONSTRAINTS ALL IMMEDIATE (the subtransaction abort restores the deferred mode). Any failed case -> the final
-- block raises -> psql exits non-zero; the transaction is rolled back either way.
\set ON_ERROR_STOP 1
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '120s';
SET LOCAL client_min_messages = notice;

DO $guard$
BEGIN
  IF current_database() <> 'filumire_test' THEN
    RAISE EXCEPTION 'B4 behaviour harness runs on filumire_test only';
  END IF;
  IF EXISTS (SELECT 1 FROM public.principals WHERE id LIKE 'b4t-%') OR EXISTS (SELECT 1 FROM public.learners WHERE id LIKE 'b4t-%')
     OR EXISTS (SELECT 1 FROM public.principal_learner_access WHERE id LIKE 'b4t-%') THEN
    RAISE EXCEPTION 'B4 behaviour harness: b4t- fixture ids already exist';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM drizzle.__drizzle_migrations
                  WHERE hash = '7543cc7cc341b075684f9eefe72fb020d579ac2f7010cee934c12abbdbb9d563') THEN
    RAISE EXCEPTION 'B4 behaviour harness: 0019 is not applied';
  END IF;
END
$guard$;

CREATE TEMP TABLE b4_results (n serial PRIMARY KEY, label text NOT NULL, want text NOT NULL, got text NOT NULL,
  ok boolean NOT NULL, message text) ON COMMIT DROP;

-- ---------- harness ----------
CREATE FUNCTION pg_temp.b4_case(p_label text, p_want text, p_stmts text[]) RETURNS void LANGUAGE plpgsql AS $f$
DECLARE
  s text;
  st text;
  msg text;
  ctx text;
  con text;
  want_state text := substring(p_want FROM '^([A-Z0-9]{2,5})');
  qualifier text := substring(p_want FROM '^[A-Z0-9]{2,5}(.*)$');
  ok boolean;
BEGIN
  BEGIN
    FOREACH s IN ARRAY p_stmts LOOP
      EXECUTE s;
    END LOOP;
    RAISE EXCEPTION 'b4: case raised no error' USING ERRCODE = 'P0B40';
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS st = RETURNED_SQLSTATE, msg = MESSAGE_TEXT, ctx = PG_EXCEPTION_CONTEXT, con = CONSTRAINT_NAME;
  END;
  IF p_want = 'OK' THEN
    ok := st = 'P0B40';
  ELSE
    ok := st = want_state AND CASE
      WHEN qualifier IS NULL OR qualifier = '' THEN true
      WHEN left(qualifier, 1) = ':' THEN con = substr(qualifier, 2)
      WHEN left(qualifier, 1) = '@' THEN position(substr(qualifier, 2) || '()' IN coalesce(ctx, '')) > 0
      WHEN left(qualifier, 1) = '~' THEN position(substr(qualifier, 2) IN coalesce(msg, '')) > 0
      ELSE false END;
  END IF;
  INSERT INTO b4_results (label, want, got, ok, message)
  VALUES (p_label, p_want, CASE WHEN st = 'P0B40' THEN 'OK' ELSE st || coalesce(':' || nullif(con, ''), '') END, ok,
          CASE WHEN st = 'P0B40' THEN NULL ELSE left(msg, 160) END);
END
$f$;

-- ---------- fixture helpers (run as the caller; every 0018/0019 trigger applies) ----------
CREATE FUNCTION pg_temp.b4_obl_raw(p_id text, p_mode text DEFAULT 'sandbox', p_currency text DEFAULT 'GHS',
  p_amount integer DEFAULT 2500, p_count integer DEFAULT 1, p_hash text DEFAULT repeat('a', 64),
  p_status text DEFAULT 'open', p_sealed timestamptz DEFAULT NULL, p_terms jsonb DEFAULT '{}'::jsonb,
  p_label text DEFAULT 'B4 test (sandbox)', p_payer text DEFAULT 'b4t-p1', p_key text DEFAULT NULL,
  p_expires timestamptz DEFAULT now() + interval '1 day') RETURNS void LANGUAGE sql AS $f$
  INSERT INTO public.payment_obligations (id, payer_principal_id, creation_key, product_code, product_version, product_label,
    product_terms, amount_minor, currency, mode, beneficiary_count, snapshot_hash, status, sealed_at, expires_at)
  VALUES (p_id, p_payer, coalesce(p_key, 'ck-' || p_id), 'sandbox_monthly', '2026.10', p_label, p_terms, p_amount,
    p_currency, p_mode, p_count, p_hash, p_status, p_sealed, p_expires)
$f$;
-- Unsealed obligation with the correct canonical hash for p_learners (beneficiaries not inserted).
CREATE FUNCTION pg_temp.b4_obl(p_id text, p_learners text[], p_payer text DEFAULT 'b4t-p1', p_amount integer DEFAULT 2500,
  p_expires timestamptz DEFAULT now() + interval '1 day', p_created timestamptz DEFAULT now(),
  p_count integer DEFAULT NULL, p_hash text DEFAULT NULL) RETURNS void LANGUAGE sql AS $f$
  INSERT INTO public.payment_obligations (id, payer_principal_id, creation_key, product_code, product_version, product_label,
    product_terms, amount_minor, currency, mode, beneficiary_count, snapshot_hash, status, expires_at, created_at, updated_at)
  VALUES (p_id, p_payer, 'ck-' || p_id, 'sandbox_monthly', '2026.10', 'B4 test (sandbox)', '{"months":1}'::jsonb, p_amount,
    'GHS', 'sandbox', coalesce(p_count, cardinality(p_learners)),
    coalesce(p_hash, public.payment_purchase_hash(p_id, p_payer, 'sandbox_monthly', '2026.10', 'B4 test (sandbox)',
      '{"months":1}'::jsonb, p_amount, 'GHS', 'sandbox', p_learners)),
    'open', p_expires, p_created, p_created)
$f$;
CREATE FUNCTION pg_temp.b4_ben(p_obligation text, p_learner text, p_access text) RETURNS void LANGUAGE sql AS $f$
  INSERT INTO public.payment_obligation_beneficiaries (obligation_id, learner_id, access_id, policy_code, relationship_type, authorized_at)
  VALUES (p_obligation, p_learner, p_access, 'guardian_v1', 'guardian', now())
$f$;
CREATE FUNCTION pg_temp.b4_seal(p_obligation text) RETURNS void LANGUAGE sql AS $f$
  UPDATE public.payment_obligations SET sealed_at = now(), updated_at = now() WHERE id = p_obligation
$f$;
CREATE FUNCTION pg_temp.b4_sealed(p_id text, p_learners text[], p_accesses text[], p_payer text DEFAULT 'b4t-p1',
  p_amount integer DEFAULT 2500, p_expires timestamptz DEFAULT now() + interval '1 day',
  p_created timestamptz DEFAULT now()) RETURNS void LANGUAGE plpgsql AS $f$
BEGIN
  PERFORM pg_temp.b4_obl(p_id, p_learners, p_payer, p_amount, p_expires, p_created);
  FOR i IN 1 .. cardinality(p_learners) LOOP
    PERFORM pg_temp.b4_ben(p_id, p_learners[i], p_accesses[i]);
  END LOOP;
  PERFORM pg_temp.b4_seal(p_id);
END
$f$;
CREATE FUNCTION pg_temp.b4_att(p_id text, p_obligation text, p_payer text DEFAULT 'b4t-p1', p_amount integer DEFAULT 2500,
  p_currency text DEFAULT 'GHS', p_mode text DEFAULT 'sandbox', p_status text DEFAULT 'created') RETURNS void LANGUAGE sql AS $f$
  INSERT INTO public.payment_attempts (id, idempotency_key, obligation_id, our_reference, request_fingerprint, provider, mode,
    payer_principal_id, amount_minor, currency, status)
  VALUES (p_id, 'idem-' || p_id, p_obligation, 'our-' || p_id, 'fp-' || p_id, 'paystack', p_mode, p_payer, p_amount,
    p_currency, p_status)
$f$;
-- Record a provider observation on an attempt (0018 lifecycle guard applies).
CREATE FUNCTION pg_temp.b4_observe(p_attempt text, p_status text, p_observed text, p_amount integer DEFAULT 2500,
  p_currency text DEFAULT 'GHS', p_failures jsonb DEFAULT '[]'::jsonb, p_ref text DEFAULT NULL) RETURNS void LANGUAGE sql AS $f$
  UPDATE public.payment_attempts
     SET status = p_status, observed_status = p_observed, observed_amount_minor = p_amount, observed_currency = p_currency,
         verification_failures = p_failures, provider_reference = coalesce(provider_reference, p_ref, 'ref-' || id),
         confirmed_at = CASE WHEN p_status = 'succeeded' THEN now() END, verify_count = verify_count + 1, updated_at = now()
   WHERE id = p_attempt
$f$;
-- Receipt copied from the attempt's recorded observation (what postgres-ledger.ts recordReceipt writes).
CREATE FUNCTION pg_temp.b4_receipt(p_id text, p_attempt text) RETURNS void LANGUAGE sql AS $f$
  INSERT INTO public.payment_receipts (id, attempt_id, obligation_id, provider, mode, merchant_context, provider_reference,
    amount_minor, currency, verified_at)
  SELECT p_id, a.id, a.obligation_id, a.provider, a.mode, 'sandbox:b4t', a.provider_reference, a.observed_amount_minor,
         a.observed_currency, now()
    FROM public.payment_attempts a WHERE a.id = p_attempt
$f$;
CREATE FUNCTION pg_temp.b4_status(p_obligation text, p_status text) RETURNS void LANGUAGE sql AS $f$
  UPDATE public.payment_obligations SET status = p_status, updated_at = now() WHERE id = p_obligation
$f$;
CREATE FUNCTION pg_temp.b4_settle(p_obligation text, p_receipt text) RETURNS void LANGUAGE sql AS $f$
  UPDATE public.payment_obligations SET status = 'settled', settled_receipt_id = p_receipt, settled_at = now(), updated_at = now()
   WHERE id = p_obligation
$f$;
CREATE FUNCTION pg_temp.b4_exc(p_id text, p_obligation text, p_attempt text, p_kind text, p_receipt text DEFAULT NULL)
  RETURNS void LANGUAGE sql AS $f$
  INSERT INTO public.payment_exceptions (id, obligation_id, attempt_id, receipt_id, kind, blocks_fulfilment, dedupe_key, status,
    opened_at, opened_by)
  VALUES (p_id, p_obligation, p_attempt, p_receipt, p_kind, p_kind <> 'duplicate_charge', coalesce(p_attempt, p_id), 'open',
    now(), 'system')
$f$;
-- Full settlement of an obligation by a new attempt (attempt -> succeeded -> receipt -> settled).
CREATE FUNCTION pg_temp.b4_pay(p_obligation text, p_attempt text, p_receipt text) RETURNS void LANGUAGE plpgsql AS $f$
BEGIN
  PERFORM pg_temp.b4_att(p_attempt, p_obligation);
  PERFORM pg_temp.b4_observe(p_attempt, 'succeeded', 'successful');
  PERFORM pg_temp.b4_receipt(p_receipt, p_attempt);
  PERFORM pg_temp.b4_settle(p_obligation, p_receipt);
END
$f$;

-- ---------- fixtures ----------
INSERT INTO public.principals (id) VALUES ('b4t-p1'), ('b4t-p2');
INSERT INTO public.learners (id) VALUES ('b4t-l1'), ('b4t-l2'), ('b4t-l3');
INSERT INTO public.principal_learner_access (id, principal_id, learner_id, relationship_type, status) VALUES
  ('b4t-a1', 'b4t-p1', 'b4t-l1', 'guardian', 'active'),
  ('b4t-a2', 'b4t-p1', 'b4t-l2', 'guardian', 'active'),
  ('b4t-a3', 'b4t-p1', 'b4t-l3', 'self', 'active'),
  ('b4t-a4', 'b4t-p2', 'b4t-l1', 'guardian', 'active'),
  ('b4t-a5', 'b4t-p1', 'b4t-l3', 'guardian', 'revoked');
SELECT pg_temp.b4_sealed('b4t-o-open', ARRAY['b4t-l1'], ARRAY['b4t-a1']);
SELECT pg_temp.b4_sealed('b4t-o-two', ARRAY['b4t-l2', 'b4t-l1'], ARRAY['b4t-a2', 'b4t-a1']);
-- Fire the fixtures' deferred seal checks now (they must pass), then restore the deferred mode of the three
-- deferred constraint triggers; the settlement FK stays INITIALLY IMMEDIATE.
SET CONSTRAINTS ALL IMMEDIATE;
SET CONSTRAINTS payment_obligations_seal_check, payment_attempts_outcome_check, payment_receipts_outcome_check DEFERRED;

\pset tuples_only on
\pset format unaligned
-- ---------- O: obligation CHECKs and insert guard ----------
SELECT pg_temp.b4_case('O01 live mode refused', '23514:payment_obligations_sandbox_only_check', ARRAY[$q$SELECT pg_temp.b4_obl_raw('b4t-x', p_mode => 'live')$q$]);
SELECT pg_temp.b4_case('O02 currency other than GHS refused', '23514:payment_obligations_currency_check', ARRAY[$q$SELECT pg_temp.b4_obl_raw('b4t-x', p_currency => 'USD')$q$]);
SELECT pg_temp.b4_case('O03 amount 0 refused', '23514:payment_obligations_amount_check', ARRAY[$q$SELECT pg_temp.b4_obl_raw('b4t-x', p_amount => 0)$q$]);
SELECT pg_temp.b4_case('O04 beneficiary_count 0 refused', '23514:payment_obligations_beneficiary_count_check', ARRAY[$q$SELECT pg_temp.b4_obl_raw('b4t-x', p_count => 0)$q$]);
SELECT pg_temp.b4_case('O05 beneficiary_count 21 refused', '23514:payment_obligations_beneficiary_count_check', ARRAY[$q$SELECT pg_temp.b4_obl_raw('b4t-x', p_count => 21)$q$]);
SELECT pg_temp.b4_case('O06 malformed snapshot hash refused', '23514:payment_obligations_snapshot_hash_check', ARRAY[$q$SELECT pg_temp.b4_obl_raw('b4t-x', p_hash => 'ABC')$q$]);
SELECT pg_temp.b4_case('O07 terms not an object refused', '23514:payment_obligations_terms_check', ARRAY[$q$SELECT pg_temp.b4_obl_raw('b4t-x', p_terms => '[]'::jsonb)$q$]);
SELECT pg_temp.b4_case('O08 blank label refused', '23514:payment_obligations_product_label_check', ARRAY[$q$SELECT pg_temp.b4_obl_raw('b4t-x', p_label => E'　 ')$q$]);
SELECT pg_temp.b4_case('O09 insert as settled refused', 'P0001@payment_obligations_insert_guard', ARRAY[$q$SELECT pg_temp.b4_obl_raw('b4t-x', p_status => 'settled')$q$]);
SELECT pg_temp.b4_case('O10 insert already sealed refused', 'P0001@payment_obligations_insert_guard', ARRAY[$q$SELECT pg_temp.b4_obl_raw('b4t-x', p_sealed => now())$q$]);
SELECT pg_temp.b4_case('O11 duplicate payer creation key refused', '23505:payment_obligations_payer_creation_key_unique', ARRAY[
  $q$SELECT pg_temp.b4_obl_raw('b4t-x1', p_key => 'ck-same-key')$q$, $q$SELECT pg_temp.b4_obl_raw('b4t-x2', p_key => 'ck-same-key')$q$]);
SELECT pg_temp.b4_case('O12 expires_at not after created_at refused', '23514:payment_obligations_expiry_check', ARRAY[$q$SELECT pg_temp.b4_obl_raw('b4t-x', p_expires => now())$q$]);
SELECT pg_temp.b4_case('O13 unknown payer refused', '23503:payment_obligations_payer_fk', ARRAY[$q$SELECT pg_temp.b4_obl_raw('b4t-x', p_payer => 'b4t-nobody')$q$]);
SELECT pg_temp.b4_case('O14 live mode refused even with every other column valid', '23514:payment_obligations_sandbox_only_check', ARRAY[$q$SELECT pg_temp.b4_obl_raw('b4t-x', p_mode => 'live', p_hash => repeat('b', 64))$q$]);

-- ---------- S: deferred seal check ----------
SELECT pg_temp.b4_case('S01 unsealed obligation refused at commit time', 'PF005@payment_obligations_seal_check', ARRAY[
  $q$SELECT pg_temp.b4_obl('b4t-s', ARRAY['b4t-l1'])$q$, $q$SELECT pg_temp.b4_ben('b4t-s', 'b4t-l1', 'b4t-a1')$q$, 'SET CONSTRAINTS ALL IMMEDIATE']);
SELECT pg_temp.b4_case('S02 beneficiary count differs from rows', 'PF005~has 1 beneficiaries, expected 2', ARRAY[
  $q$SELECT pg_temp.b4_obl('b4t-s', ARRAY['b4t-l1'], p_count => 2)$q$, $q$SELECT pg_temp.b4_ben('b4t-s', 'b4t-l1', 'b4t-a1')$q$,
  $q$SELECT pg_temp.b4_seal('b4t-s')$q$, 'SET CONSTRAINTS ALL IMMEDIATE']);
SELECT pg_temp.b4_case('S03 snapshot hash not the canonical hash', 'PF005~snapshot hash does not match', ARRAY[
  $q$SELECT pg_temp.b4_obl('b4t-s', ARRAY['b4t-l1'], p_hash => repeat('0', 64))$q$, $q$SELECT pg_temp.b4_ben('b4t-s', 'b4t-l1', 'b4t-a1')$q$,
  $q$SELECT pg_temp.b4_seal('b4t-s')$q$, 'SET CONSTRAINTS ALL IMMEDIATE']);
SELECT pg_temp.b4_case('S04 hash of another beneficiary set', 'PF005~snapshot hash does not match', ARRAY[
  $q$SELECT pg_temp.b4_obl('b4t-s', ARRAY['b4t-l1'], p_hash => public.payment_purchase_hash('b4t-s', 'b4t-p1', 'sandbox_monthly', '2026.10', 'B4 test (sandbox)', '{"months":1}'::jsonb, 2500, 'GHS', 'sandbox', ARRAY['b4t-l2']))$q$,
  $q$SELECT pg_temp.b4_ben('b4t-s', 'b4t-l1', 'b4t-a1')$q$, $q$SELECT pg_temp.b4_seal('b4t-s')$q$, 'SET CONSTRAINTS ALL IMMEDIATE']);
SELECT pg_temp.b4_case('S05 correct seal passes at commit time', 'OK', ARRAY[
  $q$SELECT pg_temp.b4_sealed('b4t-s', ARRAY['b4t-l1', 'b4t-l2'], ARRAY['b4t-a1', 'b4t-a2'])$q$, 'SET CONSTRAINTS ALL IMMEDIATE']);
-- (Re-sealing with now() writes the identical transaction-start value: a no-op, correctly accepted. Use a new value.)
SELECT pg_temp.b4_case('S06 sealing twice refused', 'P0001~sealed_at is set once', ARRAY[$q$UPDATE public.payment_obligations SET sealed_at = clock_timestamp() WHERE id = 'b4t-o-open'$q$]);
SELECT pg_temp.b4_case('S06b unsealing refused', 'P0001~sealed_at is set once', ARRAY[$q$UPDATE public.payment_obligations SET sealed_at = NULL WHERE id = 'b4t-o-open'$q$]);
SELECT pg_temp.b4_case('S07 seal check is deferred (unsealed row accepted until commit time)', 'OK', ARRAY[$q$SELECT pg_temp.b4_obl('b4t-s', ARRAY['b4t-l1'])$q$]);
SELECT pg_temp.b4_case('S08 terms hash: terms changed after hashing', 'PF005~snapshot hash does not match', ARRAY[
  $q$SELECT pg_temp.b4_obl_raw('b4t-s', p_terms => '{"months":2}'::jsonb, p_hash => public.payment_purchase_hash('b4t-s', 'b4t-p1', 'sandbox_monthly', '2026.10', 'B4 test (sandbox)', '{"months":1}'::jsonb, 2500, 'GHS', 'sandbox', ARRAY['b4t-l1']))$q$,
  $q$SELECT pg_temp.b4_ben('b4t-s', 'b4t-l1', 'b4t-a1')$q$, $q$SELECT pg_temp.b4_seal('b4t-s')$q$, 'SET CONSTRAINTS ALL IMMEDIATE']);

-- ---------- B: beneficiaries (guardian_v1) ----------
SELECT pg_temp.b4_case('B01 self access is not guardian', 'PF004@payment_obligation_beneficiaries_guard', ARRAY[
  $q$SELECT pg_temp.b4_obl('b4t-b', ARRAY['b4t-l3'])$q$, $q$SELECT pg_temp.b4_ben('b4t-b', 'b4t-l3', 'b4t-a3')$q$]);
SELECT pg_temp.b4_case('B02 revoked guardian access', 'PF004@payment_obligation_beneficiaries_guard', ARRAY[
  $q$SELECT pg_temp.b4_obl('b4t-b', ARRAY['b4t-l3'])$q$, $q$SELECT pg_temp.b4_ben('b4t-b', 'b4t-l3', 'b4t-a5')$q$]);
SELECT pg_temp.b4_case('B03 another payer''s guardian access', 'PF004@payment_obligation_beneficiaries_guard', ARRAY[
  $q$SELECT pg_temp.b4_obl('b4t-b', ARRAY['b4t-l1'])$q$, $q$SELECT pg_temp.b4_ben('b4t-b', 'b4t-l1', 'b4t-a4')$q$]);
SELECT pg_temp.b4_case('B04 access row of a different learner', 'PF004@payment_obligation_beneficiaries_guard', ARRAY[
  $q$SELECT pg_temp.b4_obl('b4t-b', ARRAY['b4t-l2'])$q$, $q$SELECT pg_temp.b4_ben('b4t-b', 'b4t-l2', 'b4t-a1')$q$]);
SELECT pg_temp.b4_case('B05 beneficiary added after seal', 'PF006@payment_obligation_beneficiaries_guard', ARRAY[$q$SELECT pg_temp.b4_ben('b4t-o-open', 'b4t-l2', 'b4t-a2')$q$]);
SELECT pg_temp.b4_case('B06 beneficiary evidence update refused', 'P0001~beneficiary evidence is immutable', ARRAY[
  $q$UPDATE public.payment_obligation_beneficiaries SET authorized_at = now() - interval '1 day' WHERE obligation_id = 'b4t-o-open'$q$]);
SELECT pg_temp.b4_case('B07 beneficiary delete refused', 'P0001~cannot be deleted', ARRAY[$q$DELETE FROM public.payment_obligation_beneficiaries WHERE obligation_id = 'b4t-o-open'$q$]);
SELECT pg_temp.b4_case('B08 active guardian of the payer accepted', 'OK', ARRAY[
  $q$SELECT pg_temp.b4_obl('b4t-b', ARRAY['b4t-l1'])$q$, $q$SELECT pg_temp.b4_ben('b4t-b', 'b4t-l1', 'b4t-a1')$q$]);
SELECT pg_temp.b4_case('B09 non-guardian relationship value refused by CHECK', '23514:payment_obligation_beneficiaries_relationship_check', ARRAY[
  $q$SELECT pg_temp.b4_obl('b4t-b', ARRAY['b4t-l1'])$q$,
  $q$INSERT INTO public.payment_obligation_beneficiaries VALUES ('b4t-b', 'b4t-l1', 'b4t-a1', 'guardian_v1', 'self', now())$q$]);

-- ---------- M: obligation immutability, transitions, delete ----------
SELECT pg_temp.b4_case('M01 amount immutable', 'P0001~purchase fields are immutable', ARRAY[$q$UPDATE public.payment_obligations SET amount_minor = 1 WHERE id = 'b4t-o-open'$q$]);
SELECT pg_temp.b4_case('M02 terms immutable', 'P0001~purchase fields are immutable', ARRAY[$q$UPDATE public.payment_obligations SET product_terms = '{"months":12}' WHERE id = 'b4t-o-open'$q$]);
SELECT pg_temp.b4_case('M03 snapshot hash immutable', 'P0001~purchase fields are immutable', ARRAY[$q$UPDATE public.payment_obligations SET snapshot_hash = repeat('f', 64) WHERE id = 'b4t-o-open'$q$]);
SELECT pg_temp.b4_case('M04 expires_at immutable', 'P0001~purchase fields are immutable', ARRAY[$q$UPDATE public.payment_obligations SET expires_at = expires_at + interval '1 day' WHERE id = 'b4t-o-open'$q$]);
SELECT pg_temp.b4_case('M05 payer immutable', 'P0001~purchase fields are immutable', ARRAY[$q$UPDATE public.payment_obligations SET payer_principal_id = 'b4t-p2' WHERE id = 'b4t-o-open'$q$]);
SELECT pg_temp.b4_case('M06 label immutable', 'P0001~purchase fields are immutable', ARRAY[$q$UPDATE public.payment_obligations SET product_label = 'Other' WHERE id = 'b4t-o-open'$q$]);
SELECT pg_temp.b4_case('M07 open -> settled without a receipt', 'P0001~settlement requires a receipt', ARRAY[$q$SELECT pg_temp.b4_settle('b4t-o-open', 'b4t-no-receipt')$q$]);
SELECT pg_temp.b4_case('M08 open -> cancelled with nothing in flight', 'OK', ARRAY[$q$SELECT pg_temp.b4_status('b4t-o-open', 'cancelled')$q$, 'SET CONSTRAINTS ALL IMMEDIATE']);
SELECT pg_temp.b4_case('M09 open -> expired before expires_at', 'P0001~expires only after expires_at', ARRAY[$q$SELECT pg_temp.b4_status('b4t-o-open', 'expired')$q$]);
SELECT pg_temp.b4_case('M10 open -> review without receipt or needs_review attempt', 'P0001~review requires', ARRAY[$q$SELECT pg_temp.b4_status('b4t-o-open', 'review')$q$]);
SELECT pg_temp.b4_case('M11 unsealed obligation cannot change status', 'P0001~unsealed obligation cannot change status', ARRAY[
  $q$SELECT pg_temp.b4_obl('b4t-m', ARRAY['b4t-l1'])$q$, $q$SELECT pg_temp.b4_status('b4t-m', 'cancelled')$q$]);
SELECT pg_temp.b4_case('M12 cancelled -> open refused', 'P0001~transition cancelled -> open is not allowed', ARRAY[
  $q$SELECT pg_temp.b4_status('b4t-o-open', 'cancelled')$q$, $q$SELECT pg_temp.b4_status('b4t-o-open', 'open')$q$]);
SELECT pg_temp.b4_case('M13 cancelled -> expired refused', 'P0001~is not allowed', ARRAY[
  $q$SELECT pg_temp.b4_status('b4t-o-open', 'cancelled')$q$, $q$SELECT pg_temp.b4_status('b4t-o-open', 'expired')$q$]);
SELECT pg_temp.b4_case('M14 review -> cancelled needs an operator', 'P0001~needs an operator', ARRAY[
  $q$SELECT pg_temp.b4_att('b4t-m-a', 'b4t-o-open')$q$, $q$SELECT pg_temp.b4_observe('b4t-m-a', 'needs_review', 'failed')$q$,
  $q$SELECT pg_temp.b4_status('b4t-o-open', 'review')$q$, $q$SELECT pg_temp.b4_status('b4t-o-open', 'cancelled')$q$]);
SELECT pg_temp.b4_case('M15 review -> settled needs an operator', 'P0001~needs an operator', ARRAY[
  $q$SELECT pg_temp.b4_att('b4t-m-a', 'b4t-o-open')$q$, $q$SELECT pg_temp.b4_observe('b4t-m-a', 'needs_review', 'failed')$q$,
  $q$SELECT pg_temp.b4_status('b4t-o-open', 'review')$q$, $q$SELECT pg_temp.b4_status('b4t-o-open', 'settled')$q$]);
SELECT pg_temp.b4_case('M16 settled obligation immutable', 'P0001~settled obligations are immutable', ARRAY[
  $q$SELECT pg_temp.b4_pay('b4t-o-open', 'b4t-m-a', 'b4t-m-r')$q$, $q$SELECT pg_temp.b4_status('b4t-o-open', 'review')$q$]);
SELECT pg_temp.b4_case('M17 settlement fields only change on settlement', 'P0001~settlement fields change only on settlement', ARRAY[
  $q$UPDATE public.payment_obligations SET settled_at = now() WHERE id = 'b4t-o-open'$q$]);
SELECT pg_temp.b4_case('M18 open -> expired after expires_at', 'OK', ARRAY[
  $q$SELECT pg_temp.b4_sealed('b4t-m', ARRAY['b4t-l1'], ARRAY['b4t-a1'], p_created => now() - interval '2 hours', p_expires => now() - interval '1 hour')$q$,
  $q$SELECT pg_temp.b4_status('b4t-m', 'expired')$q$, 'SET CONSTRAINTS ALL IMMEDIATE']);
SELECT pg_temp.b4_case('M19 delete refused without the clean-up flag', 'P0001~payment_obligations rows cannot be deleted', ARRAY[$q$DELETE FROM public.payment_obligations WHERE id = 'b4t-o-open'$q$]);
SELECT pg_temp.b4_case('M20 delete refused with flag value other than on', 'P0001~payment_obligations rows cannot be deleted', ARRAY[
  $q$SET LOCAL filumire.payment_test_cleanup = 'yes'$q$, $q$DELETE FROM public.payment_obligations WHERE id = 'b4t-o-open'$q$]);
SELECT pg_temp.b4_case('M21 flagged delete still blocked by beneficiary RESTRICT', '23503:payment_obligation_beneficiaries_obligation_fk', ARRAY[
  $q$SET LOCAL filumire.payment_test_cleanup = 'on'$q$, $q$DELETE FROM public.payment_obligations WHERE id = 'b4t-o-open'$q$]);
SELECT pg_temp.b4_case('M22 cancel refused with an active attempt', 'P0001~active attempt or a receipt', ARRAY[
  $q$SELECT pg_temp.b4_att('b4t-m-a', 'b4t-o-open')$q$, $q$SELECT pg_temp.b4_status('b4t-o-open', 'cancelled')$q$]);
SELECT pg_temp.b4_case('M23 cancel refused once a receipt exists', 'P0001~active attempt or a receipt', ARRAY[
  $q$SELECT pg_temp.b4_att('b4t-m-a', 'b4t-o-open')$q$,
  $q$SELECT pg_temp.b4_observe('b4t-m-a', 'needs_review', 'successful', 2000, 'GHS', '["UNDERPAYMENT"]')$q$,
  $q$SELECT pg_temp.b4_receipt('b4t-m-r', 'b4t-m-a')$q$, $q$SELECT pg_temp.b4_status('b4t-o-open', 'cancelled')$q$]);
SELECT pg_temp.b4_case('M24 settling with another obligation''s receipt refused', 'P0001~settlement requires a receipt', ARRAY[
  $q$SELECT pg_temp.b4_pay('b4t-o-two', 'b4t-m-a', 'b4t-m-r')$q$, $q$SELECT pg_temp.b4_settle('b4t-o-open', 'b4t-m-r')$q$]);
SELECT pg_temp.b4_case('M25 settling with the receipt of a needs_review attempt refused', 'P0001~settlement requires a receipt', ARRAY[
  $q$SELECT pg_temp.b4_att('b4t-m-a', 'b4t-o-open')$q$,
  $q$SELECT pg_temp.b4_observe('b4t-m-a', 'needs_review', 'successful', 2000, 'GHS', '["UNDERPAYMENT"]')$q$,
  $q$SELECT pg_temp.b4_receipt('b4t-m-r', 'b4t-m-a')$q$, $q$SELECT pg_temp.b4_settle('b4t-o-open', 'b4t-m-r')$q$]);

-- ---------- A: attempt insert guard and binding FK ----------
SELECT pg_temp.b4_case('A01 attempt on an open sealed obligation accepted', 'OK', ARRAY[$q$SELECT pg_temp.b4_att('b4t-a-1', 'b4t-o-open')$q$]);
SELECT pg_temp.b4_case('A02 attempt on a settled obligation', 'PF001@payment_attempts_obligation_guard', ARRAY[
  $q$SELECT pg_temp.b4_pay('b4t-o-open', 'b4t-a-1', 'b4t-a-r')$q$, $q$SELECT pg_temp.b4_att('b4t-a-2', 'b4t-o-open')$q$]);
SELECT pg_temp.b4_case('A03 attempt on a cancelled obligation', 'PF002@payment_attempts_obligation_guard', ARRAY[
  $q$SELECT pg_temp.b4_status('b4t-o-open', 'cancelled')$q$, $q$SELECT pg_temp.b4_att('b4t-a-1', 'b4t-o-open')$q$]);
SELECT pg_temp.b4_case('A04 attempt on an unsealed obligation', 'PF002@payment_attempts_obligation_guard', ARRAY[
  $q$SELECT pg_temp.b4_obl('b4t-a-o', ARRAY['b4t-l1'])$q$, $q$SELECT pg_temp.b4_ben('b4t-a-o', 'b4t-l1', 'b4t-a1')$q$,
  $q$SELECT pg_temp.b4_att('b4t-a-1', 'b4t-a-o')$q$]);
SELECT pg_temp.b4_case('A05 attempt after expires_at', 'PF002@payment_attempts_obligation_guard', ARRAY[
  $q$SELECT pg_temp.b4_sealed('b4t-a-o', ARRAY['b4t-l1'], ARRAY['b4t-a1'], p_created => now() - interval '2 hours', p_expires => now() - interval '1 hour')$q$,
  $q$SELECT pg_temp.b4_att('b4t-a-1', 'b4t-a-o')$q$]);
SELECT pg_temp.b4_case('A06 C1: expiry judged by clock_timestamp(), not transaction start', 'PF002@payment_attempts_obligation_guard', ARRAY[
  $q$SELECT pg_temp.b4_sealed('b4t-a-o', ARRAY['b4t-l1'], ARRAY['b4t-a1'], p_expires => clock_timestamp() + interval '1 second')$q$,
  $q$SELECT pg_sleep(1.3)$q$,
  $q$DO $c$ BEGIN IF NOT (SELECT now() < o.expires_at FROM public.payment_obligations o WHERE o.id = 'b4t-a-o') THEN RAISE EXCEPTION 'precondition: now() already past expiry' USING ERRCODE = 'P0B41'; END IF; END $c$$q$,
  $q$SELECT pg_temp.b4_att('b4t-a-1', 'b4t-a-o')$q$]);
SELECT pg_temp.b4_case('A07 attempt on an obligation in review', 'PF003@payment_attempts_obligation_guard', ARRAY[
  $q$SELECT pg_temp.b4_att('b4t-a-1', 'b4t-o-open')$q$, $q$SELECT pg_temp.b4_observe('b4t-a-1', 'needs_review', 'failed')$q$,
  $q$SELECT pg_temp.b4_status('b4t-o-open', 'review')$q$, $q$SELECT pg_temp.b4_att('b4t-a-2', 'b4t-o-open')$q$]);
SELECT pg_temp.b4_case('A08 guardian access revoked after seal', 'PF004@payment_attempts_obligation_guard', ARRAY[
  $q$UPDATE public.principal_learner_access SET status = 'revoked' WHERE id = 'b4t-a1'$q$, $q$SELECT pg_temp.b4_att('b4t-a-1', 'b4t-o-open')$q$]);
SELECT pg_temp.b4_case('A09 one of two beneficiaries revoked', 'PF004@payment_attempts_obligation_guard', ARRAY[
  $q$UPDATE public.principal_learner_access SET status = 'revoked' WHERE id = 'b4t-a2'$q$, $q$SELECT pg_temp.b4_att('b4t-a-1', 'b4t-o-two')$q$]);
SELECT pg_temp.b4_case('A10 attempt inserted already observed', 'P0001~must be created unobserved', ARRAY[$q$SELECT pg_temp.b4_att('b4t-a-1', 'b4t-o-open', p_status => 'pending')$q$]);
SELECT pg_temp.b4_case('A11 unknown obligation', '23503:payment_attempts_obligation_fk', ARRAY[$q$SELECT pg_temp.b4_att('b4t-a-1', 'b4t-no-obligation')$q$]);
SELECT pg_temp.b4_case('A12 amount differs from obligation', '23503:payment_attempts_obligation_fk', ARRAY[$q$SELECT pg_temp.b4_att('b4t-a-1', 'b4t-o-open', p_amount => 2499)$q$]);
SELECT pg_temp.b4_case('A13 currency differs from obligation', '23503:payment_attempts_obligation_fk', ARRAY[$q$SELECT pg_temp.b4_att('b4t-a-1', 'b4t-o-open', p_currency => 'USD')$q$]);
SELECT pg_temp.b4_case('A14 payer differs from obligation', '23503:payment_attempts_obligation_fk', ARRAY[$q$SELECT pg_temp.b4_att('b4t-a-1', 'b4t-o-open', p_payer => 'b4t-p2')$q$]);
SELECT pg_temp.b4_case('A15 live attempt for a sandbox obligation', '23503:payment_attempts_obligation_fk', ARRAY[$q$SELECT pg_temp.b4_att('b4t-a-1', 'b4t-o-open', p_mode => 'live')$q$]);
SELECT pg_temp.b4_case('A16 second active attempt on one obligation', '23505:payment_attempts_one_active_per_obligation', ARRAY[
  $q$SELECT pg_temp.b4_att('b4t-a-1', 'b4t-o-open')$q$, $q$SELECT pg_temp.b4_att('b4t-a-2', 'b4t-o-open')$q$]);
SELECT pg_temp.b4_case('A17 new attempt after a failed one accepted', 'OK', ARRAY[
  $q$SELECT pg_temp.b4_att('b4t-a-1', 'b4t-o-open')$q$, $q$SELECT pg_temp.b4_observe('b4t-a-1', 'failed', 'failed')$q$,
  $q$SELECT pg_temp.b4_att('b4t-a-2', 'b4t-o-open')$q$, 'SET CONSTRAINTS ALL IMMEDIATE']);

-- ---------- U: deferred attempt outcome check ----------
SELECT pg_temp.b4_case('U01 succeeded attempt without a receipt', 'PF008@payment_attempts_outcome_check', ARRAY[
  $q$SELECT pg_temp.b4_att('b4t-u-a', 'b4t-o-open')$q$, $q$SELECT pg_temp.b4_observe('b4t-u-a', 'succeeded', 'successful')$q$,
  'SET CONSTRAINTS ALL IMMEDIATE']);
SELECT pg_temp.b4_case('U02 identifiable underpayment without a receipt', 'PF008~identifiable successful payment', ARRAY[
  $q$SELECT pg_temp.b4_att('b4t-u-a', 'b4t-o-open')$q$,
  $q$SELECT pg_temp.b4_observe('b4t-u-a', 'needs_review', 'successful', 2000, 'GHS', '["UNDERPAYMENT"]')$q$,
  $q$SELECT pg_temp.b4_status('b4t-o-open', 'review')$q$, $q$SELECT pg_temp.b4_exc('b4t-u-e', 'b4t-o-open', 'b4t-u-a', 'amount_mismatch')$q$,
  'SET CONSTRAINTS ALL IMMEDIATE']);
SELECT pg_temp.b4_case('U03 non-receipt failure needs no receipt (review + exception)', 'OK', ARRAY[
  $q$SELECT pg_temp.b4_att('b4t-u-a', 'b4t-o-open')$q$,
  $q$SELECT pg_temp.b4_observe('b4t-u-a', 'needs_review', 'successful', 2500, 'GHS', '["PROVIDER_MISMATCH"]')$q$,
  $q$SELECT pg_temp.b4_status('b4t-o-open', 'review')$q$, $q$SELECT pg_temp.b4_exc('b4t-u-e', 'b4t-o-open', 'b4t-u-a', 'identity_mismatch')$q$,
  'SET CONSTRAINTS ALL IMMEDIATE']);
SELECT pg_temp.b4_case('U04 receipt recorded but obligation left open', 'PF008~was not applied to its obligation', ARRAY[
  $q$SELECT pg_temp.b4_att('b4t-u-a', 'b4t-o-open')$q$,
  $q$SELECT pg_temp.b4_observe('b4t-u-a', 'needs_review', 'successful', 2000, 'GHS', '["UNDERPAYMENT"]')$q$,
  $q$SELECT pg_temp.b4_receipt('b4t-u-r', 'b4t-u-a')$q$, 'SET CONSTRAINTS ALL IMMEDIATE']);
SELECT pg_temp.b4_case('U05 review without a financial exception', 'PF008~has no financial exception', ARRAY[
  $q$SELECT pg_temp.b4_att('b4t-u-a', 'b4t-o-open')$q$,
  $q$SELECT pg_temp.b4_observe('b4t-u-a', 'needs_review', 'successful', 2000, 'GHS', '["UNDERPAYMENT"]')$q$,
  $q$SELECT pg_temp.b4_receipt('b4t-u-r', 'b4t-u-a')$q$, $q$SELECT pg_temp.b4_status('b4t-o-open', 'review')$q$,
  'SET CONSTRAINTS ALL IMMEDIATE']);
SELECT pg_temp.b4_case('U06 underpayment: receipt + review + blocking exception', 'OK', ARRAY[
  $q$SELECT pg_temp.b4_att('b4t-u-a', 'b4t-o-open')$q$,
  $q$SELECT pg_temp.b4_observe('b4t-u-a', 'needs_review', 'successful', 2000, 'GHS', '["UNDERPAYMENT"]')$q$,
  $q$SELECT pg_temp.b4_receipt('b4t-u-r', 'b4t-u-a')$q$, $q$SELECT pg_temp.b4_status('b4t-o-open', 'review')$q$,
  $q$SELECT pg_temp.b4_exc('b4t-u-e', 'b4t-o-open', 'b4t-u-a', 'amount_mismatch', 'b4t-u-r')$q$, 'SET CONSTRAINTS ALL IMMEDIATE']);
SELECT pg_temp.b4_case('U07 happy path: succeeded + exact receipt + settled', 'OK', ARRAY[
  $q$SELECT pg_temp.b4_pay('b4t-o-open', 'b4t-u-a', 'b4t-u-r')$q$, 'SET CONSTRAINTS ALL IMMEDIATE']);
SELECT pg_temp.b4_case('U08 succeeded + receipt but obligation still open', 'PF008~was not applied to its obligation', ARRAY[
  $q$SELECT pg_temp.b4_att('b4t-u-a', 'b4t-o-open')$q$, $q$SELECT pg_temp.b4_observe('b4t-u-a', 'succeeded', 'successful')$q$,
  $q$SELECT pg_temp.b4_receipt('b4t-u-r', 'b4t-u-a')$q$, 'SET CONSTRAINTS ALL IMMEDIATE']);
SELECT pg_temp.b4_case('U09 duplicate charge after settlement: receipt + non-blocking exception', 'OK', ARRAY[
  $q$SELECT pg_temp.b4_att('b4t-u-a1', 'b4t-o-open')$q$, $q$SELECT pg_temp.b4_observe('b4t-u-a1', 'failed', 'failed')$q$,
  $q$SELECT pg_temp.b4_pay('b4t-o-open', 'b4t-u-a2', 'b4t-u-r2')$q$,
  $q$SELECT pg_temp.b4_observe('b4t-u-a1', 'needs_review', 'successful')$q$, $q$SELECT pg_temp.b4_receipt('b4t-u-r1', 'b4t-u-a1')$q$,
  $q$SELECT pg_temp.b4_exc('b4t-u-e', 'b4t-o-open', 'b4t-u-a1', 'duplicate_charge', 'b4t-u-r1')$q$, 'SET CONSTRAINTS ALL IMMEDIATE']);
SELECT pg_temp.b4_case('U10 duplicate charge without an exception', 'PF008~has no financial exception', ARRAY[
  $q$SELECT pg_temp.b4_att('b4t-u-a1', 'b4t-o-open')$q$, $q$SELECT pg_temp.b4_observe('b4t-u-a1', 'failed', 'failed')$q$,
  $q$SELECT pg_temp.b4_pay('b4t-o-open', 'b4t-u-a2', 'b4t-u-r2')$q$,
  $q$SELECT pg_temp.b4_observe('b4t-u-a1', 'needs_review', 'successful')$q$, $q$SELECT pg_temp.b4_receipt('b4t-u-r1', 'b4t-u-a1')$q$,
  'SET CONSTRAINTS ALL IMMEDIATE']);
SELECT pg_temp.b4_case('U11 late success after cancel: cancelled -> review + receipt + exception', 'OK', ARRAY[
  $q$SELECT pg_temp.b4_att('b4t-u-a', 'b4t-o-open')$q$, $q$SELECT pg_temp.b4_observe('b4t-u-a', 'failed', 'failed')$q$,
  $q$SELECT pg_temp.b4_status('b4t-o-open', 'cancelled')$q$,
  $q$SELECT pg_temp.b4_observe('b4t-u-a', 'needs_review', 'successful')$q$, $q$SELECT pg_temp.b4_receipt('b4t-u-r', 'b4t-u-a')$q$,
  $q$SELECT pg_temp.b4_status('b4t-o-open', 'review')$q$,
  $q$SELECT pg_temp.b4_exc('b4t-u-e', 'b4t-o-open', 'b4t-u-a', 'success_after_cancel', 'b4t-u-r')$q$, 'SET CONSTRAINTS ALL IMMEDIATE']);
SELECT pg_temp.b4_case('U12 late success after cancel left cancelled', 'PF008~left obligation', ARRAY[
  $q$SELECT pg_temp.b4_att('b4t-u-a', 'b4t-o-open')$q$, $q$SELECT pg_temp.b4_observe('b4t-u-a', 'failed', 'failed')$q$,
  $q$SELECT pg_temp.b4_status('b4t-o-open', 'cancelled')$q$,
  $q$SELECT pg_temp.b4_observe('b4t-u-a', 'needs_review', 'successful')$q$, $q$SELECT pg_temp.b4_receipt('b4t-u-r', 'b4t-u-a')$q$,
  $q$SELECT pg_temp.b4_exc('b4t-u-e', 'b4t-o-open', 'b4t-u-a', 'success_after_cancel', 'b4t-u-r')$q$, 'SET CONSTRAINTS ALL IMMEDIATE']);
SELECT pg_temp.b4_case('U13 late success after a failed attempt: open -> review', 'OK', ARRAY[
  $q$SELECT pg_temp.b4_sealed('b4t-u-o', ARRAY['b4t-l1'], ARRAY['b4t-a1'])$q$,
  $q$SELECT pg_temp.b4_att('b4t-u-a', 'b4t-u-o')$q$, $q$SELECT pg_temp.b4_observe('b4t-u-a', 'failed', 'failed')$q$,
  $q$SELECT pg_temp.b4_observe('b4t-u-a', 'needs_review', 'successful')$q$, $q$SELECT pg_temp.b4_receipt('b4t-u-r', 'b4t-u-a')$q$,
  $q$SELECT pg_temp.b4_status('b4t-u-o', 'review')$q$,
  $q$SELECT pg_temp.b4_exc('b4t-u-e', 'b4t-u-o', 'b4t-u-a', 'success_after_failed', 'b4t-u-r')$q$, 'SET CONSTRAINTS ALL IMMEDIATE']);
SELECT pg_temp.b4_case('U14 needs_review exception must block while unsettled', 'PF008~has no financial exception', ARRAY[
  $q$SELECT pg_temp.b4_att('b4t-u-a', 'b4t-o-open')$q$,
  $q$SELECT pg_temp.b4_observe('b4t-u-a', 'needs_review', 'successful', 2500, 'GHS', '["PROVIDER_MISMATCH"]')$q$,
  $q$SELECT pg_temp.b4_status('b4t-o-open', 'review')$q$, $q$SELECT pg_temp.b4_exc('b4t-u-e', 'b4t-o-open', 'b4t-u-a', 'duplicate_charge')$q$,
  'SET CONSTRAINTS ALL IMMEDIATE']);

-- ---------- R: receipts ----------
SELECT pg_temp.b4_case('R01 receipt amount differs from the observation', 'PF007@payment_receipts_guard', ARRAY[
  $q$SELECT pg_temp.b4_att('b4t-r-a', 'b4t-o-open')$q$, $q$SELECT pg_temp.b4_observe('b4t-r-a', 'succeeded', 'successful')$q$,
  $q$INSERT INTO public.payment_receipts (id, attempt_id, obligation_id, provider, mode, merchant_context, provider_reference, amount_minor, currency, verified_at) VALUES ('b4t-r-r', 'b4t-r-a', 'b4t-o-open', 'paystack', 'sandbox', 'sandbox:b4t', 'ref-b4t-r-a', 2400, 'GHS', now())$q$]);
SELECT pg_temp.b4_case('R02 receipt reference differs from the observation', 'PF007@payment_receipts_guard', ARRAY[
  $q$SELECT pg_temp.b4_att('b4t-r-a', 'b4t-o-open')$q$, $q$SELECT pg_temp.b4_observe('b4t-r-a', 'succeeded', 'successful')$q$,
  $q$INSERT INTO public.payment_receipts (id, attempt_id, obligation_id, provider, mode, merchant_context, provider_reference, amount_minor, currency, verified_at) VALUES ('b4t-r-r', 'b4t-r-a', 'b4t-o-open', 'paystack', 'sandbox', 'sandbox:b4t', 'ref-other', 2500, 'GHS', now())$q$]);
SELECT pg_temp.b4_case('R03 receipt currency differs from the observation', 'PF007@payment_receipts_guard', ARRAY[
  $q$SELECT pg_temp.b4_att('b4t-r-a', 'b4t-o-open')$q$, $q$SELECT pg_temp.b4_observe('b4t-r-a', 'succeeded', 'successful')$q$,
  $q$INSERT INTO public.payment_receipts (id, attempt_id, obligation_id, provider, mode, merchant_context, provider_reference, amount_minor, currency, verified_at) VALUES ('b4t-r-r', 'b4t-r-a', 'b4t-o-open', 'paystack', 'sandbox', 'sandbox:b4t', 'ref-b4t-r-a', 2500, 'USD', now())$q$]);
SELECT pg_temp.b4_case('R04 receipt for an unobserved attempt', 'PF007@payment_receipts_guard', ARRAY[
  $q$SELECT pg_temp.b4_att('b4t-r-a', 'b4t-o-open')$q$,
  $q$INSERT INTO public.payment_receipts (id, attempt_id, obligation_id, provider, mode, merchant_context, provider_reference, amount_minor, currency, verified_at) VALUES ('b4t-r-r', 'b4t-r-a', 'b4t-o-open', 'paystack', 'sandbox', 'sandbox:b4t', 'ref-x', 2500, 'GHS', now())$q$]);
SELECT pg_temp.b4_case('R05 receipt for a non-successful observation', 'PF007@payment_receipts_guard', ARRAY[
  $q$SELECT pg_temp.b4_att('b4t-r-a', 'b4t-o-open')$q$, $q$SELECT pg_temp.b4_observe('b4t-r-a', 'needs_review', 'reversed')$q$,
  $q$SELECT pg_temp.b4_receipt('b4t-r-r', 'b4t-r-a')$q$]);
DO $nr$
DECLARE
  code text;
BEGIN
  FOREACH code IN ARRAY ARRAY['PROVIDER_MISMATCH', 'REFERENCE_MISMATCH', 'PROVIDER_REFERENCE_MISMATCH', 'EXPECTATION_CONFLICT',
                              'AMOUNT_NOT_INTEGER', 'VERIFICATION_UNAVAILABLE'] LOOP
    PERFORM pg_temp.b4_case('R06 receipt refused for ' || code, 'PF007~verification failure that refuses a receipt', ARRAY[
      $q$SELECT pg_temp.b4_att('b4t-r-a', 'b4t-o-open')$q$,
      format($q$SELECT pg_temp.b4_observe('b4t-r-a', 'needs_review', 'successful', 2500, 'GHS', %L::jsonb)$q$, jsonb_build_array(code, 'UNDERPAYMENT')::text),
      $q$SELECT pg_temp.b4_receipt('b4t-r-r', 'b4t-r-a')$q$]);
  END LOOP;
  FOREACH code IN ARRAY ARRAY['UNDERPAYMENT', 'OVERPAYMENT', 'CURRENCY_MISMATCH'] LOOP
    PERFORM pg_temp.b4_case('R07 receipt kept for ' || code, 'OK', ARRAY[
      $q$SELECT pg_temp.b4_att('b4t-r-a', 'b4t-o-open')$q$,
      format($q$SELECT pg_temp.b4_observe('b4t-r-a', 'needs_review', 'successful', %s, %L, %L::jsonb)$q$,
        CASE code WHEN 'UNDERPAYMENT' THEN 2000 WHEN 'OVERPAYMENT' THEN 3000 ELSE 2500 END,
        CASE code WHEN 'CURRENCY_MISMATCH' THEN 'USD' ELSE 'GHS' END, jsonb_build_array(code)::text),
      $q$SELECT pg_temp.b4_receipt('b4t-r-r', 'b4t-r-a')$q$, $q$SELECT pg_temp.b4_status('b4t-o-open', 'review')$q$,
      CASE code WHEN 'CURRENCY_MISMATCH'
        THEN $q$SELECT pg_temp.b4_exc('b4t-r-e', 'b4t-o-open', 'b4t-r-a', 'currency_mismatch', 'b4t-r-r')$q$
        ELSE $q$SELECT pg_temp.b4_exc('b4t-r-e', 'b4t-o-open', 'b4t-r-a', 'amount_mismatch', 'b4t-r-r')$q$ END,
      'SET CONSTRAINTS ALL IMMEDIATE']);
  END LOOP;
END
$nr$;
SELECT pg_temp.b4_case('R08 second receipt for one attempt', '23505:payment_receipts_attempt_unique', ARRAY[
  $q$SELECT pg_temp.b4_pay('b4t-o-open', 'b4t-r-a', 'b4t-r-r')$q$, $q$SELECT pg_temp.b4_receipt('b4t-r-r2', 'b4t-r-a')$q$]);
SELECT pg_temp.b4_case('R09 receipt update refused', 'P0001~append-only', ARRAY[
  $q$SELECT pg_temp.b4_pay('b4t-o-open', 'b4t-r-a', 'b4t-r-r')$q$, $q$UPDATE public.payment_receipts SET verified_at = now() WHERE id = 'b4t-r-r'$q$]);
SELECT pg_temp.b4_case('R10 receipt delete refused', 'P0001~payment_receipts rows cannot be deleted', ARRAY[
  $q$SELECT pg_temp.b4_pay('b4t-o-open', 'b4t-r-a', 'b4t-r-r')$q$, $q$DELETE FROM public.payment_receipts WHERE id = 'b4t-r-r'$q$]);
SELECT pg_temp.b4_case('R11 A2: raw receipt insert without its outcome refused by the receipt check', 'PF008@payment_receipts_outcome_check', ARRAY[
  $q$SELECT pg_temp.b4_att('b4t-r-a', 'b4t-o-open')$q$,
  $q$SELECT pg_temp.b4_observe('b4t-r-a', 'needs_review', 'successful', 2000, 'GHS', '["UNDERPAYMENT"]')$q$,
  $q$SELECT pg_temp.b4_receipt('b4t-r-r', 'b4t-r-a')$q$, $q$SELECT pg_temp.b4_status('b4t-o-open', 'review')$q$,
  $q$SELECT pg_temp.b4_exc('b4t-r-e', 'b4t-o-open', 'b4t-r-a', 'amount_mismatch', 'b4t-r-r')$q$, 'SET CONSTRAINTS ALL IMMEDIATE',
  $q$SET LOCAL filumire.payment_test_cleanup = 'on'$q$,
  $q$DELETE FROM public.payment_exceptions WHERE id = 'b4t-r-e'$q$, $q$DELETE FROM public.payment_receipts WHERE id = 'b4t-r-r'$q$,
  $q$SET LOCAL filumire.payment_test_cleanup = 'off'$q$,
  $q$SELECT pg_temp.b4_receipt('b4t-r-r2', 'b4t-r-a')$q$]);
SELECT pg_temp.b4_case('R12 duplicate provider reference across attempts', '23505:payment_attempts_provider_reference_unique', ARRAY[
  $q$SELECT pg_temp.b4_att('b4t-r-a1', 'b4t-o-open')$q$, $q$SELECT pg_temp.b4_att('b4t-r-a2', 'b4t-o-two')$q$,
  $q$SELECT pg_temp.b4_observe('b4t-r-a1', 'needs_review', 'successful', p_ref => 'dup-ref')$q$,
  $q$SELECT pg_temp.b4_observe('b4t-r-a2', 'needs_review', 'successful', p_ref => 'dup-ref')$q$]);
SELECT pg_temp.b4_case('R13 receipt mode differs from its attempt', '23503:payment_receipts_attempt_fk', ARRAY[
  $q$SELECT pg_temp.b4_att('b4t-r-a', 'b4t-o-open')$q$, $q$SELECT pg_temp.b4_observe('b4t-r-a', 'succeeded', 'successful')$q$,
  $q$INSERT INTO public.payment_receipts (id, attempt_id, obligation_id, provider, mode, merchant_context, provider_reference, amount_minor, currency, verified_at) VALUES ('b4t-r-r', 'b4t-r-a', 'b4t-o-open', 'paystack', 'live', 'sandbox:b4t', 'ref-b4t-r-a', 2500, 'GHS', now())$q$]);
SELECT pg_temp.b4_case('R14 receipt bound to another obligation', '23503:payment_receipts_attempt_fk', ARRAY[
  $q$SELECT pg_temp.b4_att('b4t-r-a', 'b4t-o-open')$q$, $q$SELECT pg_temp.b4_observe('b4t-r-a', 'succeeded', 'successful')$q$,
  $q$INSERT INTO public.payment_receipts (id, attempt_id, obligation_id, provider, mode, merchant_context, provider_reference, amount_minor, currency, verified_at) VALUES ('b4t-r-r', 'b4t-r-a', 'b4t-o-two', 'paystack', 'sandbox', 'sandbox:b4t', 'ref-b4t-r-a', 2500, 'GHS', now())$q$]);
-- payment_receipts_provider_charge_unique is a backstop only: a receipt's reference must equal its attempt's (guard)
-- and 0018 already makes (provider, provider_reference) unique across attempts (R12), so no second receipt can reach it.

-- ---------- E: exceptions ----------
SELECT pg_temp.b4_case('E01 duplicate_charge must not block', '23514:payment_exceptions_blocking_check', ARRAY[
  $q$INSERT INTO public.payment_exceptions (id, obligation_id, kind, blocks_fulfilment, dedupe_key, status, opened_at, opened_by) VALUES ('b4t-e', 'b4t-o-open', 'duplicate_charge', true, 'k', 'open', now(), 'system')$q$]);
SELECT pg_temp.b4_case('E02 other kinds must block', '23514:payment_exceptions_blocking_check', ARRAY[
  $q$INSERT INTO public.payment_exceptions (id, obligation_id, kind, blocks_fulfilment, dedupe_key, status, opened_at, opened_by) VALUES ('b4t-e', 'b4t-o-open', 'amount_mismatch', false, 'k', 'open', now(), 'system')$q$]);
SELECT pg_temp.b4_case('E03 attempt of another obligation', 'PF009@payment_exceptions_guard', ARRAY[
  $q$SELECT pg_temp.b4_att('b4t-e-a', 'b4t-o-two')$q$, $q$SELECT pg_temp.b4_exc('b4t-e', 'b4t-o-open', 'b4t-e-a', 'attempt_needs_review')$q$]);
SELECT pg_temp.b4_case('E04 receipt of another obligation', 'PF009@payment_exceptions_guard', ARRAY[
  $q$SELECT pg_temp.b4_pay('b4t-o-two', 'b4t-e-a', 'b4t-e-r')$q$, $q$SELECT pg_temp.b4_exc('b4t-e', 'b4t-o-open', NULL, 'reversal_reported', 'b4t-e-r')$q$]);
SELECT pg_temp.b4_case('E05 exception created resolved', 'P0001~must be open', ARRAY[
  $q$INSERT INTO public.payment_exceptions (id, obligation_id, kind, blocks_fulfilment, dedupe_key, status, opened_at, opened_by, resolution_code, resolved_at, resolved_by_principal_id) VALUES ('b4t-e', 'b4t-o-open', 'amount_mismatch', true, 'k', 'resolved', now(), 'system', 'x', now(), 'b4t-p1')$q$]);
SELECT pg_temp.b4_case('E06 exception update refused', 'P0001~cannot be changed in step 3', ARRAY[
  $q$SELECT pg_temp.b4_exc('b4t-e', 'b4t-o-open', NULL, 'provider_record_missing')$q$, $q$UPDATE public.payment_exceptions SET dedupe_key = 'z' WHERE id = 'b4t-e'$q$]);
SELECT pg_temp.b4_case('E07 exception delete refused', 'P0001~payment_exceptions rows cannot be deleted', ARRAY[
  $q$SELECT pg_temp.b4_exc('b4t-e', 'b4t-o-open', NULL, 'provider_record_missing')$q$, $q$DELETE FROM public.payment_exceptions WHERE id = 'b4t-e'$q$]);
SELECT pg_temp.b4_case('E08 dedupe key unique per obligation and kind', '23505:payment_exceptions_dedupe_unique', ARRAY[
  $q$SELECT pg_temp.b4_att('b4t-e-a', 'b4t-o-open')$q$,
  $q$SELECT pg_temp.b4_exc('b4t-e1', 'b4t-o-open', 'b4t-e-a', 'attempt_needs_review')$q$, $q$SELECT pg_temp.b4_exc('b4t-e2', 'b4t-o-open', 'b4t-e-a', 'attempt_needs_review')$q$]);
SELECT pg_temp.b4_case('E09 unknown exception kind', '23514:payment_exceptions_kind_check', ARRAY[$q$SELECT pg_temp.b4_exc('b4t-e', 'b4t-o-open', NULL, 'made_up_kind')$q$]);
SELECT pg_temp.b4_case('E10 opened_by must be system', '23514:payment_exceptions_opened_by_check', ARRAY[
  $q$INSERT INTO public.payment_exceptions (id, obligation_id, kind, blocks_fulfilment, dedupe_key, status, opened_at, opened_by) VALUES ('b4t-e', 'b4t-o-open', 'amount_mismatch', true, 'k', 'open', now(), 'payer')$q$]);
SELECT pg_temp.b4_case('E11 obligation-level exception accepted', 'OK', ARRAY[$q$SELECT pg_temp.b4_exc('b4t-e', 'b4t-o-open', NULL, 'provider_record_missing')$q$]);

-- ---------- V: event guards (B1 obligation events, B2 attempt events) ----------
SELECT pg_temp.b4_case('V01 obligation event must start at sequence 1', 'P0001~sequence must be 1 (got 2)', ARRAY[
  $q$INSERT INTO public.payment_obligation_events (id, obligation_id, sequence, event_type, from_status, to_status, actor_type, detail) VALUES ('b4t-v', 'b4t-o-open', 2, 'created', NULL, 'open', 'system', '{}')$q$]);
SELECT pg_temp.b4_case('V02 obligation event sequence overflow attempt', 'P0001~sequence must be 1', ARRAY[
  $q$INSERT INTO public.payment_obligation_events (id, obligation_id, sequence, event_type, from_status, to_status, actor_type, detail) VALUES ('b4t-v', 'b4t-o-open', 2147483647, 'created', NULL, 'open', 'system', '{}')$q$]);
SELECT pg_temp.b4_case('V03 "created" event NULL -> open accepted', 'OK', ARRAY[
  $q$INSERT INTO public.payment_obligation_events (id, obligation_id, sequence, event_type, from_status, to_status, actor_type, detail) VALUES ('b4t-v', 'b4t-o-open', 1, 'created', NULL, 'open', 'system', '{}')$q$]);
SELECT pg_temp.b4_case('V04 forged settled event before settlement', 'P0001~change into the current status (open)', ARRAY[
  $q$INSERT INTO public.payment_obligation_events (id, obligation_id, sequence, event_type, from_status, to_status, actor_type, detail) VALUES ('b4t-v', 'b4t-o-open', 1, 'settled', 'open', 'settled', 'system', '{}')$q$]);
SELECT pg_temp.b4_case('V05 status event open -> open refused', 'P0001~change into the current status', ARRAY[
  $q$INSERT INTO public.payment_obligation_events (id, obligation_id, sequence, event_type, from_status, to_status, actor_type, detail) VALUES ('b4t-v', 'b4t-o-open', 1, 'noop', 'open', 'open', 'system', '{}')$q$]);
SELECT pg_temp.b4_case('V06 from_status without to_status refused', 'P0001~without to_status cannot have from_status', ARRAY[
  $q$INSERT INTO public.payment_obligation_events (id, obligation_id, sequence, event_type, from_status, to_status, actor_type, detail) VALUES ('b4t-v', 'b4t-o-open', 1, 'exception_opened', 'open', NULL, 'system', '{}')$q$]);
SELECT pg_temp.b4_case('V07 obligation event update refused', 'P0001~payment_obligation_events is append-only', ARRAY[
  $q$INSERT INTO public.payment_obligation_events (id, obligation_id, sequence, event_type, from_status, to_status, actor_type, detail) VALUES ('b4t-v', 'b4t-o-open', 1, 'created', NULL, 'open', 'system', '{}')$q$,
  $q$UPDATE public.payment_obligation_events SET detail = '{"x":1}' WHERE id = 'b4t-v'$q$]);
SELECT pg_temp.b4_case('V08 obligation event delete refused', 'P0001~payment_obligation_events is append-only', ARRAY[
  $q$INSERT INTO public.payment_obligation_events (id, obligation_id, sequence, event_type, from_status, to_status, actor_type, detail) VALUES ('b4t-v', 'b4t-o-open', 1, 'created', NULL, 'open', 'system', '{}')$q$,
  $q$DELETE FROM public.payment_obligation_events WHERE id = 'b4t-v'$q$]);
SELECT pg_temp.b4_case('V09 second settlement event refused by the one-settlement index', '23505:payment_obligation_events_one_settlement', ARRAY[
  $q$SELECT pg_temp.b4_pay('b4t-o-open', 'b4t-v-a', 'b4t-v-r')$q$,
  $q$INSERT INTO public.payment_obligation_events (id, obligation_id, sequence, event_type, from_status, to_status, actor_type, detail) VALUES ('b4t-v1', 'b4t-o-open', 1, 'settled', 'open', 'settled', 'system', '{}')$q$,
  $q$INSERT INTO public.payment_obligation_events (id, obligation_id, sequence, event_type, from_status, to_status, actor_type, detail) VALUES ('b4t-v2', 'b4t-o-open', 2, 'settled', 'open', 'settled', 'system', '{}')$q$]);
SELECT pg_temp.b4_case('V10 payer actor needs a principal', '23514:payment_obligation_events_actor_check', ARRAY[
  $q$INSERT INTO public.payment_obligation_events (id, obligation_id, sequence, event_type, from_status, to_status, actor_type, detail) VALUES ('b4t-v', 'b4t-o-open', 1, 'created', NULL, 'open', 'payer', '{}')$q$]);
SELECT pg_temp.b4_case('V11 attempt event 1 "created" accepted', 'OK', ARRAY[
  $q$SELECT pg_temp.b4_att('b4t-v-a', 'b4t-o-open')$q$,
  $q$INSERT INTO public.payment_attempt_events (id, attempt_id, sequence, event_type, from_status, to_status, detail) VALUES ('b4t-v', 'b4t-v-a', 1, 'created', NULL, 'created', '{}')$q$]);
SELECT pg_temp.b4_case('V12 attempt event sequence gap refused', 'P0001~attempt event sequence must be 1 (got 2)', ARRAY[
  $q$SELECT pg_temp.b4_att('b4t-v-a', 'b4t-o-open')$q$,
  $q$INSERT INTO public.payment_attempt_events (id, attempt_id, sequence, event_type, from_status, to_status, detail) VALUES ('b4t-v', 'b4t-v-a', 2, 'created', NULL, 'created', '{}')$q$]);
SELECT pg_temp.b4_case('V13 forged attempt success event refused', 'P0001~current status (created)', ARRAY[
  $q$SELECT pg_temp.b4_att('b4t-v-a', 'b4t-o-open')$q$,
  $q$INSERT INTO public.payment_attempt_events (id, attempt_id, sequence, event_type, from_status, to_status, detail) VALUES ('b4t-v', 'b4t-v-a', 1, 'succeeded', 'created', 'succeeded', '{}')$q$]);
SELECT pg_temp.b4_case('V14 attempt event update refused (0018 guard)', 'P0001~payment_attempt_events is append-only', ARRAY[
  $q$SELECT pg_temp.b4_att('b4t-v-a', 'b4t-o-open')$q$,
  $q$INSERT INTO public.payment_attempt_events (id, attempt_id, sequence, event_type, from_status, to_status, detail) VALUES ('b4t-v', 'b4t-v-a', 1, 'created', NULL, 'created', '{}')$q$,
  $q$UPDATE public.payment_attempt_events SET detail = '{"x":1}' WHERE id = 'b4t-v'$q$]);
SELECT pg_temp.b4_case('V15 attempt event delete refused (0018 guard)', 'P0001~payment_attempt_events is append-only', ARRAY[
  $q$SELECT pg_temp.b4_att('b4t-v-a', 'b4t-o-open')$q$,
  $q$INSERT INTO public.payment_attempt_events (id, attempt_id, sequence, event_type, from_status, to_status, detail) VALUES ('b4t-v', 'b4t-v-a', 1, 'created', NULL, 'created', '{}')$q$,
  $q$DELETE FROM public.payment_attempt_events WHERE id = 'b4t-v'$q$]);
SELECT pg_temp.b4_case('V16 second success event refused by the 0018 index', '23505:payment_attempt_events_one_success_per_attempt', ARRAY[
  $q$SELECT pg_temp.b4_pay('b4t-o-open', 'b4t-v-a', 'b4t-v-r')$q$,
  $q$INSERT INTO public.payment_attempt_events (id, attempt_id, sequence, event_type, from_status, to_status, detail) VALUES ('b4t-v1', 'b4t-v-a', 1, 'succeeded', 'created', 'succeeded', '{}')$q$,
  $q$INSERT INTO public.payment_attempt_events (id, attempt_id, sequence, event_type, from_status, to_status, detail) VALUES ('b4t-v2', 'b4t-v-a', 2, 'succeeded', 'succeeded', 'succeeded', '{}')$q$]);

-- ---------- F: settlement FK and the flagged clean-up order (Stage A G.9) ----------
SELECT pg_temp.b4_case('F01 settling receipt cannot be deleted while the FK is immediate', '23503:payment_obligations_settlement_fk', ARRAY[
  $q$SELECT pg_temp.b4_pay('b4t-o-open', 'b4t-f-a', 'b4t-f-r')$q$, 'SET CONSTRAINTS ALL IMMEDIATE',
  $q$SET LOCAL filumire.payment_test_cleanup = 'on'$q$, $q$DELETE FROM public.payment_receipts WHERE id = 'b4t-f-r'$q$]);
SELECT pg_temp.b4_case('F02 G.9 clean-up order with the settlement FK deferred', 'OK', ARRAY[
  $q$INSERT INTO public.payment_obligation_events (id, obligation_id, sequence, event_type, from_status, to_status, actor_type, detail) VALUES ('b4t-f-v1', 'b4t-o-open', 1, 'created', NULL, 'open', 'system', '{}')$q$,
  $q$SELECT pg_temp.b4_att('b4t-f-a', 'b4t-o-open')$q$,
  $q$INSERT INTO public.payment_attempt_events (id, attempt_id, sequence, event_type, from_status, to_status, detail) VALUES ('b4t-f-e1', 'b4t-f-a', 1, 'created', NULL, 'created', '{}')$q$,
  $q$SELECT pg_temp.b4_observe('b4t-f-a', 'succeeded', 'successful')$q$,
  $q$INSERT INTO public.payment_attempt_events (id, attempt_id, sequence, event_type, from_status, to_status, detail) VALUES ('b4t-f-e2', 'b4t-f-a', 2, 'succeeded', 'created', 'succeeded', '{}')$q$,
  $q$SELECT pg_temp.b4_receipt('b4t-f-r', 'b4t-f-a')$q$, $q$SELECT pg_temp.b4_settle('b4t-o-open', 'b4t-f-r')$q$,
  $q$INSERT INTO public.payment_obligation_events (id, obligation_id, sequence, event_type, from_status, to_status, actor_type, detail) VALUES ('b4t-f-v2', 'b4t-o-open', 2, 'settled', 'open', 'settled', 'system', '{}')$q$,
  $q$SELECT pg_temp.b4_exc('b4t-f-x', 'b4t-o-open', NULL, 'provider_record_missing')$q$,
  'SET CONSTRAINTS ALL IMMEDIATE',
  $q$SET LOCAL filumire.payment_test_cleanup = 'on'$q$,
  'SET CONSTRAINTS payment_obligations_settlement_fk DEFERRED',
  $q$DELETE FROM public.payment_obligation_events WHERE obligation_id = 'b4t-o-open'$q$,
  $q$DELETE FROM public.payment_exceptions WHERE obligation_id = 'b4t-o-open'$q$,
  $q$DELETE FROM public.payment_receipts WHERE obligation_id = 'b4t-o-open'$q$,
  $q$DELETE FROM public.payment_attempt_events WHERE attempt_id = 'b4t-f-a'$q$,
  $q$DELETE FROM public.payment_attempts WHERE obligation_id = 'b4t-o-open'$q$,
  $q$DELETE FROM public.payment_obligation_beneficiaries WHERE obligation_id = 'b4t-o-open'$q$,
  $q$DELETE FROM public.payment_obligations WHERE id = 'b4t-o-open'$q$,
  'SET CONSTRAINTS ALL IMMEDIATE',
  $q$DO $c$ BEGIN IF EXISTS (SELECT 1 FROM public.payment_obligations WHERE id = 'b4t-o-open') THEN RAISE EXCEPTION 'not deleted' USING ERRCODE = 'P0B42'; END IF; END $c$$q$]);
SELECT pg_temp.b4_case('F03 principal of an obligation cannot be deleted (RESTRICT)', '23503:payment_obligations_payer_fk', ARRAY[
  $q$SELECT pg_temp.b4_obl('b4t-f-o', ARRAY['b4t-l1'], p_payer => 'b4t-p2')$q$,
  $q$DELETE FROM public.principal_learner_access WHERE principal_id = 'b4t-p2'$q$, $q$DELETE FROM public.principals WHERE id = 'b4t-p2'$q$]);
-- The beneficiary learner FK cannot be isolated: a beneficiary always has an access row for the same learner, whose
-- FK fires first. This case shows only that such a learner cannot be deleted.
SELECT pg_temp.b4_case('F04 learner with access + beneficiary rows cannot be deleted (RESTRICT)', '23503', ARRAY[
  $q$DELETE FROM public.learners WHERE id = 'b4t-l2'$q$]);

-- ---------- X: end-to-end happy path with full event chains ----------
SELECT pg_temp.b4_case('X01 create -> seal -> attempt -> success -> receipt -> settled, events 1..n', 'OK', ARRAY[
  $q$SELECT pg_temp.b4_sealed('b4t-x-o', ARRAY['b4t-l1', 'b4t-l2'], ARRAY['b4t-a1', 'b4t-a2'])$q$,
  $q$INSERT INTO public.payment_obligation_events (id, obligation_id, sequence, event_type, from_status, to_status, actor_type, actor_principal_id, detail) VALUES ('b4t-x-v1', 'b4t-x-o', 1, 'created', NULL, 'open', 'payer', 'b4t-p1', '{}')$q$,
  $q$SELECT pg_temp.b4_att('b4t-x-a', 'b4t-x-o')$q$,
  $q$INSERT INTO public.payment_attempt_events (id, attempt_id, sequence, event_type, from_status, to_status, detail) VALUES ('b4t-x-e1', 'b4t-x-a', 1, 'created', NULL, 'created', '{}')$q$,
  $q$UPDATE public.payment_attempts SET status = 'pending', provider_reference = 'ref-b4t-x-a', updated_at = now() WHERE id = 'b4t-x-a'$q$,
  $q$INSERT INTO public.payment_attempt_events (id, attempt_id, sequence, event_type, from_status, to_status, detail) VALUES ('b4t-x-e2', 'b4t-x-a', 2, 'initiated', 'created', 'pending', '{}')$q$,
  $q$SELECT pg_temp.b4_observe('b4t-x-a', 'succeeded', 'successful')$q$,
  $q$INSERT INTO public.payment_attempt_events (id, attempt_id, sequence, event_type, from_status, to_status, detail) VALUES ('b4t-x-e3', 'b4t-x-a', 3, 'succeeded', 'pending', 'succeeded', '{}')$q$,
  $q$SELECT pg_temp.b4_receipt('b4t-x-r', 'b4t-x-a')$q$, $q$SELECT pg_temp.b4_settle('b4t-x-o', 'b4t-x-r')$q$,
  $q$INSERT INTO public.payment_obligation_events (id, obligation_id, sequence, event_type, from_status, to_status, actor_type, detail) VALUES ('b4t-x-v2', 'b4t-x-o', 2, 'settled', 'open', 'settled', 'system', '{}')$q$,
  'SET CONSTRAINTS ALL IMMEDIATE',
  $q$DO $c$ BEGIN IF (SELECT string_agg(sequence::text, ',' ORDER BY sequence) FROM public.payment_attempt_events WHERE attempt_id = 'b4t-x-a') <> '1,2,3'
       OR (SELECT string_agg(sequence::text, ',' ORDER BY sequence) FROM public.payment_obligation_events WHERE obligation_id = 'b4t-x-o') <> '1,2'
       OR (SELECT status FROM public.payment_obligations WHERE id = 'b4t-x-o') <> 'settled' THEN
       RAISE EXCEPTION 'happy path state wrong' USING ERRCODE = 'P0B43'; END IF; END $c$$q$]);

-- ---------- D: deferred mode restored after every case ----------
SELECT pg_temp.b4_case('D01 seal check still deferred after all cases', 'OK', ARRAY[$q$SELECT pg_temp.b4_obl('b4t-d', ARRAY['b4t-l1'])$q$]);
SELECT pg_temp.b4_case('D02 settlement FK still immediate after all cases', '23503:payment_obligations_settlement_fk', ARRAY[
  $q$SELECT pg_temp.b4_pay('b4t-o-open', 'b4t-d-a', 'b4t-d-r')$q$, $q$SET LOCAL filumire.payment_test_cleanup = 'on'$q$,
  $q$DELETE FROM public.payment_receipts WHERE id = 'b4t-d-r'$q$]);

-- ---------- report ----------
\pset tuples_only off
\pset format aligned
\pset footer off
SELECT n, ok, label, want, got, message FROM b4_results ORDER BY n;
DO $report$
DECLARE
  total integer;
  failed integer;
BEGIN
  SELECT count(*), count(*) FILTER (WHERE NOT ok) INTO total, failed FROM b4_results;
  IF failed > 0 THEN
    RAISE EXCEPTION 'B4 behaviour harness FAILED: % of % case(s)', failed, total;
  END IF;
  -- Only the fixtures exist inside this transaction (every case was rolled back).
  IF (SELECT count(*) FROM public.payment_obligations) <> 2 OR (SELECT count(*) FROM public.payment_obligation_beneficiaries) <> 3
     OR EXISTS (SELECT 1 FROM public.payment_attempts) OR EXISTS (SELECT 1 FROM public.payment_receipts)
     OR EXISTS (SELECT 1 FROM public.payment_exceptions) OR EXISTS (SELECT 1 FROM public.payment_obligation_events)
     OR EXISTS (SELECT 1 FROM public.payment_attempt_events) THEN
    RAISE EXCEPTION 'B4 behaviour harness: a case leaked rows';
  END IF;
  RAISE NOTICE 'B4 behaviour harness OK: % of % cases passed', total, total;
END
$report$;
ROLLBACK;
