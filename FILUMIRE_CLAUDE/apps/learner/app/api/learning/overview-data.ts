import {
  getCompetenciesForSubject,
  getCompetency,
} from "../../../../../packages/curriculum";
import {
  getAvailableSubjectsForGrade,
  getFrameworkGrade,
  getSupportedGradesForCurriculumVersion,
} from "../../../../../packages/curriculum-framework";
import {
  getAvailableSubjectsForContext,
  getOrCreateLearnerLearningContext,
} from "../../../../../services/learner-context";
import { getCompetencyProgressRows } from "../../../../../services/learner-progress";
import { buildRevisionSummaries, primaryRevision } from "../../../../../services/learner-path/revision";

type OverviewSubject = { id: string; name: string; code: string; discipline: string };

const toOverviewSubject = (subject: OverviewSubject): OverviewSubject => ({
  id: subject.id,
  name: subject.name,
  code: subject.code,
  discipline: subject.discipline,
});

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

  const revisions = await buildRevisionSummaries(
    learnerId,
    context,
    availableSubjects.map((subject) => subject.id),
  );

  return {
    gradeId: context.gradeId,
    gradeName: grade?.name ?? "",
    gradeSetByGuardian: context.gradeSetBy === "guardian",
    activeSubjectId: context.activeSubjectId,
    // Spaced revision for every subject of the stored grade that supports it;
    // the card leads with due work in the active subject.
    revision: primaryRevision(revisions, context.activeSubjectId),
    revisions,
    availableSubjects: availableSubjects.map(toOverviewSubject),
    // Subjects of every supported grade of the learner's curriculum,
    // so first-time setup can show the subjects of the class being
    // chosen before it is saved. Curriculum data only, no progress.
    gradeSubjects: Object.fromEntries(
      getSupportedGradesForCurriculumVersion(context.curriculumVersionId).map((supported) => [
        supported.id,
        getAvailableSubjectsForGrade(context.curriculumVersionId, supported.id).map(toOverviewSubject),
      ]),
    ),
    subjects,
    areasSubjectId,
    areas,
  };
}
