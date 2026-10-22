// Local-only browser regression. Every application API request is intercepted;
// no account, learner, progress or database records are created by this test.
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";

const base = process.env.FILUMIRE_TEST_URL ?? "http://127.0.0.1:3187";
if (!["127.0.0.1", "localhost"].includes(new URL(base).hostname)) throw new Error("Local test server required");
const { chromium } = await import(process.env.FILUMIRE_PLAYWRIGHT_MODULE ?? "playwright");
const browser = await chromium.launch({ headless: true, executablePath: process.env.FILUMIRE_CHROMIUM_PATH });
const artifacts = process.env.FILUMIRE_NAVIGATION_ARTIFACTS;
if (artifacts) await mkdir(artifacts, { recursive: true });
let checks = 0;
try {
  for (const width of [390, 768, 1280]) {
    const context = await browser.newContext({ viewport: { width, height: 900 } });
    await context.addCookies([{ name: "filumire_signed_in", value: "1", url: base }]);
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    let onboarded = true;
    let authorized = true;
    let guardian = false;
    let accountDelay = 0;
    const learner = () => ({ learnerId: "fictional-navigation-learner", displayName: "Test Learner", avatarId: "1", preferredLanguage: "en", onboardingComplete: onboarded });
    const subjectId = "fictional-science";
    const overview = {
      gradeId: "level-gh-basic-5-pilot", gradeName: "Basic 5", activeSubjectId: subjectId, areasSubjectId: subjectId,
      availableSubjects: [{ id: subjectId, name: "Science", code: "SCI", discipline: "science" }],
      subjects: { [subjectId]: { total: 4, completed: 1, tracked: 1, started: true } }, areas: [],
    };
    const learning = {
      learnerState: { learnerId: "fictional-navigation-learner", competencies: [] },
      decision: { id: "fictional-decision", sessionId: "fictional-session", action: "teach", competencyId: "fictional-competency", reasonCode: "TEACH", instructionalStrategy: "step_by_step" },
      progress: { learnerId: "fictional-navigation-learner", competencyCount: 4, completedCompetencies: 1, masteryEstimate: 0.2, confidence: 0.4, evidenceCount: 1, readiness: false, percent: 25, subjectId, subjectName: "Science", competencyTitle: "Fictional science topic" },
      content: { id: "fictional-content", competencyId: "fictional-competency", type: "lesson", title: "Fictional lesson", body: "Fictional teaching content." },
      instruction: { content: "Fictional explanation.", structured: { elements: [{ type: "explanation", text: "Fictional explanation." }] } },
    };
    await page.route("**/api/**", async route => {
      const url = new URL(route.request().url());
      if (url.pathname === "/api/session/me") {
        if (accountDelay) await new Promise(resolve => setTimeout(resolve, accountDelay));
        return route.fulfill({ status: authorized ? 200 : 401, json: authorized ? {
          principalId: "fictional-principal", accountKind: guardian ? "guardian" : "learner", preferredLanguage: "en",
          learners: guardian ? [] : [learner()], activeLearnerId: guardian ? null : "fictional-navigation-learner",
        } : { error: "Unauthenticated" } });
      }
      if (url.pathname === "/api/account/learners/fictional-navigation-learner") {
        assert.equal(route.request().method(), "PATCH");
        assert.equal(route.request().postDataJSON().completeOnboarding, true);
        onboarded = true;
        return route.fulfill({ json: learner() });
      }
      if (url.pathname === "/api/learning") return route.fulfill({ status: authorized ? 200 : 401, json: authorized ? url.searchParams.has("overview") ? overview : learning : { error: "Unauthenticated" } });
      return route.fulfill({ status: 404, json: { error: "Not part of this navigation fixture" } });
    });
    async function open(path) {
      await page.goto(base + path);
      await page.locator(".learnerMainRegion .learnerContent, .learnMain, .learnBody").first().waitFor({ state: "visible", timeout: 60000 });
    }
    async function assistant() {
      await page.getByRole("heading", { name: "Ask FILU", exact: true }).waitFor({ timeout: 30000 });
      await page.locator("#filu-question").waitFor();
      const url = new URL(page.url());
      assert.equal(url.pathname, "/dashboard");
      assert.equal(url.searchParams.get("view"), "ask-filu");
      const active = page.locator('nav .filumireNavItem[aria-current="page"]');
      assert.equal(await active.count(), 1);
      assert.equal(new URL(await active.getAttribute("href"), base).searchParams.get("view"), "ask-filu");
      assert.equal(await active.isVisible(), true);
      assert.equal(await page.locator(".approvedSetup").count(), 0);
      assert.equal(await page.locator(".learnMain").count(), 0);
      const fits = await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1);
      assert.equal(fits, true, `assistant must fit width ${width}`);
      checks++;
    }
    async function askFromResponsiveNavigation() {
      // Below 768px the header shortcut is deliberately hidden in favour of
      // the bottom menu; tablet/desktop retain the visible header shortcut.
      const control = page.locator(width < 768
        ? 'nav.filumireBottomNav a[href*="view=ask-filu"]'
        : '.filumireSetupAskFilu');
      assert.equal(await control.isVisible(), true, `Ask FILU control is visible at ${width}px`);
      await control.click();
    }
    for (const origin of ["/dashboard?lang=en", "/dashboard?view=setup&lang=en", `/dashboard?view=learning&subjectId=${subjectId}&lang=en`]) {
      await open(origin);
      await page.locator('nav a[href*="view=ask-filu"]').click();
      await assistant();
      assert.equal(new URL(page.url()).searchParams.get("subjectId"), subjectId);
    }
    await open("/dashboard?lang=en");
    await page.locator(".homeTile.ask").click();
    await assistant();
    await open("/dashboard?view=setup&lang=en");
    await askFromResponsiveNavigation();
    await assistant();
    await open(`/learn?subjectId=${subjectId}&lang=en`);
    await askFromResponsiveNavigation();
    await assistant();
    assert.equal(new URL(page.url()).searchParams.get("subjectId"), subjectId);
    await open(`/learn?subjectId=${subjectId}&lang=en`);
    await page.locator(".askFiluLink").click();
    await assistant();
    await page.goBack();
    await page.locator('nav a[href*="view=ask-filu"]').click();
    await assistant();
    const lessonLink = await page.locator(".fBackToLesson").getAttribute("href");
    assert.equal(new URL(lessonLink, base).searchParams.get("subjectId"), subjectId);
    if (artifacts) await page.screenshot({ path: join(artifacts, `ask-filu-${width}.png`), fullPage: true });
    onboarded = false;
    accountDelay = 400;
    await open(`/dashboard?view=ask-filu&subjectId=${subjectId}&lang=en`);
    await page.getByText("Finish learner setup to open Ask FILU.", { exact: true }).waitFor();
    assert.equal(new URL(page.url()).searchParams.get("returnTo"), "ask-filu");
    assert.equal(await page.locator("#filu-question").count(), 0, "incomplete onboarding cannot bypass setup");
    await page.locator(".approvedSetup select").selectOption("level-gh-basic-5-pilot");
    await page.locator(".approvedSetupContinue").click();
    await assistant();
    accountDelay = 0;
    authorized = false;
    await page.goto(base + "/dashboard?view=ask-filu&lang=en");
    await page.locator('.learnerMainRegion a[href*="/login"]').first().waitFor();
    assert.equal(await page.locator("#filu-question").count(), 0, "an expired session cannot expose the assistant");
    checks++;
    authorized = true;
    guardian = true;
    // The expired-session case correctly clears this marker. Simulate a fresh
    // guardian sign-in before checking learner selection.
    await context.addCookies([{ name: "filumire_signed_in", value: "1", url: base }]);
    await page.goto(base + "/dashboard?view=ask-filu&lang=en");
    await page.waitForURL("**/family?lang=en");
    assert.equal(await page.locator("#filu-question").count(), 0, "guardian must select a learner");
    checks++;
    guardian = false;
    await page.goto(base + `/dashboard?view=learning&subjectId=${subjectId}&lang=fr`);
    await page.locator('nav a[href*="view=ask-filu"]').click();
    await page.getByRole("heading", { name: "Parle à FILU", exact: true }).waitFor();
    assert.equal(new URL(page.url()).searchParams.get("lang"), "fr");
    assert.equal(new URL(page.url()).searchParams.get("subjectId"), subjectId);
    assert.equal(await page.locator('nav .filumireNavItem[aria-current="page"]').count(), 1);
    checks++;
    assert.deepEqual(errors, [], "no browser runtime errors");
    console.log(`PASS: Home, Setup, My Learning, lesson links, history, onboarding return and access guards at ${width}px`);
    await context.close();
  }
  console.log(`PASS: ${checks} browser navigation/access checks; all API requests intercepted`);
} finally {
  await browser.close();
}
