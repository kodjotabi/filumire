import assert from "node:assert/strict";
import { mock } from "node:test";
import { resolveReviewIntervention } from "../services/teacher-review";
import { createIntervention } from "../services/intervention-store";
import { recordAssessmentDelivery } from "../services/edututor/assessment-recovery";
import type { PendingTeacherReviewRecord } from "../services/persistence";

const t0 = Date.parse("2026-10-22T11:00:00.000Z");
mock.timers.enable({ apis: ["Date"], now: t0 });
try {
  const review: PendingTeacherReviewRecord = { id: "review-provenance", learnerId: "learner-review-provenance", sessionId: "session-review-provenance", competencyId: "competency-gh-english-b4-1-1-1-1", contentId: "content-provenance", assessmentItemId: "item-provenance", response: "Fictional test work", status: "pending", submittedAt: new Date(t0 + 1000).toISOString() };
  const content = { id: review.contentId!, assessmentItemId: review.assessmentItemId };
  const create = (id: string, learnerId = review.learnerId) => createIntervention({ interventionId: id, learnerId, competencyId: review.competencyId, sessionId: review.sessionId, decisionId: `decision-${id}`, type: "transfer_check" });
  assert.equal(await resolveReviewIntervention(review), undefined, "legacy reviews without delivery remain unbound");
  await create("review-original-delivery");
  await recordAssessmentDelivery(review.learnerId, review.sessionId, "review-original-delivery", review.competencyId, content);
  assert.equal(await resolveReviewIntervention(review), "review-original-delivery");
  await create("review-foreign-delivery", "another-learner");
  await recordAssessmentDelivery(review.learnerId, review.sessionId, "review-foreign-delivery", review.competencyId, content);
  assert.equal(await resolveReviewIntervention(review), "review-original-delivery", "reject foreign intervention even if an event claims the correct learner");
  for (const change of [{ sessionId: "other-session" }, { competencyId: "other-competency" }, { assessmentItemId: "other-item" }, { contentId: "other-content" }, { learnerId: "other-learner" }]) {
    assert.equal(await resolveReviewIntervention({ ...review, ...change }), undefined, "all identity fields must match");
  }
  mock.timers.setTime(t0 + 2000);
  await create("review-future-delivery");
  await recordAssessmentDelivery(review.learnerId, review.sessionId, "review-future-delivery", review.competencyId, content);
  assert.equal(await resolveReviewIntervention(review), "review-original-delivery", "later activity cannot rewrite an earlier pending submission's provenance");
  assert.equal(await resolveReviewIntervention({ ...review, submittedAt: new Date(t0 + 3000).toISOString() }), "review-future-delivery", "a later submission uses its latest matching server delivery");
} finally { mock.timers.reset(); }
console.log("PASS trusted review delivery binding: learner/session/topic/item/content/time validation and legacy compatibility");
