// Real visible controls; all accounts/work are fictional, local and memory-only.
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve, join } from "node:path";
import { resolvePlaywright, launchBrowser, loopbackOrigin } from "../scripts/grade-navigation-support.mjs";
import { B5_COMPLETION_SPECS } from "../packages/curriculum/ghana-b5-completion-specs.ts";
import { seedContent } from "../services/content-store/seed.ts";
import { getContentForCompetency } from "../services/content-store/index.ts";

assert.equal(process.env.FILUMIRE_PERSISTENCE, "memory");
const origin = loopbackOrigin(process.env.FILUMIRE_TEST_URL);
const out = process.env.FILUMIRE_NAVIGATION_ARTIFACTS;
assert(out, "supply a dedicated evidence directory");
await mkdir(out, { recursive: true });
const { chromium } = await import(resolvePlaywright(resolve(".")));
seedContent();
const stamp = crypto.randomUUID().slice(0, 8), password = "Fictional-Basic5-tranche-password-81";
let requestNumber = 0;
async function fixture(path, body, cookie = "", method = "POST") {
  const response = await fetch(origin + path, { method, headers: { origin, "content-type": "application/json", "x-forwarded-for": `192.0.2.${++requestNumber}`, ...(cookie ? { cookie: `filumire_auth_session=${cookie}` } : {}) }, body: JSON.stringify(body) });
  const data = await response.json();
  assert(response.ok, `${path}: ${response.status} ${JSON.stringify(data)}`);
  return { data, cookie: response.headers.get("set-cookie")?.match(/filumire_auth_session=([^;]*)/)?.[1] };
}
const guardian = await fixture("/api/account/register", { email: `b5-tranche-${stamp}@example.test`, password, displayName: "Fictional Guardian", preferredLanguage: "en", confirmsGuardian: true, acceptsNotice: true });
const browser = await launchBrowser(chromium);
const results = [];
try {
  for (const [width, language] of [[390, "en"], [1280, "fr"]]) for (const [i, spec] of B5_COMPLETION_SPECS.entries()) {
    const result = { code: spec.code, width, language };
    results.push(result);
    const username = `b5.${stamp}.${width}.${i}`;
    const learner = await fixture("/api/account/learners", { displayName: "Fictional Learner", username, password, gradeId: "level-gh-basic-5-pilot", preferredLanguage: language, consentsToLearnerData: true }, guardian.cookie);
    await fixture(`/api/account/learners/${learner.data.learnerId}`, { gradeId: "level-gh-basic-5-pilot", completeOnboarding: true }, guardian.cookie, "PATCH");
    const signed = await fixture("/api/session/login", { login: username, password });
    const context = await browser.newContext({ viewport: { width, height: 900 }, serviceWorkers: "block", extraHTTPHeaders: { "x-forwarded-for": `198.51.100.${results.length + 100}` } });
    await context.addCookies([{ name: "filumire_auth_session", value: signed.cookie, url: origin, httpOnly: true, sameSite: "Lax" }, { name: "filumire_signed_in", value: "1", url: origin }]);
    await context.route("**/*", route => new URL(route.request().url()).origin === origin ? route.continue() : route.abort());
    const page = await context.newPage();
    page.setDefaultTimeout(25000);
    page.setDefaultNavigationTimeout(120000);
    const errors = [];
    page.on("pageerror", e => errors.push(e.message));
    const next = () => page.waitForResponse(r => new URL(r.url()).pathname === "/api/learning" && r.request().method() === "POST");
    try {
      await page.goto(`${origin}/dashboard?lang=${language}`);
      await page.locator(`.homeSubject.${i === 0 ? "science" : "computing"}`).click();
      const topic = page.locator(`.subjectArea[href*="${spec.competencyId}"]`);
      await topic.waitFor({ state: "attached" });
      if (!await topic.isVisible()) await topic.locator("xpath=ancestor::details").locator("summary").click();
      assert((await topic.innerText()).trim().length > 5, "meaningful visible topic name");
      await topic.click();
      await page.locator(".lesson-body").waitFor();
      const explanation = await page.locator(".lesson-body").innerText();
      assert(explanation.length > 100);
      let delivered;
      // Existing teaching cards lead to the worked example and guided practice.
      for (let n = 0; n < 2; n++) {
        const reply = next();
        await page.locator(".nextButton").click();
        delivered = await (await reply).json();
      }
      assert.equal(delivered.content.type, "practice");
      assert.equal(delivered.content.competencyId, spec.competencyId);
      assert.equal(delivered.content.language, language);
      const authored = getContentForCompetency(spec.competencyId).find(c => c.id === delivered.content.id);
      const options = await page.locator('input[name="answer"]').evaluateAll(inputs => inputs.map(input => input.value));
      await page.locator('input[name="answer"]').nth(options.findIndex(o => o !== authored.metadata.expectedResponse)).check();
      const wrongReply = next();
      await page.locator(".assessment button.primary-button").click();
      assert.equal((await (await wrongReply).json()).assessment.result.correct, false);
      await page.locator('.answerCorrection[data-phase="explain"]').waitFor();
      const originalBody = await page.locator(".lesson-body").innerText();
      const snapshot = async () => (await (await context.request.get(`${origin}/api/learning?dashboard=1`)).json()).learnerState.competencies;
      const before = await snapshot();
      await page.getByRole("button", { name: language === "en" ? "Passer en français" : "Switch to English", exact: true }).click();
      const switched = language === "en" ? "fr" : "en";
      await page.waitForFunction(value => document.documentElement.lang === value, switched);
      assert.equal(await page.locator(".lesson-body").innerText(), originalBody);
      assert.deepEqual(await snapshot(), before);
      await page.getByRole("button", { name: switched === "fr" ? "Réessayer la question" : "Try the question again", exact: true }).click();
      await page.locator('input[name="answer"]').nth(options.indexOf(authored.metadata.expectedResponse)).check();
      const retryReply = next();
      await page.locator(".assessment button.primary-button").click();
      const retried = await (await retryReply).json();
      assert.equal(retried.assessment.evidence.independence, "guided");
      assert.equal(retried.correction.assessmentItemId, authored.assessmentItemId);
      await page.locator(".answerCorrection button.primary").click();
      // Continue may include a teaching card or the existing lesson summary.
      for (let n = 0; n < 8 && !await page.locator("#learner-response").count(); n++) {
        const button = page.locator(".nextButton");
        if (await button.count()) await button.click();
        else {
          const continuation = page.locator(".closureCard button").last();
          await continuation.click();
        }
        await page.waitForTimeout(200);
      }
      await page.locator("#learner-response").waitFor();
      const pendingBefore = await snapshot();
      await page.locator("#learner-response").fill("FICTIONAL BROWSER TEST: incomplete work submitted to verify pending review only. No observed performance or approval is claimed.");
      const pendingReply = next();
      await page.locator(".assessment button.primary-button").click();
      const pending = await (await pendingReply).json();
      assert.equal(pending.pendingTeacherReview.status, "pending");
      assert.deepEqual(await snapshot(), pendingBefore, "pending productive work cannot award mastery");
      assert.equal(errors.length, 0, JSON.stringify(errors));
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), "no horizontal overflow");
      result.status = "PASS";
      result.scope = "visible topic, teaching/example, wrong guided answer, correction/retry, language identity/evidence, productive textarea and pending review; teacher scoring and due revision tested via API separately";
      await page.screenshot({ path: join(out, `b5-${i}-${width}-${language}.png`), fullPage: true });
      console.log(`PASS ${spec.code} ${language} ${width}px`);
    } catch (error) {
      result.status = "FAIL"; result.error = String(error);
      await page.screenshot({ path: join(out, `failure-${i}-${width}.png`), fullPage: true });
      console.error(`FAIL ${spec.code} ${language}: ${error.message}`);
    } finally { await context.close(); }
    await writeFile(join(out, "basic5-browser-results.json"), JSON.stringify(results, null, 2));
  }
} finally { await browser.close(); }
assert.equal(results.length, 8);
assert.equal(results.filter(r => r.status !== "PASS").length, 0);
