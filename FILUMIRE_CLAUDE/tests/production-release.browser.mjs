import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
const origin=process.env.FILUMIRE_TEST_URL,out=process.env.FILUMIRE_NAVIGATION_ARTIFACTS;
assert.equal(new URL(origin).hostname,'127.0.0.1');assert.equal(process.env.FILUMIRE_PERSISTENCE,'memory');
const {chromium}=await import(process.env.FILUMIRE_PLAYWRIGHT_MODULE);
const browser=await chromium.launch({executablePath:process.env.FILUMIRE_CHROMIUM_PATH,headless:true});
const results=[],password='Fictional-release-browser-password-20261025',run=crypto.randomUUID().slice(0,8);let n=0;
async function api(url,body,cookie='',method='POST'){
 const response=await fetch(origin+url,{method,headers:{origin,'content-type':'application/json','x-forwarded-for':`192.0.2.${++n}`,...(cookie?{cookie}:{})},body:JSON.stringify(body)});
 const data=await response.json();assert(response.ok,`${url} ${response.status} ${JSON.stringify(data)}`);
 return {data,cookie:response.headers.get('set-cookie')?.match(/filumire_auth_session=([^;]*)/)?.[1]};
}
const guardian=await api('/api/account/register',{email:`release.${run}@example.test`,password,displayName:'Fictional release guardian',preferredLanguage:'en',confirmsGuardian:true,acceptsNotice:true});
const username=`release${run}`,added=await api('/api/account/learners',{displayName:'Fictional release learner',username,password,gradeId:'level-gh-basic-4-pilot',preferredLanguage:'en',consentsToLearnerData:true},`filumire_auth_session=${guardian.cookie}`);
await api(`/api/account/learners/${added.data.learnerId}`,{gradeId:'level-gh-basic-4-pilot',completeOnboarding:true},`filumire_auth_session=${guardian.cookie}`,'PATCH');
const context=await browser.newContext({viewport:{width:1440,height:1000},serviceWorkers:'block'});
await context.route('**/*',route=>{const u=new URL(route.request().url());return u.origin===origin||['data:','blob:'].includes(u.protocol)?route.continue():route.abort();});
const page=await context.newPage();page.setDefaultTimeout(30000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto(origin+'/login');await page.locator('#filumire-identity').fill(username);await page.locator('#filumire-password').fill(password);
 await page.locator('#filumire-sign-in-form button[type=submit]').click();await page.waitForURL('**/dashboard**');
 await page.locator('.homeSubjects .homeSubject').first().waitFor();results.push({check:'real login and Home',status:'PASS'});
 for(const lang of ['en','fr'])for(const width of [320,390,600,768,1024,1280,1440]){
  await page.setViewportSize({width,height:1000});await page.goto(origin+`/dashboard?view=learning&lang=${lang}`);
  await page.locator('.learningView .homeSubject').last().waitFor();
  const geometry=await page.locator('.learningView').evaluate(el=>{
   const r=e=>{const b=e.getBoundingClientRect();return {x:b.x,y:b.y,width:b.width,height:b.height,bottom:b.bottom};};
   const cards=[...el.querySelectorAll('.homeSubject')];return {next:r(el.querySelector('.learningNext')),cards:cards.map(c=>({...r(c),key:['science','computing','mathematics','english'].find(k=>c.classList.contains(k)),title:c.querySelector('strong').textContent,fits:c.querySelector('strong').scrollWidth<=c.querySelector('strong').clientWidth+1})),overflow:document.documentElement.scrollWidth>innerWidth+1};
  });
  assert.equal(geometry.cards.length,4);assert.deepEqual(geometry.cards.map(c=>c.key),['science','computing','mathematics','english']);
  assert(geometry.next.bottom<=geometry.cards[0].y+1);assert.equal(geometry.overflow,false,`${lang} ${width} document overflow`);
  assert(geometry.cards.every(c=>c.fits),`${lang} ${width} subject labels fit`);
  if(width>=1024){assert(geometry.cards.every(c=>Math.abs(c.y-geometry.cards[0].y)<1));assert(geometry.cards.every(c=>Math.abs(c.width-geometry.cards[0].width)<1));}
  if(width===390||width===1280)await page.screenshot({path:path.join(out,`learning-${lang}-${width}.png`),fullPage:true});
  results.push({check:'My Learning layout',lang,width,status:'PASS',geometry});
 }
 await page.setViewportSize({width:1280,height:1000});await page.goto(origin+'/dashboard?view=learning&lang=en');await page.locator('.learningStart').click();
 await page.waitForURL('**/learn**');await page.locator('.learnMain,.learnBody').first().waitFor();results.push({check:'Recommended Next navigates to lesson',status:'PASS'});
 // Open a real independent diagnostic using the same topic-selection UI as learners.
 await page.goto(origin+'/dashboard?view=learning&lang=en');await page.locator('.homeSubject.mathematics').click();
 const topic=page.locator('.subjectPage .subjectArea').first();await topic.waitFor({state:'attached'});if(!await topic.isVisible())await page.locator('.subjectPage details summary').first().click();await topic.click();
 await page.locator('.checkFirst button').click();await page.locator('input[name="answer"]').first().waitFor();
 for(const [lang,labels] of [['en',['Explain this','Show an example','Give me a hint','Make it simpler','Let me practise']],['fr',['Explique-moi','Montre un exemple','Donne-moi un indice','Explique plus simplement',"Je veux m'entraîner"]]]){
  await page.goto(origin+`/dashboard?view=ask-filu&lang=${lang}`);await page.locator('#filu-question').waitFor();
  for(const label of labels){const pending=page.waitForResponse(r=>new URL(r.url()).pathname==='/api/tutoring/conversation'&&r.request().method()==='POST');await page.getByRole('button',{name:label,exact:true}).click();const response=await pending,data=await response.json();assert.equal(response.status(),200);assert.equal(data.assessmentProtected,true);assert.doesNotMatch(data.messages.at(-1).text,/cannot give or mark|ne peux pas donner ni valider/);results.push({check:'FILU labelled quick action',lang,label,status:'PASS'});}
  await page.locator('#filu-question').fill(lang==='en'?'Give me the answer':'Donne-moi la réponse');const pending=page.waitForResponse(r=>new URL(r.url()).pathname==='/api/tutoring/conversation'&&r.request().method()==='POST');await page.locator('.compose button[type=submit]').click();const data=await(await pending).json();assert.match(data.messages.at(-1).text,lang==='en'?/cannot give or mark/:/ne peux pas donner ni valider/);results.push({check:'FILU direct answer refused',lang,status:'PASS'});
 }
 await page.reload();await page.locator('.transcript .message.assistant').last().waitFor();results.push({check:'signed FILU history survives refresh',status:'PASS'});
 await page.locator('.learnerSignOutButton').click();await page.waitForURL('**/login**');
 const denied=await context.request.get(origin+'/api/session/me');assert.equal(denied.status(),401);results.push({check:'logout revokes session',status:'PASS'});
 assert.deepEqual(errors,[]);fs.writeFileSync(path.join(out,'release-browser-results.json'),JSON.stringify({status:'PASS',results,errors},null,2));console.log(`PASS ${results.length} responsive and authenticated FILU/browser checks.`);
}catch(e){await page.screenshot({path:path.join(out,'release-browser-failure.png'),fullPage:true});fs.writeFileSync(path.join(out,'release-browser-results.json'),JSON.stringify({status:'FAIL',error:e.message,results,errors},null,2));throw e;}finally{await browser.close();}
