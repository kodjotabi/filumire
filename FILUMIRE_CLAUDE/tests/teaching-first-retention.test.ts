import assert from "node:assert/strict";
import { mock } from "node:test";
import { GET, POST } from "../apps/learner/app/api/learning/route";
import { getAllSubjects, getCompetenciesForSubject, getCompetency } from "../packages/curriculum";
import { getContentForCompetency } from "../services/content-store";
import { seedContent } from "../services/content-store/seed";
import { createSession } from "../services/session";
import { getLearnerState, saveLearnerState } from "../services/learner-state";
import { getEvidence, saveEvidence } from "../services/evidence-store";
import { persistenceStore } from "../services/persistence-provider";
import { buildRevisionSummary, unansweredActivities, supportsSpacedRevision } from "../services/learner-path/revision";
import { createIntervention, acknowledgeIntervention, getLearnerInterventions } from "../services/intervention-store";
import { installPilot, pilotContext } from "./fixtures/basic7-materials-pilot";
import { source } from "../services/content-store/ghana-b7-materials-pilot";
import { currentTeachingCycle } from "../services/adaptive-engine/topic-teaching";

assert.equal(process.env.FILUMIRE_PERSISTENCE, "memory");
Object.defineProperty(process.env, "NODE_ENV", { value: "test", writable: true, configurable: true, enumerable: true });
process.env.FILUMIRE_BASIC7_PILOT = "test-only";
seedContent();
installPilot();

