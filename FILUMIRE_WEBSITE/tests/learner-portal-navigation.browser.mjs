// Loopback-only integration checks. Uses fictional, in-memory learner accounts.
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
assert.equal(process.env.FILUMIRE_PERSISTENCE,'memory','Use isolated in-memory local learner servers only');
const {chromium}=await import(process.env.FILUMIRE_PLAYWRIGHT_MODULE || 'playwright');
const fallback=process.argv.includes('--fallback');
const website=fallback?'http://127.0.0.1:3212':'http://127.0.0.1:3210';
const learner='http://127.0.0.1:3211';
const browser=await chromium.launch({executablePath:process.env.FILUMIRE_CHROMIUM_PATH});
try {
 for(const width of [1440,1101,390,768]) for(const language of ['en','fr']) {
  const context=await browser.newContext({viewport:{width,height:1000},serviceWorkers:'block'});
  await context.route('**/*',route=>['127.0.0.1','localhost'].includes(new URL(route.request().url()).hostname)?route.continue():route.abort());
  const page=await context.newPage(); page.setDefaultTimeout(45000);
  const prefix=language==='fr'?'/fr':'';
  const label=language==='fr'?'Commencer':'Start learning';
  const home=website+(prefix||'/');
  const expected=fallback?prefix+'/contact#learner':learner+'/?lang='+language;
  for(const path of ['', '/how-it-works','/subjects','/learners','/parents','/schools','/about','/contact','/privacy','/ghana']) {
   await page.goto(website+prefix+(path||'/'),{waitUntil:'domcontentloaded'});
   const portal=page.locator('.fs-header-actions').getByRole('link',{name:label,exact:true,includeHidden:true});
   await portal.waitFor({state:'attached'}); assert.equal(await portal.getAttribute('href'),expected);
   assert.equal(await page.locator('header .fs-brand').getAttribute('href'),prefix||'/');
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'horizontal overflow');
  }
  // The Start learning button stays in the header bar at every width.
  async function openPortal() { await page.locator('.fs-header-actions').getByRole('link',{name:label,exact:true}).click(); }
  await page.goto(home); await page.locator('header .fs-brand').click(); await page.waitForURL(home);
  await openPortal();
  if(fallback) {
   await page.waitForURL(website+prefix+'/contact#learner');
   await page.locator('#learner').waitFor();
   assert.equal(new URL(page.url()).origin,website);
  } else {
   await page.waitForURL(learner+'/?lang='+language);
   await page.locator('.home').waitFor();
   let back=page.locator('.filumirePublicHome:visible').first();
   assert.equal(await back.getAttribute('href'),home);
   assert.equal(await back.locator('span').innerText(),language==='fr'?'Site web':'Website');
   await back.click(); await page.waitForURL(home);
   // Existing protected-route authentication behaviour must still apply.
   await page.goto(learner+'/dashboard?lang='+language);
   assert.equal((await context.request.get(learner+'/api/learning?overview=1')).status(),401);
   // The existing dashboard shows a sign-in prompt rather than forcing a redirect.
   await page.locator('a[href="/login?lang='+language+'"]').click();
   await page.waitForURL(url=>url.pathname==='/login'); await page.locator('input[autocomplete="username"]').waitFor();
   assert.equal(new URL(page.url()).searchParams.get('lang'),language);
   const id=randomUUID().slice(0,8),password='fictional-local-navigation-password',username='navigation.'+id;
   const post=(path,data)=>context.request.post(learner+path,{headers:{origin:learner},data});
   assert.equal((await post('/api/account/register',{email:`navigation-${id}@example.test`,password,displayName:'Fictional Guardian',preferredLanguage:language,confirmsGuardian:true,acceptsNotice:true})).status(),201);
   const added=await post('/api/account/learners',{displayName:'Fictional Learner',username,password,preferredLanguage:language,consentsToLearnerData:true}); assert.equal(added.status(),201);
   const child=await added.json();
   assert.equal((await context.request.patch(learner+'/api/account/learners/'+child.learnerId,{headers:{origin:learner},data:{gradeId:'level-gh-basic-4-pilot',completeOnboarding:true}})).status(),200);
   assert.equal((await post('/api/session/logout',{})).status(),200);
   // Sign in through the existing form; never inspect cookies or token values.
   await page.goto(learner+'/login?lang='+language);
   await page.locator('input[autocomplete="username"]').fill(username);
   await page.locator('input[autocomplete="current-password"]').fill(password);
   const signed=page.waitForResponse(r=>new URL(r.url()).pathname==='/api/session/login');
   await page.locator('form button[type="submit"]').click(); assert.equal((await signed).status(),200);
   await page.waitForURL(url=>url.pathname==='/dashboard');
   const progress=async()=>{const r=await context.request.get(learner+'/api/learning?overview=1');assert.equal(r.status(),200);const value=await r.json();return value.subjects;};
   const before=await progress();
   await page.locator('.filumirePublicHome:visible').first().click(); await page.waitForURL(home);
   await openPortal(); await page.waitForURL(url=>url.origin===learner&&url.pathname==='/dashboard');
   assert.deepEqual(await progress(),before,'leaving and returning preserves progress');
   assert.equal((await context.request.get(learner+'/api/session/me')).status(),200,'existing session remains authenticated');
   assert.equal((await post('/api/session/logout',{})).status(),200);
  }
  console.log(JSON.stringify({result:'PASS',width,language,mode:fallback?'missing_destination':'two_way_and_session',publicPages:10}));
  await context.close();
 }
}finally {await browser.close();}
