import {
  createInitialLearnerState,
  applyEvidence,
  saveLearnerState,
  getLearnerState,
} from "../services/learner-state";
import { makeAdaptiveDecision } from "../services/adaptive-engine";
import { saveEvidence } from "../services/evidence-store";
import { getContentForCompetency } from "../services/content-store";
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
import {
  GHANA_MATH_PILOT_INITIAL_COMPETENCY_ID,
} from "../packages/curriculum";
import type {
  DiagnosticState,
  LearningEvidence,
  LearnerState,
} from "../packages/domain";

function assert(
  condition: boolean,
  message: string,
): void {
  if (!condition) {
    throw new Error(`FAIL: ${message}`);
  }
}

const PRODUCTION_AUTH_SECRET =
  "stage-d-production-auth-secret-at-least-32-characters";

const EXTERNAL_AUTH_ISSUER =
  "https://identity.stage-d.example.test";

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
  publicJwk.kid = "stage-d-external-key";

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
  learnerId: string,
  competencyId: string,
  id: string,
  outcome: LearningEvidence["outcome"],
  input: Partial<LearningEvidence> = {},
): LearningEvidence {
  return {
    id,
    learnerId,
    competencyId,
    source: "assessment",
    outcome,
    timestamp: new Date().toISOString(),
    assessmentItemId: id,
    sessionId: `session-${id}`,
    policyVersion: "stage-d-test",
    ...input,
  };
}

async function decisionForState(
  state: LearnerState,
) {
  await persistenceStore.ensureLearnerExists(
    state.learnerId,
  );
  await saveLearnerState(state);

  return makeAdaptiveDecision({
    learnerId: state.learnerId,
    sessionId: `session-${crypto.randomUUID()}`,
    learnerState: state,
  });
}

async function testDiagnosisDrivenInterventions(): Promise<void> {
  const competencyId =
    GHANA_MATH_PILOT_INITIAL_COMPETENCY_ID;

  const cases: Array<{
    name: string;
    diagnosticState: DiagnosticState;
    expectedAction: string;
    expectedReasonCode: string;
  }> = [
    {
      name: "prerequisite gap",
      diagnosticState: "prerequisite_gap",
      expectedAction: "scaffold",
      expectedReasonCode: "PREREQUISITE_GAP",
    },
    {
      name: "conceptual misconception",
      diagnosticState: "misconception",
      expectedAction: "remediate",
      expectedReasonCode: "MISCONCEPTION",
    },
    {
      name: "procedural error",
      diagnosticState: "procedural_error",
      expectedAction: "scaffold",
      expectedReasonCode: "PROCEDURAL_ERROR",
    },
  ];

  for (const testCase of cases) {
    const learnerId =
      `learner-stage-d-${crypto.randomUUID()}`;
    const state = applyEvidence(
      createInitialLearnerState(
        learnerId,
        competencyId,
      ),
      evidence(
        learnerId,
        competencyId,
        `evidence-${crypto.randomUUID()}`,
        "incorrect",
        {
          diagnosticState:
            testCase.diagnosticState,
          diagnosticConfidence: 0.9,
          errorPattern:
            `${testCase.diagnosticState}-pattern`,
        },
      ),
    );

    assert(
      state.competencies[0].diagnosticState ===
        testCase.diagnosticState,
      `${testCase.name} diagnosis must be recorded`,
    );
    assert(
      state.competencies[0].diagnosticHistory?.some(
        (item) =>
          item.diagnosticState ===
          testCase.diagnosticState,
      ) ?? false,
      `${testCase.name} must accumulate diagnostic history`,
    );

    const decision = await decisionForState(state);

    assert(
      decision.decision.action ===
        testCase.expectedAction,
      `${testCase.name} must select ${testCase.expectedAction}`,
    );
    assert(
      decision.decision.reasonCode ===
        testCase.expectedReasonCode,
      `${testCase.name} must remain explainable`,
    );
  }

  console.log({
    test: "diagnosis-driven interventions",
    result: "PASS",
  });
}

