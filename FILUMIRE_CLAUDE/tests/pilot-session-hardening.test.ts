import { GET, POST } from "../apps/learner/app/api/learning/route";
import {
  POST as issue,
} from "../apps/learner/app/api/session/issue/route";
import {
  exportJWK,
  generateKeyPair,
  SignJWT,
} from "jose";
import {
  createPrincipalLearnerAccess,
  resolveOrCreatePrincipalForExternalIdentity,
} from "../services/principal";
import { persistenceStore } from "../services/persistence-provider";
import { getEvidence } from "../services/evidence-store";
import { seedContent } from "../services/content-store/seed";
import { GHANA_MATH_PILOT_INITIAL_COMPETENCY_ID } from "../packages/curriculum";
import { getContentForCompetency } from "../services/content-store";

function assert(
  condition: boolean,
  message: string,
): void {
  if (!condition) {
    throw new Error(`FAIL: ${message}`);
  }
}

const PRODUCTION_AUTH_SECRET =
  "stage-h-session-hardening-secret-at-least-32-characters";

const EXTERNAL_AUTH_ISSUER =
  "https://identity.stage-h-session.example.test";

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

async function configureProvider(): Promise<{
  createToken: (
    providerSubject: string,
  ) => Promise<string>;
  restore: () => void;
}> {
  const { privateKey, publicKey } =
    await generateKeyPair("RS256");
  const publicJwk = await exportJWK(publicKey);
  publicJwk.kid = "stage-h-session-key";

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
    async createToken(providerSubject: string): Promise<string> {
      return new SignJWT()
        .setProtectedHeader({
          alg: "RS256",
          kid: publicJwk.kid,
          typ: "JWT",
        })
        .setAudience(EXTERNAL_AUTH_AUDIENCE)
        .setExpirationTime("5m")
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
    throw new Error(
      "FAIL: issued response missing auth session cookie.",
    );
  }

  return decodeURIComponent(match[1]);
}

async function runSessionHardeningTest(): Promise<void> {
  seedContent();

  const provider = await configureProvider();
  const restoreSecret = setEnvironmentVariable(
    "FILUMIRE_AUTH_JWT_SECRET",
    PRODUCTION_AUTH_SECRET,
  );
  const restoreNodeEnv = setEnvironmentVariable(
    "NODE_ENV",
    "production",
  );

  try {
    // 1. Malformed/garbage token must fail safely with a
    // generic message, not a stack trace or parser detail.
    const malformedResponse = await GET(
      new Request("http://localhost/api/learning", {
        headers: {
          cookie: "filumire_auth_session=not-a-real-jwt-token",
        },
      }),
    );

    assert(
      malformedResponse.status === 401,
      `expected malformed session token to be rejected, got ${malformedResponse.status}`,
    );

    const malformedBody = await malformedResponse.json() as {
      error?: string;
    };

    assert(
      typeof malformedBody.error === "string" &&
        !malformedBody.error.toLowerCase().includes("jwt") &&
        !malformedBody.error.toLowerCase().includes("stack"),
      "malformed token rejection must not leak parser/internal detail",
    );

    console.log({
      test: "malformed session token fails safely",
      result: "PASS",
    });

    // 2. Missing session entirely.
    const missingResponse = await GET(
      new Request("http://localhost/api/learning"),
    );

    assert(
      missingResponse.status === 401,
      `expected missing session to be rejected, got ${missingResponse.status}`,
    );

    console.log({
      test: "missing session rejected",
      result: "PASS",
    });

    // Set up a real authorized learner/session for the
    // remaining boundary checks.
    const providerSubject =
      `provider-subject-session-hardening-${crypto.randomUUID()}`;
    const learnerId =
      `learner-session-hardening-${crypto.randomUUID()}`;
    const principalId =
      await resolveOrCreatePrincipalForExternalIdentity(
        EXTERNAL_AUTH_ISSUER,
        providerSubject,
      );

    await persistenceStore.ensureLearnerExists(learnerId);
    await createPrincipalLearnerAccess(
      `access-session-hardening-${crypto.randomUUID()}`,
      principalId,
      learnerId,
      "self",
    );

    const token = await provider.createToken(providerSubject);
    const issueResponse = await issue(
      new Request("http://localhost/api/session/issue", {
        method: "POST",
        headers: {
          authorization: `Bearer ${token}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({ learnerId }),
      }),
    );

    assert(
      issueResponse.status === 201,
      `expected session issuance 201, got ${issueResponse.status}`,
    );

    const sessionToken = extractSessionToken(issueResponse);
    const issueBody = await issueResponse.json() as {
      sessionId: string;
    };

    // 3. Manually changed sessionId on GET must be rejected.
    const getWrongSessionResponse = await GET(
      new Request(
        `http://localhost/api/learning?sessionId=session-${crypto.randomUUID()}`,
        {
          headers: {
            cookie: `filumire_auth_session=${sessionToken}`,
          },
        },
      ),
    );

    assert(
      getWrongSessionResponse.status === 401,
      `expected a manually changed sessionId on GET to be rejected, got ${getWrongSessionResponse.status}`,
    );

    console.log({
      test: "manually changed sessionId on GET rejected",
      result: "PASS",
    });

    // 4. Manually changed sessionId on POST must be rejected,
    // and must not create evidence.
    const content = getContentForCompetency(
      GHANA_MATH_PILOT_INITIAL_COMPETENCY_ID,
    ).find(
      (item) =>
        item.assessmentItemId &&
        item.metadata?.expectedResponse,
    );

    const postWrongSessionResponse = await POST(
      new Request("http://localhost/api/learning", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          cookie: `filumire_auth_session=${sessionToken}`,
        },
        body: JSON.stringify({
          sessionId: `session-${crypto.randomUUID()}`,
          interactionType: "assessment",
          assessmentItemId: content?.assessmentItemId,
          competencyId: GHANA_MATH_PILOT_INITIAL_COMPETENCY_ID,
          response: content?.metadata?.expectedResponse,
          clientRequestId: crypto.randomUUID(),
        }),
      }),
    );

    assert(
      postWrongSessionResponse.status === 401,
      `expected a manually changed sessionId on POST to be rejected, got ${postWrongSessionResponse.status}`,
    );

    const evidenceAfterWrongSession = await getEvidence(
      learnerId,
      GHANA_MATH_PILOT_INITIAL_COMPETENCY_ID,
    );

    assert(
      evidenceAfterWrongSession.length === 0,
      "a rejected manually-changed-sessionId submission must not create evidence",
    );

    console.log({
      test: "manually changed sessionId on POST rejected",
      result: "PASS",
    });

    // 5. Valid session/sessionId combination still works
    // (boundary checks are not over-broad).
    const validResponse = await GET(
      new Request(
        `http://localhost/api/learning?sessionId=${issueBody.sessionId}`,
        {
          headers: {
            cookie: `filumire_auth_session=${sessionToken}`,
          },
        },
      ),
    );

    assert(
      validResponse.status === 200,
      `expected the learner's own valid session to still work, got ${validResponse.status}`,
    );

    console.log({
      test: "valid session/sessionId combination still succeeds",
      result: "PASS",
    });

    console.log({ sessionHardeningTest: "PASS" });
  } finally {
    restoreNodeEnv();
    restoreSecret();
    provider.restore();
  }
}

runSessionHardeningTest().catch((error) => {
  console.error(error);
  process.exit(1);
});
