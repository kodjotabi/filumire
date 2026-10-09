/*
 * Obligation service (Payments Phase 2, step 3, B2): creates immutable,
 * catalogue-priced, sandbox-only purchase obligations for authorised
 * beneficiaries; payer cancellation; expiry sweep; read-only fulfilment
 * eligibility. Grants nothing and has no operator actions.
 *
 * There is no amount parameter anywhere: the price comes from the catalogue.
 * The payer principal must come from an authenticated, trusted context
 * (production session); no route calls this yet.
 */
import { randomUUID } from "node:crypto";
import {
  assertSandboxOnly,
  CREATION_KEY_PATTERN,
  evaluateFulfilmentEligibility,
  MAX_BENEFICIARIES,
  PaymentError,
  validateCatalogueProduct,
  type FulfilmentEligibility,
  type PaymentMode,
  type PaymentObligation,
} from "../../../packages/payments";
import { authorizeBeneficiaries, authorizeFunding, type PaymentIdentityDirectory } from "./authorization";
import type { ProductCatalogue } from "./catalogue";
import { purchaseSnapshotHash } from "./snapshot";
import type { ObligationStore, ObligationTransitionResult } from "./store";

const LEARNER_ID_PATTERN = /^[A-Za-z0-9._:-]{1,200}$/;
const MAX_PAYABLE_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;

export interface ObligationServiceOptions {
  mode: PaymentMode;
  catalogue: ProductCatalogue;
  store: ObligationStore;
  directory: PaymentIdentityDirectory;
  /* How long a new obligation stays payable. A commercial decision; sandbox callers choose it explicitly. */
  payableWindowMs: number;
  now?: () => Date;
  newId?: () => string;
}

export interface CreateObligationRequest {
  /* From an authenticated context, never from a request body. */
  payerPrincipalId: string;
  /* Payer-scoped idempotency key (e.g. per checkout form). */
  creationKey: string;
  productCode: string;
  beneficiaryLearnerIds: string[];
}

export type CreateObligationOutcome = { kind: "created" | "replayed"; obligation: PaymentObligation };

export class ObligationService {
  private readonly now: () => Date;
  private readonly newId: () => string;

  constructor(private readonly options: ObligationServiceOptions) {
    assertSandboxOnly(options.mode);
    if (options.catalogue.mode !== options.mode) {
      throw new PaymentError("SANDBOX_ONLY", "The catalogue's mode does not match the service mode.");
    }
    if (!Number.isSafeInteger(options.payableWindowMs) || options.payableWindowMs <= 0 || options.payableWindowMs > MAX_PAYABLE_WINDOW_MS) {
      throw new PaymentError("CONFIGURATION", "payableWindowMs must be a positive integer of at most 30 days.");
    }
    this.now = options.now ?? (() => new Date());
    this.newId = options.newId ?? (() => `obl_${randomUUID().replace(/-/g, "")}`);
  }

