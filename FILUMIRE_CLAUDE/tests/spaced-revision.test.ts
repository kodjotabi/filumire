import assert from "node:assert/strict";
import { mock } from "node:test";
process.env.FILUMIRE_PERSISTENCE = "memory";
process.env.DATABASE_URL = "postgresql://unused:unused@database.invalid/unused";
process.env.FILUMIRE_AUTH_JWT_SECRET = "test-only-spaced-revision-secret-at-least-32";
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
const { getLearnerLearningContext } = await import("../services/learner-context");
const { createIntervention } = await import("../services/intervention-store");
const { buildLearningOverview } = await import("../apps/learner/app/api/learning/overview-data");
const { buildRevisionSummary } = await import("../services/learner-path/revision");
const { PATCH } = await import("../apps/learner/app/api/account/learners/[learnerId]/route");
function request(path: string, cookie = "", body?: unknown, language = "en") {
  return new Request(`http://localhost${path}`, { method: body ? "POST" : "GET", headers: { cookie, "content-type": "application/json", "x-filumire-language": language }, ...(body ? { body: JSON.stringify(body) } : {}) });
}
for (const language of ["en", "fr"] as const) {
  const f = await revisionFixture(language, `${language}.${Date.now().toString(36)}`);
  const signed = await login(request("/api/session/login", "", { login: f.username, password: f.password }));
  assert.equal(signed.status, 200);
  const cookie = signed.headers.get("set-cookie")!.split(";")[0];
  const overview = await buildLearningOverview(f.learnerId, f.subjectId);
  assert.equal(overview.revision?.due[0].competencyId, f.first);
  assert.equal(overview.revision?.canStart, true);
  assert.equal((await getEvidence(f.learnerId, f.first)).length, 6, "listing reviews is read-only");
  const masteryBefore = (await getLearnerState(f.learnerId, f.first))!.competencies[0].masteryEstimate;
  assert.equal(await buildRevisionSummary(f.learnerId, "level-gh-basic-5-pilot"), undefined);
  // The current topic's title follows the page language on the read-only dashboard,
  // even though the stored learner state was saved in English.
  assert.ok(f.nextTitle.fr && f.nextTitle.fr !== f.nextTitle.en, "fixture topic has an authored French title");
  for (const page of ["en", "fr"] as const) {
    const home = await (await GET(request(`/api/learning?subjectId=${f.subjectId}&dashboard=1`, cookie, undefined, page))).json();
    assert.equal(home.progress.competencyTitle, f.nextTitle[page], `${page} dashboard topic title`);
  }
  assert.equal((await getEvidence(f.learnerId, f.first)).length, 6, "dashboard title lookup is read-only");
  const get = () => GET(request(`/api/learning?subjectId=${f.subjectId}`, cookie, undefined, language));
  const delivery = await get(); assert.equal(delivery.status, 200);
  const data = await delivery.json();
  assert.equal(data.decision.action, "retention_check"); assert.equal(data.decision.competencyId, f.first);
  assert.equal(data.learnerState.competencies[0].competencyId, f.first, "response and content focus match");
  assert.equal(data.content.language, language); assert.equal(data.content.metadata.expectedResponse, undefined);
  // The reviewed topic's state was saved in English; guidance must still follow the requested language.
  if (language === "fr") assert.ok(!data.instruction.structured.elements.some((element: { text: string }) => /Answer from memory|Give a short answer/.test(element.text)), "French engine guidance");
  assert.equal(data.learnerState.language, language);
  const repeated = await (await get()).json();
  assert.equal(repeated.decision.interventionId, data.decision.interventionId, "refresh preserves the review");
  assert.equal(repeated.content.assessmentItemId, data.content.assessmentItemId);
  const body = { learnerId: f.learnerId, sessionId: data.decision.sessionId, interventionId: data.decision.interventionId,
    competencyId: f.first, assessmentItemId: data.content.assessmentItemId, response: f.answers[data.content.assessmentItemId], clientRequestId: "first-review" };
  assert.ok(body.response !== undefined, "authored retention item has a trusted answer");
  const undelivered = Object.keys(f.answers).find(id => id !== body.assessmentItemId)!;
  assert.ok(undelivered);
  assert.equal((await POST(request("/api/learning", cookie, { ...body, assessmentItemId: undelivered }, language))).status, 409, "cannot score an undelivered review item");
  assert.equal((await POST(request("/api/learning", cookie, { ...body, interventionId: "missing-intervention" }, language))).status, 409);
  const results = await Promise.all([POST(request("/api/learning", cookie, body, language)), POST(request("/api/learning", cookie, { ...body, clientRequestId: "different-tab-key" }, language))]);
  for (const result of results) assert.equal(result.status, 200);
  const responses = await Promise.all(results.map(r => r.json()));
  assert.equal(responses.filter(r => r.assessment.result.duplicate).length, 1);
  assert.equal((await getEvidence(f.learnerId, f.first)).length, 7);
  const after = (await getLearnerState(f.learnerId, f.first))!.competencies.find(c => c.competencyId === f.first)!;
  assert.equal(after.masteryEstimate, masteryBefore, "retention does not inflate mastery");
  const nextOverview = await buildLearningOverview(f.learnerId, f.subjectId);
  assert.equal(nextOverview.revision?.due.length, 0); assert.ok(nextOverview.revision?.nextDueAt);
  assert.ok(responses.every(r => r.decision.action !== "retention_check"), "return to normal learning after the review");
  const retry = await POST(request("/api/learning", cookie, { ...body, response: "wrong retry", clientRequestId: "third-key" }, language));
  const retried = (await retry.json()).assessment;
  const recorded = responses.find(r => !r.assessment.result.duplicate).assessment;
  assert.equal(retried.result.correct, true, "duplicate feedback uses the recorded result");
  assert.equal(retried.result.duplicate, true);
  assert.deepEqual({ id: retried.evidence.id, outcome: retried.evidence.outcome, diagnosticState: retried.evidence.diagnosticState },
    { id: recorded.evidence.id, outcome: recorded.evidence.outcome, diagnosticState: recorded.evidence.diagnosticState }, "duplicate returns the recorded evidence, not the retry's");
  assert.equal((await getEvidence(f.learnerId, f.first)).length, 7);
  assert.equal((await GET(request(`/api/learning?subjectId=subject-gh-basic5-mathematics-pilot`, cookie))).status, 404);
  assert.equal((await POST(request("/api/learning", cookie, { ...body, learnerId: "another-learner" }))).status, 401);
  const grade = await PATCH(new Request(`http://localhost/api/account/learners/${f.learnerId}`, { method: "PATCH", headers: { cookie, "content-type": "application/json" }, body: JSON.stringify({ gradeId: "level-gh-basic-5-pilot" }) }), { params: Promise.resolve({ learnerId: f.learnerId }) });
  assert.equal(grade.status, 400); assert.equal((await getLearnerLearningContext(f.learnerId))?.gradeId, f.gradeId);
}
// A delivered, unanswered activity on a not-yet-started current topic must win
// over an older due review, including when states live in separate records.
const blocked = await revisionFixture("en", `busy.${Date.now().toString(36)}`);
await createIntervention({ learnerId: blocked.learnerId, competencyId: blocked.next, sessionId: "busy-session", decisionId: "busy", type: "diagnose" });
assert.equal((await buildRevisionSummary(blocked.learnerId, blocked.gradeId, blocked.next))?.canStart, false);
const { makeAdaptiveDecision } = await import("../services/adaptive-engine");
const busy = await makeAdaptiveDecision({ learnerId: blocked.learnerId, sessionId: "busy-session", learnerState: (await getLearnerState(blocked.learnerId, blocked.next))! }, { timeAwareRetention: true });
assert.equal(busy.decision.competencyId, blocked.next); assert.notEqual(busy.decision.reasonCode, "RETENTION_REVIEW_DUE");
// No review before the existing seven-day interval.
const state = (await getLearnerState(blocked.learnerId, blocked.first))!;
state.competencies[0].retentionState!.lastCheckedAt = new Date().toISOString(); await saveLearnerState(state);
assert.equal((await buildRevisionSummary(blocked.learnerId, blocked.gradeId, blocked.next))?.due.length, 0);
const missed = await revisionFixture("fr", `missed.${Date.now().toString(36)}`);
const missedLogin = await login(request("/api/session/login", "", { login: missed.username, password: missed.password }));
const missedCookie = missedLogin.headers.get("set-cookie")!.split(";")[0];
const missedActivity = await (await GET(request(`/api/learning?subjectId=${missed.subjectId}`, missedCookie, undefined, "fr"))).json();
const missedResponse = await POST(request("/api/learning", missedCookie, { learnerId: missed.learnerId, sessionId: missedActivity.decision.sessionId,
  competencyId: missed.first, interventionId: missedActivity.decision.interventionId, assessmentItemId: missedActivity.content.assessmentItemId,
  response: "incorrect fictional answer", clientRequestId: "missed-review" }, "fr"));
