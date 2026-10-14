import next from 'next';
import {createServer} from 'node:http';
import {writeFile} from 'node:fs/promises';
import {fixture} from '../tests/login-filu-corrections.test';
import {getLearnerInterventions,createIntervention} from '../services/intervention-store';
import {persistenceStore} from '../services/persistence-provider';
const app=next({dev:false,dir:'apps/learner',hostname:'127.0.0.1',port:3194});await app.prepare();
const handler=app.getRequestHandler();
await writeFile('.vercel/login-filu-audit/fixture.json',JSON.stringify(fixture));
createServer(async(req,res)=>{
 if(req.url==='/__isolated_test__/idle'||req.url==='/__isolated_test__/scored'){
  for(const item of await getLearnerInterventions(fixture.learnerId))if(item.status==='active')await persistenceStore.saveIntervention({...item,status:'completed'});
  if(req.url.endsWith('/scored'))await createIntervention({learnerId:fixture.learnerId,competencyId:fixture.competencyId,sessionId:'isolated-browser-assessment',decisionId:'isolated-browser-assessment',type:'diagnose'});
  res.end('Isolated memory fixture ready');return;
 }
 await handler(req,res);
}).listen(3194,'127.0.0.1',()=>console.log('Isolated production-build test server ready'));
