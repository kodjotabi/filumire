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
  GHANA_MATH_PILOT_CURRICULUM_ID,
  GHANA_MATH_PILOT_INITIAL_COMPETENCY_ID,
  GHANA_MATH_PILOT_LEVEL_ID,
  GHANA_MATH_PILOT_SUBJECT_ID,
  getAllCompetencies,
  getCompetency,
  getCompetenciesForCurriculumSubjectLevel,
  getCurriculumFramework,
  getInitialCompetencyForCurriculumSubjectLevel,
  getLearningLevel,
  getSubject,
} from "../packages/curriculum";
import { persistenceStore } from "../services/persistence-provider";
import {
  createPrincipalLearnerAccess,
  resolveOrCreatePrincipalForExternalIdentity,
} from "../services/principal";
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
  "stage-b-production-auth-secret-at-least-32-characters";

const EXTERNAL_AUTH_ISSUER =
  "https://identity.stage-b.example.test";

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
  publicJwk.kid = "stage-b-external-key";

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
): Promise<string> {
  const principalId =
    await resolveOrCreatePrincipalForExternalIdentity(
      EXTERNAL_AUTH_ISSUER,
      providerSubject,
    );
  const learnerId =
    `learner-stage-b-${crypto.randomUUID()}`;

  await persistenceStore.ensureLearnerExists(
    learnerId,
  );
  await createPrincipalLearnerAccess(
    `access-stage-b-${crypto.randomUUID()}`,
    principalId,
    learnerId,
    "self",
  );

  return learnerId;
}

