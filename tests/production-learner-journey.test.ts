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
  createPrincipalAuthSession,
  revokePrincipalAuthSession,
} from "../services/auth-session";
import {
  createPrincipalLearnerAccess,
  resolveOrCreatePrincipalForExternalIdentity,
  revokePrincipalLearnerAccess,
} from "../services/principal";
import { persistenceStore } from "../services/persistence-provider";
import { getEvidence } from "../services/evidence-store";
import { getLearnerState } from "../services/learner-state-store";
import {
  getLearnerInterventions,
} from "../services/intervention-store";
import {
  getContentForCompetency,
} from "../services/content-store";
import { seedContent } from "../services/content-store/seed";

function assert(
  condition: boolean,
  message: string,
): void {
  if (!condition) {
    throw new Error(`FAIL: ${message}`);
  }
}

const PRODUCTION_AUTH_SECRET =
  "stage-a-production-auth-secret-at-least-32-characters";

const EXTERNAL_AUTH_ISSUER =
  "https://identity.stage-a.example.test";

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
  publicJwk.kid = "stage-a-external-key";

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

async function createInternalToken(
  principalId: string,
  learnerId: string,
  sessionId: string,
): Promise<string> {
  return new SignJWT({
    sid: sessionId,
    learner_id: learnerId,
  })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setAudience("filumire-learner-api")
    .setExpirationTime("5m")
    .setIssuedAt()
    .setIssuer("filumire-learner")
    .setSubject(principalId)
    .sign(new TextEncoder().encode(PRODUCTION_AUTH_SECRET));
}

async function setupAuthorizedLearner(
  providerSubject: string,
  learnerId = `learner-stage-a-${crypto.randomUUID()}`,
): Promise<{
  principalId: string;
  learnerId: string;
}> {
  const principalId =
    await resolveOrCreatePrincipalForExternalIdentity(
      EXTERNAL_AUTH_ISSUER,
      providerSubject,
    );

  await persistenceStore.ensureLearnerExists(
    learnerId,
  );

  await createPrincipalLearnerAccess(
    `access-stage-a-${crypto.randomUUID()}`,
    principalId,
    learnerId,
    "self",
  );

  return {
    principalId,
    learnerId,
  };
}

async function issueSession(
  providerToken: string,
  learnerId?: string,
): Promise<Response> {
  return issue(
    new Request("http://localhost/api/session/issue", {
      method: "POST",
      headers: {
        authorization: `Bearer ${providerToken}`,
        ...(learnerId
          ? { "content-type": "application/json" }
          : {}),
      },
      body: learnerId
        ? JSON.stringify({ learnerId })
        : undefined,
    }),
  );
}

