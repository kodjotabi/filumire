import {chromium} from 'file:///C:/Users/tabi/AppData/Local/npm-cache/_npx/e41f203b7505f1fb/node_modules/playwright/index.mjs';
import {readFile,writeFile} from 'node:fs/promises';
import {parseEnv} from 'node:util';
import {randomUUID} from 'node:crypto';
import assert from 'node:assert/strict';
const base='https://filumire-learner-rg8j084ab-tabicrentsil-6879s-projects.vercel.app';
const root='C:/Users/tabi/Desktop/filumire-responsive/FILUMIRE_CLAUDE';
const credentials=parseEnv(await readFile(root+'/.env.preview-accounts.local','utf8'));
assert(process.env.VERCEL_OIDC_TOKEN,'Short-lived Vercel authentication required');
const browser=await chromium.launch({executablePath:'C:/Users/tabi/AppData/Local/ms-playwright/chromium_headless_shell-1234/chrome-headless-shell-win64/chrome-headless-shell.exe'}),results=[];
try{
 for(const width of [320,768,1280])for(const language of ['en','fr']){
  const context=await browser.newContext({viewport:{width,height:900},serviceWorkers:'block'});
  await context.route('**/*',route=>route.continue({headers:{...route.request().headers(),...(new URL(route.request().url()).origin===base?{'x-vercel-trusted-oidc-idp-token':process.env.VERCEL_OIDC_TOKEN}:{})}}));
  const page=await context.newPage();const response=await page.goto(base+'/login?lang='+language);assert.equal(response.status(),200);await page.locator(`.loginPage[lang="${language}"]`).waitFor();
  const art=await page.locator('.heroArt').evaluate(image=>{const frame=image.parentElement.getBoundingClientRect();return {fit:getComputedStyle(image).objectFit,ratio:frame.width/frame.height,intrinsic:image.naturalWidth/image.naturalHeight,noOverflow:document.documentElement.scrollWidth<=innerWidth}});assert.equal(art.fit,'contain');assert(Math.abs(art.ratio-art.intrinsic)<.015);assert(art.noOverflow);
  await page.screenshot({path:root+`/.vercel/login-filu-audit/preview-login-${width}-${language}.png`,fullPage:true});results.push({width,language,loginStatus:response.status(),...art});
  await context.close();
 }
 const context=await browser.newContext({serviceWorkers:'block',extraHTTPHeaders:{'x-vercel-trusted-oidc-idp-token':process.env.VERCEL_OIDC_TOKEN}});
 // API requests are restricted to the exact protected learner Preview.
 const signedIn=await context.request.post(base+'/api/session/login',{headers:{origin:base},data:{login:credentials.LEARNER_USERNAME,password:credentials.LEARNER_PASSWORD}});
 assert.equal(signedIn.status(),200,'Existing approved Preview fixture sign-in');
 const conversation=[];let historyToken;
 for(const language of ['en','fr']){
  const metadata=await context.request.get(base+'/api/tutoring/conversation?language='+language);assert.equal(metadata.status(),200);const state=await metadata.json();
  for(const question of language==='en'?['How many days are there in the week?','How many months are there in a year?']:['Combien de jours y a-t-il dans une semaine ?','Combien de mois y a-t-il dans une année ?']){
   const response=await context.request.post(base+'/api/tutoring/conversation',{headers:{origin:base},data:{question,language,requestId:randomUUID(),historyToken}});assert.equal(response.status(),200);const data=await response.json();historyToken=data.historyToken;
   assert.equal(data.assessmentProtected,state.assessmentProtected);assert.equal(data.provider,'curriculum');
   if(!state.assessmentProtected)assert.match(data.messages.at(-1).text,/7|12/);else assert.match(data.messages.at(-1).text,/scored activity|activité évaluée/);
   conversation.push({language,question,status:response.status(),assessmentProtected:data.assessmentProtected,reply:data.messages.at(-1).text});
  }
 }
 await context.request.post(base+'/api/session/logout',{headers:{origin:base}});await context.close();
 const report={url:base,login:results,authenticatedPreviewSignIn:true,conversation,ordinaryAnswersVerified:conversation.every(item=>!item.assessmentProtected),noNewAccountsOrProgressWrites:true};
 await writeFile(root+'/.vercel/login-filu-audit/preview-verification.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
}finally{await browser.close()}
