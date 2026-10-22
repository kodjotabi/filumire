import fs from 'node:fs';
import assert from 'node:assert/strict';
const base = 'docs/audits/basic4-6-completion', out = `${base}/reconciliation`;
const read = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const write = (file, data) => fs.writeFileSync(`${out}/${file}`, JSON.stringify(data, null, 2) + '\n');
const csv = rows => { const keys = [...new Set(rows.flatMap(Object.keys))]; return [keys, ...rows.map(r => keys.map(k => typeof r[k] === 'object' ? JSON.stringify(r[k]) : r[k] ?? ''))].map(r => r.map(v => `"${String(v).replaceAll('"', '""')}"`).join(',')).join('\n') + '\n'; };
const original = read(`${base}/coverage-matrix.json`).rows;
const specs = read(`${base}/catalogues.json`).flatMap(c => c.specs);
const occurrences = read(`${out}/positioned-indicator-occurrences.json`);
const manifest = read(`${out}/source-manifest.json`).sources;
const baselineContent = read(`${base}/seeded-content.json`);
const correctionFile = `${out}/corrected-science-content.json`;
const updated = fs.existsSync(correctionFile) ? read(correctionFile) : [];
const content = [...baselineContent.filter(c => !updated.some(u => u.id === c.id)), ...updated];
// Explicit, inspected associations. Internal IDs and printed source codes remain separate.
const decisions = [
 ['competency-gh-english-b4-1-7-1-1',33,'B4.1.7.1','Four-part code printed in indicator column; no fifth segment invented.'],
 ['competency-gh-english-b4-3-4-1-1',63,'B4.3.4.1.1.1','Adjacent printed “. 1.” may be list enumeration; preserve raw string and flag ambiguity.'],
 ['competency-gh-english-b5-4-9-3-2',151,'B4.4.9.3.2','B4 prefix printed in Basic 5 section; section and editing objective establish association.'],
 ['competency-gh-english-b6-2-4-1-1',194,'B6.2.3.1.1','Same code also labels minimal pairs on PDF193; separate objectives and internal IDs.'],
 ['competency-gh-english-b6-4-10-1-1',227,null,'Reflective Writing is uncoded under standard B6.4.10.1; local code is not an official printed indicator.'],
 ['competency-gh-english-b6-5-5-1-1',239,'B6.5.5.1','Four-part code in indicator column; preserve original.'],
 ['competency-gh-math-b5-3-2-2-2',122,'B5.3.3.2.2','Printed indicator prefix differs from table standard B5.3.2.2.'],
 ['competency-gh-math-b5-3-2-2-4',123,'B5.3.3.2.4','Printed indicator prefix differs from table standard B5.3.2.2.'],
 ['competency-gh-math-b6-1-2-6-1',149,'B6.1.1.6.1','Printed code retained; table standard is B6.1.2.6.'],
 ['competency-gh-math-b6-1-2-6-3',151,'B6.1.1.4.3','Printed code retained; table standard is B6.1.2.6.'],
 ['competency-gh-math-b6-3-3-5-2',168,'B6.3.3.5.1','Printed code is shared with cardinal directions on PDF167; match the reflection objective.'],
 ['competency-gh-math-b6-3-3-5-3',171,'B6.3.3.5.2','Printed image-identification code differs from local normalised code.'],
 ['competency-gh-math-b6-4-1-2-2',176,'B6.5.2.2','Four-part questionnaire code printed under table standard B6.4.1.2.'],
 ['competency-gh-math-b6-4-2-2-3',182,'P6.4.2.2.3','P6 prefix printed in Basic 6 table; do not rewrite it to B6.'],
 ['competency-gh-science-b6-2-1-3-1',58,'2.1.3.1','Indicator is printed without a grade prefix under B6.2.1.3.'],
 ['competency-gh-science-b6-5-3-1-1',67,'5.3.1.1','Indicator is printed without a grade prefix under B6.5.3.1.'],
 ['competency-gh-computing-b5-6-9-1-1',48,'B5.6.4.9.1.1','Six-part printed indicator under Digital Literacy; preserve extra segment.'],
];
// Identical/repeated objectives, not new coverage. Retain each physical occurrence.
const repeated = [
 ['mathematics',4,59,67,'B4.3.2.1.1','B4.3.3.1.1'],
 ['mathematics',5,88,98,'B5.1.2.2.1','B5.1.2.1.1'],
 ['english',6,211,211,'B6.3.5.1.4','B6.3.5.1.4'],
 ['english',6,225,226,'B6.4.9.3.1','B6.4.9.3.1'],
 ['english',6,225,227,'B6.4.9.3.2','B6.4.9.3.2'],
];
const parent = new Map(occurrences.map(r => [r.id, r.id]));
for (const [subject,grade,p1,p2,c1,c2] of repeated) {
 const first = occurrences.find(r => r.subject === subject && r.grade === grade && r.pdfPage === p1 && r.code === c1);
 const next = occurrences.find(r => r.subject === subject && r.grade === grade && r.pdfPage === p2 && r.code === c2 && r.id !== first?.id);
 assert(first && next, `Missing inspected repeated objective ${subject} ${c1}`); parent.set(next.id, first.id);
}
const tokens = text => new Set((text ?? '').toLowerCase().replace(/[^a-z0-9]+/g,' ').split(/\s+/).filter(w => w.length > 2 && !['the','and','for','with','from','that','using','into','their','them'].includes(w)));
const score = (a,b) => { const x=tokens(a), y=tokens(b); return [...x].filter(w => y.has(w)).length / Math.max(1, Math.min(x.size,y.size)); };
const rows = original.map(row => {
 const spec = specs.find(s => s.competencyId === row.competency_id);
 const objective = spec?.statement ?? spec?.description ?? row.title;
 const decision = decisions.find(d => d[0] === row.competency_id);
 let refs = [];
 if (decision) {
   refs = occurrences.filter(r => r.subject === row.discipline && r.grade === row.grade && r.pdfPage === decision[1] && r.code === decision[2]);
   assert.equal(refs.length,1,`Inspected association ${row.competency_id}`);
 } else for (const code of row.official_codes_claimed) {
   const candidates = occurrences.filter(r => r.subject === row.discipline && r.grade === row.grade && r.code === code).sort((a,b) => score(objective,b.statement)-score(objective,a.statement));
   if (row.competency_id === 'competency-gh-computing-b6-1-1-1-3') refs.push(...candidates); // explicit combined mouse/delete objective
   else if (candidates[0]) refs.push(candidates[0]);
 }
 refs = [...new Map(refs.map(r => [r.id,r])).values()];
 const items=content.filter(c=>c.competencyId===row.competency_id), questions=items.filter(c=>c.assessmentItemId);
 const modes = new Set();
 const sourceText=refs.map(r=>r.statement).join(' ');
 if (/\b(sing|recite|discuss|conversation|speak|oral|role.play|retell|debate|aloud|tell)\b/i.test(sourceText)||spec?.responseMode==='oral_response') modes.add('oral_or_observed_response_review');
 if (/\b(write|compose|draft|proofread|edit|paragraph|sentence|essay|poem|report)\b/i.test(sourceText)||spec?.responseMode==='written_response') modes.add('written_or_composed_response_review');
 if (/\b(model|construct|draw|measure|demonstrate|investigate|plot|design|administer|collect|experiment|observe|classify|plant|practical|type|insert|format|print|delete|copy|paste|mouse|ribbon)\b/i.test(sourceText)) modes.add('practical_or_observed_task_review');
 const diagnosedText=questions.map(q=>q.metadata?.diagnosticRules??'').join(' ');
 const missingMisconceptions=row.misconception_ids.filter(m=>!diagnosedText.includes(m));
 return { ...row, source_alignment: refs.length ? 'page_traceable_association_content_alignment_not_educator_approved' : 'unresolved_no_source_association',
   official_source_denominator_status: 'positioned_source_inventory_with_explicit_repetitions_and_printed_anomalies',
   mapping_status: decision ? decision[2] === null ? 'uncoded_source_activity_local_code_not_printed' : 'local_code_differs_or_is_ambiguously_printed' : 'printed_code_association',
   source_note: decision?.[3] ?? null, source_references: refs.map(r=>({ occurrenceId:r.id, requirementId:parent.get(r.id), sourceId:r.subject, sourceSha256:manifest.find(s=>s.subject===r.subject).sha256,
     printedCode:r.code, rawPrintedCode:r.rawCode, pdfPage:r.pdfPage, printedPage:r.printedPage, tableContentStandard:r.tableContentStandard,
     sourceStrand:r.strand,sourceSubStrand:r.subStrand,statement:r.statement,sourceFlags:r.sourceFlags,
     textualOverlapDiagnostic:score(objective,r.statement), humanAlignmentApproval:null })),
   educational_review_status:'pending_qualified_educator_approval', translation_review_status:'authored_bilingual_strings_present_not_human_approved',
   evidence_mode_review_candidates:[...modes], seeded_trusted_rubric_questions:questions.filter(q=>q.metadata?.evaluationMethod==='trusted_rubric_evaluation').length,
   unreferenced_declared_misconception_tags:missingMisconceptions, teaching_content_snapshot:updated.some(c=>c.competencyId===row.competency_id)?'corrected_current_runtime_records':'existing_seeded_audit_snapshot_unchanged_source',
 };
});
const requirements=[];
for(const r of occurrences) {
 const key=parent.get(r.id);let req=requirements.find(q=>q.id===key);
 if(!req){req={id:key,subject:r.subject,grade:r.grade,statement:r.statement,sourceOccurrences:[],competencyIds:[],coverageStatus:'unmapped_source_requirement'};requirements.push(req);}
 req.sourceOccurrences.push({id:r.id,printedCode:r.code,rawPrintedCode:r.rawCode,pdfPage:r.pdfPage,printedPage:r.printedPage,tableContentStandard:r.tableContentStandard,sourceFlags:r.sourceFlags,strand:r.strand,subStrand:r.subStrand});
}
for(const req of requirements){req.competencyIds=rows.filter(row=>row.source_references.some(r=>r.requirementId===req.id)).map(row=>row.competency_id);if(req.competencyIds.length)req.coverageStatus='associated_existing_competency_educational_completeness_unverified';}
const summaries=[4,5,6].flatMap(grade=>['english','mathematics','science','computing'].map(subject=>{const comps=rows.filter(r=>r.grade===grade&&r.discipline===subject),req=requirements.filter(r=>r.grade===grade&&r.subject===subject);return {grade,subject,runtimeCompetencies:comps.length,sourceOccurrences:occurrences.filter(r=>r.grade===grade&&r.subject===subject).length,distinctSourceObjectives:req.length,sourceObjectivesWithAssociation:req.filter(r=>r.competencyIds.length).length,unmappedSourceObjectives:req.filter(r=>!r.competencyIds.length).length,untraceableCompetencies:comps.filter(r=>!r.source_references.length).length,printedCodeDiscrepancyCompetencies:comps.filter(r=>r.mapping_status!=='printed_code_association').length,evidenceModeReviewCandidates:comps.filter(r=>r.evidence_mode_review_candidates.length).length,missingSubskillTags:comps.filter(r=>r.missing_subskill_tags.length).length,unreferencedMisconceptionTags:comps.filter(r=>r.unreferenced_declared_misconception_tags.length).length,educatorApproved:0,translationApproved:0};}));
write('competency-matrix.json',{scope:'All 862 current competencies; source association does not certify independent performance or teacher approval',rows});
fs.writeFileSync(`${out}/competency-matrix.csv`,csv(rows));write('source-objective-matrix.json',requirements);fs.writeFileSync(`${out}/source-objective-matrix.csv`,csv(requirements));
write('summary.json',summaries);write('review-decisions.json',{inspectedAssociations:decisions,repeatedObjectives:repeated,policy:'Preserve printed codes, malformed strings and internal IDs; these evidence records do not change runtime mappings.'});
write('unmapped-source-objectives.json',requirements.filter(r=>!r.competencyIds.length));
write('mapping-review-queue.json',rows.filter(r=>r.mapping_status!=='printed_code_association'||r.source_references.some(s=>s.sourceFlags.length)||r.source_references.some(s=>s.textualOverlapDiagnostic<0.35)));
const questions=content.filter(c=>c.assessmentItemId), byId=new Map(content.map(c=>[c.id,c]));
const invalidOptions=[], translationMismatches=[];
for(const q of questions){
 const options=JSON.parse(q.metadata?.options??'[]');
 if(q.assessmentStrategy==='multiple_choice'&&(options.length<2||!options.includes(q.metadata?.expectedResponse)||new Set(options).size!==options.length))invalidOptions.push(q.id);
 if(q.language==='fr'&&q.translationOfContentId){const en=byId.get(q.translationOfContentId);if(en){const enOptions=JSON.parse(en.metadata?.options??'[]');if(options.length!==enOptions.length||options.indexOf(q.metadata?.expectedResponse)!==enOptions.indexOf(en.metadata?.expectedResponse))translationMismatches.push(q.id);}}
}
write('educational-review.json',{
 scope:'Automated checks over all current seeded content, source action triage, and targeted desk review; not educator or native-language approval',
 competencies:rows.length,contentRecords:content.length,questions:questions.length,
 strategies:Object.fromEntries([...new Set(questions.map(q=>q.assessmentStrategy))].map(s=>[s,questions.filter(q=>q.assessmentStrategy===s).length])),
 trustedRubricQuestions:questions.filter(q=>q.metadata?.evaluationMethod==='trusted_rubric_evaluation').length,
 missingRepresentationMetadata:questions.filter(q=>!q.metadata?.evidenceRepresentation).length,
 evidenceModeReviewCandidates:rows.filter(r=>r.evidence_mode_review_candidates.length).map(r=>({id:r.competency_id,grade:r.grade,subject:r.discipline,modes:r.evidence_mode_review_candidates,source:r.source_references.map(s=>({page:s.pdfPage,code:s.printedCode,statement:s.statement}))})),
 missingSubskillTagCompetencies:rows.filter(r=>r.missing_subskill_tags.length).map(r=>({id:r.competency_id,grade:r.grade,subject:r.discipline,subskills:r.missing_subskill_tags})),
 unreferencedMisconceptionTags:rows.filter(r=>r.unreferenced_declared_misconception_tags.length).map(r=>({id:r.competency_id,tags:r.unreferenced_declared_misconception_tags})),
 bilingualAuthoredModulesPresent:rows.filter(r=>r.authored_source_files.length&&r.en_lesson&&r.fr_lesson).length,
 identicalFullLessonLanguageBodies:content.filter(c=>c.type==='lesson'&&c.language==='fr'&&content.some(e=>e.type==='lesson'&&e.competencyId===c.competencyId&&e.language==='en'&&e.body===c.body)).map(c=>c.id),
 invalidMultipleChoiceOptions:invalidOptions,translationOptionCountOrAnswerIndexMismatch:translationMismatches,
 officialAssessmentGuidance:[{subject:'english',pdfPage:13},{subject:'mathematics',pdfPage:14},{subject:'science',pdfPage:14},{subject:'computing',pdfPage:13}],
 sourceExemplarPolicy:'Specific source exemplars support activity design; a qualified educator must decide the sufficient evidence and rubric. Heuristics are not mandatory NaCCA rubric assignments.',
 ghanaContextDeskReview:'Existing samples use cedis, local names, markets, kenkey, cocoa, maize and Akosombo. No automated keyword count is treated as cultural or age-appropriateness approval.',
 progression:'Within-grade prerequisites exist. Cross-grade concept progression and depth require subject-specialist review; guardian grade placement and adaptive thresholds unchanged.',
 translations:'Separate authored French instructional strings are present. English target-language passages within French English lessons are intentional candidates for review, not automatically fallbacks. French teaching quality is not certified.',
 approvals:{educator:0,translation:0},
 acceptanceCriteria:['Every in-scope source objective has an explicit source occurrence and a justified mapping; unresolved printed codes remain visible.','Oral, written and practical outcomes require independently produced work or an existing trusted teacher review when selected responses cannot demonstrate them.','Guided retries remain guided evidence; no labels, scores, approvals or observed performances are manufactured.','A Ghanaian subject educator and French-language reviewer approve content accuracy, age progression, context, distractors and accessible alternatives before pilot readiness is claimed.'],
});
write('source-review-notes.json',[
 {subject:'computing',pdfPage:23,issue:'Basic 4 Strand 1 is headed WORD PROCESSING while its indicators concern introductory computing.',disposition:'Literal source heading retained; curriculum authority/educator review required, no replacement heading invented.'},
 {subject:'mathematics',pdfPages:[165,166],issue:'No sub-strand heading was extracted at the Basic 6 prism tables.',disposition:'Source heading remains null and flagged; local navigation title is not presented as a verified source quotation.'},
 {subject:'mathematics',pdfPage:178,printedCode:'P6.5.2.2.3',issue:'Unresolved inline source cross-reference; not an indicator declaration.',disposition:'Recorded in independent printed-code index; not converted into an invented additional indicator.'},
]);
console.log(JSON.stringify({competencies:rows.length,sourceOccurrences:occurrences.length,distinctSourceObjectives:requirements.length,unmapped:requirements.filter(r=>!r.competencyIds.length).map(r=>({subject:r.subject,grade:r.grade,source:r.sourceOccurrences,statement:r.statement.slice(0,180)})),summaries},null,2));
