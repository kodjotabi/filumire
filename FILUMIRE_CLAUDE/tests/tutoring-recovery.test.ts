import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {POST as register} from '../apps/learner/app/api/account/register/route';
import {POST as addLearner} from '../apps/learner/app/api/account/learners/route';
import {POST as login} from '../apps/learner/app/api/session/login/route';
import {POST as logout} from '../apps/learner/app/api/session/logout/route';
import {POST as recover} from '../apps/learner/app/api/account/learners/[learnerId]/tutoring-recovery/route';
import {GET as learning,POST as submit} from '../apps/learner/app/api/learning/route';
import {POST as chat} from '../apps/learner/app/api/tutoring/conversation/route';
import {getLearnerStates,saveLearnerState} from '../services/learner-state-store';
import {getLearnerLearningContext,saveLearnerLearningContext} from '../services/learner-context';
import {getEvidenceForLearner} from '../services/evidence-store';
import {getLearnerInterventions,createIntervention} from '../services/intervention-store';
import {createPrincipalAuthSession,revokePrincipalAuthSession,getPrincipalAuthSession} from '../services/auth-session';
import {resolveSignedInSession} from '../services/identity';
import {createInitialLearnerState} from '../services/learner-state';
import {getDefaultLearnerLearningContext} from '../packages/curriculum-framework';
import {getCompetenciesForSubject} from '../packages/curriculum';
import {getContentForCompetency} from '../services/content-store';
import {seedContent} from '../services/content-store/seed';
import {getPilotMeasurementEvents,recordPilotMeasurementEvent} from '../services/pilot-measurement';
import {readAssessmentRecovery} from '../services/edututor/assessment-recovery';
import {createConversationHandler} from '../services/edututor/conversation-api';
import {loadConversationContext} from '../services/edututor/conversation-context';
assert.equal(process.env.FILUMIRE_PERSISTENCE,'memory');
Object.defineProperty(process.env,'NODE_ENV',{value:'production',configurable:true,writable:true,enumerable:true});
process.env.FILUMIRE_AUTH_JWT_SECRET='isolated-recovery-signing-secret-at-least-32';process.env.FILUMIRE_ACCOUNT_REGISTRATION='open';
const post=(path:string,body:unknown,cookie='',origin?:string)=>new Request('http://localhost'+path,{method:'POST',headers:{'content-type':'application/json',cookie,...(origin?{origin}:{})},body:JSON.stringify(body)});
const cookie=(response:Response)=>response.headers.get('set-cookie')!.split(';')[0];
const id=randomUUID().slice(0,8),password='fictional-recovery-test-password',username=`recovery.${id}`;
const registered=await register(post('/api/account/register',{email:`recovery-${id}@example.test`,password,displayName:'Fictional Guardian',preferredLanguage:'en',confirmsGuardian:true,acceptsNotice:true}));assert.equal(registered.status,201);const guardian=cookie(registered);
const added=await addLearner(post('/api/account/learners',{displayName:'Fictional Learner',username,password,preferredLanguage:'en',consentsToLearnerData:true},guardian));assert.equal(added.status,201);const {learnerId}=await added.json();
const signed=await login(post('/api/session/login',{login:username,password}));assert.equal(signed.status,200);let learnerCookie=cookie(signed);
let learnerIdentity=await resolveSignedInSession(new Request('http://localhost/api/session/me',{headers:{cookie:learnerCookie}}));
const defaults=getDefaultLearnerLearningContext(),math=getCompetenciesForSubject(defaults.activeSubjectId)[0],computing=getCompetenciesForSubject('subject-gh-basic4-computing-pilot')[0];assert(math&&computing);
for(const competency of [math,computing])await saveLearnerState(createInitialLearnerState(learnerId,competency.id));
await saveLearnerLearningContext({learnerId,...defaults,activeSubjectId:computing.subjectId,activeCompetencyId:computing.id,updatedAt:new Date().toISOString()});
const expired=randomUUID(),revoked=randomUUID();await createPrincipalAuthSession(expired,learnerIdentity.principalId,new Date(Date.now()-86400000).toISOString());await createPrincipalAuthSession(revoked,learnerIdentity.principalId,new Date(Date.now()+3600000).toISOString());await revokePrincipalAuthSession(revoked,learnerIdentity.principalId);
const oldMath=await createIntervention({learnerId,competencyId:math.id,sessionId:expired,decisionId:randomUUID(),type:'diagnose'});
const oldComputing=await createIntervention({learnerId,competencyId:computing.id,sessionId:revoked,decisionId:randomUUID(),type:'diagnose'});
const args={params:Promise.resolve({learnerId})};
const recoveryBody={confirmPreserveHistory:true,requestId:randomUUID()};
const recoverRequest=(session:string,body:unknown=recoveryBody,origin?:string)=>recover(post('/api/account/learners/'+learnerId+'/tutoring-recovery',body,session,origin),args);
async function history(){return JSON.stringify({states:await getLearnerStates(learnerId),interventions:await getLearnerInterventions(learnerId),evidence:await getEvidenceForLearner(learnerId),context:await getLearnerLearningContext(learnerId),originalSessions:[await getPrincipalAuthSession(expired),await getPrincipalAuthSession(revoked)]});}
async function ask(language:'en'|'fr'){
 const response=await chat(post('/api/tutoring/conversation',{question:language==='en'?'What is 2 + 3?':'Combien font 2 + 3 ?',language,requestId:randomUUID()},learnerCookie));assert.equal(response.status,200);return response.json();
}
for(const language of ['en','fr'] as const)assert.equal((await ask(language)).assessmentProtected,true,'reproduce the existing-user legacy failure before recovery');
const before=await history();
assert.equal((await recoverRequest('')).status,401);assert.equal((await recoverRequest(learnerCookie)).status,403);
assert.equal((await recoverRequest(guardian,{...recoveryBody,confirmPreserveHistory:false})).status,400);
assert.equal((await recoverRequest(guardian,recoveryBody,'https://untrusted.test')).status,400);
const foreign=await register(post('/api/account/register',{email:`foreign-${id}@example.test`,password,displayName:'Fictional Other Guardian',preferredLanguage:'en',confirmsGuardian:true,acceptsNotice:true}));assert.equal(foreign.status,201);assert.equal((await recoverRequest(cookie(foreign))).status,403);
// A client-shaped or corrupt analytics record cannot relax a protected row.
await recordPilotMeasurementEvent({learnerId,eventType:'sync_completed',clientRequestId:randomUUID(),metadata:{source:'guardian-tutor-recovery-v1',proof:'forged.invalid'}});
assert.equal((await ask('en')).assessmentProtected,true);
const recovered=await recoverRequest(guardian);assert.equal(recovered.status,200);assert.equal((await recovered.json()).recovered,2);
assert.equal(await history(),before,'recovery must preserve original assessments, learner state, evidence and curriculum pointer');
for(const language of ['en','fr'] as const){const answer=await ask(language);assert.equal(answer.assessmentProtected,false);assert.match(answer.messages.at(-1).text,/5/);}
const replay=await recoverRequest(guardian);assert.equal(replay.status,200);assert.equal((await replay.json()).alreadyRecorded,true);assert.equal((await readAssessmentRecovery(learnerId)).proofs.length,1);
// A concurrent live presentation overrides recovery and invalidates an in-flight answer.
let release!:(answer:string)=>void,started!:()=>void;
const begun=new Promise<void>(resolve=>{started=resolve;});
const delayed=createConversationHandler({
 identity:async()=>({learnerId,sessionId:learnerIdentity.sessionId,authenticated:true,source:'production-session' as const}),
 context:loadConversationContext,limit:async()=>({allowed:true,retryAfterSeconds:0}),
 provider:{id:'mock',respond:async()=>{started();return new Promise<string>(resolve=>{release=resolve;});}},
});
const inFlight=delayed(post('/api/tutoring/conversation',{question:'What is 2 + 3?',language:'en',requestId:randomUUID()},learnerCookie));await begun;
await recordPilotMeasurementEvent({learnerId,sessionId:learnerIdentity.sessionId,competencyId:computing.id,eventType:'learning_presented',clientRequestId:randomUUID(),metadata:{source:'assessment-delivery-v1',interventionId:oldComputing.interventionId,assessmentItemId:'isolated-concurrent-delivery'}});
release('This stale answer must never be published');assert.equal((await inFlight).status,409);
assert.equal((await ask('en')).assessmentProtected,true,'a live presentation cannot be bypassed with an older recovery proof');
assert.equal((await logout(post('/api/session/logout',{},learnerCookie))).status,200);
const returning=await login(post('/api/session/login',{login:username,password}));assert.equal(returning.status,200);learnerCookie=cookie(returning);
learnerIdentity=await resolveSignedInSession(new Request('http://localhost/api/session/me',{headers:{cookie:learnerCookie}}));
assert.equal((await ask('en')).assessmentProtected,false,'a new session retains valid recovery without reactivating the ended delivery');
assert.equal(await history(),before);
seedContent();const item=getContentForCompetency(computing.id).find(content=>content.assessmentItemId);assert(item?.assessmentItemId);
const oldSubmission={sessionId:learnerIdentity.sessionId,competencyId:computing.id,assessmentItemId:item.assessmentItemId,interventionId:oldComputing.interventionId,response:'fictional answer',clientRequestId:randomUUID()};
const blocked=await submit(post('/api/learning',oldSubmission,learnerCookie));assert.equal(blocked.status,409);assert.equal((await blocked.json()).code,'assessment_delivery_required');
assert.equal((await submit(post('/api/learning',{...oldSubmission,interventionId:undefined,clientRequestId:randomUUID()},learnerCookie))).status,409,'omitting the old attempt ID cannot bypass fresh delivery');
assert.equal(await history(),before,'an old recovered assessment cannot be scored before fresh delivery');
const home=await learning(new Request('http://localhost/api/learning?dashboard=1',{headers:{cookie:learnerCookie}}));assert.equal(home.status,200);assert.equal(await history(),before);
const resumed=await learning(new Request('http://localhost/api/learning',{headers:{cookie:learnerCookie}}));assert.equal(resumed.status,200);const activity=await resumed.json();assert(activity.content?.assessmentItemId);
assert.notEqual(activity.decision.interventionId,oldComputing.interventionId,'recovered historical attempt must not be reused as a fresh assessment');
assert.deepEqual((await getLearnerInterventions(learnerId)).find(i=>i.interventionId===oldComputing.interventionId),oldComputing,'fresh learning leaves the recovered historical record intact');
const oldAfterDelivery=await submit(post('/api/learning',oldSubmission,learnerCookie));assert.equal(oldAfterDelivery.status,409,'fresh delivery must not reactivate scoring for the old recovered attempt');
for(const language of ['en','fr'] as const)assert.equal((await ask(language)).assessmentProtected,true,'a genuinely resumed assessment is protected again');
const again=await recoverRequest(guardian,{...recoveryBody,requestId:randomUUID()});assert.equal(again.status,200);assert.equal((await again.json()).recovered,0);assert.equal((await ask('en')).assessmentProtected,true);
const content=getContentForCompetency(activity.decision.competencyId).find(c=>c.assessmentItemId===activity.content.assessmentItemId);assert(content);
const scored=await submit(post('/api/learning',{sessionId:learnerIdentity.sessionId,competencyId:activity.decision.competencyId,assessmentItemId:activity.content.assessmentItemId,response:typeof content.metadata?.expectedResponse==='string'?content.metadata.expectedResponse:'fictional controlled answer',clientRequestId:randomUUID()},learnerCookie));assert.equal(scored.status,200,'fresh delivery derives its new attempt ID and uses the existing evaluator');
const records=await getLearnerInterventions(learnerId);assert(records.some(i=>i.interventionId===oldMath.interventionId));assert(records.some(i=>i.interventionId===oldComputing.interventionId));
assert((await getPilotMeasurementEvents(learnerId)).some(e=>e.eventType==='learning_presented'&&e.metadata.source==='assessment-delivery-v1'));
await createIntervention({learnerId,competencyId:computing.id,sessionId:expired,decisionId:randomUUID(),type:'teacher_review'});
await createIntervention({learnerId,competencyId:math.id,sessionId:'unverifiable-original-session',decisionId:randomUUID(),type:'diagnose'});
const pendingHistory=await history();
const pending=await recoverRequest(guardian,{...recoveryBody,requestId:randomUUID()});assert.equal(pending.status,200);assert.equal((await pending.json()).recovered,0);
assert.equal(await history(),pendingHistory);
for(const language of ['en','fr'] as const)assert.equal((await ask(language)).assessmentProtected,true,'pending teacher review and missing session provenance remain protected');
console.log('PASS: real register/login/guardian ownership; legacy failure reproduced; signed append-only recovery; unchanged history/progress; EN/FR ordinary answers; spoof/origin/child/foreign denial; replay; old scoring blocked; actual lesson resume re-protects and scores through the existing engine.');
