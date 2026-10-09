import assert from "node:assert/strict";

import {
  createPrincipalLearnerAccess,
  revokePrincipalLearnerAccess,
  listAuthorizedLearnersForPrincipal,
  resolveOrCreatePrincipalForExternalIdentity,
} from "../services/principal";

import {
  ensureLearnerExists,
} from "../services/learner";

const suffix = Date.now().toString();

let principalId = "";

const learnerId =
  `cluster5c-learner-${suffix}`;

const otherLearnerId =
  `cluster5c-other-${suffix}`;

async function run() {
  principalId =
    await resolveOrCreatePrincipalForExternalIdentity(
      "cluster5c-test",
      `principal-${suffix}`,
    );

  await ensureLearnerExists(learnerId);
  await ensureLearnerExists(otherLearnerId);

  await createPrincipalLearnerAccess(
    `cluster5c-access-${suffix}`,
    principalId,
    learnerId,
    "guardian",
  );

  const authorized =
    await listAuthorizedLearnersForPrincipal(
      principalId,
    );

  assert.equal(
    authorized.some(
      (item) =>
        item.learnerId === learnerId &&
        item.relationshipType === "guardian",
    ),
    true,
  );

  assert.equal(
    authorized.some(
      (item) =>
        item.learnerId === otherLearnerId,
    ),
    false,
  );

  await revokePrincipalLearnerAccess(
    principalId,
    learnerId,
    "guardian",
  );

  const afterRevocation =
    await listAuthorizedLearnersForPrincipal(
      principalId,
    );

  assert.equal(
    afterRevocation.some(
      (item) => item.learnerId === learnerId,
    ),
    false,
  );

  console.log({
    cluster5CSafeguarding: "PASS",
    relationshipScopedAccess: true,
    crossLearnerExposureDenied: true,
    revokedAccessDenied: true,
  });
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});

