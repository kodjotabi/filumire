import {
  getCompetenciesForSubject,
  getCompetency,
} from "../../../../../packages/curriculum";
import { getFrameworkGrade } from "../../../../../packages/curriculum-framework";
import {
  getAvailableSubjectsForContext,
  getOrCreateLearnerLearningContext,
} from "../../../../../services/learner-context";
import { getCompetencyProgressRows } from "../../../../../services/learner-progress";

type SubjectSummary = {
  total: number;
  tracked: number;
  completed: number;
  started: boolean;
};

/*
 * Learner overview for the subject screens. The learner's grade
 * comes from their stored learning context and the subjects
 * listed are exactly the framework's available subjects for that
 * grade; progress and topic areas are limited to those subjects.
 */
export async function buildLearningOverview(
  learnerId: string,
  areasSubjectId: string,
) {
  const context = await getOrCreateLearnerLearningContext(learnerId);
  const availableSubjects = getAvailableSubjectsForContext(context);
  const grade = getFrameworkGrade(context.gradeId);

  const { rows: latest } = await getCompetencyProgressRows(learnerId);

  const subjects: Record<string, SubjectSummary> = {};
  availableSubjects.forEach((subject) => {
    subjects[subject.id] = {
      total: getCompetenciesForSubject(subject.id).length,
      tracked: 0,
      completed: 0,
      started: false,
    };
  });

  latest.forEach((entry, competencyId) => {
    const subjectId = getCompetency(competencyId)?.subjectId;
    const row = subjectId ? subjects[subjectId] : undefined;
    if (!row) return;
    row.tracked += 1;
    if (entry.mastered) row.completed += 1;
    if (entry.evidenceCount > 0) row.started = true;
  });

  const areas = areasSubjectId && subjects[areasSubjectId]
    ? getCompetenciesForSubject(areasSubjectId).map((competency) => {
        const row = latest.get(competency.id);
        const status = row?.mastered
          ? "completed"
          : row && row.evidenceCount > 0
            ? "inprogress"
            : "new";
        return {
          id: competency.id,
          title: competency.title,
          description: competency.description,
          status,
        };
      })
    : [];

  return {
    gradeId: context.gradeId,
    gradeName: grade?.name ?? "",
    activeSubjectId: context.activeSubjectId,
    availableSubjects: availableSubjects.map((subject) => ({
      id: subject.id,
      name: subject.name,
      code: subject.code,
      discipline: subject.discipline,
    })),
    subjects,
    areasSubjectId,
    areas,
  };
}
