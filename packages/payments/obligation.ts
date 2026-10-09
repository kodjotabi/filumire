/*
 * Payment obligations, receipts, financial exceptions and fulfilment
 * eligibility (Payments Phase 2, step 3, B1). Provider-independent contracts
 * and pure rules only; persistence is in services/payments/obligations.
 * Design: docs/handoff/PAYMENTS_PHASE2_STEP3_STAGE_A.md.
 *
 * Four separate records, never one status:
 * - financial event = PaymentReceipt: a provider-confirmed successful charge (append-only);
 * - payment attempt = PaymentAttemptRecord (step 2);
 * - obligation      = PaymentObligation: what FILUMIRE agreed to provide, to whom, for how much;
 * - entitlement     = not built. A future engine may only consume evaluateFulfilmentEligibility().
 *
 * Recording a receipt and settling an obligation are separate decisions
 * (receiptCandidate vs decideObligationOutcome). A receipt alone grants
 * nothing; an open blocking exception makes fulfilment ineligible. Step 3 is
 * sandbox only.
 */
import { PaymentError } from "./errors";
import type { PaymentAttemptStatus } from "./lifecycle";
import type { CurrencyCode, Money } from "./money";
import type { PaymentMode, ProviderPaymentStatus } from "./index";

/* ---------- Sandbox-only operation ---------- */

export const STEP3_ALLOWED_MODES: readonly PaymentMode[] = ["sandbox"];

export function assertSandboxOnly(mode: unknown, what = "payment obligations"): asserts mode is "sandbox" {
  if (mode !== "sandbox") {
    throw new PaymentError("SANDBOX_ONLY", `Step 3 ${what} run in sandbox mode only.`);
  }
}

/* ---------- Obligation lifecycle ---------- */

export const OBLIGATION_STATUSES = ["open", "settled", "cancelled", "expired", "review"] as const;

export type ObligationStatus = (typeof OBLIGATION_STATUSES)[number];

/*
 *   open ---> settled (terminal; later problems are exceptions, never status changes)
 *     |-----> cancelled ---> review (money arrived for a cancelled purchase)
 *     |-----> expired -----> review (money arrived after expiry)
 *     \-----> review ------> settled | cancelled   (operator only; NOT implemented in step 3)
 */
const OBLIGATION_TRANSITIONS: Record<ObligationStatus, readonly ObligationStatus[]> = {
  open: ["settled", "cancelled", "expired", "review"],
  cancelled: ["review"],
  expired: ["review"],
  review: ["settled", "cancelled"],
  settled: [],
};

/* Transitions that need a human decision. Step 3 has no operator actions, so nothing performs them. */
export const OPERATOR_ONLY_OBLIGATION_TRANSITIONS: ReadonlyArray<readonly [ObligationStatus, ObligationStatus]> = [
  ["review", "settled"],
  ["review", "cancelled"],
];

export function canTransitionObligation(from: ObligationStatus, to: ObligationStatus): boolean {
  return OBLIGATION_TRANSITIONS[from]?.includes(to) ?? false;
}

export function isOperatorOnlyTransition(from: ObligationStatus, to: ObligationStatus): boolean {
  return OPERATOR_ONLY_OBLIGATION_TRANSITIONS.some(([f, t]) => f === from && t === to);
}

/* ---------- Catalogue products (server-controlled; no prices in code) ---------- */

export type PurchaseTermValue = string | number | boolean | null | PurchaseTermValue[] | { [key: string]: PurchaseTermValue };

export interface CatalogueProduct {
  code: string;
  version: string;
  /* Shown to the payer and sent to the provider as the description. Never contains learner data. */
  label: string;
  amount: Money;
  mode: PaymentMode;
  /* Exact number of learners one purchase covers. */
  beneficiaryCount: number;
  /* What the purchase grants. Opaque here; a future entitlement engine may grant no more than this. */
  terms: { [key: string]: PurchaseTermValue };
}

