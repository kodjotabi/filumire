import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { GET, POST } from "../apps/learner/app/api/learning/route";
import { POST as closurePost } from "../apps/learner/app/api/learning/closure/route";
import { getContent } from "../services/content-store";
import { getLearnerState } from "../services/learner-state-store";
import { getLearnerInterventions } from "../services/intervention-store";
import { getEvidenceForLearner } from "../services/evidence-store";
import { getPilotMeasurementEvents } from "../services/pilot-measurement";
import { getLessonClosure, authoredExcerpts, issueLessonReceipt } from "../services/lesson-closure";
import type { LearningResponse } from "../apps/learner/services/learning-client";
import type { LessonClosure } from "../packages/contracts/lesson-closure";

assert.equal(process.env.FILUMIRE_PERSISTENCE, "memory");
const learnerId = `closure-${randomUUID()}`;
const sessionId = `session-${randomUUID()}`;
const headers = { "Content-Type": "application/json", "x-filumire-learner-id": learnerId };
function post(body: unknown) { return new Request("http://localhost/api/learning", { method: "POST", headers, body: JSON.stringify(body) }); }
function closureRequest(receipt: string, language = "en", extras: Record<string, unknown> = {}, owner = learnerId) {
  return new Request("http://localhost/api/learning/closure", { method: "POST", headers: { ...headers, "x-filumire-learner-id": owner }, body: JSON.stringify({ receipt, language, ...extras }) });
}
async function restore() {
  const response = await GET(new Request(`http://localhost/api/learning?sessionId=${sessionId}`, { headers }));
  assert.equal(response.status, 200); return await response.json() as LearningResponse;
}
let data = await restore();
// Teaching-first: a new topic opens with its explanation, a delivered lesson; "Check my knowledge first" starts the scored check.
assert(data.lessonReceipt && !data.content?.assessmentItemId, "a new topic's explanation is a delivered lesson");
const checkFirst = await POST(post({ sessionId, competencyId: data.decision.competencyId, interactionType: "check_first" }));
assert.equal(checkFirst.status, 200); data = await checkFirst.json() as LearningResponse;
assert.equal(data.lessonReceipt, undefined, "a scored activity is not a delivered lesson");
for (let attempt = 0; !data.lessonReceipt && attempt < 4; attempt++) {
  const content = getContent(data.content!.id)!;
  assert(content.assessmentItemId);
  const options = JSON.parse(content.metadata!.options!);
  const wrong = options.find((option: string) => option !== content.metadata!.expectedResponse);
  const result = await POST(post({ learnerId, sessionId, competencyId: data.decision.competencyId, interventionId: data.decision.interventionId,
    assessmentItemId: content.assessmentItemId, response: wrong, clientRequestId: randomUUID() }));
  assert.equal(result.status, 200); data = await result.json() as LearningResponse;
}
assert(data.lessonReceipt, "adaptive engine should deliver an instructional card after a wrong answer");
const taught = data;
const receipt = data.lessonReceipt!;
assert.equal((await closurePost(closureRequest(receipt))).status, 409, "receiving/reading a card is not completion");
const refreshed = await restore();
assert.equal(refreshed.decision.interventionId, taught.decision.interventionId);
assert.equal((await closurePost(closureRequest(receipt))).status, 409, "refresh must not complete a lesson");
assert.equal((await closurePost(closureRequest(receipt, "en", { completed: true, mastery: 1 }))).status, 400);
assert.equal((await closurePost(closureRequest(`${receipt}x`))).status, 404);
assert.equal((await closurePost(closureRequest(receipt, "en", {}, `other-${randomUUID()}`))).status, 404);
assert.equal((await closurePost(new Request("http://localhost/api/learning/closure", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ receipt, language: "en" }) }))).status, 401);
assert.equal((await closurePost(closureRequest(receipt, "es"))).status, 400);
const large = await closurePost(new Request("http://localhost/api/learning/closure", { method: "POST", headers, body: JSON.stringify({ receipt: "x".repeat(9000), language: "en" }) }));
assert.equal(large.status, 413);
const ack = { learnerId, sessionId, competencyId: taught.decision.competencyId, interventionId: taught.decision.interventionId, interactionType: "acknowledge" };
const stateBefore = JSON.stringify(await getLearnerState(learnerId, taught.decision.competencyId));
const evidenceBefore = JSON.stringify(await getEvidenceForLearner(learnerId));
const acknowledged = await POST(post(ack)); assert.equal(acknowledged.status, 200);
const next = await acknowledged.json() as LearningResponse;
assert.equal(next.decision.reasonCode, "INSTRUCTION_CHECK");
assert.equal(JSON.stringify(await getLearnerState(learnerId, taught.decision.competencyId)), stateBefore, "acknowledgement does not alter mastery/confidence");
assert.equal(JSON.stringify(await getEvidenceForLearner(learnerId)), evidenceBefore);
const retry = await POST(post(ack)); assert.equal(retry.status, 200);
assert.equal((await retry.json()).acknowledgement.status, "already_acknowledged");
async function snapshot() { return JSON.stringify({ states: await getLearnerState(learnerId, taught.decision.competencyId), evidence: await getEvidenceForLearner(learnerId),
  interventions: await getLearnerInterventions(learnerId), measurements: await getPilotMeasurementEvents(learnerId) }); }
