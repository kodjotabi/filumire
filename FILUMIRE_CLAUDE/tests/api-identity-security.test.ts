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
  jwtVerify,
  SignJWT,
} from "jose";
import {
  issueProductionSession,
} from "../services/identity";
import {
  getPrincipalAuthSession,
  revokePrincipalAuthSession,
} from "../services/auth-session";
import {
  createPrincipalLearnerAccess,
  revokePrincipalLearnerAccess,
  resolveOrCreatePrincipalForExternalIdentity,
} from "../services/principal";
import { persistenceStore } from "../services/persistence-provider";
import {
  createSession,
  revokeSession,
} from "../services/session";

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

const PRODUCTION_AUTH_SECRET =
  "test-only-production-auth-secret-at-least-32-characters";

const EXTERNAL_AUTH_ISSUER =
  "https://identity.example.test";

const EXTERNAL_AUTH_AUDIENCE =
  "filumire-session-issuer";

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

async function configureExternalIdentityProvider(): Promise<{
  createIdentityToken: (
    providerSubject: string,
    expirationTime?: number | string,
  ) => Promise<string>;
  restore: () => void;
}> {
  const { privateKey, publicKey } =
    await generateKeyPair("RS256");
  const publicJwk = await exportJWK(publicKey);
  publicJwk.kid = "external-test-key";
  const restoreJwks = setEnvironmentVariable(
    "FILUMIRE_EXTERNAL_AUTH_JWKS",
    JSON.stringify({ keys: [publicJwk] }),
  );
  const restoreIssuer = setEnvironmentVariable(
    "FILUMIRE_EXTERNAL_AUTH_ISSUER",
    EXTERNAL_AUTH_ISSUER,
  );
  const restoreAudience = setEnvironmentVariable(
    "FILUMIRE_EXTERNAL_AUTH_AUDIENCE",
    EXTERNAL_AUTH_AUDIENCE,
  );

  return {
    async createIdentityToken(
      providerSubject: string,
      expirationTime: number | string = "5m",
    ): Promise<string> {
      return new SignJWT()
        .setProtectedHeader({
          alg: "RS256",
          kid: publicJwk.kid,
          typ: "JWT",
        })
        .setAudience(EXTERNAL_AUTH_AUDIENCE)
        .setExpirationTime(expirationTime)
        .setIssuedAt()
        .setIssuer(EXTERNAL_AUTH_ISSUER)
        .setSubject(providerSubject)
        .sign(privateKey);
    },
    restore(): void {
      restoreAudience();
      restoreIssuer();
      restoreJwks();
    },
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
    throw new Error("Issued response is missing auth session cookie.");
  }

  return decodeURIComponent(match[1]);
}

async function createInternalToken(
  principalId: string,
  learnerId: string,
  sessionId: string,
  expirationTime: number | string = "5m",
  secret = PRODUCTION_AUTH_SECRET,
): Promise<string> {
  return new SignJWT({
    sid: sessionId,
    learner_id: learnerId,
  })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setAudience("filumire-learner-api")
    .setExpirationTime(expirationTime)
    .setIssuedAt()
    .setIssuer("filumire-learner")
    .setSubject(principalId)
    .sign(new TextEncoder().encode(secret));
}

async function authorizeLearnersForSubject(
  providerSubject: string,
  learnerCount: number,
): Promise<{
  principalId: string;
  learnerIds: string[];
}> {
  const principalId =
    await resolveOrCreatePrincipalForExternalIdentity(
      EXTERNAL_AUTH_ISSUER,
      providerSubject,
    );
  const learnerIds: string[] = [];

  for (let index = 0; index < learnerCount; index += 1) {
    const learnerId =
      `learner-stage5-${crypto.randomUUID()}`;
    await persistenceStore.ensureLearnerExists(
      learnerId,
    );
    await createPrincipalLearnerAccess(
      `access-stage5-${crypto.randomUUID()}`,
      principalId,
      learnerId,
      index === 0 ? "self" : "guardian",
    );
    learnerIds.push(learnerId);
  }

  return {
    principalId,
    learnerIds,
  };
}

async function issueForSubject(
  providerSubject: string,
  provider: Awaited<
    ReturnType<typeof configureExternalIdentityProvider>
  >,
): Promise<Response> {
  const identityToken =
    await provider.createIdentityToken(providerSubject);

  return issue(
    new Request("http://localhost/api/session/issue", {
      method: "POST",
      headers: {
        authorization: `Bearer ${identityToken}`,
      },
    }),
  );
}

