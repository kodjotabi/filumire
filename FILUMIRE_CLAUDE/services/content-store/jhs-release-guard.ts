import type {ApprovedJhsRelease} from './jhs-release-types';
import {CCP_SOURCE_REGISTRATIONS,getCcpBlockingSourceIssueIds,GHANA_CCP_RUNTIME_ID,GHANA_CCP_EDUCATION_SYSTEM_ID} from '../../packages/curriculum/ghana-ccp-runtime';
import originalManifest from '../../packages/curriculum/jhs-private-manifest.json';
import approvedManifest from '../../packages/curriculum/jhs-approved-manifest.json';
import {jhsValidationFingerprint} from './jhs-validation-fingerprint';
const sha=/^[a-f0-9]{64}$/;
export function validateApprovedJhsRelease(release:ApprovedJhsRelease,scope:readonly {competencyId:string;gradeId:string;subjectId:string;contentFingerprint:string}[]=approvedManifest){
 if(release.schemaVersion!==1||!release.version)throw Error('Unsupported approved JHS release');
 const ids=new Set<string>(),recordIds=new Set<string>();
 if(scope.length!==release.units.length)throw Error('Approved JHS scope/release mismatch');
 for(const unit of release.units){
  const c=unit.competency,source=CCP_SOURCE_REGISTRATIONS.find(s=>s.id===c.id);
  if(!source||getCcpBlockingSourceIssueIds(source.sourceIssueIds).length||originalManifest.some(m=>m.competencyId===c.id)||ids.has(c.id))throw Error('Ineligible approved JHS identity');
  ids.add(c.id);
  if(c.curriculumFrameworkId!==GHANA_CCP_RUNTIME_ID||c.educationSystemId!==GHANA_CCP_EDUCATION_SYSTEM_ID||c.learningLevelId!==source.gradeId||c.subjectId!==source.subjectId||c.learningIndicatorId!==source.curriculumNodeId||c.strandId!==source.hierarchy.strandId||c.subStrandId!==source.hierarchy.subStrandId||c.contentStandardId!==source.hierarchy.contentStandardId)throw Error('Approved JHS source/hierarchy mismatch');
  if(!sha.test(unit.candidateSha256)||unit.approvals.length!==2||new Set(unit.approvals.map(a=>a.role)).size!==2||new Set(unit.approvals.map(a=>a.reviewerId)).size!==2)throw Error('Missing independent educational/French approvals');
  for(const role of ['subject_educator','french_reviewer'])if(!unit.approvals.some(a=>a.role===role&&a.reviewerId.trim()&&sha.test(a.evidenceSha256)&&a.reviewedBundleSha256===unit.candidateSha256))throw Error('Invalid JHS review evidence');
  const row=scope.find(m=>m.competencyId===c.id);
  if(!row||row.gradeId!==source.gradeId||row.subjectId!==source.subjectId||row.contentFingerprint!==unit.fingerprint||jhsValidationFingerprint(c,unit.content)!==unit.fingerprint)throw Error('Approved JHS fingerprint mismatch');
  for(const record of unit.content){
   if(record.competencyId!==c.id||recordIds.has(record.id)||record.metadata?.educatorApproval!=='approved'||record.metadata?.frenchApproval!=='approved'||record.metadata?.sourceDocumentSha256!==source.source.sha256)throw Error('Unapproved, mismatched or duplicate JHS content');
   recordIds.add(record.id);
   if(record.type==='assessment'&&(record.metadata.evaluationMethod!=='trusted_rubric_evaluation'||record.metadata.evidenceRole||record.metadata.reviewEvidencePolicy!=='jhs-required-performance-v1'))throw Error('Required JHS evidence cannot become automatic or optional');
  }
  for(const language of ['en','fr']){
   const records=unit.content.filter(r=>r.language===language);
   for(const type of ['lesson','example','scaffold','remediation','practice'])if(!records.some(r=>r.type===type))throw Error('Incomplete JHS teaching bank');
   for(const purpose of ['diagnostic','reassessment','retention','transfer'])if(records.filter(r=>r.type==='assessment'&&r.metadata?.assessmentPurpose===purpose).length!==2)throw Error('Incomplete JHS evidence bank');
  }
 }
 return {competencies:release.units.map(u=>u.competency),content:release.units.flatMap(u=>u.content)};
}
