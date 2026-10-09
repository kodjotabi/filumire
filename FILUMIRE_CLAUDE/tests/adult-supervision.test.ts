import { GET } from "../apps/learner/app/api/adult/summary/route";
import {
  GET as learningGet,
} from "../apps/learner/app/api/learning/route";
import {
  POST as issue,
} from "../apps/learner/app/api/session/issue/route";
import {
  exportJWK,
  generateKeyPair,
  SignJWT,
} from "jose";
import {
  createInitialLearnerState,
  applyEvidence,
  getLearnerState,
  saveLearnerState,
} from "../services/learner-state";
import { saveEvidence } from "../services/evidence-store";
import { persistenceStore } from "../services/persistence-provider";
import {
  createPrincipalLearnerAccess,
  resolveOrCreatePrincipalForExternalIdentity,
} from "../services/principal";

function assert(
  condition: boolean,
  message: string,
): void {
  if (!condition) {
    throw new Error(`FAIL: ${message}`);
  }
}

const VALIDATION_COMPETENCY_ID = "competency-test-001";

const PRODUCTION_AUTH_SECRET =
  "stage-f-production-auth-secret-at-least-32-characters";

const EXTERNAL_AUTH_ISSUER =
  "https://identity.stage-f.example.test";

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
  publicJwk.kid = "stage-f-external-key";

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

function evidence(
  id: string,
  learnerId: string,
  competencyId: string,
  outcome: "correct" | "incorrect",
) {
  return {
    id,
    learnerId,
    competencyId,
    source: "assessment" as const,
    outcome,
    timestamp: new Date().toISOString(),
    assessmentItemId: id,
    sessionId: id,
    policyVersion: "test",
  };
}

async function createTestPrincipal(): Promise<string> {
  const principalId = `principal-adult-${crypto.randomUUID()}`;
  await persistenceStore.createPrincipal(principalId);
  return principalId;
}

async function createTestLearner(): Promise<string> {
  const learnerId = `learner-adult-${crypto.randomUUID()}`;
  await persistenceStore.ensureLearnerExists(learnerId);
  return learnerId;
}

async function buildRealLearnerProgress(
  learnerId: string,
): Promise<void> {
  let state = createInitialLearnerState(
    learnerId,
    VALIDATION_COMPETENCY_ID,
  );

  for (let i = 1; i <= 3; i++) {
    state = applyEvidence(
      state,
      evidence(
        `adult-evidence-${learnerId}-${i}`,
        learnerId,
        VALIDATION_COMPETENCY_ID,
        "correct",
      ),
    );
  }

  await saveLearnerState(state);

  for (let i = 1; i <= 3; i++) {
    await saveEvidence(
      evidence(
        `adult-evidence-${learnerId}-${i}`,
        learnerId,
        VALIDATION_COMPETENCY_ID,
        "correct",
      ),
    );
  }
}

function requestFor(
  principalId: string,
  learnerId?: string,
): Request {
  const url = learnerId
    ? `http://localhost/api/adult/summary?learnerId=${learnerId}`
    : "http://localhost/api/adult/summary";

  return new Request(url, {
    headers: {
      "x-filumire-principal-id": principalId,
    },
  });
}

