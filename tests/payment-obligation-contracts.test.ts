/*
 * Payments Phase 2, step 3 (B1): obligation contracts and pure rules.
 * No database, no network, no stores. Must stay in step with the planned 0019
 * triggers (docs/handoff/PAYMENTS_PHASE2_STEP3_STAGE_A.md).
 */
import assert from "node:assert/strict";
import {
  canonicalJson,
  canonicalPurchaseText,
  canTransitionObligation,
  decideObligationOutcome,
  decidePostSuccessObservation,
  evaluateFulfilmentEligibility,
  evaluateGuardianV1,
  EXCEPTION_BLOCKS_FULFILMENT,
  FINANCIAL_EXCEPTION_KINDS,
  isOperatorOnlyTransition,
  money,
  OBLIGATION_STATUSES,
  PaymentError,
  receiptCandidate,
  receiptMatchesObligation,
  validateCatalogueProduct,
  type CatalogueProduct,
  type FinancialException,
  type ObligationOutcomeInput,
  type ObligationStatus,
  type PaymentObligation,
  type PaymentReceipt,
} from "../packages/payments";
import { PRODUCTION_CATALOGUE, purchaseSnapshotHash, SandboxCatalogue } from "../services/payments";

let networkCalls = 0;
globalThis.fetch = (async () => {
  networkCalls += 1;
  throw new Error("Network access is not allowed in payment tests.");
}) as typeof fetch;

const checks: string[] = [];
function check(name: string, run: () => void): void {
  try {
    run();
  } catch (error) {
    console.error(`Check failed: ${name}`);
    throw error;
  }
  checks.push(name);
}

const code = (fn: () => unknown): string => {
  try {
    fn();
  } catch (error) {
    return error instanceof PaymentError ? error.code : `other:${(error as Error).message}`;
  }
  return "no-error";
};

/* Must match the planned payment_obligations guard trigger (0019). */
const EXPECTED_TRANSITIONS: Record<ObligationStatus, ObligationStatus[]> = {
  open: ["settled", "cancelled", "expired", "review"],
  cancelled: ["review"],
  expired: ["review"],
  review: ["settled", "cancelled"],
  settled: [],
};

const FIXTURE: CatalogueProduct = {
  code: "sandbox_contract_fixture",
  version: "t1",
  label: "Sandbox contract fixture (not a FILUMIRE price)",
  amount: money(2500, "GHS"),
  mode: "sandbox",
  beneficiaryCount: 1,
  terms: { fixture: true, scope: ["test"] },
};

function obligation(overrides: Partial<PaymentObligation> = {}): PaymentObligation {
  const at = new Date("2026-10-08T10:00:00Z");
  return {
    id: "obl_contract",
    payerPrincipalId: "payer-1",
    creationKey: "creation-key-1",
    productCode: FIXTURE.code,
    productVersion: FIXTURE.version,
    productLabel: FIXTURE.label,
    productTerms: FIXTURE.terms,
    amountMinor: 2500,
    currency: "GHS",
    mode: "sandbox",
    beneficiaryCount: 1,
    snapshotHash: "0".repeat(64),
    status: "settled",
    expiresAt: new Date(at.getTime() + 86_400_000),
    settledReceiptId: "rcpt-1",
    settledAt: at,
    createdAt: at,
    updatedAt: at,
    ...overrides,
  };
}

function receipt(overrides: Partial<PaymentReceipt> = {}): PaymentReceipt {
  const at = new Date("2026-10-08T10:05:00Z");
  return {
    id: "rcpt-1",
    attemptId: "att-1",
    obligationId: "obl_contract",
    provider: "fake",
    mode: "sandbox",
    merchantContext: "fake:sandbox:test",
    providerReference: "fake_ref",
    amountMinor: 2500,
    currency: "GHS",
    verifiedAt: at,
    recordedAt: at,
    ...overrides,
  };
}

