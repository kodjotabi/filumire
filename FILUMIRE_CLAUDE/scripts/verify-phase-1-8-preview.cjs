const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const cp = require('node:child_process');
const root = path.resolve('FILUMIRE_CLAUDE/.vercel/phase1-8-576d0dd97642');
const url = 'https://filumire-learner-q7jcmh1yt-tabicrentsil-6879s-projects.vercel.app';
const privateDir = fs.mkdtempSync(path.join(require('node:os').tmpdir(), 'filumire-journey-'));
const stamp = crypto.randomBytes(5).toString('hex');
const password = crypto.randomBytes(24).toString('base64url');
const guardian = `preview-guardian-${stamp}@example.invalid`;
const teacher = `preview-teacher-${stamp}@example.invalid`;
const username = `pv${stamp}`;
const results = [];
function request(label, endpoint, role, method = 'GET', body, expected = 200, predicate) {
  const jar = path.join(privateDir, role + '.cookies');
  const output = path.join(privateDir, 'response');
  const input = path.join(privateDir, 'request.json');
  const headers = path.join(privateDir, 'headers');
  if (body !== undefined) fs.writeFileSync(input, JSON.stringify(body), {mode:0o600});
  let command = `npx.cmd --no-install vercel@63.1.2 curl "${endpoint}" --deployment ${url} -- --silent --max-time 35 --request ${method} --cookie "${jar}" --cookie-jar "${jar}" --dump-header "${headers}" --output "${output}" --write-out "%{http_code}" --header "x-filumire-language: fr" --header "x-filumire-learner-id: development-bypass-test" --header "x-filumire-principal-id: development-bypass-test"`;
  if (body !== undefined) command += ` --header "Content-Type: application/json" --data-binary "@${input}"`;
  const run = cp.spawnSync(command, {cwd:root,shell:true,encoding:'utf8',timeout:60000,maxBuffer:1000000});
  const status = Number(run.stdout.trim().slice(-3));
  const raw = fs.existsSync(output) ? fs.readFileSync(output,'utf8') : '';
  let data; try {data = JSON.parse(raw);} catch {data = raw;}
  const ok = run.status === 0 && status === expected && (!predicate || predicate(data,fs.readFileSync(headers,'utf8')));
  const record = {test:label,status,result:ok?'PASS':'FAIL'};
  if (!ok && data && typeof data === 'object') record.applicationCode = data.code ?? null;
  results.push(record); console.log(JSON.stringify(record));
  if (!ok) throw new Error('journey_check_failed:' + label);
  return data;
}
try {

  request('Welcome route','/','anonymous','GET',undefined,200,d=>typeof d==='string' && /FILUMIRE/i.test(d));
  request('English login route','/login?lang=en','anonymous','GET',undefined,200);
  request('French login route','/login?lang=fr','anonymous','GET',undefined,200);
  request('OTP mock disabled','/api/account/phone','anonymous','POST',{},503,d=>d.code==='unavailable');
  request('Subscription/payment mock disabled','/api/account/subscription','anonymous','GET',undefined,503,d=>d.code==='unavailable');
  request('Family prototype unavailable','/family-access','anonymous','GET',undefined,200,d=>/unavailable|pas disponible/i.test(d));
  request('Anonymous learning with forged development identity rejected','/api/learning','anonymous','GET',undefined,401);
  request('Registration page served','/register','anonymous', 'GET',undefined,200,d=>typeof d==='string' && /register|inscription/i.test(d));
  request('Anonymous session rejected','/api/session/me','anonymous','GET',undefined,401);
  request('Guardian registration and secure session cookie','/api/account/register','guardian','POST',{email:guardian,password,displayName:'Preview Test Guardian',preferredLanguage:'fr',confirmsGuardian:true,acceptsNotice:true},201,(d,h)=>d.registered===true && /filumire_auth_session=.*HttpOnly/i.test(h) && /SameSite=Strict/i.test(h));
  request('Guardian session recognised','/api/session/me','guardian','GET',undefined,200,d=>d.accountKind==='guardian');
  const learner = request('Guardian creates learner','/api/account/learners','guardian','POST',{displayName:'Preview Test Learner',username,password,preferredLanguage:'fr',consentsToLearnerData:true},201,d=>Boolean(d.learnerId));
  request('Guardian session persists across requests','/api/session/me','guardian');
  request('Guardian progress summary','/api/adult/summary?learnerId='+learner.learnerId,'guardian','GET',undefined,200,d=>Boolean(d.summary));
  const code = request('Guardian creates teacher link code','/api/account/learners/'+learner.learnerId+'/teachers','guardian','POST',{},201,d=>Boolean(d.code));
  request('Teacher registration','/api/account/register','teacher','POST',{accountType:'teacher',email:teacher,password,displayName:'Preview Test Teacher',preferredLanguage:'fr',confirmsTeacher:true,acceptsNotice:true},201,d=>d.accountKind==='teacher');
  request('Unlinked teacher denied learner summary','/api/teacher/summary?learnerId='+learner.learnerId,'teacher','GET',undefined,403);
  request('Teacher redeems guardian link code','/api/account/teacher-links','teacher','POST',{code:code.code},201,d=>d.learnerId===learner.learnerId);
  request('Linked teacher summary','/api/teacher/summary?learnerId='+learner.learnerId,'teacher','GET',undefined,200,d=>Boolean(d.summary));
  request('Teacher cannot impersonate learner','/api/session/select-learner','teacher','POST',{learnerId:learner.learnerId},403);
  request('Guardian linked teacher list','/api/account/learners/'+learner.learnerId+'/teachers','guardian','GET',undefined,200,d=>d.teachers?.length===1);
  request('Learner login','/api/session/login','learner','POST',{login:username,password},200,d=>d.accountKind==='learner' && d.learnerId===learner.learnerId);
  request('Learner returning session','/api/session/me','learner','GET',undefined,200,d=>d.activeLearnerId===learner.learnerId);

  request('Learner onboarding','/api/account/learners/'+learner.learnerId,'learner','PATCH',{gradeId:'level-gh-basic-5-pilot',completeOnboarding:true},200);
  request('Dashboard page served','/dashboard?lang=fr','learner','GET',undefined,200);
  request('Lesson page served','/learn?lang=fr','learner','GET',undefined,200);
  let activity=request('Authoritative learning activity','/api/learning','learner','GET',undefined,200,d=>Boolean(d.decision && d.content));
  const english=request('FILU English mock response','/api/tutoring/conversation','learner','POST',{question:'Please help me understand this concept.',language:'en',requestId:crypto.randomUUID()},200,d=>d.provider==='mock' && d.messages?.at(-1)?.language==='en');
  request('FILU French follow-up','/api/tutoring/conversation','learner','POST',{question:'Peux-tu me guider sans donner la reponse ?',language:'fr',requestId:crypto.randomUUID(),historyToken:english.historyToken},200,d=>d.provider==='mock' && d.messages?.at(-1)?.language==='fr');
  const jar=fs.readFileSync(path.join(privateDir,'learner.cookies'),'utf8').split('\n').find(line=>line.includes('filumire_auth_session'));
  const token=decodeURIComponent(jar.trim().split('\t').at(-1));const sessionId=JSON.parse(Buffer.from(token.split('.')[1],'base64url')).sid;
  if(!activity.content.assessmentItemId && activity.decision.interventionId) activity=request('Acknowledge displayed instructional activity','/api/learning','learner','POST',{learnerId:learner.learnerId,sessionId,competencyId:activity.decision.competencyId,interventionId:activity.decision.interventionId,interactionType:'acknowledge'},200);
  if(!activity.content?.assessmentItemId) throw new Error('scored_activity_not_reached');
  const submission={learnerId:learner.learnerId,sessionId,competencyId:activity.decision.competencyId,assessmentItemId:activity.content.assessmentItemId,response:'0',clientRequestId:crypto.randomUUID()};
  request('Server-authoritative assessment submission','/api/learning','learner','POST',submission,200,d=>Boolean(d.assessment?.result));
  request('Assessment retry remains duplicate','/api/learning','learner','POST',submission,200,d=>d.assessment?.result?.duplicate===true);
  request('Authoritative returning activity','/api/learning','learner','GET',undefined,200,d=>Boolean(d.decision));
  request('Learner cannot create learners','/api/account/learners','learner','POST',{displayName:'Denied',username:'denied'+stamp,password,consentsToLearnerData:true},403);
  request('Learner logout','/api/session/logout','learner','POST',{});
  request('Logged-out learner session rejected','/api/session/me','learner','GET',undefined,401);
  request('Learner can sign in again','/api/session/login','learner','POST',{login:username,password},200);
  request('Guardian logout','/api/session/logout','guardian','POST',{});
  request('Guardian returning login retains account','/api/session/login','guardian','POST',{login:guardian,password},200,d=>d.accountKind==='guardian');
  request('Guardian progress persists after login','/api/adult/summary?learnerId='+learner.learnerId,'guardian','GET',undefined,200,d=>Boolean(d.summary));
  request('Teacher logout','/api/session/logout','teacher','POST',{});
  request('Teacher returning login','/api/session/login','teacher','POST',{login:teacher,password},200,d=>d.accountKind==='teacher');
  request('Teacher link persists after login','/api/teacher/summary?learnerId='+learner.learnerId,'teacher','GET',undefined,200,d=>Boolean(d.summary));
} catch(error) {console.log(JSON.stringify({stopped:error.message}));process.exitCode=1;}
finally {
  for(const entry of fs.readdirSync(privateDir))fs.unlinkSync(path.join(privateDir,entry));fs.rmdirSync(privateDir);
  fs.writeFileSync('FILUMIRE_CLAUDE/.vercel/phase1-8-deployment-test-results.json',JSON.stringify({url,commit:'a59b9fdf plus uncommitted Phase 1?8',sourceSha256:'576d0dd97642165aa4f53afc9afa533d139f9c6ced9f6d163c361136b301d339',results,browserTesting:'unavailable',syntheticAccountsMayRemain:results.some(x=>x.test.startsWith('Guardian registration')&&x.result==='PASS'),privateTemporaryFilesRemoved:true},null,2));
}
