import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
const base = process.env.FILUMIRE_TEST_URL ?? 'http://127.0.0.1:3187';
if (!['127.0.0.1', 'localhost'].includes(new URL(base).hostname)) throw new Error('Local server only');
const { chromium } = await import(process.env.FILUMIRE_PLAYWRIGHT_MODULE);
const out = 'docs/audits/audit2-stages0-2-2026-10-13';
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ headless: true, executablePath: process.env.FILUMIRE_CHROMIUM_PATH });
const results = [];
try {
 for (const width of [320, 390, 768, 1280]) for (const language of ['en', 'fr']) {
  if (process.env.FILUMIRE_BROWSER_CASE && process.env.FILUMIRE_BROWSER_CASE !== `${width}/${language}`) continue;
  const context = await browser.newContext({ viewport: { width, height: 900 }, colorScheme: 'light', serviceWorkers: 'block' });
  await context.addCookies([{ name: 'filumire_signed_in', value: '1', url: base }]);
  const page = await context.newPage(); const errors = []; page.on('pageerror', error => errors.push(error.message));
  let learnerId = 'fictional-audit2-a', completed = 1, logoutFailed = false;
  const subjectId = 'fictional-science';
  const learner = () => ({ learnerId, displayName: 'Fictional Learner', avatarId: '1', preferredLanguage: language, onboardingComplete: true });
  const overview = () => ({ gradeId: 'level-gh-basic-5-pilot', gradeName: 'Basic 5', activeSubjectId: subjectId, areasSubjectId: subjectId, availableSubjects: [{ id: subjectId, name: 'Science', code: 'SCI', discipline: 'science' }], subjects: { [subjectId]: { total: 10, completed, tracked: completed, started: true } }, areas: [] });
  const learning = () => ({ learnerState: { learnerId, competencies: [] }, decision: { id: 'fictional-decision', sessionId: 'fictional-session', action: 'teach', competencyId: 'fictional-competency', reasonCode: 'TEACH', instructionalStrategy: 'step_by_step' }, progress: { learnerId, competencyCount: 10, completedCompetencies: completed, masteryEstimate: .2, confidence: .4, evidenceCount: 1, readiness: false, percent: completed * 10, subjectId, subjectName: 'Science', competencyTitle: 'Fictional science topic' }, content: { id: 'fictional-content', competencyId: 'fictional-competency', type: 'lesson', title: 'Fictional lesson', body: 'Fictional teaching content.' }, instruction: { content: 'Fictional explanation.', structured: { elements: [{ type: 'explanation', text: 'Fictional explanation.' }] } } });
  let questions = 0;
  await page.route('**/api/**', route => {
   const url = new URL(route.request().url());
   if (url.pathname === '/api/session/me') return route.fulfill({ json: { principalId: 'fictional-principal', accountKind: 'learner', preferredLanguage: language, learners: [learner()], activeLearnerId: learnerId } });
   if (url.pathname === '/api/learning') return route.fulfill({ json: url.searchParams.has('overview') ? overview() : learning() });
   if (url.pathname === '/api/tutoring/conversation') {
    if (route.request().method() === 'GET') return route.fulfill({ json: { language: url.searchParams.get('language'), assessmentProtected: false, hasTeaching: true, topicTitle: 'Fictional science topic' } });
    const body = route.request().postDataJSON(); questions++;
    assert(body.question.trim()); assert.equal(body.language, language); assert(body.requestId);
    return route.fulfill({ json: { messages: [{ role: 'user', text: body.question, language }, { role: 'assistant', text: 'Fictional contextual guidance.', language }], historyToken: 'fictional-history', expiresAt: Date.now() + 60000, provider: 'curriculum', assessmentProtected: false } });
   }
   if (url.pathname === '/api/session/logout') return route.fulfill({ status: logoutFailed ? 500 : 200, json: { revoked: !logoutFailed } });
   return route.fulfill({ status: 404, json: { code: 'not_in_fixture' } });
  });
  async function open(view = 'home') { await page.goto(`${base}/dashboard?lang=${language}&view=${view}`); await page.locator('.learnerMainRegion .learnerContent').first().waitFor({ timeout: 60000 }); }
  async function fits(label) {
   const fits = await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1);
   if (!fits) {
    await page.screenshot({ path: join(out, `failure-${label.replaceAll(' ','-')}-${language}-${width}.png`), fullPage: true });
    console.log(await page.evaluate(() => [...document.querySelectorAll('body *')].map(el => ({ tag: el.tagName, class: el.className, right: el.getBoundingClientRect().right, width: el.getBoundingClientRect().width })).filter(el => el.right > innerWidth + 1).slice(0,15)));
   }
   assert(fits, `${label} overflow at ${width}px/${language}`);
  }
  await open();
  assert.equal(await page.locator('header .learnerSignOutButton').count(), 0);
  assert.equal(await page.locator('header a[href*="view=ask-filu"]').count(), 1);
  assert.equal(await page.locator('.learnerBottomSignOut button').count(), 1);
  await fits('home');
  await open('learning'); assert.equal(await page.locator('header a[href*="view=ask-filu"]').count(), 1);
  await open('profile');
  await page.getByRole('heading', { name: language === 'fr' ? 'Mes paramètres' : 'My Settings', level: 1 }).waitFor();
  const headerBox = await page.locator('header.filumireLearnerHeader').boundingBox();
  const titleBox = await page.locator('.profileSettingsTitle').boundingBox();
  assert(headerBox.y + headerBox.height <= titleBox.y + 1, 'wrapped header must not overlap settings');
  assert.equal(await page.locator('.additionalSettings > details > summary').count(), 4);
  const headings = await page.locator('.profileSettings h2').allTextContents();
  assert(headings[0].includes('FILUMIRE')); assert(headings[1].includes(language === 'fr' ? 'supplémentaires' : 'Additional'));
  await page.locator('.additionalSettings details').nth(1).locator('summary').click();
  await page.locator('input[value="dark"]').check();
  await page.locator('main[data-appearance="dark"]').waitFor();
  const contrast = await page.locator('.voiceSettings h2').evaluate(heading => {
   const luminance = color => { const rgb = color.match(/[\d.]+/g).slice(0,3).map(Number).map(v => { v /= 255; return v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; }); return .2126*rgb[0] + .7152*rgb[1] + .0722*rgb[2]; };
   const a = luminance(getComputedStyle(heading).color), b = luminance(getComputedStyle(heading.closest('.voiceSettings')).backgroundColor);
   return (Math.max(a,b)+.05)/(Math.min(a,b)+.05);
  });
  assert(contrast >= 4.5, `dark voice heading contrast: ${contrast}`);
  await fits('dark settings');
  await page.screenshot({ path: join(out, `settings-dark-${language}-${width}.png`), fullPage: true });
  await page.reload(); await page.locator('main[data-appearance="dark"]').waitFor();
  await page.locator('.additionalSettings details').nth(1).locator('summary').click();
  assert(await page.locator('input[value="dark"]').isChecked());
  await page.locator('input[value="system"]').check(); await page.emulateMedia({ colorScheme: 'dark' });
  await page.locator('main[data-appearance="dark"]').waitFor(); await page.emulateMedia({ colorScheme: 'light' });
  await page.locator('main[data-appearance="light"]').waitFor();
  await page.locator('.additionalSettings details').nth(0).locator('summary').click();
  await page.locator('.additionalSettings input[type="checkbox"]').nth(0).uncheck();
  await page.reload(); await page.locator('.additionalSettings details').nth(0).locator('summary').click();
  assert.equal(await page.locator('.additionalSettings input[type="checkbox"]').nth(0).isChecked(), false);
  completed = 2; await page.locator('nav a[href*="view=learning"]').click(); await page.locator('.learningView, .subjectView').first().waitFor();
  completed = 3; await page.locator('nav a[href*="view=progress"]').click(); await page.locator('.progressPage').waitFor();
  assert.equal(await page.locator('.learningNotice').count(), 0, 'disabled progress notices stay hidden');
  await open('profile'); await page.locator('.additionalSettings details').nth(0).locator('summary').click();
  await page.locator('.additionalSettings input[type="checkbox"]').nth(0).check();
  completed = 4; await page.locator('nav a[href*="view=learning"]').click(); await page.locator('.learningView, .subjectView').first().waitFor();
  await page.locator('.learningNotice').waitFor();
  assert((await page.locator('.learningNotice').textContent()).includes(language === 'fr' ? 'progression' : 'progress'));
  await page.locator('.learningNotice button').click();
  completed = 5; await page.locator('nav a[href*="view=progress"]').click(); await page.locator('.learningNotice').waitFor();
  assert((await page.locator('.learningNotice').textContent()).includes(language === 'fr' ? 'réussite' : 'achievement'));
  await page.locator('.learningNotice button').click(); assert.equal(await page.locator('.learningNotice').count(), 0);
  await open('profile');
  await page.locator('.additionalSettings details').nth(2).locator('summary').click();
  assert.equal(await page.locator('.additionalSettings a[href^="/privacy"]').count(), 1);
  await page.locator('.additionalSettings details').nth(3).locator('summary').click();
  assert.equal(await page.locator('.additionalSettings a[href$="/contact"]').getAttribute('href'), `https://filumire.com${language === 'fr' ? '/fr' : ''}/contact`);
  await fits('expanded settings');
  await page.locator('.additionalSettings details').nth(1).locator('summary').click();
  await page.locator('input[value="dark"]').check();
  for (const view of ['home', 'learning', 'progress', 'challenges']) {
   await open(view); await page.locator('main[data-appearance="dark"]').waitFor(); await fits(`dark ${view}`);
   if (width === 390 || width === 1280) await page.screenshot({ path: join(out, `${view}-dark-${language}-${width}.png`), fullPage: true });
  }
  await open('ask-filu');
  assert.equal(await page.locator('.quickActions').count(), 0);
  await page.locator('#filu-question').fill(language === 'fr' ? 'Aide-moi à comprendre cette leçon.' : 'Help me understand this lesson.');
  await page.locator('.filuQuestion button[type="submit"]').click();
  await page.getByText('Fictional contextual guidance.', { exact: true }).waitFor(); assert.equal(questions, 1);
  await fits('Ask FILU'); await page.screenshot({ path: join(out, `ask-filu-${language}-${width}.png`), fullPage: true });
  await page.goto(`${base}/learn?lang=${language}&subjectId=${subjectId}`); await page.locator('.learnMain').waitFor();
  await page.locator('main[data-appearance="dark"]').waitFor();
  const bannerColors = await page.locator('.learnBanner').evaluate(el => ({ background: getComputedStyle(el).backgroundColor, color: getComputedStyle(el.querySelector('h1')).color }));
  assert.equal(bannerColors.background, 'rgb(32, 55, 82)');
  assert.equal(bannerColors.color, 'rgb(229, 239, 255)');
  if (width === 390 || width === 1280) await page.screenshot({ path: join(out, `lesson-dark-${language}-${width}.png`), fullPage: true });
  assert.equal(await page.locator('header .learnerSignOutButton').count(), 0); assert.equal(await page.locator('.learnerBottomSignOut button').count(), 1); await fits('lesson');
  learnerId = 'fictional-audit2-b'; await open('profile'); await page.locator('main[data-appearance="light"]').waitFor();
  learnerId = 'fictional-audit2-a'; await open('profile'); await page.locator('main[data-appearance="dark"]').waitFor();
  await open(); logoutFailed = true; await page.locator('.learnerBottomSignOut button').click(); await page.locator('.learnerBottomSignOut [role="alert"]').waitFor();
  assert(new URL(page.url()).pathname === '/dashboard');
  logoutFailed = false; await page.locator('.learnerBottomSignOut button').click(); await page.waitForURL('**/login?lang=' + language);
  await page.locator(`.loginPage[lang="${language}"]`).waitFor();
  assert.equal(await page.locator('.subscriptionLink').getAttribute('href'), `https://filumire.com${language === 'fr' ? '/fr' : ''}/pricing`);
  await fits('login');
  assert.deepEqual(errors, []);
  results.push({ width, language, passed: true }); console.log(`PASS: Audit 2 interactions at ${width}px/${language}`);
  await context.close();
 }
} finally { await browser.close(); await writeFile(join(out, 'browser-results.json'), JSON.stringify({ interceptedApis: true, databaseWrites: false, results }, null, 2)); }