function exception(kind: FinancialException["kind"], status: "open" | "resolved" = "open"): FinancialException {
  return {
    id: `exc-${kind}`,
    obligationId: "obl_contract",
    attemptId: "att-1",
    receiptId: null,
    kind,
    blocksFulfilment: EXCEPTION_BLOCKS_FULFILMENT[kind],
    dedupeKey: "att-1",
    status,
    openedAt: new Date(),
    openedBy: "system",
    resolutionCode: null,
    resolvedAt: null,
  } as FinancialException;
}

const baseOutcome: ObligationOutcomeInput = {
  obligationStatus: "open",
  attemptFrom: "pending",
  attemptTo: "succeeded",
  eventType: "verified_succeeded",
  verificationFailures: [],
  observedStatus: "successful",
  receipt: { exact: true, currencyMatches: true },
  beneficiariesAuthorized: true,
};

check("obligationTransitionTable", () => {
  for (const from of OBLIGATION_STATUSES) {
    for (const to of OBLIGATION_STATUSES) {
      assert.equal(canTransitionObligation(from, to), EXPECTED_TRANSITIONS[from].includes(to), `${from} -> ${to}`);
    }
  }
  assert.equal(canTransitionObligation("settled", "review"), false, "settled is terminal");
  assert.equal(canTransitionObligation("cancelled", "settled"), false, "a cancelled purchase is never settled");
  assert.equal(canTransitionObligation("review", "open"), false, "no reopening");
  assert.equal(isOperatorOnlyTransition("review", "settled"), true);
  assert.equal(isOperatorOnlyTransition("review", "cancelled"), true);
  assert.equal(isOperatorOnlyTransition("open", "settled"), false);
});

check("canonicalJsonIsDeterministicAndStrict", () => {
  assert.equal(canonicalJson({ b: 1, a: [true, null, "x"], c: { z: 1, y: 2 } }), '{"a":[true,null,"x"],"b":1,"c":{"y":2,"z":1}}');
  assert.equal(canonicalJson({ a: 1, b: 2 }), canonicalJson({ b: 2, a: 1 }));
  for (const bad of [{ a: undefined }, { a: Number.NaN }, { a: Infinity }, { a: () => 1 }, { a: new Date() }, { a: new Map() }, { a: 2.5 }, { a: 2 ** 53 }, { "é": 1 }, { "1a": 1 }, { "a b": 1 }]) {
    assert.equal(code(() => canonicalJson(bad)), "INVALID_OBLIGATION", JSON.stringify(Object.keys(bad)));
  }
});

check("snapshotHashCoversEveryPurchaseField", () => {
  const fields = {
    id: "obl_1", payerPrincipalId: "payer-1", productCode: "sandbox_a", productVersion: "t1", productLabel: "L",
    productTerms: { a: 1 }, amountMinor: 2500, currency: "GHS", mode: "sandbox" as const, learnerIds: ["l2", "l1"],
  };
  const hash = purchaseSnapshotHash(fields);
  assert.match(hash, /^[0-9a-f]{64}$/);
  assert.equal(purchaseSnapshotHash({ ...fields, learnerIds: ["l1", "l2"] }), hash, "beneficiary order does not matter");
  assert.equal(purchaseSnapshotHash({ ...fields, productTerms: { a: 1 } }), hash);
  const variants = [
    { id: "obl_2" }, { payerPrincipalId: "payer-2" }, { productCode: "sandbox_b" }, { productVersion: "t2" }, { productLabel: "M" },
    { productTerms: { a: 2 } }, { amountMinor: 2501 }, { currency: "USD" }, { mode: "live" as const }, { learnerIds: ["l1"] }, { learnerIds: ["l1", "l2", "l3"] },
  ];
  for (const v of variants) assert.notEqual(purchaseSnapshotHash({ ...fields, ...v }), hash, JSON.stringify(v));
  /* Field boundaries cannot be shifted to forge the same text (B3: separators are refused in coded fields and escaped in free text). */
  assert.equal(code(() => canonicalPurchaseText({ ...fields, productCode: "sandbox_a|t1", productVersion: "x" })), "INVALID_OBLIGATION");
  assert.notEqual(
    canonicalPurchaseText({ ...fields, payerPrincipalId: 'payer-1"|"sandbox_a', productCode: "sandbox_b" }),
    canonicalPurchaseText({ ...fields, payerPrincipalId: "payer-1", productCode: "sandbox_a" }),
  );
  assert.ok(canonicalPurchaseText({ ...fields, payerPrincipalId: 'p"|"q' }).includes('"p\\"|\\"q"'), "free text is JSON-escaped");
});

