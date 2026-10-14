import assert from 'node:assert/strict';
import {readFile,mkdir} from 'node:fs/promises';
import {join} from 'node:path';
const base='http://127.0.0.1:3191';
const fixtures=JSON.parse(await readFile(process.env.FILUMIRE_TEST_FIXTURES,'utf8'));
const {chromium}=await import(process.env.FILUMIRE_PLAYWRIGHT_MODULE);
const browser=await chromium.launch({headless:true,executablePath:process.env.FILUMIRE_CHROMIUM_PATH});
const artifacts=process.env.FILUMIRE_NAVIGATION_ARTIFACTS;
if(artifacts)await mkdir(artifacts,{recursive:true});
let turns=0;
try{
  for(const fixture of fixtures){
    const context=await browser.newContext({viewport:{width:fixture.width,height:900}});
    await context.addCookies([{name:'filumire_auth_session',value:fixture.cookie,url:base,httpOnly:true,sameSite:'Lax'},{name:'filumire_signed_in',value:'1',url:base}]);
    const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
    // No page.route, fake fetch or response fixtures: every API request goes to Next.
    await page.goto(`${base}/dashboard?lang=en&view=ask-filu&subjectId=${fixture.subjectId}`);
    await page.locator('#filu-question').waitFor({timeout:60000});
    assert.equal(await page.locator('#filu-question').isEnabled(),true);
    async function ask(text,button){
      const result=page.waitForResponse(r=>r.url().endsWith('/api/tutoring/conversation')&&r.request().method()==='POST');
      if(button)await page.getByRole('button',{name:button,exact:true}).click();
      else{await page.locator('#filu-question').fill(text);await page.locator('.compose button[type="submit"]').click();}
      const response=await result;assert.equal(response.status(),200);
      const data=await response.json();assert.equal(data.provider,'curriculum');
      await page.locator('.transcript .message.assistant').last().getByText(data.messages.at(-1).text,{exact:true}).waitFor();
      await page.locator('.compose button[type="submit"]').waitFor();
      turns++;return data;
    }
    // The real learning route may legitimately select an assessment on entry.
    // Switch this fictional stored fixture to teaching before testing responses.
    await context.request.post(base+'/__filu_test__/mode',{data:{learnerId:fixture.learnerId}});
    const explain=await ask(null,'Explain this');assert.equal(explain.assessmentProtected,false);
    const hint=await ask(null,'Give me a hint');assert.notEqual(explain.messages.at(-1).text,hint.messages.at(-1).text);
    const example=await ask(null,'Show an example');assert.notEqual(explain.messages.at(-1).text,example.messages.at(-1).text);
    const practice=await ask(null,'Let me practise');assert.equal(practice.practiceActive,true);
    const expected=JSON.parse(Buffer.from(practice.historyToken.split('.')[0],'base64url').toString()).practice.answer;
    const wrong=await ask('not-the-answer');assert.equal(wrong.practiceActive,true);
    const correct=await ask(expected);assert.match(correct.messages.at(-1).text,/You found it/);
    if(fixture.discipline==='mathematics'&&fixture.width===390){
      await context.setOffline(true);await page.locator('#filu-question').fill('Explain this');await page.locator('.compose button[type="submit"]').click();
      await page.getByRole('alert').getByText('Your question has not received a response. Check your connection, then retry.',{exact:true}).waitFor();
      assert.equal(await page.getByRole('button',{name:'Edit question',exact:true}).isVisible(),true);
      await context.setOffline(false);const retried=await ask(null,'Retry');assert.equal(retried.assessmentProtected,false);
    }
    await page.reload();await page.locator('.transcript .message.assistant').last().waitFor();
    assert.match(await page.locator('.transcript').innerText(),/You found it/,'refresh preserves server-signed conversation');
    await context.request.post(base+'/__filu_test__/mode',{data:{learnerId:fixture.learnerId}});
    // Switch language through the real header, without losing the bilingual transcript.
    await page.getByRole('button',{name:'Passer en français',exact:true}).click();
    await page.getByRole('heading',{name:'Parle à FILU',exact:true}).waitFor();
    const metadata=await (await context.request.get(base+'/api/tutoring/conversation?language=fr')).json();
    await page.locator('.fTopicText span').getByText(metadata.topicTitle,{exact:true}).waitFor();
    const french=await ask(null,'Explique-moi');assert.equal(french.messages.at(-1).language,'fr');
    assert(!french.messages.at(-1).text.includes('Let’s'));
    const privateText='Mon adresse est 88 Rue Imaginaire';
    const privacy=await ask(privateText);assert(!JSON.stringify(privacy).includes(privateText));
    const stored=await page.evaluate(()=>sessionStorage.getItem('filumire.filuSessionConversation'));assert(!stored.includes(privateText));
    await context.request.post(base+'/__filu_test__/mode',{data:{learnerId:fixture.learnerId,scored:true}});
    const protectedReply=await ask('Donne-moi la réponse');assert.equal(protectedReply.assessmentProtected,true);assert.match(protectedReply.messages.at(-1).text,/ne peux pas donner ni valider/);
    const current=page.locator('nav a[aria-current="page"]');assert.equal(await current.count(),1);assert.match(await current.getAttribute('href'),/view=ask-filu/);
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
    if(artifacts)await page.screenshot({path:join(artifacts,`actual-filu-${fixture.discipline}-${fixture.width}.png`),fullPage:true});
    await page.getByRole('button',{name:'Effacer la conversation',exact:true}).click();assert.equal(await page.locator('.transcript .message').count(),0);
    assert.deepEqual(errors,[]);console.log(`PASS: actual browser → Next API → memory curriculum → interactive ${fixture.discipline} at ${fixture.width}px (EN/FR, practice, refresh, privacy, assessment)`);
    await context.close();
  }
  console.log(`PASS: ${turns} actual HTTP tutoring turns; no mocked API responses`);
}finally{await browser.close();}
