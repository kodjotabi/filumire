// Documentation only. Reads pinned PDFs/Phase 8A inputs; writes only new Phase 8B mapping artifacts.
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const base='docs/curriculum-sources/ghana/ccp-b7-b9';
const load=n=>JSON.parse(readFileSync(`${base}/${n}`,'utf8'));
const sha=b=>createHash('sha256').update(b).digest('hex');
const manifest=load('basic7-source-manifest.json'),structure=load('basic7-curriculum-structure.json');
const {getDocument}=await import(process.env.FILUMIRE_PDFJS_MODULE);
const norm=s=>s.replace(/\s+/g,' ').trim();
const frozenInputs=['basic7-source-manifest.json','basic7-coverage-matrix.csv','basic7-curriculum-structure.json','basic7-validation.json','README.md','extract-basic7.mjs','validate-basic7.mjs',...manifest.documents.map(d=>d.local_path.split('/').at(-1))].map(name=>({path:`${base}/${name}`,sha256:sha(readFileSync(`${base}/${name}`))}));
const issues=[];
function issue(id,subject,status,description,pages,entries=[],decision=null){issues.push({id,subject,status,description,source_pdf_pages:pages,affected_entries:entries,decision});return id;}
issue('SRC-TRANSPORT','all','unresolved','Phase 8A official-host retrieval used unauthenticated HTTP after HTTPS timeouts. Hashes pin bytes; publisher authenticity needs reconfirmation.',[],[], 'Do not substitute or redownload PDFs during this mapping task.');
issue('SRC-ASSESSMENT-REFERENCES','all','unresolved','NPLAF (2020a) and School-Based Assessment Guidelines (2020b) are cited but not independently verified in this four-document set.',[],[], 'Do not claim complete national reporting compliance.');
issue('SRC-EN-ANNOTATION','english','unresolved','The reference-number illustration is literally question marks in the rendered PDF.',[31],[], 'Do not reconstruct a missing official illustration.');
issue('SRC-EN-SUB4','english','unresolved','B7.3.4.1 / B7.3.4.1.1 exists, but the Basic 7 table and scope list provide no sub-strand 4 title.',[59,36],['english:pdf59:row1'],'Use the structurally indicated sub-strand 4 with a null official title and an explicitly nonofficial placeholder.');
issue('RES-EN-WRITING-HEADING','english','resolved_from_same_PDF','Table heading PRODUCTION AND is truncated; contents and scope explicitly name Production and Distribution of Writing.',[6,36,60,61],['english:pdf60:row1','english:pdf61:row1'],'Use the full source-supported heading; preserve the truncated table heading separately.');
issue('SRC-MATH-TRUNCATED','mathematics','unresolved','Comparison indicator is printed B7.1.1.2 inside content standard B7.1.1.1. A missing standard segment is plausible but no explicit corrected indicator code was found.',[32,33,34],['mathematics:pdf33:row1'],'Map to the displayed parent and a source-anchored competency; leave normalized indicator code null.');
issue('SRC-MATH-COUNT','mathematics','unresolved','Overview Table 3 lists 19 Basic 7 content standards and 2 Measurement standards. Detailed B7 tables contain 20 distinct standards, including 3 Measurement standards.',[30,89,94,97],[], 'Retain all detailed entries; do not drop the bearing/vector standard to match the overview count.');
issue('SRC-MATH-RANGE','mathematics','unresolved','B7.1.1.1.1 says more than 1,000,000,000; its first exemplar says up to 1,000,000,000.',[32],['mathematics:pdf32:row1'],'Preserve both source statements; request subject review of boundary coverage before authoring.');
issue('RES-MATH-87-TRANSCRIPTION','mathematics','resolved_transcription','Phase 8A transcribed Constructing; the visible indicator heading says Construct angles whose measures are 15° and 75°.',[87],['mathematics:pdf87:row1'],'Correct only the Phase 8B transcription, leaving Phase 8A inputs unchanged.');
issue('SRC-COMP-WORD-CODES','computing','unresolved','Word-processing code B7.2.1.1.3 is reused; B7.2.1.1.4.5 and B7.2.1.1.4.6 have extra numeric segments. No authoritative replacement codes are supplied.',[37,38,39],['computing:pdf37:row3','computing:pdf38:row2','computing:pdf38:row3','computing:pdf39:row1'],'Preserve four distinct rows and assign four different source-anchored competency IDs; do not renumber.');
issue('SRC-COMP-PRESENTATION-CODES','computing','unresolved','B7.2.2.1.2 and B7.2.2.1.3 are each reused on page 41 under displayed standard B7.2.2.2; code prefixes and parent cells disagree.',[40,41],['computing:pdf40:row2','computing:pdf40:row3','computing:pdf41:row2','computing:pdf41:row3'],'Displayed parent cells govern hierarchy; no replacement official codes.');
issue('SRC-COMP-EMBEDDED-B8','computing','unresolved','The B7.1.3.1.3 cell contains B8.1.3.1.1 Examine workstation health risk assessment methods.',[36],['computing:pdf36:row3'],'Keep the Basic 7 top-level indicator, flag the embedded cross-grade label, and do not add a 236th entry or import a B8 objective.');
issue('RES-SCI-CELLS','science','resolved_clarification','Adjacent cell indicators deliberately distinguish animal cells (B7.1.2.1.1) from plant cells (B7.1.2.1.2); each has matching exemplars.',[42,43],['science:pdf42:row1','science:pdf43:row1'],'Keep two separate intended competencies; no plant/animal wording correction.');
issue('SRC-EDITION-SCOPE','all','unresolved','Covers say September 2020, some footers 2021; some preambles describe four CCP years despite B7–B9 covers. No numbered edition or erratum identified.',[],[], 'Retain Phase 8A edition evidence; B7 mapping follows actual Basic 7 section boundaries.');
const rules=[
 ['oral_aural_performance',/\b(listen\w*|speak\w*|oral|articulat\w*|voice|conversation\w*|role.?play|pronounc\w*)\b/i,['oral_response','observed_performance']],
 ['written_composition',/\b(writ\w*|written|compos\w*|draft\w*|paragraph\w*|letter\w*|article\w*|poster\w*|summaris\w*|notes)\b/i,['constructed_response']],
 ['explanation_reasoning',/\b(explain\w*|discuss\w*|describ\w*|justify\w*|compar\w*|reason\w*|analys\w*|evaluat\w*)\b/i,['explanation']],
 ['classification_identification',/\b(classif\w*|identify\w*|list\w*|recognis\w*|distinguish\w*|categor\w*|state|name)\b/i,['classification','short_answer']],
 ['diagram_graph_table_model',/\b(draw\w*|diagram\w*|plot\w*|graph\w*|table\w*|chart\w*|grid\w*|sketch\w*|model\w*)\b/i,['constructed_response','explanation']],
 ['practical_observation',/\b(experiment\w*|microscop\w*|magnif\w*|compass\w*|ruler|assembl\w*|dismantl\w*|magnet\w*|construct\w*|observ\w*|demonstrat\w*)\b/i,['observed_performance']],
 ['investigation_project',/\b(research\w*|investigat\w*|survey\w*|questionnaire\w*|portfolio\w*|report\w*)\b/i,['constructed_response','explanation']],
 ['digital_artifact',/\b(software|MS-?Word|MS-?Excel|PowerPoint|spreadsheet\w*|word processing|file management|electronic mail)\b/i,['observed_performance','constructed_response']],
 ['algorithm_execution',/\b(algorithm\w*|linear search|sequence|selection|iteration|programming)\b/i,['sequence_ordering','explanation']],
];
const output={schema_version:1,phase:'8B',grade:'Basic 7',status:'documentation_only_not_registered',
  identity_policy:'One source-anchored proposed competency per Phase 8A entry. IDs are independent of code corrections, subject-scoped, frozen to the reviewed source edition/entry; no reuse for a changed objective. No production IDs are modified.',
  evidence_policy:'Source requirements and planning interpretations are separate. Suggested response modes are not generated assessments. Guided evidence must remain supported; independent mastery, retention and transfer require separately evaluated independent evidence. No scores, thresholds, prerequisite edges or question content are invented.',
  proposed_context:{country_id:'country-gh',curriculum_version_id:'curriculum-version-gh-nacca-ccp-2020',phase_id:'phase-gh-jhs-ccp',grade_and_runtime_level_id:'level-gh-basic-7-ccp',status:'proposed_unregistered'},
  frozen_phase8a_inputs:frozenInputs, subjects:[]};
