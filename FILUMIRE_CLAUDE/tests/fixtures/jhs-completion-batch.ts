import { registerIsolatedJhsPreviewCompetency } from '../../packages/curriculum';
import { getCurriculumVersion, getFrameworkGrade, getSubjectCapability } from '../../packages/curriculum-framework';
import { getJhsCompletionBatch } from '../../services/content-store/jhs-completion-batches';
import { seedContent } from '../../services/content-store/seed';
import { saveContent } from '../../services/content-store';

export function installCompletionBatch(id: string) {
  if (process.env.NODE_ENV !== 'test' || process.env.FILUMIRE_PERSISTENCE !== 'memory' || process.env.FILUMIRE_JHS_PREVIEW !== 'test-only' || process.env.VERCEL) throw new Error('Isolated JHS batch test only');
  const batch = getJhsCompletionBatch(id);
  seedContent();
  for (const c of batch.competencies) registerIsolatedJhsPreviewCompetency(c);
  for (const s of batch.sources) {
    getCurriculumVersion(s.curriculumVersionId)!.isActive = true;
    const grade = getFrameworkGrade(s.gradeId)!; grade.learnerVisibility = 'visible'; delete grade.supportStatus;
    getSubjectCapability(s.subjectId)!.status = 'partial';
  }
  for (const item of batch.content) saveContent(item);
}