const targets = [4, 5, 6].map((grade) => {
  const subject = getAllSubjects().find((s) => s.name === "Science" && s.learningLevelId === `level-gh-basic-${grade}-pilot`)!;
  assert(subject);
  return getCompetenciesForSubject(subject.id).find((c) => !c.prerequisiteCompetencyIds.length)!;
});
targets.push(getCompetency(source.id)!);
const failures: string[] = [];
for (const target of targets) for (const language of ["en", "fr"] as const) for (const explicitlySelected of [false, true]) {
  const label = `${target.learningLevelId} ${language} ${explicitlySelected ? "selected-cycle" : "initial-introduction"}`;
  const learnerId = `learner-retention-real-journey-${crypto.randomUUID()}`, sessionId = `session-${learnerId}`;
  await persistenceStore.ensureLearnerExists(learnerId);
  await createSession(sessionId, learnerId);
  if (target.id === source.id) await pilotContext(learnerId);
  const headers = { "content-type": "application/json", "x-filumire-learner-id": learnerId, "x-filumire-language": language, origin: "http://localhost" };
  async function read(response: Response) { const body = await response.json(); assert.equal(response.status, 200, JSON.stringify(body)); return body; }
  const get = (select = false) => GET(new Request(`http://localhost/api/learning?sessionId=${sessionId}&subjectId=${target.subjectId}${select ? `&competencyId=${target.id}` : ""}`, { headers })).then(read);
  // Return to this mastered topic at a review boundary. Reorder existing state
  // only: do not seed scores, clear the next topic's delivery or explicitly
  // select a topic (which deliberately starts a teaching revisit instead).
  async function focusReview() {
    const stored = (await getLearnerState(learnerId, target.id))!;
    await saveLearnerState({ ...stored, competencies: [stored.competencies.find((c) => c.competencyId === target.id)!, ...stored.competencies.filter((c) => c.competencyId !== target.id)] });
  }
  const post = (body: Record<string, unknown>) => POST(new Request("http://localhost/api/learning", { method: "POST", headers, body: JSON.stringify({ sessionId, competencyId: target.id, ...body }) })).then(read);
  const itemFor = (step: any) => getContentForCompetency(target.id).find((c) => c.assessmentItemId === step.content?.assessmentItemId)!;
  async function answer(step: any, correct = true, requestId = crypto.randomUUID()) {
    const item = itemFor(step); assert(item?.metadata?.expectedResponse !== undefined);
    const wrong = item.metadata.options ? JSON.parse(item.metadata.options).find((v: string) => v !== item.metadata!.expectedResponse) : "incorrect-response";
    return post({ interactionType: "assessment", interventionId: step.decision.interventionId, assessmentItemId: item.assessmentItemId,
      response: correct ? item.metadata.expectedResponse : wrong, clientRequestId: requestId });
  }
  let step = await get(explicitlySelected);
  assert.equal(step.content.type, "lesson", label);
  step = await post({ interactionType: "acknowledge", interventionId: step.decision.interventionId });
  assert.equal(step.content.type, "example", label);
  step = await post({ interactionType: "acknowledge", interventionId: step.decision.interventionId });
  assert.equal(step.decision.reasonCode, "GUIDED_PRACTICE", label);
  // No fabricated mastery/evidence: learn through the actual API until acquisition
  // and transfer are established. Time-aware retention may still be waiting.
  for (let n = 0; n < 80; n++) {
    const state = (await getLearnerState(learnerId, target.id))!.competencies.find((c) => c.competencyId === target.id)!;
    if (state.masteryEstimate >= 0.8 && state.confidence >= 0.8 && state.transferState?.status === "demonstrated") break;
    assert.equal(step.decision.competencyId, target.id, `must acquire the selected competency before advancing: ${label}`);
    step = step.content?.assessmentItemId ? await answer(step) : await post({ interactionType: "acknowledge", interventionId: step.decision.interventionId });
  }
  const acquired = (await getLearnerState(learnerId, target.id))!.competencies.find((c) => c.competencyId === target.id)!;
  assert(acquired.masteryEstimate >= 0.8 && acquired.confidence >= 0.8 && acquired.transferState?.status === "demonstrated", label);
  assert(supportsSpacedRevision(target.id), `retention coverage exists: ${label}`);
  const historical = await getLearnerInterventions(learnerId, target.id);
  assert.equal(currentTeachingCycle(historical), undefined, "the teaching cycle has finished, even though the explanation has no direct evidence");
  assert(historical.some((i) => i.type === "teach" && i.status === "completed" && i.evidenceIds.length === 0), "exercise the actual acknowledged explanation");
  mock.timers.enable({ apis: ["Date"], now: Date.now() + 31 * 86400000 });
  try {
    const evidenceBefore = await getEvidence(learnerId, target.id);
    const summary = await buildRevisionSummary(learnerId, target.learningLevelId, target.subjectId, target.id);
    assert(summary, label);
    assert(summary.due.some((entry) => entry.competencyId === target.id), label);
    if (!summary.canStart) { failures.push(`${label}: due revision blocked by superseded teaching`); continue; }
    assert.deepEqual(await getLearnerInterventions(learnerId, target.id), historical, "listing due revision preserves history");
    assert.deepEqual(await getEvidence(learnerId, target.id), evidenceBefore, "listing due revision awards no evidence");
    await focusReview();
    const review = await get();
    assert.equal(review.decision.action, "retention_check", label);
    assert.equal(review.content.language, language, label);
    assert.equal(review.content.metadata.expectedResponse, undefined, "answer key stays server-side");
    const refresh = await get();
    assert.equal(refresh.decision.interventionId, review.decision.interventionId);
    assert.equal(refresh.content.assessmentItemId, review.content.assessmentItemId);
    const correct = await answer(review);
    const correctState = (await getLearnerState(learnerId, target.id))!.competencies.find((c) => c.competencyId === target.id)!;
    assert.equal(correctState.masteryEstimate, acquired.masteryEstimate, "retention does not inflate independent mastery");
    assert.equal(correctState.retentionState?.lastCheckedAt, new Date().toISOString());
    assert.equal(correctState.retentionPerformance!.successfulAttempts, (acquired.retentionPerformance?.successfulAttempts ?? 0) + 1);
    assert.equal(correctState.retentionState!.status, acquired.retentionPerformance?.attempts ? "retained" : "pending", "one success remains pending; established retention stays retained");
    assert.equal(correct.assessment.result.correct, true);
    assert.equal(correct.assessment.evidence.purpose, "retention");
    assert.equal(correct.assessment.evidence.independence, "independent");
    const count = (await getEvidence(learnerId, target.id)).length;
    await answer(review, true);
    assert.equal((await getEvidence(learnerId, target.id)).length, count, "one score per delivered review despite different retry key");
    // Another authentic due review, no changes to stored mastery or evidence.
    mock.timers.setTime(Date.now() + 31 * 86400000);
    await focusReview();
    const wrongReview = await get();
    assert.equal(wrongReview.decision.action, "retention_check", label);
    const wrong = await answer(wrongReview, false);
    const wrongState = (await getLearnerState(learnerId, target.id))!.competencies.find((c) => c.competencyId === target.id)!;
    assert.equal(wrong.assessment.result.correct, false);
    assert.equal(wrong.assessment.evidence.purpose, "retention");
    assert.equal(wrongState.retentionPerformance!.unsuccessfulAttempts, (correctState.retentionPerformance?.unsuccessfulAttempts ?? 0) + 1);
    assert.equal(wrongState.readinessState?.readyForAdvancement, false);
    assert.equal(wrongState.retentionState?.status, "not_retained");
    assert.equal(wrong.decision.action, "practice", `existing forgotten-knowledge review: ${label}`);
    assert.equal(wrong.decision.reasonCode, "FORGOTTEN_KNOWLEDGE_REVIEW", label);
    assert.equal(wrongState.diagnosticState, "forgotten_knowledge", label);
    console.log(`PASS ${label}: real teaching-first mastery, due question, correct retention update, idempotent scoring, incorrect retention intervention`);
  } finally { mock.timers.reset(); }
}
assert.deepEqual(failures, [], "acknowledged introductory teaching must not block later revision (B4–7, EN/FR)");

