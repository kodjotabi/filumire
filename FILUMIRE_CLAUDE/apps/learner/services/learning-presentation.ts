import type { LearningResponse, LearningOverview, PendingTeacherReviewResponse } from "./learning-client";

type SubjectStats = LearningOverview["subjects"][string];
export function completionPercent(stats?: Pick<SubjectStats, "total" | "completed">): number | null {
  if (!stats || !Number.isInteger(stats.total) || stats.total <= 0 || !Number.isInteger(stats.completed) || stats.completed < 0 || stats.completed > stats.total) return null;
  // Only genuinely completed totals may display 100%.
  return stats.completed === stats.total ? 100 : Math.min(99, Math.round(stats.completed / stats.total * 100));
}
export function estimatePercent(value: number): number | null {
  return Number.isFinite(value) ? Math.round(Math.max(0, Math.min(1, value)) * 100) : null;
}
export const LEARNING_STAGES = ["Understand", "Practise", "Apply", "Check", "Reflect"] as const;
export function stageIndicators(action: string) {
  const current = ["teach", "remediate"].includes(action) ? 0 : ["practice", "scaffold"].includes(action) ? 1 : action === "transfer_check" ? 2 : ["diagnose", "reassess", "retention_check"].includes(action) ? 3 : action === "advance" ? 4 : null;
  // No persisted stage-completion history is supplied by the API. The current
  // recommendation therefore cannot establish completion of any other stage.
  return LEARNING_STAGES.map((label, index) => ({ label, current: index === current, completed: false }));
}
export type FeedbackOutcome = "correct" | "incorrect" | "partial" | "pending-review" | "reviewed" | "recorded";
export interface ActivityFeedback { outcome: FeedbackOutcome; assessmentItemId: string; title?: string }
type Submission = LearningResponse | { pendingTeacherReview: PendingTeacherReviewResponse };
export function evaluatedFeedback(result: Submission, source: { assessmentItemId: string; title?: string }): ActivityFeedback | null {
  if ("pendingTeacherReview" in result) {
    return { ...source, outcome: result.pendingTeacherReview.status === "reviewed" ? "reviewed" : "pending-review" };
  }
  const assessment = result.assessment;
  if (!assessment || assessment.result.assessmentItemId !== source.assessmentItemId) return null;
  const authoritativeOutcome = assessment.evidence?.outcome;
  const outcome = authoritativeOutcome === "partial" || authoritativeOutcome === "correct" || authoritativeOutcome === "incorrect"
    ? authoritativeOutcome
    : authoritativeOutcome ? "recorded"
      : assessment.result.correct === true ? "correct" : assessment.result.correct === false ? "incorrect" : "recorded";
  return { ...source, outcome };
}
