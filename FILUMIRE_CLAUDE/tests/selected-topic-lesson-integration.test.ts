import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { GET, POST } from "../apps/learner/app/api/learning/route";
import { seedContent } from "../services/content-store/seed";
import { getContentForCompetency, saveContent } from "../services/content-store";
import { createSession } from "../services/session";
import { getEvidenceForLearner } from "../services/evidence-store";
import { getIntervention } from "../services/intervention-store";
import { getLessonClosure } from "../services/lesson-closure";
import { makeAdaptiveDecision } from "../services/adaptive-engine";
import { getLearnerState, saveLearnerState } from "../services/learner-state-store";
import { closureMatchesActivity, closureScope, isTeachingFirstStep } from "../apps/learner/services/lesson-closure-client";
import { SUBJECT_GHANA_BASIC4_MATH_ID as SUBJECT } from "../packages/curriculum-framework";
import type { LearningResponse } from "../apps/learner/services/learning-client";

assert.equal(process.env.FILUMIRE_PERSISTENCE, "memory");
seedContent();
const FRACTIONS = "competency-gh-math-b4-equivalent-fractions-001";
async function learner(language: "en" | "fr") {
  const learnerId = "topic-integration-" + randomUUID(), sessionId = "topic-session-" + randomUUID();
  await createSession(sessionId, learnerId);
  const headers = { "content-type": "application/json", origin: "http://localhost", "x-filumire-learner-id": learnerId, "x-filumire-language": language };
  const read = async (response: Response) => { assert.equal(response.status, 200); return response.json() as Promise<LearningResponse>; };
  const get = (topic?: string) => GET(new Request(`http://localhost/api/learning?subjectId=${SUBJECT}&sessionId=${sessionId}${topic ? "&competencyId=" + topic : ""}`, { headers })).then(read);
  const post = (body: object) => POST(new Request("http://localhost/api/learning", { method: "POST", headers, body: JSON.stringify({ sessionId, ...body }) })).then(read);
  const next = (step: LearningResponse) => post({ interactionType: "acknowledge", interventionId: step.decision.interventionId, competencyId: step.decision.competencyId });
  return { learnerId, sessionId, language, get, post, next };
}
function assertTeaching(step: LearningResponse, topic: string, language: "en" | "fr", type: string) {
  assert.equal(step.decision.competencyId, topic);
  assert.equal(step.content?.competencyId, topic);
  assert.equal(step.content?.language, language);
  assert.equal(step.content?.type, type);
  assert(!step.content?.assessmentItemId);
  assert(isTeachingFirstStep(step.decision), "introduction and revisit cards cannot prepare summaries");
}
for (const language of ["en", "fr"] as const) {
  const l = await learner(language);
  const patterns = await l.get();
  await l.next(patterns);
  const oldClosure = await getLessonClosure(l.learnerId, patterns.lessonReceipt!, language);
  const evidenceBefore = await getEvidenceForLearner(l.learnerId);
  const explanation = await l.get(FRACTIONS);
  assertTeaching(explanation, FRACTIONS, language, "lesson");
  assert.equal(explanation.decision.reasonCode, "NEW_TOPIC_INSTRUCTION");
  assert.notEqual(explanation.content?.id, patterns.content?.id);
  assert(!closureMatchesActivity(oldClosure, explanation, language), "completed number-pattern receipt cannot cover Fractions");
  assert.notEqual(closureScope(l.learnerId, SUBJECT, patterns.decision.competencyId), closureScope(l.learnerId, SUBJECT, FRACTIONS));
  const reload = await l.get(FRACTIONS);
  assert.equal(reload.decision.interventionId, explanation.decision.interventionId, "duplicate selected-topic GET reuses the explanation");
  const example = await l.next(explanation);
  assertTeaching(example, FRACTIONS, language, "example");
  assert.equal(example.decision.reasonCode, "NEW_TOPIC_WORKED_EXAMPLE");
  const saved = await getLearnerState(l.learnerId, FRACTIONS);
  assert(saved);
  const resumed = await makeAdaptiveDecision({ learnerId: l.learnerId, sessionId: l.sessionId, learnerState: saved });
  assert.equal(resumed.content?.id, example.content?.id, "a normal refresh preserves the selected teaching cycle");
  assert.equal(resumed.decision.interventionId, example.decision.interventionId);
  const practice = await l.next(example);
  assert.equal(practice.decision.competencyId, FRACTIONS);
  assert.equal(practice.decision.reasonCode, "GUIDED_PRACTICE");
  assert.equal(practice.content?.type, "practice");
  assert(practice.content?.assessmentItemId);
  assert.equal(practice.decision.interventionId, example.decision.interventionId);
  assert.equal(practice.content?.metadata?.expectedResponse, undefined, "answer key stays server-side");
  assert.deepEqual(await getEvidenceForLearner(l.learnerId), evidenceBefore, "teaching and navigation create no evidence");
  const item = getContentForCompetency(FRACTIONS, language).find(c => c.assessmentItemId === practice.content?.assessmentItemId)!;
  const check = await l.post({ interactionType: "assessment", competencyId: FRACTIONS, interventionId: practice.decision.interventionId,
    assessmentItemId: item.assessmentItemId, response: item.metadata!.expectedResponse, clientRequestId: randomUUID() });
  assert(check.content?.assessmentItemId, "questions follow guided practice");
  assert.equal((await getEvidenceForLearner(l.learnerId)).length, evidenceBefore.length + 1);
  const revisit = await l.get(FRACTIONS);
  assertTeaching(revisit, FRACTIONS, language, "lesson");
  assert.equal(revisit.decision.reasonCode, "TOPIC_REVISIT", "partially learnt topics restart teaching too");
  assert.equal((await getIntervention(check.decision.interventionId!))?.status, "active", "revisit does not cancel a delivered question");
  const revisitedExample = await l.next(revisit);
  assertTeaching(revisitedExample, FRACTIONS, language, "example");
  const revisitedPractice = await l.next(revisitedExample);
  assert.equal(revisitedPractice.decision.reasonCode, "GUIDED_PRACTICE");
  assert.equal(revisitedPractice.decision.competencyId, FRACTIONS);
  assert.equal(revisitedPractice.learnerState.competencies[0].masteryEstimate, check.learnerState.competencies[0].masteryEstimate);
  assert.equal((await getEvidenceForLearner(l.learnerId)).length, evidenceBefore.length + 1, "revisit preserves scored evidence");
  console.log(`PASS ${language}: Fractions teaching, stale-summary isolation, refresh, examples, guided practice, questions and partial revisit`);
}

