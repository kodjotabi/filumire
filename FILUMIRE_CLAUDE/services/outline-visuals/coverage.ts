import { getCompetenciesForSubject } from "../../packages/curriculum";
import { getAvailableSubjectsForGrade, getDefaultLearnerLearningContext, getSupportedGradesForCurriculumVersion } from "../../packages/curriculum-framework";
import { VISUAL_STAGES, type CoverageStatus, type VisualLanguage, type VisualStage } from "../../packages/contracts/outline-visual";
import { getContentForCompetency } from "../content-store";
import { currentVisualReview, INSTRUCTIONAL_VISUAL_TYPES, selectActivityVisuals, selectVerifiedReflectionVisuals } from ".";
import { PILOT_REVIEWS } from "./pilot";
export interface CoverageCell { status: CoverageStatus; reason: string; contentCount: number }
export interface TopicVisualCoverage {
  curriculumVersionId: string; gradeId: string; subjectId: string; competencyId: string;
  status: CoverageStatus;
  languages: Record<VisualLanguage, Record<VisualStage, CoverageCell>>;
}
export function aggregateVisualCoverage(statuses: readonly CoverageStatus[]): CoverageStatus {
  if (!statuses.length || statuses.every(s => s === "Unreviewed")) return "Unreviewed";
  if (statuses.some(s => s === "Required" || s === "Unreviewed")) return "Required";
  return statuses.every(s => s === "Text-first") ? "Text-first" : "Complete";
}
/** No learner data or database access. Uses the registered curriculum adapter, not grade/subject names. */
export function buildVisualCoverage(curriculumVersionId = getDefaultLearnerLearningContext().curriculumVersionId): TopicVisualCoverage[] {
  return getSupportedGradesForCurriculumVersion(curriculumVersionId).flatMap(grade =>
    getAvailableSubjectsForGrade(curriculumVersionId, grade.id).flatMap(subject =>
      getCompetenciesForSubject(subject.id).map(competency => {
        const declared = PILOT_REVIEWS.some(r => r.competencyId === competency.id);
        const reviewed = currentVisualReview(competency.id);
        const languages = Object.fromEntries((["en", "fr"] as const).map(language => {
          const content = getContentForCompetency(competency.id, language);
          const teaching = content.filter(i => !i.assessmentItemId && INSTRUCTIONAL_VISUAL_TYPES.includes(i.type));
          return [language, Object.fromEntries(VISUAL_STAGES.map(stage => {
            let cell: CoverageCell = { status: "Unreviewed", reason: "No visual requirements review has been completed.", contentCount: content.length };
            if (declared && !reviewed) cell = { ...cell, status: "Required", reason: "Source changed or is missing; the visual review must be renewed." };
            else if (reviewed && (stage === "Understand" || stage === "Reflect")) {
              const complete = teaching.some(i => i.type === "lesson") && teaching.every(i => (stage === "Reflect"
                ? selectVerifiedReflectionVisuals(i, language) : selectActivityVisuals(i, language, "teach")).length > 0);
              cell = { status: complete ? "Complete" : "Required", contentCount: teaching.length,
                reason: complete ? "All current instructional content in this language has reviewed outline bindings." : "Instructional content or a valid outline binding is missing." };
            } else if (reviewed) cell = { status: "Text-first", contentCount: content.filter(i => i.assessmentItemId).length,
              reason: "Reviewed questions supply their givens in text. Teaching diagrams could cue the assessed response; the original scored tasks are preserved." };
            return [stage, cell];
          }))];
        })) as TopicVisualCoverage["languages"];
        return { curriculumVersionId, gradeId: grade.id, subjectId: subject.id, competencyId: competency.id, languages,
          status: aggregateVisualCoverage(Object.values(languages).flatMap(cells => Object.values(cells).map(c => c.status))) };
      })));
}
