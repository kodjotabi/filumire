import assert from 'node:assert/strict';
import { getAllCompetencies, getCompetency, registerIsolatedJhsPreviewCompetency, getStrand, getSubStrand, getContentStandard, getLearningIndicator } from '../packages/curriculum';
import { getAvailableSubjectsForGrade } from '../packages/curriculum-framework';
import { JHS_PREVIEW_COMPETENCIES, JHS_PREVIEW_SOURCES, JHS_REPRESENTATIVE_CONTENT } from '../services/content-store/jhs-representative-preview';
import { MATERIALS_COMPETENCIES } from '../services/content-store/ghana-b7-science-materials-batch';
import { installRepresentativePreview } from './fixtures/jhs-representative-preview';

const before = getAllCompetencies();
assert.equal(JHS_PREVIEW_COMPETENCIES.length, 14);
assert.equal(new Set(JHS_PREVIEW_SOURCES.map(s => `${s.gradeId}:${s.subjectId}`)).size, 12);
assert.equal(new Set(JHS_REPRESENTATIVE_CONTENT.map(c => c.id)).size, 364);
assert.equal(JHS_REPRESENTATIVE_CONTENT.length, 364);
assert.throws(() => registerIsolatedJhsPreviewCompetency(JHS_PREVIEW_COMPETENCIES[0]), /isolated/);
for (const s of JHS_PREVIEW_SOURCES) {
  assert.equal(getCompetency(s.id), undefined);
  assert.deepEqual(getAvailableSubjectsForGrade(s.curriculumVersionId, s.gradeId), []);
  for (const language of ['en', 'fr'] as const) {
    const records = JHS_REPRESENTATIVE_CONTENT.filter(c => c.competencyId === s.id && c.language === language);
    assert.equal(records.length, 13);
    for (const record of records) {
      assert(record.body.trim().length > 20);
      assert.equal(record.metadata?.educatorApproval, 'pending'); assert.equal(record.metadata?.frenchApproval, 'pending');
      assert.equal(record.metadata?.sourceDocumentSha256, s.source.sha256);
      if (record.type === 'practice') assert.equal(record.metadata?.evidenceIndependence, 'guided');
      if (record.metadata?.assessmentPurpose && record.metadata.assessmentPurpose !== 'retention') {
        assert.equal(record.metadata.evaluationMethod, 'trusted_rubric_evaluation');
        assert.equal(record.assessmentStrategy, 'constructed_response');
        assert.equal(record.metadata.options, undefined, 'Independent performance is not certified by selecting an option');
        assert(JSON.parse(record.metadata.rubricCriteria).length >= 3);
      }
      if (language === 'fr') assert(JHS_REPRESENTATIVE_CONTENT.some(c => c.id === record.translationOfContentId && c.language === 'en' && c.competencyId === s.id));
    }
  }
}
Object.defineProperty(process.env, 'NODE_ENV', { value: 'test', writable: true, configurable: true, enumerable: true });
process.env.FILUMIRE_JHS_PREVIEW = 'test-only';
installRepresentativePreview();
for (const c of JHS_PREVIEW_COMPETENCIES) {
  assert.equal(getStrand(c.strandId)?.subjectId, c.subjectId);
  assert.equal(getSubStrand(c.subStrandId)?.strandId, c.strandId);
  assert.equal(getContentStandard(c.contentStandardId)?.subStrandId, c.subStrandId);
  assert.equal(getLearningIndicator(c.learningIndicatorId)?.contentStandardId, c.contentStandardId);
  assert.throws(() => registerIsolatedJhsPreviewCompetency(c), /duplicate/);
}
assert.deepEqual(getAllCompetencies().filter(c => before.some(b => b.id === c.id)), before, 'Every primary definition remains byte-equivalent');
for (const original of MATERIALS_COMPETENCIES) {
  const current = getCompetency(original.id)!;
  for (const key of ['masteryRequirements', 'retentionRequirements', 'transferRequirements', 'subskills', 'misconceptions'] as const) assert.deepEqual(current[key], original[key]);
}
process.env.VERCEL = '1';
assert.throws(() => registerIsolatedJhsPreviewCompetency(JHS_PREVIEW_COMPETENCIES[0]), /isolated/);
delete process.env.VERCEL;
console.log('PASS 14 indicators / 12 combinations / 364 bilingual records, guided evidence, teacher-only performance, source hierarchy, negative preview gates and unchanged primary policies');
