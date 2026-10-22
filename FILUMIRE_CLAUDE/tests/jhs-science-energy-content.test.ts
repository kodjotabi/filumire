import assert from 'node:assert/strict';
import fs from 'node:fs';
import {getJhsCompletionBatch} from '../services/content-store/jhs-completion-batches';
import {getCompetency,getAllCompetencies} from '../packages/curriculum';
import {getAvailableSubjectsForGrade} from '../packages/curriculum-framework';
import {installCompletionBatch} from './fixtures/jhs-completion-batch';
const batch=getJhsCompletionBatch('batch04-b7-science-energy');
assert.equal(batch.sources.length,6);assert.equal(batch.content.length,156);assert.equal(new Set(batch.content.map(c=>c.id)).size,156);
assert.deepEqual(batch.sources.map(s=>s.source.pdfPages[0]),[63,64,65,66,67,67]);
const proof=JSON.parse(fs.readFileSync(`docs/jhs-development/completion/${batch.id}/source-review/results.json`,'utf8'));
for(const source of batch.sources){
  assert.equal(getCompetency(source.id),undefined);assert.deepEqual(getAvailableSubjectsForGrade(source.curriculumVersionId,source.gradeId),[]);
  const p=proof.find((r:any)=>r.competencyId===source.id);assert(p?.printedCodeVerified);assert.equal(p.sha256,source.source.sha256);assert.deepEqual(p.pdfPages,source.source.pdfPages);
  for(const language of ['en','fr'] as const){
    const records=batch.content.filter(c=>c.competencyId===source.id&&c.language===language);assert.equal(records.length,13);
    assert.equal(records.filter(c=>c.metadata?.evaluationMethod==='trusted_rubric_evaluation').length,6);
    for(const record of records){
      assert(record.body.trim().length>20,record.id);assert.equal(record.metadata?.curriculumNodeCode,source.officialCode);
      assert.equal(record.metadata?.educatorApproval,'pending');assert.equal(record.metadata?.frenchApproval,'pending');
      if(record.type==='practice')assert.equal(record.metadata?.evidenceIndependence,'guided');
      if(record.metadata?.assessmentPurpose&&record.metadata.assessmentPurpose!=='retention'){
        assert.equal(record.assessmentStrategy,'constructed_response');assert.equal(record.metadata.evaluationMethod,'trusted_rubric_evaluation');assert.equal(record.metadata.options,undefined);
      }
      if(language==='fr')assert(batch.content.some(c=>c.id===record.translationOfContentId&&c.language==='en'&&c.competencyId===source.id));
    }
  }
}
const maths=batch.content.find(c=>c.competencyId.endsWith('p064-r01')&&c.type==='example'&&c.language==='en')!;
assert(maths.body.includes('40 J')&&maths.body.includes('9 J')&&maths.body.includes('49 J')&&maths.body.includes('36 J'),'Worked example must retain correct mgh, half mv-squared and doubled-speed values');
const optics=batch.content.filter(c=>c.competencyId.endsWith('p066-r01')&&c.metadata?.evaluationMethod==='trusted_rubric_evaluation');
assert.equal(optics.length,12);assert(optics.every(c=>JSON.parse(c.metadata!.rubricCriteria).some((r:string)=>/dispersion/i.test(r))),'Heading-only coverage must not omit the dispersion exemplar');
for(const page of [63,65,66]){
 const records=batch.content.filter(c=>c.competencyId.includes(`p0${page}-`)&&c.metadata?.evaluationMethod==='trusted_rubric_evaluation');
 assert(records.every(c=>JSON.parse(c.metadata!.rubricCriteria).some((r:string)=>/observ/i.test(r))),'Practical performance needs actual observation');
}
const before=getAllCompetencies();assert.throws(()=>installCompletionBatch(batch.id),/Isolated/);
Object.defineProperty(process.env,'NODE_ENV',{value:'test',writable:true,configurable:true,enumerable:true});process.env.FILUMIRE_JHS_PREVIEW='test-only';installCompletionBatch(batch.id);
assert.deepEqual(getAllCompetencies().filter(c=>before.some(b=>b.id===c.id)),before);
process.env.VERCEL='1';assert.throws(()=>installCompletionBatch(batch.id),/Isolated/);delete process.env.VERCEL;
console.log('PASS six source-backed energy indicators / 156 bilingual records, complete optical exemplar scope, correct energy arithmetic, teacher-only practical credit and hidden gates');
