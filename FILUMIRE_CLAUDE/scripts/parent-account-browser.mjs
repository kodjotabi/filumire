import { chromium } from 'file:///C:/Users/tabi/AppData/Local/npm-cache/_npx/e41f203b7505f1fb/node_modules/playwright/index.mjs';
import {writeFile,mkdir} from 'node:fs/promises';
const browser=await chromium.launch({executablePath:'C:/Users/tabi/AppData/Local/ms-playwright/chromium_headless_shell-1234/chrome-headless-shell-win64/chrome-headless-shell.exe'});
await mkdir('.vercel/parent-account-audit/evidence',{recursive:true});
const results=[];
try{for(const width of [320,768,1280])for(const locale of ['en','fr']){
 const page=await browser.newPage({viewport:{width,height:900}});
 await page.goto('http://127.0.0.1:3193'+(locale==='fr'?'/fr':'')+'/account');
 await page.waitForResponse(r=>r.url().includes('/api/subscriptions')).catch(()=>{});
 await page.locator('input[type=email]').fill('parent@example.org');await page.locator('input[type=checkbox]').first().check();
 const data=await page.evaluate(()=>{const r=e=>{const b=e.getBoundingClientRect();return {top:b.top,bottom:b.bottom,left:b.left,right:b.right}};return {disabled:document.querySelector('form button').disabled,skip:r(document.querySelector('.skip-link')),heading:r(document.querySelector('h1')),header:r(document.querySelector('header')),scrollWidth:document.documentElement.scrollWidth,width:innerWidth,message:document.querySelector('[role=status]').textContent}});
 await page.screenshot({path:`.vercel/parent-account-audit/evidence/${process.argv[2]||'before'}-${width}-${locale}.png`,fullPage:true});
 results.push({width,locale,...data});await page.close();
}console.log(JSON.stringify(results));await writeFile(`.vercel/parent-account-audit/${process.argv[2]||'before'}.json`,JSON.stringify(results,null,2));}finally{await browser.close()}
