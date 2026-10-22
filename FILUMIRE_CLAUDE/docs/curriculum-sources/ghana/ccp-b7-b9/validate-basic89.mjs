// Read-only by default. --fresh checks fresh positioned extraction from pinned PDFs.
// --record writes only phase8d-validation.json. --self-test runs in-memory mutation checks.
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {join} from 'node:path';
import {here,sourceRoot,sourceBase,manifest,load,save,sha,norm,lines,inputState,extractPositioned} from './phase8d-source.mjs';
const inventories=[8,9].map(g=>load(`basic${g}-curriculum-inventory.json`)),mappings=[8,9].map(g=>load(`basic${g}-filumire-mapping.json`));
const expected={8:{english:49,mathematics:58,computing:39,science:46},9:{english:51,mathematics:52,computing:37,science:58}};
const source=process.argv.includes('--fresh')?await extractPositioned():load('phase8d-review/positioned-text.json');
const cached=load('phase8d-review/positioned-text.json'),review=load('phase8d-reviewed-anchors.json'),issues=load('basic89-source-issues.json');
const checks={};let checkCount=0;
function check(ok,message,category='integrity'){assert.ok(ok,message);checkCount++;checks[category]=(checks[category]||0)+1;}
function same(a,b,message,category='integrity'){check(JSON.stringify(a)===JSON.stringify(b),message,category);}
function csvParse(text){const rows=[];let row=[],cell='',q=false;for(let i=0;i<text.length;i++){const c=text[i];if(c==='"'){if(q&&text[i+1]==='"'){cell+='"';i++;}else q=!q;}else if(!q&&(c===','||c==='\n')){row.push(cell);cell='';if(c==='\n'){rows.push(row);row=[];}}else if(c!=='\r'||q)cell+=c;}assert.ok(!q,'CSV quoted fields closed');if(cell||row.length){row.push(cell);rows.push(row);}const[h,...rr]=rows;assert.ok(rr.every(r=>r.length===h.length),'CSV field counts');return rr.map(r=>Object.fromEntries(h.map((v,i)=>[v,r[i]])));}
const allRows=mappings.flatMap(m=>m.subjects.flatMap(s=>s.entries));
function assertUnique(rows){assert.equal(rows.length,390,'Complete 390-entry collection');assert.equal(new Set(rows.map(r=>r.proposed_competency_id)).size,390,'Unique proposed competency IDs');}
function assertRow(r,inv,s,doc,grade){
 assert.equal(r.entry_id,inv.entry_id);assert.equal(r.proposed_competency_title,inv.indicator_statement);
 assert.equal(r.source.original_printed_code,inv.source_code_raw);assert.equal(r.source.whitespace_collapsed_code,inv.official_code);
 assert.equal(r.source.sha256,doc.sha256);assert.equal(r.source.path,doc.local_path);assert.equal(r.source.url,doc.source_url);assert.equal(r.source.pdf_page,inv.pdf_page);assert.equal(r.source.printed_page,inv.printed_page);
 assert.deepEqual(r.source.continuation_pdf_pages,inv.source_pages);
 const key=inv.content_standard_code_as_printed.replace(/^B\.([89])/,'B$1').replace(/^B82\./,'B8.2.');
 assert.equal(r.hierarchy.content_standard.structural_key,key);assert.equal(r.hierarchy.sub_strand.structural_key,key.split('.').slice(0,3).join('.'));assert.equal(r.hierarchy.strand.structural_key,key.split('.').slice(0,2).join('.'));
 assert.ok(key.startsWith(`B${grade}.`));assert.equal(r.hierarchy.content_standard.original_printed_code,inv.displayed_content_standard.source_code_raw);assert.equal(r.hierarchy.content_standard.displayed_statement_raw,inv.displayed_content_standard.statement_raw);
 assert.equal(r.source_supported_activity_text,inv.source_cell_text);
 assert.ok(r.assessment_requirements.length);for(const a of r.assessment_requirements)assert.ok(inv.source_regions.some(region=>region.pdf_page===a.pdf_page&&region.text.includes(a.source_excerpt)),'Every assessment classification is backed by an exact excerpt on its cited page');
 assert.equal(r.numbering.official_code_replaced,false);assert.equal(r.numbering.filumire_indicator_alias,null);assert.equal(r.runtime_registered,false);assert.equal(r.publication_status,'not_published');for(const k of['lesson_content','assessment_items','prerequisites','difficulty','mastery_thresholds'])assert.equal(r[k],null);
}
const baseline=load('phase8d-input-lock.json'),current=inputState();
for(const f of baseline.files){const now=current.files.find(x=>x.path===f.path);check(now?.sha256===f.sha256,`${f.path}: original Phase 8A/8B/PDF unchanged`,'preservation');}
for(const f of baseline.protected_application_files){const now=current.protected_application_files.find(x=>x.path===f.path);check(now?.sha256===f.sha256,`${f.path}: existing application work unchanged`,'preservation');}
assertUnique(allRows);check(true,'390 unique entries','uniqueness');
const b7=load('basic7-filumire-mapping.json',sourceBase),prior=b7.subjects.flatMap(s=>s.entries);
check(prior.length===235,'Carry forward exactly 235 unchanged Basic 7 mappings','coverage');
check(new Set([...prior,...allRows].map(r=>r.proposed_competency_id)).size===625,'625 unique proposed identities across Basic 7-9','uniqueness');
for(const doc of manifest.documents){
 const bytes=readFileSync(join(sourceRoot,doc.local_path)),d=source.documents.find(d=>d.id===doc.id);
 check(sha(bytes)===doc.sha256&&bytes.length===doc.bytes,`${doc.id}: actual PDF checksum and length`,'source_traceability');
 check(d.pages.length===doc.pdf_page_count,`${doc.id}: actual PDF page count`,'source_traceability');
 same(d,cached.documents.find(c=>c.id===doc.id),`${doc.id}: fresh PDF data equals saved positioned source`,'source_traceability');
 for(const grade of[8,9]){
  const s=inventories[grade-8].subjects.find(s=>s.id===doc.id),m=mappings[grade-8].subjects.find(s=>s.id===doc.id),[first,last]=s.pdf_pages;
  check(s.indicators.length===expected[grade][doc.id]&&m.entries.length===s.indicators.length,`${grade}/${doc.id}: reviewed counts`,'coverage');
  check(d.pages[first-2].items.some(i=>i.s.trim()===`BASIC ${grade}`),`${grade}/${doc.id}: actual preceding grade divider`,'coverage');
  if(grade===8)check(d.pages[last].items.some(i=>i.s.trim()==='BASIC 9'),`${doc.id}: Basic 9 boundary excluded`,'coverage');
  else check(d.pages[last].items.some(i=>/APPENDI|WRITERS|GLOSSARY/.test(i.s)),`${doc.id}: Basic 9 stops before appendix/writers/glossary`,'coverage');
  const independentCandidates=d.pages.slice(first-1,last).flatMap(p=>p.items.filter(i=>i.y>45&&i.x>=180&&i.x<605&&/^(?:B\s*\.?\s*\d|[89](?:\s*\.\s*\d+){3,})/.test(i.s.trim())).map(i=>({pdf_page:p.pdf_page,x:i.x,y:i.y,raw_item_text:i.s})));
  const excluded=review.excluded_inline_references.filter(r=>r.subject===doc.id&&r.grade===grade),independentRows=independentCandidates.filter(a=>!excluded.some(e=>e.pdf_page===a.pdf_page&&e.x===a.x&&e.y===a.y));
  check(independentRows.length===s.indicators.length,`${grade}/${doc.id}: independent broad source-candidate enumeration`,'coverage');
  for(const e of excluded)check(independentCandidates.some(a=>a.pdf_page===e.pdf_page&&a.x===e.x&&a.y===e.y&&a.raw_item_text===e.raw_item_text),`${doc.id}: reviewed inline-reference exclusion is still present`,'coverage');
  const matrix=csvParse(readFileSync(join(here,`basic${grade}-curriculum-inventory.csv`),'utf8')).filter(r=>r.subject===s.subject),mappingCsv=csvParse(readFileSync(join(here,`basic${grade}-filumire-mapping.csv`),'utf8')).filter(r=>r.subject===s.subject);
  check(matrix.length===s.indicators.length&&mappingCsv.length===m.entries.length,`${grade}/${doc.id}: CSV coverage`,'coverage');
  check(mappings[grade-8].inventory_sha256===sha(readFileSync(join(here,`basic${grade}-curriculum-inventory.json`))),`${grade}: mapping pins exact inventory bytes`,'source_traceability');
  for(const page of s.page_coverage){
   const actual=d.pages[page.pdf_page-1];check(actual.items.some(i=>i.y<50&&i.s.trim()===page.printed_page),`${doc.id}:${page.pdf_page}: actual printed label`,'source_traceability');
   check(page.assigned_fragments===page.indicator_column_fragments&&page.unassigned_fragments.length===0,`${doc.id}:${page.pdf_page}: all indicator-column text accounted for`,'coverage');
  }
  for(const r of s.indicators){
   const page=d.pages[r.pdf_page-1],a=r.code_anchor,entry=m.entries.find(e=>e.entry_id===r.entry_id),rv=review.entries.find(e=>e.grade===grade&&e.entry_id===r.entry_id),csv=matrix.find(e=>e.entry_id===r.entry_id),mcsv=mappingCsv.find(e=>e.entry_id===r.entry_id);
   check(Boolean(entry&&rv&&csv&&mcsv),`${r.entry_id}: complete inventory/mapping/review/CSV linkage`,'coverage');
   check(independentRows.some(i=>i.pdf_page===r.pdf_page&&i.x===a.x&&i.y===a.y),`${r.entry_id}: independently enumerated source anchor`,'coverage');
   check(page.items.some(i=>i.s===a.raw_item_text&&i.x===a.x&&i.y===a.y),`${r.entry_id}: original source anchor exists`,'source_traceability');
   const codeLine=lines(page.items.filter(i=>Math.abs(i.y-a.y)<2&&i.x>=a.x-0.1&&i.x<r.source_regions[0].x_max))[0]?.text;
   const actualCode=codeLine?.match(/^(?:B\s*\.?\s*\d+(?:\s*\.\s*\d+)+|[89](?:\s*\.\s*\d+){3,})/)?.[0];
   check(actualCode===r.source_code_raw&&actualCode.replace(/\s+/g,'')===r.official_code,`${r.entry_id}: complete printed code reconstructed independently from fresh source fragments`,'source_traceability');
   check(rv.code===r.official_code&&rv.statement_sha256===sha(r.indicator_statement),`${r.entry_id}: visually reviewed statement lock`,'source_traceability');
   check(Boolean(r.indicator_statement)&&!r.flags.includes('missing_or_unreadable_statement'),`${r.entry_id}: statement readable`,'source_traceability');
   const st=s.content_standards.find(st=>st.official_code===r.content_standard_code_as_printed),context=r.displayed_content_standard;
   check(Boolean(st)&&context.official_code===st.official_code&&context.pdf_page<=r.pdf_page,`${r.entry_id}: displayed parent link`,'hierarchy');
   check(lines(d.pages[context.pdf_page-1].items.filter(i=>i.x<180)).some(l=>l.text.includes(context.source_code_raw)),`${r.entry_id}: parent code in original left column, including split code fragments`,'hierarchy');
   for(const h of[r.strand_heading_source,r.sub_strand_heading_source].filter(Boolean))check(norm(d.pages[h.pdf_page-1].items.map(i=>i.s).join(' ')).includes(norm(h.official_heading)),`${r.entry_id}: actual printed heading`,'hierarchy');
   for(const region of r.source_regions){
    check(region.pdf_page>=first&&region.pdf_page<=last,`${r.entry_id}: grade-contained continuation`,'source_traceability');
    const pp=d.pages[region.pdf_page-1];for(const frag of region.raw_fragments)check(pp.items.some(i=>i.s===frag.s&&i.x===frag.x&&i.y===frag.y),`${r.entry_id}: raw cell fragment exists on cited page`,'source_traceability');
   }
   same(r.source_cell_text,r.source_regions.map(x=>x.text).join('\n'),`${r.entry_id}: complete cell regions`,'source_traceability');
   assertRow(entry,r,s,doc,grade);check(true,`${r.entry_id}: mapping provenance, hierarchy, activity evidence and unpublished state`,'mapping');
   for(const h of[entry.hierarchy.strand,entry.hierarchy.sub_strand]){
    check(h.structural_key.startsWith(`B${grade}.`),`${r.entry_id}: hierarchy grade binding`,'hierarchy');
    check(Boolean(h.title),`${r.entry_id}: hierarchy title resolved from explicit source`,'hierarchy');
    if(h.scope_resolution)check(norm(d.pages[h.scope_resolution.pdf_page-1].items.map(i=>i.s).join(' ')).includes(h.scope_resolution.sub_title),`${r.entry_id}: scope title explicitly present`,'hierarchy');
   }
   check(entry.source_issue_ids.every(id=>issues.issues.some(i=>i.id===id)),`${r.entry_id}: all issue references resolve`,'mapping');
   for(const [key,value]of Object.entries({source_code_raw:r.source_code_raw,official_code:r.official_code,indicator_statement:r.indicator_statement,pdf_page:String(r.pdf_page),printed_page:r.printed_page,source_sha256:doc.sha256}))check(csv[key]===value,`${r.entry_id}: inventory CSV ${key}`,'csv');
   for(const [key,value]of Object.entries({proposed_competency_id:entry.proposed_competency_id,printed_indicator_code:r.source_code_raw,indicator_statement:r.indicator_statement,pdf_page:String(r.pdf_page),source_sha256:doc.sha256,standard_key:entry.hierarchy.content_standard.structural_key,printed_standard_statement:context.statement_raw}))check(mcsv[key]===value,`${r.entry_id}: mapping CSV ${key}`,'csv');
  }
 }
}
const coverage=load('basic7-9-coverage.json');check(coverage.total_entries===625&&coverage.new_basic8_9_entries===390,'Correct consolidated totals','coverage');
for(const row of coverage.rows){const grade=Number(row.grade.at(-1)),m=grade===7?b7:mappings[grade-8],s=m.subjects.find(s=>s.subject===row.subject);check(row.indicator_entries===s.entries.length&&row.mapped_entries===s.entries.length&&row.coverage_percent===100,`${row.grade}/${row.subject}: consolidated coverage`,'coverage');}
same(csvParse(readFileSync(join(here,'basic7-9-coverage.csv'),'utf8')).map(r=>Number(r.indicator_entries)),coverage.rows.map(r=>r.indicator_entries),'Consolidated CSV counts','csv');
const mutations=[];
if(process.argv.includes('--self-test')){
 const inv=inventories[0].subjects[0].indicators[0],s=inventories[0].subjects[0],doc=manifest.documents[0],original=mappings[0].subjects[0].entries[0];
 function reject(name,fn){assert.throws(fn);mutations.push({name,rejected:true});}
 reject('dropped indicator',()=>assertUnique(allRows.slice(1)));
 reject('duplicate proposed competency ID',()=>assertUnique([allRows[0],allRows[0],...allRows.slice(2)]));
 for(const [name,mutate]of[
  ['rewritten official code',r=>r.source.original_printed_code='B8.9.9.9.9'],['incorrect source hash',r=>r.source.sha256='0'.repeat(64)],['incorrect source page',r=>r.source.pdf_page++],['incorrect hierarchy parent',r=>r.hierarchy.content_standard.structural_key='B9.1.1.1'],['altered statement',r=>r.proposed_competency_title+=' invented'],['untraceable assessment classification',r=>r.assessment_requirements[0].source_excerpt='invented unsupported activity'],['production activation',r=>r.runtime_registered=true]
 ])reject(name,()=>{const r=structuredClone(original);mutate(r);assertRow(r,inv,s,doc,8);});
}
const result={schema_version:1,passed:true,completed_at_utc:new Date().toISOString(),fresh_pdf_extraction:process.argv.includes('--fresh'),checks_passed:checkCount,checks_by_category:checks,mutation_tests:mutations,
 totals:{basic7_entries:235,basic8_entries:192,basic9_entries:198,new_entries:390,total_basic7_9_entries:625,unique_proposed_ids:625},
 subjects:coverage.rows,prior_artifacts_and_existing_application_changes_unchanged:true,
 limitations:['Coverage and identity validation do not authenticate the HTTP-retrieved source PDFs.','Human/publisher ambiguities remain in basic89-source-issues.json.','Visual review covers all leading indicator statements/codes, not an independent scientific certification of every exemplar/diagram.','Outputs are outside the repository because it is read-only in this session. No production support, content or registration was added.']};
if(process.argv.includes('--record'))save('phase8d-validation.json',result);
console.log(JSON.stringify(result,null,2));
