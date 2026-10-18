import { generateInstruction } from "../services/edututor";
import {
  DeterministicGovernedInstructionalEngine,
} from "../packages/ai";
import {
  createInitialLearnerState,
  getLearnerState,
} from "../services/learner-state";
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
import {
  getContentForCompetency,
} from "../services/content-store";
import { seedContent } from "../services/content-store/seed";
import {
  GHANA_MATH_PILOT_INITIAL_COMPETENCY_ID,
  getCompetency,
} from "../packages/curriculum";
import type {
  AdaptiveDecision,
} from "../packages/domain";

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

const PRODUCTION_AUTH_SECRET =
  "stage-c-production-auth-secret-at-least-32-characters";

const EXTERNAL_AUTH_ISSUER =
  "https://identity.stage-c.example.test";

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
  publicJwk.kid = "stage-c-external-key";

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

async function setupProductionLearner(
  providerSubject: string,
): Promise<string> {
  const principalId =
    await resolveOrCreatePrincipalForExternalIdentity(
      EXTERNAL_AUTH_ISSUER,
      providerSubject,
    );
  const learnerId =
    `learner-stage-c-${crypto.randomUUID()}`;

  await persistenceStore.ensureLearnerExists(
    learnerId,
  );
  await createPrincipalLearnerAccess(
    `access-stage-c-${crypto.randomUUID()}`,
    principalId,
    learnerId,
    "self",
  );

  return learnerId;
}

async function testGovernedInstructionService(): Promise<void> {
  seedContent();

  const learnerId =
    `learner-stage-c-service-${crypto.randomUUID()}`;
  const sessionId =
    `session-stage-c-${crypto.randomUUID()}`;
  const learnerState = createInitialLearnerState(
    learnerId,
    GHANA_MATH_PILOT_INITIAL_COMPETENCY_ID,
  );
  const decision: AdaptiveDecision = {
    id: `decision-stage-c-${crypto.randomUUID()}`,
    learnerId,
    sessionId,
    action: "diagnose",
    competencyId:
      GHANA_MATH_PILOT_INITIAL_COMPETENCY_ID,
    reasonCode: "INSUFFICIENT_EVIDENCE",
    evidenceIds: [],
    policyVersion: "stage-c-test",
    createdAt: new Date().toISOString(),
    confidence: 0,
    interventionId:
      `intervention-stage-c-${crypto.randomUUID()}`,
    responseMode: "multiple_choice",
  };
  const content = getContentForCompetency(
    GHANA_MATH_PILOT_INITIAL_COMPETENCY_ID,
  )[0];

  const instruction = await generateInstruction({
    learnerState,
    decision,
    content,
    instructionalContext:
      "Stage C governed instructional-engine test.",
  });

  if (!instruction.structured) {
    throw new Error(
      "FAIL: governed instruction must include structured output.",
    );
  }

  const structured = instruction.structured;

  assert(
    instruction.modelId ===
      "filu-governed-instructional-engine-v1",
    "MockEduTutor must not be the production instructional authority",
  );
  assert(
    structured.decisionId === decision.id &&
      structured.competencyId ===
        GHANA_MATH_PILOT_INITIAL_COMPETENCY_ID &&
      structured.groundedContentId ===
        content.id,
    "instruction must be driven by adaptive decision and selected content",
  );
  assert(
    structured.elements.some(
      (element) => element.type === "learner_task",
    ) && instruction.content.includes(content.body),
    "instruction must be structured and curriculum-grounded",
  );
  assert(
    structured.authority.mayChangeIdentity === false &&
      structured.authority.mayChangeAuthorization === false &&
      structured.authority.mayChangeCompetency === false &&
      structured.authority.mayChangeMastery === false &&
      structured.authority.mayOverrideAdaptivePolicy === false,
    "instructional output must preserve adaptive authority boundaries",
  );

  console.log({
    test: "governed instructional service",
    result: "PASS",
  });
}

async function testInstructionalContextValidation(): Promise<void> {
  const engine =
    new DeterministicGovernedInstructionalEngine();
  const competency = getCompetency(
    GHANA_MATH_PILOT_INITIAL_COMPETENCY_ID,
  );

  if (!competency) {
    throw new Error("FAIL: Ghana pilot competency missing.");
  }

  await assertRejects(
    () =>
      engine.generate({
        learnerId: "learner-stage-c-invalid",
        sessionId: "session-stage-c-invalid",
        competency: {
          id: competency.id,
          title: competency.title,
          description: competency.description,
          prerequisiteCompetencyIds:
            competency.prerequisiteCompetencyIds,
          misconceptions:
            competency.misconceptions,
        },
        decision: {
          id: "decision-stage-c-invalid",
          action: "diagnose",
          reasonCode: "INSUFFICIENT_EVIDENCE",
          competencyId: "wrong-competency",
        },
        learnerProfile: {
          masteryEstimate: 0,
          confidence: 0,
          diagnosticState: "unknown",
          diagnosticConfidence: 0,
          errorPatterns: [],
        },
        instructionalContext: "invalid",
      }),
    "mismatched instructional context must fail safely",
  );

  await assertRejects(
    () =>
      engine.generate({
        learnerId: "learner-stage-c-invalid",
        sessionId: "session-stage-c-invalid",
        competency: {
          id: competency.id,
          title: competency.title,
          description: competency.description,
          prerequisiteCompetencyIds:
            competency.prerequisiteCompetencyIds,
          misconceptions:
            competency.misconceptions,
        },
        decision: {
          id: "decision-stage-c-invalid",
          action: "diagnose",
          reasonCode: "INSUFFICIENT_EVIDENCE",
          competencyId: competency.id,
        },
        learnerProfile: {
          masteryEstimate: 0,
          confidence: 0,
          diagnosticState: "unknown",
          diagnosticConfidence: 0,
          errorPatterns: [],
        },
        instructionalContext: "",
      }),
    "missing instructional context must fail safely",
  );

  console.log({
    test: "instructional context validation",
    result: "PASS",
  });
}

