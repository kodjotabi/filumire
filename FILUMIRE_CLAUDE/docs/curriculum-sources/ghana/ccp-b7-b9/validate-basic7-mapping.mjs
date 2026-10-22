// Validates Phase 8B documentation only. --record writes its dedicated validation report.
import {readFileSync,writeFileSync,readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const base='docs/curriculum-sources/ghana/ccp-b7-b9';
const load=n=>JSON.parse(readFileSync(`${base}/${n}`,'utf8'));
const sha=b=>createHash('sha256').update(b).digest('hex');
const mapping=load('basic7-filumire-mapping.json'),source=load('basic7-curriculum-structure.json'),review=load('basic7-mapping-source-review.json'),issues=load('basic7-mapping-source-issues.json').issues;
const checks=[];const check=(name,ok)=>{assert.ok(ok,name);checks.push({name,passed:true});};
function csv(text){let row=[],cell='',quoted=false;const rows=[];for(let i=0;i<text.length;i++){const c=text[i];if(c==='"'){if(quoted&&text[i+1]==='"'){cell+='"';i++;}else quoted=!quoted;}else if(!quoted&&(c===','||c==='\n')){row.push(cell);cell='';if(c==='\n'){rows.push(row);row=[];}}else if(c!=='\r'||quoted)cell+=c;}check('CSV quotes closed',!quoted);if(cell||row.length){row.push(cell);rows.push(row);}const [header,...data]=rows;check('CSV column counts',data.every(r=>r.length===header.length));return data.map(r=>Object.fromEntries(header.map((h,k)=>[h,r[k]])));}
const matrix=csv(readFileSync(`${base}/basic7-filumire-mapping.csv`,'utf8'));
const originalMatrix=csv(readFileSync(`${base}/basic7-coverage-matrix.csv`,'utf8'));
const all=mapping.subjects.flatMap(s=>s.entries),original=source.subjects.flatMap(s=>s.indicators);
const counts={english:53,mathematics:74,computing:55,science:53};
check('Exactly four subjects',mapping.subjects.length===4);
check('235 mapping rows',all.length===235&&matrix.length===235&&original.length===235&&originalMatrix.length===235);
check('235 unique source entries',new Set(all.map(r=>r.entry_id)).size===235);
check('235 unique proposed competencies',new Set(all.map(r=>r.proposed_competency_id)).size===235);
check('235 unique proposed indicator nodes',new Set(all.map(r=>r.proposed_learning_indicator_node_id)).size===235);
check('No dropped source entries',original.every(r=>all.some(m=>m.entry_id===r.entry_id)));
check('Fresh source review checks passed',review.check_count===review.checks.length&&review.checks.every(c=>c.passed));
check('Every header visually reviewed',review.inspected_indicator_entries===235&&review.rendered_indicator_header_sheets===22&&review.entries.length===235&&review.entries.every(r=>r.indicator_heading_visually_checked));
for(const input of mapping.frozen_phase8a_inputs)check(`${input.path}: original bytes preserved`,sha(readFileSync(input.path))===input.sha256);
const ids=new Set(issues.map(i=>i.id));check('Unique issue IDs',ids.size===issues.length);
for(const i of issues)for(const id of i.affected_entries)check(`${i.id}: known entry`,all.some(r=>r.entry_id===id));
const nodes=new Map();
for(const subject of mapping.subjects){
 check(`${subject.id}: expected row count`,subject.entries.length===counts[subject.id]);
 check(`${subject.id}: pinned PDF checksum`,sha(readFileSync(subject.source_document.path))===subject.source_document.sha256);
 const aliases=subject.entries.map(r=>r.numbering.filumire_format_alias).filter(Boolean);
 check(`${subject.id}: unambiguous aliases unique`,new Set(aliases).size===aliases.length);
 for(const r of subject.entries){
  const o=original.find(q=>q.entry_id===r.entry_id),m=matrix.find(q=>q.entry_id===r.entry_id),a=originalMatrix.find(q=>q.entry_id===r.entry_id);
  check(`${r.entry_id}: preserved original printed code`,r.source.original_printed_code===o.source_code_raw&&r.learning_indicator.original_printed_code===o.source_code_raw&&r.source.phase8a_whitespace_collapsed_code===o.official_code);
  check(`${r.entry_id}: preserved source PDF/hash/URL`,r.source.path===a.document_path&&r.source.sha256===a.sha256&&r.source.url===a.source_url);
  check(`${r.entry_id}: exact PDF and printed page`,r.source.pdf_page===o.pdf_page&&r.source.printed_page===o.printed_page&&JSON.stringify(r.source.continuation_pdf_pages)===JSON.stringify(o.source_pages));
  check(`${r.entry_id}: CSV identity round-trip`,m.proposed_competency_id===r.proposed_competency_id&&m.original_printed_indicator_code===o.source_code_raw&&m.proposed_competency_title===r.proposed_competency_title);
  check(`${r.entry_id}: CSV provenance round-trip`,m.source_pdf===r.source.path&&m.source_sha256===r.source.sha256&&Number(m.pdf_page)===r.source.pdf_page&&m.printed_page===r.source.printed_page);
  check(`${r.entry_id}: full hierarchy mapped`,Boolean(r.strand.proposed_node_id&&r.strand.title&&r.sub_strand.proposed_node_id&&r.content_standard.proposed_node_id&&r.content_standard.title&&r.proposed_learning_indicator_node_id));
  check(`${r.entry_id}: hierarchy keys consistent`,r.content_standard.structural_key.startsWith(r.sub_strand.structural_key+'.')&&r.sub_strand.structural_key.startsWith(r.strand.structural_key+'.'));
  check(`${r.entry_id}: missing title not invented`,Boolean(r.sub_strand.title)||(r.sub_strand.title===null&&r.source_issue_ids.includes('SRC-EN-SUB4')&&Boolean(r.sub_strand.nonofficial_placeholder)));
  check(`${r.entry_id}: displayed standard code retained`,r.content_standard.official_code===source.subjects.find(s=>s.id===subject.id).content_standards.find(st=>st.official_code===o.content_standard_code_as_printed).source_code_raw);
  for(const node of [r.strand,r.sub_strand,r.content_standard]){const seen=nodes.get(node.proposed_node_id);if(seen)check(`${r.entry_id}: shared node coherent`,seen.structural_key===node.structural_key&&seen.title===node.title);else nodes.set(node.proposed_node_id,node);}
  check(`${r.entry_id}: competency scope equals indicator`,r.proposed_competency_title===r.learning_indicator.statement);
  check(`${r.entry_id}: source activity preserved`,r.source_supported_activity_text===o.source_cell_text);
  check(`${r.entry_id}: assessment requirements traceable`,r.assessment_requirements.length>0&&r.assessment_requirements.every(q=>r.source_supported_activity_text.includes(q.source_excerpt)&&q.source_pdf_pages.length>0&&q.suggested_response_modes.length>0&&q.interpretation));
  check(`${r.entry_id}: official assessment guidance cited`,r.assessment_guidance_pages.length>=4&&r.assessment_guidance_pages.every(p=>review.page_reviews.some(q=>q.document_id===subject.id&&q.pdf_page===p.pdf_page&&q.text_readable)));
  check(`${r.entry_id}: issues resolve to register`,r.source_issue_ids.every(id=>ids.has(id)));
  const unresolved=r.source_issue_ids.some(id=>issues.find(i=>i.id===id).status==='unresolved');
  check(`${r.entry_id}: unresolved status honest`,(r.mapping_status==='mapped_with_unresolved_source_issue')===unresolved);
  check(`${r.entry_id}: no official code replacement`,r.numbering.official_code_replaced===false);
  check(`${r.entry_id}: missing alias explicitly unresolved`,Boolean(r.numbering.filumire_format_alias)||r.numbering.decision==='unresolved_no_replacement_code_assigned');
  check(`${r.entry_id}: documentation only`,r.publication_status==='not_published'&&r.prerequisites.competency_ids===null&&r.difficulty===null&&r.mastery_thresholds===null);
  const record=review.entries.find(q=>q.entry_id===r.entry_id);
  check(`${r.entry_id}: fresh PDF source review`,record.source_code_checked&&record.displayed_parent_checked&&record.source_activity_token_coverage>0.96);
 }
}
// Current runtime/framework registries are read only: check that no proposed competency is already registered.
const files=[];function collect(dir){for(const entry of readdirSync(dir,{withFileTypes:true})){const path=`${dir}/${entry.name}`;if(entry.isDirectory())collect(path);else if(entry.name.endsWith('.ts'))files.push(path);}}
collect('packages/curriculum');collect('packages/curriculum-framework');
const production=files.map(path=>readFileSync(path,'utf8')).join('\n');
check('Proposed competencies have no existing runtime ID collisions',all.every(r=>!production.includes(r.proposed_competency_id)));
const nullAliases=all.filter(r=>!r.numbering.filumire_format_alias);
check('Nine unresolved printed-code entries not silently normalized',nullAliases.length===9);
check('Three Computing duplicate code groups retained',new Set(mapping.subjects.find(s=>s.id==='computing').entries.map(r=>r.source.phase8a_whitespace_collapsed_code)).size===52);
check('English missing official sub-strand title remains explicit',all.filter(r=>r.sub_strand.title===null).length===1);
check('Phase 8A transcription corrected only in mapping',all.find(r=>r.entry_id==='mathematics:pdf87:row1').learning_indicator.statement==='Construct angles whose measures are 15° and 75°.');
const result={schema_version:1,passed:true,scope:'Documentation/mapping validation, not application, browser, database or pedagogical certification.',checks_passed:checks.length,source_checks_passed:review.check_count,indicator_entries:all.length,unique_proposed_competencies:new Set(all.map(r=>r.proposed_competency_id)).size,unresolved_issue_groups:issues.filter(i=>i.status==='unresolved').length,entry_specific_unresolved_rows:all.filter(r=>r.mapping_status!=='mapped').length,subjects:mapping.subjects.map(s=>({subject:s.subject,...s.counts})),checks};
if(process.argv.includes('--record'))writeFileSync(`${base}/basic7-mapping-validation.json`,JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({...result,checks:undefined},null,2));