export const PRODUCT_CODE_PATTERN = /^[a-z][a-z0-9_]{2,63}$/;
export const SANDBOX_PRODUCT_PREFIX = "sandbox_";
export const PRODUCT_VERSION_PATTERN = /^[A-Za-z0-9._-]{1,32}$/;
/* Same character set as payment_attempts.obligation_id (0018). */
export const OBLIGATION_ID_PATTERN = /^[A-Za-z0-9._:-]{1,200}$/;
export const CREATION_KEY_PATTERN = /^[A-Za-z0-9._:-]{8,200}$/;
export const MERCHANT_CONTEXT_PATTERN = /^[a-z0-9][a-z0-9:._-]{2,63}$/;
export const MAX_BENEFICIARIES = 20;
/* amount_minor columns are PostgreSQL `integer` (int4). */
export const MAX_AMOUNT_MINOR = 2_147_483_647;
/*
 * Learner ids inside the canonical text (B3): ASCII only, so JS sort (UTF-16)
 * equals SQL ORDER BY ... COLLATE "C" (bytes), and no ',' (the list separator),
 * so ["a,b"] and ["a", "b"] can never produce the same text.
 */
export const CANONICAL_LEARNER_ID_PATTERN = /^[A-Za-z0-9._:-]{1,200}$/;
export const MAX_PRINCIPAL_ID_LENGTH = 200;

const LONE_SURROGATE = /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/;

/*
 * Text allowed in the canonical purchase form (B3). PostgreSQL text and jsonb
 * cannot hold U+0000 or unpaired surrogates, so those are refused here too.
 * NFC is required so that visually identical text has one byte form (the SQL
 * side checks `IS NFC NORMALIZED`). Other characters, including controls, are
 * allowed and escaped identically by JSON.stringify and PostgreSQL to_json.
 */
/* Exactly the characters String.prototype.trim() removes; the SQL side uses the same class. */
export const BLANK_TEXT_PATTERN = /^[ \t\n\v\f\r\u00a0\u1680\u2000-\u200a\u2028\u2029\u202f\u205f\u3000\ufeff]*$/;

/* Length in Unicode code points, as PostgreSQL length() counts. */
export function codePointLength(value: string): number {
  return [...value].length;
}

export function isCanonicalText(value: unknown): value is string {
  return typeof value === "string" && !value.includes("\u0000") && !LONE_SURROGATE.test(value) && value.normalize("NFC") === value;
}

export function validateCatalogueProduct(product: CatalogueProduct): void {
  const fail = (message: string): never => {
    throw new PaymentError("INVALID_OBLIGATION", `Catalogue product: ${message}`);
  };
  if (!product || typeof product !== "object") fail("missing.");
  if (typeof product.code !== "string" || !PRODUCT_CODE_PATTERN.test(product.code)) fail("bad code.");
  if (typeof product.version !== "string" || !PRODUCT_VERSION_PATTERN.test(product.version)) fail("bad version.");
  if (typeof product.label !== "string" || BLANK_TEXT_PATTERN.test(product.label) || codePointLength(product.label) > 120) fail("label must be 1-120 characters.");
  if (!product.amount || !Number.isSafeInteger(product.amount.amountMinor) || product.amount.amountMinor <= 0 || product.amount.amountMinor > MAX_AMOUNT_MINOR) {
    fail(`amount must be a positive integer of minor units, at most ${MAX_AMOUNT_MINOR}.`);
  }
  if (!isCanonicalText(product.label)) fail("label must be NFC text without U+0000 or unpaired surrogates.");
  if (product.amount.currency !== "GHS") fail("currency must be GHS.");
  if (product.mode !== "sandbox" && product.mode !== "live") fail("bad mode.");
  if (!Number.isSafeInteger(product.beneficiaryCount) || product.beneficiaryCount < 1 || product.beneficiaryCount > MAX_BENEFICIARIES) {
    fail(`beneficiaryCount must be 1-${MAX_BENEFICIARIES}.`);
  }
  if (!isPlainObject(product.terms)) fail("terms must be an object.");
  canonicalJson(product.terms);
}

/* ---------- Canonical purchase representation ---------- */

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value) && Object.getPrototypeOf(value) === Object.prototype;
}

/* ASCII keys sort identically in JS (UTF-16) and Postgres (COLLATE "C"). */
const TERM_KEY_PATTERN = /^[A-Za-z][A-Za-z0-9_]{0,63}$/;

/*
 * Deterministic JSON: sorted ASCII keys, no whitespace, safe integers only (no
 * decimals: Postgres jsonb keeps "2.50" where JS prints 2.5), no
 * undefined/functions/non-plain objects. Restricted so the 0019 seal trigger
 * can rebuild exactly the same text in SQL.
 */
