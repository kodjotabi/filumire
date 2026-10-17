import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { launchBrowser, loopbackOrigin } from "../scripts/grade-navigation-support.mjs";
assert.equal(process.env.FILUMIRE_PERSISTENCE, "memory");
const origin = loopbackOrigin(process.env.FILUMIRE_TEST_URL);
const out = process.env.FILUMIRE_NAVIGATION_ARTIFACTS;
writeFileSync(join(out, ".revision-browser-started"), "reserved", { flag: "wx" });
const module = await import(process.env.FILUMIRE_PLAYWRIGHT_MODULE);
const browser = await launchBrowser(module.chromium ?? module.default.chromium);
const fixtures = JSON.parse(readFileSync(join(out, "revision-fixtures.json"), "utf8"));
const results = [];
try {
  for (const f of fixtures) {
    const result = { width: f.width, language: f.language, errors: [], external: [], failed: [], pass: false };
    results.push(result);
    const context = await browser.newContext({ viewport: { width: f.width, height: 844 }, locale: f.language === "fr" ? "fr-FR" : "en-GB", serviceWorkers: "block" });
    await context.route("**/*", route => {
      const url = new URL(route.request().url());
      if (url.origin === origin || ["data:", "blob:"].includes(url.protocol)) return route.continue();
      result.external.push(url.href); return route.abort();
    });
    await context.routeWebSocket("**/*", socket => { result.external.push(socket.url()); socket.close(); });
    const page = await context.newPage(); page.setDefaultTimeout(15000);
    page.on("pageerror", error => result.errors.push(error.message));
    page.on("console", msg => { if (msg.type() === "error" && !/status of (401|400)\b/.test(msg.text())) result.errors.push(msg.text()); });
    page.on("requestfailed", request => result.failed.push(request.url()));
    const overview = () => page.evaluate(async () => (await fetch("/api/learning?overview=1")).json());
    try {
      await page.goto(`${origin}/login?lang=${f.language}`);
      await page.locator("#filumire-identity").fill(f.username);
      await page.locator("#filumire-password").fill(f.password);
      await page.locator("form button[type=submit]").click();
      await page.waitForURL(url => url.pathname === "/dashboard");
      await page.goto(`${origin}/dashboard?lang=${f.language}&view=challenges`);
      const section = page.locator('section[aria-labelledby="revision-title"]');
      await section.waitFor();
      assert.equal((await overview()).revision.due.length, 1);
      assert.match(await section.innerText(), f.language === "fr" ? /notion.*revoir/ : /earlier topic/);
      assert.equal((await page.locator(".cToday:not(.cRevision) h2").innerText()).trim(), f.nextTitle[f.language], "Daily challenge topic title in the page language");
      const revisionBox = await section.boundingBox();
      const normalBox = await page.locator(".cToday:not(.cRevision)").boundingBox();
      assert.ok(revisionBox.y + revisionBox.height <= normalBox.y, "Revision and challenge cards must not overlap");
      await page.screenshot({ path: join(out, `revision-${f.width}-${f.language}-due.png`), fullPage: true });
      const [delivery] = await Promise.all([
        page.waitForResponse(response => response.url().includes("/api/learning") && !response.url().includes("overview=") && response.request().method() === "GET" && response.url().includes("subjectId=")),
        section.getByRole("link", { name: f.language === "fr" ? "Commencer la révision" : "Start revision" }).click(),
      ]);
      const activity = await delivery.json();
      assert.equal(activity.decision.action, "retention_check"); assert.equal(activity.content.language, f.language);
      if (f.language === "fr") assert.ok(!activity.instruction.structured.elements.some(element => /Answer from memory|Give a short answer/.test(element.text)), "French review guidance must be French");
      const answer = f.answers[activity.content.assessmentItemId]; assert.ok(answer !== undefined);
      await page.locator('input[type="radio"]').first().waitFor();
      await page.screenshot({ path: join(out, `revision-${f.width}-${f.language}-activity.png`), fullPage: true });
      const options = await page.locator('input[type="radio"]').all();
      const correct = [];
      for (const option of options) if (await option.getAttribute("value") === answer) correct.push(option);
      assert.equal(correct.length, 1); await correct[0].check();
      const [submitted] = await Promise.all([
        page.waitForResponse(response => response.url().endsWith("/api/learning") && response.request().method() === "POST"),
        page.getByRole("button", { name: f.language === "fr" ? "Valider ma réponse" : "Submit answer", exact: true }).click(),
      ]);
      const response = await submitted.json();
      assert.equal(response.assessment.result.correct, true); assert.notEqual(response.decision.action, "retention_check");
      assert.equal(new URL(page.url()).searchParams.get("lang"), f.language);
      await page.goto(`${origin}/dashboard?lang=${f.language}&view=challenges`);
      await section.waitFor(); assert.equal((await overview()).revision.due.length, 0);
      assert.match(await section.innerText(), f.language === "fr" ? /prochaine révision/ : /next review/);
      await page.screenshot({ path: join(out, `revision-${f.width}-${f.language}-rescheduled.png`), fullPage: true });
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), "No horizontal overflow");
      assert.equal((await overview()).gradeSetByGuardian, true);
      assert.deepEqual(result.errors, []); assert.deepEqual(result.external, []); assert.deepEqual(result.failed, []);
      result.pass = true; console.log(`PASS revision ${f.width}/${f.language}: due → authored question → evidence → normal learning → rescheduled`);
    } catch (error) { result.failure = error.stack; await page.screenshot({ path: join(out, `revision-${f.width}-${f.language}-FAIL.png`), fullPage: true }); throw error; }
    finally { await context.close(); writeFileSync(join(out, "revision-results.json"), JSON.stringify(results, null, 2)); }
  }
} finally { await browser.close(); }