// Lifecycle safety: later work on another competency, or a timestamp tie,
// must not retire a genuinely unfinished check; active work always wins.
const target = targets[0], learnerId = `learner-pending-safety-${crypto.randomUUID()}`;
await persistenceStore.ensureLearnerExists(learnerId);
const t = Date.now();
mock.timers.enable({ apis: ["Date"], now: t });
try {
  const make = (type: "teach" | "scaffold" | "remediate" | "diagnose" | "retention_check") => createIntervention({ learnerId, competencyId: target.id, sessionId: "pending-safety", decisionId: crypto.randomUUID(), type });
  const old = await make("teach");
  await acknowledgeIntervention({ learnerId, competencyId: target.id, interventionId: old.interventionId });
  await saveEvidence({ id: crypto.randomUUID(), learnerId, competencyId: target.id, source: "assessment", outcome: "correct", timestamp: new Date(t).toISOString(), policyVersion: "test-boundary" });
  assert((await unansweredActivities(learnerId, target.subjectId, target.id)).some((i) => i.interventionId === old.interventionId), "equal timestamps are conservatively unfinished");
  mock.timers.setTime(t + 1000);
  const active = await make("teach");
  const question = await make("diagnose");
  const review = await make("retention_check");
  const scaffold = await make("scaffold");
  await acknowledgeIntervention({ learnerId, competencyId: target.id, interventionId: scaffold.interventionId });
  const other = getCompetenciesForSubject(target.subjectId).find((c) => c.id !== target.id)!;
  await saveEvidence({ id: crypto.randomUUID(), learnerId, competencyId: other.id, source: "assessment", outcome: "correct", timestamp: new Date(t + 2000).toISOString(), policyVersion: "test-boundary" });
  const open = await unansweredActivities(learnerId, target.subjectId, target.id);
  assert(open.some((i) => i.interventionId === old.interventionId), "other-topic evidence cannot supersede teaching");
  assert(open.some((i) => i.interventionId === scaffold.interventionId), "new corrective instruction stays pending");
  await saveEvidence({ id: crypto.randomUUID(), learnerId, competencyId: target.id, source: "assessment", outcome: "correct", timestamp: new Date(t + 500).toISOString(), policyVersion: "test-boundary" });
  const after = await unansweredActivities(learnerId, target.subjectId, target.id);
  assert(!after.some((i) => i.interventionId === old.interventionId), "older acknowledged teaching is superseded");
  assert(after.some((i) => i.interventionId === active.interventionId), "active teaching stays protected");
  assert(after.some((i) => i.interventionId === question.interventionId), "a delivered unanswered question stays protected");
  assert(after.some((i) => i.interventionId === review.interventionId), "a delivered unanswered review stays protected");
  assert(after.some((i) => i.interventionId === scaffold.interventionId), "teaching newer than evidence stays protected");
} finally { mock.timers.reset(); }
console.log("PASS pending activity safety: active/new instruction, unrelated topics, timestamp ties, read-only supersession");
