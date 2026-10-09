import { deleteTestLearners } from "./postgres-test-cleanup";
import { GET } from "../apps/learner/app/api/learning/route";
import {
  POST as issue,
} from "../apps/learner/app/api/session/issue/route";
import {
  POST as logout,
} from "../apps/learner/app/api/session/logout/route";
import {
  exportJWK,
  generateKeyPair,
  SignJWT,
} from "jose";
import { pool } from "../services/database";
import {
  createPrincipalLearnerAccess,
  resolveOrCreatePrincipalForExternalIdentity,
} from "../services/principal";
import { persistenceStore } from "../services/persistence-provider";

const SESSION_SECRET =
  "postgres-lifecycle-test-secret-with-at-least-32-characters";

const EXTERNAL_ISSUER =
  "https://identity.postgres-test.example";

const EXTERNAL_AUDIENCE =
  "filumire-session-issuer";

function assert(
  condition: boolean,
  message: string,
): void {
  if (!condition) {
    throw new Error(`FAIL: ${message}`);
  }
}

function setEnvironmentVariable(
  name: string,
  value: string,
): () => void {
  const previousValue = Object.getOwnPropertyDescriptor(
    process.env,
    name,
  );

  Object.defineProperty(
    process.env,
    name,
    {
      configurable: true,
      enumerable: true,
      value,
      writable: true,
    },
  );

  return () => {
    if (previousValue) {
      Object.defineProperty(
        process.env,
        name,
        previousValue,
      );
      return;
    }

    Reflect.deleteProperty(process.env, name);
  };
}

function extractSessionToken(
  response: Response,
): string {
  const cookie = response.headers.get("set-cookie");
  const match = cookie?.match(
    /filumire_auth_session=([^;]+)/,
  );

  if (!match) {
    throw new Error("FAIL: issuance response has no auth session cookie.");
  }

  return decodeURIComponent(match[1]);
}

