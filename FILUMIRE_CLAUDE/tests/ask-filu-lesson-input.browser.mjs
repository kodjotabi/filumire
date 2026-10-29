// B8 regression: Ask FILU opened from an active English lesson accepts a typed question,
// including when the client-side account lookup is disturbed (marker cookie missing,
// /api/session/me failing once with 500 or 401) while the HttpOnly session stays valid.
// Also checks the lesson's Continue learning contrast and full competency titles.
// Run with: node scripts/browser-ask-filu-lesson.mjs
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {chromium} from 'file:///C:/Users/tabi/AppData/Local/npm-cache/_npx/e41f203b7505f1fb/node_modules/playwright/index.mjs';
const base='http://127.0.0.1:'+(process.env.ASK_FILU_TEST_PORT??'3197'),out='.vercel/ask-filu-lesson',fixture=JSON.parse(await readFile(out+'/fixture.json','utf8'));
const browser=await chromium.launch({executablePath:'C:/Users/tabi/AppData/Local/ms-playwright/chromium_headless_shell-1234/chrome-headless-shell-win64/chrome-headless-shell.exe'}),results=[];
async function signedInAsLearner(width){
 const context=await browser.newContext({viewport:{width,height:900},serviceWorkers:'block'}),page=await context.newPage();
 page.on('pageerror',error=>console.log('PAGE ERROR',error.message));
 await page.goto(base+'/login?lang=en');
 await page.locator('input[autocomplete="username"]').fill(fixture.email);
 await page.locator('input[autocomplete="current-password"]').fill(fixture.password);
 await page.locator('form button[type="submit"]').click();
 await page.waitForURL(/family|teacher|dashboard/);
 if(!/family/.test(page.url()))await page.goto(base+'/family?lang=en');
 await page.getByRole('button',{name:/Start learning on this device/}).first().click();
 await page.waitForURL(/dashboard/);await page.locator('.homeCta').waitFor();
 return {context,page};
}
async function englishLesson(page){
 const overview=await page.evaluate(async()=>(await fetch('/api/learning?overview=1')).json());
 const english=overview.availableSubjects.find(subject=>/english/i.test(subject.id));assert(english,'English subject available');
 await page.goto(base+'/learn?lang=en&subjectId='+encodeURIComponent(english.id));
 await page.locator('.askFiluLink').waitFor({timeout:30000});
 return english.id;
}
// Opens Ask FILU from the lesson's own link, as a learner would, and types a question.
async function askFromLesson(page,name,beforeOpen=async()=>{}){
 await beforeOpen();
 await page.locator('.askFiluLink').click();await page.waitForURL(/view=ask-filu/);
 const field=page.locator('#filu-question');
 await page.locator('#filu-question:not([disabled])').waitFor({timeout:15000}).catch(async()=>{
  throw new Error(`${name}: Ask FILU question field stayed disabled: "${await page.locator('.transcriptIntro').textContent()}"`);
 });
 await field.fill('What is a stressed syllable?');
 assert.equal(await field.inputValue(),'What is a stressed syllable?',`${name}: typed text kept`);
 assert.equal(await page.locator('.filuQuestion button[type="submit"]').isDisabled(),false,`${name}: Send enabled after typing`);
 assert.doesNotMatch(await page.locator('.transcriptIntro').textContent(),/Open a lesson first/,`${name}: no misleading lesson message`);
 const pending=page.waitForResponse(r=>r.url().includes('/api/tutoring/conversation')&&r.request().method()==='POST');
 await page.locator('.filuQuestion button[type="submit"]').click();
 assert.equal((await pending).status(),200,`${name}: question answered`);
}
try{
 const cases=[
  ['healthy',async()=>{}],
  // Any 401 on an account request clears the readable marker; the HttpOnly session remains.
  ['marker missing',async(context)=>context.clearCookies({name:'filumire_signed_in'})],
  ['session lookup 500 once',async(context,page)=>{let fail=1;await page.route('**/api/session/me',route=>fail-->0?route.fulfill({status:500,contentType:'application/json',body:'{}'}):route.continue())}],
  ['session lookup 401 once',async(context,page)=>{let fail=1;await page.route('**/api/session/me',route=>fail-->0?route.fulfill({status:401,contentType:'application/json',body:'{"code":"unauthenticated"}'}):route.continue())}],
 ];
 for(const [name,disturb] of cases){
  const {context,page}=await signedInAsLearner(390);await englishLesson(page);
  await askFromLesson(page,name,()=>disturb(context,page));
  results.push({case:name,width:390,acceptsInput:true});await context.close();
 }
 for(const width of [390,768,1280]){
  const {context,page}=await signedInAsLearner(width);const subjectId=await englishLesson(page);
  const contrast=await page.locator('.nextButton').evaluate(button=>{
   const lum=c=>{const [r,g,b]=c.match(/[\d.]+/g).slice(0,3).map(Number).map(v=>{v/=255;return v<=.03928?v/12.92:((v+.055)/1.055)**2.4});return .2126*r+.7152*g+.0722*b};
   const s=getComputedStyle(button),a=lum(s.color),b=lum(s.backgroundColor);return (Math.max(a,b)+.05)/(Math.min(a,b)+.05);
  });
  assert(contrast>=4.5,`Continue learning contrast ${contrast.toFixed(2)} at ${width}`);
  await page.goto(base+'/dashboard?lang=en&view=learning&subjectId='+encodeURIComponent(subjectId));
  await page.locator('.subjectArea strong').first().waitFor();
  const clipped=await page.locator('.subjectArea strong').evaluateAll(titles=>titles.filter(t=>t.offsetParent&&(t.scrollHeight>t.clientHeight+1||getComputedStyle(t).hyphens==='auto')).map(t=>t.textContent));
  assert.deepEqual(clipped,[],`Competency titles shown in full and not auto-hyphenated at ${width}`);
  await page.screenshot({path:`${out}/subject-${width}.png`,fullPage:true});
  results.push({width,continueContrast:+contrast.toFixed(2),titlesFull:true});await context.close();
 }
 await writeFile(out+'/browser-results.json',JSON.stringify(results,null,2));console.log(JSON.stringify(results));console.log('PASS: Ask FILU accepts input from an active lesson (4 cases), contrast and competency titles at 390/768/1280');
}finally{await browser.close()}
