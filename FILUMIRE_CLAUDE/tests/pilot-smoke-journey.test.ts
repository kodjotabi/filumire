import { GET, POST } from "../apps/learner/app/api/learning/route";
import {
  POST as issue,
} from "../apps/learner/app/api/session/issue/route";
import {
  GET as adultSummary,
} from "../apps/learner/app/api/adult/summary/route";
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
import { getContentForCompetency } from "../services/content-store";
import { seedContent } from "../services/content-store/seed";
import { GHANA_MATH_PILOT_INITIAL_COMPETENCY_ID } from "../packages/curriculum";

function assert(
  condition: boolean,
  message: string,
): void {
  if (!condition) {
    throw new Error(`FAIL: ${message}`);
  }
}

const PRODUCTION_AUTH_SECRET =
  "stage-h-production-auth-secret-at-least-32-characters";

const EXTERNAL_AUTH_ISSUER =
  "https://identity.stage-h.example.test";

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
  publicJwk.kid = "stage-h-external-key";

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

async function issueSessionFor(
  provider: { createToken: (subject: string) => Promise<string> },
  providerSubject: string,
  learnerId: string,
): Promise<string> {
  const token = await provider.createToken(providerSubject);

  const response = await issue(
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
    response.status === 201,
    `expected session issuance 201, got ${response.status}`,
  );

  return extractSessionToken(response);
}