check("catalogueValidationAndIsolation", () => {
  validateCatalogueProduct(FIXTURE);
  const bad: Array<Partial<CatalogueProduct>> = [
    { code: "Bad Code" }, { version: "" }, { label: "" }, { amount: { amountMinor: 0, currency: "GHS" } },
    { amount: { amountMinor: 25.5, currency: "GHS" } }, { amount: { amountMinor: 2500, currency: "USD" as "GHS" } },
    { beneficiaryCount: 0 }, { beneficiaryCount: 1.5 }, { terms: [] as unknown as CatalogueProduct["terms"] },
  ];
  for (const b of bad) assert.equal(code(() => validateCatalogueProduct({ ...FIXTURE, ...b })), "INVALID_OBLIGATION", JSON.stringify(b));
  assert.equal(code(() => new SandboxCatalogue([{ ...FIXTURE, mode: "live" }])), "SANDBOX_ONLY");
  assert.equal(code(() => new SandboxCatalogue([{ ...FIXTURE, code: "monthly_plan" }])), "SANDBOX_ONLY");
  assert.equal(code(() => new SandboxCatalogue([FIXTURE, FIXTURE])), "INVALID_OBLIGATION");
  const catalogue = new SandboxCatalogue([FIXTURE]);
  const resolved = catalogue.resolve(FIXTURE.code)!;
  (resolved.amount as { amountMinor: number }).amountMinor = 1;
  assert.equal(catalogue.resolve(FIXTURE.code)!.amount.amountMinor, 2500, "catalogue entries cannot be changed through a resolved copy");
  assert.equal(catalogue.resolve("sandbox_unknown"), null);
  assert.equal(PRODUCTION_CATALOGUE.resolve(FIXTURE.code), null, "production catalogue has zero products");
  assert.equal(PRODUCTION_CATALOGUE.mode, "live");
});

check("guardianV1Policy", () => {
  const access = { id: "acc-1", principalId: "payer-1", learnerId: "learner-1", relationshipType: "guardian", status: "active" };
  assert.deepEqual(evaluateGuardianV1("payer-1", "learner-1", access), { ok: true });
  assert.deepEqual(evaluateGuardianV1("payer-1", "learner-1", null), { ok: false, reason: "NO_ACCESS" });
  assert.deepEqual(evaluateGuardianV1("payer-2", "learner-1", access), { ok: false, reason: "OTHER_PRINCIPAL" });
  assert.deepEqual(evaluateGuardianV1("payer-1", "learner-2", access), { ok: false, reason: "OTHER_LEARNER" });
  for (const relationshipType of ["teacher", "self", "Guardian", ""]) {
    assert.deepEqual(evaluateGuardianV1("payer-1", "learner-1", { ...access, relationshipType }), { ok: false, reason: "NOT_GUARDIAN" }, relationshipType);
  }
  assert.deepEqual(evaluateGuardianV1("payer-1", "learner-1", { ...access, status: "revoked" }), { ok: false, reason: "NOT_ACTIVE" });
});

