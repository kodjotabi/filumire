import fs from 'node:fs';
import assert from 'node:assert/strict';
const root='docs/jhs-development/completion/';
const rows=JSON.parse(fs.readFileSync(root+'competency-matrix.json','utf8')).rows;
assert.equal(rows.length,625);
const order=['preserved-preview',...new Set(rows.map(r=>r.batch).filter(id=>id&&id!=='preserved-preview'))].sort((a,b)=>a==='preserved-preview'?-1:b==='preserved-preview'?1:a.localeCompare(b));
const completed=new Set(),stages=[];
for(const id of order){
  const batch=rows.filter(r=>r.batch===id);assert(batch.length&&batch.every(r=>r.technicallyValidated),`Unvalidated history stage ${id}`);
  batch.forEach(r=>completed.add(r.competencyId));
  const summary=[7,8,9].flatMap(grade=>['English Language','Mathematics','Science','Computing'].map(subject=>{
    const group=rows.filter(r=>r.grade===grade&&r.subject===subject);
    return {grade,subject,mapped:group.length,technicallyValidated:group.filter(r=>completed.has(r.competencyId)).length,remaining:group.filter(r=>!completed.has(r.competencyId)).length};
  }));
  const stage={batch:id,added:batch.length,validatedTotal:completed.size,remaining:625-completed.size,releaseApproved:0,addedCompetencyIds:batch.map(r=>r.competencyId),summary,
    states:rows.map(r=>({competencyId:r.competencyId,authoredDraft:completed.has(r.competencyId),technicallyValidated:completed.has(r.competencyId),releaseApproved:false}))};
  stages.push(stage);
}
fs.writeFileSync(root+'coverage-history.json',JSON.stringify({policy:'Reconstruction by validated batch sequence using current exact content fingerprints; not retroactively timestamped historical execution or educational approval. Full source traceability is in competency-matrix.json.',stages},null,2)+'\n');
console.log(stages.map(s=>`${s.batch}: +${s.added}, ${s.validatedTotal}/625 technically validated, ${s.remaining} remaining`).join('\n'));
