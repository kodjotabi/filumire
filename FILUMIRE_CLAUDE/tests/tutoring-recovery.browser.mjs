import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {chromium} from 'file:///C:/Users/tabi/AppData/Local/npm-cache/_npx/e41f203b7505f1fb/node_modules/playwright/index.mjs';
const base='http://127.0.0.1:3202',out='.vercel/integration-six-2026-10-13';
const fixtures=JSON.parse(await readFile(out+'/recovery-fixtures.json','utf8'));
const browser=await chromium.launch({executablePath:'C:/Users/tabi/AppData/Local/ms-playwright/chromium_headless_shell-1234/chrome-headless-shell-win64/chrome-headless-shell.exe'}),results=[];
try{for(const [index,fixture] of fixtures.entries()){
 const {width,language}=fixture,fr=language==='fr';
 const context=await browser.newContext({viewport:{width,height:900},serviceWorkers:'block'}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 async function signIn(identifier,parent=false){
  await page.goto(base+'/login?lang='+language+(parent?'&returnTo=family':''));await page.locator(`.loginPage[lang="${language}"]`).waitFor();
  await page.locator('input[autocomplete="username"]').fill(identifier);await page.locator('input[autocomplete="current-password"]').fill(fixture.password);
  const response=page.waitForResponse(r=>r.url().endsWith('/api/session/login'));await page.locator('form button[type="submit"]').click();assert.equal((await response).status(),200);
  await page.waitForURL(parent?/\/family\?lang=/:/\/dashboard\?lang=/);
  await page.locator(parent?'.fmLearner':'.homeCta').waitFor();
 }
 async function ask(){
  await page.locator('nav a[href*="view=ask-filu"]').last().click();await page.locator('#filu-question:not([disabled])').waitFor();
  await page.locator('#filu-question').fill(fr?'Combien font 2 + 3 ?':'What is 2 + 3?');
  const send=page.locator('.filuQuestion button[type="submit"]');await send.evaluate(el=>el.scrollIntoView({block:'center',behavior:'instant'}));
  const pending=page.waitForResponse(r=>r.url().endsWith('/api/tutoring/conversation')&&r.request().method()==='POST');await send.click();const response=await pending;assert.equal(response.status(),200);const result=await response.json();
  await page.waitForFunction(()=>document.querySelector('.transcript')?.getAttribute('aria-busy')==='false');return result;
 }
 async function signOut(){
  const pending=page.waitForResponse(r=>r.url().endsWith('/api/session/logout'));await page.getByRole('button',{name:fr?'Se déconnecter':/^Sign out$/i,exact:true}).click();assert.equal((await pending).status(),200);
 }
 await signIn(fixture.username);assert.equal((await ask()).assessmentProtected,true,'real existing-history failure before recovery');
 await signOut();await signIn(fixture.guardianEmail,true);
 const before=await (await context.request.get(base+`/__isolated_recovery__/${index}/history`)).json();
 const panel=page.getByRole('region',{name:fr?'Récupération de FILU':'FILU recovery'});
 await panel.getByRole('button',{name:fr?'Récupérer l’accès à FILU':'Recover Ask FILU',exact:true}).click();
 const confirm=panel.getByRole('button',{name:fr?'Confirmer la récupération':'Confirm recovery',exact:true});assert(await confirm.isDisabled());
 await panel.getByRole('checkbox').check();
 const pending=page.waitForResponse(r=>r.url().endsWith('/tutoring-recovery'));await confirm.click();const recovery=await pending;assert.equal(recovery.status(),200);assert.equal((await recovery.json()).recovered,2);
 await panel.getByRole('status').getByText(fr?/conservés/:/preserved/).waitFor();
 const after=await (await context.request.get(base+`/__isolated_recovery__/${index}/history`)).json();assert.equal(after.sha256,before.sha256,'original records and progress must remain byte-identical');
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await page.screenshot({path:`${out}/recovery-parent-${width}-${language}.png`,fullPage:true});
 await signOut();await signIn(fixture.username);
 const answer=await ask();assert.equal(answer.assessmentProtected,false);assert.match(answer.messages.at(-1).text,/5/);
 await page.screenshot({path:`${out}/recovery-answer-${width}-${language}.png`,fullPage:true});
 const lesson=page.waitForResponse(r=>r.url().includes('/api/learning')&&r.request().method()==='GET'&&!new URL(r.url()).searchParams.has('overview')&&!new URL(r.url()).searchParams.has('dashboard'));
 await page.getByRole('link',{name:fr?/Retour à ma leçon/:/Back to my lesson/}).click();const delivered=await lesson;assert.equal(delivered.status(),200);const activity=await delivered.json();assert(activity.content?.assessmentItemId);
 const protectedAnswer=await ask();assert.equal(protectedAnswer.assessmentProtected,true,'genuine new scored activity after recovery remains protected');
 assert.deepEqual(errors,[]);results.push({width,language,originalFailureReproduced:true,guardianUIRecovery:true,confirmationRequired:true,historyHashUnchanged:true,ordinaryAnswerVerified:true,resumedAssessmentProtected:true});console.log(`PASS recovery ${width}/${language}: historical failure -> guardian confirmation -> preserved history -> ordinary answer -> genuine assessment restriction`);
 await context.close();
}await writeFile(out+'/recovery-browser-results.json',JSON.stringify(results,null,2));}finally{await browser.close();}
