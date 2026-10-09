import type {
  PrincipalLearnerAccessRecord,
  PrincipalLearnerRelationshipType,
} from "../persistence";

import {
  persistenceStore,
} from "../persistence-provider";

export async function resolveOrCreatePrincipalForExternalIdentity(
  providerNamespace: string,
  providerSubject: string,
): Promise<string> {
  return persistenceStore.resolveOrCreatePrincipalForExternalIdentity(
    providerNamespace,
    providerSubject,
  );
}

export async function createPrincipalLearnerAccess(
  accessId: string,
  principalId: string,
  learnerId: string,
  relationshipType: PrincipalLearnerRelationshipType,
): Promise<void> {
  await persistenceStore.createPrincipalLearnerAccess(
    accessId,
    principalId,
    learnerId,
    relationshipType,
  );
}

export async function getPrincipalLearnerAccess(
  principalId: string,
  learnerId: string,
  relationshipType: PrincipalLearnerRelationshipType,
): Promise<PrincipalLearnerAccessRecord | undefined> {
  return persistenceStore.getPrincipalLearnerAccess(
    principalId,
    learnerId,
    relationshipType,
  );
}

export async function listLearnersForPrincipal(
  principalId: string,
): Promise<string[]> {
  return persistenceStore.listLearnersForPrincipal(principalId);
}

const RELATIONSHIP_TYPES: PrincipalLearnerRelationshipType[] = [
  "self",
  "guardian",
  "teacher",
];

export interface AuthorizedLearnerAccess {
  learnerId: string;
  relationshipType: PrincipalLearnerRelationshipType;
}

/*
 * Returns only the Learners a Principal is currently
 * actively authorized to supervise, with relationship
 * type preserved. Revoked relationships never appear.
 */
export async function listAuthorizedLearnersForPrincipal(
  principalId: string,
): Promise<AuthorizedLearnerAccess[]> {
  const learnerIds =
    await listLearnersForPrincipal(principalId);

  const results: AuthorizedLearnerAccess[] = [];

  for (const learnerId of learnerIds) {
    for (const relationshipType of RELATIONSHIP_TYPES) {
      const record = await getPrincipalLearnerAccess(
        principalId,
        learnerId,
        relationshipType,
      );

      if (record && record.status === "active") {
        results.push({ learnerId, relationshipType });
        break;
      }
    }
  }

  return results;
}

export async function isPrincipalAuthorizedForLearner(
  principalId: string,
  learnerId: string,
): Promise<boolean> {
  return persistenceStore.isPrincipalAuthorizedForLearner(
    principalId,
    learnerId,
  );
}

export async function revokePrincipalLearnerAccess(
  principalId: string,
  learnerId: string,
  relationshipType: PrincipalLearnerRelationshipType,
): Promise<void> {
  await persistenceStore.revokePrincipalLearnerAccess(
    principalId,
    learnerId,
    relationshipType,
  );
}

export async function listAuthorizedTeacherLearnersForPrincipal(
  principalId: string,
): Promise<AuthorizedLearnerAccess[]> {
  const learnerIds =
    await listLearnersForPrincipal(principalId);

  const results: AuthorizedLearnerAccess[] = [];

  for (const learnerId of learnerIds) {
    const record = await getPrincipalLearnerAccess(
      principalId,
      learnerId,
      "teacher",
    );

    if (record && record.status === "active") {
      results.push({
        learnerId,
        relationshipType: "teacher",
      });
    }
  }

  return results;
}
