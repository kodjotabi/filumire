import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { ccpSourcePath } from "./fixtures/ccp-source";
import { mock } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { GET, POST } from "../apps/learner/app/api/learning/route";
import { AnswerCorrectionPanel } from "../apps/learner/components/filumire/AnswerCorrectionPanel";
import { correctionFor } from "../apps/learner/services/learning-presentation";
import { assertPilotEnvironment, installPilot, pilotContext } from "./fixtures/basic7-materials-pilot";
import { source, competency, pilotContent, observationContent } from "../services/content-store/ghana-b7-materials-pilot";
import { getEvidence } from "../services/evidence-store";
import { getAllCompetencies, registerIsolatedBasic7TestCurriculum } from "../packages/curriculum";
import { getAvailableSubjectsForGrade } from "../packages/curriculum-framework";
import { createSession } from "../services/session";
import { buildLearnerProgress } from "../services/learner-progress";
import { getLearnerState } from "../services/learner-state";
import { writePendingSubmission, readPendingSubmission, clearPendingSubmission } from "../apps/learner/services/pending-submission";
import { persistenceStore } from "../services/persistence-provider";
import { submitPendingTeacherReview } from "../services/teacher-review";
import { createPrincipalLearnerAccess } from "../services/principal";
import { POST as reviewPOST } from "../apps/learner/app/api/teacher/review/route";
import { buildRevisionSummary } from "../services/learner-path/revision";
import { getMaterialsPilotProgress } from "../services/learner-progress/ghana-b7-materials-pilot";
import { makeAdaptiveDecision } from "../services/adaptive-engine";
Object.assign(globalThis, { React });

Object.defineProperty(process.env, "NODE_ENV", { value: "test", writable: true, configurable: true, enumerable: true });
process.env.FILUMIRE_BASIC7_PILOT = "test-only";
assert.equal(process.env.FILUMIRE_PERSISTENCE, "memory");
assert.equal(createHash("sha256").update(readFileSync(ccpSourcePath(source.source.localPath))).digest("hex"), source.source.sha256);
assert.equal(source.officialCode, "B7.1.1.1.1");
assert.deepEqual(source.sourceIssueIds, []);
assert.equal(source.source.pdfPages[0], 39);
assert.equal(getAllCompetencies().some((c) => c.id === source.id), false);
assert.deepEqual(getAvailableSubjectsForGrade(source.curriculumVersionId, source.gradeId), []);
for (const [key, value] of [["NODE_ENV", "production"], ["FILUMIRE_PERSISTENCE", "postgres"], ["FILUMIRE_BASIC7_PILOT", ""], ["VERCEL", "1"]]) {
  const previous = process.env[key]; process.env[key] = value;
  assert.throws(assertPilotEnvironment, /test process/);
  assert.throws(() => registerIsolatedBasic7TestCurriculum(competency,
    { id: source.subjectId, learningLevelId: source.gradeId, name: "Science", code: "GH-B7-SCI" },
    { id: source.gradeId, educationSystemId: competency.educationSystemId, name: "Basic 7", order: 7 }), /isolated in-memory test process/);
  if (previous === undefined) delete process.env[key]; else process.env[key] = previous;
}
const legacy = JSON.stringify(getAllCompetencies());
installPilot();
assert.equal(JSON.stringify(getAllCompetencies().filter((c) => c.id !== source.id)), legacy);
assert.equal(new Set([...pilotContent, ...observationContent].map((c) => c.id)).size, pilotContent.length + observationContent.length);

