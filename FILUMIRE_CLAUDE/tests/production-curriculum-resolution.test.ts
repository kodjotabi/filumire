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
import { getLearnerState } from "../services/learner-state-store";
import { getContentForCompetency } from "../services/content-store";
import { seedContent } from "../services/content-store/seed";
import {
  createInitialLearnerState,
  applyEvidence,
} from "../services/learner-state";
import { saveLearnerState } from "../services/learner-state-store";
import { saveEvidence } from "../services/evidence-store";
import { GHANA_MATH_PILOT_INITIAL_COMPETENCY_ID } from "../packages/curriculum";
import { saveLearnerLearningContext } from "../services/learner-context";

function assert(
  condition: boolean,
  message: string,
): void {
  if (!condition) {
    throw new Error(`FAIL: ${message}`);
  }
}

const GH_COMPETENCY_002 =
  "competency-gh-math-b4-number-patterns-002";

const PRODUCTION_AUTH_SECRET =
  "curriculum-onboarding-secret-at-least-32-characters";

const EXTERNAL_AUTH_ISSUER =
  "https://identity.curriculum-onboarding.example.test";

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
  publicJwk.kid = "curriculum-onboarding-key";

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

async function setUpAuthorizedLearner(): Promise<{
  learnerId: string;
  sessionToken: string;
}> {
  const providerSubject = `provider-subject-curriculum-${crypto.randomUUID()}`;
  const learnerId = `learner-curriculum-${crypto.randomUUID()}`;
  const principalId =
    await resolveOrCreatePrincipalForExternalIdentity(
      EXTERNAL_AUTH_ISSUER,
      providerSubject,
    );

  await persistenceStore.ensureLearnerExists(learnerId);
  await createPrincipalLearnerAccess(
    `access-curriculum-${crypto.randomUUID()}`,
    principalId,
    learnerId,
    "self",
  );

  const provider = await configureProvider();
  const sessionToken = await issueSessionFor(
    provider,
    providerSubject,
    learnerId,
  );
  provider.restore();

  return { learnerId, sessionToken };
}