async function testProductionLearnerInstruction(): Promise<void> {
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
      `provider-subject-stage-c-${crypto.randomUUID()}`;
    const learnerId = await setupProductionLearner(
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
      decision: {
        id: string;
        sessionId: string;
        competencyId: string;
        action: string;
        reasonCode: string;
        interventionId?: string;
      };
      content?: {
        id: string;
        body: string;
        assessmentItemId?: string;
        metadata?: {
          expectedResponse?: string;
        };
      };
      instruction: {
        modelId: string;
        content: string;
        structured?: {
          competencyId: string;
          decisionId: string;
          groundedContentId?: string;
          elements: Array<{
            type: string;
            text: string;
          }>;
          authority: {
            mayChangeCompetency: boolean;
            mayChangeMastery: boolean;
            mayOverrideAdaptivePolicy: boolean;
          };
        };
      };
    };

    if (!learningBody.instruction.structured) {
      throw new Error(
        "FAIL: production instruction must include structured output.",
      );
    }

    const structured = learningBody.instruction.structured;

    assert(
      learningBody.instruction.modelId ===
        "filu-governed-instructional-engine-v1",
      "production learner route must use governed engine, not MockEduTutor",
    );
    assert(
        structured.decisionId ===
        learningBody.decision.id &&
          structured.competencyId ===
          learningBody.decision.competencyId &&
          structured.groundedContentId ===
          learningBody.content?.id,
      "production instruction must be driven by adaptive decision and content",
    );
    assert(
        structured.elements.some(
        (element) =>
          element.text.includes(
            learningBody.content?.body ?? "missing",
          ),
      ),
      "production instruction must be grounded in selected curriculum content",
    );
    assert(
      structured.authority.mayChangeCompetency === false &&
        structured.authority.mayChangeMastery === false &&
        structured.authority.mayOverrideAdaptivePolicy === false,
      "instructional output cannot override adaptive policy or mastery",
    );

    /*
     * Teaching-first (Phase 1): the topic opened with its explanation,
     * grounded as checked above. "Check my knowledge first" reaches
     * the question answered below.
     */
    const questionResponse = await POST(
      new Request("http://localhost/api/learning", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          cookie: `filumire_auth_session=${sessionToken}`,
        },
        body: JSON.stringify({
          sessionId: learningBody.decision.sessionId,
          competencyId: learningBody.decision.competencyId,
          interactionType: "check_first",
        }),
      }),
    );
    const questionBody =
      await questionResponse.json() as typeof learningBody;

    assert(
      Boolean(questionBody.content?.assessmentItemId),
      "check first serves a question",
    );

    const evidenceBefore = await getEvidence(
      learnerId,
      learningBody.decision.competencyId,
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
          interventionId:
            questionBody.decision.interventionId,
          interactionType: "assessment",
          assessmentItemId:
            questionBody.content?.assessmentItemId,
          competencyId:
            learningBody.decision.competencyId,
          response: "48",
        }),
      }),
    );

    assert(
      actionResponse.status === 200,
      `expected production learning POST 200, got ${actionResponse.status}`,
    );

    const evidenceAfter = await getEvidence(
      learnerId,
      learningBody.decision.competencyId,
    );
    const stateAfter = await getLearnerState(
      learnerId,
      learningBody.decision.competencyId,
    );

    assert(
      evidenceAfter.length > evidenceBefore.length,
      "learner responses must still reach evidence persistence",
    );
    assert(
      (stateAfter?.competencies[0]?.evidenceCount ?? 0) > 0,
      "learner responses must still update mastery/state persistence",
    );

    console.log({
      test: "production learner governed instruction",
      result: "PASS",
    });
  } finally {
    restoreNodeEnv();
    restoreSecret();
    provider.restore();
  }
}

async function runGovernedInstructionalEngineTests(): Promise<void> {
  await testGovernedInstructionService();
  await testInstructionalContextValidation();
  await testProductionLearnerInstruction();

  console.log({
    governedInstructionalEngineTest: "PASS",
    persistence:
      process.env.FILUMIRE_PERSISTENCE ?? "memory",
  });
}

runGovernedInstructionalEngineTests().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});