async function testStage5SuccessfulCutover(): Promise<void> {
  const provider = await configureExternalIdentityProvider();
  const restoreSecret = setEnvironmentVariable(
    "FILUMIRE_AUTH_JWT_SECRET",
    PRODUCTION_AUTH_SECRET,
  );
  const restoreNodeEnv = setEnvironmentVariable(
    "NODE_ENV",
    "production",
  );
  const providerSubject =
    `external-subject-${crypto.randomUUID()}`;

  try {
    const { principalId, learnerIds } =
      await authorizeLearnersForSubject(
        providerSubject,
        1,
      );
    const learnerId = learnerIds[0];
    const issueResponse = await issueForSubject(
      providerSubject,
      provider,
    );

    assert(
      issueResponse.status === 201,
      `Expected 201, received ${issueResponse.status}.`,
    );
    const setCookie = issueResponse.headers.get("set-cookie") ?? "";
    assert(
      setCookie.includes("filumire_auth_session="),
      "Issued cookie must use the Principal auth-session name.",
    );
    assert(setCookie.includes("HttpOnly"), "Issued cookie is not HttpOnly.");
    assert(setCookie.includes("Secure"), "Issued cookie is not Secure.");
    assert(setCookie.includes("SameSite=Strict"), "Issued cookie is not SameSite=Strict.");
    assert(setCookie.includes("Path=/"), "Issued cookie has no root path.");
    assert(setCookie.includes("Max-Age=3600"), "Issued cookie has unexpected lifetime.");

    const token = extractSessionToken(issueResponse);
    const body = (await issueResponse.json()) as {
      sessionId?: string;
      principalId?: string;
      learnerId?: string;
    };

    if (typeof body.sessionId !== "string") {
      throw new Error(
        "Issued response is missing session ID.",
      );
    }
    assert(
      body.principalId === principalId,
      "Issued response must identify the resolved Principal.",
    );
    assert(
      body.learnerId === learnerId,
      "Issued response must identify the authorised internal Learner.",
    );
    assert(
      body.principalId !== providerSubject,
      "Provider subject must not be used as Principal ID.",
    );
    assert(
      body.learnerId !== providerSubject,
      "Provider subject must not be used as Learner ID.",
    );

    const verified = await jwtVerify(
      token,
      new TextEncoder().encode(PRODUCTION_AUTH_SECRET),
      {
        algorithms: ["HS256"],
        audience: "filumire-learner-api",
        issuer: "filumire-learner",
      },
    );

    assert(
      verified.payload.sub === principalId,
      "Issued internal JWT subject must be Principal ID.",
    );
    assert(
      verified.payload.learner_id === learnerId,
      "Issued internal JWT must carry the authorised internal Learner ID.",
    );
    assert(
      verified.payload.sid === body.sessionId,
      "Issued internal JWT must carry the Principal auth-session ID.",
    );

    const authSession =
      await getPrincipalAuthSession(body.sessionId);
    assert(
      authSession?.principalId === principalId &&
        authSession.status === "active",
      "Principal auth session must be persisted active.",
    );

    const learningResponse = await GET(
      new Request(
        `http://localhost/api/learning?sessionId=${body.sessionId}`,
        {
          headers: {
            cookie: `filumire_auth_session=${token}`,
          },
        },
      ),
    );

    assert(
      learningResponse.status === 200,
      `Expected 200, received ${learningResponse.status}.`,
    );
    const learningBody = await learningResponse.json();
    assert(
      learningBody.learnerState?.learnerId === learnerId,
      "Production request must resolve to the authorised internal Learner.",
    );

    console.log({
      test: "A-D/G-J: successful Principal auth-session cutover",
      result: "PASS",
    });
  } finally {
    restoreNodeEnv();
    restoreSecret();
    provider.restore();
  }
}

async function testProviderSubjectDoesNotCreateLearnerInPostgres(): Promise<void> {
  if (process.env.FILUMIRE_PERSISTENCE !== "postgres") {
    console.log({
      test: "C: provider subject is not auto-created as Learner",
      result: "SKIP",
      reason: "direct learner table assertion requires PostgreSQL",
    });
    return;
  }

  const { pool } = await import("../services/database");
  const provider = await configureExternalIdentityProvider();
  const restoreSecret = setEnvironmentVariable(
    "FILUMIRE_AUTH_JWT_SECRET",
    PRODUCTION_AUTH_SECRET,
  );
  const providerSubject =
    `external-subject-not-learner-${crypto.randomUUID()}`;

  try {
    await authorizeLearnersForSubject(
      providerSubject,
      1,
    );
    const issueResponse = await issueForSubject(
      providerSubject,
      provider,
    );
    assert(
      issueResponse.status === 201,
      `Expected 201, received ${issueResponse.status}.`,
    );

    const rows = await pool.query(
      "SELECT COUNT(*)::int AS count FROM learners WHERE id = $1",
      [providerSubject],
    );

    assert(
      rows.rows[0].count === 0,
      "Provider subject must not be automatically created as a Learner.",
    );

    console.log({
      test: "C: provider subject is not auto-created as Learner",
      result: "PASS",
    });
  } finally {
    restoreSecret();
    provider.restore();
  }
}

