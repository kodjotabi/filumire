// Reuses the installed browser and real local learner app; fictional memory-only accounts.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { resolvePlaywright, launchBrowser, loopbackOrigin } from './grade-navigation-support.mjs';
assert.equal(process.env.FILUMIRE_PERSISTENCE, 'memory');
const origin = loopbackOrigin(process.env.FILUMIRE_TEST_URL);
const artifacts = process.env.FILUMIRE_NAVIGATION_ARTIFACTS ?? 'docs/audits/basic4-6-completion/browser';
fs.mkdirSync(artifacts, { recursive: true });
const { chromium } = await import(resolvePlaywright(process.cwd()));
const results = [], stamp = crypto.randomUUID().slice(0, 8);
let address = 100;
async function fixture(path, data, cookie, method = 'POST') {
  const response = await fetch(origin + path, { method, headers: { origin, 'content-type': 'application/json', 'x-forwarded-for': `192.0.2.${++address}`, ...(cookie ? { cookie: `filumire_auth_session=${cookie}` } : {}) }, body: JSON.stringify(data) });
  const body = await response.json(); assert(response.ok, JSON.stringify(body));
  return { body, cookie: response.headers.get('set-cookie')?.match(/filumire_auth_session=([^;]*)/)?.[1] };
}
const password = 'Fictional-offline-audit-password-42';
const guardian = await fixture('/api/account/register', { email: `offline.${stamp}@example.test`, password, displayName: 'Fictional Guardian', preferredLanguage: 'en', confirmsGuardian: true, acceptsNotice: true });
const browser = await launchBrowser(chromium);
try {
  for (const width of [390, 1280]) for (const language of ['en', 'fr']) {
    const result = { width, language, scope: 'one Basic 4 mathematics question; generic offline shell and pending-answer behaviour' };
    results.push(result);
    const context = await browser.newContext({ viewport: { width, height: 900 }, locale: language, serviceWorkers: 'allow' });
    try {
      const username = `offline.${stamp}.${width}.${language}`;
      const learner = await fixture('/api/account/learners', { username, password, displayName: 'Fictional Learner', gradeId: 'level-gh-basic-4-pilot', preferredLanguage: language, consentsToLearnerData: true }, guardian.cookie);
      await fixture(`/api/account/learners/${learner.body.learnerId}`, { gradeId: 'level-gh-basic-4-pilot', completeOnboarding: true }, guardian.cookie, 'PATCH');
      const signed = await fixture('/api/session/login', { login: username, password });
      await context.addCookies([{ name: 'filumire_auth_session', value: signed.cookie, url: origin, httpOnly: true, sameSite: 'Lax' }, { name: 'filumire_signed_in', value: '1', url: origin }]);
      const page = await context.newPage(); page.setDefaultTimeout(20000);
      await page.goto(origin + `/dashboard?lang=${language}`);
      await page.evaluate(async () => { await navigator.serviceWorker.register('/sw.js'); await navigator.serviceWorker.ready; });
      await page.waitForFunction(() => navigator.serviceWorker.controller !== null);
      result.dashboardOverflowPixels = await page.evaluate(() => Math.max(0, document.documentElement.scrollWidth - innerWidth));
      await page.locator('.homeSubject.mathematics').click();
      const topic = page.locator('.subjectPage .subjectArea').first(); await topic.waitFor({ state: 'attached' });
      if (!await topic.isVisible()) await page.locator('.subjectPage details summary').first().click();
      await topic.click(); await page.locator('.checkFirst button').click();
      await page.locator('input[name="answer"]').first().check();
      result.lessonOverflowPixels = await page.evaluate(() => Math.max(0, document.documentElement.scrollWidth - innerWidth));
      const progress = async () => { const response = await context.request.get(origin + '/api/learning?dashboard=1'); assert.equal(response.status(), 200); const data = await response.json(); return { evidence: data.progress.evidenceCount, competencies: data.learnerState.competencies }; };
      const before = await progress();
      const questionText = await page.locator('.lesson-body').innerText();
      await context.setOffline(true);
      await page.locator('.assessment button.primary-button').click();
      await page.locator('.connectivity-banner.pending').waitFor();
      const pending = await page.evaluate(() => JSON.parse(localStorage.getItem('filumire.pendingAssessmentSubmission')));
      assert(pending.assessmentItemId && pending.clientRequestId); result.pendingAnswerSaved = true;
      const switched = language === 'en' ? 'fr' : 'en';
      for (const nextLanguage of [switched, language]) {
        await page.getByRole('button', { name: nextLanguage === 'fr' ? 'Passer en français' : 'Switch to English', exact: true }).click();
        await page.waitForFunction(value => document.documentElement.lang === value, nextLanguage);
        assert.equal(await page.locator('.lesson-body').innerText(), questionText, 'switching offline keeps the unanswered question');
        assert.deepEqual(await page.evaluate(() => JSON.parse(localStorage.getItem('filumire.pendingAssessmentSubmission'))), pending, 'language changes preserve every queued submission field');
        // APIRequestContext stays online independently of the disconnected browser.
        assert.deepEqual(await progress(), before, 'offline language switching does not change server progress or evidence');
      }
      result.offlineLanguageSwitchPreservesQuestionSubmissionAndEvidence = true;
      const synchronised = page.waitForResponse(response => new URL(response.url()).pathname === '/api/learning' && response.request().method() === 'POST' && response.status() === 200);
      await context.setOffline(false);
      const syncResponse = await synchronised;
      const syncRequest = syncResponse.request().postDataJSON();
      for (const key of ['clientRequestId', 'assessmentItemId', 'interventionId', 'response', 'sessionId', 'competencyId']) assert.equal(syncRequest[key], pending[key], `reconnect retains original ${key}`);
      assert.equal((await syncResponse.json()).assessment.result.assessmentItemId, pending.assessmentItemId);
      result.serverEvaluatesOriginalQueuedQuestion = true;
      await page.locator('.connectivity-banner.pending').waitFor({ state: 'detached' });
      await page.waitForFunction(() => localStorage.getItem('filumire.pendingAssessmentSubmission') === null);
      const after = await progress(); assert.equal(after.evidence, before.evidence + 1);
      result.exactlyOneServerEvidenceAfterReconnect = true;
      // Repeat the online event: must not submit the queued answer twice.
      await page.evaluate(() => window.dispatchEvent(new Event('online')));
      assert.deepEqual(await progress(), after); result.repeatOnlineEventDoesNotDuplicateEvidence = true;
      await context.setOffline(true);
      await page.goto(origin + '/learn?offline-audit=1');
      await page.locator(language === 'fr' ? 'div[lang="fr"] h1' : 'div[lang="en"] h1').waitFor();
      assert.notEqual(await page.evaluate(() => getComputedStyle(document.documentElement).display), 'none', 'the language selector never hides the root');
      assert.equal(await page.locator(language === 'fr' ? 'div[lang="en"] h1' : 'div[lang="fr"] h1').isVisible(), false, 'only the selected offline language is visible');
      assert.match(await page.locator(language === 'fr' ? 'div[lang="fr"] h1' : 'div[lang="en"] h1').innerText(), language === 'fr' ? /hors ligne/ : /offline/);
      result.offlineReloadShowsFallback = true;
      result.offlineNewLearningAvailable = false;
      const keys = await page.evaluate(async () => { const all = []; for (const name of await caches.keys()) for (const r of await (await caches.open(name)).keys()) all.push(new URL(r.url).pathname); return all; });
      assert(!keys.some(k => k.startsWith('/api/') || k === '/dashboard' || k === '/learn'));
      result.noApiOrPersonalHtmlCached = true;
      await page.screenshot({ path: `${artifacts}/offline-${language}-${width}.png`, fullPage: true });
      result.status = 'PASS';
    } catch (error) {
      result.status = 'FAIL'; result.error = error.message;
      const failedPage = context.pages()[0];
      if (failedPage) {
        result.failureDiagnostic = await failedPage.evaluate(() => ({
          navigatorLanguage: navigator.language,
          documentLanguage: document.documentElement.lang,
          documentClasses: document.documentElement.className,
          documentDisplay: getComputedStyle(document.documentElement).display,
          documentVisibility: getComputedStyle(document.documentElement).visibility,
          headings: [...document.querySelectorAll('h1')].map(h => ({ text: h.textContent, display: getComputedStyle(h).display, rendered: h.getClientRects().length > 0 })),
        }));
        await failedPage.screenshot({ path: `${artifacts}/offline-failure-${language}-${width}.png`, fullPage: true });
      }
    }
    finally { await context.close(); }
    console.log(JSON.stringify(result));
    fs.writeFileSync(`${artifacts}/offline-results.json`, JSON.stringify(results, null, 2) + '\n');
  }
} finally { await browser.close(); }
assert.equal(results.length, 4);
assert.equal(results.filter(r => r.status === 'PASS').length, 4);