async function testLongitudinalSignals(): Promise<void> {
  const learnerId =
    `learner-stage-d-profile-${crypto.randomUUID()}`;
  const competencyId =
    GHANA_MATH_PILOT_INITIAL_COMPETENCY_ID;
  let state = createInitialLearnerState(
    learnerId,
    competencyId,
  );

  const masteryHistory: LearningEvidence[] = [];

  for (let index = 1; index <= 4; index += 1) {
    const masteryEvidence = evidence(
      learnerId,
      competencyId,
      `mastery-${crypto.randomUUID()}`,
      "correct",
      {
        purpose: "mastery",
        independence: "independent",
        difficulty: index < 2 ? "standard" : "challenging",
        representation: index % 2 === 0 ? "numeric" : "verbal",
        strength: "strong",
        interventionType: "practice",
        interventionId: `intervention-mastery-${index}`,
      },
    );

    masteryHistory.push(masteryEvidence);
    state = applyEvidence(state, masteryEvidence, masteryHistory);
  }

  const mastered = state.competencies[0];
  assert(
    mastered.masteryEstimate >= 0.8 &&
      mastered.confidence >= 0.8,
    "repeated evidence must build mastery and confidence",
  );

  const retentionFailureEvidence = evidence(
    learnerId,
    competencyId,
    `retention-fail-${crypto.randomUUID()}`,
    "incorrect",
    {
      purpose: "retention",
      interventionType: "retention_check",
      interventionId: "intervention-retention-fail",
    },
  );
  masteryHistory.push(retentionFailureEvidence);
  state = applyEvidence(state, retentionFailureEvidence, masteryHistory);

  const afterRetentionFailure = state.competencies[0];
  assert(
    afterRetentionFailure.diagnosticState === "forgotten_knowledge" &&
      afterRetentionFailure.retentionState?.status === "not_retained" &&
      afterRetentionFailure.retentionPerformance?.unsuccessfulAttempts === 1 &&
      afterRetentionFailure.masteryEstimate === mastered.masteryEstimate,
    "retention failure must record forgotten knowledge without changing mastery",
  );

  const retentionFailureDecision = await decisionForState(state);
  assert(
    retentionFailureDecision.decision.reasonCode === "FORGOTTEN_KNOWLEDGE_REVIEW",
    "forgotten knowledge must drive an explainable review action",
  );

  for (let i = 1; i <= 4; i++) {
    const retentionRecoveryEvidence = evidence(
      learnerId,
      competencyId,
      `retention-pass-${i}-${crypto.randomUUID()}`,
      "correct",
      {
        purpose: "retention",
        interventionType: "retention_check",
        interventionId: `intervention-retention-pass-${i}`,
      },
    );

    masteryHistory.push(retentionRecoveryEvidence);
    state = applyEvidence(
      state,
      retentionRecoveryEvidence,
      masteryHistory,
    );
  }

  const afterRetentionSuccess = state.competencies[0];
  assert(
    afterRetentionSuccess.retentionState?.status === "retained" &&
      afterRetentionSuccess.retentionPerformance?.attempts === 5 &&
      afterRetentionSuccess.retentionPerformance?.successfulAttempts === 4 &&
      afterRetentionSuccess.masteryEstimate === mastered.masteryEstimate &&
      afterRetentionSuccess.confidence === mastered.confidence,
    "repeated successful retention must restore retention without changing mastery",
  );

  const transferFailureEvidence = evidence(
    learnerId,
    competencyId,
    `transfer-fail-${crypto.randomUUID()}`,
    "incorrect",
    {
      purpose: "transfer",
      interventionType: "transfer_check",
      interventionId: "intervention-transfer-fail",
      responseMode: "application",
    },
  );
  masteryHistory.push(transferFailureEvidence);
  state = applyEvidence(state, transferFailureEvidence, masteryHistory);

  const afterTransferFailure = state.competencies[0];
  assert(
    afterTransferFailure.diagnosticState === "transfer_failure" &&
      afterTransferFailure.transferState?.status === "not_demonstrated" &&
      afterTransferFailure.transferPerformance?.unsuccessfulAttempts === 1,
    "transfer failure must be distinct from ordinary failure",
  );

  const transferFailureDecision = await decisionForState(state);
  assert(
    transferFailureDecision.decision.reasonCode === "TRANSFER_FAILURE_PRACTICE",
    "transfer failure must drive explainable next-best action",
  );

  for (let i = 1; i <= 4; i++) {
    const transferRecoveryEvidence = evidence(
      learnerId,
      competencyId,
      `transfer-pass-${i}-${crypto.randomUUID()}`,
      "correct",
      {
        purpose: "transfer",
        interventionType: "transfer_check",
        interventionId: `intervention-transfer-pass-${i}`,
        responseMode: "application",
      },
    );

    masteryHistory.push(transferRecoveryEvidence);
    state = applyEvidence(
      state,
      transferRecoveryEvidence,
      masteryHistory,
    );
  }

  const afterTransferSuccess = state.competencies[0];
  assert(
    afterTransferSuccess.transferState?.status === "demonstrated" &&
      afterTransferSuccess.transferPerformance?.attempts === 5 &&
      afterTransferSuccess.transferPerformance?.successfulAttempts === 4,
    "repeated transfer success must be recorded longitudinally",
  );

  assert(
    afterTransferSuccess.interventionResponse?.some(
      (item) =>
        item.interventionType === "transfer_check" &&
        item.attempts === 5,
    ) ?? false,
    "intervention response history must accumulate",
  );

  await saveLearnerState(state);
  const persisted = await getLearnerState(
    learnerId,
    competencyId,
  );
  const persistedCompetency =
    persisted?.competencies[0];

  assert(
    persistedCompetency?.diagnosticHistory?.some(
      (item) =>
        item.diagnosticState ===
        "transfer_failure",
    ) ?? false,
    "longitudinal diagnostic signals must persist",
  );

  assert(
    persistedCompetency?.retentionPerformance?.attempts === 5 &&
      persistedCompetency.transferPerformance?.attempts === 5,
    "retention and transfer performance must persist",
  );

  console.log({
    test: "longitudinal learner signals",
    result: "PASS",
  });
}