async function runProductionLearnerJourneyTest(): Promise<void> {
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
    const providerSubject =
      `provider-subject-stage-a-${crypto.randomUUID()}`;
    const { principalId, learnerId } =
      await setupAuthorizedLearner(providerSubject);
    const providerToken =
      await provider.createToken(providerSubject);
    const issueResponse = await issueSession(providerToken);

    assert(
      issueResponse.status === 201,
      `expected session issuance 201, got ${issueResponse.status}`,
    );

    const sessionToken = extractSessionToken(issueResponse);
    const issueBody = (await issueResponse.json()) as {
      principalId?: string;
      learnerId?: string;
      sessionId?: string;
    };

    assert(
      issueBody.principalId === principalId,
      "authenticated Principal must resolve from external identity",
    );
    assert(
      issueBody.learnerId === learnerId,
      "exactly one authorised internal Learner must be selected",
    );
    assert(
      issueBody.learnerId !== providerSubject,
      "provider subject must not be used as LearnerId",
    );
    assert(
      typeof issueBody.sessionId === "string",
      "production issue response must include auth session ID",
    );

    const initialResponse = await GET(
      new Request("http://localhost/api/learning", {
        headers: {
          cookie: `filumire_auth_session=${sessionToken}`,
        },
      }),
    );

    assert(
      initialResponse.status === 200,
      `expected production learner GET 200, got ${initialResponse.status}`,
    );

    const initialBody = await initialResponse.json() as {
      learnerState: {
        learnerId: string;
        competencies: Array<{
          competencyId: string;
          evidenceCount: number;
        }>;
      };
      decision: {
        id: string;
        action: string;
        competencyId: string;
        sessionId: string;
      };
      progress: {
        learnerId: string;
        evidenceCount: number;
        percent: number;
      };
      content?: {
        assessmentItemId?: string;
        metadata?: {
          expectedResponse?: string;
        };
      };
    };

    assert(
      initialBody.learnerState.learnerId === learnerId,
      "learner app must derive learner from production identity",
    );
    assert(
      initialBody.decision.sessionId === issueBody.sessionId,
      "production GET without query sessionId must use auth session ID",
    );
    assert(
      initialBody.progress.learnerId === learnerId &&
        initialBody.progress.evidenceCount === 0 &&
        initialBody.progress.percent === 0,
      "initial progress must come from actual persisted learner state",
    );

    const content = getContentForCompetency(
      initialBody.decision.competencyId,
    ).find(
      (item) =>
        item.assessmentItemId &&
        item.metadata?.expectedResponse,
    );

    assert(
      Boolean(content?.assessmentItemId),
      "test requires assessment content for the active competency",
    );

    const evidenceBefore = await getEvidence(
      learnerId,
      initialBody.decision.competencyId,
    );
    const interventionsBefore =
      await getLearnerInterventions(
        learnerId,
        initialBody.decision.competencyId,
      );

    const learningActionResponse = await POST(
      new Request("http://localhost/api/learning", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          cookie: `filumire_auth_session=${sessionToken}`,
        },
        body: JSON.stringify({
          learnerId,
          sessionId: initialBody.decision.sessionId,
          interactionType: "assessment",
          assessmentItemId: content?.assessmentItemId,
          competencyId: initialBody.decision.competencyId,
          response: content?.metadata?.expectedResponse,
        }),
      }),
    );

    assert(
      learningActionResponse.status === 200,
      `expected production learner POST 200, got ${learningActionResponse.status}`,
    );

    const actionBody = await learningActionResponse.json() as {
      assessment?: {
        result?: {
          correct?: boolean;
        };
      };
      learnerState: {
        learnerId: string;
        competencies: Array<{
          competencyId: string;
          evidenceCount: number;
          masteryEstimate: number;
          confidence: number;
        }>;
      };
      decision: {
        id: string;
        action: string;
        sessionId: string;
      };
      progress: {
        learnerId: string;
        evidenceCount: number;
        masteryEstimate: number;
        confidence: number;
        percent: number;
      };
    };

    assert(
      actionBody.assessment?.result?.correct === true,
      "valid learner action must be evaluated server-side",
    );
    assert(
      actionBody.decision.id.startsWith("decision-"),
      "learning action must reach the adaptive decision engine",
    );

    const evidenceAfter = await getEvidence(
      learnerId,
      initialBody.decision.competencyId,
    );
    const stateAfter = await getLearnerState(
      learnerId,
      initialBody.decision.competencyId,
    );
    const interventionsAfter =
      await getLearnerInterventions(
        learnerId,
        initialBody.decision.competencyId,
      );
    const competencyAfter =
      stateAfter?.competencies.find(
        (item) =>
          item.competencyId ===
          initialBody.decision.competencyId,
      );

    assert(
      evidenceAfter.length > evidenceBefore.length,
      "learning action must persist evidence",
    );
    assert(
      (competencyAfter?.evidenceCount ?? 0) > 0,
      "learning action must persist learner state progress",
    );
    assert(
      interventionsAfter.length > interventionsBefore.length,
      "learning action must create adaptive intervention persistence",
    );
    assert(
      actionBody.progress.evidenceCount ===
        competencyAfter?.evidenceCount &&
        actionBody.progress.masteryEstimate ===
          competencyAfter?.masteryEstimate &&
        actionBody.progress.confidence ===
          competencyAfter?.confidence,
      "returned progress must be based on actual persisted learner state",
    );

    const unauthorizedLearnerId =
      `learner-unauthorized-stage-a-${crypto.randomUUID()}`;
    await persistenceStore.ensureLearnerExists(
      unauthorizedLearnerId,
    );
    const unauthorizedSessionId =
      `auth-session-stage-a-${crypto.randomUUID()}`;
    await createPrincipalAuthSession(
      unauthorizedSessionId,
      principalId,
      new Date(Date.now() + 60_000).toISOString(),
    );
    const unauthorizedToken = await createInternalToken(
      principalId,
      unauthorizedLearnerId,
      unauthorizedSessionId,
    );
    const unauthorizedResponse = await GET(
      new Request("http://localhost/api/learning", {
        headers: {
          cookie: `filumire_auth_session=${unauthorizedToken}`,
        },
      }),
    );

    assert(
      unauthorizedResponse.status === 401,
      "Principal cannot access an unauthorised Learner",
    );

    await revokePrincipalLearnerAccess(
      principalId,
      learnerId,
      "self",
    );
    const revokedAccessResponse = await GET(
      new Request("http://localhost/api/learning", {
        headers: {
          cookie: `filumire_auth_session=${sessionToken}`,
        },
      }),
    );

    assert(
      revokedAccessResponse.status === 401,
      "revoked Principal-Learner authorization must block access",
    );

    const revokedAuthSubject =
      `provider-subject-revoked-auth-${crypto.randomUUID()}`;
    const revokedAuthSetup =
      await setupAuthorizedLearner(revokedAuthSubject);
    const revokedAuthSessionId =
      `auth-session-stage-a-${crypto.randomUUID()}`;
    await createPrincipalAuthSession(
      revokedAuthSessionId,
      revokedAuthSetup.principalId,
      new Date(Date.now() + 60_000).toISOString(),
    );
    const revokedAuthToken = await createInternalToken(
      revokedAuthSetup.principalId,
      revokedAuthSetup.learnerId,
      revokedAuthSessionId,
    );
    await revokePrincipalAuthSession(
      revokedAuthSessionId,
      revokedAuthSetup.principalId,
    );
    const revokedAuthResponse = await GET(
      new Request("http://localhost/api/learning", {
        headers: {
          cookie: `filumire_auth_session=${revokedAuthToken}`,
        },
      }),
    );

    assert(
      revokedAuthResponse.status === 401,
      "revoked auth_session must block access",
    );

    const expiredAuthSubject =
      `provider-subject-expired-auth-${crypto.randomUUID()}`;
    const expiredAuthSetup =
      await setupAuthorizedLearner(expiredAuthSubject);
    const expiredAuthSessionId =
      `auth-session-stage-a-${crypto.randomUUID()}`;
    await createPrincipalAuthSession(
      expiredAuthSessionId,
      expiredAuthSetup.principalId,
      new Date(Date.now() - 1_000).toISOString(),
    );
    const expiredAuthToken = await createInternalToken(
      expiredAuthSetup.principalId,
      expiredAuthSetup.learnerId,
      expiredAuthSessionId,
    );
    const expiredAuthResponse = await GET(
      new Request("http://localhost/api/learning", {
        headers: {
          cookie: `filumire_auth_session=${expiredAuthToken}`,
        },
      }),
    );

    assert(
      expiredAuthResponse.status === 401,
      "expired auth_session must block access",
    );

    const unauthenticatedResponse = await GET(
      new Request("http://localhost/api/learning"),
    );

    assert(
      unauthenticatedResponse.status === 401,
      "unauthenticated learner access must fail safely",
    );

    const selectedSubject =
      `provider-subject-selection-${crypto.randomUUID()}`;
    const selectionPrincipalId =
      await resolveOrCreatePrincipalForExternalIdentity(
        EXTERNAL_AUTH_ISSUER,
        selectedSubject,
      );
    const firstLearnerId =
      `learner-selection-a-${crypto.randomUUID()}`;
    const secondLearnerId =
      `learner-selection-b-${crypto.randomUUID()}`;
    await persistenceStore.ensureLearnerExists(firstLearnerId);
    await persistenceStore.ensureLearnerExists(secondLearnerId);
    await createPrincipalLearnerAccess(
      `access-stage-a-${crypto.randomUUID()}`,
      selectionPrincipalId,
      firstLearnerId,
      "self",
    );
    await createPrincipalLearnerAccess(
      `access-stage-a-${crypto.randomUUID()}`,
      selectionPrincipalId,
      secondLearnerId,
      "guardian",
    );
    const selectionToken =
      await provider.createToken(selectedSubject);
    const selectionResponse = await issueSession(
      selectionToken,
      secondLearnerId,
    );

    assert(
      selectionResponse.status === 201,
      `expected selected learner issuance 201, got ${selectionResponse.status}`,
    );

    const selectionBody =
      await selectionResponse.json() as {
        learnerId?: string;
        principalId?: string;
      };

    assert(
      selectionBody.principalId === selectionPrincipalId &&
        selectionBody.learnerId === secondLearnerId,
      "multi-learner selection must use the requested authorised Learner",
    );

    const unauthorizedSelectionResponse = await issueSession(
      selectionToken,
      `learner-selection-unauthorised-${crypto.randomUUID()}`,
    );

    assert(
      unauthorizedSelectionResponse.status === 403,
      "selected Learner must be re-authorized server-side",
    );

    console.log({
      productionLearnerJourneyTest: "PASS",
      persistence:
        process.env.FILUMIRE_PERSISTENCE ?? "memory",
    });
  } finally {
    restoreNodeEnv();
    restoreSecret();
    provider.restore();
  }
}

runProductionLearnerJourneyTest().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
