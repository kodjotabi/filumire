// Real learner dashboard checks against an isolated, memory-only production build.
// Requires FILUMIRE_TEST_URL, FILUMIRE_PLAYWRIGHT_MODULE and a fresh evidence directory.
import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { launchBrowser, loopbackOrigin } from "../scripts/grade-navigation-support.mjs";

assert.equal(process.env.FILUMIRE_PERSISTENCE, "memory");
const origin = loopbackOrigin(process.env.FILUMIRE_TEST_URL);
const out = process.env.FILUMIRE_NAVIGATION_ARTIFACTS;
assert(out, "A fresh evidence directory is required");
mkdirSync(out); // Never overwrite an earlier run.
const { chromium } = await import(process.env.FILUMIRE_PLAYWRIGHT_MODULE);
const browser = await launchBrowser(chromium);
const primary = ["History", "Creative Arts", "Religious and Moral Education", "Physical Education", "French", "Ghanaian Language"];
const primaryFr = ["Histoire", "Arts créatifs", "Éducation religieuse et morale", "Éducation physique", "Français", "Langue ghanéenne"];
const jhs = ["Ghanaian Language", "French", "Arabic", "Creative Arts and Design", "Career Technology", "Social Studies", "Religious and Moral Education", "Physical and Health Education"];
const jhsFr = ["Langue ghanéenne", "Français", "Arabe", "Arts créatifs et design", "Technologie professionnelle", "Études sociales", "Éducation religieuse et morale", "Éducation physique et à la santé"];
const results = [];
const errors = [];
const run = randomUUID().slice(0, 6);
const password = "Fictional-pr22-pass-17";

async function request(context, path, body) {
  const response = await context.request.fetch(origin + path, {
    method: body === undefined ? "GET" : "POST",
    headers: { origin, "sec-fetch-site": "same-origin" },
    ...(body === undefined ? {} : { data: body }),
  });
  assert(response.ok(), `${path}: ${response.status()} ${await response.text()}`);
  return response.json();
}

