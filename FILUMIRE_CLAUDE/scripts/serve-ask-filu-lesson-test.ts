// Ask FILU lesson-input test server: isolated memory store, production build, loopback only.
import next from 'next';
import {createServer} from 'node:http';
import {writeFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {POST as register} from '../apps/learner/app/api/account/register/route';
import {POST as addLearner} from '../apps/learner/app/api/account/learners/route';
import {PATCH as updateProfile} from '../apps/learner/app/api/account/learners/[learnerId]/route';
import {POST as createLinkCode} from '../apps/learner/app/api/account/learners/[learnerId]/teachers/route';
import {POST as redeemLinkCode} from '../apps/learner/app/api/account/teacher-links/route';
import {getDefaultLearnerLearningContext} from '../packages/curriculum-framework';
if(process.env.FILUMIRE_PERSISTENCE!=='memory')throw Error('memory only');
Object.defineProperty(process.env,'NODE_ENV',{value:'production',configurable:true,writable:true,enumerable:true});
const id=randomUUID().slice(0,8),password='fictional-ask-filu-test-password';
const post=(path:string,body:unknown,cookie='')=>new Request('http://localhost'+path,{method:'POST',headers:{'content-type':'application/json',cookie},body:JSON.stringify(body)});
const cookie=(r:Response)=>r.headers.get('set-cookie')!.split(';')[0];
const email=process.env.ASK_FILU_TEST_EMAIL??`ask-filu-${id}@example.test`;
const registered=await register(post('/api/account/register',{email,password,displayName:'Fictional Guardian',preferredLanguage:'en',confirmsGuardian:true,acceptsNotice:true}));
if(registered.status!==201)throw Error('register '+registered.status);
const guardian=cookie(registered);
const added=await addLearner(post('/api/account/learners',{displayName:'Noah',username:`noah.${id}`,password,preferredLanguage:'en',consentsToLearnerData:true},guardian));
if(added.status!==201)throw Error('learner '+added.status+' '+await added.text());
const {learnerId}=await added.json();
const defaults=getDefaultLearnerLearningContext();
const setup=await updateProfile(new Request('http://localhost/api/account/learners/'+learnerId,{method:'PATCH',headers:{'content-type':'application/json',cookie:guardian},body:JSON.stringify({gradeId:defaults.gradeId,completeOnboarding:true})}),{params:Promise.resolve({learnerId})});
if(setup.status!==200)throw Error('setup '+setup.status+' '+await setup.text());
if(process.env.ASK_FILU_TEST_SELF_TEACHER==='1'){
 const made=await createLinkCode(post('/api/account/learners/'+learnerId+'/teachers',{},guardian),{params:Promise.resolve({learnerId})});
 if(made.status!==201&&made.status!==200)throw Error('code '+made.status+' '+await made.text());
 const {code}=await made.json();const used=await redeemLinkCode(post('/api/account/teacher-links',{code},guardian));
 if(used.status!==201)throw Error('redeem '+used.status+' '+await used.text());console.log('self teacher link ok');
}
const port=Number(process.env.ASK_FILU_TEST_PORT??3197);
const app=next({dev:false,dir:'apps/learner',hostname:'127.0.0.1',port});await app.prepare();
const handler=app.getRequestHandler();
await writeFile('.vercel/ask-filu-lesson/fixture.json',JSON.stringify({email,password,learnerId,learnerUsername:`noah.${id}`,gradeId:defaults.gradeId}));
createServer((req,res)=>handler(req,res)).listen(port,'127.0.0.1',()=>console.log('Ask FILU lesson test server ready '+port));
