import { persistenceStore } from "../services/persistence-provider";
import {
  createInitialLearnerState,
  getLearnerState,
  saveLearnerState,
} from "../services/learner-state";

function assert(
  condition: boolean,
  message: string,
): void {
  if (!condition) {
    throw new Error(`FAIL: ${message}`);
  }
}

async function assertRejects(
  action: () => Promise<unknown>,
  message: string,
): Promise<void> {
  try {
    await action();
  } catch {
    return;
  }

  throw new Error(`FAIL: ${message}`);
}

async function runPrincipalIdentityTests(): Promise<void> {
  const principalId =
    `principal-${crypto.randomUUID()}`;

  await persistenceStore.createPrincipal(
    principalId,
  );

  const status =
    await persistenceStore.getPrincipalStatus(
      principalId,
    );

  assert(
    status === "active",
    "newly created principal must resolve status 'active'",
  );

  console.log({
    test: "principal creation and status resolution",
    result: "PASS",
  });

  const providerNamespace =
    `provider-${crypto.randomUUID()}`;

  const providerSubject =
    `subject-${crypto.randomUUID()}`;

  await persistenceStore.createExternalIdentity(
    `external-identity-${crypto.randomUUID()}`,
    principalId,
    providerNamespace,
    providerSubject,
  );

  const resolvedPrincipalId =
    await persistenceStore.getPrincipalIdByExternalIdentity(
      providerNamespace,
      providerSubject,
    );

  assert(
    resolvedPrincipalId === principalId,
    "external identity must resolve to the mapped principal",
  );

  console.log({
    test: "external identity maps to existing principal",
    result: "PASS",
  });

  await assertRejects(
    () =>
      persistenceStore.createExternalIdentity(
        `external-identity-${crypto.randomUUID()}`,
        `principal-missing-${crypto.randomUUID()}`,
        `provider-${crypto.randomUUID()}`,
        `subject-${crypto.randomUUID()}`,
      ),
    "external identity must not be creatable against a missing principal",
  );

  console.log({
    test: "external identity cannot reference a missing principal",
    result: "PASS",
  });

  await assertRejects(
    () =>
      persistenceStore.createExternalIdentity(
        `external-identity-${crypto.randomUUID()}`,
        principalId,
        providerNamespace,
        providerSubject,
      ),
    "duplicate (provider_namespace, provider_subject) must not map twice",
  );

  console.log({
    test: "duplicate provider namespace and subject rejected",
    result: "PASS",
  });

  const secondPrincipalId =
    `principal-${crypto.randomUUID()}`;

  await persistenceStore.createPrincipal(
    secondPrincipalId,
  );

  await persistenceStore.createExternalIdentity(
    `external-identity-${crypto.randomUUID()}`,
    secondPrincipalId,
    `provider-${crypto.randomUUID()}`,
    providerSubject,
  );

  console.log({
    test: "same provider subject under a different provider namespace is allowed",
    result: "PASS",
  });

  const secondExternalIdentityForFirstPrincipal =
    `external-identity-${crypto.randomUUID()}`;

  const secondProviderNamespaceForFirstPrincipal =
    `provider-${crypto.randomUUID()}`;

  const secondProviderSubjectForFirstPrincipal =
    `subject-${crypto.randomUUID()}`;

  await persistenceStore.createExternalIdentity(
    secondExternalIdentityForFirstPrincipal,
    principalId,
    secondProviderNamespaceForFirstPrincipal,
    secondProviderSubjectForFirstPrincipal,
  );

  const resolvedPrincipalIdForSecondIdentity =
    await persistenceStore.getPrincipalIdByExternalIdentity(
      secondProviderNamespaceForFirstPrincipal,
      secondProviderSubjectForFirstPrincipal,
    );

  assert(
    resolvedPrincipalIdForSecondIdentity ===
      principalId,
    "multiple distinct external identities must resolve to the same principal",
  );

  console.log({
    test: "multiple external identities may map to one principal",
    result: "PASS",
  });

  const learnerId =
    `learner-${crypto.randomUUID()}`;

  const competencyId =
    "competency-test-001";

  await persistenceStore.ensureLearnerExists(
    learnerId,
  );

  const initialLearnerState =
    createInitialLearnerState(
      learnerId,
      competencyId,
    );

  await saveLearnerState(
    initialLearnerState,
  );

  const learnerStateBefore =
    await getLearnerState(
      learnerId,
      competencyId,
    );

  await persistenceStore.createPrincipal(
    `principal-${crypto.randomUUID()}`,
  );

  const unrelatedPrincipalId =
    `principal-${crypto.randomUUID()}`;

  await persistenceStore.createPrincipal(
    unrelatedPrincipalId,
  );

  await persistenceStore.createExternalIdentity(
    `external-identity-${crypto.randomUUID()}`,
    unrelatedPrincipalId,
    `provider-${crypto.randomUUID()}`,
    `subject-${crypto.randomUUID()}`,
  );

  const learnerStateAfter =
    await getLearnerState(
      learnerId,
      competencyId,
    );

  assert(
    learnerStateAfter?.learnerId === learnerId,
    "learner ID must remain unchanged after principal/external identity creation",
  );

  assert(
    JSON.stringify(learnerStateAfter) ===
      JSON.stringify(learnerStateBefore),
    "learner state must not be created or modified by principal/external identity operations",
  );

  console.log({
    test: "creating principals/external identities does not create or modify learners",
    result: "PASS",
  });

  if (process.env.FILUMIRE_PERSISTENCE === "postgres") {
    const { pool } = await import(
      "../services/database"
    );

    try {
      const rows = await pool.query(
        `SELECT conname, convalidated
         FROM pg_constraint
         WHERE conname = ANY($1::text[])`,
        [[
          "interventions_learner_id_learners_id_fk",
          "learner_states_learner_id_learners_id_fk",
          "learning_evidence_learner_id_learners_id_fk",
          "sessions_learner_id_learners_id_fk",
        ]],
      );

      assert(
        rows.rows.length === 4,
        "all four Stage 1 learner foreign keys must still exist",
      );

      assert(
        rows.rows.every(
          (row: { convalidated: boolean }) =>
            row.convalidated,
        ),
        "all four Stage 1 learner foreign keys must remain validated",
      );

      console.log({
        test: "Stage 1 learner foreign keys remain intact",
        result: "PASS",
      });
    } finally {
      await pool.end();
    }
  }

  console.log({
    principalIdentityTest: "PASS",
  });
}

runPrincipalIdentityTests().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