async function runPostgresLifecycleTest(): Promise<void> {
  assert(
    process.env.FILUMIRE_PERSISTENCE === "postgres",
    "This test must run with FILUMIRE_PERSISTENCE=postgres.",
  );

  const providerSubject =
    `provider-subject-pg-auth-${crypto.randomUUID()}`;
  const learnerId =
    `learner-pg-auth-${crypto.randomUUID()}`;
  const { privateKey, publicKey } =
    await generateKeyPair("RS256");
  const publicJwk = await exportJWK(publicKey);
  publicJwk.kid = "postgres-lifecycle-test-key";
  const restoreSecret = setEnvironmentVariable(
    "FILUMIRE_AUTH_JWT_SECRET",
    SESSION_SECRET,
  );
  const restoreJwks = setEnvironmentVariable(
    "FILUMIRE_EXTERNAL_AUTH_JWKS",
    JSON.stringify({ keys: [publicJwk] }),
  );
  const restoreIssuer = setEnvironmentVariable(
    "FILUMIRE_EXTERNAL_AUTH_ISSUER",
    EXTERNAL_ISSUER,
  );
  const restoreAudience = setEnvironmentVariable(
    "FILUMIRE_EXTERNAL_AUTH_AUDIENCE",
    EXTERNAL_AUDIENCE,
  );
  const restoreNodeEnv = setEnvironmentVariable(
    "NODE_ENV",
    "production",
  );
  const sessionIds: string[] = [];
  let principalId = "";

  try {
    principalId =
      await resolveOrCreatePrincipalForExternalIdentity(
        EXTERNAL_ISSUER,
        providerSubject,
      );

    await persistenceStore.ensureLearnerExists(
      learnerId,
    );

    await createPrincipalLearnerAccess(
      `access-pg-auth-${crypto.randomUUID()}`,
      principalId,
      learnerId,
      "self",
    );

    const externalIdentityToken = await new SignJWT()
      .setProtectedHeader({
        alg: "RS256",
        kid: publicJwk.kid,
        typ: "JWT",
      })
      .setAudience(EXTERNAL_AUDIENCE)
      .setExpirationTime("5m")
      .setIssuedAt()
      .setIssuer(EXTERNAL_ISSUER)
      .setSubject(providerSubject)
      .sign(privateKey);
    const issueRequest = () =>
      new Request("http://localhost/api/session/issue", {
        method: "POST",
        headers: {
          authorization: `Bearer ${externalIdentityToken}`,
        },
      });

    const firstIssueResponse = await issue(issueRequest());
    assert(
      firstIssueResponse.status === 201,
      `Initial issuance returned ${firstIssueResponse.status}.`,
    );
    const firstIssueBody =
      (await firstIssueResponse.json()) as {
        sessionId?: string;
        principalId?: string;
        learnerId?: string;
      };
    if (typeof firstIssueBody.sessionId !== "string") {
      throw new Error(
        "FAIL: Initial issuance did not return a session ID.",
      );
    }
    assert(
      firstIssueBody.principalId === principalId,
      "Initial issuance returned the wrong Principal ID.",
    );
    assert(
      firstIssueBody.learnerId === learnerId,
      "Initial issuance returned the wrong Learner ID.",
    );

    const firstSessionId = firstIssueBody.sessionId;
    sessionIds.push(firstSessionId);
    const firstSessionToken =
      extractSessionToken(firstIssueResponse);

    const firstSessionRows = await pool.query(
      "SELECT principal_id, status, revoked_at FROM auth_sessions WHERE id = $1",
      [firstSessionId],
    );
    assert(
      firstSessionRows.rowCount === 1,
      "Initial issuance did not create exactly one auth session.",
    );
    assert(
      firstSessionRows.rows[0].principal_id === principalId &&
        firstSessionRows.rows[0].status === "active" &&
        firstSessionRows.rows[0].revoked_at === null,
      "Initial auth session has incorrect owner or status.",
    );

    const legacySessionRows = await pool.query(
      "SELECT COUNT(*)::int AS count FROM sessions WHERE id = $1",
      [firstSessionId],
    );
    assert(
      legacySessionRows.rows[0].count === 0,
      "Production issuance must not create a legacy learner-bound session.",
    );

    const learningResponse = await GET(
      new Request(
        `http://localhost/api/learning?sessionId=${firstSessionId}`,
        {
          headers: {
            cookie: `filumire_auth_session=${firstSessionToken}`,
          },
        },
      ),
    );
    assert(
      learningResponse.status === 200,
      `Authenticated learning returned ${learningResponse.status}.`,
    );

    const concurrentResponses = await Promise.all(
      [issue(issueRequest()), issue(issueRequest())],
    );
    assert(
      concurrentResponses.every(
        (response) => response.status === 201,
      ),
      "Concurrent issuance did not succeed for each request.",
    );
    const concurrentSessionIds = await Promise.all(
      concurrentResponses.map(async (response) => {
        const body = (await response.json()) as {
          sessionId?: string;
        };

        if (typeof body.sessionId !== "string") {
          throw new Error("FAIL: concurrent issuance has no session ID.");
        }

        return body.sessionId;
      }),
    );
    sessionIds.push(...concurrentSessionIds);
    assert(
      new Set(sessionIds).size === sessionIds.length,
      "Concurrent issuance produced duplicate session IDs.",
    );

    const concurrentSessionRows = await pool.query(
      "SELECT id, principal_id, status FROM auth_sessions WHERE id = ANY($1::text[])",
      [sessionIds],
    );
    assert(
      concurrentSessionRows.rowCount === sessionIds.length,
      "Concurrent issuance did not persist each unique auth session.",
    );
    assert(
      concurrentSessionRows.rows.every(
        (row) =>
          row.principal_id === principalId &&
          row.status === "active",
      ),
      "Concurrent issuance corrupted auth-session ownership or status.",
    );

    const logoutResponse = await logout(
      new Request("http://localhost/api/session/logout", {
        method: "POST",
        headers: {
          cookie: `filumire_auth_session=${firstSessionToken}`,
        },
      }),
    );
    assert(
      logoutResponse.status === 200,
      `Logout returned ${logoutResponse.status}.`,
    );

    const revokedRows = await pool.query(
      "SELECT status, revoked_at FROM auth_sessions WHERE id = $1 AND principal_id = $2",
      [firstSessionId, principalId],
    );
    assert(
      revokedRows.rows[0]?.status === "revoked" &&
        revokedRows.rows[0]?.revoked_at !== null,
      "Logout did not persist Principal auth-session revocation.",
    );

    const replayResponse = await GET(
      new Request(
        `http://localhost/api/learning?sessionId=${firstSessionId}`,
        {
          headers: {
            cookie: `filumire_auth_session=${firstSessionToken}`,
          },
        },
      ),
    );
    assert(
      replayResponse.status === 401,
      `Revoked cookie replay returned ${replayResponse.status}.`,
    );

    console.log({
      test: "PostgreSQL Principal auth-session production lifecycle",
      sessionsCreated: sessionIds.length,
      authenticatedLearning: true,
      logoutPersistsRevocation: true,
      revokedCookieReplayRejected: true,
      legacyLearnerSessionsCreated: 0,
      result: "PASS",
    });
  } finally {
    if (sessionIds.length > 0) {
      await pool.query(
        "DELETE FROM auth_sessions WHERE id = ANY($1::text[])",
        [sessionIds],
      );
    }
    await pool.query(
      "DELETE FROM interventions WHERE learner_id = $1",
      [learnerId],
    );
    await pool.query(
      "DELETE FROM learning_evidence WHERE learner_id = $1",
      [learnerId],
    );
    await pool.query(
      "DELETE FROM learner_states WHERE learner_id = $1",
      [learnerId],
    );
    await pool.query(
      "DELETE FROM principal_learner_access WHERE principal_id = $1 OR learner_id = $2",
      [principalId, learnerId],
    );
    await pool.query(
      "DELETE FROM external_identities WHERE principal_id = $1",
      [principalId],
    );
    /* Clears every table that references the test learner(s) first (tests/postgres-test-cleanup.ts). */
    await deleteTestLearners(pool, [learnerId]);
    await pool.query(
      "DELETE FROM principals WHERE id = $1",
      [principalId],
    );
    restoreNodeEnv();
    restoreAudience();
    restoreIssuer();
    restoreJwks();
    restoreSecret();
    await pool.end();
  }
}

runPostgresLifecycleTest().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
