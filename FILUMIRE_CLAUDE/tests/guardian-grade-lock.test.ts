import assert from "node:assert/strict";

import { POST as register } from "../apps/learner/app/api/account/register/route";
import { POST as addLearner } from "../apps/learner/app/api/account/learners/route";
import { PATCH as patchLearner } from "../apps/learner/app/api/account/learners/[learnerId]/route";
import { POST as login } from "../apps/learner/app/api/session/login/route";
import { buildLearningOverview } from "../apps/learner/app/api/learning/overview-data";
import { accountStore } from "../services/account/store";
import { resetRateLimits } from "../services/account/rate-limit";
import {
  getLearnerLearningContext,
  saveLearnerLearningContext,
  setActiveSubject,
  setLearnerGrade,
} from "../services/learner-context";
import {
  GRADE_GHANA_BASIC_4_ID,
  GRADE_GHANA_BASIC_5_ID,
  GRADE_GHANA_BASIC_6_ID,
  getAvailableSubjectsForGrade,
  getDefaultLearnerLearningContext,
  getFrameworkSubject,
} from "../packages/curriculum-framework";

/*
 * Guardian-chosen class: recorded, locked for the learner, still
 * changeable by the guardian; subjects follow the stored class;
 * rows without an attribution (before migration 0023) stay unlocked.
 * In-memory persistence only.
 */

if ((process.env.FILUMIRE_PERSISTENCE ?? "memory") !== "memory") {
  throw new Error("guardian-grade-lock test runs on in-memory persistence only");
}

function setEnv(name: string, value: string | undefined): void {
  Object.defineProperty(process.env, name, { configurable: true, enumerable: true, writable: true, value });
}

setEnv("NODE_ENV", "production");
setEnv("FILUMIRE_AUTH_JWT_SECRET", "test-only-guardian-grade-lock-secret-32-chars");
setEnv("FILUMIRE_ACCOUNT_REGISTRATION", "open");

const run = Date.now().toString(36);
const { curriculumVersionId } = getDefaultLearnerLearningContext();

function pass(name: string): void {
  console.log({ test: name, result: "PASS" });
}

function request(method: string, path: string, body: unknown, cookie?: string): Request {
  return new Request(`http://localhost${path}`, {
    method,
    headers: { "content-type": "application/json", ...(cookie ? { cookie } : {}) },
    body: JSON.stringify(body),
  });
}

function cookieFrom(response: Response): string {
  const match = (response.headers.get("set-cookie") ?? "").match(/filumire_auth_session=([^;]*)/);
  assert(match?.[1], "response sets a session cookie");
  return `filumire_auth_session=${match[1]}`;
}

const params = (learnerId: string) => ({ params: Promise.resolve({ learnerId }) });

const patch = (learnerId: string, body: unknown, cookie: string) =>
  patchLearner(request("PATCH", `/api/account/learners/${learnerId}`, body, cookie), params(learnerId));

async function newLearner(guardian: string, name: string, gradeId?: string) {
  const username = `${name}.${run}`.slice(0, 24);
  const password = `${name}-test-pass-1`;
  const added = await addLearner(request("POST", "/api/account/learners", {
    displayName: name, username, password, consentsToLearnerData: true, ...(gradeId ? { gradeId } : {}),
  }, guardian));
  assert.equal(added.status, 201);
  const { learnerId } = (await added.json()) as { learnerId: string };
  await resetRateLimits();
  const signedIn = await login(request("POST", "/api/session/login", { login: username, password }));
  assert.equal(signedIn.status, 200);
  return { learnerId, cookie: cookieFrom(signedIn) };
}

function subjectIdsOf(gradeId: string): string[] {
  return getAvailableSubjectsForGrade(curriculumVersionId, gradeId).map((subject) => subject.id).sort();
}

function idsOf(subjects: ReadonlyArray<{ id: string }>): string[] {
  return subjects.map((subject) => subject.id).sort();
}