export function canonicalJson(value: unknown): string {
  if (typeof value === "string") {
    if (!isCanonicalText(value)) throw new PaymentError("INVALID_OBLIGATION", "Purchase term text must be NFC without U+0000 or unpaired surrogates.");
    return JSON.stringify(value);
  }
  if (value === null || typeof value === "boolean") return JSON.stringify(value);
  if (typeof value === "number") {
    if (!Number.isSafeInteger(value)) throw new PaymentError("INVALID_OBLIGATION", "Purchase terms allow safe integers only.");
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (isPlainObject(value)) {
    const keys = Object.keys(value).sort();
    if (keys.some((k) => !TERM_KEY_PATTERN.test(k))) throw new PaymentError("INVALID_OBLIGATION", "Purchase term keys must be ASCII identifiers.");
    return `{${keys.map((k) => `${JSON.stringify(k)}:${canonicalJson(value[k])}`).join(",")}}`;
  }
  throw new PaymentError("INVALID_OBLIGATION", "Purchase terms must be plain JSON values.");
}

export const PURCHASE_CANONICAL_VERSION = "v1";

export interface PurchaseSnapshotFields {
  id: string;
  payerPrincipalId: string;
  productCode: string;
  productVersion: string;
  productLabel: string;
  productTerms: { [key: string]: PurchaseTermValue };
  amountMinor: number;
  currency: string;
  mode: PaymentMode;
  learnerIds: readonly string[];
}

/*
 * B3: every input of the canonical text is validated here, so TypeScript and
 * the 0019 SQL functions (payment_purchase_canonical_text) refuse the same
 * inputs instead of hashing them differently. Vectors:
 * tests/fixtures/payment-canonical-vectors.json.
 */
export function assertCanonicalPurchaseFields(fields: PurchaseSnapshotFields): void {
  const fail = (message: string): never => {
    throw new PaymentError("INVALID_OBLIGATION", `Canonical purchase: ${message}`);
  };
  if (!fields || typeof fields !== "object") fail("fields are required.");
  if (typeof fields.id !== "string" || !OBLIGATION_ID_PATTERN.test(fields.id)) fail("bad obligation id.");
  if (!isCanonicalText(fields.payerPrincipalId) || fields.payerPrincipalId === "" || codePointLength(fields.payerPrincipalId) > MAX_PRINCIPAL_ID_LENGTH) {
    fail("bad payer id.");
  }
  if (typeof fields.productCode !== "string" || !PRODUCT_CODE_PATTERN.test(fields.productCode)) fail("bad product code.");
  if (typeof fields.productVersion !== "string" || !PRODUCT_VERSION_PATTERN.test(fields.productVersion)) fail("bad product version.");
  if (!isCanonicalText(fields.productLabel) || BLANK_TEXT_PATTERN.test(fields.productLabel) || codePointLength(fields.productLabel) > 120) {
    fail("bad product label.");
  }
  if (!isPlainObject(fields.productTerms)) fail("terms must be an object.");
  if (!Number.isSafeInteger(fields.amountMinor) || fields.amountMinor <= 0 || fields.amountMinor > MAX_AMOUNT_MINOR) fail("bad amount.");
  if (typeof fields.currency !== "string" || !/^[A-Z]{3}$/.test(fields.currency)) fail("bad currency.");
  if (fields.mode !== "sandbox" && fields.mode !== "live") fail("bad mode.");
  const learners = fields.learnerIds;
  if (!Array.isArray(learners) || learners.length < 1 || learners.length > MAX_BENEFICIARIES) fail("1-20 learners required.");
  if (learners.some((id) => typeof id !== "string" || !CANONICAL_LEARNER_ID_PATTERN.test(id))) fail("bad learner id.");
  if (new Set(learners).size !== learners.length) fail("duplicate learner id.");
}

/*
 * The canonical text that is hashed (sha256, in services). Built from the
 * typed columns and the beneficiary rows: there is no second copy of the
 * purchase whose fields could drift. The hash is tamper evidence only; it
 * authorises nothing.
 */
export function canonicalPurchaseText(fields: PurchaseSnapshotFields): string {
  assertCanonicalPurchaseFields(fields);
  const learners = [...fields.learnerIds].sort();
  return [
    PURCHASE_CANONICAL_VERSION,
    fields.id,
    fields.payerPrincipalId,
    fields.productCode,
    fields.productVersion,
    fields.productLabel,
    canonicalJson(fields.productTerms),
    String(fields.amountMinor),
    fields.currency,
    fields.mode,
    learners.join(","),
  ].map((part) => JSON.stringify(part)).join("|");
}

/* ---------- Obligation record ---------- */

export interface PaymentObligation {
  id: string;
  payerPrincipalId: string;
  /* Payer-scoped idempotency key for creation. */
  creationKey: string;
  productCode: string;
  productVersion: string;
  productLabel: string;
  productTerms: { [key: string]: PurchaseTermValue };
  amountMinor: number;
  currency: CurrencyCode;
  mode: PaymentMode;
  beneficiaryCount: number;
  snapshotHash: string;
  status: ObligationStatus;
  expiresAt: Date;
  settledReceiptId: string | null;
  settledAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

/* ---------- Beneficiary authorisation (policy guardian_v1) ---------- */

/*
 * Separate capabilities (never implied by one another):
 * - fund a purchase: an authenticated, active principal (no age claim is made);
 * - designate a beneficiary: policy guardian_v1 (active guardian relationship of THIS payer);
 * - manage a learner / view learner records: existing services, never granted by payments;
 * - activate an entitlement: future engine, with its own re-check.
 * Adult learners ("self"), teachers, schools and sponsors need their own approved policies.
 */
export const BENEFICIARY_POLICY_CODES = ["guardian_v1"] as const;

export type BeneficiaryPolicyCode = (typeof BENEFICIARY_POLICY_CODES)[number];

/* Immutable evidence of the authorisation used when the beneficiary was selected. */
export interface BeneficiaryEvidence {
  learnerId: string;
  accessId: string;
  policyCode: BeneficiaryPolicyCode;
  relationshipType: "guardian";
  authorizedAt: Date;
}

/* What payments may read about a principal_learner_access row. */
export interface AccessRecordView {
  id: string;
  principalId: string;
  learnerId: string;
  relationshipType: string;
  status: string;
}

export type GuardianPolicyResult =
  | { ok: true }
  | { ok: false; reason: "NO_ACCESS" | "NOT_ACTIVE" | "NOT_GUARDIAN" | "OTHER_PRINCIPAL" | "OTHER_LEARNER" };

export function evaluateGuardianV1(payerPrincipalId: string, learnerId: string, access: AccessRecordView | null): GuardianPolicyResult {
  if (!access) return { ok: false, reason: "NO_ACCESS" };
  if (access.principalId !== payerPrincipalId) return { ok: false, reason: "OTHER_PRINCIPAL" };
  if (access.learnerId !== learnerId) return { ok: false, reason: "OTHER_LEARNER" };
  if (access.relationshipType !== "guardian") return { ok: false, reason: "NOT_GUARDIAN" };
  if (access.status !== "active") return { ok: false, reason: "NOT_ACTIVE" };
  return { ok: true };
}

/* ---------- Receipts (financial events) ---------- */

export interface PaymentReceipt {
  id: string;
  attemptId: string;
  obligationId: string;
  provider: string;
  mode: PaymentMode;
  merchantContext: string;
  providerReference: string;
  /* OBSERVED amount and currency (may differ from the obligation: that is an exception, not a settlement). */
  amountMinor: number;
  currency: string;
  verifiedAt: Date;
  recordedAt: Date;
}

/* Verification failures that mean the charge may not be ours: no receipt is recorded. */
export const NON_RECEIPT_FAILURES: readonly string[] = [
  "PROVIDER_MISMATCH",
  "REFERENCE_MISMATCH",
  "PROVIDER_REFERENCE_MISMATCH",
  "EXPECTATION_CONFLICT",
  "AMOUNT_NOT_INTEGER",
  "VERIFICATION_UNAVAILABLE",
];

export interface ReceiptSource {
  observedStatus: ProviderPaymentStatus | null;
  observedAmountMinor: number | null;
  observedCurrency: string | null;
  providerReference: string | null;
  verificationFailures: readonly string[] | null;
}

/*
 * A receipt is recorded when, and only when, the provider reported a
 * SUCCESSFUL charge that is identifiably ours, whatever its amount or
 * currency. It records money that moved; it decides nothing about settlement.
 */
export function receiptCandidate(source: ReceiptSource): { amountMinor: number; currency: string; providerReference: string } | null {
  if (source.observedStatus !== "successful") return null;
  if ((source.verificationFailures ?? []).some((f) => NON_RECEIPT_FAILURES.includes(f))) return null;
  if (typeof source.providerReference !== "string" || source.providerReference === "") return null;
  if (!Number.isSafeInteger(source.observedAmountMinor) || (source.observedAmountMinor as number) <= 0) return null;
  if (typeof source.observedCurrency !== "string" || !/^[A-Z]{3}$/.test(source.observedCurrency)) return null;
  return { amountMinor: source.observedAmountMinor as number, currency: source.observedCurrency, providerReference: source.providerReference };
}

/* Exact match: the only kind of receipt that may settle an obligation (DB: composite FK in 0019). */
export function receiptMatchesObligation(
  receipt: Pick<PaymentReceipt, "obligationId" | "amountMinor" | "currency" | "mode">,
  obligation: Pick<PaymentObligation, "id" | "amountMinor" | "currency" | "mode">,
): boolean {
  return (
    receipt.obligationId === obligation.id &&
    receipt.amountMinor === obligation.amountMinor &&
    receipt.currency === obligation.currency &&
    receipt.mode === obligation.mode
  );
}

/* ---------- Financial exceptions ---------- */

export const FINANCIAL_EXCEPTION_KINDS = [
  "amount_mismatch",
  "currency_mismatch",
  "identity_mismatch",
  "attempt_needs_review",
  "duplicate_charge",
  "success_after_failed",
  "success_after_cancel",
  "success_after_expiry",
  "success_during_review",
  "beneficiary_authorization_revoked",
  "provider_record_missing",
  "initiated_after_resolution",
  "reversal_reported",
  "post_settlement_status_change",
] as const;

export type FinancialExceptionKind = (typeof FINANCIAL_EXCEPTION_KINDS)[number];

/*
 * Whether an OPEN exception of this kind blocks fulfilment eligibility. Only a
 * duplicate charge on an already-settled purchase leaves the original purchase
 * valid (the duplicate is money to return, which stays open until a refund
 * policy exists).
 */
export const EXCEPTION_BLOCKS_FULFILMENT: Record<FinancialExceptionKind, boolean> = {
  amount_mismatch: true,
  currency_mismatch: true,
  identity_mismatch: true,
  attempt_needs_review: true,
  duplicate_charge: false,
  success_after_failed: true,
  success_after_cancel: true,
  success_after_expiry: true,
  success_during_review: true,
  beneficiary_authorization_revoked: true,
  provider_record_missing: true,
  initiated_after_resolution: true,
  reversal_reported: true,
  post_settlement_status_change: true,
};

export interface FinancialException {
  id: string;
  obligationId: string;
  attemptId: string | null;
  receiptId: string | null;
  kind: FinancialExceptionKind;
  blocksFulfilment: boolean;
  /* With (obligationId, kind) makes recording idempotent. */
  dedupeKey: string;
  /* Step 3 never resolves exceptions (operator actions are a later, approved step). */
  status: "open" | "resolved";
  openedAt: Date;
  openedBy: "system";
  resolutionCode: null;
  resolvedAt: null;
}

/* ---------- Settlement decision (pure; applied atomically by the store) ---------- */

export interface ObligationOutcomeInput {
  obligationStatus: ObligationStatus;
  attemptFrom: PaymentAttemptStatus;
  attemptTo: PaymentAttemptStatus;
  eventType: string;
  verificationFailures: readonly string[];
  observedStatus: ProviderPaymentStatus | null;
  /* The receipt recorded for this attempt (if any), compared with the obligation. */
  receipt: { exact: boolean; currencyMatches: boolean } | null;
  /* Re-check of every beneficiary's evidence at settlement time. */
  beneficiariesAuthorized: boolean;
}

export interface ObligationOutcome {
  settle: boolean;
  obligationTo: ObligationStatus | null;
  exceptions: FinancialExceptionKind[];
}

const NONE: ObligationOutcome = { settle: false, obligationTo: null, exceptions: [] };

/*
 * Decides what an attempt transition means for its obligation. Only
 * transitions INTO succeeded or needs_review (including a re-observation of a
 * needs_review attempt) can affect an obligation.
 * - Auto-settlement only: attempt -> succeeded (exact receipt) while the obligation is open.
 * - Every other verified success is kept (receipt) and flagged (exception); a
 *   closed obligation goes to review; a settled one keeps its single settlement.
 */
export function decideObligationOutcome(input: ObligationOutcomeInput): ObligationOutcome {
  const status = input.obligationStatus;
  const closedKind: FinancialExceptionKind | null =
    status === "cancelled" ? "success_after_cancel" : status === "expired" ? "success_after_expiry" : null;

  if (input.attemptTo === "succeeded") {
    if (!input.receipt?.exact) {
      throw new PaymentError("PERSISTENCE_ERROR", "A succeeded attempt must have an exact receipt.");
    }
    if (status === "open") {
      return { settle: true, obligationTo: "settled", exceptions: input.beneficiariesAuthorized ? [] : ["beneficiary_authorization_revoked"] };
    }
    if (status === "settled") return { settle: false, obligationTo: null, exceptions: ["duplicate_charge"] };
    if (status === "review") return { settle: false, obligationTo: null, exceptions: ["success_during_review"] };
    return { settle: false, obligationTo: "review", exceptions: [closedKind!] };
  }

  if (input.attemptTo !== "needs_review") return NONE;

  let kind: FinancialExceptionKind;
  if (input.receipt) {
    if (status === "settled") kind = "duplicate_charge";
    else if (!input.receipt.currencyMatches) kind = "currency_mismatch";
    else if (!input.receipt.exact) kind = "amount_mismatch";
    else if (closedKind) kind = closedKind;
    else if (input.attemptFrom === "failed" || input.attemptFrom === "needs_review") kind = "success_after_failed";
    else kind = "attempt_needs_review";
  } else if (input.verificationFailures.some((f) => NON_RECEIPT_FAILURES.includes(f) && f !== "VERIFICATION_UNAVAILABLE" && f !== "AMOUNT_NOT_INTEGER")) {
    kind = "identity_mismatch";
  } else if (input.observedStatus === "reversed") {
    kind = "reversal_reported";
  } else if (input.eventType === "provider_record_missing") {
    kind = "provider_record_missing";
  } else if (input.eventType === "initiated_after_resolution") {
    kind = "initiated_after_resolution";
  } else {
    kind = "attempt_needs_review";
  }
  const obligationTo = status === "settled" || status === "review" ? null : "review";
  return { settle: false, obligationTo, exceptions: [kind] };
}

/* A later observation of an attempt that already SUCCEEDED (the attempt itself never changes). */
export function decidePostSuccessObservation(observedStatus: ProviderPaymentStatus | null, failures: readonly string[]): FinancialExceptionKind | null {
  if (observedStatus === null) return null;
  if (observedStatus === "reversed") return "reversal_reported";
  if (observedStatus !== "successful") return "post_settlement_status_change";
  if (failures.length > 0) return "post_settlement_status_change";
  return null;
}

/* ---------- Fulfilment eligibility (read-only; grants nothing) ---------- */

export type IneligibilityReason =
  | "NOT_SETTLED"
  | "NO_SETTLEMENT_RECEIPT"
  | "SETTLEMENT_RECEIPT_MISMATCH"
  | "BLOCKING_EXCEPTION_OPEN"
  | "MODE_MISMATCH";

export interface FulfilmentEligibility {
  eligible: boolean;
  reasons: IneligibilityReason[];
  /* Open exceptions of any kind: unresolved financial exposure, even when eligible (e.g. a duplicate charge). */
  openExceptions: number;
}

/*
 * The ONLY question a future entitlement engine may ask payments. Eligible
 * means: settled, by an exact receipt for this obligation, with no open
 * blocking exception, in the runtime's own mode. A receipt alone never makes
 * anything eligible. The entitlement engine must still re-check beneficiary
 * authorisation and may grant no more than the obligation's product terms.
 */
export function evaluateFulfilmentEligibility(input: {
  obligation: PaymentObligation;
  receipts: readonly PaymentReceipt[];
  exceptions: readonly FinancialException[];
  runtimeMode: PaymentMode;
}): FulfilmentEligibility {
  const { obligation } = input;
  const reasons: IneligibilityReason[] = [];
  if (obligation.status !== "settled") reasons.push("NOT_SETTLED");
  if (obligation.status === "settled") {
    const receipt = input.receipts.find((r) => r.id === obligation.settledReceiptId);
    if (!receipt) reasons.push("NO_SETTLEMENT_RECEIPT");
    else if (!receiptMatchesObligation(receipt, obligation)) reasons.push("SETTLEMENT_RECEIPT_MISMATCH");
  }
  const open = input.exceptions.filter((e) => e.obligationId === obligation.id && e.status === "open");
  if (open.some((e) => e.blocksFulfilment)) reasons.push("BLOCKING_EXCEPTION_OPEN");
  if (obligation.mode !== input.runtimeMode) reasons.push("MODE_MISMATCH");
  return { eligible: reasons.length === 0, reasons, openExceptions: open.length };
}
