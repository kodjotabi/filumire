// Test-only launcher for tests/filu-functional.browser.mjs (run it through scripts/browser-filu-functional.mjs).
// Seeds fictional in-memory records, then runs real Next routes.
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { randomUUID } from 'node:crypto';
if(process.env.FILUMIRE_PERSISTENCE !== 'memory' || process.env.VERCEL || !process.env.DATABASE_URL?.includes('127.0.0.1:1/'))throw Error('Isolated local memory test configuration required');
const root=process.cwd();
const require=createRequire(resolve(root,'package.json'));
require('next/dist/server/node-environment');
const load=f=>import(pathToFileURL(resolve(root,f)).href);
const [{POST:register},{POST:addLearner},{POST:login},{accountStore},{createInitialLearnerState},{saveLearnerState},{saveLearnerLearningContext},{getDefaultLearnerLearningContext,getAvailableSubjectsForGrade},{getCompetenciesForSubject},{getContentForCompetency},{seedContent},{createIntervention},{persistenceStore},{getLearnerInterventions}]=await Promise.all([
 'apps/learner/app/api/account/register/route.ts','apps/learner/app/api/account/learners/route.ts','apps/learner/app/api/session/login/route.ts','services/account/store.ts','services/learner-state/index.ts','services/learner-state-store/index.ts','services/learner-context/index.ts','packages/curriculum-framework/index.ts','packages/curriculum/index.ts','services/content-store/index.ts','services/content-store/seed.ts','services/intervention-store/index.ts','services/persistence-provider.ts','services/intervention-store/index.ts',
].map(load));
const post=(path,body,cookie)=>new Request('http://127.0.0.1:3191'+path,{method:'POST',headers:{'content-type':'application/json',...(cookie?{cookie}:{})},body:JSON.stringify(body)});
const cookie=r=>r.headers.get('set-cookie')?.match(/filumire_auth_session=([^;]*)/)?.[1];
const run=randomUUID().slice(0,8);
const guardianResponse=await register(post('/api/account/register',{email:`http-${run}@example.test`,password:'fictional-http-password',displayName:'Fictional Guardian',preferredLanguage:'en',confirmsGuardian:true,acceptsNotice:true}));
if(guardianResponse.status!==201)throw Error('Fictional guardian setup failed '+await guardianResponse.text());
const guardian='filumire_auth_session='+cookie(guardianResponse);
seedContent();
const defaults=getDefaultLearnerLearningContext();
const subjects=getAvailableSubjectsForGrade(defaults.curriculumVersionId,defaults.gradeId);
const fixtures=[];
async function mode(fixture,scored=false){
  for(const item of await getLearnerInterventions(fixture.learnerId))if(item.status==='active')await persistenceStore.saveIntervention({...item,status:'cancelled'});
  await createIntervention({learnerId:fixture.learnerId,competencyId:fixture.competencyId,sessionId:`fixture-${run}`,decisionId:randomUUID(),type:scored?'practice':'teach',instructionalStrategy:scored?'retrieval_practice':'direct_explanation'});
}
for(const width of [390,1280])for(const discipline of ['mathematics','science','computing','english']){
  const subject=subjects.find(s=>s.discipline===discipline);
  const competency=getCompetenciesForSubject(subject.id).find(c=>['en','fr'].every(language=>getContentForCompetency(c.id,language).some(item=>item.type==='lesson'&&!item.assessmentItemId)));
  const username=`http.${run}.${fixtures.length}`;
  const added=await addLearner(post('/api/account/learners',{displayName:'Fictional Learner',username,password:'fictional-http-password',preferredLanguage:'en',consentsToLearnerData:true},guardian));
  if(added.status!==201)throw Error('Fictional learner setup failed '+await added.text());
  const {learnerId}=await added.json();
  await accountStore.updateLearnerProfile(learnerId,{onboardingCompletedAt:new Date().toISOString()});
  await saveLearnerState(createInitialLearnerState(learnerId,competency.id));
  await saveLearnerLearningContext({learnerId,...defaults,activeSubjectId:subject.id,activeCompetencyId:competency.id,updatedAt:new Date().toISOString()});
  const signedIn=await login(post('/api/session/login',{login:username,password:'fictional-http-password'}));
  if(signedIn.status!==200)throw Error('Fictional sign-in failed');
  const fixture={width,discipline,learnerId,subjectId:subject.id,competencyId:competency.id,cookie:cookie(signedIn)};
  await mode(fixture);fixtures.push(fixture);
}
const next=require('next');
const app=next({dev:false,dir:resolve(root,'apps/learner'),hostname:'127.0.0.1',port:3191});
await app.prepare();
const handle=app.getRequestHandler();
const server=createServer(async(req,res)=>{
  if(req.url==='/__filu_test__/mode'&&req.method==='POST'){
    if(req.headers.origin&&req.headers.origin!=='http://127.0.0.1:3191'){res.writeHead(403);res.end();return;}
    const chunks=[];for await(const chunk of req)chunks.push(chunk);
    const body=JSON.parse(Buffer.concat(chunks).toString());const fixture=fixtures.find(f=>f.learnerId===body.learnerId);
    if(!fixture){res.writeHead(400);res.end();return;}
    await mode(fixture,body.scored===true);res.setHeader('content-type','application/json');res.end(JSON.stringify({ok:true}));return;
  }
  await handle(req,res);
});
server.listen(3191,'127.0.0.1',()=>{writeFileSync(process.env.FILUMIRE_TEST_FIXTURES,JSON.stringify(fixtures));console.log('READY: actual Next HTTP routes; 8 fictional memory-only learners; no API response mocks');});
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>{server.close();process.exit(0);});