async function testCarelessExecution(): Promise<void> {
  const learnerId =
    `learner-stage-d-careless-${crypto.randomUUID()}`;
  const competencyId =
    GHANA_MATH_PILOT_INITIAL_COMPETENCY_ID;
  let state = createInitialLearnerState(
    learnerId,
    competencyId,
  );

  const carelessHistory: LearningEvidence[] = [];

  for (let index = 1; index <= 4; index += 1) {
    const masteryEvidence = evidence(
      learnerId,
      competencyId,
      `careless-build-${crypto.randomUUID()}`,
      "correct",
      {
        purpose: "mastery",
        independence: "independent",
        difficulty: index < 2 ? "standard" : "challenging",
        representation: index % 2 === 0 ? "numeric" : "verbal",
        strength: "strong",
      },
    );
    carelessHistory.push(masteryEvidence);
    state = applyEvidence(state, masteryEvidence, carelessHistory);
  }

  const carelessError = evidence(
    learnerId,
    competencyId,
    `careless-error-${crypto.randomUUID()}`,
    "incorrect",
    { purpose: "practice" },
  );
  carelessHistory.push(carelessError);
  state = applyEvidence(state, carelessError, carelessHistory);

  assert(
    state.competencies[0].diagnosticState ===
      "careless_execution",
    "high-mastery ordinary miss must be diagnosed as careless execution",
  );

  const decision = await decisionForState(state);
  assert(
    decision.decision.action === "reassess" &&
      decision.decision.reasonCode ===
        "CARELESS_EXECUTION_CHECK",
    "careless execution must drive explainable reassessment",
  );

  console.log({
    test: "careless execution diagnosis",
    result: "PASS",
  });
}

