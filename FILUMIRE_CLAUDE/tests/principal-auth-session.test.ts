import { persistenceStore } from "../services/persistence-provider";
import {
  createPrincipalAuthSession,
  getPrincipalAuthSession,
  isPrincipalAuthSessionValid,
  revokePrincipalAuthSession,
  updatePrincipalAuthSessionLastActivity,
} from "../services/auth-session";

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

function isoFromNow(
  milliseconds: number,
): string {
  return new Date(
    Date.now() + milliseconds,
  ).toISOString();
}

async function createPrincipal(): Promise<string> {
  const principalId =
    `principal-${crypto.randomUUID()}`;

  await persistenceStore.createPrincipal(
    principalId,
  );

  return principalId;
}

async function runPrincipalAuthSessionTests(): Promise<void> {
  const isPostgres =
    process.env.FILUMIRE_PERSISTENCE === "postgres";

  const pool = isPostgres
    ? (await import("../services/database")).pool
    : undefined;

  try {
    const principalA = await createPrincipal();
    const sessionA =
      `auth-session-${crypto.randomUUID()}`;
    const expiresA = isoFromNow(60_000);

    await createPrincipalAuthSession(
      sessionA,
      principalA,
      expiresA,
    );

    const recordA =
      await getPrincipalAuthSession(sessionA);

    assert(
      recordA?.id === sessionA &&
        recordA.principalId === principalA &&
        recordA.status === "active" &&
        recordA.expiresAt === expiresA,
      "created auth session must be retrievable for its principal",
    );

    console.log({
      test: "A/B: create and retrieve principal auth session",
      result: "PASS",
    });

    assert(
      await isPrincipalAuthSessionValid(
        sessionA,
        principalA,
        isoFromNow(1_000),
      ),
      "active unexpired auth session must validate for its principal",
    );

    console.log({
      test: "C: active unexpired session validates",
      result: "PASS",
    });

    const wrongPrincipal = await createPrincipal();

    assert(
      !(await isPrincipalAuthSessionValid(
        sessionA,
        wrongPrincipal,
        isoFromNow(1_000),
      )),
      "auth session must not validate for a different principal",
    );

    console.log({
      test: "D: wrong Principal does not validate",
      result: "PASS",
    });

    const principalE = await createPrincipal();
    const sessionE =
      `auth-session-${crypto.randomUUID()}`;

    await createPrincipalAuthSession(
      sessionE,
      principalE,
      isoFromNow(-1_000),
    );

    assert(
      !(await isPrincipalAuthSessionValid(
        sessionE,
        principalE,
        new Date().toISOString(),
      )),
      "expired auth session must not validate",
    );

    console.log({
      test: "E: expired session does not validate",
      result: "PASS",
    });

    const principalF = await createPrincipal();
    const sessionF =
      `auth-session-${crypto.randomUUID()}`;
    const revokedAt = isoFromNow(2_000);

    await createPrincipalAuthSession(
      sessionF,
      principalF,
      isoFromNow(60_000),
    );

    await revokePrincipalAuthSession(
      sessionF,
      principalF,
      revokedAt,
    );

    assert(
      !(await isPrincipalAuthSessionValid(
        sessionF,
        principalF,
        isoFromNow(3_000),
      )),
      "revoked auth session must not validate",
    );

    const revokedRecordF =
      await getPrincipalAuthSession(sessionF);

    assert(
      revokedRecordF?.status === "revoked" &&
        revokedRecordF.revokedAt === revokedAt,
      "revocation must record revoked state without deleting the session",
    );

    await revokePrincipalAuthSession(
      sessionF,
      principalF,
      revokedAt,
    );

    const repeatedRevokedRecordF =
      await getPrincipalAuthSession(sessionF);

    assert(
      repeatedRevokedRecordF?.status === "revoked" &&
        repeatedRevokedRecordF.revokedAt === revokedAt,
      "repeated revocation must remain safe and preserve revoked state",
    );

    console.log({
      test: "F/G/H: revoked session behavior",
      result: "PASS",
    });

    const principalI = await createPrincipal();
    const sessionI =
      `auth-session-${crypto.randomUUID()}`;
    const lastActivityAt = isoFromNow(4_000);

    await createPrincipalAuthSession(
      sessionI,
      principalI,
      isoFromNow(60_000),
    );

    await updatePrincipalAuthSessionLastActivity(
      sessionI,
      principalI,
      lastActivityAt,
    );

    const activeActivityRecord =
      await getPrincipalAuthSession(sessionI);

    assert(
      activeActivityRecord?.lastActivityAt === lastActivityAt &&
        activeActivityRecord.updatedAt === lastActivityAt,
      "last activity must update for active unexpired auth sessions",
    );

    await revokePrincipalAuthSession(
      sessionI,
      principalI,
      isoFromNow(5_000),
    );

    const revokedUpdatedAt =
      (await getPrincipalAuthSession(sessionI))?.updatedAt;

    await updatePrincipalAuthSessionLastActivity(
      sessionI,
      principalI,
      isoFromNow(6_000),
    );

    const revokedActivityRecord =
      await getPrincipalAuthSession(sessionI);

    assert(
      revokedActivityRecord?.status === "revoked" &&
        revokedActivityRecord.updatedAt === revokedUpdatedAt &&
        revokedActivityRecord.lastActivityAt === lastActivityAt,
      "last activity update must not reactivate or mutate revoked sessions",
    );

    console.log({
      test: "I/J: last activity guarded by active state",
      result: "PASS",
    });

    const principalK1 = await createPrincipal();
    const principalK2 = await createPrincipal();
    const sessionK =
      `auth-session-${crypto.randomUUID()}`;

    await createPrincipalAuthSession(
      sessionK,
      principalK1,
      isoFromNow(60_000),
    );

    await assertRejects(
      () =>
        createPrincipalAuthSession(
          sessionK,
          principalK2,
          isoFromNow(120_000),
        ),
      "duplicate auth session ID must not silently overwrite another session",
    );

    const duplicateRecord =
      await getPrincipalAuthSession(sessionK);

    assert(
      duplicateRecord?.principalId === principalK1,
      "duplicate auth session attempt must preserve the original owner",
    );

    console.log({
      test: "K: duplicate session ID rejected",
      result: "PASS",
    });

    await assertRejects(
      () =>
        createPrincipalAuthSession(
          `auth-session-${crypto.randomUUID()}`,
          `principal-missing-${crypto.randomUUID()}`,
          isoFromNow(60_000),
        ),
      "auth session creation must reject a missing principal",
    );

    console.log({
      test: "L: missing Principal rejected",
      result: "PASS",
    });

    const learnerSessionId =
      `session-${crypto.randomUUID()}`;
    const learnerId =
      `learner-${crypto.randomUUID()}`;

    await persistenceStore.ensureLearnerExists(
      learnerId,
    );
    await persistenceStore.createSession(
      learnerSessionId,
      learnerId,
    );

    assert(
      (await persistenceStore.getSessionLearnerId(
        learnerSessionId,
      )) === learnerId,
      "learner-bound session owner must remain readable",
    );

    assert(
      await persistenceStore.isSessionActive(
        learnerSessionId,
        learnerId,
      ),
      "learner-bound session must remain active after auth-session work",
    );

    await persistenceStore.revokeSession(
      learnerSessionId,
      learnerId,
    );

    assert(
      !(await persistenceStore.isSessionActive(
        learnerSessionId,
        learnerId,
      )),
      "learner-bound session revocation must remain unaffected",
    );

    if (pool) {
      const authRows = await pool.query(
        `SELECT COUNT(*)::int AS count
         FROM auth_sessions
         WHERE id = $1`,
        [sessionF],
      );

      assert(
        authRows.rows[0].count === 1,
        "revoked auth session row must be preserved in PostgreSQL",
      );
    }

    console.log({
      test: "M: existing learner-bound sessions remain unaffected",
      result: "PASS",
    });

    console.log({
      principalAuthSessionTest: "PASS",
      persistence:
        process.env.FILUMIRE_PERSISTENCE ?? "memory",
    });
  } finally {
    if (pool) {
      await pool.end();
    }
  }
}

runPrincipalAuthSessionTests().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});