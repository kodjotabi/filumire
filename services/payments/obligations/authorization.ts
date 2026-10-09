/*
 * Payer and beneficiary authorisation for obligations (Payments Phase 2, step 3).
 *
 * Payments READ identity data through PaymentIdentityDirectory and never write
 * it. Capabilities are separate (see packages/payments/obligation.ts):
 * funding needs an active principal (no age claim); designating a beneficiary
 * needs policy guardian_v1. Every refusal about a learner gives the same
 * answer, so learner ids cannot be probed.
 *
 * Not wired to services/principal yet: that adapter needs an access-row lookup
 * by id and belongs with the route step (identity must come from a production
 * session, never a development header).
 */
import {
  evaluateGuardianV1,
  PaymentError,
  type AccessRecordView,
  type BeneficiaryEvidence,
} from "../../../packages/payments";

export interface PaymentIdentityDirectory {
  findPrincipal(principalId: string): Promise<{ id: string; status: string } | null>;
  /* The payer's guardian relationship with the learner, if any (any status). */
  findGuardianAccess(principalId: string, learnerId: string): Promise<AccessRecordView | null>;
  findAccessById(accessId: string): Promise<AccessRecordView | null>;
}

const BENEFICIARY_REFUSAL = "The payer is not authorised to purchase for one or more of these learners.";

export async function authorizeFunding(directory: PaymentIdentityDirectory, principalId: string): Promise<void> {
  const principal = typeof principalId === "string" && principalId !== "" ? await directory.findPrincipal(principalId) : null;
  if (!principal || principal.status !== "active") {
    throw new PaymentError("PAYER_NOT_AUTHORIZED", "An active, authenticated payer account is required.");
  }
}

/* Selection time: returns immutable evidence for every learner, or refuses the whole request. */
export async function authorizeBeneficiaries(
  directory: PaymentIdentityDirectory,
  payerPrincipalId: string,
  learnerIds: readonly string[],
  at: Date,
): Promise<BeneficiaryEvidence[]> {
  const evidence: BeneficiaryEvidence[] = [];
  for (const learnerId of learnerIds) {
    const access = await directory.findGuardianAccess(payerPrincipalId, learnerId);
    if (!evaluateGuardianV1(payerPrincipalId, learnerId, access).ok) {
      throw new PaymentError("BENEFICIARY_NOT_AUTHORIZED", BENEFICIARY_REFUSAL);
    }
    evidence.push({ learnerId, accessId: access!.id, policyCode: "guardian_v1", relationshipType: "guardian", authorizedAt: at });
  }
  return evidence;
}

/* Re-check of recorded evidence (checkout initiation, settlement). Evidence itself is never changed. */
export async function recheckEvidence(
  directory: PaymentIdentityDirectory,
  payerPrincipalId: string,
  evidence: readonly BeneficiaryEvidence[],
): Promise<{ allAuthorized: boolean; failedLearnerIds: string[] }> {
  const failedLearnerIds: string[] = [];
  for (const item of evidence) {
    const access = await directory.findAccessById(item.accessId);
    if (item.policyCode !== "guardian_v1" || !evaluateGuardianV1(payerPrincipalId, item.learnerId, access).ok) {
      failedLearnerIds.push(item.learnerId);
    }
  }
  return { allAuthorized: failedLearnerIds.length === 0, failedLearnerIds };
}

export function beneficiaryRefusal(): PaymentError {
  return new PaymentError("BENEFICIARY_NOT_AUTHORIZED", BENEFICIARY_REFUSAL);
}

/* In-memory directory for tests and local development. Revocation is a status change, as in the database. */
export class MemoryPaymentIdentityDirectory implements PaymentIdentityDirectory {
  private readonly principals = new Map<string, { id: string; status: string }>();
  private readonly access = new Map<string, AccessRecordView>();

  addPrincipal(id: string, status = "active"): void {
    this.principals.set(id, { id, status });
  }

  setPrincipalStatus(id: string, status: string): void {
    const found = this.principals.get(id);
    if (found) found.status = status;
  }

  addAccess(record: AccessRecordView): void {
    this.access.set(record.id, { ...record });
  }

  setAccessStatus(accessId: string, status: string): void {
    const found = this.access.get(accessId);
    if (found) found.status = status;
  }

  async findPrincipal(principalId: string) {
    const found = this.principals.get(principalId);
    return found ? { ...found } : null;
  }

  async findGuardianAccess(principalId: string, learnerId: string) {
    const found = [...this.access.values()].find(
      (a) => a.principalId === principalId && a.learnerId === learnerId && a.relationshipType === "guardian",
    );
    return found ? { ...found } : null;
  }

  async findAccessById(accessId: string) {
    const found = this.access.get(accessId);
    return found ? { ...found } : null;
  }
}