async function testLearnerSelectionFailures(): Promise<void> {
  const provider = await configureExternalIdentityProvider();
  const restoreSecret = setEnvironmentVariable(
    "FILUMIRE_AUTH_JWT_SECRET",
    PRODUCTION_AUTH_SECRET,
  );

  try {
    const zeroSubject =
      `external-zero-${crypto.randomUUID()}`;
    await authorizeLearnersForSubject(
      zeroSubject,
      0,
    );
    const zeroResponse = await issueForSubject(
      zeroSubject,
      provider,
    );
    assert(
      zeroResponse.status === 403,
      `Expected 403, received ${zeroResponse.status}.`,
    );
    assert(
      !zeroResponse.headers.has("set-cookie"),
      "Zero-learner issuance must not set a cookie.",
    );

    const multipleSubject =
      `external-multiple-${crypto.randomUUID()}`;
    await authorizeLearnersForSubject(
      multipleSubject,
      2,
    );
    const multipleResponse = await issueForSubject(
      multipleSubject,
      provider,
    );
    assert(
      multipleResponse.status === 403,
      `Expected 403, received ${multipleResponse.status}.`,
    );
    assert(
      !multipleResponse.headers.has("set-cookie"),
      "Multiple-learner issuance must not set a cookie.",
    );

    console.log({
      test: "E/F: zero or multiple authorised Learners prevent issuance",
      result: "PASS",
    });
  } finally {
    restoreSecret();
    provider.restore();
  }
}

async function testAuthSessionValidationFailures(): Promise<void> {
  const restoreNodeEnv = setEnvironmentVariable(
    "NODE_ENV",
    "production",
  );
  const restoreSecret = setEnvironmentVariable(
    "FILUMIRE_AUTH_JWT_SECRET",
    PRODUCTION_AUTH_SECRET,
  );

  try {
    const missingSubject =
      `external-missing-session-${crypto.randomUUID()}`;
    const missingSetup =
      await authorizeLearnersForSubject(
        missingSubject,
        1,
      );
    const missingSessionId =
      `auth-session-missing-${crypto.randomUUID()}`;
    const missingToken = await createInternalToken(
      missingSetup.principalId,
      missingSetup.learnerIds[0],
      missingSessionId,
    );
    const missingResponse = await GET(
      new Request(
        `http://localhost/api/learning?sessionId=${missingSessionId}`,
        {
          headers: {
            cookie: `filumire_auth_session=${missingToken}`,
          },
        },
      ),
    );
    assert(
      missingResponse.status === 401,
      `Expected 401, received ${missingResponse.status}.`,
    );

    const revokedSubject =
      `external-revoked-session-${crypto.randomUUID()}`;
    const revokedSetup =
      await authorizeLearnersForSubject(
        revokedSubject,
        1,
      );
    const revokedProvider = await configureExternalIdentityProvider();
    const revokedIssueResponse = await issueForSubject(
      revokedSubject,
      revokedProvider,
    );
    const revokedToken = extractSessionToken(
      revokedIssueResponse,
    );
    const revokedBody =
      (await revokedIssueResponse.json()) as {
        sessionId: string;
      };
    revokedProvider.restore();
    await revokePrincipalAuthSession(
      revokedBody.sessionId,
      revokedSetup.principalId,
    );
    const revokedResponse = await GET(
      new Request(
        `http://localhost/api/learning?sessionId=${revokedBody.sessionId}`,
        {
          headers: {
            cookie: `filumire_auth_session=${revokedToken}`,
          },
        },
      ),
    );
    assert(
      revokedResponse.status === 401,
      `Expected 401, received ${revokedResponse.status}.`,
    );

    const expiredSubject =
      `external-expired-session-${crypto.randomUUID()}`;
    const expiredSetup =
      await authorizeLearnersForSubject(
        expiredSubject,
        1,
      );
    const expiredSessionId =
      `auth-session-expired-${crypto.randomUUID()}`;
    await persistenceStore.createPrincipalAuthSession(
      expiredSessionId,
      expiredSetup.principalId,
      new Date(Date.now() - 1_000).toISOString(),
    );
    const expiredToken = await createInternalToken(
      expiredSetup.principalId,
      expiredSetup.learnerIds[0],
      expiredSessionId,
    );
    const expiredResponse = await GET(
      new Request(
        `http://localhost/api/learning?sessionId=${expiredSessionId}`,
        {
          headers: {
            cookie: `filumire_auth_session=${expiredToken}`,
          },
        },
      ),
    );
    assert(
      expiredResponse.status === 401,
      `Expected 401, received ${expiredResponse.status}.`,
    );

    console.log({
      test: "K/L/M: missing, revoked, or expired auth sessions fail",
      result: "PASS",
    });
  } finally {
    restoreSecret();
    restoreNodeEnv();
  }
}

