import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {chromium} from 'file:///C:/Users/tabi/AppData/Local/npm-cache/_npx/e41f203b7505f1fb/node_modules/playwright/index.mjs';
const base='http://127.0.0.1:3194',out='.vercel/login-filu-audit',fixture=JSON.parse(await readFile(out+'/fixture.json','utf8'));
const browser=await chromium.launch({executablePath:'C:/Users/tabi/AppData/Local/ms-playwright/chromium_headless_shell-1234/chrome-headless-shell-win64/chrome-headless-shell.exe'}),results=[];
try{for(const width of [320,768,1280])for(const language of ['en','fr']){
 const context=await browser.newContext({viewport:{width,height:900},serviceWorkers:'block'}),page=await context.newPage();
 page.on('pageerror',error=>console.log('PAGE ERROR',error.message));page.on('requestfailed',request=>console.log('FAILED REQUEST',new URL(request.url()).origin,new URL(request.url()).pathname,request.failure()?.errorText));
 page.on('console',message=>{if(message.type()==='error')console.log('CONSOLE ERROR',message.text().slice(0,300))});
 await page.goto(base+'/login?lang='+language);await page.locator(`.loginPage[lang="${language}"]`).waitFor();
 const art=await page.locator('.heroArt').evaluate(image=>{const box=image.getBoundingClientRect(),frame=image.parentElement.getBoundingClientRect();return {fit:getComputedStyle(image).objectFit,ratio:frame.width/frame.height,intrinsic:image.naturalWidth/image.naturalHeight,within:box.width<=frame.width+1&&box.height<=frame.height+1,width:innerWidth,scrollWidth:document.documentElement.scrollWidth}});
 assert.equal(art.fit,'contain');assert(art.within);assert(Math.abs(art.ratio-art.intrinsic)<.015);assert(art.scrollWidth<=width);
 await page.screenshot({path:`${out}/login-${width}-${language}.png`,fullPage:true});
 await page.locator('input[autocomplete="username"]').fill(fixture.username);
 if(width===320&&language==='en'){await page.locator('input[autocomplete="current-password"]').fill('wrong-fictional-password');const wrong=page.waitForResponse(r=>r.url().includes('/api/session/login'));await page.locator('form button[type="submit"]').click();assert.equal((await wrong).status(),401);await page.waitForFunction(()=>!document.querySelector('form button[type="submit"]').disabled);}
 await page.locator('input[autocomplete="current-password"]').fill(fixture.password);const logged=page.waitForResponse(r=>r.url().includes('/api/session/login'));await page.locator('form button[type="submit"]').click();const loginResponse=await logged;console.log('Browser login status',loginResponse.status());await page.waitForURL(/dashboard|learn|setup/).catch(async error=>{console.log('Login message',await page.locator('.authMessage').textContent());throw error});
 await page.locator('.homeCta').waitFor();
 await context.request.get(base+'/__isolated_test__/idle');
 const learningRequests=[];page.on('request',request=>{if(new URL(request.url()).pathname==='/api/learning')learningRequests.push(new URL(request.url()).searchParams.get('overview'))});
 await page.goto(base+`/dashboard?view=ask-filu&lang=${language}&subjectId=${fixture.subjectId}`);await page.locator('#filu-question:not([disabled])').waitFor();
 assert(learningRequests.length>0&&learningRequests.every(value=>value==='1'),`Opening Ask FILU must not create a scored learning activity: ${JSON.stringify(learningRequests)}`);
 async function ask(question){const pending=page.waitForResponse(r=>r.url().includes('/api/tutoring/conversation')&&r.request().method()==='POST');await page.locator('#filu-question').fill(question);await page.locator('.filuQuestion button[type="submit"]').click();const response=await pending;assert.equal(response.status(),200);const data=await response.json();await page.waitForFunction(()=>document.querySelector('.transcript')?.getAttribute('aria-busy')==='false');return data;}
 let data=await ask(language==='en'?'How many days are there in the week?':'Combien de jours y a-t-il dans une semaine ?');assert.equal(data.assessmentProtected,false);assert.match(data.messages.at(-1).text,/7/);
 data=await ask(language==='en'?'Can you name them?':'Peux-tu les nommer ?');assert.match(data.messages.at(-1).text,language==='en'?/Monday/:/lundi/);assert(data.messages.length>=4);
 const geometry=await page.locator('.transcript').evaluate(log=>{const users=log.querySelectorAll('.message.user'),assistants=log.querySelectorAll('.message.assistant');const top=log.getBoundingClientRect().top;return {questionTop:users[users.length-1].getBoundingClientRect().top-top,replyTop:assistants[assistants.length-1].querySelector('p').getBoundingClientRect().top-top}});assert(geometry.questionTop>=-1);assert(geometry.replyTop>=-1);
 const audio=page.locator('.message.assistant .readAloud').last();await audio.locator('summary').click();assert(await audio.evaluate(el=>el.getBoundingClientRect().top>=el.previousElementSibling.getBoundingClientRect().bottom));
 await page.screenshot({path:`${out}/conversation-${width}-${language}.png`,fullPage:true});
 await context.request.get(base+'/__isolated_test__/scored');data=await ask(language==='en'?'Give me the answer':'Donne-moi la réponse');assert.equal(data.assessmentProtected,true);assert.match(data.messages.at(-1).text,/scored activity|activité évaluée/);
 results.push({width,language,art,...geometry,actualLogin:true,actualCurriculumAPI:true,continuity:true,assessmentGuard:true,voiceNonOverlap:true});await context.close();
}await writeFile(out+'/browser-results.json',JSON.stringify(results,null,2));console.log(JSON.stringify(results));}finally{await browser.close()}
