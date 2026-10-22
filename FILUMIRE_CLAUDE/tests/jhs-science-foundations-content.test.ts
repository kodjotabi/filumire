import assert from 'node:assert/strict';
import fs from 'node:fs';
import { getJhsCompletionBatch } from '../services/content-store/jhs-completion-batches';
import { CCP_SOURCE_REGISTRATIONS, getCcpBlockingSourceIssueIds } from '../packages/curriculum/ghana-ccp-runtime';
import { getAllCompetencies, getCompetency, registerIsolatedJhsPreviewCompetency } from '../packages/curriculum';
import { getFrameworkCompetencyRegistration, getAvailableSubjectsForGrade } from '../packages/curriculum-framework';
import { installCompletionBatch } from './fixtures/jhs-completion-batch';
const batch = getJhsCompletionBatch('batch02-b7-science-foundations');
const before = getAllCompetencies();
assert.equal(batch.sources.length, 13); assert.equal(batch.content.length, 338);
assert.equal(new Set(batch.content.map(c => c.id)).size, 338);
const proof = JSON.parse(fs.readFileSync(`docs/jhs-development/completion/${batch.id}/source-review/results.json`, 'utf8'));
assert.equal(proof.length, 13);
assert.deepEqual(getCcpBlockingSourceIssueIds(['RES-SCI-CELLS']), []);
assert.deepEqual(getCcpBlockingSourceIssueIds(['nonexistent-source-issue']), ['nonexistent-source-issue']);
for (const source of batch.sources) {
  assert.equal(getCompetency(source.id), undefined);
  assert.deepEqual(getAvailableSubjectsForGrade(source.curriculumVersionId, source.gradeId), []);
  assert(proof.some((p: any) => p.competencyId === source.id && p.sha256 === source.source.sha256 && p.printedCodeVerified));
  for (const language of ['en', 'fr'] as const) {
    const records = batch.content.filter(c => c.competencyId === source.id && c.language === language);
    assert.equal(records.length, 13);
    assert.equal(records.filter(c => c.metadata?.evaluationMethod === 'trusted_rubric_evaluation').length, 6);
    for (const record of records) {
      assert(record.body.trim().length > 20, record.id);
      assert.equal(record.metadata?.educatorApproval, 'pending'); assert.equal(record.metadata?.frenchApproval, 'pending');
      assert.equal(record.metadata?.curriculumNodeCode, source.officialCode);
      assert.equal(record.metadata?.sourceDocumentSha256, source.source.sha256);
      assert.deepEqual(JSON.parse(record.metadata!.sourceIssueIds), [...source.sourceIssueIds, ...source.globalSourceIssueIds]);
      if (record.type === 'practice') assert.equal(record.metadata?.evidenceIndependence, 'guided');
      if (record.metadata?.assessmentPurpose && record.metadata.assessmentPurpose !== 'retention') {
        assert.equal(record.assessmentStrategy, 'constructed_response'); assert.equal(record.metadata.evaluationMethod, 'trusted_rubric_evaluation');
        assert.equal(record.metadata.options, undefined); assert(JSON.parse(record.metadata.rubricCriteria).length >= 3);
      }
      if (language === 'fr') assert(batch.content.some(c => c.id === record.translationOfContentId && c.competencyId === record.competencyId && c.language === 'en'));
    }
  }
}
assert.throws(() => installCompletionBatch(batch.id), /Isolated/);
Object.defineProperty(process.env, 'NODE_ENV', {value:'test',writable:true,configurable:true,enumerable:true});
process.env.FILUMIRE_JHS_PREVIEW = 'test-only';
const unresolved = CCP_SOURCE_REGISTRATIONS.find(s => getCcpBlockingSourceIssueIds(s.sourceIssueIds).length)!;
assert(unresolved, 'An unresolved source fixture must exist');
assert.throws(() => registerIsolatedJhsPreviewCompetency({ ...batch.competencies[0], id: unresolved.id,
  subjectId: unresolved.subjectId, learningLevelId: unresolved.gradeId, learningIndicatorId: unresolved.curriculumNodeId,
  strandId: unresolved.hierarchy.strandId, subStrandId: unresolved.hierarchy.subStrandId, contentStandardId: unresolved.hierarchy.contentStandardId }), /Invalid/);
installCompletionBatch(batch.id);
assert.deepEqual(getAllCompetencies().filter(c => before.some(b => b.id === c.id)), before);
for (const page of [42, 43]) {
  const cell = batch.sources.find(s => s.source.pdfPages[0] === page)!;
  assert(cell.sourceIssueIds.includes('RES-SCI-CELLS'));
  assert(getCompetency(cell.id)); assert(getFrameworkCompetencyRegistration(cell.id)?.sourceIssueIds.includes('RES-SCI-CELLS'));
}
const practical = batch.content.filter(c => c.competencyId.endsWith('p048-r02') && c.metadata?.evaluationMethod === 'trusted_rubric_evaluation');
assert.equal(practical.length, 12);
assert(practical.every(c => JSON.parse(c.metadata!.rubricCriteria).some((s: string) => /observ/i.test(s))), 'Actual practical observation must remain in every rubric');
process.env.VERCEL = '1'; assert.throws(() => installCompletionBatch(batch.id), /Isolated/); delete process.env.VERCEL;
console.log('PASS 13 source-backed indicators, 338 bilingual records, resolved flag preservation, unresolved/unknown rejection, teacher-only practical evidence and unchanged existing competencies');
