import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {POST as register} from '../apps/learner/app/api/account/register/route';
import {POST as addLearner} from '../apps/learner/app/api/account/learners/route';
import {POST as login} from '../apps/learner/app/api/session/login/route';
import {PATCH as updateProfile} from '../apps/learner/app/api/account/learners/[learnerId]/route';
import {POST as chat} from '../apps/learner/app/api/tutoring/conversation/route';
import {createInitialLearnerState} from '../services/learner-state';
import {saveLearnerState,getLearnerState} from '../services/learner-state-store';
import {saveLearnerLearningContext} from '../services/learner-context';
import {getDefaultLearnerLearningContext} from '../packages/curriculum-framework';
import {getCompetenciesForSubject} from '../packages/curriculum';
import {createIntervention,getLearnerInterventions} from '../services/intervention-store';
import {persistenceStore} from '../services/persistence-provider';
import {getEvidenceForLearner} from '../services/evidence-store';
assert.equal(process.env.FILUMIRE_PERSISTENCE,'memory');
Object.defineProperty(process.env,'NODE_ENV',{value:'production',configurable:true,writable:true,enumerable:true});
process.env.FILUMIRE_AUTH_JWT_SECRET='isolated-login-filu-test-signing-key-at-least-32';process.env.FILUMIRE_ACCOUNT_REGISTRATION='open';
const id=randomUUID().slice(0,8),password='fictional-correction-test-password';
const post=(path:string,body:unknown,cookie='')=>new Request('http://localhost'+path,{method:'POST',headers:{'content-type':'application/json',cookie},body:JSON.stringify(body)});
const cookie=(r:Response)=>r.headers.get('set-cookie')!.split(';')[0];
const registered=await register(post('/api/account/register',{email:`corrections-${id}@example.test`,password,displayName:'Fictional Guardian',preferredLanguage:'en',confirmsGuardian:true,acceptsNotice:true}));assert.equal(registered.status,201);
const added=await addLearner(post('/api/account/learners',{displayName:'Fictional Learner',username:`corrections.${id}`,password,preferredLanguage:'en',consentsToLearnerData:true},cookie(registered)));assert.equal(added.status,201);
const {learnerId}=await added.json();const signedIn=await login(post('/api/session/login',{login:`corrections.${id}`,password}));assert.equal(signedIn.status,200);const session=cookie(signedIn);
const defaults=getDefaultLearnerLearningContext(),competency=getCompetenciesForSubject(defaults.activeSubjectId)[0];assert(competency);
for(const language of ['en','fr'] as const){const noCourse=await chat(post('/api/tutoring/conversation',{question:language==='en'?'How many days are there in the week?':'Combien de jours dans une semaine ?',language,requestId:randomUUID()},session));assert.equal(noCourse.status,200);assert.match((await noCourse.json()).messages.at(-1).text,/7/);}
await createIntervention({learnerId,competencyId:competency.id,sessionId:'uncertain-assessment',decisionId:'uncertain-assessment',type:'diagnose'});
const uncertain=await chat(post('/api/tutoring/conversation',{question:'How many days are there in the week?',language:'en',requestId:randomUUID()},session));assert.equal(uncertain.status,409,'Missing assessment context must remain fail closed');
for(const item of await getLearnerInterventions(learnerId))await persistenceStore.saveIntervention({...item,status:'completed'});
const setup=await updateProfile(new Request('http://localhost/api/account/learners/'+learnerId,{method:'PATCH',headers:{'content-type':'application/json',cookie:session},body:JSON.stringify({gradeId:defaults.gradeId,completeOnboarding:true})}),{params:Promise.resolve({learnerId})});assert.equal(setup.status,200);
const noLesson=await chat(post('/api/tutoring/conversation',{question:'How many days are there in the week?',language:'en',requestId:randomUUID()},session));assert.equal(noLesson.status,200);const noLessonReply=await noLesson.json();assert.equal(noLessonReply.assessmentProtected,false);assert.match(noLessonReply.messages.at(-1).text,/7/);
await saveLearnerState(createInitialLearnerState(learnerId,competency.id));await saveLearnerLearningContext({learnerId,...defaults,activeCompetencyId:competency.id,updatedAt:new Date().toISOString()});
const before=JSON.stringify({state:await getLearnerState(learnerId,competency.id),evidence:await getEvidenceForLearner(learnerId)});
let historyToken:string|undefined;
async function ask(question:string,language:'en'|'fr'){
 const response=await chat(post('/api/tutoring/conversation',{question,language,requestId:randomUUID(),historyToken},session));assert.equal(response.status,200);const data=await response.json();historyToken=data.historyToken;return data;
}
for(const language of ['en','fr'] as const){
 for(const question of language==='en'?['How many days are there in the week?','How many months are there in a year?','What is 2 + 3?']:['Combien de jours y a-t-il dans une semaine ?','Combien de mois y a-t-il dans une année ?','Combien font 2 + 3 ?']){
  const data=await ask(question,language);
  if(process.argv.includes('--before')){assert.equal(data.assessmentProtected,true);console.log('REPRODUCED: idle context incorrectly protected: '+question);}
  else{assert.equal(data.assessmentProtected,false);assert.match(data.messages.at(-1).text,question.includes('2 + 3')?/5/:/7|12/);assert(!/scored activity|activité évaluée/.test(data.messages.at(-1).text));}
 }
}
if(process.argv.includes('--before'))process.exit(0);
let data=await ask('How many days are there in the week?','en');data=await ask('Can you name them?','en');assert.match(data.messages.at(-1).text,/Monday/);assert(data.messages.length>=4);
data=await ask('Peux-tu les nommer ?','fr');assert.match(data.messages.at(-1).text,/lundi/);
data=await ask('Explain this','en');assert(!/scored activity/.test(data.messages.at(-1).text));
data=await ask('Explain the rings of Saturn','en');assert.match(data.messages.at(-1).text,/current lesson|teaching|teacher/);
await createIntervention({learnerId,competencyId:competency.id,sessionId:'fictional-assessment',decisionId:'fictional-scored',type:'diagnose'});
for(const language of ['en','fr'] as const){data=await ask(language==='en'?'How many days are there in the week?':'Combien de jours dans une semaine ?',language);assert.equal(data.assessmentProtected,true);assert.match(data.messages.at(-1).text,/scored activity|activité évaluée/);assert(!data.messages.at(-1).text.includes('Monday'));}
for(const item of await getLearnerInterventions(learnerId))await persistenceStore.saveIntervention({...item,status:'completed'});
data=await ask('How many days are there in the week?','en');assert.equal(data.assessmentProtected,false);assert.match(data.messages.at(-1).text,/7/);
assert.equal(JSON.stringify({state:await getLearnerState(learnerId,competency.id),evidence:await getEvidenceForLearner(learnerId)}),before);
console.log('PASS: actual register/login/context/provider, idle EN/FR questions, continuity, current lesson, outside lesson, genuine assessment guards and no progress writes');
export const fixture={learnerId,username:`corrections.${id}`,password,subjectId:defaults.activeSubjectId,competencyId:competency.id};
