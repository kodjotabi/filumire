import type { LearningContent } from "../../packages/content";

/*
 * Basic 7-9 Step 0 (24 Oct 2026). A content record's evidence role
 * decides whether the adaptive engine may choose it:
 * - none: an ordinary item on the learner's adaptive path;
 * - "optional_teacher_extension": teacher-reviewed work kept so a
 *   teacher can still mark it (and old submissions stay reviewable),
 *   never needed for progression;
 * - "retired": an earlier automatic item, kept only so historical
 *   evidence and offline answers still resolve to their content.
 * Records with a role stay readable by id; they are only never
 * selected for a learner.
 */
export const OPTIONAL_TEACHER_EXTENSION = "optional_teacher_extension";
export const RETIRED_ITEM = "retired";

export function isOnAdaptivePath(content: LearningContent): boolean {
  return !content.metadata?.evidenceRole;
}