async function main(): Promise<void> {
  const registered = await register(request("POST", "/api/account/register", {
    email: `grade.lock.${run}@example.test`, password: "family-test-pass-1", displayName: "Test Guardian",
    preferredLanguage: "en", confirmsGuardian: true, acceptsNotice: true,
  }));
  assert.equal(registered.status, 201);
  const guardian = cookieFrom(registered);

  // 1. Guardian places the learner in Basic 5.
  const kojo = await newLearner(guardian, "kojo", GRADE_GHANA_BASIC_5_ID);
  assert.equal((await getLearnerLearningContext(kojo.learnerId))?.gradeSetBy, "guardian");
  const placed = await buildLearningOverview(kojo.learnerId, "");
  assert.equal(placed.gradeId, GRADE_GHANA_BASIC_5_ID);
  assert.equal(placed.gradeSetByGuardian, true);
  assert.deepEqual(idsOf(placed.availableSubjects), subjectIdsOf(GRADE_GHANA_BASIC_5_ID));
  for (const gradeId of [GRADE_GHANA_BASIC_4_ID, GRADE_GHANA_BASIC_5_ID, GRADE_GHANA_BASIC_6_ID]) {
    assert.deepEqual(idsOf(placed.gradeSubjects[gradeId] ?? []), subjectIdsOf(gradeId), `gradeSubjects for ${gradeId}`);
    assert(placed.gradeSubjects[gradeId].every((subject) => getFrameworkSubject(subject.id)?.gradeId === gradeId));
  }
  pass("guardian's class is recorded; overview reports it with the subjects of every grade");

  // 2. The learner cannot choose another class, before or after setup.
  const before = await accountStore.getLearnerProfile(kojo.learnerId);
  const refused = await patch(kojo.learnerId, { avatarId: "4", gradeId: GRADE_GHANA_BASIC_6_ID, completeOnboarding: true }, kojo.cookie);
  assert.equal(refused.status, 400);
  assert.equal(((await refused.json()) as { code?: string }).code, "invalid_grade");
  const after = await accountStore.getLearnerProfile(kojo.learnerId);
  assert.equal(after?.avatarId, before?.avatarId, "refused request writes nothing");
  assert.equal(after?.onboardingCompletedAt, before?.onboardingCompletedAt);
  assert.equal((await getLearnerLearningContext(kojo.learnerId))?.gradeId, GRADE_GHANA_BASIC_5_ID);

  const confirmed = await patch(kojo.learnerId, { avatarId: "4", gradeId: GRADE_GHANA_BASIC_5_ID, completeOnboarding: true }, kojo.cookie);
  assert.equal(confirmed.status, 200);
  assert.equal(((await confirmed.json()) as { onboardingComplete: boolean }).onboardingComplete, true);
  assert.equal((await getLearnerLearningContext(kojo.learnerId))?.gradeSetBy, "guardian");

  const later = await patch(kojo.learnerId, { gradeId: GRADE_GHANA_BASIC_4_ID }, kojo.cookie);
  assert.equal(later.status, 400);
  pass("learner cannot change a guardian's class; confirming it finishes setup");

  // 3. An authorised change by the guardian moves the learner's subjects.
  await setActiveSubject(kojo.learnerId, placed.availableSubjects.find((s) => s.discipline === "science")!.id);
  const changed = await patch(kojo.learnerId, { gradeId: GRADE_GHANA_BASIC_6_ID }, guardian);
  assert.equal(changed.status, 200);
  const moved = await buildLearningOverview(kojo.learnerId, "");
  assert.equal(moved.gradeId, GRADE_GHANA_BASIC_6_ID);
  assert.equal(moved.gradeName, "Basic 6");
  assert.equal(moved.gradeSetByGuardian, true);
  assert.deepEqual(idsOf(moved.availableSubjects), subjectIdsOf(GRADE_GHANA_BASIC_6_ID));
  assert.equal(getFrameworkSubject(moved.activeSubjectId)?.gradeId, GRADE_GHANA_BASIC_6_ID);
  assert.equal(getFrameworkSubject(moved.activeSubjectId)?.discipline, "science", "same discipline kept");
  assert.equal((await getLearnerLearningContext(kojo.learnerId))?.activeCompetencyId, undefined, "old grade's competency cleared");
  assert.equal((await patch(kojo.learnerId, { gradeId: GRADE_GHANA_BASIC_5_ID }, kojo.cookie)).status, 400);
  pass("guardian's change moves subjects and active subject to the new grade; lock stays");

  // 4. "Choose later": the automatic default is not a guardian's class.
  const esi = await newLearner(guardian, "esi");
  const lazy = await buildLearningOverview(esi.learnerId, "");
  assert.equal(lazy.gradeId, GRADE_GHANA_BASIC_4_ID);
  assert.equal(lazy.gradeSetByGuardian, false);
  assert.equal((await getLearnerLearningContext(esi.learnerId))?.gradeSetBy, undefined);
  const picked = await patch(esi.learnerId, { avatarId: "1", gradeId: GRADE_GHANA_BASIC_6_ID, completeOnboarding: true }, esi.cookie);
  assert.equal(picked.status, 200);
  assert.equal((await getLearnerLearningContext(esi.learnerId))?.gradeSetBy, "learner");
  const own = await buildLearningOverview(esi.learnerId, "");
  assert.deepEqual(idsOf(own.availableSubjects), subjectIdsOf(GRADE_GHANA_BASIC_6_ID));
  assert.equal((await patch(esi.learnerId, { gradeId: GRADE_GHANA_BASIC_5_ID }, esi.cookie)).status, 200);
  assert.deepEqual(idsOf((await buildLearningOverview(esi.learnerId, "")).availableSubjects), subjectIdsOf(GRADE_GHANA_BASIC_5_ID));
  pass("without a guardian's class the learner chooses, and can change it; subjects follow");

  // 5. Rows from before migration 0023 (no attribution) stay unlocked.
  const ama = await newLearner(guardian, "ama");
  await saveLearnerLearningContext({
    learnerId: ama.learnerId,
    curriculumVersionId,
    gradeId: GRADE_GHANA_BASIC_5_ID,
    activeSubjectId: getAvailableSubjectsForGrade(curriculumVersionId, GRADE_GHANA_BASIC_5_ID)[0].id,
    updatedAt: new Date().toISOString(),
  });
  const legacy = await buildLearningOverview(ama.learnerId, "");
  assert.equal(legacy.gradeSetByGuardian, false);
  await setActiveSubject(ama.learnerId, legacy.availableSubjects[legacy.availableSubjects.length - 1].id);
  await setLearnerGrade(ama.learnerId, GRADE_GHANA_BASIC_5_ID);
  await setLearnerGrade(ama.learnerId, GRADE_GHANA_BASIC_6_ID);
  assert.equal((await getLearnerLearningContext(ama.learnerId))?.gradeSetBy, undefined, "reads and unattributed writes assign no lock");
  assert.equal((await patch(ama.learnerId, { gradeId: GRADE_GHANA_BASIC_4_ID }, ama.cookie)).status, 200, "legacy learner can still choose");
  assert.equal((await getLearnerLearningContext(ama.learnerId))?.gradeSetBy, "learner");
  pass("rows without an attribution are never turned into a guardian lock");

  // 6. Unattributed writes also keep an existing guardian lock.
  await setLearnerGrade(kojo.learnerId, GRADE_GHANA_BASIC_4_ID);
  await setActiveSubject(kojo.learnerId, getAvailableSubjectsForGrade(curriculumVersionId, GRADE_GHANA_BASIC_4_ID)[0].id);
  assert.equal((await getLearnerLearningContext(kojo.learnerId))?.gradeSetBy, "guardian");
  pass("unattributed writes keep an existing guardian lock");

  console.log({ guardianGradeLock: "PASS", persistence: "memory" });
}

await main();
