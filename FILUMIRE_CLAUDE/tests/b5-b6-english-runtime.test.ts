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
import { setLearnerGrade } from "../services/learner-context";
import { getContentForCompetency } from "../services/content-store";
import { seedContent } from "../services/content-store/seed";
import {
  getCompetency,
  getContentStandard,
  getLearningIndicator,
  getStrand,
  getSubject,
  getSubStrand,
  GHANA_B5_ENGLISH_PILOT_SUBJECT_ID,
  GHANA_B5_PILOT_LEVEL_ID,
  GHANA_B6_ENGLISH_PILOT_SUBJECT_ID,
  GHANA_B6_PILOT_LEVEL_ID,
  GHANA_MATH_PILOT_LEVEL_ID,
} from "../packages/curriculum";
import {
  CURRICULUM_VERSION_GHANA_PILOT_V1_ID,
  getCompetencyMappingsForCompetency,
  getCurriculumNode,
  resolveCurriculumContext,
} from "../packages/curriculum-framework";
import { ADAPTIVE_POLICY_VERSION } from "../services/adaptive-policy";
import { GHANA_B5_ENGLISH_PUBLISHED_SPECS } from "../packages/curriculum/ghana-b5-english-adaptive";
import { GHANA_B6_ENGLISH_PUBLISHED_SPECS } from "../packages/curriculum/ghana-b6-english-adaptive";

/*
 * Basic 5 and Basic 6 English through the real, authenticated
 * /api/learning route (production session path). No English
 * specific route or engine: the same GET/POST used by every subject.
 */

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`FAIL: ${message}`);
  }
}

const PRODUCTION_AUTH_SECRET =
  "english-runtime-secret-at-least-32-characters";
const EXTERNAL_AUTH_ISSUER =
  "https://identity.english-runtime.example.test";
const EXTERNAL_AUTH_AUDIENCE = "filumire-session-issuer";

function setEnvironmentVariable(name: string, value: string): () => void {
  const previousValue = Object.getOwnPropertyDescriptor(process.env, name);
  Object.defineProperty(process.env, name, {
    configurable: true,
    enumerable: true,
    value,
    writable: true,
  });
  return () => {
    if (previousValue) {
      Object.defineProperty(process.env, name, previousValue);
      return;
    }
    Reflect.deleteProperty(process.env, name);
  };
}

