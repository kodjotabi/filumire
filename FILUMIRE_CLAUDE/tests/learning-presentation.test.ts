import assert from "node:assert/strict";
import { completionPercent, estimatePercent, stageIndicators, evaluatedFeedback } from "../apps/learner/services/learning-presentation";
import type { LearningResponse } from "../apps/learner/services/learning-client";

let failures = 0;
function check(name: string, run: () => void) {
  try { run(); console.log(`PASS: ${name}`); }
  catch (error) { failures++; console.error(`FAIL: ${name}: ${error instanceof Error ? error.message : error}`); }
}
const progress: LearningResponse["progress"] = {
  learnerId: "a", competencyCount: 1, completedCompetencies: 0,
  masteryEstimate: .95, confidence: .9, evidenceCount: 3, readiness: false, percent: 93,
};
const response = { progress, decision: { action: "practice" }, assessment: { result: { correct: true, assessmentItemId: "old-item" } } } as unknown as LearningResponse;
check("missing subject totals never use mastery/confidence as completion", () => {
  assert.equal(completionPercent(undefined), null);
});
check("remediation cannot invent or erase historical completed stages", () => {
  for (const action of ["teach", "practice", "remediate", "transfer_check", "retention_check", "advance", "complete"]) {
    assert(stageIndicators(action).every((stage) => !stage.completed), `${action} inferred completed stages`);
  }
  assert.equal(stageIndicators("diagnose").find((stage) => stage.current)?.label, "Check");
});
check("a result for another question cannot supply current-question feedback", () => {
  assert.equal(evaluatedFeedback(response, { assessmentItemId: "new-item" }), null);
  assert.equal(evaluatedFeedback({ ...response, assessment: undefined }, { assessmentItemId: "old-item" }), null);
});
check("subject mastery totals, not current mastery estimates, drive completion", () => {
  assert.equal(completionPercent({ total: 10, completed: 2 }), 20);
  assert.equal(completionPercent({ total: 10, completed: 0 }), 0);
  assert.equal(completionPercent({ total: 10, completed: 10 }), 100);
  assert.equal(completionPercent({ total: 1000, completed: 999 }), 99);
  for (const stats of [{ total: 0, completed: 0 }, { total: 5, completed: 6 }, { total: 5, completed: -1 }, { total: NaN, completed: 1 }]) assert.equal(completionPercent(stats), null);
  assert.equal(estimatePercent(progress.masteryEstimate), 95);
  assert.equal(estimatePercent(progress.confidence), 90);
  assert.equal(progress.percent, 93, "presentation must not mutate authoritative data");
});
check("correct, incorrect and partial refer to the evaluated item, not the next content", () => {
  for (const outcome of ["correct", "incorrect", "partial"] as const) {
    const result = { ...response, content: { id: "next", assessmentItemId: "new-item" }, assessment: { result: { correct: outcome === "correct", assessmentItemId: "old-item" }, evidence: { outcome } } } as LearningResponse;
    assert.deepEqual(evaluatedFeedback(result, { assessmentItemId: "old-item", title: "Submitted question" }), { assessmentItemId: "old-item", title: "Submitted question", outcome });
  }
});
check("pending and reviewed teacher activities cannot imply correct answers", () => {
  assert.equal(evaluatedFeedback({ pendingTeacherReview: { id: "review", status: "pending", duplicate: false } }, { assessmentItemId: "old-item" })?.outcome, "pending-review");
  assert.equal(evaluatedFeedback({ pendingTeacherReview: { id: "review", status: "reviewed", duplicate: true } }, { assessmentItemId: "old-item" })?.outcome, "reviewed");
  assert.equal(evaluatedFeedback({ ...response, assessment: { result: { correct: true } } }, { assessmentItemId: "old-item" }), null, "unattributable results are not successes");
  for (const outcome of ["observed", "skipped"]) {
    assert.equal(evaluatedFeedback({ ...response, assessment: { result: { correct: false, assessmentItemId: "old-item" }, evidence: { outcome } } }, { assessmentItemId: "old-item" })?.outcome, "recorded");
  }
});
check("adaptive recommendations are current actions, not historical completion", () => {
  const expected = { teach: "Understand", remediate: "Understand", practice: "Practise", scaffold: "Practise", transfer_check: "Apply", diagnose: "Check", reassess: "Check", retention_check: "Check", advance: "Reflect" };
  for (const [action, label] of Object.entries(expected)) assert.equal(stageIndicators(action).find((stage) => stage.current)?.label, label);
  assert(stageIndicators("complete").every((stage) => !stage.current && !stage.completed));
  assert(stageIndicators("unknown").every((stage) => !stage.current && !stage.completed));
});
if (failures) throw Error(`${failures} presentation regressions detected`);
