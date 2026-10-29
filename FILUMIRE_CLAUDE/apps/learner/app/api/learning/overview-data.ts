import {
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
import { getCompetencyProgressRows, summariseSubjects } from "../../../../../services/learner-progress";
import { classifyProgress } from "../../../../../services/learner-progress/reporting";
import { buildRevisionSummaries, primaryRevision } from "../../../../../services/learner-path/revision";
import { subjectTopics, type NavigationLanguage } from "../../../../../services/curriculum-navigation";

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
  understandingOnly: number;
  provisional: number;
  started: boolean;
};

/*
 * Learner overview for the subject screens. The learner's grade
 * comes from their stored learning context and the subjects
 * listed are exactly the framework's available subjects for that
 * grade; progress and topic areas are limited to those subjects.
 * Each topic area carries its place in the curriculum (strand and
 * sub-strand) and its learning-sequence position, in the requested
 * language, so learners can browse and choose topics (Phase 2).
 */
export async function buildLearningOverview(
  learnerId: string,
  areasSubjectId: string,
  language: NavigationLanguage = "en",
) {
  const context = await getOrCreateLearnerLearningContext(learnerId);
  const availableSubjects = getAvailableSubjectsForContext(context);
  const grade = getFrameworkGrade(context.gradeId);

  const { rows: latest } = await getCompetencyProgressRows(learnerId);

  const subjects: Record<string, SubjectSummary> = {};
  summariseSubjects(availableSubjects, latest).forEach((subject) => {
    subjects[subject.subjectId] = {
      total: subject.totalCompetencies,
      tracked: 0,
      completed: subject.masteredCompetencies,
      understandingOnly: subject.understandingMasteredCompetencies,
      provisional: subject.provisionalCompetencies,
      started: false,
    };
  });

  latest.forEach((entry, competencyId) => {
    const subjectId = getCompetency(competencyId)?.subjectId;
    const row = subjectId ? subjects[subjectId] : undefined;
    if (!row) return;
    row.tracked += 1;
    if (entry.evidenceCount > 0) row.started = true;
  });

  const areas = areasSubjectId && subjects[areasSubjectId]
    ? subjectTopics(areasSubjectId, language).map((topic) => {
        const row = latest.get(topic.id);
        const definition = getCompetency(topic.id);
        const progressStatus = classifyProgress(row, definition?.assessmentScope);
        const status: "completed" | "inprogress" | "new" = progressStatus === "mastered"
          ? "completed"
          : row && row.evidenceCount > 0
            ? "inprogress"
            : "new";
        return {
          id: topic.id,
          title: topic.title,
          // Competency descriptions are authored in English only; a French
          // overview shows none rather than an English sentence.
          description: language === "en" ? getCompetency(topic.id)?.description ?? "" : "",
          status,
          progressStatus,
          assessmentScope: definition?.assessmentScope ?? "full",
          sequence: topic.sequence,
          strand: topic.strand,
          subStrand: topic.subStrand,
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