async function runAdultSupervisionTests(): Promise<void> {
  // 1. Zero authorized learners returns a safe empty state.
  const zeroLearnerPrincipal = await createTestPrincipal();
  const zeroResponse = await GET(
    requestFor(zeroLearnerPrincipal),
  );

  assert(
    zeroResponse.status === 200,
    `expected 200 for zero-learner principal, got ${zeroResponse.status}`,
  );

  const zeroBody = await zeroResponse.json() as {
    learners: unknown[];
    summary: unknown;
    requiresSelection: boolean;
  };

  assert(
    zeroBody.learners.length === 0 &&
      zeroBody.summary === null &&
      zeroBody.requiresSelection === false,
    "zero authorized learners must return a safe empty state, not an error",
  );

  console.log({ test: "zero authorized learners", result: "PASS" });

  // 2. One authorized learner is used directly, with real (non-fake) progress.
  const singlePrincipal = await createTestPrincipal();
  const singleLearner = await createTestLearner();

  await persistenceStore.createPrincipalLearnerAccess(
    `access-adult-${crypto.randomUUID()}`,
    singlePrincipal,
    singleLearner,
    "guardian",
  );

  await buildRealLearnerProgress(singleLearner);

  const singleResponse = await GET(
    requestFor(singlePrincipal),
  );

  assert(
    singleResponse.status === 200,
    `expected 200 for single-learner principal, got ${singleResponse.status}`,
  );

  const singleBody = await singleResponse.json() as {
    learners: Array<{ learnerId: string; relationshipType: string }>;
    selectedLearnerId?: string;
    summary: {
      hasActivity: boolean;
      masteryPercent: number;
      confidencePercent: number;
      evidenceCount: number;
    } | null;
  };

  assert(
    singleBody.learners.length === 1 &&
      singleBody.selectedLearnerId === singleLearner,
    "single authorized learner must be used directly without requiring selection",
  );

  const expectedState = await getLearnerState(
    singleLearner,
    VALIDATION_COMPETENCY_ID,
  );
  const expectedCompetency =
    expectedState?.competencies[0];

  assert(
    Boolean(singleBody.summary?.hasActivity) &&
      singleBody.summary?.evidenceCount ===
        expectedCompetency?.evidenceCount &&
      singleBody.summary?.masteryPercent ===
        Math.round(
          (expectedCompetency?.masteryEstimate ?? 0) * 100,
        ) &&
      singleBody.summary?.confidencePercent ===
        Math.round(
          (expectedCompetency?.confidence ?? 0) * 100,
        ),
    "adult summary must reflect actual persisted learner-state progress, not fake values",
  );

  console.log({ test: "one authorized learner with real progress", result: "PASS" });

  // 3. Multiple authorized learners require explicit selection from the authorized set.
  const multiPrincipal = await createTestPrincipal();
  const learnerX = await createTestLearner();
  const learnerY = await createTestLearner();

  await persistenceStore.createPrincipalLearnerAccess(
    `access-adult-${crypto.randomUUID()}`,
    multiPrincipal,
    learnerX,
    "guardian",
  );
  await persistenceStore.createPrincipalLearnerAccess(
    `access-adult-${crypto.randomUUID()}`,
    multiPrincipal,
    learnerY,
    "guardian",
  );

  const multiResponse = await GET(
    requestFor(multiPrincipal),
  );
  const multiBody = await multiResponse.json() as {
    learners: Array<{ learnerId: string }>;
    selectedLearnerId?: string;
    requiresSelection: boolean;
    summary: unknown;
  };

  assert(
    multiBody.learners.length === 2 &&
      multiBody.requiresSelection === true &&
      multiBody.selectedLearnerId === undefined &&
      multiBody.summary === null,
    "multiple authorized learners must require explicit selection before returning a summary",
  );

  const explicitSelectionResponse = await GET(
    requestFor(multiPrincipal, learnerX),
  );
  const explicitSelectionBody =
    await explicitSelectionResponse.json() as {
      selectedLearnerId?: string;
    };

  assert(
    explicitSelectionResponse.status === 200 &&
      explicitSelectionBody.selectedLearnerId === learnerX,
    "explicit selection of an authorized learner from the authorized set must succeed",
  );

  console.log({ test: "multiple authorized learners", result: "PASS" });

  // 4. Unrelated principal cannot query another learner by manually supplying learnerId.
  const unrelatedPrincipal = await createTestPrincipal();
  const unauthorizedAttempt = await GET(
    requestFor(unrelatedPrincipal, learnerX),
  );

  assert(
    unauthorizedAttempt.status === 403,
    `expected cross-principal learner access to be rejected, got ${unauthorizedAttempt.status}`,
  );

  const selfAttemptOnOtherLearner = await GET(
    requestFor(singlePrincipal, learnerX),
  );

  assert(
    selfAttemptOnOtherLearner.status === 403,
    `expected an authorized principal to be rejected when requesting an unauthorized learner, got ${selfAttemptOnOtherLearner.status}`,
  );

  console.log({ test: "unauthorized cross-principal learner access rejected", result: "PASS" });

  // 5. Revoked relationships must not appear and must not be selectable.
  await persistenceStore.revokePrincipalLearnerAccess(
    multiPrincipal,
    learnerX,
    "guardian",
  );

  const afterRevokeResponse = await GET(
    requestFor(multiPrincipal),
  );
  const afterRevokeBody = await afterRevokeResponse.json() as {
    learners: Array<{ learnerId: string }>;
    selectedLearnerId?: string;
  };

  assert(
    afterRevokeBody.learners.length === 1 &&
      afterRevokeBody.learners[0].learnerId === learnerY &&
      afterRevokeBody.selectedLearnerId === learnerY,
    "revoked relationship must no longer appear and remaining single learner must be used directly",
  );

  const revokedSelectionAttempt = await GET(
    requestFor(multiPrincipal, learnerX),
  );

  assert(
    revokedSelectionAttempt.status === 403,
    `expected revoked relationship learner selection to be rejected, got ${revokedSelectionAttempt.status}`,
  );

  console.log({ test: "revoked relationship denied", result: "PASS" });

  // 6. Read-only boundary: the adult route exposes no mutating handlers.
  const routeModule = await import(
    "../apps/learner/app/api/adult/summary/route"
  );

  assert(
    typeof (routeModule as Record<string, unknown>).POST ===
      "undefined" &&
      typeof (routeModule as Record<string, unknown>).PUT ===
        "undefined" &&
      typeof (routeModule as Record<string, unknown>).DELETE ===
        "undefined" &&
      typeof (routeModule as Record<string, unknown>).PATCH ===
        "undefined",
    "adult supervision route must remain read-only, with no mutating handlers",
  );

  console.log({ test: "adult route is read-only", result: "PASS" });

  // 7. Missing/invalid principal identity remains rejected (no auth regression).
  const missingIdentityResponse = await GET(
    new Request("http://localhost/api/adult/summary"),
  );

  assert(
    missingIdentityResponse.status === 401,
    `expected missing principal identity to be rejected, got ${missingIdentityResponse.status}`,
  );

  console.log({ test: "missing principal identity rejected", result: "PASS" });

  // 8. Production session cookie resolves the Principal for adult
  // endpoints without weakening learner-facing identity, and the
  // Learner-facing GET /api/learning path remains unaffected.
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
    const providerSubject =
      `provider-subject-adult-${crypto.randomUUID()}`;
    const guardianPrincipalId =
      await resolveOrCreatePrincipalForExternalIdentity(
        EXTERNAL_AUTH_ISSUER,
        providerSubject,
      );
    const supervisedLearnerId = await createTestLearner();

    await persistenceStore.ensureLearnerExists(
      supervisedLearnerId,
    );
    await createPrincipalLearnerAccess(
      `access-adult-${crypto.randomUUID()}`,
      guardianPrincipalId,
      supervisedLearnerId,
      "guardian",
    );
    await buildRealLearnerProgress(supervisedLearnerId);

    const providerToken =
      await provider.createToken(providerSubject);
    const issueResponse = await issue(
      new Request("http://localhost/api/session/issue", {
        method: "POST",
        headers: {
          authorization: `Bearer ${providerToken}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          learnerId: supervisedLearnerId,
        }),
      }),
    );

    assert(
      issueResponse.status === 201,
      `expected session issuance 201, got ${issueResponse.status}`,
    );

    const sessionToken = extractSessionToken(issueResponse);

    const productionAdultResponse = await GET(
      new Request("http://localhost/api/adult/summary", {
        headers: {
          cookie: `filumire_auth_session=${sessionToken}`,
        },
      }),
    );

    assert(
      productionAdultResponse.status === 200,
      `expected production adult summary 200, got ${productionAdultResponse.status}`,
    );

    const productionAdultBody =
      await productionAdultResponse.json() as {
        learners: Array<{ learnerId: string }>;
        selectedLearnerId?: string;
        summary: { hasActivity: boolean } | null;
      };

    assert(
      productionAdultBody.selectedLearnerId ===
        supervisedLearnerId &&
        productionAdultBody.summary?.hasActivity === true,
      "production session cookie must resolve the authorized principal and return the supervised learner's real summary",
    );

    const productionLearnerResponse = await learningGet(
      new Request("http://localhost/api/learning", {
        headers: {
          cookie: `filumire_auth_session=${sessionToken}`,
        },
      }),
    );

    assert(
      productionLearnerResponse.status === 200,
      "learner-facing GET /api/learning must remain unaffected by the adult supervision addition",
    );

    console.log({
      test: "production session cookie resolves principal for adult summary",
      result: "PASS",
    });
  } finally {
    restoreNodeEnv();
    restoreSecret();
    provider.restore();
  }

  console.log({
    adultSupervisionTest: "PASS",
    persistence: process.env.FILUMIRE_PERSISTENCE ?? "memory",
  });
}

runAdultSupervisionTests().catch((error) => {
  console.error(error);
  process.exit(1);
});
