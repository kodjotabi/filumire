import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
const { chromium } = await import('file:///C:/Users/tabi/AppData/Local/npm-cache/_npx/e41f203b7505f1fb/node_modules/playwright/index.mjs');
const base='http://127.0.0.1:3190', out='.vercel/login-filu-audit/scroll', fixed=process.argv.includes('--fixed');
async function api(route, body, cookie, method) {
 const r=await fetch(base+route,{method:method??(body?'POST':'GET'),headers:{origin:base,...(body?{'content-type':'application/json'}:{}),...(cookie?{cookie}:{})},body:body?JSON.stringify(body):undefined});
 assert(r.ok,`Local fixture setup ${route}: ${r.status}`);return {data:await r.json(),cookie:r.headers.get('set-cookie')?.match(/filumire_auth_session=([^;]*)/)?.[1]};
}
const id=randomUUID().slice(0,8), password='fictional-display-test-password';
const guardian=await api('/api/account/register',{email:`display-${id}@example.test`,password,displayName:'Fictional Guardian',preferredLanguage:'en',confirmsGuardian:true,acceptsNotice:true});
const learner=await api('/api/account/learners',{displayName:'Fictional Learner',username:`display.${id}`,password,preferredLanguage:'en',consentsToLearnerData:true},`filumire_auth_session=${guardian.cookie}`);
const login=await api('/api/session/login',{login:`display.${id}`,password}); const cookie=`filumire_auth_session=${login.cookie}`;
await api(`/api/account/learners/${learner.data.learnerId}`,{gradeId:'level-gh-basic-4-pilot',completeOnboarding:true},cookie,'PATCH');
const learning=await api('/api/learning',undefined,cookie); const before=(await api('/api/learning?overview=1',undefined,cookie)).data.subjects;
const browser=await chromium.launch({headless:true,executablePath:'C:/Users/tabi/AppData/Local/ms-playwright/chromium_headless_shell-1234/chrome-headless-shell-win64/chrome-headless-shell.exe'});
const results=[];
try {
 for(const width of (fixed?[320,390,768,1280]:[390,1280]))for(const language of ['en','fr']) {
  const context=await browser.newContext({viewport:{width,height:900},serviceWorkers:'block'});
  await context.addCookies([{name:'filumire_auth_session',value:login.cookie,url:base,httpOnly:true,sameSite:'Strict'},{name:'filumire_signed_in',value:'1',url:base}]);
  const page=await context.newPage(), errors=[]; page.on('pageerror',e=>errors.push(e.message));
  let lastResponse, longBoundary=false;
  // Real backend request, with latency held briefly to inspect the pending state.
  await page.route('**/api/tutoring/conversation',async route=>{
   const response=await route.fetch(); lastResponse=await response.json();
   await new Promise(r=>setTimeout(r,700));
   if(longBoundary){
    const reply=lastResponse.messages.findLast(m=>m.role==='assistant');
    const sentence=language==='en'?'Read this explanation carefully. Each step helps you understand the current lesson. ':'Lis cette explication attentivement. Chaque étape aide à comprendre la leçon actuelle. ';
    reply.text=(sentence.repeat(30)).slice(0,1960)+'\nEND OF LONG RESPONSE';
    await route.fulfill({response,json:lastResponse});
   }else await route.fulfill({response});
  });
  await page.goto(`${base}/dashboard?view=ask-filu&lang=${language}&subjectId=${encodeURIComponent(learning.data.progress.subjectId)}`);
  await page.locator(`.learnerPage[lang="${language}"]`).waitFor();await page.locator('#filu-question:not([disabled])').waitFor();
  await page.screenshot({path:`${out}/${fixed?'fixed':'before'}-${width}-${language}-empty.png`,fullPage:true});
  const question=language==='en'?'Can you explain this lesson step by step?':'Peux-tu expliquer cette leçon étape par étape ?';
  await page.locator('#filu-question').fill(question); await page.locator('.filuQuestion button').click();
  await page.locator('.message.user').waitFor(); assert(await page.locator('.filuQuestion').getAttribute('aria-busy')==='true');
  await page.screenshot({path:`${out}/${fixed?'fixed':'before'}-${width}-${language}-pending.png`,fullPage:true});
  await page.locator('.message.assistant').last().waitFor(); await page.waitForFunction(()=>document.querySelector('.transcript')?.getAttribute('aria-busy')==='false');
  assert.equal(lastResponse.provider,'curriculum');
  const geometry=await page.locator('.transcript').evaluate(log=>{
   const box=log.getBoundingClientRect(), question=log.querySelector('.message.user').getBoundingClientRect(), reply=log.querySelector('.message.assistant p').getBoundingClientRect();
   return {scrollTop:log.scrollTop,questionTop:question.top-box.top,replyTop:reply.top-box.top,height:box.height,scrollHeight:log.scrollHeight};
  });
  await page.screenshot({path:`${out}/${fixed?'fixed':'before'}-${width}-${language}-response.png`,fullPage:true});
  console.log(JSON.stringify({width,language,realResponseLength:lastResponse.messages.at(-1).text.length,...geometry}));
  results.push({width,language,realBackend:true,...geometry});
  if(fixed){assert(geometry.questionTop>=-1,'new question must remain visible');assert(geometry.replyTop>=-1,'beginning of response must not be scrolled out');}
  const responseText=await page.locator('.message.assistant p').first().textContent(); assert.equal(responseText,lastResponse.messages.find(m=>m.role==='assistant').text);
  // Read-aloud controls need a device-local voice for the reply's language; without one the app shows its text-only note instead.
  const hasVoice=await page.evaluate(async lang=>{for(let i=0;i<20&&!speechSynthesis.getVoices().length;i++)await new Promise(r=>setTimeout(r,100));return speechSynthesis.getVoices().some(v=>v.localService&&v.lang.toLowerCase().startsWith(lang))},language);
  const audio=page.locator(hasVoice?'.message.assistant .readAloud':'.message.assistant .readAloudTextOnly').last(); if(hasVoice) await audio.locator('summary').click(); else await audio.waitFor();
  const overlap=await audio.evaluate(el=>el.getBoundingClientRect().top < el.previousElementSibling.getBoundingClientRect().bottom);assert.equal(overlap,false,'voice controls must follow response text');
  if(fixed){
   longBoundary=true;
   await page.locator('#filu-question').fill(language==='en'?'Show an example for this lesson.':'Montre un exemple pour cette leçon.');await page.locator('.filuQuestion button').click();
   await page.waitForFunction(()=>document.querySelector('.message.assistant:last-of-type p')?.textContent.includes('END OF LONG RESPONSE'));
   await page.waitForFunction(()=>document.querySelector('.transcript')?.getAttribute('aria-busy')==='false');
   const latest=await page.locator('.transcript').evaluate(log=>{
    const box=log.getBoundingClientRect(),questions=log.querySelectorAll('.message.user'),replies=log.querySelectorAll('.message.assistant');
    return {questionTop:questions[questions.length-1].getBoundingClientRect().top-box.top,replyTop:replies[replies.length-1].querySelector('p').getBoundingClientRect().top-box.top};
   });
   assert(latest.questionTop>=-1 && latest.replyTop>=-1,'long turn must start at its question and reply beginning');
   const lastAudio=page.locator(hasVoice?'.message.assistant .readAloud':'.message.assistant .readAloudTextOnly').last();if(hasVoice)await lastAudio.locator('summary').click();else await lastAudio.waitFor();
   assert.equal(await lastAudio.evaluate(el=>el.getBoundingClientRect().top < el.previousElementSibling.getBoundingClientRect().bottom),false);
   await page.locator('.transcript').evaluate(log=>log.scrollTop=log.scrollHeight);
   const endVisible=await lastAudio.evaluate(el=>el.getBoundingClientRect().bottom<=el.closest('.transcript').getBoundingClientRect().bottom+1);
   assert(endVisible,'voice controls and end of the long response must be reachable by scrolling');
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
   await page.screenshot({path:`${out}/fixed-${width}-${language}-long-end.png`,fullPage:true});
  }
  assert.deepEqual(errors,[]);
  await context.close();
 }
 assert.deepEqual((await api('/api/learning?overview=1',undefined,cookie)).data.subjects,before,'conversation must not change learning progress');
}finally{await browser.close();await writeFile(`${out}/${fixed?'fixed':'reproduction'}-results.json`,JSON.stringify(results,null,2));}
