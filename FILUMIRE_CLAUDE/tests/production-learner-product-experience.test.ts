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
import { getLearnerState } from "../services/learner-state-store";
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
  "stage-e-production-auth-secret-at-least-32-characters";

const EXTERNAL_AUTH_ISSUER =
  "https://identity.stage-e.example.test";

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
  publicJwk.kid = "stage-e-external-key";

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

async function setupAuthorizedLearner(
  providerSubject: string,
  learnerId = `learner-stage-e-${crypto.randomUUID()}`,
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
    `access-stage-e-${crypto.randomUUID()}`,
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
): Promise<Response> {
  return issue(
    new Request("http://localhost/api/session/issue", {
      method: "POST",
      headers: {
        authorization: `Bearer ${providerToken}`,
      },
    }),
  );
}

async function runLearnerProductExperienceTest(): Promise<void> {
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
    // Unauthenticated: no production session cookie must be rejected.
    const unauthenticatedResponse = await GET(
      new Request("http://localhost/api/learning"),
    );

    assert(
      unauthenticatedResponse.status === 401,
      `expected unauthenticated learner GET to be rejected, got ${unauthenticatedResponse.status}`,
    );

    const providerSubject =
      `provider-subject-stage-e-${crypto.randomUUID()}`;
    const { learnerId } =
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
      sessionId?: string;
    };

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
      decision: {
        competencyId: string;
        sessionId: string;
      };
      progress: {
        learnerId: string;
        evidenceCount: number;
        percent: number;
        subjectName?: string;
        competencyTitle?: string;
      };
      instruction: {
        content: string;
        structured?: {
          elements: Array<{ type: string; text: string }>;
        };
      };
    };

    assert(
      initialBody.progress.evidenceCount === 0 &&
        initialBody.progress.percent === 0,
      "learner home/learning journey must reflect real, non-hardcoded initial progress",
    );
    assert(
      typeof initialBody.progress.subjectName === "string" &&
        initialBody.progress.subjectName.length > 0,
      "learner journey must present a real curriculum subject name derived from backend state",
    );
    assert(
      typeof initialBody.progress.competencyTitle === "string" &&
        initialBody.progress.competencyTitle.length > 0,
      "learner journey must present a real learning position derived from backend state",
    );
    assert(
      Boolean(
        initialBody.instruction.content ||
          initialBody.instruction.structured?.elements?.length,
      ),
      "governed instructional output must be available for the learner interaction",
    );

    // Client must not be able to establish retention/transfer outcomes directly.
    const forgedRetentionResponse = await POST(
      new Request("http://localhost/api/learning", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          cookie: `filumire_auth_session=${sessionToken}`,
        },
        body: JSON.stringify({
          sessionId: initialBody.decision.sessionId,
          interactionType: "retention",
          competencyId: initialBody.decision.competencyId,
          outcome: "correct",
        }),
      }),
    );

    assert(
      forgedRetentionResponse.status === 400,
      `expected client-claimed retention outcome to be rejected, got ${forgedRetentionResponse.status}`,
    );

    const forgedTransferResponse = await POST(
      new Request("http://localhost/api/learning", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          cookie: `filumire_auth_session=${sessionToken}`,
        },
        body: JSON.stringify({
          sessionId: initialBody.decision.sessionId,
          interactionType: "transfer",
          competencyId: initialBody.decision.competencyId,
          outcome: "correct",
        }),
      }),
    );

    assert(
      forgedTransferResponse.status === 400,
      `expected client-claimed transfer outcome to be rejected, got ${forgedTransferResponse.status}`,
    );

    // Learner submits a trusted assessment response.
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

    const submitResponse = await POST(
      new Request("http://localhost/api/learning", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          cookie: `filumire_auth_session=${sessionToken}`,
        },
        body: JSON.stringify({
          sessionId: initialBody.decision.sessionId,
          interactionType: "assessment",
          assessmentItemId: content?.assessmentItemId,
          competencyId: initialBody.decision.competencyId,
          response: content?.metadata?.expectedResponse,
        }),
      }),
    );

    assert(
      submitResponse.status === 200,
      `expected trusted assessment submission 200, got ${submitResponse.status}`,
    );

    const submitBody = await submitResponse.json() as {
      assessment?: {
        result?: { correct?: boolean };
      };
      decision: {
        action: string;
      };
      progress: {
        evidenceCount: number;
        percent: number;
      };
      instruction: {
        content: string;
        structured?: {
          elements: Array<{ type: string; text: string }>;
        };
      };
    };

    assert(
      submitBody.assessment?.result?.correct === true,
      "server must be the sole authority for assessment correctness",
    );

    const evidenceAfter = await getEvidence(
      learnerId,
      initialBody.decision.competencyId,
    );
    const stateAfter = await getLearnerState(
      learnerId,
      initialBody.decision.competencyId,
    );
    const competencyAfter = stateAfter?.competencies.find(
      (item) =>
        item.competencyId ===
        initialBody.decision.competencyId,
    );

    assert(
      evidenceAfter.length > evidenceBefore.length,
      "submitted learner evidence must be persisted",
    );
    assert(
      submitBody.progress.evidenceCount ===
        competencyAfter?.evidenceCount,
      "returned progress after evidence must reflect persisted learner state",
    );
    assert(
      Boolean(
        submitBody.instruction.content ||
          submitBody.instruction.structured?.elements?.length,
      ),
      "the adaptive system's resulting instruction must drive the next learner interaction",
    );

    // Unauthorized learner/session access must remain rejected.
    const otherProviderSubject =
      `provider-subject-stage-e-other-${crypto.randomUUID()}`;
    await setupAuthorizedLearner(otherProviderSubject);
    const otherProviderToken =
      await provider.createToken(otherProviderSubject);
    const otherIssueResponse = await issueSession(otherProviderToken);
    const otherSessionToken = extractSessionToken(otherIssueResponse);

    const crossSessionResponse = await GET(
      new Request(
        `http://localhost/api/learning?sessionId=${issueBody.sessionId}`,
        {
          headers: {
            cookie: `filumire_auth_session=${otherSessionToken}`,
          },
        },
      ),
    );

    assert(
      crossSessionResponse.status === 401,
      `expected cross-learner session access to be rejected, got ${crossSessionResponse.status}`,
    );

    console.log("PASS: production learner product experience");
  } finally {
    restoreNodeEnv();
    restoreSecret();
    provider.restore();
  }
}

runLearnerProductExperienceTest().catch((error) => {
  console.error(error);
  process.exit(1);
});
