// Phase 8D proposed identities and evidence classifications only. No production imports.
import {readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {here,sourceBase,manifest,load,save,norm,sha} from './phase8d-source.mjs';
import {csv} from './extract-basic89.mjs';
const issues=[];
function add(id,subject,grades,status,description,pages,entries=[],action='Human source/subject review before implementation.'){
 issues.push({id,subject,grades,status,description,source_pdf_pages:pages,affected_entries:entries,required_action:action});return id;
}
add('8D-SOURCE-AUTHENTICATION','all',[8,9],'unresolved','Existing PDFs were retrieved over unauthenticated official-host HTTP after HTTPS timeouts. Original hashes are unchanged; no new authenticity claim is made.',[],[],'Reconfirm the pinned files over authenticated HTTPS or against authenticated publisher checksums before production acceptance.');
add('8D-ASSESSMENT-REFERENCES','all',[8,9],'unresolved','NPLAF (2020a) and School-Based Assessment Guidelines (2020b) are cited but are not part of the four verified PDFs.',[],[],'Verify those references before claiming complete national assessment/reporting compliance.');
add('8D-EDITION','all',[8,9],'unresolved','Cover, imprint, footer years and three-/four-year programme wording differ, as documented in Phase 8A/8B.',[],[],'Keep original edition evidence; no latest-edition claim or automatic source substitution.');
const manual=[
 ['EN8-EDITORIAL','english',[8],'unresolved','The PDF visibly includes a red missing-example annotation at PDF 86 and a request to check red numbering at PDF 89. These are source editorial annotations, not extraction errors.',[86,89],['english:pdf86:row1','english:pdf89:row1','english:pdf89:row2'],'Obtain an authenticated final/errata version or publisher clarification; do not supply the missing example or repair codes.'],
 ['EN9-EDITORIAL','english',[9],'unresolved','The content-standard cell on PDF 127 includes a red request to check an omission. Original wording remains unchanged.',[127],['english:pdf127:row1'],'Publisher clarification before treating the annotated standard as final.'],
 ['MATH9-SUMMARY','mathematics',[9],'unresolved','Overview PDF 30 lists 17 Basic 9 standards and one Shapes and Space standard. The detailed section has 18 standards, including B9.3.1.1 and B9.3.1.2.',[30,226,229],[],'Keep every detailed standard and indicator. Obtain publisher clarification of the overview total.'],
 ['MATH9-VECTOR-PARENT','mathematics',[9],'unresolved','The position-vector indicator B9.3.2.1.4 is displayed beneath the prism surface-area standard B.9.3.2.1. Its printed parent and code are preserved.',[235,237],['mathematics:pdf237:row1'],'Review intended content-standard scope; do not silently reparent the indicator.'],
 ['SCI8-CELL-SCOPE','science',[8],'unresolved','B8.1.2.1.2 classifies organisms (plants or animals) as prokaryotic or eukaryotic. The source wording and exemplars require scientific review.',[93],['science:pdf93:row2'],'A qualified Science reviewer should clarify the intended biological scope before any instruction is authored.'],
 ['SCI8-FORCE','science',[8],'unresolved','B8.4.4.1.2 links magnetic force and Newton\u2019s Second Law. Preserve both the statement and exemplars pending subject review.',[111],['science:pdf111:row2'],'Review scientific scope and the required evidence before implementation.'],
 ['SCI-SCOPE-ORDER','science',[8,9],'unresolved','The Forces and Energy sub-strand numbering in the general scope (PDF 36) differs from the detailed tables. The detailed tables include Energy and five sub-strands.',[36,106,109,110,111,113,144,146,147,148,150],[],'Use displayed detailed-table parents for this inventory; request publisher clarification before reconciling navigation labels.'],
 ['SCI9-PARENT-VARIANTS','science',[9],'unresolved','Printed B9.4.4.2 has changing Newton-law descriptions at PDF 148/149; B9.5.2.2 describes health/disease at PDF 153 and selected fungal diseases at PDF 154. Every displayed parent fragment is retained per entry.',[148,149,153,154],['science:pdf148:row2','science:pdf149:row1','science:pdf149:row2','science:pdf153:row1','science:pdf153:row2','science:pdf154:row1'],'Review whether these are repeated standards, misplaced statements or numbering errors. No official replacement codes or merged competency scopes.'],
 ['COMP-SOFTWARE','computing',[8,9],'unresolved','The curriculum names version-/service-specific interfaces and products, including Charms, MS-Publisher, Periscope and named AI demonstrations. This phase preserves the published requirements without certifying current availability.',[54,59,63,76,85],[],'Review feasible supported tools and equivalence before instructional implementation; preserve original source requirements.'],
 ['MATH-NOTATION','mathematics',[8,9],'requires_subject_review','PDF text order does not reproduce fractions, roots, column vectors, superscripts or geometric diagrams. Four leading statements have explicit visual transcriptions; the complete original cells and PDFs remain authoritative.',[173,179,200,247],[],'Review original mathematical figures and exemplars before authoring. Plain text is not a faithful replacement for formula/diagram layout.'],
];
for(const a of manual)add('8D-'+a[0],...a.slice(1));
const rules=[
 ['oral_aural_performance',/\b(listen\w*|speak\w*|oral|articulat\w*|conversation\w*|pronounc\w*|dialogue\w*|debate\w*)\b/i,['oral_response','observed_performance']],
 ['written_composition',/\b(writ\w*|written|compos\w*|draft\w*|paragraph\w*|letter\w*|article\w*|poster\w*|summaris\w*)\b/i,['constructed_response']],
 ['explanation_reasoning',/\b(explain\w*|discuss\w*|describ\w*|justify\w*|compar\w*|analys\w*|evaluat\w*|interpret\w*)\b/i,['explanation']],
 ['identification_classification',/\b(classif\w*|identify\w*|list\w*|recognis\w*|distinguish\w*|name|state)\b/i,['classification','short_answer']],
 ['mathematical_reasoning',/\b(calculate\w*|simplif\w*|solve\w*|equation\w*|fraction\w*|ratio\w*|gradient\w*|surds|vector\w*|probabilit\w*)\b/i,['worked_solution','explanation']],
 ['diagram_graph_model',/\b(draw\w*|diagram\w*|plot\w*|graph\w*|chart\w*|grid\w*|sketch\w*|model\w*)\b/i,['constructed_response','observed_performance']],
 ['practical_observation',/\b(experiment\w*|compass\w*|ruler|assembl\w*|manufactur\w*|construct\w*|observ\w*|demonstrat\w*|plant\w*|perform\w*)\b/i,['observed_performance']],
 ['investigation_project',/\b(research\w*|investigat\w*|survey\w*|questionnaire\w*|portfolio\w*|report\w*|project\w*)\b/i,['project_or_investigation','constructed_response']],
 ['digital_artifact',/\b(software|MS-?Word|MS-?Excel|Publisher|PowerPoint|spreadsheet\w*|word processing|pivot|blog\w*|file management|robot\w*)\b/i,['digital_artifact','observed_performance']],
 ['algorithm_execution',/\b(algorithm\w*|flowchart\w*|pseudocode|sequence|selection|iteration|programming|programme)\b/i,['algorithm_trace','constructed_response']],
];
function hierarchyKey(code){return code.replace(/^B\.([89])/,'B$1').replace(/^B82\./,'B8.2.');}
const resolvedHeadings={
 '8:english:B8.2.2':{sub_title:'Summarising',pdf_page:36,excerpt:'Reading 1. Comprehension 2. Summarising'},
 '9:english:B9.5.1':{strand_title:'Literature',sub_title:'Narrative, Drama and Poetry',pdf_page:36,excerpt:'Literature 1. Narrative, Drama and Poetry'},
 '8:science:B8.5.6':{sub_title:'Soil as a Component of the Environment',pdf_page:37,excerpt:'6. Soil as a Component of the Environment'},
};
const allMappings=[];
for(const grade of[8,9]){
 const inventory=load(`basic${grade}-curriculum-inventory.json`),mapping={schema_version:1,phase:'8D',grade:`Basic ${grade}`,status:'documentation_only_not_registered',
  identity_policy:'One proposed competency per physical leading indicator entry. Subject/grade and pinned-source page/row identify the entry; printed codes are labels, never global identities. Do not reuse these IDs for a changed source edition/objective.',
  proposed_context:{curriculum_version_id:'curriculum-version-gh-nacca-ccp-2020',phase_id:'phase-gh-jhs-ccp',grade_and_runtime_level_id:`level-gh-basic-${grade}-ccp`,status:'proposed_unregistered'},
  inventory_sha256:sha(readFileSync(join(here,`basic${grade}-curriculum-inventory.json`))),subjects:[]};
 for(const s of inventory.subjects){
  const subject={id:s.id,subject:s.subject,proposed_subject_id:`subject-gh-basic${grade}-${s.id}-ccp`,source_document:s.document,assessment_guidance_pages:s.assessment_guidance.map(a=>({pdf_page:a.pdf_page,printed_page:a.printed_page})),entries:[]};
  for(const r of s.indicators){
   const st=s.content_standards.find(st=>st.official_code===r.content_standard_code_as_printed),key=hierarchyKey(st.official_code),parts=key.split('.'),strandKey=parts.slice(0,2).join('.'),subKey=parts.slice(0,3).join('.');
   if(!new RegExp(`^B${grade}(?:\\.\\d+){3}$`).test(key))throw Error(`Unmapped parent structure: ${st.official_code}`);
   const attached=issues.filter(i=>i.subject===s.id&&i.grades.includes(grade)&&i.affected_entries.includes(r.entry_id)).map(i=>i.id);
   for(const flag of r.flags){
    if(flag.includes('missing')||flag.includes('mismatched_explicit'))continue;
    if(flag==='indicator_prefix_differs_from_displayed_parent'&&hierarchyKey(r.official_code.split('.').slice(0,-1).join('.'))===key)continue;
    const id=`8D-${grade}-${s.id}-${flag}`;let issue=issues.find(i=>i.id===id);
    if(!issue){add(id,s.id,[grade],'unresolved',`${flag}: printed codes and every physical entry are preserved; no publisher replacement code is inferred.`,[],[]);issue=issues.at(-1);}
    issue.affected_entries.push(r.entry_id);issue.source_pdf_pages=[...new Set([...issue.source_pdf_pages,r.pdf_page])];attached.push(id);
   }
   if(key!==st.official_code){
    const id=`8D-${grade}-${s.id}-standard-format-${st.official_code}`;
    if(!issues.some(i=>i.id===id))add(id,s.id,[grade],'resolved_structural_formatting',`Printed parent ${st.source_code_raw} is retained; internal hierarchy key ${key} preserves its source digits with separators. This is a FILUMIRE structural key, not an official corrected code.`,st.source_pages,[],'Retain source spelling and formatting provenance.');attached.push(id);
   }
   const resolution=resolvedHeadings[`${grade}:${s.id}:${subKey}`];
   if(resolution){const id=`8D-${grade}-${s.id}-scope-heading-${subKey}`;if(!issues.some(i=>i.id===id))add(id,s.id,[grade],'resolved_from_same_PDF','A detailed-table heading is missing; the original scope and sequence explicitly supplies the corresponding title. Detailed-table null and preceding context remain in the inventory.',[resolution.pdf_page,r.pdf_page],[],'Use the source-backed scope title only; do not assert it appeared in the detailed table.');attached.push(id);}
   const noHeading=(!r.strand_heading&&!resolution?.strand_title)||(!r.sub_strand_heading&&!resolution?.sub_title);
   if(noHeading){const id=`8D-${grade}-${s.id}-missing-heading-${subKey}`;if(!issues.some(i=>i.id===id))add(id,s.id,[grade],'unresolved','An explicit hierarchy heading is absent; title remains null.',[r.pdf_page],[r.entry_id],'Obtain source clarification; never invent an official title.');attached.push(id);}
   const requirements=[];
   for(const[kind,regex,modes]of rules){
    let evidence=null;
    for(const region of r.source_regions){const excerpt=region.text.split('\n').find(t=>regex.test(t));if(excerpt){evidence={source_excerpt:excerpt,pdf_page:region.pdf_page,printed_page:String(region.pdf_page-(s.id==='english'?36:s.id==='mathematics'?30:s.id==='computing'?29:37))};break;}}
    if(evidence)requirements.push({kind,suggested_evidence_modes:modes,...evidence,interpretation:'Planning classification of explicit curriculum actions, not an official question format or a generated assessment.'});
   }
   if(!requirements.length)requirements.push({kind:'source_defined_performance',suggested_evidence_modes:['human_design_review'],source_excerpt:r.source_regions[0].text.split('\n')[0],pdf_page:r.pdf_page,printed_page:r.printed_page,interpretation:'Inspect original source performance before assessment design.'});
   const row={entry_id:r.entry_id,grade:`Basic ${grade}`,subject:s.subject,
    proposed_competency_id:`competency-gh-${s.id}-b${grade}-nacca2020-p${String(r.pdf_page).padStart(3,'0')}-r${r.entry_id.split('row')[1].padStart(2,'0')}`,
    proposed_indicator_node_id:`node-gh-b${grade}-${s.id}-indicator-p${r.pdf_page}-r${r.entry_id.split('row')[1]}`,
    proposed_competency_title:r.indicator_statement,
    source:{...s.document,pdf_page:r.pdf_page,printed_page:r.printed_page,continuation_pdf_pages:r.source_pages,original_printed_code:r.source_code_raw,whitespace_collapsed_code:r.official_code},
    numbering:{official_code_replaced:false,filumire_indicator_alias:null,policy:'Printed code unchanged; proposed ID determines uniqueness.'},
    hierarchy:{strand:{proposed_node_id:`node-gh-b${grade}-${s.id}-strand-${strandKey.replaceAll('.','-')}`,structural_key:strandKey,source_heading:r.strand_heading,title:r.strand_heading?.replace(/^STRAND\s*\d*\s*:\s*/i,'')??resolution?.strand_title??null,source_heading_page:r.strand_heading_source?.pdf_page??resolution?.pdf_page??null},
     sub_strand:{proposed_node_id:`node-gh-b${grade}-${s.id}-sub-strand-${subKey.replaceAll('.','-')}`,structural_key:subKey,source_heading:r.sub_strand_heading,title:r.sub_strand_heading?.replace(/^SUB[- ]?STRAND\s*\d*\s*:?\s*/i,'')??resolution?.sub_title??null,source_heading_page:r.sub_strand_heading_source?.pdf_page??resolution?.pdf_page??null,scope_resolution:r.sub_strand_heading?null:resolution??null},
     content_standard:{proposed_node_id:`node-gh-b${grade}-${s.id}-standard-${key.replaceAll('.','-')}`,structural_key:key,original_printed_code:r.displayed_content_standard.source_code_raw,displayed_statement_raw:r.displayed_content_standard.statement_raw,displayed_statement_pdf_page:r.displayed_content_standard.pdf_page,catalogue_source_pages:st.source_pages,all_displayed_variants:st.page_fragments,structural_key_is_not_an_official_code_correction:key!==st.official_code}},
    source_supported_activity_text:r.source_cell_text,source_activity_regions:r.source_regions.map(a=>({pdf_page:a.pdf_page,text:a.text})),
    assessment_requirements:requirements,assessment_guidance_pages:subject.assessment_guidance_pages,source_issue_ids:[...new Set(attached)],
    publication_status:'not_published',runtime_registered:false,lesson_content:null,assessment_items:null,prerequisites:null,difficulty:null,mastery_thresholds:null,
    review:{leading_statement_and_code_visually_checked:true,scope:'Rendered leading indicator headers plus positioned full-cell/source fragments. Not independent pedagogical or publisher certification.'}};
   row.mapping_status=attached.some(id=>issues.find(i=>i.id===id)?.status==='unresolved')?'mapped_with_unresolved_source_issue':'mapped';subject.entries.push(row);
  }
  subject.counts={indicator_entries:subject.entries.length,proposed_competencies:subject.entries.length,distinct_printed_codes:new Set(subject.entries.map(r=>r.source.whitespace_collapsed_code)).size,entry_specific_unresolved:subject.entries.filter(r=>r.mapping_status!=='mapped').length};mapping.subjects.push(subject);
 }
 save(`basic${grade}-filumire-mapping.json`,mapping);allMappings.push(mapping);
 const rows=mapping.subjects.flatMap(s=>s.entries.map(r=>({grade,subject:s.subject,entry_id:r.entry_id,proposed_competency_id:r.proposed_competency_id,indicator_statement:r.proposed_competency_title,strand_key:r.hierarchy.strand.structural_key,strand_title:r.hierarchy.strand.title,sub_strand_key:r.hierarchy.sub_strand.structural_key,sub_strand_title:r.hierarchy.sub_strand.title,standard_key:r.hierarchy.content_standard.structural_key,printed_standard_code:r.hierarchy.content_standard.original_printed_code,printed_standard_statement:r.hierarchy.content_standard.displayed_statement_raw,printed_indicator_code:r.source.original_printed_code,source_pdf:r.source.path,source_url:r.source.url,source_sha256:r.source.sha256,pdf_page:r.source.pdf_page,printed_page:r.source.printed_page,continuation_pdf_pages:r.source.continuation_pdf_pages.join(';'),assessment_requirements:r.assessment_requirements.map(a=>a.kind).join(';'),mapping_status:r.mapping_status,source_issue_ids:r.source_issue_ids.join(';')})));
 writeFileSync(join(here,`basic${grade}-filumire-mapping.csv`),csv(Object.keys(rows[0]),rows));
}
for(const issue of issues){
 issue.source_entry_details=allMappings.flatMap(m=>m.subjects.filter(s=>s.id===issue.subject).flatMap(s=>s.entries.filter(r=>issue.affected_entries.includes(r.entry_id)).map(r=>({entry_id:r.entry_id,grade:r.grade,printed_code:r.source.original_printed_code,displayed_parent_code:r.hierarchy.content_standard.original_printed_code,statement:r.proposed_competency_title,pdf_page:r.source.pdf_page,printed_page:r.source.printed_page,cross_grade_references:load(`basic${r.grade.at(-1)}-curriculum-inventory.json`).subjects.find(q=>q.id===s.id).indicators.find(q=>q.entry_id===r.entry_id).cross_grade_references??[]}))));
 issue.affected_printed_codes=[...new Set(issue.source_entry_details.map(r=>r.printed_code))];
}
save('basic89-source-issues.json',{schema_version:1,policy:'No official indicator code is repaired or renumbered. Source-supported hierarchy resolutions are explicit. Global authenticity/edition/assessment blockers apply even to entries without row-specific issues.',issues});
const b7=load('basic7-filumire-mapping.json',sourceBase),coverage=[];
for(const grade of[7,8,9]){
 const data=grade===7?b7:allMappings.find(m=>m.grade===`Basic ${grade}`);
 for(const s of data.subjects){const count=s.entries.length;coverage.push({grade:`Basic ${grade}`,subject:s.subject,indicator_entries:count,mapped_entries:count,proposed_unique_competencies:new Set(s.entries.map(r=>r.proposed_competency_id)).size,distinct_printed_codes:new Set(s.entries.map(r=>grade===7?r.source.phase8a_whitespace_collapsed_code:r.source.whitespace_collapsed_code)).size,coverage_percent:100,basis:grade===7?'unchanged_Phase8B_carry_forward':'Phase8D_reviewed_source_entries',status:'documentation_mapping_only'});}
}
save('basic7-9-coverage.json',{schema_version:1,policy:'Counts are physical printed indicator entries; repeated/conflicting source codes remain separate. 100% means documentation mapping coverage of these pinned PDFs, not production support, independent learning objectives or independent source authentication.',rows:coverage,total_entries:coverage.reduce((a,r)=>a+r.indicator_entries,0),new_basic8_9_entries:390});
writeFileSync(join(here,'basic7-9-coverage.csv'),csv(Object.keys(coverage[0]),coverage));
console.log(JSON.stringify({coverage,source_issue_groups:issues.length,new_unique_ids:new Set(allMappings.flatMap(m=>m.subjects.flatMap(s=>s.entries.map(r=>r.proposed_competency_id)))).size},null,2));