async function testAuthorizationRevocationAfterIssuance(): Promise<void> {
  const provider = await configureExternalIdentityProvider();
  const restoreSecret = setEnvironmentVariable(
    "FILUMIRE_AUTH_JWT_SECRET",
    PRODUCTION_AUTH_SECRET,
  );
  const restoreNodeEnv = setEnvironmentVariable(
    "NODE_ENV",
    "production",
  );
  const providerSubject =
    `external-access-revoked-${crypto.randomUUID()}`;

  try {
    const { principalId, learnerIds } =
      await authorizeLearnersForSubject(
        providerSubject,
        1,
      );
    const issueResponse = await issueForSubject(
      providerSubject,
      provider,
    );
    const token = extractSessionToken(issueResponse);
    const body = (await issueResponse.json()) as {
      sessionId: string;
    };

    await revokePrincipalLearnerAccess(
      principalId,
      learnerIds[0],
      "self",
    );

    const response = await GET(
      new Request(
        `http://localhost/api/learning?sessionId=${body.sessionId}`,
        {
          headers: {
            cookie: `filumire_auth_session=${token}`,
          },
        },
      ),
    );

    assert(
      response.status === 401,
      `Expected 401, received ${response.status}.`,
    );

    console.log({
      test: "N: revoked Principal-Learner authorization rejects replay",
      result: "PASS",
    });
  } finally {
    restoreNodeEnv();
    restoreSecret();
    provider.restore();
  }
}

async function testForgedExternalIdentityFails(): Promise<void> {
  const provider = await configureExternalIdentityProvider();
  const restoreSecret = setEnvironmentVariable(
    "FILUMIRE_AUTH_JWT_SECRET",
    PRODUCTION_AUTH_SECRET,
  );

  try {
    const { privateKey } = await generateKeyPair("RS256");
    const forgedToken = await new SignJWT()
      .setProtectedHeader({
        alg: "RS256",
        kid: "forged-key",
        typ: "JWT",
      })
      .setAudience(EXTERNAL_AUTH_AUDIENCE)
      .setExpirationTime("5m")
      .setIssuedAt()
      .setIssuer(EXTERNAL_AUTH_ISSUER)
      .setSubject(`external-forged-${crypto.randomUUID()}`)
      .sign(privateKey);
    const response = await issue(
      new Request("http://localhost/api/session/issue", {
        method: "POST",
        headers: {
          authorization: `Bearer ${forgedToken}`,
        },
      }),
    );

    assert(
      response.status === 401,
      `Expected 401, received ${response.status}.`,
    );
    assert(!response.headers.has("set-cookie"), "Forged identity issuance set a cookie.");

    console.log({
      test: "O: forged external identity still fails",
      result: "PASS",
    });
  } finally {
    restoreSecret();
    provider.restore();
  }
}

async function testPersistenceFailurePreventsTokenIssuance(): Promise<void> {
  const provider = await configureExternalIdentityProvider();
  const restoreSecret = setEnvironmentVariable(
    "FILUMIRE_AUTH_JWT_SECRET",
    PRODUCTION_AUTH_SECRET,
  );
  const providerSubject =
    `external-persistence-failure-${crypto.randomUUID()}`;

  try {
    await authorizeLearnersForSubject(
      providerSubject,
      1,
    );
    const identityToken =
      await provider.createIdentityToken(providerSubject);
    let failed = false;

    try {
      await issueProductionSession(
        new Request("http://localhost/api/session/issue", {
          method: "POST",
          headers: {
            authorization: `Bearer ${identityToken}`,
          },
        }),
        async () => {
          throw new Error("Auth session persistence failed.");
        },
      );
    } catch {
      failed = true;
    }

    assert(
      failed,
      "Session issuance continued after auth-session persistence failed.",
    );

    console.log({
      test: "P: auth-session persistence failure prevents token issuance",
      result: "PASS",
    });
  } finally {
    restoreSecret();
    provider.restore();
  }
}

