import {createHash,createHmac,timingSafeEqual} from 'node:crypto';
import type {LearningIntervention} from '../../packages/domain/intervention';
import type {PilotMeasurementEventRecord} from '../persistence';
import {persistenceStore} from '../persistence-provider';
import {getLearnerInterventions} from '../intervention-store';
import {getEvidenceForLearner} from '../evidence-store';
import {evaluateInterventionEvidence} from '../intervention';
import {getPrincipalAuthSession} from '../auth-session';
import {getPilotMeasurementEvents,recordPilotMeasurementEvent} from '../pilot-measurement';
import {accountStore} from '../account/store';
import {AccountForbiddenError} from '../account';
import {getContentForCompetency} from '../content-store';
import {OPTIONAL_TEACHER_EXTENSION} from '../content-store/evidence-role';

const SOURCE='guardian-tutor-recovery-v1';
type Binding={id:string;competencyId:string;sessionId:string;startedAt:string};
type Proof={version:1;learnerId:string;guardianId:string;requestId:string;bindings:Binding[]};
const binding=(i:LearningIntervention):Binding=>({id:i.interventionId,competencyId:i.competencyId,sessionId:i.sessionId,startedAt:i.startedAt});
const matches=(b:Binding,i:LearningIntervention)=>JSON.stringify(b)===JSON.stringify(binding(i));
function key(){const value=process.env.FILUMIRE_AUTH_JWT_SECRET;if(!value||value.length<32)throw Error('Production authentication is unavailable.');return value;}
function signature(payload:string){return createHmac('sha256',key()).update(SOURCE+'\n'+payload).digest();}
function sign(proof:Proof){const payload=Buffer.from(JSON.stringify(proof)).toString('base64url');return payload+'.'+signature(payload).toString('base64url');}
function readProof(event:PilotMeasurementEventRecord):Proof|undefined{
 try{
  if(event.eventType!=='sync_completed'||event.metadata.source!==SOURCE||typeof event.metadata.proof!=='string'||event.metadata.proof.length>24000)return;
  const [payload,mac,extra]=event.metadata.proof.split('.');if(!payload||!mac||extra)return;
  const expected=signature(payload),actual=Buffer.from(mac,'base64url');if(actual.length!==expected.length||!timingSafeEqual(actual,expected))return;
  const p=JSON.parse(Buffer.from(payload,'base64url').toString()) as Proof;
  if(p.version!==1||p.learnerId!==event.learnerId||typeof p.guardianId!=='string'||typeof p.requestId!=='string'||!Array.isArray(p.bindings)||p.bindings.length>100)return;
  if(p.bindings.some(b=>!b||[b.id,b.competencyId,b.sessionId,b.startedAt].some(v=>typeof v!=='string'||!v||v.length>300)))return;
  return p;
 }catch{return;}
}
export async function readAssessmentRecovery(learnerId:string){
 const events=await getPilotMeasurementEvents(learnerId);
 const pendingReviews=await persistenceStore.getPendingTeacherReviews(learnerId);
 // Work waiting for an optional teacher extension review (Basic 7-9 Step 0) is not
 // on the learner's adaptive path, so it does not hold tutoring back. Unknown items stay protected.
 const optional=(review:{competencyId:string;assessmentItemId:string})=>getContentForCompetency(review.competencyId)
  .find(item=>item.assessmentItemId===review.assessmentItemId)?.metadata?.evidenceRole===OPTIONAL_TEACHER_EXTENSION;
 const pendingTeacherReview=pendingReviews.some(review=>review.status==='pending'&&!optional(review));
 const proofs=events.flatMap(event=>{const proof=readProof(event);return proof?[proof]:[];});
 const sessions=new Map<string,Awaited<ReturnType<typeof getPrincipalAuthSession>>>();
 async function live(sessionId:string){
  if(!sessions.has(sessionId))sessions.set(sessionId,await getPrincipalAuthSession(sessionId));
  const s=sessions.get(sessionId);
  return Boolean(s&&s.status==='active'&&!s.revokedAt&&Date.parse(s.expiresAt)>Date.now()&&
   await persistenceStore.isPrincipalAuthorizedForLearner(s.principalId,learnerId));
 }
 async function presented(i:LearningIntervention){
  for(const event of events){
   if(event.competencyId!==i.competencyId||!event.sessionId||event.createdAt<i.startedAt)continue;
   // Legacy adaptive events are ambiguous deliveries and remain protected.
   // New actual lesson deliveries bind the specific intervention as well.
   const decision=event.eventType==='adaptive_decision'&&
    (event.metadata.interventionId===i.interventionId||
     event.metadata.source!=='assessment-aware-decision-v1'&&typeof event.metadata.interventionId!=='string');
   if((decision||event.eventType==='learning_presented'&&event.metadata.interventionId===i.interventionId)&&await live(event.sessionId))return true;
  }
  return false;
 }
 async function ended(i:LearningIntervention){
  if(!sessions.has(i.sessionId))sessions.set(i.sessionId,await getPrincipalAuthSession(i.sessionId));
  const s=sessions.get(i.sessionId);
  // Missing session provenance is not proof that the activity ended.
  return Boolean(s&&(s.status==='revoked'||Boolean(s.revokedAt)||Date.parse(s.expiresAt)<=Date.now())&&
   await persistenceStore.isPrincipalAuthorizedForLearner(s.principalId,learnerId));
 }
 async function scoredPresentation(i:LearningIntervention){
  for(const event of events){
   if(event.eventType==='learning_presented'&&event.competencyId===i.competencyId&&event.sessionId&&
    event.metadata.source==='assessment-delivery-v1'&&event.metadata.interventionId===i.interventionId&&
    typeof event.metadata.assessmentItemId==='string'&&event.metadata.assessmentItemId&&await live(event.sessionId))return true;
  }
  return false;
 }
 const recovered=(i:LearningIntervention)=>proofs.some(p=>p.bindings.some(b=>matches(b,i)));
 return {events,proofs,pendingTeacherReview,live,presented,scoredPresentation,ended,recovered,
  fingerprint:createHash('sha256').update(JSON.stringify({events,pendingReviews})).digest('hex')};
}

