/*
 * Payments Phase 2, step 3 (B2): obligations, receipts, financial exceptions,
 * settlement and eligibility on the IN-MEMORY ledger, with adversarial cases,
 * plus the 20 step 2 recorder scenarios re-run with every attempt bound to an
 * obligation. No database, no network, fake provider only.
 *
 * These tests prove the rules and their atomicity in memory. They prove
 * nothing about PostgreSQL constraints, locking, durability or crash recovery
 * (B4/B5).
 */
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import {
  evaluateFulfilmentEligibility,
  money,
  PaymentError,
  type CatalogueProduct,
  type ObservedPayment,
  type PaymentErrorCode,
  type PaymentObligation,
  type PaymentProviderAdapter,
} from "../packages/payments";
import {
  FakePaymentProvider,
  FakeProviderLedger,
  MemoryPaymentAttemptStore,
  MemoryPaymentIdentityDirectory,
  MemoryPaymentLedger,
  ObligationCheckout,
  ObligationService,
  PaymentRecorder,
  PRODUCTION_CATALOGUE,
  purchaseSnapshotHash,
  SandboxCatalogue,
  type LedgerFaultPoint,
  type NewPaymentAttempt,
} from "../services/payments";
import { runRecorderScenarios } from "./payment-recorder-scenarios";

let networkCalls = 0;
globalThis.fetch = (async () => {
  networkCalls += 1;
  throw new Error("Network access is not allowed in payment tests.");
}) as typeof fetch;

const SETTLE_MS = 15 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const EMAIL = "guardian.ledger@example.com";

/* Sandbox fixtures. These amounts are test values, not FILUMIRE prices. */
const PRODUCTS: CatalogueProduct[] = [
  { code: "sandbox_single", version: "t1", label: "Sandbox fixture, one learner", amount: money(2500, "GHS"), mode: "sandbox", beneficiaryCount: 1, terms: { fixture: true } },
  { code: "sandbox_single_b", version: "t1", label: "Sandbox fixture B, one learner", amount: money(4000, "GHS"), mode: "sandbox", beneficiaryCount: 1, terms: { fixture: true, variant: "b" } },
  { code: "sandbox_pair", version: "t1", label: "Sandbox fixture, two learners", amount: money(4500, "GHS"), mode: "sandbox", beneficiaryCount: 2, terms: { fixture: true, variant: "pair" } },
];
const catalogue = new SandboxCatalogue(PRODUCTS);

class Clock {
  t = Date.parse("2026-10-08T09:00:00Z");
  now = () => new Date(this.t);
  advance(ms: number) {
    this.t += ms;
  }
}

let seq = 0;
const uniq = (prefix: string) => `${prefix}-${++seq}-${Math.random().toString(36).slice(2, 8)}`;

async function expectCode(code: PaymentErrorCode, promise: Promise<unknown>, label: string): Promise<void> {
  await assert.rejects(promise, (error: unknown) => error instanceof PaymentError && error.code === code, label);
}

interface Family {
  payer: string;
  learners: string[];
  accessIds: string[];
}

function world(options: { faultHook?: (point: LedgerFaultPoint) => void; providerLedger?: FakeProviderLedger; adapter?: PaymentProviderAdapter } = {}) {
  const clock = new Clock();
  const directory = new MemoryPaymentIdentityDirectory();
  const ledger = new MemoryPaymentLedger({ directory, merchantContext: "fake:sandbox:test", faultHook: options.faultHook });
  const providerLedger = options.providerLedger ?? new FakeProviderLedger();
  const provider = new FakePaymentProvider({ ledger: providerLedger });
  const adapter = options.adapter ?? provider;
  const recorder = new PaymentRecorder(ledger, adapter, { now: clock.now, settleWindowMs: SETTLE_MS });
  const service = new ObligationService({ mode: "sandbox", catalogue, store: ledger, directory, payableWindowMs: DAY_MS, now: clock.now });
  const checkout = new ObligationCheckout(ledger, recorder);
  const obligationIds: string[] = [];

  function family(learners = 1): Family {
    const payer = uniq("payer");
    directory.addPrincipal(payer);
    const fam: Family = { payer, learners: [], accessIds: [] };
    for (let i = 0; i < learners; i += 1) {
      const learnerId = uniq("learner");
      const accessId = uniq("access");
      directory.addAccess({ id: accessId, principalId: payer, learnerId, relationshipType: "guardian", status: "active" });
      fam.learners.push(learnerId);
      fam.accessIds.push(accessId);
    }
    return fam;
  }

  async function obligation(fam: Family, productCode = fam.learners.length === 2 ? "sandbox_pair" : "sandbox_single"): Promise<PaymentObligation> {
    const created = await service.createObligation({ payerPrincipalId: fam.payer, creationKey: uniq("create"), productCode, beneficiaryLearnerIds: fam.learners });
    obligationIds.push(created.obligation.id);
    return created.obligation;
  }

  const pay = (fam: Family, o: PaymentObligation, idempotencyKey = uniq("key")) =>
    checkout.start({ payerPrincipalId: fam.payer, payerEmail: EMAIL, obligationId: o.id, idempotencyKey });

  /* The cross-record invariants every test ends with (they are what 0019 must also guarantee). */
  async function invariants(): Promise<void> {
    for (const id of obligationIds) await checkInvariants(ledger, id);
  }

  return { clock, directory, ledger, provider, providerLedger, recorder, service, checkout, family, obligation, pay, invariants, obligationIds };
}

