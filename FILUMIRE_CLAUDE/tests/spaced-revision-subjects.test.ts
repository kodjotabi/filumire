import assert from "node:assert/strict";
import { mock } from "node:test";
process.env.FILUMIRE_PERSISTENCE = "memory";
process.env.DATABASE_URL = "postgresql://unused:unused@database.invalid/unused";
process.env.FILUMIRE_AUTH_JWT_SECRET = "test-only-spaced-revision-subjects-secret-32";
process.env.FILUMIRE_ACCOUNT_REGISTRATION = "open";
Object.defineProperty(process.env, "NODE_ENV", { value: "production", writable: true, configurable: true, enumerable: true });
const { pool } = await import("../services/database");
mock.method(pool, "query", () => { throw Error("PostgreSQL forbidden"); });
mock.method(pool, "connect", () => { throw Error("PostgreSQL forbidden"); });
const { revisionFixture } = await import("./fixtures/spaced-revision");
const { POST: login } = await import("../apps/learner/app/api/session/login/route");
const { GET, POST } = await import("../apps/learner/app/api/learning/route");
const { getLearnerState, saveLearnerState } = await import("../services/learner-state-store");
const { getEvidence } = await import("../services/evidence-store");
const { getCurrentCompetencyForSubject, getLearnerLearningContext, saveLearnerLearningContext } = await import("../services/learner-context");
const { buildLearningOverview } = await import("../apps/learner/app/api/learning/overview-data");
const { buildRevisionSummary, subjectSupportsSpacedRevision, supportsSpacedRevision } = await import("../services/learner-path/revision");
const { getCompetency } = await import("../packages/curriculum");
const { getAvailableSubjectsForGrade, getSupportedGradesForCurriculumVersion, CURRICULUM_VERSION_GHANA_PILOT_V1_ID } = await import("../packages/curriculum-framework");

function request(path: string, cookie = "", body?: unknown, language = "en") {
  return new Request(`http://localhost${path}`, { method: body ? "POST" : "GET", headers: { cookie, "content-type": "application/json", "x-filumire-language": language }, ...(body ? { body: JSON.stringify(body) } : {}) });
}
async function signIn(f: { username: string; password: string }) {
  const signed = await login(request("/api/session/login", "", { login: f.username, password: f.password }));
  assert.equal(signed.status, 200);
  return signed.headers.get("set-cookie")!.split(";")[0];
}
const unique = () => Math.random().toString(36).slice(2, 10);

// 1. Every available subject of every supported grade has full bilingual,
// automatically scored retention coverage, so all of them use spaced revision.
const pairs: Array<{ gradeId: string; subjectId: string }> = [];
for (const grade of getSupportedGradesForCurriculumVersion(CURRICULUM_VERSION_GHANA_PILOT_V1_ID)) {
  for (const subject of getAvailableSubjectsForGrade(CURRICULUM_VERSION_GHANA_PILOT_V1_ID, grade.id)) {
    assert.equal(subjectSupportsSpacedRevision(subject.id, grade.id), true, `${grade.id} ${subject.id}`);
    pairs.push({ gradeId: grade.id, subjectId: subject.id });
  }
}
assert.equal(pairs.length, 12, "Basic 4-6 x four subjects");
assert.equal(subjectSupportsSpacedRevision("subject-test-mathematics", "level-test"), false, "validation-only subject has no authored retention");
assert.equal(supportsSpacedRevision("competency-that-does-not-exist"), false);

