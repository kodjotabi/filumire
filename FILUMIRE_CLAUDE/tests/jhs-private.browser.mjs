import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolvePlaywright, launchBrowser } from '../scripts/grade-navigation-support.mjs';

const arg = name => process.argv[process.argv.indexOf(name) + 1];
process.env.FILUMIRE_PLAYWRIGHT_MODULE = arg('--playwright');
process.env.FILUMIRE_CHROMIUM_PATH = arg('--chromium');
process.env.FILUMIRE_JHS_MODE = 'private-presentation';
const { seedContent } = await import('../services/content-store/seed.ts');
const { getContentForCompetency } = await import('../services/content-store/index.ts');
const { PRIVATE_JHS_SCOPE } = await import('../packages/curriculum/jhs-private-policy.ts');
seedContent();
const { chromium } = await import(resolvePlaywright(process.cwd()));
const stamp = crypto.randomUUID().slice(0, 7);
const origin = 'http://127.0.0.1:3291', output = `docs/jhs-development/integration/browser/${stamp}`;
await mkdir(output, { recursive: true });
const password = 'Fictional-jhs-audit-password-2026';
let address = 0;
async function fixture(path, body, cookie, method = body === undefined ? 'GET' : 'POST') {
  const response = await fetch(origin + path, { method, headers: { origin, 'content-type': 'application/json', 'x-forwarded-for': `192.0.2.${++address}`, ...(cookie ? { cookie: `filumire_auth_session=${cookie}` } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) });
  const data = await response.json();
  assert(response.ok, `${path}: ${response.status} ${JSON.stringify(data)}`);
  return { data, cookie: response.headers.get('set-cookie')?.match(/filumire_auth_session=([^;]*)/)?.[1] };
}
const browser = await launchBrowser(chromium), results = [];
const layoutOnly = process.argv.includes('--layout-only');
async function contextFor(cookie, width) {
  const context = await browser.newContext({ viewport: { width, height: 900 }, serviceWorkers: 'block', extraHTTPHeaders: { 'x-forwarded-for': `198.51.100.${++address}` } });
  if (cookie) await context.addCookies([{ name: 'filumire_auth_session', value: cookie, url: origin, httpOnly: true, sameSite: 'Strict' }, { name: 'filumire_signed_in', value: '1', url: origin }]);
  await context.route('**/*', route => new URL(route.request().url()).origin === origin ? route.continue() : route.abort());
  return context;
}
try {
  for (const width of [390, 1280]) for (const language of ['en', 'fr']) for (const grade of layoutOnly ? [7] : [7, 8, 9]) {
    const guardian = await fixture('/api/account/register', { email: `g.${stamp}.${width}.${language}.${grade}@example.test`, password, displayName: 'Fictional Guardian', confirmsGuardian: true, acceptsNotice: true });
    const teacher = await fixture('/api/account/register', { email: `t.${stamp}.${width}.${language}.${grade}@example.test`, password, displayName: 'Fictional Teacher', accountType: 'teacher', confirmsTeacher: true, acceptsNotice: true });
    const gc = await contextFor(guardian.cookie, width), gp = await gc.newPage();
    const tc = await contextFor(teacher.cookie, width), tp = await tc.newPage();
    for (const discipline of layoutOnly ? ['english'] : ['english', 'mathematics', 'science', 'computing']) {
      const result = { grade, discipline, language, width }; results.push(result);
      const name = `B${grade}-${discipline}-${results.length}`, username = `j${stamp}.${results.length}`;
      const added = await fixture('/api/account/learners', { displayName: name, username, password, preferredLanguage: language, consentsToLearnerData: true }, guardian.cookie);
      const learnerId = added.data.learnerId, gradeId = `level-gh-basic-${grade}-ccp`, subjectId = `subject-gh-basic${grade}-${discipline}-ccp`;
      const target = { curriculumVersionId: 'curriculum-version-gh-nacca-ccp-2020', gradeId, subjectId };
      let context, page;
      try {
        if (discipline === 'english') {
          await gp.goto(`${origin}/family?lang=${language}`);
          const card = gp.locator('.fmLearner').filter({ hasText: username });
          await card.locator('section select').first().selectOption(gradeId);
          await card.locator('section select').nth(1).selectOption(subjectId);
          const saved = gp.waitForResponse(r => r.url().endsWith('/placement') && r.request().method() === 'POST');
          await card.getByRole('button', { name: language === 'fr' ? 'Enregistrer la classe' : 'Save class', exact: true }).click();
          assert.equal((await saved).status(), 200);
          result.guardianPlacementUi = true;
        } else await fixture(`/api/account/learners/${learnerId}/placement`, target, guardian.cookie);
        await fixture(`/api/account/learners/${learnerId}`, { gradeId, completeOnboarding: true }, guardian.cookie, 'PATCH');
        const link = await fixture(`/api/account/learners/${learnerId}/teachers`, {}, guardian.cookie);
        await fixture('/api/account/teacher-links', { code: link.data.code }, teacher.cookie);
        context = await contextFor(undefined, width); page = await context.newPage();
        page.setDefaultTimeout(20000); page.setDefaultNavigationTimeout(60000);
        const errors = []; page.on('pageerror', error => errors.push(error.message));
        // Sign in through the real UI; no injected learner identities.
        await page.goto(`${origin}/login?lang=${language}`);
        await page.locator('#filumire-identity').fill(username); await page.locator('#filumire-password').fill(password);
        await page.locator('form button[type="submit"]').click();
        await page.waitForURL(/dashboard/);
        await page.locator(`.homeSubject.${discipline}`).click();
        const topic = page.locator('.subjectPage .subjectArea').first();
        await topic.waitFor({ state: 'attached' });
        if (!await topic.isVisible()) await page.locator('.subjectPage details summary').first().click();
        await topic.click();
        await page.locator('.lesson-body').waitFor();
        const learningUrl = page.url();
        const firstText = await page.locator('.lesson-body').innerText();
        assert(firstText.length > 30);
        assert.equal(await page.locator('.lesson-body').getAttribute('lang'), language);
        await page.reload(); await page.locator('.lesson-body').waitFor();
        assert.equal(await page.locator('.lesson-body').innerText(), firstText, 'refresh resumes the delivered lesson');
        const next = () => page.waitForResponse(r => new URL(r.url()).pathname === '/api/learning' && r.request().method() === 'POST');
        let delivered;
        for (let n = 0; n < 2; n++) { const reply = next(); await page.locator('.nextButton').click(); delivered = await (await reply).json(); }
        assert.equal(delivered.content.type, 'practice');
        const authored = getContentForCompetency(delivered.content.competencyId).find(item => item.id === delivered.content.id);
        const expected = authored.metadata.expectedResponse;
        const answers = await page.locator('input[name="answer"]').evaluateAll(inputs => inputs.map(input => input.value));
        await page.locator('input[name="answer"]').nth(answers.findIndex(value => value !== expected)).check();
        let reply = next(); await page.locator('.assessment button.primary-button').click();
        assert.equal((await (await reply).json()).assessment.result.correct, false);
        await page.locator('.answerCorrection[data-phase="explain"]').waitFor();
        await page.getByRole('button', { name: language === 'fr' ? 'Réessayer la question' : 'Try the question again', exact: true }).click();
        await page.locator('input[name="answer"]').nth(answers.indexOf(expected)).check();
        reply = next(); await page.locator('.assessment button.primary-button').click();
        assert.equal((await (await reply).json()).assessment.evidence.independence, 'guided');
        await page.locator('.answerCorrection .result.correct').waitFor();
        const before = (await fixture(`/api/adult/summary?learnerId=${learnerId}`, undefined, guardian.cookie)).data.summary;
        assert.equal(before.progress.gradeId, gradeId);
        await page.locator('.answerCorrection button.primary').click();
        // Continue the real learner flow (lesson-closure cards and further guided
        // practice included) until an automatic multiple-choice check is delivered.
        // Since Step 0, teacher-reviewed tasks are optional extensions that are
        // never on the learner's adaptive path.
        // The shown item is identified by its options (displayed shuffled): the authored
        // items of this topic whose option set is exactly the one on screen.
        const authoredItems = getContentForCompetency(delivered.content.competencyId);
        const optionsOf = c => { try { const o = c.metadata?.options; return Array.isArray(o) ? o : JSON.parse(o); } catch { return []; } };
        async function shownItem() {
          const values = await page.locator('input[name="answer"]').evaluateAll(inputs => inputs.map(input => input.value));
          const same = c => { const o = optionsOf(c); return o.length === values.length && o.every(v => values.includes(v)); };
          // Items can share an option set (e.g. Solid/Liquid/Gas), so the shown question text decides.
          const text = (await page.locator('main').innerText()).replace(/\s+/g, ' ');
          const matches = authoredItems.filter(c => c.language === language && same(c) && values.includes(c.metadata?.expectedResponse)
            && text.includes(c.body.replace(/\s+/g, ' ').trim()));
          assert(matches.length && new Set(matches.map(c => c.metadata.expectedResponse)).size === 1, `shown item identifies one correct option: ${JSON.stringify(values)} matched ${matches.length}`);
          return { index: values.indexOf(matches[0].metadata.expectedResponse), assessment: matches.every(c => c.type === 'assessment') };
        }
        let shown;
        for (let n = 0; n < 20; n++) {
          await page.waitForLoadState('networkidle');
          assert.equal(await page.locator('#learner-response').count(), 0, 'no teacher-reviewed task on the adaptive path');
          const radios = page.locator('input[name="answer"]:not(:disabled)');
          if (await radios.count() && (shown = await shownItem()).assessment) break;
          if (await radios.count()) {
            await page.locator('input[name="answer"]').nth(shown.index).check();
            await page.locator('.assessment button.primary-button').click();
          } else if (await page.locator('.closureCard').isVisible()) await page.locator('.closureCard button').last().click();
          else if (await page.locator('.answerCorrection button.primary').isVisible()) await page.locator('.answerCorrection button.primary').click();
          else if (await page.locator('.nextButton').isVisible()) await page.locator('.nextButton').click();
          else if (await page.locator('.lessonPanel > .primary-button').isVisible()) await page.locator('.lessonPanel > .primary-button').click();
          else break;
        }
        assert(shown?.assessment, 'an automatic check is delivered');
        await page.locator('input[name="answer"]').nth(shown.index).check();
        reply = next(); await page.locator('.assessment button.primary-button').click();
        const checked = await (await reply).json();
        assert.equal(checked.assessment.result.correct, true);
        assert.equal(checked.pendingTeacherReview, undefined, 'automatic evidence needs no teacher review');
        result.automaticCheck = checked.assessment.evidence.independence;
        // The real teacher screen shows the linked learner with nothing awaiting review.
        assert.equal((await fixture(`/api/teacher/summary?learnerId=${learnerId}`, undefined, teacher.cookie)).data.summary.pendingReviewCount, 0);
        await tp.goto(`${origin}/teacher?lang=${language}`);
        if (discipline === 'english') await tp.getByText(name).first().waitFor();
        else await tp.locator('.learner-list button').filter({ hasText: name }).click();
        await gp.goto(`${origin}/adult?learnerId=${learnerId}&lang=${language}`);
        if (discipline !== 'english') await gp.locator('.learner-list button').filter({ hasText: name }).click();
        await gp.locator('.ppCard').waitFor();
        assert((await gp.locator('.ppCard').innerText()).includes(`Basic ${grade}`));
        const after = (await fixture(`/api/adult/summary?learnerId=${learnerId}`, undefined, guardian.cookie)).data.summary;
        assert(after.progress.activity.answersRecorded > before.progress.activity.answersRecorded);
        // A fresh signed-in session resumes the reviewed learner's recorded work.
        await context.request.post(`${origin}/api/session/logout`, { headers: { origin, 'content-type': 'application/json' }, data: {} });
        await page.goto(`${origin}/login?lang=${language}`);
        await page.locator('#filumire-identity').fill(username); await page.locator('#filumire-password').fill(password);
        await page.locator('form button[type="submit"]').click(); await page.waitForURL(/dashboard/);
        await page.goto(learningUrl); await page.locator('.lesson-body').waitFor();
        const resumed = await context.request.get(`${origin}/api/learning?dashboard=1`);
        assert.equal(resumed.status(), 200);
        // Passing the automatic check may advance the active topic, so look up the practised one.
        const practised = (await resumed.json()).learnerState.competencies.find(c => c.competencyId === delivered.content.competencyId);
        assert(practised?.evidenceCount > 0, 'recorded work on the practised topic survives sign-out');
        result.reviewedWorkResumedAfterLogin = true;
        // The disclosure is fetched after load, so pages stay static.
        await page.locator('.privatePresentationNotice').waitFor();
        const notice = await page.locator('.privatePresentationNotice').boundingBox();
        assert(notice && (width < 1024 || notice.x >= 248), 'Scope disclosure stays clear of the fixed sidebar');
        // Same-origin request, so the refusal must come from authorisation, not the origin check.
        const forbidden = await context.request.post(`${origin}/api/account/learners/${learnerId}/placement`, { data: target, headers: { origin } });
        assert.equal(forbidden.status(), 400, 'learner cannot use guardian placement');
        assert.match((await forbidden.json()).error, /active guardian relationship/, 'refused by the guardian check');
        const crossSite = await gc.request.post(`${origin}/api/account/learners/${learnerId}/placement`, { data: target, headers: { origin: 'https://foreign.example', 'sec-fetch-site': 'cross-site' } });
        assert.equal(crossSite.status(), 400);
        result.overflowPixels = await page.evaluate(() => Math.max(0, document.documentElement.scrollWidth - innerWidth));
        assert(result.overflowPixels <= 1);
        assert.deepEqual(errors, []);
        result.status = 'PASS';
        if (discipline === 'english') await page.screenshot({ path: `${output}/b${grade}-${language}-${width}.png`, fullPage: true });
      } catch (error) {
        result.status = 'FAIL'; result.error = error.stack;
        if (page) await page.screenshot({ path: `${output}/failure-${results.length}.png`, fullPage: true }).catch(() => {});
        console.error(result.error);
      } finally { await context?.close(); }
      await writeFile(`${output}/results.json`, JSON.stringify(results, null, 2));
      console.log(`${result.status} B${grade} ${discipline} ${language} ${width}px`);
      if (result.status === 'FAIL') throw new Error('Stop at the first broken integrated boundary');
    }
    await gc.close(); await tc.close();
  }
} finally { await browser.close(); }
assert.equal(results.length, layoutOnly ? 4 : 48); assert(results.every(result => result.status === 'PASS'));
console.log(`PASS ${results.length} real learner/guardian/teacher browser journeys`);
console.log(`Evidence: ${output}/results.json`);