const review={schema_version:1,method:'All 235 leading indicator statements/codes visually reviewed in 22 rendered PDF contact sheets. Fresh PDF text checked for every source anchor, displayed parent, referenced heading and continuation page. Full relevant cell text and exemplars retained from Phase 8A and checked against fresh source-page tokens. This is mapping review, not an independent NaCCA erratum or subject-content certification.',
  inspected_indicator_entries:235,rendered_indicator_header_sheets:22,supplemental_visual_pdf_pages:{english:[6,31,36,59,60],mathematics:[30,33,40,44,49,54,56,85,86,87,89,100,101],computing:[36,38,39,40,41,44,51],science:[42,43,84]},entries:[],page_reviews:[],checks:[]};
const check=(name,ok)=>{assert.ok(ok,name);review.checks.push({name,passed:true});};
const normalizeStandard=code=>code.replace(/^B\.7/,'B7').replace(/^B72\./,'B7.2.');
for(const s of structure.subjects){
 const doc=manifest.documents.find(d=>d.id===s.id),bytes=readFileSync(doc.local_path);check(`${s.id}: pinned PDF bytes`,sha(bytes)===doc.sha256);
 const task=getDocument({data:new Uint8Array(bytes),useSystemFonts:true,isEvalSupported:false}),pdf=await task.promise;
 const sourcePages=new Map();
 // Read whole Basic 7 section, including exemplar-only continuation pages, plus required contextual pages.
 const needed=new Set([...Array.from({length:s.basic7_pdf_pages[1]-s.basic7_pdf_pages[0]+1},(_,k)=>s.basic7_pdf_pages[0]+k),...s.assessment_expectations.map(a=>a.pdf_page),...(s.id==='english'?[6,31,36]:s.id==='mathematics'?[29,30]:s.id==='computing'?[29]:[33,34,36])]);
 for(const n of [...needed].sort((a,b)=>a-b)){const p=await pdf.getPage(n),items=(await p.getTextContent()).items.filter(i=>'str'in i).map(i=>({s:i.str,x:i.transform[4],y:i.transform[5]}));const text=norm(items.map(i=>i.s).join(' '));sourcePages.set(n,{items,text});review.page_reviews.push({document_id:s.id,pdf_page:n,text_sha256:sha(text),text_readable:Boolean(text),purpose:n>=s.basic7_pdf_pages[0]&&n<=s.basic7_pdf_pages[1]?'Basic7_indicator_or_exemplar_page':'assessment_or_hierarchy_context'});}
 const subject={id:s.id,subject:s.subject,proposed_subject_id:`subject-gh-basic7-${s.id}-ccp`,source_document:{document_id:doc.id,path:doc.local_path,url:doc.source_url,sha256:doc.sha256},assessment_guidance_pages:s.assessment_expectations.map(a=>({pdf_page:a.pdf_page,printed_page:a.printed_page})),entries:[]};
 const nodeTitles=new Map();
 const node=(kind,key,title,pages,officialCode=null)=>{
  const id=`node-gh-b7-${s.id}-${kind}-${key.replaceAll('.','-')}`;
  if(!nodeTitles.has(id))nodeTitles.set(id,{title,pages});
  const first=nodeTitles.get(id);
  return {proposed_node_id:id,official_code:officialCode,title:first.title,canonical_title_source_pdf_pages:first.pages,source_pdf_pages:[...new Set([...first.pages,...pages])]};
 };
 for(let k=0;k<s.indicators.length;k++){
  const r=s.indicators[k],page=sourcePages.get(r.pdf_page),anchor=page.items.find(i=>i.x>=190&&i.x<280&&i.s.includes(r.source_code_raw));
  check(`${r.entry_id}: original code on PDF page`,Boolean(anchor));
  check(`${r.entry_id}: actual printed page`,page.items.some(i=>i.y<50&&i.s.trim()===r.printed_page));
  const st=s.content_standards.find(st=>st.official_code===r.content_standard_code_as_printed);check(`${r.entry_id}: explicit parent`,Boolean(st));
  check(`${r.entry_id}: displayed standard independently present in source column`,st.source_pages.some(n=>sourcePages.get(n).items.some(i=>i.x<190&&i.s.includes(st.source_code_raw))));
  const stKey=normalizeStandard(st.official_code),parts=stKey.split('.'),strandKey=parts.slice(0,2).join('.'),subKey=parts.slice(0,3).join('.');
  const findHeading=(kind,text)=>s.headings.filter(h=>h.kind===kind&&h.official_heading===text&&h.pdf_page<=r.pdf_page).at(-1);
  const sh=findHeading('strand',r.strand_heading),subh=r.sub_strand_heading?findHeading('sub_strand',r.sub_strand_heading):null;
  check(`${r.entry_id}: strand heading independently present in source`,Boolean(sh&&sourcePages.get(sh.pdf_page).text.includes(norm(sh.official_heading))));
  if(subh)check(`${r.entry_id}: sub-strand heading independently present in source`,sourcePages.get(subh.pdf_page).text.includes(norm(subh.official_heading)));
  let subTitle=r.sub_strand_heading?.replace(/^SUB[- ]?STRAND\s*\d+\s*:\s*/i,'')??null,subPages=subh?[subh.pdf_page]:[],subResolution=null;
  if(s.id==='english'&&subKey==='B7.4.1'){subTitle='Production and Distribution of Writing';subPages=[6,36,60];subResolution='RES-EN-WRITING-HEADING';check(`${r.entry_id}: full writing title in source`,/Production and Distribution of Writing/i.test(sourcePages.get(36).text));}
  const code=r.official_code;let alias=/^B7(?:\.\d+){4}$/.test(code)?code:null,aliasDecision='as_printed',aliasEvidence=[];
  const attached=issues.filter(i=>i.affected_entries.includes(r.entry_id)).map(i=>i.id);
  if(/^B\.7(?:\.\d+){4}$/.test(code)) {alias=code.replace(/^B\.7/,'B7');aliasDecision='format_alias_extra_dot_after_B';aliasEvidence=[r.pdf_page,...st.source_pages.slice(0,1)];}
  if(s.id==='mathematics'&&code==='B71.2.2.2'){alias='B7.1.2.2.2';aliasDecision='format_alias_missing_separator';aliasEvidence=[39,40,41];}
  if(s.id==='mathematics'&&/^7\.3\.1\.2\.[456]$/.test(code)){alias='B'+code;aliasDecision='format_alias_missing_B_prefix';aliasEvidence=[81,85,86,87,88];}
  const conflicting=attached.some(i=>['SRC-MATH-TRUNCATED','SRC-COMP-WORD-CODES','SRC-COMP-PRESENTATION-CODES'].includes(i));
  if(conflicting){alias=null;aliasDecision='unresolved_no_replacement_code_assigned';}
  if(aliasDecision.startsWith('format_alias')){const id=`RES-FORMAT-${s.id}-${r.pdf_page}-${k+1}`;issue(id,s.id,'resolved_format_alias',`Printed ${r.source_code_raw} is retained; ${alias} is a FILUMIRE formatting alias supported by displayed parent and adjacent numbering, not an official erratum.`,aliasEvidence,[r.entry_id],aliasDecision);attached.push(id);}
  if(stKey!==st.official_code){const id=`RES-STANDARD-${s.id}-${st.official_code}`;if(!issues.some(i=>i.id===id))issue(id,s.id,'resolved_format_alias',`Printed standard ${st.source_code_raw} maps to internal structural key ${stKey}; preserve source spelling.`,st.source_pages,[], 'Structural mapping only; no official PDF correction.');attached.push(id);}
  const slices=r.source_cell_text.split('\n').map(norm).filter(Boolean),performance=slices.findIndex(l=>/Exemplars?(?:\(s\))?\s*:?/i.test(l));
  const requirements=[];
  for(const [kind,regex,modes]of rules){const quote=slices.find(l=>regex.test(l));if(quote)requirements.push({kind,suggested_response_modes:modes,source_excerpt:quote,source_pdf_pages:r.source_pages,interpretation:'FILUMIRE planning classification of explicit source actions; not an official prescribed assessment format.'});}
  if(!requirements.length)requirements.push({kind:'source_defined_performance',suggested_response_modes:['explanation'],source_excerpt:slices[0],source_pdf_pages:r.source_pages,interpretation:'Human assessment design review required; no automatic question type assigned.'});
  let statement=r.indicator_statement,transcriptionNote=null;
  if(r.entry_id==='mathematics:pdf87:row1'){statement='Construct angles whose measures are 15° and 75°.';transcriptionNote='RES-MATH-87-TRANSCRIPTION';}
  // Each source statement and source activity is linked to fresh PDF text, not merely the Phase 8A CSV.
  const sourceTokens=new Set(r.source_pages.flatMap(n=>sourcePages.get(n).text.toLowerCase().match(/[\p{L}\p{N}]+/gu)??[]));
  const activityTokens=r.source_cell_text.toLowerCase().match(/[\p{L}\p{N}]+/gu)??[];
  const tokenCoverage=activityTokens.filter(t=>sourceTokens.has(t)).length/activityTokens.length;
  check(`${r.entry_id}: cell/exemplar tokens supported by cited PDF pages`,tokenCoverage>0.96);
  const row={entry_id:r.entry_id,subject:s.subject,proposed_competency_id:`competency-gh-${s.id}-b7-nacca2020-p${String(r.pdf_page).padStart(3,'0')}-r${r.entry_id.split('row')[1].padStart(2,'0')}`,
   proposed_learning_indicator_node_id:`node-gh-b7-${s.id}-indicator-p${r.pdf_page}-r${r.entry_id.split('row')[1]}`,
   proposed_competency_title:statement,intended_competency_scope:'Exactly this source indicator, including its source-supported performance expectations; unregistered and unpublished.',
   source:{document_id:doc.id,path:doc.local_path,url:doc.source_url,sha256:doc.sha256,pdf_page:r.pdf_page,printed_page:r.printed_page,continuation_pdf_pages:r.source_pages,original_printed_code:r.source_code_raw,phase8a_whitespace_collapsed_code:code,phase8a_statement:r.indicator_statement},
   numbering:{filumire_format_alias:alias,decision:aliasDecision,evidence_pdf_pages:aliasEvidence,official_code_replaced:false},
   strand:{...node('strand',strandKey,r.strand_heading.replace(/^STRAND\s*\d*\s*:\s*/i,''),sh?[sh.pdf_page]:[r.pdf_page]),source_heading:r.strand_heading,structural_key:strandKey},
   sub_strand:{...node('sub-strand',subKey,subTitle,subPages),source_heading:r.sub_strand_heading,structural_key:subKey,nonofficial_placeholder:subTitle?null:'Sub-strand 4 (official title not supplied)',heading_resolution:subResolution},
   content_standard:{...node('standard',stKey,st.statement_raw,st.source_pages,st.source_code_raw),structural_key:stKey},
   learning_indicator:{statement,transcription_note:transcriptionNote,original_printed_code:r.source_code_raw},
   source_supported_activity_text:r.source_cell_text,activity_text_note:'Source cell and exemplars, including continuation pages; no new activity or lesson authored. Read source PDF for diagrams and equation layout.',
   assessment_requirements:requirements,assessment_guidance_pages:subject.assessment_guidance_pages,
   prerequisites:{status:'not_yet_designed',competency_ids:null},difficulty:null,mastery_thresholds:null,
   publication_status:'not_published',source_issue_ids:attached,
   mapping_status:attached.some(id=>issues.find(i=>i.id===id)?.status==='unresolved')?'mapped_with_unresolved_source_issue':'mapped',
   review:{source_code_checked:true,indicator_heading_visually_checked:true,displayed_parent_checked:true,source_activity_token_coverage:Number(tokenCoverage.toFixed(5)),method:'PDF text plus rendered leading indicator header; supplemental pages for conflicts'},
  };
  check(`${r.entry_id}: strand heading source`,Boolean(sh));
  if(subh)check(`${r.entry_id}: sub-strand heading source`,Boolean(sourcePages.get(subh.pdf_page)));
  subject.entries.push(row);review.entries.push({entry_id:r.entry_id,...row.review,source_pdf_page:r.pdf_page,printed_page:r.printed_page,issue_ids:attached});
 }
 subject.counts={entries:subject.entries.length,distinct_printed_codes:new Set(subject.entries.map(r=>r.source.phase8a_whitespace_collapsed_code)).size,proposed_competencies:new Set(subject.entries.map(r=>r.proposed_competency_id)).size,mapped_with_unresolved_source_issue:subject.entries.filter(r=>r.mapping_status!=='mapped').length};
 output.subjects.push(subject);await task.destroy();
}
for(const input of frozenInputs)check(`${input.path}: Phase 8A preserved`,sha(readFileSync(input.path))===input.sha256);
const all=output.subjects.flatMap(s=>s.entries);check('235 entries, no dropped or added objectives',all.length===235);check('235 unique intended competencies',new Set(all.map(r=>r.proposed_competency_id)).size===235);
const fields=['subject','entry_id','proposed_competency_id','proposed_competency_title','strand_key','strand_title','sub_strand_key','sub_strand_title','content_standard_key','original_printed_standard_code','original_printed_indicator_code','filumire_format_alias','numbering_decision','source_pdf','source_url','source_sha256','pdf_page','printed_page','continuation_pdf_pages','assessment_requirements','source_activity_reference','mapping_status','source_issue_ids'];
const cell=v=>'"'+String(v??'').replaceAll('"','""')+'"';
const csv=[fields.map(cell).join(',')];
for(const r of all){const flat={...r,strand_key:r.strand.structural_key,strand_title:r.strand.title,sub_strand_key:r.sub_strand.structural_key,sub_strand_title:r.sub_strand.title??r.sub_strand.nonofficial_placeholder,content_standard_key:r.content_standard.structural_key,original_printed_standard_code:r.content_standard.official_code,original_printed_indicator_code:r.source.original_printed_code,filumire_format_alias:r.numbering.filumire_format_alias,numbering_decision:r.numbering.decision,source_pdf:r.source.path,source_url:r.source.url,source_sha256:r.source.sha256,pdf_page:r.source.pdf_page,printed_page:r.source.printed_page,continuation_pdf_pages:r.source.continuation_pdf_pages.join(';'),assessment_requirements:r.assessment_requirements.map(a=>a.kind).join(';'),source_activity_reference:`basic7-filumire-mapping.json#entry_id=${r.entry_id}`,source_issue_ids:r.source_issue_ids.join(';')};csv.push(fields.map(f=>cell(flat[f])).join(','));}
review.check_count=review.checks.length;
writeFileSync(`${base}/basic7-filumire-mapping.json`,JSON.stringify(output,null,2)+'\n');
writeFileSync(`${base}/basic7-filumire-mapping.csv`,csv.join('\n')+'\n');
writeFileSync(`${base}/basic7-mapping-source-issues.json`,JSON.stringify({schema_version:1,policy:'Unresolved official codes remain unchanged. Resolved aliases are internal formatting/hierarchy decisions, not publisher-issued errata.',issues},null,2)+'\n');
writeFileSync(`${base}/basic7-mapping-source-review.json`,JSON.stringify(review,null,2)+'\n');
console.log(JSON.stringify({source_checks:review.check_count,counts:output.subjects.map(s=>({subject:s.subject,...s.counts})),unresolved_issue_groups:issues.filter(i=>i.status==='unresolved').length},null,2));
