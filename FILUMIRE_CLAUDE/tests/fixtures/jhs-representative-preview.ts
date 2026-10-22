import { registerIsolatedJhsPreviewCompetency } from '../../packages/curriculum';
import { getCurriculumVersion, getFrameworkGrade, getSubjectCapability } from '../../packages/curriculum-framework';
import { JHS_PREVIEW_COMPETENCIES, JHS_PREVIEW_SOURCES, JHS_REPRESENTATIVE_CONTENT } from '../../services/content-store/jhs-representative-preview';
import { saveContent } from '../../services/content-store';
import { seedContent } from '../../services/content-store/seed';

export function installRepresentativePreview() {
  if (process.env.NODE_ENV !== 'test' || process.env.FILUMIRE_PERSISTENCE !== 'memory' || process.env.FILUMIRE_JHS_PREVIEW !== 'test-only' || process.env.VERCEL) throw new Error('Non-deployed isolated JHS preview only');
  seedContent();
  for (const definition of JHS_PREVIEW_COMPETENCIES) registerIsolatedJhsPreviewCompetency(definition);
  for (const s of JHS_PREVIEW_SOURCES) {
    getCurriculumVersion(s.curriculumVersionId)!.isActive = true;
    const grade = getFrameworkGrade(s.gradeId)!;
    grade.learnerVisibility = 'visible'; delete grade.supportStatus;
    getSubjectCapability(s.subjectId)!.status = 'partial';
  }
  for (const item of JHS_REPRESENTATIVE_CONTENT) saveContent(item);
}