for (const language of ["en", "fr"] as const) {
  const learnerId = `learner-b7-materials-${language}-${crypto.randomUUID()}`, sessionId = `session-${learnerId}`;
  await persistenceStore.ensureLearnerExists(learnerId);
  await createSession(sessionId, learnerId);
  const context = await pilotContext(learnerId);
  const headers = { "content-type": "application/json", "x-filumire-learner-id": learnerId, "x-filumire-language": language, origin: "http://localhost" };
  async function read(response: Response) {
    const body = await response.json(); assert.equal(response.status, 200, JSON.stringify(body)); return body;
  }
  const get = () => GET(new Request(`http://localhost/api/learning?sessionId=${sessionId}&subjectId=${source.subjectId}`, { headers })).then(read);
  const post = (body: Record<string, unknown>) => POST(new Request("http://localhost/api/learning", { method: "POST", headers, body: JSON.stringify({ sessionId, competencyId: source.id, ...body }) })).then(read);
  const next = (step: any) => step.decision.interventionId ? post({ interactionType: "acknowledge", interventionId: step.decision.interventionId }) : get();
  const original = (step: any) => pilotContent.find((c) => c.assessmentItemId === step.content?.assessmentItemId)!;
  const answer = (step: any, correct = true, interactionType = "assessment", clientRequestId = crypto.randomUUID()) => {
    const item = original(step); assert(item, "a delivered authored question exists");
    return post({ interactionType, interventionId: step.decision.interventionId, assessmentItemId: item.assessmentItemId,
      response: correct ? item.metadata.expectedResponse : JSON.parse(item.metadata.options!).find((v: string) => v !== item.metadata.expectedResponse), clientRequestId });
  };
  let step = await get();
  assert.equal(step.content.type, "lesson"); assert.equal(step.content.language, language);
  assert(step.content.body.includes(language === "en" ? "texture" : "texture"));
  step = await next(step); assert.equal(step.content.type, "example");
  step = await next(step); assert.equal(step.content.type, "practice");
  const practice = step;
  const wrong = await answer(practice, false);
  assert(["teach", "scaffold", "remediate"].includes(wrong.decision.action));
  const correction = correctionFor(wrong, practice.content.assessmentItemId);
  assert(correction?.concept?.body && correction?.explanation?.body, "wrong answer receives corrective teaching");
  const markup = renderToStaticMarkup(React.createElement(AnswerCorrectionPanel, { correction: correction!, phase: "explain", language, busy: false, onRetry() {}, onContinue() {} }));
  assert(markup.includes(language === "en" ? "Try the question again" : "Réessayer la question"));
  const retried = await answer(practice, true, "corrective_retry");
  assert.equal(retried.correction.retryOutcome, "correct");
  const evidence = await getEvidence(learnerId, source.id);
  assert(evidence.some((e) => e.independence === "guided" && e.outcome === "correct"));
  assert.equal(evidence.filter((e) => e.independence === "independent" && e.outcome === "correct").length, 0);
  // Interface language changes must not replace the retained question or its evidence.
  headers["x-filumire-language"] = language === "en" ? "fr" : "en";
  const switched = await get();
  assert.equal((await getEvidence(learnerId, source.id)).length, evidence.length);
  assert.equal(switched.decision.competencyId, source.id);
  headers["x-filumire-language"] = language;
  step = await get();
  while (!step.content?.assessmentItemId) step = await next(step);
  // Offline queue stores an answer only; the trusted server evaluates after reconnection.
  const storage = new Map<string, string>();
  Object.assign(globalThis, { window: { localStorage: { getItem: (k: string) => storage.get(k) ?? null, setItem: (k: string, v: string) => storage.set(k, v), removeItem: (k: string) => storage.delete(k) } } });
  const item = original(step);
  const before = (await getEvidence(learnerId, source.id)).length;
  const queued = { learnerId, sessionId, competencyId: source.id, assessmentItemId: item.assessmentItemId!, interventionId: step.decision.interventionId, response: item.metadata.expectedResponse!, clientRequestId: crypto.randomUUID(), queuedAt: new Date().toISOString() };
  writePendingSubmission(queued); assert.deepEqual(readPendingSubmission(), queued);
  assert.equal((await getEvidence(learnerId, source.id)).length, before);
  step = await post({ ...queued, interactionType: "assessment" });
  await post({ ...queued, interactionType: "assessment" });
  assert.equal((await getEvidence(learnerId, source.id)).length, before + 1, "reconnection retry is idempotent");
  clearPendingSubmission(queued.clientRequestId); assert.equal(readPendingSubmission(), null);
  Reflect.deleteProperty(globalThis, "window");
  for (let n = 0; n < 65; n++) {
    const state = await getLearnerState(learnerId, source.id);
    if (state?.competencies[0].readinessState?.readyForAdvancement) break;
    step = step.content?.assessmentItemId ? await answer(step) : await next(step);
  }
  const state = await getLearnerState(learnerId, source.id);
  assert(state?.competencies[0].readinessState?.readyForAdvancement, "independent evidence, retention and transfer reach engine readiness");
  const all = await getEvidence(learnerId, source.id);
  assert(all.some((e) => e.purpose === "retention" && e.outcome === "correct"));
  assert(all.some((e) => e.purpose === "transfer" && e.outcome === "correct"));
  assert(all.filter((e) => e.independence === "independent" && e.outcome === "correct").length >= 3);
  const progress = await buildLearnerProgress(learnerId, context);
  assert.equal(progress.mastery.masteredCompetencies, 1);
  assert(progress.activity.answersRecorded > 0);
  assert.equal((await getMaterialsPilotProgress(learnerId, context)).journey.complete, false, "quiz mastery does not complete the practical journey");
  const revision = await buildRevisionSummary(learnerId, source.gradeId, source.subjectId, source.id, new Date(Date.now() + 30 * 86400000));
  assert(revision?.due.some((entry) => entry.competencyId === source.id), "mastered topic becomes due for spaced revision");

  // Practical work is independently reviewed, not fabricated by quiz completion.
  const observation = observationContent.find((c) => c.language === language)!;
  const pending = await submitPendingTeacherReview({ learnerId, competencyId: source.id, contentId: observation.id,
    assessmentItemId: observation.assessmentItemId!, sessionId, response: "Stone: rough, grey, irregular shape, solid. Water: clear, colourless, container-shaped, liquid. Air: texture not observed, invisible, fills balloon, gas. Discussed shape differences.", clientRequestId: crypto.randomUUID() });
  assert.equal(pending.review.status, "pending");
  assert.equal((await getMaterialsPilotProgress(learnerId, context)).journey.practicalReview, "pending");
  assert.equal((await getMaterialsPilotProgress(learnerId, context)).journey.complete, false);
  const teacherId = `teacher-${learnerId}`;
  await persistenceStore.createPrincipal(teacherId);
  await createPrincipalLearnerAccess(`access-${learnerId}`, teacherId, learnerId, "teacher");
  const review = await reviewPOST(new Request("http://localhost/api/teacher/review", { method: "POST", headers: { "content-type": "application/json", "x-filumire-principal-id": teacherId }, body: JSON.stringify({ reviewId: pending.review.id, outcome: "correct" }) }));
  assert.equal(review.status, 200, JSON.stringify(await review.json()));
  assert((await getEvidence(learnerId, source.id)).some((e) => e.assessmentItemId === observation.assessmentItemId && e.evaluatorType === "teacher"));
  assert.equal((await getMaterialsPilotProgress(learnerId, context)).journey.complete, true);
  // Advance the clock consistently for scheduling AND controlled item reuse.
  mock.timers.enable({ apis: ["Date"], now: Date.now() + 30 * 86400000 });
  try {
    const futureReview = await makeAdaptiveDecision({ learnerId, sessionId, learnerState: (await getLearnerState(learnerId, source.id))! }, { timeAwareRetention: true, now: new Date() });
    assert.equal(futureReview.decision.action, "retention_check");
    assert.equal(futureReview.content?.metadata?.assessmentPurpose, "retention");
    // The real API resumes and records delivery of the scheduled question.
    const delivered = await get();
    assert.equal(delivered.decision.action, "retention_check");
    assert.equal(delivered.content.language, language);
    const beforeRetention = (await getLearnerState(learnerId, source.id))!.competencies[0];
    const successfulBefore = beforeRetention.retentionPerformance!.successfulAttempts;
    const checked = await answer(delivered);
    assert.equal(checked.assessment.result.correct, true);
    const retained = (await getLearnerState(learnerId, source.id))!.competencies[0];
    assert.equal(retained.retentionState?.status, "retained");
    assert.equal(retained.retentionPerformance!.successfulAttempts, successfulBefore + 1);
    assert.equal(retained.retentionState?.lastCheckedAt, new Date().toISOString());
    assert.equal(retained.masteryEstimate, beforeRetention.masteryEstimate);
    mock.timers.setTime(Date.now() + 31 * 86400000);
    const dueAgain = await get();
    assert.equal(dueAgain.decision.action, "retention_check");
    const forgotten = await answer(dueAgain, false);
    assert.equal(forgotten.assessment.evidence.purpose, "retention");
    assert.equal(forgotten.decision.action, "practice");
    assert.equal(forgotten.decision.reasonCode, "FORGOTTEN_KNOWLEDGE_REVIEW");
    const forgottenState = (await getLearnerState(learnerId, source.id))!.competencies[0];
    assert.equal(forgottenState.retentionState?.status, "not_retained");
    assert.equal(forgottenState.readinessState?.readyForAdvancement, false);
  } finally { mock.timers.reset(); }

  console.log(`PASS Basic 7 Science ${language}: teaching, correction, guided retry, adaptive continuation, mastery, practical review, progress, offline queue, later retention scoring and forgotten-knowledge intervention`);
}
