import { resolveOrCreatePrincipalForExternalIdentity } from "../services/principal";
import { persistenceStore } from "../services/persistence-provider";

function assert(
  condition: boolean,
  message: string,
): void {
  if (!condition) {
    throw new Error(`FAIL: ${message}`);
  }
}

async function getLearnerCount(
  pool: {
    query: (
      sql: string,
    ) => Promise<{ rows: Array<{ count: number }> }>;
  },
): Promise<number> {
  const rows = await pool.query(
    "SELECT COUNT(*)::int AS count FROM learners",
  );

  return rows.rows[0].count;
}

async function runPrincipalResolutionTests(): Promise<void> {
  const isPostgres =
    process.env.FILUMIRE_PERSISTENCE === "postgres";

  const pool = isPostgres
    ? (await import("../services/database")).pool
    : undefined;

  try {
    const providerNamespace =
      `provider-${crypto.randomUUID()}`;

    const providerSubject =
      `subject-${crypto.randomUUID()}`;

    const learnerCountBefore = pool
      ? await getLearnerCount(pool)
      : undefined;

    const firstPrincipalId =
      await resolveOrCreatePrincipalForExternalIdentity(
        providerNamespace,
        providerSubject,
      );

    const status =
      await persistenceStore.getPrincipalStatus(
        firstPrincipalId,
      );

    assert(
      status === "active",
      "first resolution must provision an active principal",
    );

    const mappedPrincipalId =
      await persistenceStore.getPrincipalIdByExternalIdentity(
        providerNamespace,
        providerSubject,
      );

    assert(
      mappedPrincipalId === firstPrincipalId,
      "first resolution must create a matching external identity mapping",
    );

    console.log({
      test: "first resolution provisions principal and mapping",
      result: "PASS",
    });

    const secondPrincipalId =
      await resolveOrCreatePrincipalForExternalIdentity(
        providerNamespace,
        providerSubject,
      );

    assert(
      secondPrincipalId === firstPrincipalId,
      "repeated resolution must return the same principal ID",
    );

    console.log({
      test: "repeated resolution returns the same principal ID",
      result: "PASS",
    });

    const otherNamespacePrincipalId =
      await resolveOrCreatePrincipalForExternalIdentity(
        `provider-${crypto.randomUUID()}`,
        providerSubject,
      );

    assert(
      otherNamespacePrincipalId !== firstPrincipalId,
      "the same subject under a different namespace must remain a distinct identity",
    );

    console.log({
      test: "different provider namespaces with the same subject remain distinct",
      result: "PASS",
    });

    const collisionNamespaceA = "delimiter-collision-a:b";
    const collisionSubjectA = "c";

    const collisionNamespaceB = "delimiter-collision-a";
    const collisionSubjectB = "b:c";

    const collisionPrincipalA =
      await resolveOrCreatePrincipalForExternalIdentity(
        collisionNamespaceA,
        collisionSubjectA,
      );

    const collisionPrincipalB =
      await resolveOrCreatePrincipalForExternalIdentity(
        collisionNamespaceB,
        collisionSubjectB,
      );

    assert(
      collisionPrincipalA !== collisionPrincipalB,
      "delimiter-collision namespace/subject strings must remain independent identities",
    );

    console.log({
      test: "delimiter-collision strings remain independent",
      result: "PASS",
    });

    const concurrentNamespace =
      `provider-${crypto.randomUUID()}`;

    const concurrentSubject =
      `subject-${crypto.randomUUID()}`;

    const concurrentResults =
      await Promise.all(
        Array.from(
          { length: 10 },
          () =>
            resolveOrCreatePrincipalForExternalIdentity(
              concurrentNamespace,
              concurrentSubject,
            ),
        ),
      );

    assert(
      new Set(concurrentResults).size === 1,
      "concurrent resolution for the same namespace and subject must converge to one principal",
    );

    console.log({
      test: "concurrent resolution converges to one canonical principal",
      result: "PASS",
    });

    if (pool && learnerCountBefore !== undefined) {
      const learnerCountAfter = await getLearnerCount(pool);

      assert(
        learnerCountAfter === learnerCountBefore,
        "principal resolution must not create or modify any learner",
      );

      console.log({
        test: "principal resolution does not create or modify learners",
        result: "PASS",
      });
    }

    console.log({
      principalResolutionTest: "PASS",
    });
  } finally {
    if (pool) {
      await pool.end();
    }
  }
}

runPrincipalResolutionTests().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
