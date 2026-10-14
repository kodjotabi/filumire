import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { POST as register } from '../apps/learner/app/api/account/register/route';
import { POST as addLearner } from '../apps/learner/app/api/account/learners/route';
import { POST as login } from '../apps/learner/app/api/session/login/route';
import { POST as logout } from '../apps/learner/app/api/session/logout/route';
import { GET as accessStatus } from '../apps/learner/app/api/account/access/route';
import { GET as learning } from '../apps/learner/app/api/learning/route';
import { POST as chat } from '../apps/learner/app/api/tutoring/conversation/route';
import { readJsonBody } from '../apps/learner/app/api/account/http';
import { getLearnerInterventions, createIntervention } from '../services/intervention-store';
import { getEvidenceForLearner, saveEvidence } from '../services/evidence-store';
import { getLearnerStates, saveLearnerState } from '../services/learner-state-store';
import { getLearnerLearningContext, saveLearnerLearningContext } from '../services/learner-context';
import { getDefaultLearnerLearningContext } from '../packages/curriculum-framework';
import { getCompetenciesForSubject } from '../packages/curriculum';
import { createInitialLearnerState } from '../services/learner-state';
import { destinationFor, type Account } from '../apps/learner/services/account-client';
assert.equal(process.env.FILUMIRE_PERSISTENCE, 'memory');
process.env.FILUMIRE_AUTH_JWT_SECRET='isolated-integration-six-secret-at-least-32';
process.env.FILUMIRE_ACCOUNT_REGISTRATION='open';
Object.defineProperty(process.env,'NODE_ENV',{value:'production',configurable:true,writable:true,enumerable:true});
const post=(path:string,body:unknown,cookie='',origin?:string)=>new Request('http://localhost'+path,{method:'POST',headers:{'content-type':'application/json',cookie,...(origin?{origin}:{})},body:JSON.stringify(body)});
const cookie=(r:Response)=>r.headers.get('set-cookie')!.split(';')[0];
const password='fictional-integration-test-password';
const before=process.argv.includes('--before');
for(const persisted of [false,true]) {
 const id=randomUUID().slice(0,8), username=`integration.${id}`;
 const registered=await register(post('/api/account/register',{email:`integration-${id}@example.test`,password,displayName:'Fictional Guardian',preferredLanguage:'en',confirmsGuardian:true,acceptsNotice:true}));assert.equal(registered.status,201);
 const added=await addLearner(post('/api/account/learners',{displayName:'Fictional Learner',username,password,preferredLanguage:'en',consentsToLearnerData:true},cookie(registered)));assert.equal(added.status,201);
 const {learnerId}=await added.json();
 const defaults=getDefaultLearnerLearningContext(), competency=getCompetenciesForSubject(defaults.activeSubjectId)[0];
 if(persisted){
  const state=createInitialLearnerState(learnerId,competency.id);
  state.competencies[0].masteryEstimate=.6;state.competencies[0].confidence=.5;state.competencies[0].evidenceCount=2;
  await saveLearnerState(state);
  await saveLearnerLearningContext({learnerId,...defaults,activeCompetencyId:competency.id,updatedAt:new Date().toISOString()});
 }
 const signed=await login(post('/api/session/login',{login:username,password}));assert.equal(signed.status,200);const session=cookie(signed);
 if(!before){const access=await accessStatus(new Request('http://localhost/api/account/access',{headers:{cookie:session}}));assert.equal(access.status,200);const status=await access.json();assert.equal(status.accountAuthority,'filumire-learner');assert.equal(status.billing.operational,false);assert.equal(status.learningAccessPolicy,'existing_authorisation');}
 const prior=JSON.stringify({states:await getLearnerStates(learnerId),events:await getEvidenceForLearner(learnerId),interventions:await getLearnerInterventions(learnerId)});
 const home=await learning(new Request(`http://localhost/api/learning${before?'':'?dashboard=1'}`,{headers:{cookie:session}}));assert.equal(home.status,200);
 if(!before){assert.equal((await home.json()).decision.reasonCode,'READ_ONLY_DASHBOARD');assert.equal(JSON.stringify({states:await getLearnerStates(learnerId),events:await getEvidenceForLearner(learnerId),interventions:await getLearnerInterventions(learnerId)}),prior);}
 let historyToken:string|undefined;
 for(const language of ['en','fr'] as const){
  const response=await chat(post('/api/tutoring/conversation',{question:language==='en'?'What is 2 + 3?':'Combien font 2 + 3 ?',language,requestId:randomUUID(),historyToken},session));assert.equal(response.status,200);const answer=await response.json();historyToken=answer.historyToken;
  assert.equal(answer.assessmentProtected,before);
  if(!before)assert.match(answer.messages.at(-1).text,/5/);
 }
 if(before){console.log(`REPRODUCED previous dashboard activation -> scored restriction (${persisted?'persisted':'fresh'} fixture)`);continue;}
 if(!persisted){await saveLearnerState(createInitialLearnerState(learnerId,competency.id));await saveLearnerLearningContext({learnerId,...defaults,activeCompetencyId:competency.id,updatedAt:new Date().toISOString()});}
 const active=await createIntervention({learnerId,competencyId:competency.id,sessionId:'scored-session',decisionId:'real-scored-fixture',type:'diagnose'});
 const ask=()=>chat(post('/api/tutoring/conversation',{question:'What is 2 + 3?',language:'en',requestId:randomUUID()},session));
 assert.equal((await (await ask()).json()).assessmentProtected,true,'genuinely active assessment remains protected');
 await saveEvidence({id:randomUUID(),learnerId,competencyId:competency.id,source:'assessment',outcome:'correct',timestamp:new Date().toISOString(),interventionId:active.interventionId,policyVersion:'isolated-regression'});
 const unchanged=JSON.stringify(await getLearnerInterventions(learnerId));
 const answered=await (await ask()).json();assert.equal(answered.assessmentProtected,false);assert.match(answered.messages.at(-1).text,/5/);
 assert.equal(JSON.stringify(await getLearnerInterventions(learnerId)),unchanged,'tutoring must not rewrite historical flags');
 await createIntervention({learnerId,competencyId:competency.id,sessionId:'review-session',decisionId:'pending-review',type:'teacher_review'});
 assert.equal((await (await ask()).json()).assessmentProtected,true,'pending teacher review stays protected');
 const rejected=await logout(post('/api/session/logout',{},session,'https://untrusted.test'));assert.equal(rejected.status,400);
 assert.equal((await logout(post('/api/session/logout',{},session))).status,200);
 assert.equal((await ask()).status,401,'revoked sessions cannot tutor');
}
if(!before){
 assert.equal((await accessStatus(new Request('http://localhost/api/account/access'))).status,401);
 assert.deepEqual(await readJsonBody(new Request('http://localhost/test',{method:'POST',headers:{'content-type':'application/json',host:'127.0.0.1:3201',origin:'http://127.0.0.1:3201'},body:'{}'})),{});
 await assert.rejects(()=>readJsonBody(post('/api/session/login',{},'', 'https://untrusted.test')),/this application/);
 await assert.rejects(()=>readJsonBody(new Request('http://localhost/test',{method:'POST',headers:{'content-type':'application/jsonp'},body:'{}'})),/JSON request/);
 await assert.rejects(()=>readJsonBody(post('/test',{text:'é'.repeat(9000)})),/too large/);
 let cancelled=false;
 const stream=new ReadableStream({pull(controller){controller.enqueue(new Uint8Array(17000));},cancel(){cancelled=true;}});
 await assert.rejects(()=>readJsonBody(new Request('http://localhost/test',{method:'POST',headers:{'content-type':'application/json'},body:stream,duplex:'half'} as RequestInit)),/too large/);assert(cancelled);
 const guardian={accountKind:'guardian',activeLearnerId:'selected',learners:[]} as unknown as Account;
 assert.equal(destinationFor(guardian,'fr','family'),'/family?lang=fr');assert.equal(destinationFor(guardian,'en','https://untrusted.test'),'/dashboard?lang=en');
 console.log('PASS: fresh/persisted EN/FR Home -> tutor; historical evidence; genuine assessment/pending review; no progress writes; revocation, origin, bounded streams and redirect controls.');
}
