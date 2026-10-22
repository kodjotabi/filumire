import assert from 'node:assert/strict';
import fs from 'node:fs';
import { getJhsCompletionBatch } from '../services/content-store/jhs-completion-batches';
import { getCompetency, getAllCompetencies } from '../packages/curriculum';
import { getFrameworkCompetencyRegistration, getAvailableSubjectsForGrade } from '../packages/curriculum-framework';
import { JHS_PREVIEW_SOURCES } from '../services/content-store/jhs-representative-preview';
import { installCompletionBatch } from './fixtures/jhs-completion-batch';
const batch = getJhsCompletionBatch('batch03-b7-science-systems');
const pages = [53,54,55,56,57,58,60,61,62];
assert.equal(batch.sources.length, 9); assert.deepEqual(batch.sources.map(s=>s.source.pdfPages[0]), pages);
assert.equal(batch.content.length, 234); assert.equal(new Set(batch.content.map(c=>c.id)).size,234);
assert(!batch.sources.some(s=>JHS_PREVIEW_SOURCES.some(p=>p.id===s.id)));
const proof = JSON.parse(fs.readFileSync(`docs/jhs-development/completion/${batch.id}/source-review/results.json`,'utf8'));
for (const source of batch.sources) {
  assert.equal(getCompetency(source.id),undefined);
  assert.deepEqual(getAvailableSubjectsForGrade(source.curriculumVersionId,source.gradeId),[]);
  const pageProof = proof.find((p:any)=>p.competencyId===source.id);
  assert(pageProof?.printedCodeVerified); assert.equal(pageProof.sha256,source.source.sha256);
  assert.deepEqual(pageProof.pdfPages,source.source.pdfPages,'Continuation pages must be inspected too');
  assert.equal(pageProof.renderedPages.length,source.source.pdfPages.length);
  assert.equal(getFrameworkCompetencyRegistration(source.id)?.officialCode,source.officialCode);
  for (const language of ['en','fr'] as const) {
    const records=batch.content.filter(c=>c.competencyId===source.id&&c.language===language);
    assert.equal(records.length,13); assert.equal(records.filter(c=>c.metadata?.evaluationMethod==='trusted_rubric_evaluation').length,6);
    for (const record of records) {
      assert(record.body.trim().length>20,record.id); assert.equal(record.metadata?.curriculumNodeCode,source.officialCode);
      assert.equal(record.metadata?.educatorApproval,'pending'); assert.equal(record.metadata?.frenchApproval,'pending');
      if(record.type==='practice') assert.equal(record.metadata?.evidenceIndependence,'guided');
      if(record.metadata?.assessmentPurpose&&record.metadata.assessmentPurpose!=='retention') {
        assert.equal(record.assessmentStrategy,'constructed_response'); assert.equal(record.metadata.evaluationMethod,'trusted_rubric_evaluation');
        assert.equal(record.metadata.options,undefined); assert(JSON.parse(record.metadata.rubricCriteria).length>=2);
      }
      if(language==='fr') assert(batch.content.some(c=>c.id===record.translationOfContentId&&c.language==='en'&&c.competencyId===source.id));
    }
  }
}
const ecosystem=batch.sources.find(s=>s.source.pdfPages[0]===58)!;
assert.equal(ecosystem.officialCode,'B7.3.3.1. 1','Printed space is preserved');
assert.deepEqual(ecosystem.source.pdfPages,[58,59]);
const foodTests=batch.content.filter(c=>c.competencyId.endsWith('p055-r01')&&c.metadata?.evaluationMethod==='trusted_rubric_evaluation');
assert.equal(foodTests.length,12); assert(foodTests.every(c=>JSON.parse(c.metadata!.rubricCriteria).some((r:string)=>/observ/i.test(r))));
const solar=batch.content.filter(c=>c.competencyId.endsWith('p056-r01')&&c.metadata?.evaluationMethod==='trusted_rubric_evaluation');
assert(solar.every(c=>JSON.parse(c.metadata!.rubricCriteria).some((r:string)=>/model|modèle/i.test(r))));
const before=getAllCompetencies();
assert.throws(()=>installCompletionBatch(batch.id),/Isolated/);
Object.defineProperty(process.env,'NODE_ENV',{value:'test',writable:true,configurable:true,enumerable:true});
process.env.FILUMIRE_JHS_PREVIEW='test-only'; installCompletionBatch(batch.id);
assert.deepEqual(getAllCompetencies().filter(c=>before.some(b=>b.id===c.id)),before);
process.env.VERCEL='1'; assert.throws(()=>installCompletionBatch(batch.id),/Isolated/); delete process.env.VERCEL;
console.log('PASS nine source-backed systems indicators / 234 bilingual records, continuation pages, literal ecosystem code, practical/model review and hidden activation gates');
