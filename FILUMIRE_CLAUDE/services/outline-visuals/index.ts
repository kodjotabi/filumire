// Server-side selection. The client imports only contracts and the renderer.
import { createHash } from "node:crypto";
import type { LearningContent } from "../../packages/content";
import { validOutlineVisual, type OutlineVisual, type VisualLanguage } from "../../packages/contracts/outline-visual";
import { getContent, getContentForCompetency } from "../content-store";
import { PILOT_REVIEWS, pilotVisuals, type PilotReview } from "./pilot";

export const INSTRUCTIONAL_VISUAL_TYPES = ["lesson", "example", "scaffold", "remediation"];
export function visualSourceDigest(items: readonly LearningContent[]): string {
  return createHash("sha256").update(JSON.stringify([...items].sort((a, b) => a.id.localeCompare(b.id)).map(i =>
    [i.id, i.competencyId, i.version, i.language, i.type, i.title, i.body, i.assessmentItemId ?? null, i.metadata ?? null]))).digest("hex");
}
export function currentVisualReview(competencyId: string): PilotReview | undefined {
  const review = PILOT_REVIEWS.find(r => r.competencyId === competencyId);
  return review && visualSourceDigest(getContentForCompetency(competencyId)) === review.digest ? review : undefined;
}
function resolveVisuals(content: LearningContent | undefined, language: VisualLanguage, stage: "Understand" | "Reflect"): OutlineVisual[] {
  if (!content || !["en", "fr"].includes(language)) return [];
  const source = getContent(content.id);
  if (!source || source.assessmentItemId || content.assessmentItemId || !INSTRUCTIONAL_VISUAL_TYPES.includes(source.type) ||
    source.language !== language || source.id !== content.id || source.competencyId !== content.competencyId || source.version !== content.version ||
    source.type !== content.type || source.language !== content.language || source.title !== content.title || source.body !== content.body) return [];
  const review = currentVisualReview(source.competencyId);
  if (!review) return [];
  // Construct the DTO from whitelisted authored fields; no source metadata or
  // assessment pool, answer, rubric, digest or solution variant is serialised.
  const visuals: OutlineVisual[] = pilotVisuals(review, source.type, language).map((copy, index) => ({
    id: `outline/${source.id}/${index}`, revision: 1,
    contentId: source.id, contentVersion: source.version, competencyId: source.competencyId,
    language, stage, title: copy.title, description: copy.description, model: copy.model,
  }));
  return visuals.every(validOutlineVisual) ? visuals : [];
}
/** Activity labels never relax scoring. Practice, diagnosis, reviews and unknown actions are denied in Phase 1. */
export function selectActivityVisuals(content: LearningContent | undefined, language: VisualLanguage, action: string): OutlineVisual[] {
  return ["teach", "remediate"].includes(action) ? resolveVisuals(content, language, "Understand") : [];
}
/** Internal closure adapter: call only AFTER receipt, completion and translation verification. */
export function selectVerifiedReflectionVisuals(content: LearningContent | undefined, language: VisualLanguage): OutlineVisual[] {
  return resolveVisuals(content, language, "Reflect");
}
