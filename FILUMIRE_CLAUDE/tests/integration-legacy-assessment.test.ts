import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {fixture} from './login-filu-corrections.test';
import {POST as login} from '../apps/learner/app/api/session/login/route';
import {POST as chat} from '../apps/learner/app/api/tutoring/conversation/route';
import {GET as dashboard} from '../apps/learner/app/api/learning/route';
import {createIntervention,getLearnerInterventions} from '../services/intervention-store';
import {createPrincipalAuthSession,revokePrincipalAuthSession} from '../services/auth-session';
import {resolveSignedInSession} from '../services/identity';
import {getCompetenciesForSubject} from '../packages/curriculum';
assert.equal(process.env.FILUMIRE_PERSISTENCE,'memory');
const request=(path:string,body:unknown,cookie='')=>new Request('http://localhost'+path,{method:'POST',headers:{'content-type':'application/json',cookie},body:JSON.stringify(body)});
const signed=await login(request('/api/session/login',{login:fixture.username,password:fixture.password}));assert.equal(signed.status,200);
const cookie=signed.headers.get('set-cookie')!.split(';')[0];
const identity=await resolveSignedInSession(new Request('http://localhost/api/session/me',{headers:{cookie}}));
const expired=randomUUID(),revoked=randomUUID();
await createPrincipalAuthSession(expired,identity.principalId,new Date(Date.now()-86400000).toISOString());
await createPrincipalAuthSession(revoked,identity.principalId,new Date(Date.now()+3600000).toISOString());
await revokePrincipalAuthSession(revoked,identity.principalId);
const other=getCompetenciesForSubject('subject-gh-basic4-computing-pilot')[0];assert(other);
for(const [sessionId,competencyId] of [[expired,fixture.competencyId],[revoked,other.id]])await createIntervention({learnerId:fixture.learnerId,competencyId,sessionId,decisionId:randomUUID(),type:'diagnose'});
const before=JSON.stringify(await getLearnerInterventions(fixture.learnerId));
const home=await dashboard(new Request('http://localhost/api/learning?dashboard=1',{headers:{cookie}}));assert.equal(home.status,200);
for(const language of ['en','fr']){
 const response=await chat(request('/api/tutoring/conversation',{question:language==='en'?'What is 2 + 3?':'Combien font 2 + 3 ?',language,requestId:randomUUID()},cookie));assert.equal(response.status,200);
 assert.equal((await response.json()).assessmentProtected,true,'Unproven legacy assessment provenance must not be bypassed simply because sign-in sessions ended');
}
assert.equal(JSON.stringify(await getLearnerInterventions(fixture.learnerId)),before);
console.log('BLOCKER REPRODUCED: unanswered legacy diagnoses in expired/revoked sessions remain protected in EN/FR; Home creates no new assessment and no historical rows are changed. This is not an affected-account correction PASS.');