async function runProductionCurriculumResolutionTest(): Promise<void> {
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
    // 3 & 8. Valid resolution + existing Ghana Mathematics
    // learner journey still works end to end.
    const learner = await setUpAuthorizedLearner();

    const initialResponse = await GET(
      new Request("http://localhost/api/learning", {
        headers: {
          cookie: `filumire_auth_session=${learner.sessionToken}`,
        },
      }),
    );

    assert(
      initialResponse.status === 200,
      `expected valid resolution 200, got ${initialResponse.status}`,
    );

    const initialBody = await initialResponse.json() as {
      decision: { sessionId: string; competencyId: string };
      progress: { activeCompetencyId?: string };
    };

    assert(
      initialBody.decision.competencyId ===
        GHANA_MATH_PILOT_INITIAL_COMPETENCY_ID,
      "a fresh authorized learner must resolve to the real Ghana Mathematics initial competency",
    );

    const contextAfterFirstLoad =
      await persistenceStore.getLearnerLearningContext(
        learner.learnerId,
      );

    assert(
      contextAfterFirstLoad?.activeCompetencyId ===
        GHANA_MATH_PILOT_INITIAL_COMPETENCY_ID,
      "loading the learner journey must persist the resolved active competency in the learning context",
    );

    console.log({
      test: "valid resolution creates/uses learner learning context",
      result: "PASS",
    });

    const content = getContentForCompetency(
      GHANA_MATH_PILOT_INITIAL_COMPETENCY_ID,
    ).find(
      (item) =>
        item.assessmentItemId &&
        item.metadata?.expectedResponse,
    );

    const submitResponse = await POST(
      new Request("http://localhost/api/learning", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          cookie: `filumire_auth_session=${learner.sessionToken}`,
        },
        body: JSON.stringify({
          sessionId: initialBody.decision.sessionId,
          interactionType: "assessment",
          assessmentItemId: content?.assessmentItemId,
          competencyId: GHANA_MATH_PILOT_INITIAL_COMPETENCY_ID,
          response: content?.metadata?.expectedResponse,
          clientRequestId: crypto.randomUUID(),
        }),
      }),
    );

    assert(
      submitResponse.status === 200,
      `expected trusted submission to succeed, got ${submitResponse.status}`,
    );

    const submitBody = await submitResponse.json() as {
      assessment?: { result?: { correct?: boolean } };
      progress: { evidenceCount: number };
    };

    assert(
      submitBody.assessment?.result?.correct === true &&
        submitBody.progress.evidenceCount === 1,
      "the existing Ghana Mathematics learner journey must still evaluate and persist real evidence",
    );

    console.log({
      test: "existing Ghana Mathematics learner journey still works",
      result: "PASS",
    });

    // 4. Unknown curriculum rejection.
    const unknownCurriculumResponse = await GET(
      new Request(
        "http://localhost/api/learning?curriculumId=missing-curriculum",
        {
          headers: {
            cookie: `filumire_auth_session=${learner.sessionToken}`,
          },
        },
      ),
    );

    assert(
      unknownCurriculumResponse.status === 404,
      `expected unknown curriculum to fail safely, got ${unknownCurriculumResponse.status}`,
    );

    console.log({
      test: "unknown curriculum rejected",
      result: "PASS",
    });

    // 5. Unknown/inconsistent grade rejection.
    const unknownGradeResponse = await GET(
      new Request(
        "http://localhost/api/learning?levelId=missing-grade",
        {
          headers: {
            cookie: `filumire_auth_session=${learner.sessionToken}`,
          },
        },
      ),
    );

    assert(
      unknownGradeResponse.status === 404,
      `expected unknown grade to fail safely, got ${unknownGradeResponse.status}`,
    );

    console.log({
      test: "unknown/inconsistent grade rejected",
      result: "PASS",
    });

    // 6. Unknown/inconsistent subject rejection.
    const unknownSubjectResponse = await GET(
      new Request(
        "http://localhost/api/learning?subjectId=missing-subject",
        {
          headers: {
            cookie: `filumire_auth_session=${learner.sessionToken}`,
          },
        },
      ),
    );

    assert(
      unknownSubjectResponse.status === 404,
      `expected unknown subject to fail safely, got ${unknownSubjectResponse.status}`,
    );

    console.log({
      test: "unknown/inconsistent subject rejected",
      result: "PASS",
    });

    // 7. Invalid active competency: explicit contract is
    // (a) an explicit bad override must be rejected, and
    // (b) a stale/invalid persisted active competency must
    // fall back safely to a valid initial competency rather
    // than crash or silently misbehave.
    const explicitBadCompetencyResponse = await GET(
      new Request(
        "http://localhost/api/learning?competencyId=missing-competency",
        {
          headers: {
            cookie: `filumire_auth_session=${learner.sessionToken}`,
          },
        },
      ),
    );

    assert(
      explicitBadCompetencyResponse.status === 404,
      `expected an explicit invalid competency override to be rejected, got ${explicitBadCompetencyResponse.status}`,
    );

    const staleContextLearner = await setUpAuthorizedLearner();

    await saveLearnerLearningContext({
      learnerId: staleContextLearner.learnerId,
      curriculumVersionId:
        contextAfterFirstLoad!.curriculumVersionId,
      gradeId: contextAfterFirstLoad!.gradeId,
      activeSubjectId:
        contextAfterFirstLoad!.activeSubjectId,
      activeCompetencyId: "stale-unrelated-competency-id",
      updatedAt: new Date().toISOString(),
    });

    const staleFallbackResponse = await GET(
      new Request("http://localhost/api/learning", {
        headers: {
          cookie: `filumire_auth_session=${staleContextLearner.sessionToken}`,
        },
      }),
    );

    assert(
      staleFallbackResponse.status === 200,
      `expected a stale invalid active competency to fall back safely, got ${staleFallbackResponse.status}`,
    );

    const staleFallbackBody = await staleFallbackResponse.json() as {
      decision: { competencyId: string };
    };

    assert(
      staleFallbackBody.decision.competencyId ===
        GHANA_MATH_PILOT_INITIAL_COMPETENCY_ID,
      "a stale/invalid persisted active competency must safely fall back to a valid initial competency",
    );

    console.log({
      test: "invalid active competency: explicit override rejected, stale context falls back safely",
      result: "PASS",
    });

    // 9. Changing active context does not corrupt existing
    // learner evidence/state.
    const evidenceBeforeContextChange = await getEvidence(
      learner.learnerId,
      GHANA_MATH_PILOT_INITIAL_COMPETENCY_ID,
    );
    const stateBeforeContextChange = await getLearnerState(
      learner.learnerId,
      GHANA_MATH_PILOT_INITIAL_COMPETENCY_ID,
    );

    await saveLearnerLearningContext({
      ...contextAfterFirstLoad!,
      activeCompetencyId: GH_COMPETENCY_002,
      updatedAt: new Date().toISOString(),
    });

    const evidenceAfterContextChange = await getEvidence(
      learner.learnerId,
      GHANA_MATH_PILOT_INITIAL_COMPETENCY_ID,
    );
    const stateAfterContextChange = await getLearnerState(
      learner.learnerId,
      GHANA_MATH_PILOT_INITIAL_COMPETENCY_ID,
    );

    assert(
      evidenceAfterContextChange.length ===
        evidenceBeforeContextChange.length &&
        JSON.stringify(stateAfterContextChange) ===
          JSON.stringify(stateBeforeContextChange),
      "changing the learner's active context must not delete or corrupt existing evidence/state",
    );

    console.log({
      test: "changing active context does not corrupt existing evidence/state",
      result: "PASS",
    });

    // 10. Adult summary follows the learner's actual active
    // context rather than a hardcoded competency id.
    const progressedLearnerId = `learner-curriculum-progressed-${crypto.randomUUID()}`;
    await persistenceStore.ensureLearnerExists(
      progressedLearnerId,
    );

    let progressedState = createInitialLearnerState(
      progressedLearnerId,
      GH_COMPETENCY_002,
    );

    progressedState = applyEvidence(progressedState, {
      id: `ev-curriculum-progressed-${crypto.randomUUID()}`,
      learnerId: progressedLearnerId,
      competencyId: GH_COMPETENCY_002,
      source: "assessment",
      outcome: "correct",
      timestamp: new Date().toISOString(),
      policyVersion: "test",
    });

    await saveLearnerState(progressedState);
    await saveEvidence({
      id: `ev-curriculum-progressed-${crypto.randomUUID()}`,
      learnerId: progressedLearnerId,
      competencyId: GH_COMPETENCY_002,
      source: "assessment",
      outcome: "correct",
      timestamp: new Date().toISOString(),
      policyVersion: "test",
    });

    await saveLearnerLearningContext({
      learnerId: progressedLearnerId,
      curriculumVersionId:
        contextAfterFirstLoad!.curriculumVersionId,
      gradeId: contextAfterFirstLoad!.gradeId,
      activeSubjectId: contextAfterFirstLoad!.activeSubjectId,
      activeCompetencyId: GH_COMPETENCY_002,
      updatedAt: new Date().toISOString(),
    });

    const guardianPrincipalId =
      await resolveOrCreatePrincipalForExternalIdentity(
        EXTERNAL_AUTH_ISSUER,
        `provider-subject-curriculum-guardian-${crypto.randomUUID()}`,
      );
    await createPrincipalLearnerAccess(
      `access-curriculum-guardian-${crypto.randomUUID()}`,
      guardianPrincipalId,
      progressedLearnerId,
      "guardian",
    );

    const guardianSessionToken = await (async () => {
      const p = await configureProvider();
      const subject = `provider-subject-curriculum-guardian-token-${crypto.randomUUID()}`;
      const principalIdForToken =
        await resolveOrCreatePrincipalForExternalIdentity(
          EXTERNAL_AUTH_ISSUER,
          subject,
        );
      await createPrincipalLearnerAccess(
        `access-curriculum-guardian2-${crypto.randomUUID()}`,
        principalIdForToken,
        progressedLearnerId,
        "guardian",
      );
      const token = await issueSessionFor(
        p,
        subject,
        progressedLearnerId,
      );
      p.restore();
      return token;
    })();

    const summaryResponse = await adultSummary(
      new Request("http://localhost/api/adult/summary", {
        headers: {
          cookie: `filumire_auth_session=${guardianSessionToken}`,
        },
      }),
    );

    assert(
      summaryResponse.status === 200,
      `expected adult summary 200, got ${summaryResponse.status}`,
    );

    const summaryBody = await summaryResponse.json() as {
      summary: {
        hasActivity: boolean;
        competencyTitle?: string;
      } | null;
    };

    assert(
      summaryBody.summary?.hasActivity === true &&
        summaryBody.summary?.competencyTitle ===
          "Describe Number Pattern Rules",
      "adult summary must follow the learner's real active context/competency, not a hardcoded id",
    );

    console.log({
      test: "adult summary follows real active context",
      result: "PASS",
    });

    console.log({
      productionCurriculumResolutionTest: "PASS",
      persistence: process.env.FILUMIRE_PERSISTENCE ?? "memory",
    });
  } finally {
    restoreNodeEnv();
    restoreSecret();
    provider.restore();
  }
}

runProductionCurriculumResolutionTest().catch((error) => {
  console.error(error);
  process.exit(1);
});
