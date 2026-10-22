import { seedContent } from '../content-store/seed';
import { getPrincipalLearnerAccess } from '../principal';
import { getAvailableSubjectsForGrade, getSupportedGradesForCurriculumVersion, getInitialCompetencyIdForResolvedContext, resolveCurriculumContext } from '../../packages/curriculum-framework';
import { getCompetenciesForSubject } from '../../packages/curriculum';
import { getCompetency } from '../../packages/curriculum';
import { getLearnerLearningContext, saveLearnerLearningContext, LearnerContextValidationError } from './index';

export interface CurriculumPlacement {
  curriculumVersionId: string;
  gradeId: string;
  subjectId: string;
}

export async function getLearnerPlacementOptions(principalId: string, learnerId: string) {
  const access = await getPrincipalLearnerAccess(principalId, learnerId, 'guardian');
  if (access?.status !== 'active') throw new LearnerContextValidationError('An active guardian relationship is required for curriculum placement.');
  seedContent();
  const choices = ['curriculum-version-gh-pilot-v1', 'curriculum-version-gh-nacca-ccp-2020'].flatMap(curriculumVersionId =>
    getSupportedGradesForCurriculumVersion(curriculumVersionId).map(grade => ({
      curriculumVersionId, gradeId: grade.id, name: grade.name,
      draft: grade.id.endsWith('-ccp'),
      subjects: getAvailableSubjectsForGrade(curriculumVersionId, grade.id).map(subject => ({
        id: subject.id, name: subject.name,
        availableTopics: getCompetenciesForSubject(subject.id).length,
      })),
    })));
  return { choices, current: await getLearnerLearningContext(learnerId) };
}

/** An authenticated guardian chooses a supported context. No evidence/state is migrated.
 * Inactive CCP versions and unsupported subjects fail before any persistence write.
 * Existing primary placement remains available as the return path.
 */
export async function placeLearnerInCurriculum(principalId: string, learnerId: string, target: CurriculumPlacement) {
  const access = await getPrincipalLearnerAccess(principalId, learnerId, 'guardian');
  if (access?.status !== 'active') throw new LearnerContextValidationError('An active guardian relationship is required for curriculum placement.');
  seedContent();
  const resolved = resolveCurriculumContext(target.curriculumVersionId, target.gradeId, target.subjectId);
  if (!resolved || !getAvailableSubjectsForGrade(target.curriculumVersionId, target.gradeId).some(s => s.id === target.subjectId)) {
    throw new LearnerContextValidationError('This curriculum, class and subject are not available for learner placement.');
  }
  const initialId = getInitialCompetencyIdForResolvedContext(resolved);
  const initial = initialId ? getCompetency(initialId) : undefined;
  if (!initial || initial.learningLevelId !== target.gradeId || initial.subjectId !== target.subjectId || initial.curriculumFrameworkId !== (resolved.curriculumVersion.runtimeFrameworkId ?? resolved.curriculum.id)) {
    throw new LearnerContextValidationError('The target has no compatible learning journey.');
  }
  const previous = await getLearnerLearningContext(learnerId);
  const previousDefinition = previous?.activeCompetencyId ? getCompetency(previous.activeCompetencyId) : undefined;
  const retainFocus = previous?.curriculumVersionId === target.curriculumVersionId && previous.gradeId === target.gradeId && previous.activeSubjectId === target.subjectId && previousDefinition?.subjectId === target.subjectId && previousDefinition.learningLevelId === target.gradeId && previousDefinition.curriculumFrameworkId === initial.curriculumFrameworkId;
  const next = { learnerId, curriculumVersionId: target.curriculumVersionId, gradeId: target.gradeId,
    activeSubjectId: target.subjectId, activeCompetencyId: retainFocus ? previous.activeCompetencyId : initial.id,
    gradeSetBy: 'guardian' as const, updatedAt: new Date().toISOString() };
  await saveLearnerLearningContext(next);
  return next;
}
