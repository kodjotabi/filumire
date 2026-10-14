import {chromium} from 'file:///C:/Users/tabi/AppData/Local/npm-cache/_npx/e41f203b7505f1fb/node_modules/playwright/index.mjs';
import {writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const url='https://filumire-website-8v3thtzhy-tabicrentsil-6879s-projects.vercel.app';
if(!process.env.VERCEL_OIDC_TOKEN)throw Error('Vercel local authentication token unavailable');
const browser=await chromium.launch({executablePath:'C:/Users/tabi/AppData/Local/ms-playwright/chromium_headless_shell-1234/chrome-headless-shell-win64/chrome-headless-shell.exe'}),results=[];
try{for(const width of [320,768,1280])for(const locale of ['en','fr']){
 const context=await browser.newContext({viewport:{width,height:900},serviceWorkers:'block'});
 await context.route('**/*',async route=>{const request=route.request();await route.continue({headers:{...request.headers(),...(new URL(request.url()).origin===url?{'x-vercel-trusted-oidc-idp-token':process.env.VERCEL_OIDC_TOKEN}:{})}})});
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 const response=await page.goto(url+(locale==='fr'?'/fr':'')+'/account');assert.equal(response.status(),200);
 await page.waitForFunction(()=>document.querySelector('[role=status]')?.textContent.includes('not configured')||document.querySelector('[role=status]')?.textContent.includes('pas encore configurés'));
 const button=page.locator('form button');assert(await button.isDisabled());await page.locator('input[type=email]').fill('isolated-validation@example.org');await page.locator('input[type=checkbox]').first().check();assert(await button.isEnabled());
 const pending=page.waitForResponse(r=>r.url().includes('/api/parent-auth'));await button.click();const api=await pending;assert.equal(api.status(),503);assert.equal((await api.json()).code,'configuration');
 await page.waitForFunction(()=>document.querySelector('form').getAttribute('aria-busy')==='false');await page.evaluate(()=>window.scrollTo(0,0));
 const layout=await page.evaluate(()=>({noOverflow:document.documentElement.scrollWidth<=innerWidth,skipHidden:document.querySelector('.skip-link').getBoundingClientRect().bottom<0,gap:document.querySelector('h1').getBoundingClientRect().top-document.querySelector('header').getBoundingClientRect().bottom,language:document.documentElement.lang}));assert(layout.noOverflow);assert(layout.skipHidden);assert.equal(layout.gap,24);assert.equal(layout.language,locale);
 await page.locator('.skip-link').focus();await page.keyboard.press('Enter');await page.waitForFunction(()=>document.activeElement.id==='main-content');assert.deepEqual(errors,[]);
 await page.locator('h1').click();await page.evaluate(()=>window.scrollTo(0,0));await page.screenshot({path:`../evidence/preview-${width}-${locale}.png`,fullPage:true});
 results.push({width,locale,status:response.status(),authStatus:api.status(),configurationErrorHonest:true,buttonEnabled:true,keyboardSkipWorks:true,...layout,pageErrors:errors});await context.close();
}await writeFile('../preview-browser-verification.json',JSON.stringify({url,results,realEmailDelivery:'unavailable; no email sent'},null,2));console.log(JSON.stringify({url,checks:results.length,passed:true,realEmailDelivery:'unavailable; no email sent'}));}finally{await browser.close()}