try {
  for (const lang of ["en", "fr"]) {
    const guardian = await browser.newContext();
    await request(guardian, "/api/account/register", {
      email: `catalogue.${lang}.${run}@example.test`, password, displayName: "Fictional Catalogue Guardian",
      preferredLanguage: lang, confirmsGuardian: true, acceptsNotice: true,
    });
    const { choices } = await request(guardian, "/api/account/placement-choices");
    assert.deepEqual(choices.map((c) => c.name), [4, 5, 6, 7, 8, 9].map((n) => `Basic ${n}`));
    for (const grade of [4, 5, 6, 7, 8, 9]) {
      const choice = choices.find((c) => c.name === `Basic ${grade}`);
      assert(choice?.subjects.length, `Basic ${grade} has available established subjects`);
      const username = `cat.${lang}.${grade}.${run}`;
      const { learnerId } = await request(guardian, "/api/account/learners", {
        displayName: `Catalogue Basic ${grade}`, username, password, preferredLanguage: lang,
        consentsToLearnerData: true, curriculumVersionId: choice.curriculumVersionId,
        gradeId: choice.gradeId, subjectId: choice.subjects[0].id,
      });
      const context = await browser.newContext({ locale: lang === "fr" ? "fr-FR" : "en-GB", serviceWorkers: "block" });
      await context.route("**/*", (route) => new URL(route.request().url()).origin === origin ? route.continue() : route.abort());
      await request(context, "/api/session/login", { login: username, password });
      const profile = await context.request.patch(`${origin}/api/account/learners/${learnerId}`, {
        headers: { origin, "sec-fetch-site": "same-origin" }, data: { completeOnboarding: true, avatarId: "1", gradeId: choice.gradeId },
      });
      assert(profile.ok(), `Onboarding: ${profile.status()} ${await profile.text()}`);
      const page = await context.newPage();
      page.on("pageerror", (error) => errors.push({ grade, lang, message: error.message }));
      const unexpectedResponses = [];
      page.on("response", (response) => { if (response.status() >= 400 && new URL(response.url()).origin === origin) unexpectedResponses.push({ status: response.status(), url: response.url() }); });
      for (const width of [320, 390, 1440]) {
        await page.setViewportSize({ width, height: width < 600 ? 844 : 1000 });
        await page.goto(`${origin}/dashboard?lang=${lang}`, { waitUntil: "networkidle" });
        await page.locator(".homeReviewList summary").first().waitFor();
        await page.evaluate(() => document.fonts.ready);
        assert.equal(await page.locator("html").getAttribute("lang"), lang);
        const expected = grade <= 6 ? (lang === "en" ? primary : primaryFr) : (lang === "en" ? jhs : jhsFr);
        assert.deepEqual((await page.locator(".homeReviewList strong").allTextContents()).map((name) => name.replaceAll("\u00ad", "")), expected);
        assert.equal(await page.locator(".homeSubjects > a.homeSubject").count(), 4, "Four established subject links remain");
        assert((await page.locator(".homeReviewList .homeSubjectText small").allTextContents()).every((text) => text.startsWith(`Basic ${grade} · `)));
        const before = await request(context, "/api/learning?overview=1");
        assert.equal(before.gradeId, choice.gradeId);
        const summaries = page.locator(".homeReviewList summary");
        await summaries.first().focus();
        await page.keyboard.press("Enter");
        assert.equal(await page.locator(".homeReviewList details[open]").count(), 1);
        await page.keyboard.press("Space");
        assert.equal(await page.locator(".homeReviewList details[open]").count(), 0);
        await page.locator(".homeReview").screenshot({ path: join(out, `${width}-${lang}-b${grade}-closed.png`) });
        const collapsedScrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
        for (const summary of await summaries.all()) await summary.click();
        assert.equal(await page.locator(".homeReviewList details[open]").count(), expected.length);
        assert.equal(await page.locator(".homeReviewList a").count(), expected.length * 2);
        const layout = await page.evaluate(() => {
          const box = (e) => e.getBoundingClientRect();
          const cards = [...document.querySelectorAll(".homeReviewList > li")];
          return {
            width: innerWidth, scrollWidth: document.documentElement.scrollWidth,
            cardsFit: cards.every((e) => box(e).left >= 0 && box(e).right <= innerWidth + 1),
            controlsFit: [...document.querySelectorAll(".homeReviewList summary, .homeReviewList a")].every((e) => box(e).height >= 44 && box(e).right <= innerWidth + 1),
            labelsFit: cards.every((e) => [...e.querySelectorAll("strong, p, a")].every((child) => child.scrollWidth <= child.clientWidth + 1)),
            outOfBounds: [...document.querySelectorAll("body *")].filter((e) => box(e).width > 0 && (box(e).right > innerWidth + 1 || box(e).left < -1)).slice(-12).map((e) => ({ tag: e.tagName, className: e.getAttribute("class"), right: box(e).right, text: e.textContent.slice(0, 60) })),
          };
        });
        // The new cards must fit and opening them must not introduce page overflow.
        // Record existing overflow elsewhere without changing unrelated dashboard tiles.
        assert(layout.scrollWidth <= Math.max(width, collapsedScrollWidth) + 1 && layout.cardsFit && layout.controlsFit && layout.labelsFit, JSON.stringify({ grade, lang, collapsedScrollWidth, ...layout }));
        const links = await page.locator(".homeReviewList a").evaluateAll((nodes) => nodes.map((a) => ({ href: a.href, target: a.target, rel: a.rel })));
        assert(links.every((a) => new URL(a.href).hostname === "nacca.gov.gh" && a.target === "_blank" && a.rel.includes("noopener")));
        const after = await request(context, "/api/learning?overview=1");
        assert.deepEqual(after, before, "Expanding curriculum references must not change learning progress");
        await page.locator(".homeReview").screenshot({ path: join(out, `${width}-${lang}-b${grade}-open.png`) });
        results.push({ grade, lang, width, subjects: expected, layout, collapsedScrollWidth, keyboard: "passed", progressUnchanged: true });
        console.log(`PASS Basic ${grade} ${lang} ${width}px: ${expected.length} outline cards, four established subjects, keyboard, layout and unchanged progress`);
      }
      assert.deepEqual(unexpectedResponses, []);
      await context.close();
    }
    await guardian.close();
  }
  assert.deepEqual(errors, []);
} finally {
  writeFileSync(join(out, "results.json"), JSON.stringify({ browser: browser.version(), cases: results, errors }, null, 2));
  await browser.close();
}
console.log(`PASS ${results.length} catalogue browser cases`);
