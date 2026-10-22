import { buildLearnerProgress } from "./index";
import type { LearnerLearningContextRecord } from "../learner-context";
import { getEvidence } from "../evidence-store";
import { getPendingTeacherReviews } from "../teacher-review";
import { source, observationContent } from "../content-store/ghana-b7-materials-pilot";

// A pilot report composed from supported stores, not a separate mastery engine.
// No production entry point imports this unpublished content/report.
export async function getMaterialsPilotProgress(learnerId: string, context: LearnerLearningContextRecord) {
  const [progress, evidence, pending] = await Promise.all([
    buildLearnerProgress(learnerId, context), getEvidence(learnerId, source.id), getPendingTeacherReviews(learnerId),
  ]);
  const items = new Set(observationContent.map((item) => item.assessmentItemId));
  const practicalDemonstrated = evidence.some((item) => item.assessmentItemId !== undefined && items.has(item.assessmentItemId) && item.evaluatorType === "teacher" && item.outcome === "correct");
  const practicalReview = practicalDemonstrated ? "demonstrated" : pending.some((item) => items.has(item.assessmentItemId)) ? "pending" : "not_submitted";
  const masteryEstablished = progress.mastery.masteredCompetencies === 1;
  return { ...progress, journey: { masteryEstablished, practicalReview, complete: masteryEstablished && practicalDemonstrated } };
}