async function runProductionCurriculumFoundationTest(): Promise<void> {
  seedContent();

  const framework = getCurriculumFramework(
    GHANA_MATH_PILOT_CURRICULUM_ID,
  );
  const level = getLearningLevel(
    GHANA_MATH_PILOT_LEVEL_ID,
  );
  const subject = getSubject(
    GHANA_MATH_PILOT_SUBJECT_ID,
  );
  const competencies =
    getCompetenciesForCurriculumSubjectLevel(
      GHANA_MATH_PILOT_CURRICULUM_ID,
      GHANA_MATH_PILOT_SUBJECT_ID,
      GHANA_MATH_PILOT_LEVEL_ID,
    );
  const initialCompetency =
    getInitialCompetencyForCurriculumSubjectLevel(
      GHANA_MATH_PILOT_CURRICULUM_ID,
      GHANA_MATH_PILOT_SUBJECT_ID,
      GHANA_MATH_PILOT_LEVEL_ID,
    );

  assert(
    framework?.countryOrRegion === "Ghana" &&
      framework.name.includes("Pilot"),
    "Ghana pilot curriculum must resolve explicitly as pilot content",
  );
  assert(
    level?.id === GHANA_MATH_PILOT_LEVEL_ID &&
      subject?.id === GHANA_MATH_PILOT_SUBJECT_ID,
    "Ghana pilot subject and level must resolve",
  );
  assert(
    competencies.length === 67 &&
      initialCompetency?.id ===
        GHANA_MATH_PILOT_INITIAL_COMPETENCY_ID,
    "Ghana Mathematics pilot competency sequence must resolve",
  );

  const competencyIds = new Set(
    getAllCompetencies().map(
      (competency) => competency.id,
    ),
  );

  for (const competency of competencies) {
    for (const prerequisiteId of competency.prerequisiteCompetencyIds) {
      assert(
        competencyIds.has(prerequisiteId),
        `Missing prerequisite competency: ${prerequisiteId}`,
      );
    }

    for (const successorId of competency.successorCompetencyIds) {
      const successor = getCompetency(successorId);
      assert(
        successor?.prerequisiteCompetencyIds.includes(
          competency.id,
        ) ?? false,
        `Successor ${successorId} must reference ${competency.id} as prerequisite`,
      );
    }

    assert(
      getContentForCompetency(competency.id).length > 0,
      `Pilot competency ${competency.id} must have linked content`,
    );
  }

  console.log({
    test: "Ghana pilot curriculum structure",
    result: "PASS",
  });

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
      `provider-subject-stage-b-${crypto.randomUUID()}`;
    const learnerId = await setupAuthorizedLearner(
      providerSubject,
    );
    const providerToken =
      await provider.createToken(providerSubject);
    const issueResponse = await issue(
      new Request("http://localhost/api/session/issue", {
        method: "POST",
        headers: {
          authorization: `Bearer ${providerToken}`,
        },
      }),
    );

    assert(
      issueResponse.status === 201,
      `expected issue 201, got ${issueResponse.status}`,
    );

    const sessionToken = extractSessionToken(issueResponse);
    const learningResponse = await GET(
      new Request("http://localhost/api/learning", {
        headers: {
          cookie: `filumire_auth_session=${sessionToken}`,
        },
      }),
    );

    assert(
      learningResponse.status === 200,
      `expected production learning GET 200, got ${learningResponse.status}`,
    );

    const learningBody = await learningResponse.json() as {
      learnerState: {
        learnerId: string;
      };
      decision: {
        id: string;
        action: string;
        competencyId: string;
        sessionId: string;
      };
      content?: {
        competencyId?: string;
        assessmentItemId?: string;
        metadata?: {
          expectedResponse?: string;
        };
      };
      progress: {
        learnerId: string;
        activeCompetencyId?: string;
        evidenceCount: number;
        percent: number;
      };
    };

    assert(
      learningBody.learnerState.learnerId === learnerId,
      "production learner must resolve from authorised identity",
    );
    assert(
      learningBody.decision.competencyId ===
        GHANA_MATH_PILOT_INITIAL_COMPETENCY_ID,
      "production journey must start on the Ghana pilot competency, not a TEST competency",
    );
    assert(
      learningBody.content?.competencyId ===
        GHANA_MATH_PILOT_INITIAL_COMPETENCY_ID,
      "production content must resolve by the Ghana pilot competency",
    );
    assert(
      learningBody.progress.activeCompetencyId ===
        GHANA_MATH_PILOT_INITIAL_COMPETENCY_ID &&
        learningBody.progress.evidenceCount === 0 &&
        learningBody.progress.percent === 0,
      "initial progress must be derived from actual Ghana pilot learner state",
    );

    const assessmentContent = getContentForCompetency(
      GHANA_MATH_PILOT_INITIAL_COMPETENCY_ID,
    ).find(
      (content) =>
        content.assessmentItemId &&
        content.metadata?.expectedResponse,
    );

    assert(
      Boolean(assessmentContent?.assessmentItemId),
      "Ghana pilot competency must have assessment content",
    );

    const evidenceBefore = await getEvidence(
      learnerId,
      GHANA_MATH_PILOT_INITIAL_COMPETENCY_ID,
    );

    const actionResponse = await POST(
      new Request("http://localhost/api/learning", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          cookie: `filumire_auth_session=${sessionToken}`,
        },
        body: JSON.stringify({
          learnerId,
          sessionId: learningBody.decision.sessionId,
          interactionType: "assessment",
          assessmentItemId:
            assessmentContent?.assessmentItemId,
          competencyId:
            GHANA_MATH_PILOT_INITIAL_COMPETENCY_ID,
          response:
            assessmentContent?.metadata?.expectedResponse,
        }),
      }),
    );

    assert(
      actionResponse.status === 200,
      `expected production learning POST 200, got ${actionResponse.status}`,
    );

    const actionBody = await actionResponse.json() as {
      assessment?: {
        result?: {
          correct?: boolean;
        };
      };
      decision: {
        id: string;
        action: string;
        competencyId: string;
      };
      progress: {
        activeCompetencyId?: string;
        evidenceCount: number;
        masteryEstimate: number;
        confidence: number;
        percent: number;
      };
    };
    const evidenceAfter = await getEvidence(
      learnerId,
      GHANA_MATH_PILOT_INITIAL_COMPETENCY_ID,
    );
    const stateAfter = await getLearnerState(
      learnerId,
      GHANA_MATH_PILOT_INITIAL_COMPETENCY_ID,
    );
    const competencyAfter =
      stateAfter?.competencies.find(
        (competency) =>
          competency.competencyId ===
          GHANA_MATH_PILOT_INITIAL_COMPETENCY_ID,
      );

    assert(
      actionBody.assessment?.result?.correct === true,
      "learning action must evaluate against Ghana pilot content",
    );
    assert(
      actionBody.decision.id.startsWith("decision-"),
      "adaptive decision engine must operate on the Ghana pilot competency",
    );
    assert(
      evidenceAfter.length > evidenceBefore.length,
      "evidence must persist against the Ghana pilot competency",
    );
    assert(
      competencyAfter?.competencyId ===
        GHANA_MATH_PILOT_INITIAL_COMPETENCY_ID &&
        competencyAfter.evidenceCount > 0,
      "learner state must persist against the Ghana pilot competency",
    );
    assert(
      actionBody.progress.activeCompetencyId ===
        GHANA_MATH_PILOT_INITIAL_COMPETENCY_ID &&
        actionBody.progress.evidenceCount ===
          competencyAfter?.evidenceCount &&
        actionBody.progress.masteryEstimate ===
          competencyAfter.masteryEstimate &&
        actionBody.progress.confidence ===
          competencyAfter.confidence,
      "progress must come from persisted Ghana pilot learner state",
    );

    const unknownCurriculumResponse = await GET(
      new Request(
        "http://localhost/api/learning?curriculumId=missing-curriculum",
        {
          headers: {
            cookie: `filumire_auth_session=${sessionToken}`,
          },
        },
      ),
    );

    assert(
      unknownCurriculumResponse.status === 404,
      "unknown curriculum identifiers must fail safely",
    );

    const unknownCompetencyResponse = await POST(
      new Request("http://localhost/api/learning", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          cookie: `filumire_auth_session=${sessionToken}`,
        },
        body: JSON.stringify({
          learnerId,
          sessionId: learningBody.decision.sessionId,
          interactionType: "assessment",
          assessmentItemId:
            assessmentContent?.assessmentItemId,
          competencyId: "missing-competency",
          response:
            assessmentContent?.metadata?.expectedResponse,
        }),
      }),
    );

    assert(
      unknownCompetencyResponse.status === 404,
      "unknown competency identifiers must fail safely",
    );

    console.log({
      productionCurriculumFoundationTest: "PASS",
      persistence:
        process.env.FILUMIRE_PERSISTENCE ?? "memory",
    });
  } finally {
    restoreNodeEnv();
    restoreSecret();
    provider.restore();
  }
}

runProductionCurriculumFoundationTest().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

