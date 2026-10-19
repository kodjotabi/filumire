// Real React effects and browser session storage; loopback and fictional data only.
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolvePlaywright, launchBrowser } from '../scripts/grade-navigation-support.mjs';
const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const require = createRequire(resolve(root, 'package.json'));
const { build } = require('esbuild');
const { chromium } = await import(resolvePlaywright(root));
const bundle = await build({ stdin: { contents: `
  import React from 'react';
  import { createRoot } from 'react-dom/client';
  import { useLessonClosure } from './apps/learner/services/use-lesson-closure';
  const root = createRoot(document.getElementById('root'));
  function Screen({data, language}) {
    const state = useLessonClosure(data, language);
    return <><div id="summary">{state.closure?.summary.title ?? ''}</div><div id="loading">{String(state.loading)}</div></>;
  }
  window.showActivity = (data, language) => root.render(<Screen data={data} language={language}/>);
`, resolveDir: root, loader: 'tsx' }, bundle: true, write: false, platform: 'browser', define: { 'process.env.NODE_ENV': '"production"' } });
const server = createServer((req, res) => {
  if (req.url === '/test.js') { res.setHeader('Content-Type', 'text/javascript'); res.end(bundle.outputFiles[0].text); }
  else { res.setHeader('Content-Type', 'text/html'); res.end('<div id="root"></div><script src="/test.js"></script>'); }
});
await new Promise(done => server.listen(0, '127.0.0.1', done));
const origin = `http://127.0.0.1:${server.address().port}`;
const browser = await launchBrowser(chromium);
try {
  for (const language of ['en', 'fr']) {
    const context = await browser.newContext({ serviceWorkers: 'block' });
    // Deny all external requests; never access a hosted deployment or database.
    await context.route('**/*', route => new URL(route.request().url()).origin === origin ? route.continue() : route.abort());
    const page = await context.newPage();
    const closure = { interventionId: 'pattern-instruction', competencyId: 'patterns', subjectId: 'math', completedAt: new Date().toISOString(), language,
      summary: { title: 'Find the Change', available: true }, evidence: {} };
    const activity = (topic, reasonCode = 'INSTRUCTION_CHECK') => ({ learnerState: { learnerId: 'fictional' }, progress: { subjectId: 'math' },
      decision: { action: 'teach', reasonCode, competencyId: topic }, lessonReceipt: 'fictional-receipt' });
    let calls = 0, hold = false, release;
    await context.route('**/api/learning/closure', async route => {
      calls++;
      if (hold) await new Promise(done => { release = done; });
      try { await route.fulfill({ json: closure }); } catch { /* Navigation may abort this old request. */ }
    });
    const save = topic => page.evaluate(({ topic }) => sessionStorage.setItem('filumire.lessonClosure', JSON.stringify({
      scope: JSON.stringify(['fictional', 'math', topic]), receipt: 'fictional-receipt', phase: 'summary', expiresAt: Date.now() + 60000,
    })), { topic });
    const show = data => page.evaluate(({ data, language }) => window.showActivity(data, language), { data, language });
    await page.goto(origin);
    await save('patterns'); await show(activity('patterns'));
    await page.getByText('Find the Change', { exact: true }).waitFor();
    const before = calls;
    await show(activity('fractions', 'NEW_TOPIC_INSTRUCTION'));
    await page.waitForFunction(() => document.getElementById('summary').textContent === '' && document.getElementById('loading').textContent === 'false');
    assert.equal(calls, before, 'new topic never fetches the old summary');
    assert.equal(await page.evaluate(() => sessionStorage.getItem('filumire.lessonClosure')), null);

    // A valid receipt that returns another topic is still refused by the UI.
    await save('fractions'); await show(activity('fractions'));
    await page.waitForFunction(() => sessionStorage.getItem('filumire.lessonClosure') === null && document.getElementById('loading').textContent === 'false');
    assert.equal(await page.locator('#summary').innerText(), '');

    // Late responses from the old topic cannot cover the newly selected lesson.
    hold = true; await save('patterns'); await show(activity('patterns'));
    await page.waitForFunction(() => document.getElementById('loading').textContent === 'true');
    while (!release) await new Promise(done => setTimeout(done, 5));
    await show(activity('fractions', 'TOPIC_REVISIT'));
    await page.waitForFunction(() => document.getElementById('loading').textContent === 'false');
    release(); hold = false;
    await page.evaluate(() => new Promise(done => requestAnimationFrame(() => requestAnimationFrame(done))));
    assert.equal(await page.locator('#summary').innerText(), '');
    assert.equal(await page.evaluate(() => sessionStorage.getItem('filumire.lessonClosure')), null);
    console.log(`PASS ${language}: real-hook same-subject navigation, stale receipt rejection, introductory summary suppression and late response isolation`);
    await context.close();
  }
} finally { await browser.close(); await new Promise(done => server.close(done)); }