// A historical mastered profile with no usable question left may still reread
// its teaching. Exhaustion must not turn earned mastery into "needs support".
{
  const l = await learner("en");
  await l.get(FRACTIONS);
  const state = (await getLearnerState(l.learnerId, FRACTIONS))!;
  const profile = state.competencies[0];
  Object.assign(profile, { masteryEstimate: 1, confidence: 1, evidenceCount: 12,
    retentionState: { status: "retained", confidence: 1, evidenceIds: ["historical-retention"] },
    transferState: { status: "demonstrated", confidence: 1, evidenceIds: ["historical-transfer"] },
    readinessState: { readyForAdvancement: true, confidence: 1, reasonCode: "MASTERY_RETENTION_TRANSFER_CONFIRMED", evaluatedAt: state.updatedAt } });
  await saveLearnerState(state);
  const before = structuredClone(profile);
  const explanation = await l.get(FRACTIONS);
  assertTeaching(explanation, FRACTIONS, "en", "lesson");
  const example = await l.next(explanation);
  assertTeaching(example, FRACTIONS, "en", "example");
  const questions = getContentForCompetency(FRACTIONS).filter(item => item.assessmentItemId);
  try {
    // Change fictional in-process content only, not the authored source files.
    for (const item of questions) saveContent({ ...item, competencyId: "offline-unavailable-pool" });
    await l.next(example);
    const after = (await getLearnerState(l.learnerId, FRACTIONS))!.competencies.find(item => item.competencyId === FRACTIONS);
    assert.deepEqual(after, before, "revisit exhaustion preserves the complete mastered profile");
  } finally { for (const item of questions) saveContent(item); }
  console.log("PASS mastered revisit: unavailable question pool does not revoke earned progress or mastery");
}
