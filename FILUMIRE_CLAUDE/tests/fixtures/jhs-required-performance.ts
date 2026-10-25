import type {LearningContent} from '../../packages/content';
import type {CompetencyDefinition} from '../../packages/curriculum';
import {CCP_SOURCE_REGISTRATIONS,GHANA_CCP_RUNTIME_ID,GHANA_CCP_EDUCATION_SYSTEM_ID} from '../../packages/curriculum/ghana-ccp-runtime';
import {competency as policy} from '../../services/content-store/ghana-b7-materials-pilot';
import {jhsValidationFingerprint} from '../../services/content-store/jhs-validation-fingerprint';
// Fictional process-only fixtures. They contain no authored review banks,are
// never imported by application code,and cannot create a deployed approval.
export function buildIntegrationPacket(){
 const bundles=[8,9].map(grade=>{
  const id=grade===9?'competency-gh-english-b9-nacca2020-p125-r01':'competency-gh-english-b8-nacca2020-p074-r02';
  const s=CCP_SOURCE_REGISTRATIONS.find(s=>s.id===id)!;if(!s)throw Error('Fixture source missing');
  const competency:CompetencyDefinition={...structuredClone(policy),id,curriculumFrameworkId:GHANA_CCP_RUNTIME_ID,educationSystemId:GHANA_CCP_EDUCATION_SYSTEM_ID,learningLevelId:s.gradeId,subjectId:s.subjectId,strandId:s.hierarchy.strandId,subStrandId:s.hierarchy.subStrandId,contentStandardId:s.hierarchy.contentStandardId,learningIndicatorId:s.curriculumNodeId,prerequisiteCompetencyIds:[],successorCompetencyIds:[],relatedCompetencyIds:[],assessmentScope:'full'};
  const content:LearningContent[]=(['en','fr'] as const).flatMap(language=>{
   const record=(key:string,type:LearningContent['type'],purpose?:string):LearningContent=>({id:`fictional-required-${grade}-${key}-${language}`,competencyId:id,type,title:'Fictional validation task',body:language==='en'?'Fictional original writing for process validation;never a learner curriculum task.':'Production fictive pour validation technique ;jamais une activité publiée.',language,version:'fictional-test-only',createdAt:'2026-10-01T00:00:00Z',updatedAt:'2026-10-01T00:00:00Z',...(purpose?{assessmentItemId:`fictional-item-${grade}-${key}-${language}`,assessmentStrategy:'constructed_response' as const}:{}),metadata:{expectedResponse:'rubric_evaluated_performance',evaluationMethod:'trusted_rubric_evaluation',reviewEvidencePolicy:'jhs-required-performance-v1',evidenceIndependence:'independent',educatorApproval:'pending',frenchApproval:'pending',sourceDocumentSha256:s.source.sha256,requiresObservation:'true',requiresOriginalWriting:'true',requiresArtefact:'true',rubricCriteria:JSON.stringify(['Fictional criterion for testing original writing.','Fictional criterion for testing inspected revision.']),rubricAnswerGuide:'Fictional teacher-only expected performance,not an answer-matching key.',...(purpose?{assessmentPurpose:purpose}:{})}});
   return [...(['lesson','example','scaffold','remediation','practice'] as const).map(type=>record(type,type)),...['diagnostic','reassessment','retention','transfer'].flatMap(p=>[1,2].map(n=>record(`${p}-${n}`,'assessment',p)))];
  });
  return {id,gradeId:s.gradeId,subjectId:s.subjectId,sourceEntryId:s.sourceEntryId,sourceSha256:s.source.sha256,competency,content,bundleSha256:jhsValidationFingerprint(competency,content)};
 });
 return {bundles};
}