async function checkInvariants(ledger: MemoryPaymentLedger, obligationId: string): Promise<void> {
  const o = (await ledger.findObligation(obligationId))!;
  const attempts = await ledger.listByObligation(obligationId);
  const receipts = await ledger.listReceipts(obligationId);
  const exceptions = await ledger.listExceptions(obligationId);
  const events = await ledger.listObligationEvents(obligationId);
  const label = `${obligationId} (${o.status})`;

  /* F1/F2: every attempt matches its obligation. */
  for (const a of attempts) {
    assert.equal(a.payerPrincipalId, o.payerPrincipalId, label);
    assert.equal(a.amountMinor, o.amountMinor, label);
    assert.equal(a.currency, o.currency, label);
    assert.equal(a.mode, o.mode, label);
  }
  /* F6: settlement at most once, exactly by an exact receipt of a succeeded attempt. */
  const settledEvents = events.filter((e) => e.toStatus === "settled");
  if (o.status === "settled") {
    assert.equal(settledEvents.length, 1, label);
    const r = receipts.find((x) => x.id === o.settledReceiptId);
    assert.ok(r, `${label}: settlement receipt exists`);
    assert.equal(r!.amountMinor, o.amountMinor);
    assert.equal(r!.currency, o.currency);
    assert.equal(r!.mode, o.mode);
    assert.equal(attempts.find((a) => a.id === r!.attemptId)?.status, "succeeded", label);
    assert.ok(o.settledAt instanceof Date);
  } else {
    assert.equal(o.settledReceiptId, null, label);
    assert.equal(o.settledAt, null, label);
    assert.equal(settledEvents.length, 0, label);
  }
  /* F5/F7: every succeeded attempt has a receipt; every receipt either settled this obligation or is covered by an exception. */
  for (const a of attempts.filter((x) => x.status === "succeeded")) {
    assert.ok(receipts.some((r) => r.attemptId === a.id), `${label}: succeeded attempt ${a.id} has a receipt`);
  }
  assert.equal(new Set(receipts.map((r) => r.attemptId)).size, receipts.length, "one receipt per attempt");
  for (const r of receipts) {
    const covered = r.id === o.settledReceiptId || exceptions.some((e) => e.attemptId === r.attemptId);
    assert.ok(covered, `${label}: receipt ${r.id} is neither the settlement nor flagged`);
  }
  /* F9: a needs_review attempt is always flagged. */
  for (const a of attempts.filter((x) => x.status === "needs_review")) {
    assert.ok(exceptions.some((e) => e.attemptId === a.id), `${label}: needs_review attempt ${a.id} flagged`);
  }
  /* Exceptions are unique per (kind, dedupe key) and all open (no resolution in step 3). */
  assert.equal(new Set(exceptions.map((e) => `${e.kind}:${e.dedupeKey}`)).size, exceptions.length);
  assert.ok(exceptions.every((e) => e.status === "open"));
  /* Events: gapless sequence. */
  assert.deepEqual(events.map((e) => e.sequence), events.map((_, i) => i + 1));
  /* Eligibility is exactly: settled and no open blocking exception. */
  const eligibility = evaluateFulfilmentEligibility({ obligation: o, receipts, exceptions, runtimeMode: "sandbox" });
  assert.equal(eligibility.eligible, o.status === "settled" && !exceptions.some((e) => e.blocksFulfilment), label);
  /* Snapshot still consistent with the stored columns and evidence. */
  const learnerIds = (await ledger.listBeneficiaries(obligationId)).map((b) => b.learnerId);
  assert.equal(purchaseSnapshotHash({ ...o, learnerIds }), o.snapshotHash, label);
  assert.equal(learnerIds.length, o.beneficiaryCount);
}

type Test = [name: string, run: () => Promise<void>];