/** Guardian-only append-only recovery. No intervention, state or evidence is rewritten. */
export async function recoverAssessmentContext(guardianId:string,learnerId:string,sessionId:string,requestId:string){
 const credential=await accountStore.getCredentialByPrincipal(guardianId);
 const access=await persistenceStore.getPrincipalLearnerAccess(guardianId,learnerId,'guardian');
 if(credential?.accountKind!=='guardian'||access?.status!=='active')throw new AccountForbiddenError('Only this learner\'s parent or guardian can recover tutoring.');
 const snapshot=await readAssessmentRecovery(learnerId);
 const prior=snapshot.proofs.find(p=>p.guardianId===guardianId&&p.requestId===requestId);
 if(prior)return {recovered:prior.bindings.length,alreadyRecorded:true};
 if(snapshot.pendingTeacherReview)return {recovered:0,alreadyRecorded:false};
 const interventions=await getLearnerInterventions(learnerId),evidence=await getEvidenceForLearner(learnerId);
 const eligible:Binding[]=[];
 for(const i of interventions){
  if(i.status!=='active'||['teach','remediate','teacher_review'].includes(i.type)||snapshot.recovered(i))continue;
  if(evidence.some(e=>e.interventionId===i.interventionId&&e.learnerId===learnerId&&e.competencyId===i.competencyId&&evaluateInterventionEvidence(i,e).outcome!=='not_yet_evaluated'))continue;
  if(await snapshot.ended(i)&&!await snapshot.presented(i))eligible.push(binding(i));
 }
 if(eligible.length>100)throw new AccountForbiddenError('This history needs a separate safety review.');
 if(!eligible.length)return {recovered:0,alreadyRecorded:false};
 const recorded=await recordPilotMeasurementEvent({learnerId,sessionId,eventType:'sync_completed',clientRequestId:`${SOURCE}:${guardianId}:${requestId}`,
  metadata:{source:SOURCE,proof:sign({version:1,learnerId,guardianId,requestId,bindings:eligible}),recoveredCount:eligible.length}});
 return {recovered:eligible.length,alreadyRecorded:recorded.duplicate};
}

/** An actual lesson response must establish delivery before it can be scored again. */
export async function recordAssessmentDelivery(learnerId:string,sessionId:string,interventionId:string|undefined,competencyId:string,content:{id:string;assessmentItemId?:string}|undefined){
 if(!interventionId||!content)return;
 await recordPilotMeasurementEvent({learnerId,sessionId,competencyId,eventType:'learning_presented',clientRequestId:`tutor-delivery:${sessionId}:${interventionId}:${content.id}`,
  metadata:{source:'assessment-delivery-v1',interventionId,contentId:content.id,assessmentItemId:content.assessmentItemId??''}});
}

export async function recoveredAssessmentDelivery(learnerId:string,sessionId:string,competencyId:string,assessmentItemId:string,interventionId?:string){
 const snapshot=await readAssessmentRecovery(learnerId);
 const affected=snapshot.proofs.flatMap(p=>p.bindings).filter(b=>b.competencyId===competencyId);
 if(!affected.length)return {required:false,allowed:true,interventionId};
 if(interventionId&&affected.some(b=>b.id===interventionId))return {required:true,allowed:false,interventionId:undefined};
 const delivery=[...snapshot.events].reverse().find(e=>e.eventType==='learning_presented'&&e.sessionId===sessionId&&e.competencyId===competencyId&&
  e.metadata.source==='assessment-delivery-v1'&&e.metadata.assessmentItemId===assessmentItemId&&typeof e.metadata.interventionId==='string'&&
  !affected.some(b=>b.id===e.metadata.interventionId)&&(!interventionId||e.metadata.interventionId===interventionId));
 return {required:true,allowed:Boolean(delivery&&await snapshot.live(sessionId)),interventionId:delivery?.metadata.interventionId as string|undefined};
}