// 2. A returning learner in each grade/subject: due review → authored EN/FR
// question → recorded retention evidence → back to the current topic → rescheduled.
let index = 0;
for (const { subjectId } of pairs) {
  const language = index++ % 2 ? "fr" : "en";
  const f = await revisionFixture(language, `s.${unique()}`, subjectId);
  const cookie = await signIn(f);
  const overview = await buildLearningOverview(f.learnerId, f.subjectId);
  assert.equal(overview.revision?.subjectId, f.subjectId, subjectId);
  assert.deepEqual(overview.revision?.due.map(item => item.competencyId), [f.first], subjectId);
  assert.equal(overview.revision?.canStart, true, subjectId);
  assert.deepEqual(overview.revisions?.map(item => item.subjectId).sort(), overview.availableSubjects.map(item => item.id).sort(), "only the stored grade's subjects");
  const masteryBefore = (await getLearnerState(f.learnerId, f.first))!.competencies[0].masteryEstimate;
  const delivery = await (await GET(request(`/api/learning?subjectId=${f.subjectId}`, cookie, undefined, language))).json();
  assert.equal(delivery.decision.action, "retention_check", subjectId);
  assert.equal(delivery.decision.reasonCode, "RETENTION_REVIEW_DUE", subjectId);
  assert.equal(delivery.decision.competencyId, f.first, subjectId);
  assert.equal(delivery.content.language, language, `${subjectId} ${language} content`);
  assert.equal(delivery.content.metadata.assessmentPurpose, "retention");
  assert.equal(delivery.content.metadata.expectedResponse, undefined, "answer key stays on the server");
  assert.equal((await getLearnerLearningContext(f.learnerId))?.activeCompetencyId, f.next, "a review does not move the current topic");
  const response = f.answers[delivery.content.assessmentItemId];
  assert.ok(response !== undefined, `${subjectId} retention item has a trusted answer`);
  const answered = await POST(request("/api/learning", cookie, { learnerId: f.learnerId, sessionId: delivery.decision.sessionId,
    interventionId: delivery.decision.interventionId, competencyId: f.first, assessmentItemId: delivery.content.assessmentItemId,
    response, clientRequestId: `subjects-${index}` }, language));
  assert.equal(answered.status, 200, subjectId);
  const result = await answered.json();
  assert.equal(result.assessment.result.correct, true, subjectId);
  assert.notEqual(result.decision.action, "retention_check", subjectId);
  assert.equal(result.decision.competencyId, f.next, `${subjectId}: returns to the current topic`);
  assert.equal((await getEvidence(f.learnerId, f.first)).length, 7, subjectId);
  const after = (await getLearnerState(f.learnerId, f.first))!.competencies.find(item => item.competencyId === f.first)!;
  assert.equal(after.masteryEstimate, masteryBefore, "retention does not inflate mastery");
  const rescheduled = await buildRevisionSummary(f.learnerId, f.gradeId, f.subjectId, f.next);
  assert.equal(rescheduled?.due.length, 0, subjectId);
  assert.ok(Date.parse(rescheduled!.nextDueAt!) > Date.now(), `${subjectId}: next review scheduled`);
}

// 3. Immediately after acquisition the retention check is deferred for every
// subject (previously only Basic 4 Mathematics); the learner moves on and the
// first review becomes due a day later.
for (const { subjectId } of pairs) {
  const f = await revisionFixture("fr", `a.${unique()}`, subjectId);
  const state = (await getLearnerState(f.learnerId, f.first))!;
  const now = new Date().toISOString();
  Object.assign(state.competencies[0], { masteredAt: now, lastUpdated: now, retentionState: undefined, retentionPerformance: undefined });
  await saveLearnerState(state);
  await saveLearnerLearningContext({ ...(await getLearnerLearningContext(f.learnerId))!, activeCompetencyId: f.first });
  const cookie = await signIn(f);
  const data = await (await GET(request(`/api/learning?subjectId=${f.subjectId}`, cookie, undefined, "fr"))).json();
  assert.equal(data.decision.action, "advance", subjectId);
  assert.equal(data.decision.reasonCode, "ACQUIRED_RETENTION_PENDING_MOVE_ON", subjectId);
  assert.equal(data.decision.competencyId, f.next, subjectId);
  const summary = await buildRevisionSummary(f.learnerId, f.gradeId, f.subjectId, f.next);
  assert.equal(summary?.due.length, 0, `${subjectId}: not due straight after learning`);
  assert.ok(Date.parse(summary!.nextDueAt!) >= Date.parse(now) + 23 * 3600000, `${subjectId}: first review about a day later`);
}

// 3b. Teachers see a prerequisite repair as completed by the same rule the
// engine used: acquired, transfer shown, first spaced review not yet due.
{
  const { buildTeacherLearnerSummary } = await import("../services/teacher-summary");
  const science = pairs.find(item => item.gradeId === "level-gh-basic-5-pilot" && item.subjectId.includes("science"))!;
  const f = await revisionFixture("en", `t.${unique()}`, science.subjectId);
  const state = (await getLearnerState(f.learnerId, f.first))!;
  const now = new Date().toISOString();
  Object.assign(state.competencies[0], { masteredAt: now, retentionState: undefined, retentionPerformance: undefined });
  await saveLearnerState(state);
  const next = (await getLearnerState(f.learnerId, f.next))!;
  next.competencies[0].prerequisiteRepair = { repairCompetencyId: f.first, startedAt: now };
  await saveLearnerState(next);
  const summary = await buildTeacherLearnerSummary(f.learnerId);
  const repaired = summary.subjects.flatMap(item => item.competencies).find(item => item.competencyId === f.next);
  assert.equal(repaired?.prerequisiteRepair?.completed, true, "teacher view agrees with the engine's time-aware completion");
}