const tests: Test[] = [
  /* ---------- creation, catalogue, snapshot ---------- */

  ["obligationPricedByCatalogueOnly", async () => {
    const w = world();
    const fam = w.family();
    const created = await w.service.createObligation({
      payerPrincipalId: fam.payer, creationKey: uniq("create"), productCode: "sandbox_single", beneficiaryLearnerIds: fam.learners,
      amountMinor: 1, currency: "USD", mode: "live",
    } as Parameters<ObligationService["createObligation"]>[0]);
    w.obligationIds.push(created.obligation.id);
    const o = created.obligation;
    assert.equal(o.amountMinor, 2500, "price from the catalogue, extra fields ignored");
    assert.equal(o.currency, "GHS");
    assert.equal(o.mode, "sandbox");
    assert.equal(o.status, "open");
    assert.match(o.id, /^obl_[0-9a-f]{32}$/);
    assert.deepEqual((await w.ledger.listObligationEvents(o.id)).map((e) => e.eventType), ["created"]);
    const evidence = await w.ledger.listBeneficiaries(o.id);
    assert.deepEqual(evidence.map((e) => [e.learnerId, e.accessId, e.policyCode, e.relationshipType]), [[fam.learners[0], fam.accessIds[0], "guardian_v1", "guardian"]]);
    await w.invariants();
  }],

  ["noLiveObligationsAndNoProductionProducts", async () => {
    const w = world();
    const fam = w.family();
    await expectCode("PRODUCT_NOT_AVAILABLE", w.service.createObligation({ payerPrincipalId: fam.payer, creationKey: uniq("create"), productCode: "sandbox_missing", beneficiaryLearnerIds: fam.learners }), "unknown product");
    assert.throws(() => new ObligationService({ mode: "sandbox", catalogue: PRODUCTION_CATALOGUE, store: w.ledger, directory: w.directory, payableWindowMs: DAY_MS }), (e: unknown) => e instanceof PaymentError && e.code === "SANDBOX_ONLY");
    assert.throws(() => new ObligationService({ mode: "live", catalogue: PRODUCTION_CATALOGUE, store: w.ledger, directory: w.directory, payableWindowMs: DAY_MS }), (e: unknown) => e instanceof PaymentError && e.code === "SANDBOX_ONLY");
    assert.throws(() => new ObligationService({ mode: "sandbox", catalogue, store: w.ledger, directory: w.directory, payableWindowMs: 0 }), (e: unknown) => e instanceof PaymentError && e.code === "CONFIGURATION");
    await expectCode("INVALID_OBLIGATION", w.service.createObligation({ payerPrincipalId: fam.payer, creationKey: uniq("create"), productCode: "sandbox_pair", beneficiaryLearnerIds: fam.learners }), "beneficiary count must match the product");
  }],

  ["directStoreCallsCannotBypassRules", async () => {
    const w = world();
    const fam = w.family();
    const other = w.family();
    const at = w.clock.now();
    const base = {
      id: uniq("obl"), payerPrincipalId: fam.payer, creationKey: uniq("create"), productCode: "sandbox_single", productVersion: "t1",
      productLabel: "Sandbox fixture, one learner", productTerms: { fixture: true }, amountMinor: 2500, currency: "GHS" as const, mode: "sandbox" as const,
    };
    const good: PaymentObligation = {
      ...base, beneficiaryCount: 1, snapshotHash: purchaseSnapshotHash({ ...base, learnerIds: fam.learners }), status: "open",
      expiresAt: new Date(at.getTime() + DAY_MS), settledReceiptId: null, settledAt: null, createdAt: at, updatedAt: at,
    };
    const evidence = [{ learnerId: fam.learners[0], accessId: fam.accessIds[0], policyCode: "guardian_v1" as const, relationshipType: "guardian" as const, authorizedAt: at }];
    const liveBase = { ...base, mode: "live" as const };
    await expectCode("SANDBOX_ONLY", w.ledger.createObligation({ obligation: { ...good, mode: "live", snapshotHash: purchaseSnapshotHash({ ...liveBase, learnerIds: fam.learners }) }, beneficiaries: evidence }), "live obligation");
    await expectCode("INVALID_OBLIGATION", w.ledger.createObligation({ obligation: { ...good, amountMinor: 1 }, beneficiaries: evidence }), "amount edited after hashing");
    await expectCode("INVALID_OBLIGATION", w.ledger.createObligation({ obligation: { ...good, productTerms: { fixture: false } }, beneficiaries: evidence }), "terms edited after hashing");
    await expectCode("INVALID_OBLIGATION", w.ledger.createObligation({ obligation: { ...good, beneficiaryCount: 2 }, beneficiaries: evidence }), "count mismatch");
    await expectCode("INVALID_OBLIGATION", w.ledger.createObligation({ obligation: { ...good, status: "settled" }, beneficiaries: evidence }), "born settled");
    await expectCode("INVALID_OBLIGATION", w.ledger.createObligation({ obligation: good, beneficiaries: [...evidence, evidence[0]] }), "duplicate learner");
    const otherEvidence = [{ ...evidence[0], learnerId: other.learners[0], accessId: other.accessIds[0] }];
    const otherHash = purchaseSnapshotHash({ ...base, learnerIds: other.learners });
    await expectCode("BENEFICIARY_NOT_AUTHORIZED", w.ledger.createObligation({ obligation: { ...good, snapshotHash: otherHash }, beneficiaries: otherEvidence }), "another payer's access row");
    assert.equal(await w.ledger.findObligation(good.id), null, "nothing stored");
  }],

  ["creationIsIdempotentAndConflictsAreRefused", async () => {
    const w = world();
    const fam = w.family(2);
    const key = uniq("create");
    const request = { payerPrincipalId: fam.payer, creationKey: key, productCode: "sandbox_pair", beneficiaryLearnerIds: fam.learners };
    const results = await Promise.all(Array.from({ length: 8 }, () => w.service.createObligation({ ...request, beneficiaryLearnerIds: [...request.beneficiaryLearnerIds].reverse() })));
    assert.equal(new Set(results.map((r) => r.obligation.id)).size, 1, "one obligation");
    assert.equal(results.filter((r) => r.kind === "created").length, 1);
    w.obligationIds.push(results[0].obligation.id);
    const extra = w.family();
    w.directory.addAccess({ id: uniq("access"), principalId: fam.payer, learnerId: extra.learners[0], relationshipType: "guardian", status: "active" });
    await expectCode("OBLIGATION_CONFLICT", w.service.createObligation({ ...request, beneficiaryLearnerIds: [fam.learners[0], extra.learners[0]] }), "same key, other learners");
    const solo = w.family();
    await expectCode("OBLIGATION_CONFLICT", w.service.createObligation({ ...request, payerPrincipalId: fam.payer, productCode: "sandbox_single", beneficiaryLearnerIds: [fam.learners[0]] }), "same key, other product");
    /* A creation key is scoped to its payer. */
    const theirs = await w.service.createObligation({ payerPrincipalId: solo.payer, creationKey: key, productCode: "sandbox_single", beneficiaryLearnerIds: solo.learners });
    assert.equal(theirs.kind, "created");
    w.obligationIds.push(theirs.obligation.id);
    await w.invariants();
  }],

  ["storedRecordsCannotBeChangedThroughCopies", async () => {
    const w = world();
    const fam = w.family();
    const o = await w.obligation(fam);
    o.amountMinor = 1;
    (o.productTerms as Record<string, unknown>).fixture = false;
    const evidence = await w.ledger.listBeneficiaries(o.id);
    evidence[0].learnerId = "someone-else";
    const fresh = (await w.ledger.findObligation(o.id))!;
    assert.equal(fresh.amountMinor, 2500);
    assert.deepEqual(fresh.productTerms, { fixture: true });
    assert.equal((await w.ledger.listBeneficiaries(o.id))[0].learnerId, fam.learners[0]);
    await w.invariants();
  }],

  /* ---------- authorisation ---------- */

  ["beneficiaryAuthorizationRefusesEverythingButActiveGuardian", async () => {
    const w = world();
    const fam = w.family();
    const other = w.family();
    const learner = uniq("learner");
    w.directory.addAccess({ id: uniq("access"), principalId: fam.payer, learnerId: learner, relationshipType: "teacher", status: "active" });
    const selfLearner = uniq("learner");
    w.directory.addAccess({ id: uniq("access"), principalId: fam.payer, learnerId: selfLearner, relationshipType: "self", status: "active" });
    const revokedLearner = uniq("learner");
    const revokedAccess = uniq("access");
    w.directory.addAccess({ id: revokedAccess, principalId: fam.payer, learnerId: revokedLearner, relationshipType: "guardian", status: "revoked" });
    const messages = new Set<string>();
    for (const [learnerId, label] of [["no-such-learner", "unknown learner"], [other.learners[0], "another family"], [learner, "teacher"], [selfLearner, "self (no age claim)"], [revokedLearner, "revoked guardian"]] as const) {
      await assert.rejects(
        w.service.createObligation({ payerPrincipalId: fam.payer, creationKey: uniq("create"), productCode: "sandbox_single", beneficiaryLearnerIds: [learnerId] }),
        (e: unknown) => {
          if (!(e instanceof PaymentError) || e.code !== "BENEFICIARY_NOT_AUTHORIZED") return false;
          messages.add(e.message);
          return true;
        },
        label,
      );
    }
    assert.equal(messages.size, 1, "one indistinguishable answer");
    await expectCode("PAYER_NOT_AUTHORIZED", w.service.createObligation({ payerPrincipalId: "no-such-payer", creationKey: uniq("create"), productCode: "sandbox_single", beneficiaryLearnerIds: fam.learners }), "unknown payer");
    w.directory.setPrincipalStatus(fam.payer, "disabled");
    await expectCode("PAYER_NOT_AUTHORIZED", w.service.createObligation({ payerPrincipalId: fam.payer, creationKey: uniq("create"), productCode: "sandbox_single", beneficiaryLearnerIds: fam.learners }), "inactive payer");
  }],

  ["onlyTheOwningPayerCanPayOrCancel", async () => {
    const w = world();
    const fam = w.family();
    const stranger = w.family();
    const o = await w.obligation(fam);
    await expectCode("OBLIGATION_NOT_FOUND", w.pay(stranger, o), "stranger checkout");
    await expectCode("OBLIGATION_NOT_FOUND", w.service.cancel(stranger.payer, o.id), "stranger cancel");
    await expectCode("OBLIGATION_NOT_FOUND", w.service.getForPayer(stranger.payer, o.id), "stranger read");
    assert.equal(w.providerLedger.initiateCalls, 0);
    await w.invariants();
  }],

  ["revokedBeforeCheckoutIsRefusedAndEvidenceKept", async () => {
    const w = world();
    const fam = w.family();
    const o = await w.obligation(fam);
    const before = await w.ledger.listBeneficiaries(o.id);
    w.directory.setAccessStatus(fam.accessIds[0], "revoked");
    await expectCode("BENEFICIARY_NOT_AUTHORIZED", w.pay(fam, o), "checkout after revocation");
    assert.equal(w.providerLedger.initiateCalls, 0, "provider never called");
    assert.deepEqual(await w.ledger.listByObligation(o.id), []);
    assert.deepEqual(await w.ledger.listBeneficiaries(o.id), before, "evidence unchanged");
    assert.equal((await w.ledger.findObligation(o.id))!.status, "open");
    await w.invariants();
  }],

  ["revokedDuringPaymentSettlesButBlocksFulfilment", async () => {
    const w = world();
    const fam = w.family(2);
    const o = await w.obligation(fam);
    const started = await w.pay(fam, o);
    assert.equal(started.kind, "initiated");
    w.directory.setAccessStatus(fam.accessIds[1], "revoked");
    const done = await w.recorder.reconcile(started.attempt.id);
    assert.equal(done.status, "succeeded");
    const after = (await w.ledger.findObligation(o.id))!;
    assert.equal(after.status, "settled", "the money was exactly what was owed");
    const exceptions = await w.ledger.listExceptions(o.id);
    assert.deepEqual(exceptions.map((e) => [e.kind, e.blocksFulfilment]), [["beneficiary_authorization_revoked", true]]);
    const eligibility = await w.service.eligibility(o.id);
    assert.equal(eligibility.eligible, false);
    assert.deepEqual(eligibility.reasons, ["BLOCKING_EXCEPTION_OPEN"]);
    assert.equal((await w.ledger.listBeneficiaries(o.id)).length, 2, "evidence kept");
    await w.invariants();
  }],

  /* ---------- settlement ---------- */

  ["initiationIsNotPaymentAndSettlementHappensOnce", async () => {
    const w = world();
    const fam = w.family();
    const o = await w.obligation(fam);
    const started = await w.pay(fam, o);
    assert.equal(started.kind, "initiated");
    assert.equal(started.attempt.amountMinor, 2500, "amount from the obligation");
    assert.equal((await w.ledger.findObligation(o.id))!.status, "open", "initiation never settles");
    assert.deepEqual(await w.ledger.listReceipts(o.id), []);
    assert.deepEqual((await w.service.eligibility(o.id)).reasons, ["NOT_SETTLED"]);
    const done = await w.recorder.reconcile(started.attempt.id);
    assert.equal(done.status, "succeeded");
    const receipts = await w.ledger.listReceipts(o.id);
    assert.equal(receipts.length, 1);
    assert.equal(receipts[0].merchantContext, "fake:sandbox:test");
    const settled = (await w.ledger.findObligation(o.id))!;
    assert.equal(settled.status, "settled");
    assert.equal(settled.settledReceiptId, receipts[0].id);
    assert.deepEqual(await w.service.eligibility(o.id), { eligible: true, reasons: [], openExceptions: 0 });
    for (let i = 0; i < 3; i += 1) await w.recorder.reconcile(started.attempt.id);
    assert.equal((await w.ledger.listReceipts(o.id)).length, 1);
    assert.deepEqual((await w.ledger.listObligationEvents(o.id)).map((e) => e.eventType), ["created", "settled"]);
    const again = await w.pay(fam, o);
    assert.equal(again.kind, "already_paid");
    assert.equal(w.providerLedger.chargesCreated, 1);
    await w.invariants();
  }],

  ["concurrentConfirmationsSettleOnce", async () => {
    const w = world();
    const fam = w.family();
    const o = await w.obligation(fam);
    const started = await w.pay(fam, o);
    const results = await Promise.all(Array.from({ length: 10 }, () => w.recorder.reconcile(started.attempt.id)));
    assert.ok(results.every((r) => r.status === "succeeded"));
    assert.equal((await w.ledger.listReceipts(o.id)).length, 1);
    assert.equal((await w.ledger.listObligationEvents(o.id)).filter((e) => e.toStatus === "settled").length, 1);
    assert.equal((await w.ledger.listEvents(started.attempt.id)).filter((e) => e.toStatus === "succeeded").length, 1);
    await w.invariants();
  }],

  ["concurrentCheckoutsOneChargePerObligation", async () => {
    const w = world();
    const fam = w.family();
    const o = await w.obligation(fam);
    const results = await Promise.all(Array.from({ length: 8 }, () => w.pay(fam, o)));
    assert.equal(results.filter((r) => r.kind === "initiated").length, 1);
    assert.ok(results.every((r) => ["initiated", "obligation_in_progress", "already_paid"].includes(r.kind)), results.map((r) => r.kind).join(","));
    assert.equal(w.providerLedger.chargesCreated, 1);
    assert.equal((await w.ledger.listByObligation(o.id)).length, 1);
    await w.invariants();
  }],

  ["noNewAttemptOnceSettled", async () => {
    const w = world();
    const fam = w.family();
    const o = await w.obligation(fam);
    const started = await w.pay(fam, o);
    await w.recorder.reconcile(started.attempt.id);
    const late: NewPaymentAttempt = {
      id: uniq("att"), idempotencyKey: uniq("key"), obligationId: o.id, ourReference: `FLM-${"a".repeat(32)}`, requestFingerprint: "x",
      provider: "fake", mode: "sandbox", payerPrincipalId: fam.payer, billingAccountId: null, amountMinor: 2500, currency: "GHS", createdAt: w.clock.now(),
    };
    assert.deepEqual(await w.ledger.create(late), { created: false, conflict: "obligation_succeeded" }, "the Step 2 stale-check race is closed");
    assert.equal((await w.ledger.listByObligation(o.id)).length, 1);
    await w.invariants();
  }],

  /* ---------- late, duplicate and mismatched charges ---------- */

  ["failedAttemptLaterSuccessfulIsKeptAndReviewed", async () => {
    const w = world();
    const fam = w.family();
    const o = await w.obligation(fam);
    const a = await w.pay(fam, o);
    w.provider.script(a.attempt.ourReference, { status: "abandoned" });
    assert.equal((await w.recorder.reconcile(a.attempt.id)).status, "failed");
    w.provider.script(a.attempt.ourReference, { status: "successful" });
    assert.equal((await w.recorder.reconcile(a.attempt.id)).status, "failed", "reconcile() ignores closed attempts (step 2)");
    const late = await w.recorder.reverifyClosed(a.attempt.id);
    assert.equal(late.status, "needs_review");
    const receipts = await w.ledger.listReceipts(o.id);
    assert.equal(receipts.length, 1, "the charge is not lost");
    const after = (await w.ledger.findObligation(o.id))!;
    assert.equal(after.status, "review", "never auto-settled from a failed attempt");
    assert.deepEqual((await w.ledger.listExceptions(o.id)).map((e) => e.kind), ["success_after_failed"]);
    assert.equal((await w.service.eligibility(o.id)).eligible, false, "a receipt alone grants nothing");
    await expectCode("OBLIGATION_NEEDS_REVIEW", w.pay(fam, o), "no new attempt while in review");
    await w.recorder.reverifyClosed(a.attempt.id);
    assert.equal((await w.ledger.listReceipts(o.id)).length, 1, "idempotent");
    assert.equal((await w.ledger.listExceptions(o.id)).length, 1, "idempotent");
    await w.invariants();
  }],

  ["duplicateSuccessfulChargeIsAuditedNotSettled", async () => {
    const w = world();
    const fam = w.family();
    const o = await w.obligation(fam);
    const a = await w.pay(fam, o);
    w.provider.script(a.attempt.ourReference, { status: "abandoned" });
    await w.recorder.reconcile(a.attempt.id);
    const b = await w.pay(fam, o);
    assert.equal(b.kind, "initiated");
    await w.recorder.reconcile(b.attempt.id);
    const settled = (await w.ledger.findObligation(o.id))!;
    assert.equal(settled.status, "settled");
    w.provider.script(a.attempt.ourReference, { status: "successful" });
    await w.recorder.reverifyClosed(a.attempt.id);
    const after = (await w.ledger.findObligation(o.id))!;
    assert.equal(after.status, "settled");
    assert.equal(after.settledReceiptId, settled.settledReceiptId, "single settlement unchanged");
    assert.equal((await w.ledger.listReceipts(o.id)).length, 2, "both charges recorded");
    assert.deepEqual((await w.ledger.listExceptions(o.id)).map((e) => [e.kind, e.blocksFulfilment]), [["duplicate_charge", false]]);
    const eligibility = await w.service.eligibility(o.id);
    assert.equal(eligibility.eligible, true, "the original purchase stays valid");
    assert.equal(eligibility.openExceptions, 1, "the duplicate stays open financial exposure");
    await w.invariants();
  }],

  ["lateChargeSweepFindsWhatNobodyAskedAbout", async () => {
    const w = world();
    const fam = w.family();
    const o = await w.obligation(fam);
    const a = await w.pay(fam, o);
    w.provider.script(a.attempt.ourReference, { status: "abandoned" });
    await w.recorder.reconcile(a.attempt.id);
    const b = await w.pay(fam, o);
    await w.recorder.reconcile(b.attempt.id);
    w.provider.script(a.attempt.ourReference, { status: "successful" });
    w.clock.advance(60 * 60 * 1000);
    const swept = await w.recorder.reverifyRecentlyClosed(2 * DAY_MS, 50);
    assert.equal(swept.length, 2, "both closed attempts re-verified");
    assert.equal((await w.ledger.findById(a.attempt.id))!.status, "needs_review");
    assert.deepEqual((await w.ledger.listExceptions(o.id)).map((e) => e.kind), ["duplicate_charge"]);
    await w.recorder.reverifyRecentlyClosed(2 * DAY_MS, 50);
    assert.equal((await w.ledger.listReceipts(o.id)).length, 2, "sweep is idempotent");
    assert.equal((await w.ledger.listExceptions(o.id)).length, 1);
    w.clock.advance(3 * DAY_MS);
    assert.deepEqual(await w.recorder.reverifyRecentlyClosed(DAY_MS, 50), [], "outside the look-back window");
    await expectCode("CONFIGURATION", new PaymentRecorder(new MemoryPaymentAttemptStore(), w.provider).reverifyRecentlyClosed(DAY_MS), "store without listing");
    await w.invariants();
  }],

  ["lateSuccessAfterCancellationNeverSettles", async () => {
    const w = world();
    const fam = w.family();
    const o = await w.obligation(fam);
    const a = await w.pay(fam, o);
    w.provider.script(a.attempt.ourReference, { status: "abandoned" });
    await w.recorder.reconcile(a.attempt.id);
    assert.equal((await w.service.cancel(fam.payer, o.id)).applied, true);
    w.provider.script(a.attempt.ourReference, { status: "successful" });
    await w.recorder.reverifyClosed(a.attempt.id);
    const after = (await w.ledger.findObligation(o.id))!;
    assert.equal(after.status, "review");
    assert.equal(after.settledReceiptId, null);
    assert.deepEqual((await w.ledger.listExceptions(o.id)).map((e) => e.kind), ["success_after_cancel"]);
    assert.equal((await w.ledger.listReceipts(o.id)).length, 1);
    assert.equal((await w.service.eligibility(o.id)).eligible, false);
    await w.invariants();
  }],

  ["lateSuccessAfterExpiryNeverSettles", async () => {
    const w = world();
    const fam = w.family();
    const o = await w.obligation(fam);
    const a = await w.pay(fam, o);
    w.provider.script(a.attempt.ourReference, { status: "abandoned" });
    await w.recorder.reconcile(a.attempt.id);
    w.clock.advance(DAY_MS + 1);
    assert.deepEqual(await w.service.expireDue(), [o.id]);
    await expectCode("OBLIGATION_NOT_PAYABLE", w.pay(fam, o), "expired obligation");
    w.provider.script(a.attempt.ourReference, { status: "successful" });
    await w.recorder.reverifyClosed(a.attempt.id);
    assert.equal((await w.ledger.findObligation(o.id))!.status, "review");
    assert.deepEqual((await w.ledger.listExceptions(o.id)).map((e) => e.kind), ["success_after_expiry"]);
    await w.invariants();
  }],

  ["providerMismatchesAreReceiptedOrFlaggedNeverSettled", async () => {
    const cases: Array<[Parameters<FakePaymentProvider["script"]>[1], string, boolean]> = [
      [{ amountDeltaMinor: -1 }, "amount_mismatch", true],
      [{ amountDeltaMinor: 1 }, "amount_mismatch", true],
      [{ currency: "USD" }, "currency_mismatch", true],
      [{ reportReference: "FLM-SOMEONE-ELSE" }, "identity_mismatch", false],
      [{ status: "reversed" }, "reversal_reported", false],
    ];
    for (const [outcome, kind, receipted] of cases) {
      const w = world();
      const fam = w.family();
      const o = await w.obligation(fam);
      const started = await w.pay(fam, o);
      w.provider.script(started.attempt.ourReference, outcome);
      assert.equal((await w.recorder.reconcile(started.attempt.id)).status, "needs_review", kind);
      const receipts = await w.ledger.listReceipts(o.id);
      assert.equal(receipts.length, receipted ? 1 : 0, `${kind}: receipt`);
      if (receipted) assert.notEqual(`${receipts[0].amountMinor}${receipts[0].currency}`, "2500GHS", "observed values recorded");
      assert.deepEqual((await w.ledger.listExceptions(o.id)).map((e) => e.kind), [kind]);
      const after = (await w.ledger.findObligation(o.id))!;
      assert.equal(after.status, "review", kind);
      assert.equal(after.settledReceiptId, null);
      assert.equal((await w.service.eligibility(o.id)).eligible, false);
      await w.invariants();
    }
  }],

  ["conflictingProviderReferenceIsRefusedAtomically", async () => {
    const providerLedger = new FakeProviderLedger();
    const fake = new FakePaymentProvider({ ledger: providerLedger });
    const hijack = new Map<string, string>();
    const adapter: PaymentProviderAdapter = {
      id: "fake",
      mode: "sandbox",
      initiate: (intent) => fake.initiate(intent),
      async verify(ourReference: string): Promise<ObservedPayment> {
        const observed = await fake.verify(ourReference);
        const forced = hijack.get(ourReference);
        return forced ? { ...observed, providerReference: forced } : observed;
      },
    };
    const w = world({ providerLedger, adapter });
    const famA = w.family();
    const famB = w.family();
    const oA = await w.obligation(famA);
    const oB = await w.obligation(famB);
    const b = await w.pay(famB, oB);
    fake.failNextInitiate("lost_response");
    const a = await w.pay(famA, oA);
    assert.equal(a.kind, "uncertain");
    assert.equal(a.attempt.providerReference, null);
    hijack.set(a.attempt.ourReference, b.attempt.providerReference!);
    await expectCode("PERSISTENCE_ERROR", w.recorder.reconcile(a.attempt.id), "provider reference of another attempt");
    const unchanged = (await w.ledger.findById(a.attempt.id))!;
    assert.equal(unchanged.status, "unknown");
    assert.equal(unchanged.providerReference, null);
    assert.deepEqual(await w.ledger.listReceipts(oA.id), []);
    assert.equal((await w.ledger.findObligation(oA.id))!.status, "open");
    await w.recorder.reconcile(b.attempt.id);
    assert.equal((await w.ledger.findObligation(oB.id))!.status, "settled", "the rightful owner is unaffected");
    await w.invariants();
  }],

  ["reversalAfterSettlementBlocksWithoutRewritingHistory", async () => {
    const w = world();
    const fam = w.family();
    const o = await w.obligation(fam);
    const started = await w.pay(fam, o);
    await w.recorder.reconcile(started.attempt.id);
    const settled = (await w.ledger.findObligation(o.id))!;
    w.provider.script(started.attempt.ourReference, { status: "reversed" });
    const attempt = await w.recorder.reverifyClosed(started.attempt.id);
    assert.equal(attempt.status, "succeeded", "a succeeded attempt is never edited");
    const after = (await w.ledger.findObligation(o.id))!;
    assert.equal(after.status, "settled");
    assert.equal(after.settledReceiptId, settled.settledReceiptId);
    assert.deepEqual((await w.ledger.listExceptions(o.id)).map((e) => e.kind), ["reversal_reported"]);
    assert.deepEqual((await w.service.eligibility(o.id)).reasons, ["BLOCKING_EXCEPTION_OPEN"]);
    await w.invariants();
  }],

  /* ---------- amount, currency, mode binding ---------- */

  ["attemptsMustMatchTheirObligation", async () => {
    const w = world();
    const fam = w.family();
    const o = await w.obligation(fam);
    const direct = (overrides: object) => ({
      idempotencyKey: uniq("key"), obligationId: o.id, amount: money(2500, "GHS"), payer: { principalId: fam.payer, email: EMAIL }, description: "x", ...overrides,
    });
    await expectCode("OBLIGATION_MISMATCH", w.recorder.startAttempt(direct({ amount: money(2600, "GHS") })), "different amount");
    await expectCode("OBLIGATION_MISMATCH", w.recorder.startAttempt(direct({ payer: { principalId: w.family().payer, email: EMAIL } })), "different payer");
    await expectCode("OBLIGATION_NOT_FOUND", w.recorder.startAttempt(direct({ obligationId: "obl-unknown" })), "unknown obligation");
    const raw: NewPaymentAttempt = {
      id: uniq("att"), idempotencyKey: uniq("key"), obligationId: o.id, ourReference: `FLM-${"b".repeat(32)}`, requestFingerprint: "x",
      provider: "fake", mode: "sandbox", payerPrincipalId: fam.payer, billingAccountId: null, amountMinor: 2500, currency: "USD" as "GHS", createdAt: w.clock.now(),
    };
    await expectCode("OBLIGATION_MISMATCH", w.ledger.create(raw), "different currency");
    await expectCode("OBLIGATION_MISMATCH", w.ledger.create({ ...raw, currency: "GHS", mode: "live" }), "different mode");
    const liveAdapter: PaymentProviderAdapter = { id: "fake", mode: "live", initiate: async () => { throw new Error("must not be called"); }, verify: async () => { throw new Error("must not be called"); } };
    const liveRecorder = new PaymentRecorder(w.ledger, liveAdapter, { now: w.clock.now });
    await expectCode("OBLIGATION_MISMATCH", new ObligationCheckout(w.ledger, liveRecorder).start({ payerPrincipalId: fam.payer, payerEmail: EMAIL, obligationId: o.id, idempotencyKey: uniq("key") }), "live adapter, sandbox obligation");
    assert.deepEqual(await w.ledger.listByObligation(o.id), [], "nothing stored");
    assert.equal(w.providerLedger.initiateCalls, 0);
    await w.invariants();
  }],

  ["sandboxObligationsAreNeverLiveEligible", async () => {
    const w = world();
    const fam = w.family();
    const o = await w.obligation(fam);
    const started = await w.pay(fam, o);
    await w.recorder.reconcile(started.attempt.id);
    const settled = (await w.ledger.findObligation(o.id))!;
    const live = evaluateFulfilmentEligibility({ obligation: settled, receipts: await w.ledger.listReceipts(o.id), exceptions: [], runtimeMode: "live" });
    assert.deepEqual(live.reasons, ["MODE_MISMATCH"]);
    await w.invariants();
  }],

  /* ---------- races ---------- */

  ["checkoutRacingCancellation", async () => {
    for (const order of ["cancel-first", "checkout-first", "parallel"] as const) {
      for (let i = 0; i < (order === "parallel" ? 10 : 1); i += 1) {
        const w = world();
        const fam = w.family();
        const o = await w.obligation(fam);
        let checkoutError: unknown;
        let cancelError: unknown;
        const doCheckout = () => w.pay(fam, o).catch((e) => { checkoutError = e; });
        const doCancel = () => w.service.cancel(fam.payer, o.id).catch((e) => { cancelError = e; });
        if (order === "cancel-first") {
          await doCancel();
          await doCheckout();
        } else if (order === "checkout-first") {
          await doCheckout();
          await doCancel();
        } else {
          await Promise.all([doCheckout(), doCancel()]);
        }
        const after = (await w.ledger.findObligation(o.id))!;
        const attempts = await w.ledger.listByObligation(o.id);
        if (after.status === "cancelled") {
          assert.equal(attempts.length, 0, `${order}: no attempt on a cancelled obligation`);
          assert.ok(checkoutError instanceof PaymentError && checkoutError.code === "OBLIGATION_NOT_PAYABLE", order);
          assert.equal(w.providerLedger.initiateCalls, 0);
        } else {
          assert.equal(after.status, "open", order);
          assert.equal(attempts.length, 1);
          assert.ok(cancelError instanceof PaymentError && cancelError.code === "OBLIGATION_PAYMENT_IN_PROGRESS", order);
        }
        await w.invariants();
      }
    }
  }],

  ["verificationRacingExpiry", async () => {
    for (const order of ["expiry-first", "parallel"] as const) {
      const w = world();
      const fam = w.family();
      const o = await w.obligation(fam);
      const started = await w.pay(fam, o);
      w.clock.advance(DAY_MS + 1);
      if (order === "expiry-first") {
        assert.deepEqual(await w.service.expireDue(), [], "an obligation with an active attempt never expires");
        await w.recorder.reconcile(started.attempt.id);
      } else {
        await Promise.all([w.service.expireDue(), w.recorder.reconcile(started.attempt.id)]);
      }
      assert.equal((await w.ledger.findObligation(o.id))!.status, "settled", order);
      await w.invariants();
    }
  }],

  /* ---------- atomicity and restart ---------- */

  ["faultInsideSettlementRollsEverythingBack", async () => {
    for (const point of ["after_attempt_transition", "after_receipt", "after_settlement"] as LedgerFaultPoint[]) {
      let armed = false;
      const providerLedger = new FakeProviderLedger();
      const w = world({ providerLedger, faultHook: (p) => {
        if (armed && p === point) throw new Error(`injected fault at ${p}`);
      } });
      const fam = w.family();
      const o = await w.obligation(fam);
      const started = await w.pay(fam, o);
      armed = true;
      const eventsBefore = await w.ledger.listObligationEvents(o.id);
      await assert.rejects(w.recorder.reconcile(started.attempt.id), /injected fault/, point);
      assert.equal((await w.ledger.findById(started.attempt.id))!.status, "pending", `${point}: attempt rolled back`);
      assert.equal((await w.ledger.listEvents(started.attempt.id)).length, 2, `${point}: attempt events rolled back`);
      assert.deepEqual(await w.ledger.listReceipts(o.id), [], `${point}: receipt rolled back`);
      assert.equal((await w.ledger.findObligation(o.id))!.status, "open", `${point}: obligation rolled back`);
      assert.deepEqual(await w.ledger.listObligationEvents(o.id), eventsBefore);
      /* "Restart": new recorder and adapter over the same store and provider records. */
      armed = false;
      const restarted = new PaymentRecorder(w.ledger, new FakePaymentProvider({ ledger: providerLedger }), { now: w.clock.now, settleWindowMs: SETTLE_MS });
      w.clock.advance(1000);
      await restarted.reconcileActive(10);
      assert.equal((await w.ledger.findObligation(o.id))!.status, "settled", `${point}: recovered`);
      await w.invariants();
    }
  }],

  ["lostResponseRecoveredAfterRestart", async () => {
    const providerLedger = new FakeProviderLedger();
    const w = world({ providerLedger });
    const fam = w.family();
    const o = await w.obligation(fam);
    w.provider.failNextInitiate("lost_response");
    const started = await w.pay(fam, o);
    assert.equal(started.kind, "uncertain");
    const restarted = new PaymentRecorder(w.ledger, new FakePaymentProvider({ ledger: providerLedger }), { now: w.clock.now, settleWindowMs: SETTLE_MS });
    w.clock.advance(1000);
    await restarted.reconcileActive(10);
    assert.equal((await w.ledger.findObligation(o.id))!.status, "settled");
    assert.equal(providerLedger.chargesCreated, 1);
    await w.invariants();
  }],

  /* ---------- separation ---------- */

  ["paymentsStaySeparateFromLearningAndAccess", async () => {
    const root = process.cwd();
    const walk = (dir: string): string[] =>
      readdirSync(dir).flatMap((name) => {
        const full = join(dir, name);
        if (name === "node_modules" || name === ".next") return [];
        return statSync(full).isDirectory() ? walk(full) : /\.(ts|tsx)$/.test(name) ? [full] : [];
      });
    const paymentFiles = [...walk(join(root, "packages", "payments")), ...walk(join(root, "services", "payments"))];
    for (const file of paymentFiles) {
      for (const m of readFileSync(file, "utf8").matchAll(/from\s+"([^"]+)"/g)) {
        const target = m[1];
        const ok = target === "pg" || target.startsWith("node:") || /^(\.\.?\/)+([a-z]+\/)*[a-z-]+$/.test(target);
        assert.ok(ok, `${file}: unexpected import ${target}`);
        assert.ok(!/(persistence|learner|domain|principal|evidence|adaptive|curriculum|entitlement|identity)/.test(target), `${file} imports ${target}`);
        if (target.includes("packages/")) assert.ok(target.endsWith("packages/payments"), `${file} imports ${target}`);
      }
    }
    const outside = [...walk(join(root, "apps", "learner", "app")), ...walk(join(root, "apps", "learner", "services"))]
      .concat(walk(join(root, "services")).filter((f) => !f.includes(`${join("services", "payments")}`)))
      .concat(walk(join(root, "packages")).filter((f) => !f.includes(`${join("packages", "payments")}`)));
    for (const file of outside) {
      assert.ok(!/from\s+"[^"]*payments[^"]*"/.test(readFileSync(file, "utf8")), `${file} imports payments`);
    }
    assert.ok(!paymentFiles.some((f) => /entitlement/i.test(f)), "no entitlement code");
  }],
];