async function testDevelopmentIdentityStillWorks(): Promise<void> {
  const restoreNodeEnv = setEnvironmentVariable(
    "NODE_ENV",
    "development",
  );
  const learnerId =
    `learner-development-${crypto.randomUUID()}`;
  const sessionId =
    `session-development-${crypto.randomUUID()}`;

  try {
    const response = await GET(
      new Request(
        `http://localhost/api/learning?sessionId=${sessionId}`,
        {
          headers: {
            "x-filumire-learner-id": learnerId,
          },
        },
      ),
    );

    assert(
      response.status === 200,
      `Expected 200, received ${response.status}.`,
    );

    const body = await response.json();
    assert(
      body.learnerState?.learnerId === learnerId,
      "Development identity did not apply the header Learner ID.",
    );

    console.log({
      test: "Q: development identity behaviour still works",
      result: "PASS",
    });
  } finally {
    restoreNodeEnv();
  }
}

async function testLegacyLearnerSessionSystemStillWorks(): Promise<void> {
  const learnerId =
    `learner-legacy-session-${crypto.randomUUID()}`;
  const sessionId =
    `session-legacy-${crypto.randomUUID()}`;

  await persistenceStore.ensureLearnerExists(
    learnerId,
  );
  await createSession(sessionId, learnerId);

  assert(
    await persistenceStore.isSessionActive(
      sessionId,
      learnerId,
    ),
    "Legacy learner session must remain active after creation.",
  );

  await revokeSession(sessionId, learnerId);

  assert(
    !(await persistenceStore.isSessionActive(
      sessionId,
      learnerId,
    )),
    "Legacy learner session revocation must remain intact.",
  );

  console.log({
    test: "R: legacy learner session service remains intact",
    result: "PASS",
  });
}

async function testLogoutRevokesPrincipalAuthSession(): Promise<void> {
  const provider = await configureExternalIdentityProvider();
  const restoreSecret = setEnvironmentVariable(
    "FILUMIRE_AUTH_JWT_SECRET",
    PRODUCTION_AUTH_SECRET,
  );
  const restoreNodeEnv = setEnvironmentVariable(
    "NODE_ENV",
    "production",
  );
  const providerSubject =
    `external-logout-${crypto.randomUUID()}`;

  try {
    await authorizeLearnersForSubject(
      providerSubject,
      1,
    );
    const issueResponse = await issueForSubject(
      providerSubject,
      provider,
    );
    const token = extractSessionToken(issueResponse);
    const body = (await issueResponse.json()) as {
      sessionId: string;
    };
    const logoutResponse = await logout(
      new Request("http://localhost/api/session/logout", {
        method: "POST",
        headers: {
          cookie: `filumire_auth_session=${token}`,
        },
      }),
    );

    assert(
      logoutResponse.status === 200,
      `Expected 200, received ${logoutResponse.status}.`,
    );
    assert(
      logoutResponse.headers
        .get("set-cookie")
        ?.includes("filumire_auth_session=") ?? false,
      "Logout must clear the Principal auth-session cookie.",
    );

    const authSession =
      await getPrincipalAuthSession(body.sessionId);
    assert(
      authSession?.status === "revoked",
      "Logout must revoke the Principal auth session.",
    );

    console.log({
      test: "logout revokes Principal auth session",
      result: "PASS",
    });
  } finally {
    restoreNodeEnv();
    restoreSecret();
    provider.restore();
  }
}

async function runIdentitySecurityTests(): Promise<void> {
  await testStage5SuccessfulCutover();
  await testProviderSubjectDoesNotCreateLearnerInPostgres();
  await testLearnerSelectionFailures();
  await testAuthSessionValidationFailures();
  await testAuthorizationRevocationAfterIssuance();
  await testForgedExternalIdentityFails();
  await testPersistenceFailurePreventsTokenIssuance();
  await testDevelopmentIdentityStillWorks();
  await testLegacyLearnerSessionSystemStillWorks();
  await testLogoutRevokesPrincipalAuthSession();

  console.log({
    identitySecurityTest: "PASS",
    persistence:
      process.env.FILUMIRE_PERSISTENCE ?? "memory",
  });
}

runIdentitySecurityTests().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