const beforeViews = await snapshot();
for (const language of ["en", "fr"] as const) {
  const response = await closurePost(closureRequest(receipt, language));
  assert.equal(response.status, 200); assert.equal(response.headers.get("cache-control"), "private, no-store");
  const closure = await response.json() as LessonClosure;
  assert.equal(closure.competencyId, taught.decision.competencyId); assert.equal(closure.interventionId, taught.decision.interventionId);
  assert.equal(closure.language, language); assert.equal(closure.evidence.attempts, 1);
  // Legacy validation fixtures have no explicit translation relationship.
  // Never guess a different lesson from an ID suffix or silently show English.
  assert.equal(closure.summary.available, language === "en");
  if (language === "en") assert(closure.summary.narration.length > 0);
  else assert.equal(closure.summary.narration, "");
  assert(!JSON.stringify(closure).includes("expectedResponse")); assert(!JSON.stringify(closure).includes("rubricCriteria"));
}
assert.equal(await snapshot(), beforeViews, "summary viewing/translation/retry must not mutate evidence, progress, interventions or measurements");
assert.equal((await restore()).decision.reasonCode, "INSTRUCTION_CHECK", "summary viewing cannot bypass the required review");
const item = getContent(next.content!.id)!;
const body = { learnerId, sessionId, competencyId: next.decision.competencyId, interventionId: next.decision.interventionId,
  assessmentItemId: item.assessmentItemId, response: item.metadata!.expectedResponse, clientRequestId: randomUUID() };
const reviewed = await POST(post(body)); assert.equal(reviewed.status, 200);
const reviewedData = await reviewed.json() as LearningResponse;
const duplicate = await POST(post(body)); assert.equal(duplicate.status, 200);
assert.equal((await duplicate.json()).assessment.result.duplicate, true);
const afterReview = await getLessonClosure(learnerId, receipt, "en");
assert.equal(afterReview.evidence.attempts, 2, "review enters the existing authoritative evidence pipeline once");
assert.equal(afterReview.evidence.correct, 1);
assert.equal((await getEvidenceForLearner(learnerId)).length, 2);
assert.equal(JSON.stringify(await getLearnerState(learnerId, next.decision.competencyId)), JSON.stringify(reviewedData.learnerState));
assert.equal(await issueLessonReceipt(learnerId, next.decision.interventionId, item), undefined, "assessment content cannot get a summary receipt");
assert.deepEqual(authoredExcerpts("Use 1.5 units. Then add 0.25 units."), ["Use 1.5 units.", "Then add 0.25 units."]);
assert.deepEqual(authoredExcerpts("x".repeat(900)), [], "do not truncate an unknown mathematical sentence");
const realNow = Date.now;
try { Date.now = () => realNow() + 8 * 86400000; await assert.rejects(() => getLessonClosure(learnerId, receipt, "en"), /invalid_receipt/); }
finally { Date.now = realNow; }
console.log("PASS: delivery/completion boundaries, bilingual exact summaries, isolation, immutable views, acknowledgement retries and authoritative review evidence/duplicates");