/* The 20 step 2 scenarios, unchanged, with every attempt bound to a sandbox obligation created on first use. */
class AutoProvisioningLedger extends MemoryPaymentLedger {
  readonly provisioned: string[] = [];

  constructor(private readonly dir: MemoryPaymentIdentityDirectory) {
    super({ directory: dir, merchantContext: "fake:sandbox:compat" });
  }

  override async create(input: NewPaymentAttempt) {
    if (!(await this.findObligation(input.obligationId))) {
      const productCode = input.amountMinor === 2500 ? "sandbox_single" : input.amountMinor === 4000 ? "sandbox_single_b" : null;
      if (!productCode) throw new Error(`No sandbox fixture for amount ${input.amountMinor}.`);
      const learnerId = `learner-${input.obligationId}`;
      this.dir.addPrincipal(input.payerPrincipalId);
      this.dir.addAccess({ id: `access-${input.obligationId}`, principalId: input.payerPrincipalId, learnerId, relationshipType: "guardian", status: "active" });
      const service = new ObligationService({
        mode: "sandbox", catalogue, store: this, directory: this.dir, payableWindowMs: 30 * DAY_MS,
        now: () => new Date(input.createdAt.getTime() - 1000), newId: () => input.obligationId,
      });
      const created = await service.createObligation({ payerPrincipalId: input.payerPrincipalId, creationKey: `compat-${input.obligationId}`, productCode, beneficiaryLearnerIds: [learnerId] });
      if (created.kind === "created") this.provisioned.push(input.obligationId);
    }
    return super.create(input);
  }
}

let finished = false;
process.on("exit", (code) => {
  if (code === 0 && !finished) {
    console.error("payment-obligation-ledger test ended before finishing (pending promise); failing.");
    process.exitCode = 1;
  }
});

async function run(): Promise<void> {
  const passed: string[] = [];
  for (const [name, test] of tests) {
    try {
      await test();
    } catch (error) {
      console.error(`Test failed: ${name}`);
      throw error;
    }
    passed.push(name);
  }

  const ledgers: AutoProvisioningLedger[] = [];
  let payers = 0;
  const scenarios = await runRecorderScenarios({
    newStore: () => {
      const ledger = new AutoProvisioningLedger(new MemoryPaymentIdentityDirectory());
      ledgers.push(ledger);
      return ledger;
    },
    newPayer: async () => `compat-payer-${++payers}`,
  });
  let boundObligations = 0;
  for (const ledger of ledgers) {
    for (const id of ledger.provisioned) {
      await checkInvariants(ledger, id);
      boundObligations += 1;
    }
  }

  assert.equal(networkCalls, 0, "no network calls");
  finished = true;
  console.log({ paymentObligationLedger: "PASS", adversarialTests: passed.length, step2ScenariosOnLedger: scenarios.length, boundObligations, networkCalls });
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