async function runPilotSmokeJourneyTest(): Promise<void> {
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
    // Authorized learner, established through real production
    // identity/session issuance.
    const learnerProviderSubject =
      `provider-subject-pilot-learner-${crypto.randomUUID()}`;
    const learnerId =
      `learner-pilot-smoke-${crypto.randomUUID()}`;

    const learnerPrincipalId =
      await resolveOrCreatePrincipalForExternalIdentity(
        EXTERNAL_AUTH_ISSUER,
        learnerProviderSubject,
      );

    await persistenceStore.ensureLearnerExists(learnerId);
    await createPrincipalLearnerAccess(
      `access-pilot-self-${crypto.randomUUID()}`,
      learnerPrincipalId,
      learnerId,
      "self",
    );

    const learnerSessionToken = await issueSessionFor(
      provider,
      learnerProviderSubject,
      learnerId,
    );

    // Load the real Ghana pilot and receive governed
    // instruction.
    const initialResponse = await GET(
      new Request("http://localhost/api/learning", {
        headers: {
          cookie: `filumire_auth_session=${learnerSessionToken}`,
        },
      }),
    );

    assert(
      initialResponse.status === 200,
      `expected learner journey load 200, got ${initialResponse.status}`,
    );

    const initialBody = await initialResponse.json() as {
      decision: { sessionId: string; competencyId: string };
      instruction: {
        content: string;
        structured?: { elements: Array<{ type: string; text: string }> };
      };
      progress: { evidenceCount: number; percent: number };
    };

    assert(
      initialBody.decision.competencyId ===
        GHANA_MATH_PILOT_INITIAL_COMPETENCY_ID,
      "pilot smoke journey must start on the real Ghana pilot competency",
    );
    assert(
      Boolean(
        initialBody.instruction.content ||
          initialBody.instruction.structured?.elements?.length,
      ),
      "governed instruction must be produced before the learner answers",
    );

    console.log({
      step: "authorized learner loads real Ghana pilot with governed instruction",
      result: "PASS",
    });

    // Submit a trusted response.
    const content = getContentForCompetency(
      GHANA_MATH_PILOT_INITIAL_COMPETENCY_ID,
    ).find(
      (item) =>
        item.assessmentItemId &&
        item.metadata?.expectedResponse,
    );

    assert(
      Boolean(content?.assessmentItemId),
      "pilot smoke journey requires real Ghana pilot assessment content",
    );

    const clientRequestId = crypto.randomUUID();

    const submitOnce = () =>
      POST(
        new Request("http://localhost/api/learning", {
          method: "POST",
          headers: {
            "content-type": "application/json",
            cookie: `filumire_auth_session=${learnerSessionToken}`,
          },
          body: JSON.stringify({
            sessionId: initialBody.decision.sessionId,
            interactionType: "assessment",
            assessmentItemId: content?.assessmentItemId,
            competencyId: GHANA_MATH_PILOT_INITIAL_COMPETENCY_ID,
            response: content?.metadata?.expectedResponse,
            clientRequestId,
          }),
        }),
      );

    const submitResponse = await submitOnce();

    assert(
      submitResponse.status === 200,
      `expected trusted assessment submission 200, got ${submitResponse.status}`,
    );

    const submitBody = await submitResponse.json() as {
      assessment?: { result?: { correct?: boolean; duplicate?: boolean } };
      decision: { action: string };
      instruction: {
        content: string;
        structured?: { elements: Array<{ type: string; text: string }> };
      };
      progress: { evidenceCount: number };
    };

    assert(
      submitBody.assessment?.result?.correct === true &&
        submitBody.assessment?.result?.duplicate !== true,
      "server must evaluate and persist real trusted evidence",
    );
    assert(
      Boolean(
        submitBody.instruction.content ||
          submitBody.instruction.structured?.elements?.length,
      ),
      "the adaptive system's next action must include governed instruction",
    );

    const evidenceAfterSubmit = await getEvidence(
      learnerId,
      GHANA_MATH_PILOT_INITIAL_COMPETENCY_ID,
    );

    assert(
      evidenceAfterSubmit.length === 1 &&
        submitBody.progress.evidenceCount === 1,
      "learner intelligence/progress must update from persisted evidence",
    );

    console.log({
      step: "trusted response persists evidence and updates learner intelligence",
      nextAction: submitBody.decision.action,
      result: "PASS",
    });

    // Simulate a duplicate/retry (e.g. after uncertain
    // connectivity) - no double evidence, coherent state.
    const retryResponse = await submitOnce();

    assert(
      retryResponse.status === 200,
      `expected duplicate retry to still succeed safely, got ${retryResponse.status}`,
    );

    const retryBody = await retryResponse.json() as {
      assessment?: { result?: { duplicate?: boolean } };
      progress: { evidenceCount: number };
    };

    assert(
      retryBody.assessment?.result?.duplicate === true,
      "retry with the same clientRequestId must be recognised as a duplicate",
    );

    const evidenceAfterRetry = await getEvidence(
      learnerId,
      GHANA_MATH_PILOT_INITIAL_COMPETENCY_ID,
    );

    assert(
      evidenceAfterRetry.length === 1 &&
        retryBody.progress.evidenceCount === 1,
      "duplicate/retry must never create double evidence",
    );

    console.log({
      step: "duplicate/retry produces no double evidence",
      result: "PASS",
    });

    // An authorized adult (guardian) sees the resulting
    // trusted learning state.
    const guardianProviderSubject =
      `provider-subject-pilot-guardian-${crypto.randomUUID()}`;
    const guardianPrincipalId =
      await resolveOrCreatePrincipalForExternalIdentity(
        EXTERNAL_AUTH_ISSUER,
        guardianProviderSubject,
      );

    await createPrincipalLearnerAccess(
      `access-pilot-guardian-${crypto.randomUUID()}`,
      guardianPrincipalId,
      learnerId,
      "guardian",
    );

    const guardianSessionToken = await issueSessionFor(
      provider,
      guardianProviderSubject,
      learnerId,
    );

    const guardianSummaryResponse = await adultSummary(
      new Request("http://localhost/api/adult/summary", {
        headers: {
          cookie: `filumire_auth_session=${guardianSessionToken}`,
        },
      }),
    );

    assert(
      guardianSummaryResponse.status === 200,
      `expected authorized adult summary 200, got ${guardianSummaryResponse.status}`,
    );

    const guardianSummaryBody =
      await guardianSummaryResponse.json() as {
        selectedLearnerId?: string;
        summary: {
          hasActivity: boolean;
          evidenceCount: number;
        } | null;
      };

    assert(
      guardianSummaryBody.selectedLearnerId === learnerId &&
        guardianSummaryBody.summary?.hasActivity === true &&
        guardianSummaryBody.summary?.evidenceCount === 1,
      "authorized adult must see the resulting real trusted learning state",
    );

    console.log({
      step: "authorized adult sees resulting trusted learning state",
      result: "PASS",
    });

    // An unauthorized adult cannot see this learner.
    const strangerProviderSubject =
      `provider-subject-pilot-stranger-${crypto.randomUUID()}`;
    const strangerLearnerId =
      `learner-pilot-stranger-${crypto.randomUUID()}`;
    const strangerPrincipalId =
      await resolveOrCreatePrincipalForExternalIdentity(
        EXTERNAL_AUTH_ISSUER,
        strangerProviderSubject,
      );

    await persistenceStore.ensureLearnerExists(
      strangerLearnerId,
    );
    await createPrincipalLearnerAccess(
      `access-pilot-stranger-${crypto.randomUUID()}`,
      strangerPrincipalId,
      strangerLearnerId,
      "self",
    );

    const strangerSessionToken = await issueSessionFor(
      provider,
      strangerProviderSubject,
      strangerLearnerId,
    );

    const strangerSummaryResponse = await adultSummary(
      new Request(
        `http://localhost/api/adult/summary?learnerId=${learnerId}`,
        {
          headers: {
            cookie: `filumire_auth_session=${strangerSessionToken}`,
          },
        },
      ),
    );

    assert(
      strangerSummaryResponse.status === 403,
      `expected unauthorized adult access to be rejected, got ${strangerSummaryResponse.status}`,
    );

    console.log({
      step: "unauthorized adult cannot see the learner's state",
      result: "PASS",
    });

    console.log({
      pilotSmokeJourneyTest: "PASS",
      persistence: process.env.FILUMIRE_PERSISTENCE ?? "memory",
    });
  } finally {
    restoreNodeEnv();
    restoreSecret();
    provider.restore();
  }
}

runPilotSmokeJourneyTest().catch((error) => {
  console.error(error);
  process.exit(1);
});
