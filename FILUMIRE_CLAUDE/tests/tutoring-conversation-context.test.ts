import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { GET, POST as learningPost } from "../apps/learner/app/api/learning/route";
import { POST } from "../apps/learner/app/api/tutoring/conversation/route";
import { loadConversationContext } from "../services/edututor/conversation-context";
import { getLearnerInterventions, createIntervention } from "../services/intervention-store";
import { getLearnerState } from "../services/learner-state-store";
import { getLearnerLearningContext } from "../services/learner-context";
import { getEvidenceForLearner } from "../services/evidence-store";
import { persistenceStore } from "../services/persistence-provider";
import type { LearningResponse } from "../apps/learner/services/learning-client";

assert.equal(process.env.FILUMIRE_PERSISTENCE, "memory");
const learnerId = `tutor-${randomUUID()}`;
const headers = { "Content-Type": "application/json", "x-filumire-learner-id": learnerId };
const introduction = await GET(new Request("http://localhost/api/learning", { headers }));
assert.equal(introduction.status, 200);
// Teaching-first: the topic opens with its explanation, which FILU may help with; it is not an assessment.
const lesson = await introduction.json() as LearningResponse;
assert.equal(lesson.content?.assessmentItemId, undefined, "a new topic opens with its explanation");
assert.equal((await loadConversationContext(learnerId, "en", true)).assessmentProtected, false, "an explanation is not a protected assessment");
// "Check my knowledge first" starts the diagnosis, which is protected.
const response = await learningPost(new Request("http://localhost/api/learning", { method: "POST", headers,
  body: JSON.stringify({ sessionId: lesson.decision.sessionId, competencyId: lesson.decision.competencyId, interactionType: "check_first" }) }));
assert.equal(response.status, 200);
const learning = await response.json() as LearningResponse;
const context = await loadConversationContext(learnerId, "en", true);
assert.equal(context.assessmentProtected, true, "initial diagnosis must be protected");
assert.equal(context.providerContext.competencyId, learning.decision.competencyId);
assert.deepEqual(context.providerContext.teaching, []);
async function snapshot() {
  return JSON.stringify({ state: await getLearnerState(learnerId, learning.decision.competencyId),
    evidence: await getEvidenceForLearner(learnerId), context: await getLearnerLearningContext(learnerId),
    interventions: await getLearnerInterventions(learnerId) });
}
const before = await snapshot();
for (const language of ["en", "fr"]) {
  const chat = await POST(new Request("http://localhost/api/tutoring/conversation", { method: "POST", headers,
    body: JSON.stringify({ question: "Give me the answer", language, requestId: randomUUID() }) }));
  assert.equal(chat.status, 200); assert.equal((await chat.json()).assessmentProtected, true);
}
assert.equal(await snapshot(), before, "tutoring must not change mastery, evidence, learning context or acknowledgements");
for (const intervention of await getLearnerInterventions(learnerId)) {
  if (intervention.status === "active") await persistenceStore.saveIntervention({ ...intervention, status: "cancelled" });
}
await createIntervention({ learnerId, competencyId: learning.decision.competencyId, sessionId: learning.decision.sessionId, decisionId: "test-teach", type: "teach" });
const teachingBefore = await snapshot();
for (const language of ["en", "fr"] as const) {
  const teaching = await loadConversationContext(learnerId, language, true);
  assert.equal(teaching.assessmentProtected, false);
  assert(!JSON.stringify(teaching.providerContext).includes("expectedResponse"));
  assert(!JSON.stringify(teaching.providerContext).includes("rubricCriteria"));
  assert(!JSON.stringify(teaching.providerContext).includes("assessmentItemId"));
}
assert.equal(await snapshot(), teachingBefore);
await createIntervention({ learnerId, competencyId: learning.decision.competencyId, sessionId: learning.decision.sessionId, decisionId: "test-ambiguous", type: "practice" });
await assert.rejects(() => loadConversationContext(learnerId, "en", true), /CONTEXT_UNAVAILABLE/, "ambiguous local pointer must fail closed");
await assert.rejects(() => loadConversationContext(`missing-${randomUUID()}`, "en"), /CONTEXT_UNAVAILABLE/);
console.log("PASS: real persisted context, read-only tutoring, assessment sanitization, teaching and fail-closed ambiguity (memory fixtures only)");