check("receiptOnlyForIdentifiableSuccessfulCharges", () => {
  const ok = { observedStatus: "successful" as const, observedAmountMinor: 2500, observedCurrency: "GHS", providerReference: "ref", verificationFailures: [] };
  assert.deepEqual(receiptCandidate(ok), { amountMinor: 2500, currency: "GHS", providerReference: "ref" });
  assert.deepEqual(receiptCandidate({ ...ok, observedAmountMinor: 2600, verificationFailures: ["OVERPAYMENT"] })?.amountMinor, 2600, "overpayment is money received");
  assert.ok(receiptCandidate({ ...ok, observedCurrency: "USD", verificationFailures: ["CURRENCY_MISMATCH"] }), "wrong currency is money received");
  for (const status of ["pending", "failed", "abandoned", "reversed", null] as const) {
    assert.equal(receiptCandidate({ ...ok, observedStatus: status }), null, String(status));
  }
  for (const failure of ["REFERENCE_MISMATCH", "PROVIDER_MISMATCH", "PROVIDER_REFERENCE_MISMATCH", "EXPECTATION_CONFLICT", "AMOUNT_NOT_INTEGER"]) {
    assert.equal(receiptCandidate({ ...ok, verificationFailures: [failure] }), null, failure);
  }
  assert.equal(receiptCandidate({ ...ok, providerReference: null }), null);
  assert.equal(receiptCandidate({ ...ok, observedAmountMinor: 0 }), null);
  assert.equal(receiptCandidate({ ...ok, observedCurrency: "ghs" }), null);
  assert.equal(receiptMatchesObligation(receipt(), obligation()), true);
  for (const r of [{ amountMinor: 2499 }, { amountMinor: 2501 }, { currency: "USD" }, { mode: "live" as const }, { obligationId: "other" }]) {
    assert.equal(receiptMatchesObligation(receipt(r), obligation()), false, JSON.stringify(r));
  }
});

check("settlementDecisionTable", () => {
  assert.deepEqual(decideObligationOutcome(baseOutcome), { settle: true, obligationTo: "settled", exceptions: [] });
  assert.deepEqual(decideObligationOutcome({ ...baseOutcome, beneficiariesAuthorized: false }), { settle: true, obligationTo: "settled", exceptions: ["beneficiary_authorization_revoked"] });
  assert.deepEqual(decideObligationOutcome({ ...baseOutcome, obligationStatus: "settled" }), { settle: false, obligationTo: null, exceptions: ["duplicate_charge"] });
  assert.deepEqual(decideObligationOutcome({ ...baseOutcome, obligationStatus: "review" }), { settle: false, obligationTo: null, exceptions: ["success_during_review"] });
  assert.deepEqual(decideObligationOutcome({ ...baseOutcome, obligationStatus: "cancelled" }), { settle: false, obligationTo: "review", exceptions: ["success_after_cancel"] });
  assert.deepEqual(decideObligationOutcome({ ...baseOutcome, obligationStatus: "expired" }), { settle: false, obligationTo: "review", exceptions: ["success_after_expiry"] });
  assert.equal(code(() => decideObligationOutcome({ ...baseOutcome, receipt: { exact: false, currencyMatches: true } })), "PERSISTENCE_ERROR");
  assert.equal(code(() => decideObligationOutcome({ ...baseOutcome, receipt: null })), "PERSISTENCE_ERROR");

  const review = { ...baseOutcome, attemptTo: "needs_review" as const, eventType: "verified_mismatch" };
  const cases: Array<[Partial<ObligationOutcomeInput>, string, ObligationStatus | null]> = [
    [{ receipt: { exact: false, currencyMatches: true }, verificationFailures: ["OVERPAYMENT"] }, "amount_mismatch", "review"],
    [{ receipt: { exact: false, currencyMatches: false }, verificationFailures: ["CURRENCY_MISMATCH"] }, "currency_mismatch", "review"],
    [{ receipt: null, verificationFailures: ["REFERENCE_MISMATCH"] }, "identity_mismatch", "review"],
    [{ receipt: null, observedStatus: "reversed", verificationFailures: ["STATUS_NOT_SUCCESSFUL"] }, "reversal_reported", "review"],
    [{ receipt: null, observedStatus: null, eventType: "provider_record_missing" }, "provider_record_missing", "review"],
    [{ receipt: null, observedStatus: null, eventType: "initiated_after_resolution", attemptFrom: "failed" }, "initiated_after_resolution", "review"],
    [{ attemptFrom: "failed", eventType: "verified_after_failure" }, "success_after_failed", "review"],
    [{ attemptFrom: "failed", obligationStatus: "settled" }, "duplicate_charge", null],
    [{ attemptFrom: "failed", obligationStatus: "cancelled" }, "success_after_cancel", "review"],
    [{ attemptFrom: "failed", obligationStatus: "expired" }, "success_after_expiry", "review"],
    [{ attemptFrom: "needs_review", obligationStatus: "review", eventType: "reverified" }, "success_after_failed", null],
  ];
  for (const [overrides, kind, to] of cases) {
    const result = decideObligationOutcome({ ...review, ...overrides });
    assert.equal(result.settle, false, kind);
    assert.deepEqual(result.exceptions, [kind], JSON.stringify(overrides));
    assert.equal(result.obligationTo, to, `${kind} -> ${to}`);
  }
  /* Nothing else ever settles or touches the obligation. */
  for (const attemptTo of ["created", "pending", "unknown", "failed"] as const) {
    assert.deepEqual(decideObligationOutcome({ ...baseOutcome, attemptTo }), { settle: false, obligationTo: null, exceptions: [] }, attemptTo);
  }
  for (const s of ["settled", "review", "cancelled", "expired"] as const) {
    assert.equal(decideObligationOutcome({ ...baseOutcome, obligationStatus: s }).settle, false, `no auto-settlement from ${s}`);
  }
});