assert.equal(missedResponse.status, 200); assert.equal((await missedResponse.json()).assessment.result.correct, false);
const missedState = (await getLearnerState(missed.learnerId, missed.first))!.competencies.find(c => c.competencyId === missed.first)!;
assert.equal(missedState.retentionState?.status, "not_retained");
const missedSummary = await buildRevisionSummary(missed.learnerId, missed.gradeId, missed.first);
assert.equal(missedSummary?.due.length, 0); assert.ok(Date.parse(missedSummary!.nextDueAt!) > Date.now(), "unsuccessful review is spaced rather than scored repeatedly");
// A learner several topics ahead (an earlier topic still unstarted) returns to
// their own current topic after the review; an activity left open on a topic
// they moved away from neither blocks the review nor is discarded.
const { getNextCompetency } = await import("../packages/curriculum");
const { createInitialLearnerState } = await import("../services/learner-state");
const { saveLearnerLearningContext } = await import("../services/learner-context");
const { getIntervention } = await import("../services/intervention-store");
const ahead = await revisionFixture("en", `ahead.${Date.now().toString(36)}`);
const later = getNextCompetency(ahead.next)!.id;
await saveLearnerState(createInitialLearnerState(ahead.learnerId, later));
await saveLearnerLearningContext({ ...(await getLearnerLearningContext(ahead.learnerId))!, activeCompetencyId: later });
const left = await createIntervention({ learnerId: ahead.learnerId, competencyId: ahead.next, sessionId: "left-session", decisionId: "left", type: "diagnose" });
assert.equal((await buildRevisionSummary(ahead.learnerId, ahead.gradeId, later))?.canStart, true, "work left on another topic does not block reviews");
const aheadCookie = (await login(request("/api/session/login", "", { login: ahead.username, password: ahead.password }))).headers.get("set-cookie")!.split(";")[0];
const aheadGet = () => GET(request(`/api/learning?subjectId=${ahead.subjectId}`, aheadCookie));
const review = await (await aheadGet()).json();
assert.equal(review.decision.action, "retention_check"); assert.equal(review.decision.competencyId, ahead.first);
assert.equal((await getLearnerLearningContext(ahead.learnerId))?.activeCompetencyId, later, "a review does not move the current topic");
assert.equal((await (await aheadGet()).json()).decision.interventionId, review.decision.interventionId, "refresh resumes the review from the current topic");
const answered = await (await POST(request("/api/learning", aheadCookie, { learnerId: ahead.learnerId, sessionId: review.decision.sessionId, interventionId: review.decision.interventionId,
  competencyId: ahead.first, assessmentItemId: review.content.assessmentItemId, response: ahead.answers[review.content.assessmentItemId], clientRequestId: "ahead-review" }))).json();
assert.equal(answered.assessment.result.correct, true);
assert.equal(answered.decision.competencyId, later, "returns to the current topic, not the topic after the reviewed one");
assert.equal((await getLearnerLearningContext(ahead.learnerId))?.activeCompetencyId, later);
assert.equal((await getIntervention(left.interventionId))?.status, "active", "the earlier open activity is kept, not discarded");
console.log("PASS spaced revision: EN/FR, due windows, separate states, refresh, concurrent/different-key duplicate scoring, recorded duplicate feedback, normal resume, return to current topic, active assessment protection, abandoned other-topic work, grade lock and learner ownership (memory only)");