async function testProductionDiagnosticMetadata(): Promise<void> {
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
      `provider-subject-stage-d-${crypto.randomUUID()}`;
    const principalId =
      await resolveOrCreatePrincipalForExternalIdentity(
        EXTERNAL_AUTH_ISSUER,
        providerSubject,
      );
    const learnerId =
      `learner-stage-d-production-${crypto.randomUUID()}`;

    await persistenceStore.ensureLearnerExists(
      learnerId,
    );
    await createPrincipalLearnerAccess(
      `access-stage-d-${crypto.randomUUID()}`,
      principalId,
      learnerId,
      "self",
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
    const learningBody = await learningResponse.json() as {
      decision: {
        sessionId: string;
        competencyId: string;
        interventionId?: string;
      };
      content?: {
        assessmentItemId?: string;
      };
    };

    assert(
      learningBody.decision.competencyId ===
        GHANA_MATH_PILOT_INITIAL_COMPETENCY_ID,
      "production journey must remain connected to Stage B competency",
    );

    /*
     * Tranche 4C: the diagnose pool prefers purpose-tagged diagnostic
     * items, so the first item depends on the authored content. Answer
     * with the served item's own procedural-error option and check the
     * diagnosis follows that item's metadata.
     */
    const servedItem = getContentForCompetency(
      GHANA_MATH_PILOT_INITIAL_COMPETENCY_ID,
    ).find(
      (item) =>
        item.assessmentItemId ===
        learningBody.content?.assessmentItemId,
    );
    const servedRules = JSON.parse(
      servedItem?.metadata?.diagnosticRules ?? "{}",
    ) as Record<string, { errorPattern: string; diagnosticState: string }>;
    const [diagnosticResponse, diagnosticRule] =
      Object.entries(servedRules).find(
        ([, rule]) => rule.diagnosticState === "procedural_error",
      ) ?? [];

    assert(
      Boolean(diagnosticResponse && diagnosticRule),
      "served diagnostic item must carry a procedural-error rule",
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
            learningBody.decision.interventionId,
          interactionType: "assessment",
          assessmentItemId:
            learningBody.content?.assessmentItemId,
          competencyId:
            learningBody.decision.competencyId,
          response: diagnosticResponse,
        }),
      }),
    );

    assert(
      actionResponse.status === 200,
      `expected production diagnostic action 200, got ${actionResponse.status}`,
    );

    const persisted = await getLearnerState(
      learnerId,
      GHANA_MATH_PILOT_INITIAL_COMPETENCY_ID,
    );
    const competency = persisted?.competencies[0];

    if (!competency) {
      throw new Error(
        "FAIL: production learner competency was not persisted.",
      );
    }

    assert(
      competency?.diagnosticState ===
        "procedural_error" &&
        competency.errorPatterns.includes(
          diagnosticRule!.errorPattern,
        ),
      "production action must use content diagnostic metadata",
    );
    assert(
      competency.interventionHistory.length > 0 &&
        Boolean(competency.interventionResponse?.some(
          (item) =>
            item.interventionType ===
            "diagnose",
        )),
      "production action must persist intervention response history",
    );

    console.log({
      test: "production diagnostic metadata",
      result: "PASS",
    });
  } finally {
    restoreNodeEnv();
    restoreSecret();
    provider.restore();
  }
}

async function runAdaptiveLearnerIntelligenceTests(): Promise<void> {
  await testDiagnosisDrivenInterventions();
  await testLongitudinalSignals();
  await testCarelessExecution();
  await testProductionDiagnosticMetadata();

  console.log({
    adaptiveLearnerIntelligenceTest: "PASS",
    persistence:
      process.env.FILUMIRE_PERSISTENCE ?? "memory",
  });
}

runAdaptiveLearnerIntelligenceTests().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