  async createObligation(request: CreateObligationRequest): Promise<CreateObligationOutcome> {
    const { payerPrincipalId, creationKey, productCode } = request ?? ({} as CreateObligationRequest);
    const learnerIds = request?.beneficiaryLearnerIds;
    if (typeof creationKey !== "string" || !CREATION_KEY_PATTERN.test(creationKey)) {
      throw new PaymentError("INVALID_OBLIGATION", "creationKey must be 8-200 characters of letters, digits, '.', '_', ':' or '-'.");
    }
    if (!Array.isArray(learnerIds) || learnerIds.length < 1 || learnerIds.length > MAX_BENEFICIARIES) {
      throw new PaymentError("INVALID_OBLIGATION", `Between 1 and ${MAX_BENEFICIARIES} beneficiaries are required.`);
    }
    if (learnerIds.some((id) => typeof id !== "string" || !LEARNER_ID_PATTERN.test(id)) || new Set(learnerIds).size !== learnerIds.length) {
      throw new PaymentError("INVALID_OBLIGATION", "Beneficiaries must be distinct learner ids.");
    }

    await authorizeFunding(this.options.directory, payerPrincipalId);

    const product = this.options.catalogue.resolve(productCode);
    if (!product) throw new PaymentError("PRODUCT_NOT_AVAILABLE", "This product is not available.");
    validateCatalogueProduct(product);
    if (product.mode !== this.options.mode) throw new PaymentError("SANDBOX_ONLY", "Product mode does not match the service mode.");
    if (learnerIds.length !== product.beneficiaryCount) {
      throw new PaymentError("INVALID_OBLIGATION", `This product covers exactly ${product.beneficiaryCount} learner(s).`);
    }

    const prior = await this.options.store.findObligationByCreationKey(payerPrincipalId, creationKey);
    if (prior) return this.replay(prior, productCode, product.version, learnerIds);

    const at = this.now();
    const evidence = await authorizeBeneficiaries(this.options.directory, payerPrincipalId, learnerIds, at);
    const id = this.newId();
    const base = {
      id,
      payerPrincipalId,
      creationKey,
      productCode: product.code,
      productVersion: product.version,
      productLabel: product.label,
      productTerms: product.terms,
      amountMinor: product.amount.amountMinor,
      currency: product.amount.currency,
      mode: product.mode,
    };
    const obligation: PaymentObligation = {
      ...base,
      beneficiaryCount: evidence.length,
      snapshotHash: purchaseSnapshotHash({ ...base, learnerIds }),
      status: "open",
      expiresAt: new Date(at.getTime() + this.options.payableWindowMs),
      settledReceiptId: null,
      settledAt: null,
      createdAt: at,
      updatedAt: at,
    };
    const result = await this.options.store.createObligation({ obligation, beneficiaries: evidence });
    if (result.created) return { kind: "created", obligation: result.obligation };
    return this.replay(result.existing, productCode, product.version, learnerIds);
  }

  /* Same creation key: the same purchase is returned; a different purchase is refused. */
  private async replay(existing: PaymentObligation, productCode: string, productVersion: string, learnerIds: string[]): Promise<CreateObligationOutcome> {
    const stored = (await this.options.store.listBeneficiaries(existing.id)).map((b) => b.learnerId).sort();
    const same =
      existing.productCode === productCode &&
      existing.productVersion === productVersion &&
      JSON.stringify(stored) === JSON.stringify([...learnerIds].sort());
    if (!same) throw new PaymentError("OBLIGATION_CONFLICT", "This creation key was already used for a different purchase.");
    return { kind: "replayed", obligation: existing };
  }

  /* The payer's own obligation; anything else is "not found". */
  async getForPayer(payerPrincipalId: string, obligationId: string): Promise<PaymentObligation> {
    const found = await this.options.store.findObligation(obligationId);
    if (!found || found.payerPrincipalId !== payerPrincipalId) throw new PaymentError("OBLIGATION_NOT_FOUND", "Unknown payment obligation.");
    return found;
  }

  async cancel(payerPrincipalId: string, obligationId: string): Promise<ObligationTransitionResult> {
    return this.options.store.cancelObligation(obligationId, payerPrincipalId, this.now());
  }

  /* Expires open obligations past their window that have no active attempt. Returns the ids expired. */
  async expireDue(limit = 50): Promise<string[]> {
    const at = this.now();
    const expired: string[] = [];
    for (const candidate of await this.options.store.listExpirable(at, limit)) {
      const result = await this.options.store.expireObligation(candidate.id, at);
      if (result.applied) expired.push(candidate.id);
    }
    return expired;
  }

  /* Read-only: the only payment question a future entitlement engine may ask. Grants nothing. */
  async eligibility(obligationId: string): Promise<FulfilmentEligibility> {
    const obligation = await this.options.store.findObligation(obligationId);
    if (!obligation) throw new PaymentError("OBLIGATION_NOT_FOUND", "Unknown payment obligation.");
    return evaluateFulfilmentEligibility({
      obligation,
      receipts: await this.options.store.listReceipts(obligationId),
      exceptions: await this.options.store.listExceptions(obligationId),
      runtimeMode: this.options.mode,
    });
  }
}
