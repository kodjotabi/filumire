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
import { getContentForCompetency } from "../services/content-store";
import { seedContent } from "../services/content-store/seed";
import { getLearnerStates } from "../services/learner-state-store";
import {
  LearnerContextValidationError,
  setActiveSubject,
  setLearnerGrade,
  updateActiveCompetency,
} from "../services/learner-context";
import { getCompetency } from "../packages/curriculum";
import {
  CURRICULUM_VERSION_GHANA_PILOT_V1_ID,
  getAvailableSubjectsForGrade,
  getSubjectsForGrade,
  GRADE_GHANA_BASIC_4_ID,
  GRADE_GHANA_BASIC_5_ID,
  GRADE_GHANA_BASIC_6_ID,
  isSupportedGrade,
  SUBJECT_GHANA_BASIC4_COMPUTING_ID,
  SUBJECT_GHANA_BASIC4_ENGLISH_ID,
  SUBJECT_GHANA_BASIC4_MATH_ID,
  SUBJECT_GHANA_BASIC4_SCIENCE_ID,
  SUBJECT_GHANA_BASIC5_COMPUTING_ID,
  SUBJECT_GHANA_BASIC5_ENGLISH_ID,
  SUBJECT_GHANA_BASIC5_MATHEMATICS_ID,
  SUBJECT_GHANA_BASIC5_SCIENCE_ID,
  SUBJECT_GHANA_BASIC6_COMPUTING_ID,
  SUBJECT_GHANA_BASIC6_ENGLISH_ID,
  SUBJECT_GHANA_BASIC6_MATHEMATICS_ID,
  SUBJECT_GHANA_BASIC6_SCIENCE_ID,
} from "../packages/curriculum-framework";
import {
  isFilumireSubjectKey,
  toFilumireSubjects,
} from "../apps/learner/components/filumire/subjects";

/*
 * Tranche 3: grade-aware subject discovery and learner context.
 * One generic mechanism for every grade and subject, driven
 * through the real authenticated /api/learning route.
 */

function assert(condition: boolean, message: string): void {
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
  } catch (error) {
    assert(
      error instanceof LearnerContextValidationError,
      `${message} (wrong error: ${String(error)})`,
    );
    return;
  }
  throw new Error(`FAIL: ${message} (not rejected)`);
}

const PRODUCTION_AUTH_SECRET =
  "grade-aware-secret-at-least-32-characters-long";
const EXTERNAL_AUTH_ISSUER =
  "https://identity.grade-aware.example.test";
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

type Provider = { createToken: (providerSubject: string) => Promise<string>; restore: () => void };

