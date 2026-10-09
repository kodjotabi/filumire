/*
 * Input validation for a new obligation, shared by the memory and Postgres
 * ledgers (B3; extracted unchanged from memory-ledger.ts, B2) so both refuse
 * exactly the same direct-store calls before touching state. The database
 * (0019 CHECKs, triggers, seal check) enforces the same rules again.
 */
import {
  assertSandboxOnly,
  BLANK_TEXT_PATTERN,
  canonicalJson,
  codePointLength,
  CREATION_KEY_PATTERN,
  isSupportedCurrency,
  MAX_BENEFICIARIES,
  OBLIGATION_ID_PATTERN,
  PaymentError,
  PRODUCT_CODE_PATTERN,
  PRODUCT_VERSION_PATTERN,
  type BeneficiaryEvidence,
  type PaymentObligation,
} from "../../../packages/payments";
import { purchaseSnapshotHash } from "./snapshot";
import type { NewObligation } from "./store";

export interface ValidatedObligation {
  obligation: PaymentObligation;
  evidence: BeneficiaryEvidence[];
  learnerIds: string[];
}

export function validateNewObligation(input: NewObligation): ValidatedObligation {
  const o = input?.obligation;
  const evidence = input?.beneficiaries;
  const fail = (message: string): never => {
    throw new PaymentError("INVALID_OBLIGATION", message);
  };
  if (!o || !Array.isArray(evidence)) fail("obligation and beneficiaries are required.");
  /* Database CHECK in 0019: step 3 obligations are sandbox only. */
  assertSandboxOnly(o.mode);
  if (!OBLIGATION_ID_PATTERN.test(o.id ?? "")) fail("bad obligation id.");
  if (!CREATION_KEY_PATTERN.test(o.creationKey ?? "")) fail("bad creation key.");
  if (typeof o.payerPrincipalId !== "string" || o.payerPrincipalId === "") fail("payer required.");
  if (!PRODUCT_CODE_PATTERN.test(o.productCode ?? "") || !PRODUCT_VERSION_PATTERN.test(o.productVersion ?? "")) fail("bad product code/version.");
  if (typeof o.productLabel !== "string" || BLANK_TEXT_PATTERN.test(o.productLabel) || codePointLength(o.productLabel) > 120) fail("bad product label.");
  canonicalJson(o.productTerms);
  if (!Number.isSafeInteger(o.amountMinor) || o.amountMinor <= 0) fail("amount must be a positive integer of minor units.");
  if (!isSupportedCurrency(o.currency)) fail("unsupported currency.");
  if (o.status !== "open" || o.settledReceiptId !== null || o.settledAt !== null) fail("a new obligation must be open and unsettled.");
  if (!(o.expiresAt instanceof Date) || !(o.createdAt instanceof Date) || o.expiresAt.getTime() <= o.createdAt.getTime()) fail("expiresAt must be after createdAt.");
  if (!/^[0-9a-f]{64}$/.test(o.snapshotHash ?? "")) fail("bad snapshot hash.");
  const learnerIds = evidence.map((e) => e.learnerId);
  if (evidence.length < 1 || evidence.length > MAX_BENEFICIARIES || o.beneficiaryCount !== evidence.length) fail("beneficiary count mismatch.");
  if (new Set(learnerIds).size !== learnerIds.length) fail("duplicate beneficiary.");
  for (const item of evidence) {
    if (item.policyCode !== "guardian_v1" || item.relationshipType !== "guardian" || !(item.authorizedAt instanceof Date)) fail("bad beneficiary evidence.");
  }
  return { obligation: o, evidence, learnerIds };
}

/* Seal check (0019: deferred constraint trigger recomputes it in SQL): the hash must match the columns and beneficiary rows. */
export function assertSnapshotHash(o: PaymentObligation, learnerIds: readonly string[]): void {
  if (purchaseSnapshotHash({ ...o, learnerIds }) !== o.snapshotHash) {
    throw new PaymentError("INVALID_OBLIGATION", "snapshot hash does not match the purchase.");
  }
}
