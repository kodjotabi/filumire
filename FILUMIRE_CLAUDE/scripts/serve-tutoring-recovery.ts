import next from 'next';
import {createServer} from 'node:http';
import {writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {recoveryFixtures} from '../tests/fixtures/recovery-browser';
import {getLearnerStates} from '../services/learner-state-store';
import {getLearnerInterventions} from '../services/intervention-store';
import {getEvidenceForLearner} from '../services/evidence-store';
import {getLearnerLearningContext} from '../services/learner-context';
const app=next({dev:false,dir:'apps/learner',hostname:'127.0.0.1',port:3202});await app.prepare();
await writeFile('.vercel/integration-six-2026-10-13/recovery-fixtures.json',JSON.stringify(recoveryFixtures));
const handler=app.getRequestHandler();
createServer(async(req,res)=>{
 const match=req.method==='GET'&&req.url?.match(/^\/__isolated_recovery__\/(\d)\/history$/);
 if(match){
  const fixture=recoveryFixtures[Number(match[1])];if(!fixture){res.writeHead(404);res.end();return;}
  const id=fixture.learnerId;
  const history=JSON.stringify({states:await getLearnerStates(id),interventions:await getLearnerInterventions(id),evidence:await getEvidenceForLearner(id),context:await getLearnerLearningContext(id)});
  res.setHeader('content-type','application/json');res.end(JSON.stringify({sha256:createHash('sha256').update(history).digest('hex')}));return;
 }
 await handler(req,res);
}).listen(3202,'127.0.0.1',()=>console.log('Isolated recovery browser server ready; history endpoint is read-only.'));
