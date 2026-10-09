import { deleteTestLearners } from "./postgres-test-cleanup";
import { persistenceStore } from "../services/persistence-provider";
import {
  createInitialLearnerState,
  getLearnerState,
  saveLearnerState,
} from "../services/learner-state";
import { getEvidence } from "../services/evidence-store";
import { getLearnerInterventions } from "../services/intervention-store";

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

const createdPrincipalIds: string[] = [];
const createdLearnerIds: string[] = [];

async function createTestPrincipal(): Promise<string> {
  const principalId = `principal-${crypto.randomUUID()}`;
  await persistenceStore.createPrincipal(principalId);
  createdPrincipalIds.push(principalId);
  return principalId;
}

async function createTestLearner(): Promise<string> {
  const learnerId = `learner-${crypto.randomUUID()}`;
  await persistenceStore.ensureLearnerExists(learnerId);
  createdLearnerIds.push(learnerId);
  return learnerId;
}

async function runPrincipalLearnerAccessTests(): Promise<void> {
  const isPostgres =
    process.env.FILUMIRE_PERSISTENCE === "postgres";

  const pool = isPostgres
    ? (await import("../services/database")).pool
    : undefined;

  try {
    // A. create self relationship
    const principalA = await createTestPrincipal();
    const learnerA = await createTestLearner();

    await persistenceStore.createPrincipalLearnerAccess(
      `access-${crypto.randomUUID()}`,
      principalA,
      learnerA,
      "self",
    );

    const accessA =
      await persistenceStore.getPrincipalLearnerAccess(
        principalA,
        learnerA,
        "self",
      );

    assert(
      accessA?.status === "active",
      "self relationship must be created active",
    );

    assert(
      await persistenceStore.isPrincipalAuthorizedForLearner(
        principalA,
        learnerA,
      ),
      "principal must be authorized for learner via self relationship",
    );

    console.log({ test: "A: create self relationship", result: "PASS" });

    // B. create guardian relationship
    const principalB = await createTestPrincipal();
    const learnerB = await createTestLearner();

    await persistenceStore.createPrincipalLearnerAccess(
      `access-${crypto.randomUUID()}`,
      principalB,
      learnerB,
      "guardian",
    );

    assert(
      await persistenceStore.isPrincipalAuthorizedForLearner(
        principalB,
        learnerB,
      ),
      "principal must be authorized for learner via guardian relationship",
    );

    console.log({ test: "B: create guardian relationship", result: "PASS" });

    // C. one Principal -> multiple Learners
    const principalC = await createTestPrincipal();
    const learnerC1 = await createTestLearner();
    const learnerC2 = await createTestLearner();

    await persistenceStore.createPrincipalLearnerAccess(
      `access-${crypto.randomUUID()}`,
      principalC,
      learnerC1,
      "self",
    );
    await persistenceStore.createPrincipalLearnerAccess(
      `access-${crypto.randomUUID()}`,
      principalC,
      learnerC2,
      "guardian",
    );

    const learnersForC =
      await persistenceStore.listLearnersForPrincipal(
        principalC,
      );

    assert(
      new Set(learnersForC).size === 2 &&
        learnersForC.includes(learnerC1) &&
        learnersForC.includes(learnerC2),
      "principal with two active relationships must list both learners",
    );

    console.log({
      test: "C: one Principal -> multiple Learners",
      result: "PASS",
    });

    // D. one Learner -> multiple Principals
    const learnerD = await createTestLearner();
    const principalD1 = await createTestPrincipal();
    const principalD2 = await createTestPrincipal();

    await persistenceStore.createPrincipalLearnerAccess(
      `access-${crypto.randomUUID()}`,
      principalD1,
      learnerD,
      "self",
    );
    await persistenceStore.createPrincipalLearnerAccess(
      `access-${crypto.randomUUID()}`,
      principalD2,
      learnerD,
      "guardian",
    );

    assert(
      (await persistenceStore.isPrincipalAuthorizedForLearner(
        principalD1,
        learnerD,
      )) &&
        (await persistenceStore.isPrincipalAuthorizedForLearner(
          principalD2,
          learnerD,
        )),
      "both principals must independently resolve authorization for the shared learner",
    );

    console.log({
      test: "D: one Learner -> multiple Principals",
      result: "PASS",
    });

    // E. revoked relationship
    const principalE = await createTestPrincipal();
    const learnerE = await createTestLearner();

    await persistenceStore.createPrincipalLearnerAccess(
      `access-${crypto.randomUUID()}`,
      principalE,
      learnerE,
      "self",
    );

    await persistenceStore.revokePrincipalLearnerAccess(
      principalE,
      learnerE,
      "self",
    );

    const revokedAccessE =
      await persistenceStore.getPrincipalLearnerAccess(
        principalE,
        learnerE,
        "self",
      );

    assert(
      revokedAccessE !== undefined,
      "revoked relationship must remain stored",
    );

    assert(
      revokedAccessE?.status === "revoked",
      "revoked relationship must have status 'revoked'",
    );

    assert(
      !(await persistenceStore.isPrincipalAuthorizedForLearner(
        principalE,
        learnerE,
      )),
      "revoked relationship must not authorize access",
    );

    const learnersForE =
      await persistenceStore.listLearnersForPrincipal(
        principalE,
      );

    assert(
      !learnersForE.includes(learnerE),
      "revoked learner must not appear in the active listing",
    );

    console.log({ test: "E: revoked relationship", result: "PASS" });

    // F. unrelated Principal
    const principalF1 = await createTestPrincipal();
    const principalF2 = await createTestPrincipal();
    const learnerF = await createTestLearner();

    await persistenceStore.createPrincipalLearnerAccess(
      `access-${crypto.randomUUID()}`,
      principalF1,
      learnerF,
      "self",
    );

    assert(
      !(await persistenceStore.isPrincipalAuthorizedForLearner(
        principalF2,
        learnerF,
      )),
      "an unrelated principal must not be authorized for another principal's learner",
    );

    console.log({ test: "F: unrelated Principal", result: "PASS" });

    // G. missing Principal
    const learnerG = await createTestLearner();

    await assertRejects(
      () =>
        persistenceStore.createPrincipalLearnerAccess(
          `access-${crypto.randomUUID()}`,
          `principal-missing-${crypto.randomUUID()}`,
          learnerG,
          "self",
        ),
      "relationship creation must fail for a missing principal",
    );

    console.log({ test: "G: missing Principal", result: "PASS" });

    // H. missing Learner
    const principalH = await createTestPrincipal();

    await assertRejects(
      () =>
        persistenceStore.createPrincipalLearnerAccess(
          `access-${crypto.randomUUID()}`,
          principalH,
          `learner-missing-${crypto.randomUUID()}`,
          "self",
        ),
      "relationship creation must fail for a missing learner",
    );

    console.log({ test: "H: missing Learner", result: "PASS" });

    // I. duplicate relationship
    const principalI = await createTestPrincipal();
    const learnerI = await createTestLearner();

    await persistenceStore.createPrincipalLearnerAccess(
      `access-${crypto.randomUUID()}`,
      principalI,
      learnerI,
      "self",
    );

    await assertRejects(
      () =>
        persistenceStore.createPrincipalLearnerAccess(
          `access-${crypto.randomUUID()}`,
          principalI,
          learnerI,
          "self",
        ),
      "duplicate (principal, learner, relationshipType) must not create a second relationship",
    );

    if (pool) {
      const duplicateRows = await pool.query(
        `SELECT COUNT(*)::int AS count FROM principal_learner_access
         WHERE principal_id = $1 AND learner_id = $2 AND relationship_type = $3`,
        [principalI, learnerI, "self"],
      );

      assert(
        duplicateRows.rows[0].count === 1,
        "duplicate relationship attempt must not create a second row",
      );
    }

    console.log({ test: "I: duplicate relationship", result: "PASS" });

    // J. multiple relationship types
    const principalJ = await createTestPrincipal();
    const learnerJ = await createTestLearner();

    await persistenceStore.createPrincipalLearnerAccess(
      `access-${crypto.randomUUID()}`,
      principalJ,
      learnerJ,
      "self",
    );
    await persistenceStore.createPrincipalLearnerAccess(
      `access-${crypto.randomUUID()}`,
      principalJ,
      learnerJ,
      "guardian",
    );

    const learnersForJBeforeRevoke =
      await persistenceStore.listLearnersForPrincipal(
        principalJ,
      );

    assert(
      learnersForJBeforeRevoke.filter(
        (id) => id === learnerJ,
      ).length === 1,
      "a learner with two active relationship types must be listed only once",
    );

    await persistenceStore.revokePrincipalLearnerAccess(
      principalJ,
      learnerJ,
      "self",
    );

    assert(
      await persistenceStore.isPrincipalAuthorizedForLearner(
        principalJ,
        learnerJ,
      ),
      "revoking one relationship type must not remove authorization while another remains active",
    );

    console.log({
      test: "J: multiple relationship types",
      result: "PASS",
    });

    // K. delimiter/composite-key safety
    const collisionSuffix = crypto.randomUUID();

    const comboAPrincipal = `principal-${collisionSuffix}-a`;
    const comboALearner = `learner-${collisionSuffix}-b:learner-${collisionSuffix}-c`;

    const comboBPrincipal = `principal-${collisionSuffix}-a:principal-${collisionSuffix}-b`;
    const comboBLearner = `learner-${collisionSuffix}-c`;

    await persistenceStore.createPrincipal(comboAPrincipal);
    createdPrincipalIds.push(comboAPrincipal);
    await persistenceStore.ensureLearnerExists(comboALearner);
    createdLearnerIds.push(comboALearner);

    await persistenceStore.createPrincipal(comboBPrincipal);
    createdPrincipalIds.push(comboBPrincipal);
    await persistenceStore.ensureLearnerExists(comboBLearner);
    createdLearnerIds.push(comboBLearner);

    await persistenceStore.createPrincipalLearnerAccess(
      `access-${crypto.randomUUID()}`,
      comboAPrincipal,
      comboALearner,
      "self",
    );
    await persistenceStore.createPrincipalLearnerAccess(
      `access-${crypto.randomUUID()}`,
      comboBPrincipal,
      comboBLearner,
      "self",
    );

    assert(
      (await persistenceStore.isPrincipalAuthorizedForLearner(
        comboAPrincipal,
        comboALearner,
      )) &&
        (await persistenceStore.isPrincipalAuthorizedForLearner(
          comboBPrincipal,
          comboBLearner,
        )),
      "delimiter-collision combinations must each authorize correctly",
    );

    assert(
      !(await persistenceStore.isPrincipalAuthorizedForLearner(
        comboAPrincipal,
        comboBLearner,
      )) &&
        !(await persistenceStore.isPrincipalAuthorizedForLearner(
          comboBPrincipal,
          comboALearner,
        )),
      "delimiter-collision combinations must not cross-authorize",
    );

    console.log({
      test: "K: delimiter/composite-key safety",
      result: "PASS",
    });

    // L. educational isolation
    const principalL = await createTestPrincipal();
    const learnerL = await createTestLearner();
    const competencyId = "competency-test-001";

    await saveLearnerState(
      createInitialLearnerState(learnerL, competencyId),
    );

    const learnerStateBefore = await getLearnerState(
      learnerL,
      competencyId,
    );
    const evidenceBefore = await getEvidence(
      learnerL,
      competencyId,
    );
    const interventionsBefore =
      await getLearnerInterventions(learnerL);

    await persistenceStore.createPrincipalLearnerAccess(
      `access-${crypto.randomUUID()}`,
      principalL,
      learnerL,
      "self",
    );
    await persistenceStore.revokePrincipalLearnerAccess(
      principalL,
      learnerL,
      "self",
    );

    const learnerStateAfter = await getLearnerState(
      learnerL,
      competencyId,
    );
    const evidenceAfter = await getEvidence(
      learnerL,
      competencyId,
    );
    const interventionsAfter =
      await getLearnerInterventions(learnerL);

    assert(
      learnerStateAfter?.learnerId === learnerL &&
        JSON.stringify(learnerStateAfter) ===
          JSON.stringify(learnerStateBefore),
      "principal-learner access operations must not mutate learner state",
    );

    assert(
      evidenceAfter.length === evidenceBefore.length,
      "principal-learner access operations must not create or delete evidence",
    );

    assert(
      interventionsAfter.length === interventionsBefore.length,
      "principal-learner access operations must not create or delete interventions",
    );

    console.log({
      test: "L: educational isolation",
      result: "PASS",
    });

    console.log({ principalLearnerAccessTest: "PASS" });
  } finally {
    if (pool) {
      await pool.query(
        "DELETE FROM principal_learner_access WHERE principal_id = ANY($1::text[])",
        [createdPrincipalIds],
      );
      await pool.query(
        "DELETE FROM learner_states WHERE learner_id = ANY($1::text[])",
        [createdLearnerIds],
      );
      /* Clears every table that references the test learner(s) first (tests/postgres-test-cleanup.ts). */
    await deleteTestLearners(pool, createdLearnerIds);
      await pool.query(
        "DELETE FROM principals WHERE id = ANY($1::text[])",
        [createdPrincipalIds],
      );
      await pool.end();
    }
  }
}

runPrincipalLearnerAccessTests().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