check("postSuccessObservations", () => {
  assert.equal(decidePostSuccessObservation("successful", []), null);
  assert.equal(decidePostSuccessObservation("reversed", ["STATUS_NOT_SUCCESSFUL"]), "reversal_reported");
  assert.equal(decidePostSuccessObservation("failed", ["STATUS_NOT_SUCCESSFUL"]), "post_settlement_status_change");
  assert.equal(decidePostSuccessObservation("successful", ["OVERPAYMENT"]), "post_settlement_status_change");
  assert.equal(decidePostSuccessObservation(null, []), null);
});

check("fulfilmentEligibility", () => {
  const eligible = evaluateFulfilmentEligibility({ obligation: obligation(), receipts: [receipt()], exceptions: [], runtimeMode: "sandbox" });
  assert.deepEqual(eligible, { eligible: true, reasons: [], openExceptions: 0 });
  /* A receipt alone grants nothing. */
  for (const status of ["open", "review", "cancelled", "expired"] as const) {
    const r = evaluateFulfilmentEligibility({ obligation: obligation({ status, settledReceiptId: null, settledAt: null }), receipts: [receipt()], exceptions: [], runtimeMode: "sandbox" });
    assert.equal(r.eligible, false, status);
    assert.ok(r.reasons.includes("NOT_SETTLED"));
  }
  assert.deepEqual(evaluateFulfilmentEligibility({ obligation: obligation(), receipts: [], exceptions: [], runtimeMode: "sandbox" }).reasons, ["NO_SETTLEMENT_RECEIPT"]);
  assert.deepEqual(evaluateFulfilmentEligibility({ obligation: obligation(), receipts: [receipt({ amountMinor: 2499 })], exceptions: [], runtimeMode: "sandbox" }).reasons, ["SETTLEMENT_RECEIPT_MISMATCH"]);
  assert.deepEqual(evaluateFulfilmentEligibility({ obligation: obligation(), receipts: [receipt()], exceptions: [], runtimeMode: "live" }).reasons, ["MODE_MISMATCH"], "sandbox never eligible in live");
  for (const kind of FINANCIAL_EXCEPTION_KINDS) {
    const r = evaluateFulfilmentEligibility({ obligation: obligation(), receipts: [receipt()], exceptions: [exception(kind)], runtimeMode: "sandbox" });
    assert.equal(r.eligible, !EXCEPTION_BLOCKS_FULFILMENT[kind], kind);
    assert.equal(r.openExceptions, 1);
  }
  assert.equal(EXCEPTION_BLOCKS_FULFILMENT.duplicate_charge, false);
  assert.equal(FINANCIAL_EXCEPTION_KINDS.filter((k) => !EXCEPTION_BLOCKS_FULFILMENT[k]).length, 1, "only duplicate_charge is non-blocking");
  const resolved = evaluateFulfilmentEligibility({ obligation: obligation(), receipts: [receipt()], exceptions: [exception("reversal_reported", "resolved")], runtimeMode: "sandbox" });
  assert.equal(resolved.eligible, true, "resolved exceptions do not block (resolution is a later, operator step)");
});

assert.equal(networkCalls, 0);
console.log({ paymentObligationContracts: "PASS", checks: checks.length, networkCalls });