// 4. A review due in another subject of the same grade: the card leads with it,
// the review is delivered without moving the active topic, and afterwards the
// learner continues in that subject's own path.
{
  const science = pairs.find(item => item.gradeId === "level-gh-basic-4-pilot" && item.subjectId.includes("science"))!;
  const math = pairs.find(item => item.gradeId === "level-gh-basic-4-pilot" && item.subjectId.includes("mathematics"))!;
  const f = await revisionFixture("en", `x.${unique()}`, science.subjectId);
  const context = (await getLearnerLearningContext(f.learnerId))!;
  const mathTopic = getCurrentCompetencyForSubject({ ...context, activeCompetencyId: undefined }, math.subjectId)!;
  await saveLearnerLearningContext({ ...context, activeSubjectId: math.subjectId, activeCompetencyId: mathTopic });
  const overview = await buildLearningOverview(f.learnerId, math.subjectId);
  assert.equal(overview.activeSubjectId, math.subjectId);
  assert.equal(overview.revision?.subjectId, science.subjectId, "the card leads with the subject that has due reviews");
  assert.equal(overview.revision?.canStart, true);
  assert.equal(overview.revisions?.find(item => item.subjectId === math.subjectId)?.due.length, 0);
  const cookie = await signIn(f);
  const review = await (await GET(request(`/api/learning?subjectId=${science.subjectId}`, cookie))).json();
  assert.equal(review.decision.action, "retention_check"); assert.equal(review.decision.competencyId, f.first);
  assert.equal((await getLearnerLearningContext(f.learnerId))?.activeCompetencyId, mathTopic, "delivering a review keeps the active topic");
  const refreshed = await (await GET(request(`/api/learning?subjectId=${science.subjectId}`, cookie))).json();
  assert.equal(refreshed.decision.interventionId, review.decision.interventionId, "refresh resumes the review");
  const answered = await (await POST(request("/api/learning", cookie, { learnerId: f.learnerId, sessionId: review.decision.sessionId,
    interventionId: review.decision.interventionId, competencyId: f.first, assessmentItemId: review.content.assessmentItemId,
    response: f.answers[review.content.assessmentItemId], clientRequestId: "cross-review" }))).json();
  assert.equal(answered.assessment.result.correct, true);
  assert.notEqual(answered.decision.action, "retention_check");
  assert.equal(getCompetency(answered.decision.competencyId)?.subjectId, science.subjectId, "continues in the reviewed subject");
  assert.notEqual(answered.decision.competencyId, f.first, "not stuck on the reviewed topic");
  // Another learner cannot answer this learner's review.
  const other = await revisionFixture("en", `o.${unique()}`, science.subjectId);
  const otherCookie = await signIn(other);
  assert.equal((await POST(request("/api/learning", otherCookie, { learnerId: f.learnerId, sessionId: review.decision.sessionId,
    interventionId: review.decision.interventionId, competencyId: f.first, assessmentItemId: review.content.assessmentItemId,
    response: "x", clientRequestId: "foreign" }))).status, 401);
}

// 5. Grade lock: a Basic 6 learner's revision never lists or opens Basic 4 work.
{
  const b6 = pairs.find(item => item.gradeId === "level-gh-basic-6-pilot")!;
  const f = await revisionFixture("fr", `g.${unique()}`, b6.subjectId);
  const overview = await buildLearningOverview(f.learnerId, f.subjectId);
  assert.ok(overview.revisions?.length && overview.revisions.every(item =>
    pairs.some(pair => pair.subjectId === item.subjectId && pair.gradeId === "level-gh-basic-6-pilot")));
  const cookie = await signIn(f);
  const b4 = pairs.find(item => item.gradeId === "level-gh-basic-4-pilot")!;
  assert.equal((await GET(request(`/api/learning?subjectId=${b4.subjectId}`, cookie))).status, 404);
}

console.log(`PASS spaced revision across ${pairs.length} grade/subject paths: bilingual coverage gate, due review delivery EN/FR, return to current topic, rescheduling, deferred retention after acquisition, cross-subject reviews, learner ownership and grade lock (memory only)`);
