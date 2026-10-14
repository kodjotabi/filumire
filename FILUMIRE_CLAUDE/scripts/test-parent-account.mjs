import {createServer} from 'node:http';
import {readFile,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {chromium} from 'file:///C:/Users/tabi/AppData/Local/npm-cache/_npx/e41f203b7505f1fb/node_modules/playwright/index.mjs';
import {loadTs} from '../.vercel/parent-account-audit/source/tests/load-ts.mjs';
const root=new URL('../.vercel/parent-account-audit/source/',import.meta.url);
const {LocalDatabase}=await import(await loadTs(new URL('src/lib/subscriptions/database.ts',root)));
const {ParentAuth}=await import(await loadTs(new URL('src/lib/subscriptions/auth.ts',root)));
const {BillingService}=await import(await loadTs(new URL('src/lib/subscriptions/service.ts',root)));
const {handleAuth,handleBilling}=await import(await loadTs(new URL('src/lib/subscriptions/http.ts',root)));
const origin='http://127.0.0.1:3192',outbox=[];
let failMail=false,slow=false;
const db=new LocalDatabase(':memory:',await readFile(new URL('src/lib/subscriptions/local-schema.sql',root),'utf8'));
const auth=new ParentAuth(db,async(email,url)=>{if(slow)await new Promise(r=>setTimeout(r,300));if(failMail)throw Error('isolated simulated mail failure');outbox.push({email,url});},origin,'isolated-test-secret-at-least-32-characters');
const deps={db,auth,origin,billing:new BillingService(db,null,()=>new Date(),false)};
const server=createServer(async(req,res)=>{try{
 let response;
 if(req.url.startsWith('/api/parent-auth')||req.url.startsWith('/api/subscriptions')){
  const chunks=[];for await(const chunk of req)chunks.push(chunk);
  const request=new Request(origin+req.url,{method:req.method,headers:req.headers,...(req.method!=='GET'?{body:Buffer.concat(chunks)}:{})});
  response=await (req.url.startsWith('/api/parent-auth')?handleAuth:handleBilling)(request,deps);
 }else response=await fetch('http://127.0.0.1:3193'+req.url,{redirect:'manual'});
 res.statusCode=response.status;response.headers.forEach((value,key)=>{if(!['content-encoding','content-length','transfer-encoding','set-cookie'].includes(key))res.setHeader(key,value)});
 if(response.headers.getSetCookie().length)res.setHeader('set-cookie',response.headers.getSetCookie());res.end(Buffer.from(await response.arrayBuffer()));
 }catch{res.statusCode=500;res.end('Isolated test server error')}});
await new Promise(r=>server.listen(3192,'127.0.0.1',r));
const browser=await chromium.launch({executablePath:'C:/Users/tabi/AppData/Local/ms-playwright/chromium_headless_shell-1234/chrome-headless-shell-win64/chrome-headless-shell.exe'});
const results=[];
try{
for(const width of [320,768,1280])for(const locale of ['en','fr']){
 const context=await browser.newContext({viewport:{width,height:900},serviceWorkers:'block'}),page=await context.newPage();
 await page.goto(origin+(locale==='fr'?'/fr':'')+'/account');
 const button=page.locator('form button'),email=page.locator('input[type=email]'),guardian=page.locator('input[type=checkbox]').first();
 await page.waitForFunction(()=>!document.querySelector('[role=status]').textContent.includes('Please wait')&&!document.querySelector('[role=status]').textContent.includes('Veuillez patienter'));
 assert(await button.isDisabled());await email.fill('invalid');await guardian.check();assert(await button.isDisabled());
 await email.fill(`parent-${width}-${locale}@example.org`);await guardian.uncheck();assert(await button.isDisabled());await guardian.check();assert(await button.isEnabled());
 await page.evaluate(()=>window.scrollTo(0,0));
 const layout=await page.evaluate(()=>{const skip=document.querySelector('.skip-link').getBoundingClientRect(),heading=document.querySelector('h1').getBoundingClientRect(),header=document.querySelector('header').getBoundingClientRect();return {skipHidden:skip.bottom<0,headingBelowHeader:heading.top>=header.bottom,gap:heading.top-header.bottom,noOverflow:document.documentElement.scrollWidth<=innerWidth}});
 assert(layout.skipHidden);assert(layout.headingBelowHeader);assert(layout.noOverflow);assert(layout.gap<=26);
 await page.locator('.skip-link').focus();assert(await page.locator('.skip-link').isVisible());await page.keyboard.press('Enter');await page.waitForFunction(()=>document.activeElement.id==='main-content');
 slow=true;const pending=page.waitForResponse(r=>r.url().includes('/api/parent-auth'));await button.click();await page.waitForFunction(()=>document.querySelector('form').getAttribute('aria-busy')==='true');assert(await button.isDisabled());
 assert.equal((await pending).status(),200);slow=false;await page.waitForFunction(()=>document.querySelector('form').getAttribute('aria-busy')==='false');
 assert.match(await page.locator('[role=status]').textContent(),locale==='fr'?/accepté/:/accepted/);
 const link=outbox.at(-1).url;await page.goto(link);const confirm=page.getByRole('button',{name:locale==='fr'?'Confirmer la connexion':'Confirm sign-in',exact:true});await confirm.click();await page.waitForFunction(()=>!document.querySelector('input[type=email]'));
 assert.equal((await context.cookies()).find(c=>c.name==='filumire_parent').httpOnly,true);
 await page.getByRole('button',{name:locale==='fr'?'Se déconnecter':'Sign out',exact:true}).click();await email.waitFor();
 assert(!((await context.cookies()).some(c=>c.name==='filumire_parent')));
 await email.fill(`failed-${width}-${locale}@example.org`);await guardian.check();failMail=true;const failure=page.waitForResponse(r=>r.url().includes('/api/parent-auth'));await button.click();assert.equal((await failure).status(),503);failMail=false;
 await page.waitForFunction(()=>document.querySelector('form').getAttribute('aria-busy')==='false');assert.match(await page.locator('[role=status]').textContent(),locale==='fr'?/pas pu être envoyé/:/could not be sent/);assert(await button.isEnabled());
 await page.evaluate(()=>window.scrollTo(0,0));await page.screenshot({path:`.vercel/parent-account-audit/evidence/after-${width}-${locale}.png`,fullPage:true});
 results.push({width,locale,...layout,simulatedRequestConfirmationLogout:true,mailFailureHonest:true});await context.close();
}
// Unconfigured deployment must allow a valid attempt and report configuration failure honestly.
const page=await browser.newPage();await page.goto('http://127.0.0.1:3193/account');await page.waitForFunction(()=>document.querySelector('[role=status]').textContent.includes('not configured'));
await page.locator('input[type=email]').fill('unavailable@example.org');await page.locator('input[type=checkbox]').first().check();assert(await page.locator('form button').isEnabled());const unavailable=page.waitForResponse(r=>r.url().includes('/api/parent-auth'));await page.locator('form button').click();assert.equal((await unavailable).status(),503);await page.waitForFunction(()=>document.querySelector('[role=status]').textContent.includes('not configured'));
assert.equal((await db.query('SELECT * FROM filumire_grants')).rows.length,0);assert.equal((await db.query('SELECT * FROM filumire_auth_session')).rows.length,0);
await writeFile('.vercel/parent-account-audit/verification.json',JSON.stringify({results,unconfiguredServiceHonest:true,emailDelivery:'simulated only; no real email sent',noSubscriptionsOrSessionsLeft:true},null,2));console.log(JSON.stringify(results));
}finally{await browser.close();await new Promise(r=>server.close(r));await db.close()}