async function configureProvider(): Promise<{
  createToken: (providerSubject: string) => Promise<string>;
  restore: () => void;
}> {
  const { privateKey, publicKey } = await generateKeyPair("RS256");
  const publicJwk = await exportJWK(publicKey);
  publicJwk.kid = "english-runtime-key";
  const restoreJwks = setEnvironmentVariable(
    "FILUMIRE_EXTERNAL_AUTH_JWKS",
    JSON.stringify({ keys: [publicJwk] }),
  );
  const restoreIssuer = setEnvironmentVariable("FILUMIRE_EXTERNAL_AUTH_ISSUER", EXTERNAL_AUTH_ISSUER);
  const restoreAudience = setEnvironmentVariable("FILUMIRE_EXTERNAL_AUTH_AUDIENCE", EXTERNAL_AUTH_AUDIENCE);
  return {
    async createToken(providerSubject: string): Promise<string> {
      return new SignJWT()
        .setProtectedHeader({ alg: "RS256", kid: publicJwk.kid, typ: "JWT" })
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

async function setUpAuthorizedLearner(
  provider: { createToken: (subject: string) => Promise<string> },
): Promise<{ learnerId: string; cookie: string }> {
  const providerSubject = `provider-subject-english-${crypto.randomUUID()}`;
  const learnerId = `learner-english-runtime-${crypto.randomUUID()}`;
  const principalId = await resolveOrCreatePrincipalForExternalIdentity(
    EXTERNAL_AUTH_ISSUER,
    providerSubject,
  );
  await persistenceStore.ensureLearnerExists(learnerId);
  await createPrincipalLearnerAccess(
    `access-english-runtime-${crypto.randomUUID()}`,
    principalId,
    learnerId,
    "self",
  );
  const response = await issue(
    new Request("http://localhost/api/session/issue", {
      method: "POST",
      headers: {
        authorization: `Bearer ${await provider.createToken(providerSubject)}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ learnerId }),
    }),
  );
  assert(response.status === 201, `expected session issuance 201, got ${response.status}`);
  const match = response.headers.get("set-cookie")?.match(/filumire_auth_session=([^;]+)/);
  assert(Boolean(match), "issued response carries the auth session cookie");
  return { learnerId, cookie: `filumire_auth_session=${decodeURIComponent(match![1])}` };
}

type LearningBody = {
  acknowledgement?: { status: string; interventionId: string };
  decision: {
    sessionId: string;
    competencyId: string;
    action: string;
    reasonCode?: string;
    policyVersion: string;
    interventionId?: string;
  };
  content?: {
    id: string;
    competencyId: string;
    type: string;
    language: string;
    assessmentItemId?: string;
    metadata?: Record<string, string>;
  };
  progress: {
    activeCompetencyId?: string;
    subjectName?: string;
    competencyTitle?: string;
    evidenceCount: number;
  };
  assessment?: {
    result?: { correct?: boolean };
    evidence?: { errorPattern?: string; purpose?: string; outcome?: string };
  };
};

type Level = {
  name: string;
  levelId: string;
  subjectId: string;
  specs: typeof GHANA_B5_ENGLISH_PUBLISHED_SPECS;
  initialCode: string;
  midCode: string;
};

const LEVELS: Level[] = [
  {
    name: "Basic 5 English",
    levelId: GHANA_B5_PILOT_LEVEL_ID,
    subjectId: GHANA_B5_ENGLISH_PILOT_SUBJECT_ID,
    specs: GHANA_B5_ENGLISH_PUBLISHED_SPECS,
    initialCode: "B5.1.1.1.1",
    midCode: "B5.3.5.1.2",
  },
  {
    name: "Basic 6 English",
    levelId: GHANA_B6_PILOT_LEVEL_ID,
    subjectId: GHANA_B6_ENGLISH_PILOT_SUBJECT_ID,
    specs: GHANA_B6_ENGLISH_PUBLISHED_SPECS,
    initialCode: "B6.1.1.1.1",
    midCode: "B6.5.7.1.1",
  },
];

/*
 * The competency, its curriculum records, its framework node and the
 * content item all describe the same indicator.
 */
function assertConsistentIds(level: Level, competencyId: string, body: LearningBody): void {
  const spec = level.specs.find((item) => item.competencyId === competencyId);
  assert(Boolean(spec), `${level.name}: ${competencyId} is a published spec`);
  const competency = getCompetency(competencyId)!;
  assert(competency.subjectId === level.subjectId, `${level.name}: competency belongs to the requested subject`);
  assert(competency.learningLevelId === level.levelId, `${level.name}: competency belongs to the requested level`);
  assert(getSubject(competency.subjectId)?.learningLevelId === level.levelId, `${level.name}: subject belongs to the level`);
  assert(Boolean(getStrand(competency.strandId)), `${level.name}: strand resolves`);
  assert(Boolean(getSubStrand(competency.subStrandId)), `${level.name}: sub-strand resolves`);
  assert(Boolean(getContentStandard(competency.contentStandardId)), `${level.name}: content standard resolves`);
  assert(
    getLearningIndicator(competency.learningIndicatorId)?.statement === spec!.statement,
    `${level.name}: indicator resolves to the official statement`,
  );
  const mappings = getCompetencyMappingsForCompetency(competencyId);
  assert(mappings.length === 1, `${level.name}: one framework mapping`);
  const node = getCurriculumNode(mappings[0].curriculumNodeId);
  assert(node?.code === spec!.code && node.subjectId === level.subjectId, `${level.name}: framework node is the same indicator`);

  const content = body.content;
  assert(Boolean(content), `${level.name}: learning content returned`);
  assert(content!.competencyId === competencyId, `${level.name}: content belongs to the decided competency`);
  assert(content!.id.startsWith(`content-gh-b${level.levelId.match(/basic-(\d)/)![1]}-`), `${level.name}: content id carries the level`);
  assert(content!.metadata?.curriculumNodeCode === spec!.code, `${level.name}: content is tagged with the same indicator code`);
  assert(
    getContentForCompetency(competencyId).some((item) => item.id === content!.id),
    `${level.name}: returned content is an authored content-store item`,
  );
  assert(content!.metadata?.expectedResponse === undefined, `${level.name}: answer key is not sent to the learner`);
  assert(content!.metadata?.diagnosticRules === undefined, `${level.name}: diagnostic rules are not sent to the learner`);
  assert(body.decision.policyVersion === ADAPTIVE_POLICY_VERSION, `${level.name}: decision made by the common adaptive policy`);
  assert(body.progress.subjectName === "English Language", `${level.name}: progress names the subject`);
  assert(body.progress.competencyTitle === competency.title, `${level.name}: progress names the competency`);
}

async function get(cookie: string, query: string): Promise<{ status: number; body: LearningBody }> {
  const response = await GET(new Request(`http://localhost/api/learning?${query}`, { headers: { cookie } }));
  return { status: response.status, body: (await response.json()) as LearningBody };
}

async function post(cookie: string, payload: Record<string, unknown>): Promise<{ status: number; body: LearningBody }> {
  const response = await POST(
    new Request("http://localhost/api/learning", {
      method: "POST",
      headers: { "content-type": "application/json", cookie },
      body: JSON.stringify({ interactionType: "assessment", clientRequestId: crypto.randomUUID(), ...payload }),
    }),
  );
  return { status: response.status, body: (await response.json()) as LearningBody };
}

async function runLevel(level: Level, provider: { createToken: (s: string) => Promise<string> }): Promise<void> {
  const learner = await setUpAuthorizedLearner(provider);
  // The stored grade is authoritative (tranche 3): the learner is a
  // Basic 5 / Basic 6 learner before the level's subject is requested.
  await setLearnerGrade(learner.learnerId, level.levelId);
  const query = `levelId=${level.levelId}&subjectId=${level.subjectId}`;
  const initialSpec = level.specs.find((spec) => spec.code === level.initialCode)!;

  // 1-7. Subject, curriculum, competency, content, lesson/activity structure, ids.
  const first = await get(learner.cookie, query);
  assert(first.status === 200, `${level.name}: GET /api/learning 200, got ${first.status}`);
  assert(
    first.body.decision.competencyId === initialSpec.competencyId,
    `${level.name}: starts at ${level.initialCode}, got ${first.body.decision.competencyId}`,
  );
  assert(first.body.decision.action === "diagnose", `${level.name}: a new learner is diagnosed first`);
  assert(
    first.body.content?.type === "assessment" && first.body.content.metadata?.assessmentPurpose === "diagnostic",
    `${level.name}: diagnosis serves an authored diagnostic question`,
  );
  assert(JSON.parse(first.body.content!.metadata!.options ?? "[]").length === 4, `${level.name}: question has 4 options`);
  assertConsistentIds(level, initialSpec.competencyId, first.body);
  assert(
    Boolean(resolveCurriculumContext(CURRICULUM_VERSION_GHANA_PILOT_V1_ID, level.levelId, level.subjectId)),
    `${level.name}: curriculum context resolves`,
  );

  const authored = getContentForCompetency(initialSpec.competencyId, "en");
  assert(authored.length === 13, `${level.name}: 13 English items for the topic`);
  for (const type of ["lesson", "example", "scaffold", "remediation", "practice"]) {
    assert(authored.some((item) => item.type === type), `${level.name}: topic has a ${type} item`);
  }

  // Evidence through POST: a real wrong option carries its authored misconception.
  const item = getContentForCompetency(initialSpec.competencyId).find((c) => c.id === first.body.content!.id)!;
  const rules = JSON.parse(item.metadata!.diagnosticRules) as Record<string, { errorPattern: string }>;
  const wrongOption = Object.keys(rules)[0];
  const wrong = await post(learner.cookie, {
    sessionId: first.body.decision.sessionId,
    interventionId: first.body.decision.interventionId,
    assessmentItemId: item.assessmentItemId,
    competencyId: initialSpec.competencyId,
    response: wrongOption,
  });
  assert(wrong.status === 200, `${level.name}: POST wrong answer 200, got ${wrong.status}`);
  assert(wrong.body.assessment?.result?.correct === false, `${level.name}: wrong option evaluated as incorrect`);
  assert(
    wrong.body.assessment?.evidence?.errorPattern === rules[wrongOption].errorPattern &&
      initialSpec.misconceptions.includes(rules[wrongOption].errorPattern),
    `${level.name}: evidence records the authored misconception`,
  );
  assert(wrong.body.progress.evidenceCount === 1, `${level.name}: evidence persisted`);
  assert(wrong.body.decision.action !== "advance", `${level.name}: a wrong answer does not advance`);
  assertConsistentIds(level, initialSpec.competencyId, wrong.body);


  /*
   * Tranche 4B: the wrong diagnostic answer leads to a teaching card.
   * Refreshing does not move on; Next (POST acknowledge) does, without
   * creating evidence, and leads to a question under that card's
   * intervention.
   */
  const card = wrong.body;
  assert(!card.content?.assessmentItemId && Boolean(card.decision.interventionId), `${level.name}: a wrong diagnostic answer leads to a teaching card (got ${card.content?.type})`);
  const refreshed = await get(learner.cookie, query);
  assert(
    refreshed.body.content?.id === card.content?.id && refreshed.body.decision.interventionId === card.decision.interventionId,
    `${level.name}: refresh returns the same card and intervention`,
  );
  const ackBase = { sessionId: card.decision.sessionId, competencyId: initialSpec.competencyId, interactionType: "acknowledge" };
  const noIntervention = await post(learner.cookie, ackBase);
  assert(noIntervention.status === 400, `${level.name}: acknowledge without an intervention is rejected, got ${noIntervention.status}`);
  const forged = await post(learner.cookie, { ...ackBase, interventionId: "intervention-not-this-learners" });
  assert(forged.status === 404, `${level.name}: acknowledging an unknown intervention is rejected, got ${forged.status}`);
  const diagnosisAck = await post(learner.cookie, { ...ackBase, interventionId: first.body.decision.interventionId });
  assert(diagnosisAck.status === 409, `${level.name}: a question step cannot be acknowledged, got ${diagnosisAck.status}`);
  const ack = await post(learner.cookie, { ...ackBase, interventionId: card.decision.interventionId });
  assert(ack.status === 200 && ack.body.acknowledgement?.status === "acknowledged", `${level.name}: Next acknowledges the card, got ${ack.status}`);
  assert(ack.body.progress.evidenceCount === 1, `${level.name}: acknowledgement creates no evidence`);
  assert(
    ack.body.decision.reasonCode === "INSTRUCTION_CHECK" && ack.body.decision.interventionId === card.decision.interventionId,
    `${level.name}: after Next the question is evaluated under the card's intervention`,
  );

  const next = ack.body.content!;
  const nextItem = getContentForCompetency(initialSpec.competencyId).find((c) => c.id === next.id)!;
  assert(Boolean(nextItem.assessmentItemId), `${level.name}: the engine serves another authored question`);
  const right = await post(learner.cookie, {
    sessionId: ack.body.decision.sessionId,
    interventionId: ack.body.decision.interventionId,
    assessmentItemId: nextItem.assessmentItemId,
    competencyId: initialSpec.competencyId,
    response: nextItem.metadata!.expectedResponse,
  });
  assert(right.status === 200 && right.body.assessment?.result?.correct === true, `${level.name}: correct option evaluated as correct`);
  assert(right.body.progress.evidenceCount === 2, `${level.name}: second evidence persisted`);

  // A topic further into the curriculum, through the same route.
  const midSpec = level.specs.find((spec) => spec.code === level.midCode)!;
  const mid = await get(learner.cookie, `${query}&competencyId=${midSpec.competencyId}`);
  assert(mid.status === 200, `${level.name}: GET ${level.midCode} 200, got ${mid.status}`);
  assert(mid.body.decision.competencyId === midSpec.competencyId, `${level.name}: ${level.midCode} resolves`);
  assertConsistentIds(level, midSpec.competencyId, mid.body);

  // Inconsistent selections fail safely.
  const wrongLevel = await get(learner.cookie, `levelId=${GHANA_MATH_PILOT_LEVEL_ID}&subjectId=${level.subjectId}`);
  assert(wrongLevel.status === 404, `${level.name}: subject under the wrong level is rejected, got ${wrongLevel.status}`);
  const otherSubject = await get(
    learner.cookie,
    `levelId=${level.levelId}&subjectId=${level.subjectId}&competencyId=competency-gh-math-b4-number-patterns-001`,
  );
  assert(otherSubject.status === 404, `${level.name}: a competency from another subject is rejected, got ${otherSubject.status}`);

  console.log({ test: `${level.name} runtime`, result: "PASS" });
}

async function run(): Promise<void> {
  seedContent();
  const provider = await configureProvider();
  const restoreSecret = setEnvironmentVariable("FILUMIRE_AUTH_JWT_SECRET", PRODUCTION_AUTH_SECRET);
  const restoreNodeEnv = setEnvironmentVariable("NODE_ENV", "production");
  try {
    // Unauthenticated access is still refused.
    const anonymous = await GET(
      new Request(`http://localhost/api/learning?levelId=${GHANA_B5_PILOT_LEVEL_ID}&subjectId=${GHANA_B5_ENGLISH_PILOT_SUBJECT_ID}`),
    );
    assert(anonymous.status === 401, `unauthenticated English request rejected, got ${anonymous.status}`);

    for (const level of LEVELS) {
      await runLevel(level, provider);
    }

    // The French review fix to e6_215 is what the content store serves.
    const b6Prepositions = GHANA_B6_ENGLISH_PUBLISHED_SPECS.find((spec) => spec.code === "B6.5.7.1.1")!;
    const french = getContentForCompetency(b6Prepositions.competencyId, "fr")
      .map((item) => `${item.body}\n${item.metadata?.options ?? ""}\n${item.metadata?.expectedResponse ?? ""}`)
      .join("\n");
    assert(french.includes("by le moyen de transport ou d'envoi"), "B6.5.7.1.1 French answer option uses the reviewed wording");
    assert(!french.includes("by la façon de voyager"), "B6.5.7.1.1 old French wording is gone");

    console.log({ b5b6EnglishRuntime: "PASS", persistence: process.env.FILUMIRE_PERSISTENCE ?? "memory" });
  } finally {
    restoreNodeEnv();
    restoreSecret();
    provider.restore();
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
