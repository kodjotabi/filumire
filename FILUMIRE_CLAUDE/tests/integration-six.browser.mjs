import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {readFile,writeFile} from 'node:fs/promises';
import {chromium} from 'file:///C:/Users/tabi/AppData/Local/npm-cache/_npx/e41f203b7505f1fb/node_modules/playwright/index.mjs';
const website='http://127.0.0.1:3200',learner='http://127.0.0.1:3201',out='.vercel/integration-six-2026-10-13';
const existing=JSON.parse(await readFile(out+'/fixture.json','utf8'));
const browser=await chromium.launch({executablePath:'C:/Users/tabi/AppData/Local/ms-playwright/chromium_headless_shell-1234/chrome-headless-shell-win64/chrome-headless-shell.exe',headless:true});
const results=[];
try {
 for(const width of [320,390,768,1280])for(const language of ['en','fr']){
  const context=await browser.newContext({viewport:{width,height:900},serviceWorkers:'block'}),page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  const prefix=language==='fr'?'/fr':'';
  await page.goto(website+prefix+'/account');
  await page.getByRole('heading',{level:1}).waitFor();
  assert.match(await page.locator('main').innerText(),language==='fr'?/ne sont pas opérationnels/:/not operational/);
  const parent=page.getByRole('link',{name:language==='fr'?'Connexion parent':'Parent sign-in',exact:true});
  const target=new URL(await parent.getAttribute('href'));assert.equal(target.origin,learner);assert.equal(target.searchParams.get('lang'),language);assert.equal(target.searchParams.get('returnTo'),'family');
  await parent.click();await page.locator(`.loginPage[lang="${language}"]`).waitFor();
  assert(new URL(page.url()).searchParams.get('returnTo')==='family');
  await page.goto(website+prefix+'/');
  if(width<=1100)await page.locator('.mobile-menu-toggle').click();
  await page.locator('.header-wrapper').screenshot({path:`${out}/header-${width}-${language}.png`});
  const subscribe=page.getByRole('link',{name:language==='fr'?'S’abonner':'Subscribe',exact:true});
  if(width>1100)assert.equal(new URL(await subscribe.getAttribute('href'),website).pathname,prefix+'/pricing');
  const start=page.locator(width<=1100?'.mobile-nav-actions a[href*="3201"]':'.header-actions a[href*="3201"]').first();
  assert.equal(new URL(await start.getAttribute('href')).searchParams.get('lang'),language);
  await page.screenshot({path:`${out}/website-${width}-${language}.png`,fullPage:true});
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'website horizontal overflow');
  await start.click();assert.equal(new URL(page.url()).origin,learner);
  await page.goto(learner+'/login?lang='+language);
  const art=await page.locator('.heroArt').evaluate(image=>{const box=image.getBoundingClientRect(),frame=image.parentElement.getBoundingClientRect();return {fit:getComputedStyle(image).objectFit,within:box.width<=frame.width+1&&box.height<=frame.height+1,noOverflow:document.documentElement.scrollWidth<=innerWidth+1};});assert.equal(art.fit,'contain');assert(art.within&&art.noOverflow);
  // Alternate fresh and existing persisted fixtures; no intervention resets.
  let fixture=existing;
  if(language==='fr'){
   const id=randomUUID().slice(0,8),password='fictional-browser-six-password';
   const registered=await context.request.post(learner+'/api/account/register',{headers:{origin:learner},data:{email:`browser-${id}@example.test`,password,displayName:'Fictional Parent',preferredLanguage:'fr',confirmsGuardian:true,acceptsNotice:true}});assert.equal(registered.status(),201);
   await page.goto(learner+'/login?lang=fr&returnTo=family');await page.waitForURL(/\/family\?lang=fr/);await page.locator('.acMain').waitFor();
   const added=await context.request.post(learner+'/api/account/learners',{headers:{origin:learner},data:{displayName:'Fictional Learner',username:`browser.${id}`,password,preferredLanguage:'fr',consentsToLearnerData:true}});assert.equal(added.status(),201);const child=await added.json();
   const updated=await context.request.patch(learner+'/api/account/learners/'+child.learnerId,{headers:{origin:learner},data:{gradeId:'level-gh-basic-4-pilot',completeOnboarding:true}});assert.equal(updated.status(),200);
   const ended=await context.request.post(learner+'/api/session/logout',{headers:{origin:learner}});assert.equal(ended.status(),200);
   fixture={username:`browser.${id}`,password};
   await page.goto(learner+'/login?lang='+language);await page.locator(`.loginPage[lang="${language}"]`).waitFor();
  }
  await page.locator('input[autocomplete="username"]').fill(fixture.username);await page.locator('input[autocomplete="current-password"]').fill(fixture.password);
  const signIn=page.waitForResponse(r=>r.url().endsWith('/api/session/login'));await page.locator('form button[type="submit"]').click();assert.equal((await signIn).status(),200);await page.locator('.homeCta').waitFor();
  const publicHome=page.locator('.filumirePublicHome').first();assert.equal(await publicHome.getAttribute('href'),website+(language==='fr'?'/fr':'/'));
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'dashboard overflow');
  // Select the original bottom-navigation/sidebar entry, not a hand-built URL.
  const navigation=await page.locator('a[href*="view=ask-filu"]').all();assert(navigation.length);
  const nav=page.locator('nav a[href*="view=ask-filu"]').last();await nav.click();await page.locator('#filu-question:not([disabled])').waitFor();
  let long=false,last;
  await page.route('**/api/tutoring/conversation',async route=>{
   if(route.request().method()!=='POST'){await route.continue();return;}
   const response=await route.fetch();last=await response.json();console.log(`Tutor HTTP ${response.status()} ${width}/${language} ${last.code??''}`);await new Promise(r=>setTimeout(r,350));
   if(long){const reply=last.messages.findLast(m=>m.role==='assistant');reply.text=(language==='fr'?'Une explication lisible pour vérifier le défilement. ':'A readable explanation for scrolling verification. ').repeat(45).slice(0,1900)+'\nEND OF LONG RESPONSE';await route.fulfill({response,json:last});}
   else await route.fulfill({response});
  });
  async function ask(question){await page.locator('#filu-question').fill(question);const send=page.locator('.filuQuestion button[type="submit"]');await send.evaluate(el=>el.scrollIntoView({block:'center',behavior:'instant'}));await send.click();try{await page.locator('.message.user').last().waitFor();await page.waitForFunction(()=>document.querySelector('.transcript')?.getAttribute('aria-busy')==='false');}catch(error){await page.screenshot({path:`${out}/failure-${width}-${language}.png`,fullPage:true});console.log('Conversation diagnostic',JSON.stringify({lastCode:last?.code,assessmentProtected:last?.assessmentProtected,errors,url:page.url(),form:await page.locator('.filuQuestion').innerText(),button:await send.evaluate(el=>({disabled:el.disabled,outer:el.outerHTML}))}));throw error;}return last;}
  let answer=await ask(language==='en'?'What is 2 + 3?':'Combien font 2 + 3 ?');assert.equal(answer.assessmentProtected,false);assert.match(answer.messages.at(-1).text,/5/);
  answer=await ask(language==='en'?'How many days are there in a week?':'Combien de jours dans une semaine ?');assert.match(answer.messages.at(-1).text,/7/);
  answer=await ask(language==='en'?'Can you name them?':'Peux-tu les nommer ?');assert.match(answer.messages.at(-1).text,language==='en'?/Monday/:/lundi/);
  long=true;await ask(language==='en'?'Show an example':'Montre un exemple');await page.locator('.message.assistant').last().getByText(/END OF LONG RESPONSE/).waitFor();
  const geometry=await page.locator('.transcript').evaluate(log=>{const questions=log.querySelectorAll('.message.user'),answers=log.querySelectorAll('.message.assistant'),box=log.getBoundingClientRect();return {questionTop:questions[questions.length-1].getBoundingClientRect().top-box.top,replyTop:answers[answers.length-1].querySelector('p').getBoundingClientRect().top-box.top};});assert(geometry.questionTop>=-1&&geometry.replyTop>=-1);
  const audio=page.locator('.message.assistant .readAloud').last();await audio.locator('summary').click();assert(await audio.evaluate(el=>el.getBoundingClientRect().top>=el.previousElementSibling.getBoundingClientRect().bottom));
  await page.locator('.transcript').evaluate(log=>log.scrollTop=log.scrollHeight);
  assert(await audio.evaluate(el=>el.getBoundingClientRect().bottom<=el.closest('.transcript').getBoundingClientRect().bottom+1));
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Ask FILU horizontal overflow');
  await page.screenshot({path:`${out}/learner-${width}-${language}.png`,fullPage:true});
  await publicHome.click();await page.waitForURL(website+(language==='fr'?'/fr':'/'));
  assert.deepEqual(errors,[]);
  results.push({width,language,account:language==='en'?'persisted-isolated':'fresh-isolated',websiteNavigation:true,parentReturn:true,actualLogin:true,directSidebarOrdinaryQuestion:true,conversationContinuity:true,voiceControls:true,longResponse:'synthetic display boundary over real backend',noHorizontalOverflow:true});console.log(`PASS ${width}/${language}: website -> learner -> Home -> sidebar -> actual FILU -> public return`);
  await context.close();
 }
 await writeFile(out+'/browser-results.json',JSON.stringify(results,null,2));
}finally{await browser.close();}