async function configureProvider(): Promise<Provider> {
  const { privateKey, publicKey } = await generateKeyPair("RS256");
  const publicJwk = await exportJWK(publicKey);
  publicJwk.kid = "grade-aware-key";
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
  provider: Provider,
): Promise<{ learnerId: string; cookie: string }> {
  const providerSubject = `provider-subject-grade-${crypto.randomUUID()}`;
  const learnerId = `learner-grade-aware-${crypto.randomUUID()}`;
  const principalId = await resolveOrCreatePrincipalForExternalIdentity(
    EXTERNAL_AUTH_ISSUER,
    providerSubject,
  );
  await persistenceStore.ensureLearnerExists(learnerId);
  await createPrincipalLearnerAccess(
    `access-grade-aware-${crypto.randomUUID()}`,
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
  decision: { sessionId: string; competencyId: string; action: string; interventionId?: string };
  content?: { id: string; type: string; assessmentItemId?: string; metadata?: Record<string, string> };
  progress: { subjectId?: string; evidenceCount: number };
  assessment?: { result?: { correct?: boolean } };
};

type OverviewBody = {
  gradeId: string;
  gradeName: string;
  activeSubjectId: string;
  availableSubjects: Array<{ id: string; name: string; code: string; discipline: string }>;
  subjects: Record<string, { total: number }>;
  areasSubjectId: string;
  areas: unknown[];
};

async function get(cookie: string | undefined, query: string): Promise<{ status: number; body: LearningBody }> {
  const response = await GET(
    new Request(`http://localhost/api/learning${query ? `?${query}` : ""}`, {
      headers: cookie ? { cookie } : {},
    }),
  );
  return { status: response.status, body: (await response.json()) as LearningBody };
}

async function overview(cookie: string, subjectId = ""): Promise<OverviewBody> {
  const response = await GET(
    new Request(`http://localhost/api/learning?overview=1${subjectId ? `&subjectId=${subjectId}` : ""}`, {
      headers: { cookie },
    }),
  );
  assert(response.status === 200, `overview 200, got ${response.status}`);
  return (await response.json()) as OverviewBody;
}

async function post(
  cookie: string | undefined,
  payload: Record<string, unknown>,
): Promise<{ status: number; body: LearningBody }> {
  const response = await POST(
    new Request("http://localhost/api/learning", {
      method: "POST",
      headers: { "content-type": "application/json", ...(cookie ? { cookie } : {}) },
      body: JSON.stringify({ interactionType: "assessment", clientRequestId: crypto.randomUUID(), ...payload }),
    }),
  );
  return { status: response.status, body: (await response.json()) as LearningBody };
}

function context(learnerId: string) {
  return persistenceStore.getLearnerLearningContext(learnerId);
}

function sameSet(a: string[], b: string[]): boolean {
  return a.length === b.length && [...a].sort().join("|") === [...b].sort().join("|");
}

type Grade = {
  name: string;
  gradeId: string;
  subjectIds: string[];
  englishId: string;
};

const GRADES: Grade[] = [
  {
    name: "Basic 4",
    gradeId: GRADE_GHANA_BASIC_4_ID,
    subjectIds: [
      SUBJECT_GHANA_BASIC4_MATH_ID,
      SUBJECT_GHANA_BASIC4_ENGLISH_ID,
      SUBJECT_GHANA_BASIC4_SCIENCE_ID,
      SUBJECT_GHANA_BASIC4_COMPUTING_ID,
    ],
    englishId: SUBJECT_GHANA_BASIC4_ENGLISH_ID,
  },
  {
    name: "Basic 5",
    gradeId: GRADE_GHANA_BASIC_5_ID,
    subjectIds: [
      SUBJECT_GHANA_BASIC5_MATHEMATICS_ID,
      SUBJECT_GHANA_BASIC5_ENGLISH_ID,
      SUBJECT_GHANA_BASIC5_SCIENCE_ID,
      SUBJECT_GHANA_BASIC5_COMPUTING_ID,
    ],
    englishId: SUBJECT_GHANA_BASIC5_ENGLISH_ID,
  },
  {
    name: "Basic 6",
    gradeId: GRADE_GHANA_BASIC_6_ID,
    subjectIds: [
      SUBJECT_GHANA_BASIC6_MATHEMATICS_ID,
      SUBJECT_GHANA_BASIC6_ENGLISH_ID,
      SUBJECT_GHANA_BASIC6_SCIENCE_ID,
      SUBJECT_GHANA_BASIC6_COMPUTING_ID,
    ],
    englishId: SUBJECT_GHANA_BASIC6_ENGLISH_ID,
  },
];

/*
 * Framework: available subjects per grade, and every registered
 * subject has presentation metadata keyed by its discipline.
 */
function runFrameworkChecks(): void {
  const seen = new Set<string>();
  for (const grade of GRADES) {
    const available = getAvailableSubjectsForGrade(CURRICULUM_VERSION_GHANA_PILOT_V1_ID, grade.gradeId);
    assert(
      sameSet(available.map((s) => s.id), grade.subjectIds),
      `${grade.name}: available subjects are exactly the grade's subjects`,
    );
    assert(available.every((s) => s.gradeId === grade.gradeId), `${grade.name}: no subject of another grade`);
    for (const subject of getSubjectsForGrade(grade.gradeId)) {
      assert(!seen.has(subject.id), `${subject.id} registered once`);
      seen.add(subject.id);
      assert(isFilumireSubjectKey(subject.discipline), `${subject.id}: discipline "${subject.discipline}" has presentation metadata`);
    }
    const presented = toFilumireSubjects(available);
    assert(presented.length === available.length, `${grade.name}: every available subject is presentable`);
    const english = presented.find((s) => s.subjectId === grade.englishId);
    assert(english?.key === "english" && english.name === "English", `${grade.name}: "English Language" maps to the English presentation by discipline, not by name`);
    assert(isSupportedGrade(CURRICULUM_VERSION_GHANA_PILOT_V1_ID, grade.gradeId), `${grade.name}: supported grade`);
  }
  for (const invalid of ["level-gh-basic-7-pilot", "level-test", "", "Basic 5"]) {
    assert(!isSupportedGrade(CURRICULUM_VERSION_GHANA_PILOT_V1_ID, invalid), `"${invalid}" is not a supported grade`);
  }
  assert(!isSupportedGrade("curriculum-version-unknown", GRADE_GHANA_BASIC_5_ID), "a grade outside the curriculum version is not supported");
  console.log({ test: "framework grade -> available subjects", result: "PASS" });
}

/*
 * A learner of the grade sees only the grade's subjects, every
 * subject opens through the normal runtime, and selecting one
 * stores it (with its competency) in the learner's context.
 */
async function runGrade(grade: Grade, provider: Provider): Promise<void> {
  const learner = await setUpAuthorizedLearner(provider);

  if (grade.gradeId === GRADE_GHANA_BASIC_4_ID) {
    // Existing Basic 4 behaviour: a new learner defaults to Basic 4 Mathematics.
    const first = await get(learner.cookie, "");
    assert(first.status === 200, `${grade.name}: default GET 200, got ${first.status}`);
    assert(getCompetency(first.body.decision.competencyId)?.subjectId === SUBJECT_GHANA_BASIC4_MATH_ID, `${grade.name}: new learner starts in Basic 4 Mathematics`);
    const ctx = await context(learner.learnerId);
    assert(ctx?.gradeId === GRADE_GHANA_BASIC_4_ID && ctx.activeSubjectId === SUBJECT_GHANA_BASIC4_MATH_ID, `${grade.name}: default context is Basic 4 Mathematics`);
  } else {
    const updated = await setLearnerGrade(learner.learnerId, grade.gradeId);
    assert(updated.gradeId === grade.gradeId, `${grade.name}: grade set`);
  }

  const view = await overview(learner.cookie);
  assert(view.gradeId === grade.gradeId && view.gradeName === grade.name, `${grade.name}: overview names the learner's grade`);
  assert(sameSet(view.availableSubjects.map((s) => s.id), grade.subjectIds), `${grade.name}: learner sees only the grade's subjects`);
  assert(sameSet(Object.keys(view.subjects), grade.subjectIds), `${grade.name}: progress summaries cover only the grade's subjects`);
  assert(view.availableSubjects.some((s) => s.id === grade.englishId && s.discipline === "english"), `${grade.name}: English is present`);

  // Every subject of the grade opens through the normal runtime.
  for (const subjectId of grade.subjectIds) {
    const opened = await get(learner.cookie, `subjectId=${subjectId}`);
    assert(opened.status === 200, `${grade.name}: ${subjectId} opens, got ${opened.status}`);
    assert(getCompetency(opened.body.decision.competencyId)?.subjectId === subjectId, `${grade.name}: ${subjectId} serves its own competency`);
    assert(opened.body.progress.subjectId === subjectId, `${grade.name}: progress reports ${subjectId} by id`);
    const ctx = await context(learner.learnerId);
    assert(
      ctx?.gradeId === grade.gradeId && ctx.activeSubjectId === subjectId && ctx.activeCompetencyId === opened.body.decision.competencyId,
      `${grade.name}: selecting ${subjectId} stores grade, subject and competency together`,
    );
  }

  // Select English and learn through the normal runtime.
  let english = await get(learner.cookie, `subjectId=${grade.englishId}`);
  assert(english.status === 200, `${grade.name}: English opens`);
  // Teaching-first: English opens with its explanation; Next moves through the introduction.
  assert((english.body.decision as { reasonCode?: string }).reasonCode === "NEW_TOPIC_INSTRUCTION", `${grade.name}: English opens with its explanation`);
  for (let cards = 0; cards < 3 && !english.body.content?.assessmentItemId; cards += 1) {
    english = await post(learner.cookie, {
      interactionType: "acknowledge",
      sessionId: english.body.decision.sessionId,
      interventionId: english.body.decision.interventionId,
      competencyId: english.body.decision.competencyId,
    });
    assert(english.status === 200, `${grade.name}: Next on the introduction, got ${english.status}`);
  }
  const competencyId = english.body.decision.competencyId;
  assert(getCompetency(competencyId)?.learningLevelId === grade.gradeId, `${grade.name}: English competency is of the learner's grade`);
  const item = getContentForCompetency(competencyId).find((c) => c.id === english.body.content?.id);
  assert(Boolean(item?.assessmentItemId && item.metadata?.expectedResponse), `${grade.name}: English serves an authored question`);
  const answered = await post(learner.cookie, {
    sessionId: english.body.decision.sessionId,
    interventionId: english.body.decision.interventionId,
    assessmentItemId: item!.assessmentItemId,
    competencyId,
    response: item!.metadata!.expectedResponse,
  });
  assert(answered.status === 200 && answered.body.assessment?.result?.correct === true, `${grade.name}: English answer evaluated through the normal runtime`);

  // With no subject in the request, the stored subject is continued.
  const resumed = await get(learner.cookie, "");
  assert(resumed.status === 200, `${grade.name}: resume 200`);
  assert(getCompetency(resumed.body.decision.competencyId)?.subjectId === grade.englishId, `${grade.name}: resume continues the selected subject`);

  const areas = await overview(learner.cookie, grade.englishId);
  assert(areas.areas.length === areas.subjects[grade.englishId].total && areas.areas.length > 0, `${grade.name}: topic areas listed for the grade's English`);
  assert(areas.activeSubjectId === grade.englishId, `${grade.name}: overview reports the active subject`);

  console.log({ test: `${grade.name} grade/subject selection`, result: "PASS" });
}

async function runNegative(provider: Provider): Promise<void> {
  const learner = await setUpAuthorizedLearner(provider);
  await setLearnerGrade(learner.learnerId, GRADE_GHANA_BASIC_5_ID);
  const opened = await get(learner.cookie, `subjectId=${SUBJECT_GHANA_BASIC5_ENGLISH_ID}`);
  assert(opened.status === 200, "B5 English opens for the B5 learner");
  const before = await context(learner.learnerId);
  assert(before?.activeSubjectId === SUBJECT_GHANA_BASIC5_ENGLISH_ID && Boolean(before.activeCompetencyId), "B5 learner context is B5 English");

  async function assertUnchanged(message: string): Promise<void> {
    const now = await context(learner.learnerId);
    assert(
      now?.gradeId === before!.gradeId &&
        now.activeSubjectId === before!.activeSubjectId &&
        now.activeCompetencyId === before!.activeCompetencyId,
      `${message}: context unchanged`,
    );
  }

  // Invalid grade.
  for (const invalid of ["level-gh-basic-7-pilot", "level-test", "", "Basic 5", SUBJECT_GHANA_BASIC5_ENGLISH_ID]) {
    await assertRejects(() => setLearnerGrade(learner.learnerId, invalid), `invalid grade "${invalid}" rejected`);
  }
  await assertUnchanged("invalid grade");

  // Incompatible grade/subject.
  for (const subjectId of [SUBJECT_GHANA_BASIC4_MATH_ID, SUBJECT_GHANA_BASIC6_ENGLISH_ID, "subject-test-mathematics", "subject-unknown"]) {
    const response = await get(learner.cookie, `subjectId=${subjectId}`);
    assert(response.status === 404, `B5 learner requesting ${subjectId} gets 404, got ${response.status}`);
    await assertRejects(() => setActiveSubject(learner.learnerId, subjectId), `setActiveSubject ${subjectId} rejected for a B5 learner`);
  }
  const levelOverride = await get(learner.cookie, `levelId=${GRADE_GHANA_BASIC_4_ID}&subjectId=${SUBJECT_GHANA_BASIC4_MATH_ID}`);
  assert(levelOverride.status === 404, `a levelId query cannot override the stored grade, got ${levelOverride.status}`);
  const otherGradeOverview = await overview(learner.cookie, SUBJECT_GHANA_BASIC4_MATH_ID);
  assert(otherGradeOverview.areas.length === 0 && !(SUBJECT_GHANA_BASIC4_MATH_ID in otherGradeOverview.subjects), "overview gives no topic areas for another grade's subject");
  await assertUnchanged("incompatible subject");

  // Incompatible grade/competency.
  const b6English = getContentForCompetency("competency-gh-english-b6-1-1-1-1").find((c) => c.assessmentItemId && c.metadata?.expectedResponse)!;
  assert(Boolean(b6English), "a B6 English question exists");
  const crossCompetency = await get(learner.cookie, `subjectId=${SUBJECT_GHANA_BASIC5_ENGLISH_ID}&competencyId=${b6English.competencyId}`);
  assert(crossCompetency.status === 404, `B6 competency under B5 English rejected, got ${crossCompetency.status}`);
  const crossPost = await post(learner.cookie, {
    sessionId: opened.body.decision.sessionId,
    assessmentItemId: b6English.assessmentItemId,
    competencyId: b6English.competencyId,
    response: b6English.metadata!.expectedResponse,
  });
  assert(crossPost.status === 404, `POST evidence for a B6 competency rejected for a B5 learner, got ${crossPost.status}`);
  const states = await getLearnerStates(learner.learnerId);
  assert(
    !states.some((state) => state.competencies.some((c) => c.competencyId === b6English.competencyId)),
    "no learner state or evidence recorded for the other grade's competency",
  );
  await assertRejects(() => updateActiveCompetency(learner.learnerId, b6English.competencyId), "updateActiveCompetency rejects another grade's competency");
  await assertRejects(() => updateActiveCompetency(learner.learnerId, "competency-unknown"), "updateActiveCompetency rejects an unknown competency");
  await assertUnchanged("incompatible competency");

  // Changing grade leaves no stale context.
  const toB6 = await setLearnerGrade(learner.learnerId, GRADE_GHANA_BASIC_6_ID);
  assert(
    toB6.gradeId === GRADE_GHANA_BASIC_6_ID && toB6.activeSubjectId === SUBJECT_GHANA_BASIC6_ENGLISH_ID && toB6.activeCompetencyId === undefined,
    "B5 -> B6 keeps the discipline (English), moves to B6 English and clears the B5 competency",
  );
  const stored = await context(learner.learnerId);
  assert(stored?.gradeId === GRADE_GHANA_BASIC_6_ID && stored.activeCompetencyId === undefined, "grade change persisted without a stale competency");
  const afterChange = await get(learner.cookie, "");
  assert(afterChange.status === 200, `after the grade change the learner resolves, got ${afterChange.status}`);
  assert(getCompetency(afterChange.body.decision.competencyId)?.subjectId === SUBJECT_GHANA_BASIC6_ENGLISH_ID, "after the grade change learning continues in B6 English");
  const oldSubject = await get(learner.cookie, `subjectId=${SUBJECT_GHANA_BASIC5_ENGLISH_ID}`);
  assert(oldSubject.status === 404, "the old grade's subject is no longer reachable");

  await setActiveSubject(learner.learnerId, SUBJECT_GHANA_BASIC6_SCIENCE_ID);
  const toB4 = await setLearnerGrade(learner.learnerId, GRADE_GHANA_BASIC_4_ID);
  assert(toB4.activeSubjectId === SUBJECT_GHANA_BASIC4_SCIENCE_ID && toB4.activeCompetencyId === undefined, "B6 Science -> Basic 4 moves to B4 Science");
  const sameGrade = await setLearnerGrade(learner.learnerId, GRADE_GHANA_BASIC_4_ID);
  assert(sameGrade.activeSubjectId === SUBJECT_GHANA_BASIC4_SCIENCE_ID, "setting the same grade again changes nothing");

  // setActiveSubject keeps a competency only when it belongs to the subject.
  const science = await get(learner.cookie, `subjectId=${SUBJECT_GHANA_BASIC4_SCIENCE_ID}`);
  assert(science.status === 200, "B4 Science opens");
  const toMaths = await setActiveSubject(learner.learnerId, SUBJECT_GHANA_BASIC4_MATH_ID);
  assert(toMaths.activeSubjectId === SUBJECT_GHANA_BASIC4_MATH_ID && toMaths.activeCompetencyId === undefined, "switching subject drops the other subject's competency");

  console.log({ test: "invalid grade / incompatible subject / incompatible competency / stale context", result: "PASS" });

  // Signed-out and forged requests cannot modify protected learner state.
  const protectedBefore = await context(learner.learnerId);
  const anonymousGet = await get(undefined, `subjectId=${SUBJECT_GHANA_BASIC4_ENGLISH_ID}`);
  assert(anonymousGet.status === 401, `signed-out subject selection rejected, got ${anonymousGet.status}`);
  const anonymousOverview = await GET(new Request("http://localhost/api/learning?overview=1"));
  assert(anonymousOverview.status === 401, `signed-out overview rejected, got ${anonymousOverview.status}`);
  const headerOnly = await GET(
    new Request(`http://localhost/api/learning?subjectId=${SUBJECT_GHANA_BASIC4_ENGLISH_ID}`, {
      headers: { "x-filumire-learner-id": learner.learnerId },
    }),
  );
  assert(headerOnly.status === 401, `development learner header is refused in production, got ${headerOnly.status}`);
  const anonymousPost = await post(undefined, {
    sessionId: opened.body.decision.sessionId,
    assessmentItemId: "anything",
    competencyId: science.body.decision.competencyId,
    response: "x",
  });
  assert(anonymousPost.status === 401, `signed-out POST rejected, got ${anonymousPost.status}`);
  const other = await setUpAuthorizedLearner(provider);
  const forged = await post(other.cookie, {
    learnerId: learner.learnerId,
    sessionId: opened.body.decision.sessionId,
    assessmentItemId: "anything",
    competencyId: science.body.decision.competencyId,
    response: "x",
  });
  assert(forged.status === 401, `another learner cannot act for this learner, got ${forged.status}`);
  const protectedAfter = await context(learner.learnerId);
  assert(
    protectedAfter?.gradeId === protectedBefore?.gradeId &&
      protectedAfter?.activeSubjectId === protectedBefore?.activeSubjectId &&
      protectedAfter?.activeCompetencyId === protectedBefore?.activeCompetencyId &&
      protectedAfter?.updatedAt === protectedBefore?.updatedAt,
    "rejected requests leave the learner context untouched",
  );
  console.log({ test: "signed-out / forged requests cannot change learner context", result: "PASS" });
}

async function run(): Promise<void> {
  seedContent();
  runFrameworkChecks();
  const provider = await configureProvider();
  const restoreSecret = setEnvironmentVariable("FILUMIRE_AUTH_JWT_SECRET", PRODUCTION_AUTH_SECRET);
  const restoreNodeEnv = setEnvironmentVariable("NODE_ENV", "production");
  try {
    for (const grade of GRADES) {
      await runGrade(grade, provider);
    }
    await runNegative(provider);
    console.log({ gradeAwareSubjectSelection: "PASS", persistence: process.env.FILUMIRE_PERSISTENCE ?? "memory" });
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
