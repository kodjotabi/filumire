import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { GET, POST } from "../apps/learner/app/api/learning/route";
import { seedContent } from "../services/content-store/seed";
import { getContentForCompetency } from "../services/content-store";
import type { LearningResponse } from "../apps/learner/services/learning-client";

assert.equal(process.env.FILUMIRE_PERSISTENCE, "memory", "This regression must never use a remote database");
seedContent();
const learnerId = `continuity-${randomUUID()}`;
const sessionId = `session-${randomUUID()}`;
const headers = { "Content-Type": "application/json", "x-filumire-learner-id": learnerId };
async function restore() {
  const response = await GET(new Request(`http://localhost/api/learning?sessionId=${sessionId}`, { headers }));
  assert.equal(response.status, 200);
  return await response.json() as LearningResponse;
}
const initial = await restore();
const content = getContentForCompetency(initial.decision.competencyId).find((item) => item.assessmentItemId && item.metadata?.expectedResponse);
assert(content?.assessmentItemId && content.metadata?.expectedResponse);
const body = {
  learnerId, sessionId, competencyId: initial.decision.competencyId,
  assessmentItemId: content.assessmentItemId, response: content.metadata.expectedResponse,
  clientRequestId: randomUUID(),
};
async function submit() {
  const response = await POST(new Request("http://localhost/api/learning", { method: "POST", headers, body: JSON.stringify(body) }));
  assert.equal(response.status, 200);
  return await response.json() as LearningResponse;
}
const committed = await submit();
const retry = await submit();
assert.equal(retry.assessment?.result.duplicate, true);
assert.deepEqual(retry.learnerState, committed.learnerState, "same answer retry must not change mastery or add evidence");
const refreshed = await restore();
const returned = await restore();
assert.deepEqual(refreshed.learnerState, committed.learnerState);
assert.deepEqual(returned.learnerState, refreshed.learnerState);
assert.equal(returned.content?.id, refreshed.content?.id, "repeated restoration must keep the authoritative activity");
assert.equal(returned.decision.interventionId, refreshed.decision.interventionId, "refresh must not acknowledge an instructional card");
console.log("PASS: server duplicate retry preserves mastery/evidence; refresh and returning requests restore current activity without acknowledgement");
