// Actual headless Chromium UI journeys against the isolated memory-only build.
import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { claimBrowserEvidence, launchBrowser, loopbackOrigin } from "../scripts/grade-navigation-support.mjs";

const playwrightModule = await import(process.env.FILUMIRE_PLAYWRIGHT_MODULE);
const chromium = playwrightModule.chromium ?? playwrightModule.default?.chromium;
const origin = loopbackOrigin(process.env.FILUMIRE_TEST_URL);
assert.equal(process.env.FILUMIRE_PERSISTENCE, "memory");
const out = process.env.FILUMIRE_NAVIGATION_ARTIFACTS;
claimBrowserEvidence(out);
const browser = await launchBrowser(chromium);
writeFileSync(join(out, "browser-environment.json"), JSON.stringify({ browser: "Chromium", version: browser.version(),
  headless: true, persistence: "memory", origin, serviceWorkers: "blocked", widths: [320, 390, 768, 1280],
  locales: ["en-GB", "fr-FR"] }, null, 2));
const results = [];
const grades = { b4: "level-gh-basic-4-pilot", b5: "level-gh-basic-5-pilot", b6: "level-gh-basic-6-pilot" };
const password = "Fictional-browser-pass-17";
let caseIndex = 0;

try {
  for (const width of [320, 390, 768, 1280]) for (const lang of ["en", "fr"]) {
    caseIndex++;
    const result = { width, lang, stages: [], layouts: [], console: [], pageErrors: [], failedRequests: [], httpErrors: [],
      externalBlocked: [], inaccessible: [], links: [] };
    results.push(result);
    const context = await browser.newContext({ viewport: { width, height: width === 768 ? 1024 : 844 }, locale: lang === "fr" ? "fr-FR" : "en-GB",
      serviceWorkers: "block", extraHTTPHeaders: { "x-forwarded-for": `192.0.2.${caseIndex}` } });
    await context.route("**/*", route => {
      const url = new URL(route.request().url());
      if (url.origin === origin || ["data:", "blob:"].includes(url.protocol)) return route.continue();
      result.externalBlocked.push(url.origin + url.pathname);
      return route.abort("blockedbyclient");
    });
    // WebSocket traffic is not intercepted by HTTP routing. This suite needs none.
    await context.routeWebSocket("**/*", socket => {
      result.externalBlocked.push(socket.url());
      socket.close();
    });
    const page = await context.newPage();
    page.setDefaultTimeout(15000);
    page.on("console", message => { if (["error", "warning"].includes(message.type())) result.console.push({ type: message.type(), text: message.text() }); });
    page.on("pageerror", error => result.pageErrors.push(error.message));
    page.on("requestfailed", request => result.failedRequests.push({ url: request.url(), error: request.failure()?.errorText }));
    page.on("response", response => { if (response.status() >= 400) result.httpErrors.push({ url: response.url(), status: response.status() }); });
    const cdp = await context.newCDPSession(page);
    const run = randomUUID().slice(0, 7);
    const guardian = `guardian.${run}@example.test`;
    const teacher = `teacher.${run}@example.test`;
    const locked = `locked.${run}`;
    const unlocked = `choose.${run}`;
    let lockedId;

    async function language() {
      await page.waitForFunction(value => document.documentElement.lang === value, lang);
      assert.equal(new URL(page.url()).searchParams.get("lang"), lang);
    }
    async function ui(stage) {
      await language();
      await page.evaluate(() => document.fonts.ready);
      const layout = await page.evaluate(() => {
        const visible = element => { const box = element.getBoundingClientRect(); return box.width > 0 && box.height > 0; };
        const controls = [...document.querySelectorAll("header a,header button")].filter(visible).map(element => {
          const box = element.getBoundingClientRect();
          return { text: element.getAttribute("aria-label") || element.textContent.trim(), x: box.x, y: box.y, right: box.right, bottom: box.bottom };
        });
        const overlaps = [];
        for (let a = 0; a < controls.length; a++) for (let b = a + 1; b < controls.length; b++) {
          if (Math.min(controls[a].right, controls[b].right) - Math.max(controls[a].x, controls[b].x) > 2 &&
              Math.min(controls[a].bottom, controls[b].bottom) - Math.max(controls[a].y, controls[b].y) > 2) overlaps.push([controls[a].text, controls[b].text]);
        }
        const intro = document.querySelector(".approvedSetupIntro h1")?.getBoundingClientRect();
        const note = document.querySelector(".setupNote")?.getBoundingClientRect();
        const avatarParent = document.querySelector(".setupAvatarChoices")?.getBoundingClientRect();
        const avatarsFit = [...document.querySelectorAll(".setupAvatarChoice")].every(element => {
          const box = element.getBoundingClientRect();
          return avatarParent && box.left >= avatarParent.left - 1 && box.right <= avatarParent.right + 1 && box.width >= 44;
        });
        const headingFits = !intro || (intro.right <= innerWidth && (!note || intro.right <= note.left + 2 || intro.top >= note.bottom));
        return { viewport: innerWidth, scrollWidth: document.documentElement.scrollWidth, overlaps, headingFits, avatarsFit,
          clippedHeaderControls: controls.filter(box => box.x < -1 || box.right > innerWidth + 1) };
      });
      result.layouts.push({ stage, ...layout });
      const tree = await cdp.send("Accessibility.getFullAXTree");
      for (const node of tree.nodes) {
        if (!node.ignored && ["button", "link", "textbox", "combobox", "radio", "checkbox"].includes(node.role?.value) && !node.name?.value?.trim()) {
          result.inaccessible.push({ stage, role: node.role.value, backendDOMNodeId: node.backendDOMNodeId });
        }
      }
      const links = await page.locator("a[href]").evaluateAll(nodes => nodes.map(node => ({ text: node.textContent.trim(), href: node.getAttribute("href") })));
      result.links.push({ stage, links });
      await page.screenshot({ path: join(out, `${width}-${lang}-${stage}.png`), fullPage: true });
      assert(layout.scrollWidth <= width + 1, `${stage}: horizontal overflow (${layout.scrollWidth}/${width})`);
      assert.equal(layout.overlaps.length, 0, `${stage}: overlapping header controls`);
      assert.equal(layout.clippedHeaderControls.length, 0, `${stage}: clipped header controls`);
      assert(layout.headingFits, `${stage}: setup heading overlaps decorative note`);
      assert(layout.avatarsFit, `${stage}: avatar controls overflow or are too small`);
      result.stages.push(stage);
      console.log(`${width}/${lang}: ${stage}`);
    }
    async function register(email, role = "guardian") {
      await page.locator("#reg-name").fill(role === "guardian" ? "Fictional Guardian" : "Fictional Teacher");
      await page.locator("#reg-email").fill(email);
      await page.locator("#reg-password").fill(password);
      await page.locator("#reg-language").selectOption(lang);
      for (const checkbox of await page.locator("input[type=checkbox]").all()) await checkbox.check();
      await page.locator("form button[type=submit]").click();
      await page.waitForURL(url => url.pathname === (role === "guardian" ? "/family" : "/teacher"));
      await language();
    }
    async function login(identity, expectedPath, query = "") {
      await page.goto(`${origin}/login?lang=${lang}${query}`);
      await page.locator("#filumire-identity").fill(identity);
      await page.locator("#filumire-password").fill(password);
      await page.locator("form button[type=submit]").click();
      await page.waitForURL(url => url.pathname === expectedPath);
      await language();
    }
    async function logout(selector) {
      await page.locator(selector).click();
      await page.waitForURL(url => url.pathname === "/login");
      await language();
      const status = await page.evaluate(async () => (await fetch("/api/session/me")).status);
      assert.equal(status, 401, "sign-out invalidates the session");
    }
    async function overview() {
      return page.evaluate(async () => { const response = await fetch("/api/learning?overview=1"); return { status: response.status, body: await response.json() }; });
    }
    async function attack(gradeId, completeOnboarding = false) {
      const before = await page.evaluate(async () => (await (await fetch("/api/session/me")).json()));
      const response = await page.evaluate(async ({ id, gradeId, completeOnboarding }) => {
        const response = await fetch(`/api/account/learners/${id}`, { method: "PATCH", headers: { "content-type": "application/json" },
          body: JSON.stringify({ gradeId, avatarId: "9", completeOnboarding }) });
        return { status: response.status, body: await response.json() };
      }, { id: lockedId, gradeId, completeOnboarding });
      assert.equal(response.status, 400);
      assert.equal(response.body.code, "invalid_grade");
      const after = await page.evaluate(async () => (await (await fetch("/api/session/me")).json()));
      assert.deepEqual(after, before, "forged grade change must not change profile/onboarding");
      const stored = await overview();
      assert.equal(stored.status, 200);
      assert.equal(stored.body.gradeId, grades.b5);
      assert.equal(stored.body.gradeSetByGuardian, true);
      result.stages.push(completeOnboarding ? "forged-onboarding-rejected" : "forged-grade-rejected");
    }
    try {
      await page.goto(`${origin}/login?lang=${lang}&returnTo=family`);
      await page.locator("#filumire-identity").waitFor();
      await ui("sign-in");
      await page.keyboard.press("Tab");
      assert(await page.locator(":focus").count(), "keyboard focus can enter the page");
      await page.locator('a[href^="/register"]').click();
      await language();
      await register(guardian);
      await page.locator("#add-name").waitFor();
      await ui("family-empty");
      for (const [username, grade] of [[locked, grades.b5], [unlocked, ""]]) {
        await page.locator("#add-name").fill(username === locked ? "Locked Learner" : "Choosing Learner");
        await page.locator("#add-username").fill(username);
        await page.locator("#add-password").fill(password);
        await page.locator("#add-grade").selectOption(grade);
        await page.locator("#add-language").selectOption(lang);
        await page.locator("form input[type=checkbox]").check();
        const created = page.waitForResponse(response => response.url().endsWith("/api/account/learners") && response.request().method() === "POST");
        await page.locator("form button[type=submit]").click();
        const response = await created;
        assert.equal(response.status(), 201);
        if (username === locked) lockedId = (await response.json()).learnerId;
        await page.locator(".fmList").getByText(username, { exact: false }).waitFor();
      }
      await ui("family-learners");
      await page.locator('.acActions a[href^="/adult"]').click();
      await page.locator(".adultRoleSwitch").waitFor();
      assert.equal(await page.locator('.adultRoleSwitch a[href^="/teacher"]').count(), 0);
      await ui("parent-progress");
      await page.getByRole("button", { name: "Locked Learner", exact: true }).click();
      await page.locator(".parent-overview").waitFor();
      assert.equal(await page.getByRole("button", { name: "Locked Learner", exact: true }).getAttribute("aria-pressed"), "true");
      await ui("parent-selected-progress");
      await page.getByRole("button", { name: "Choosing Learner", exact: true }).click();
      await page.waitForFunction(() => [...document.querySelectorAll(".learner-option")]
        .some(button => button.textContent.trim() === "Choosing Learner" && button.getAttribute("aria-pressed") === "true"));
      result.stages.push("parent-switches-learner");
      await page.locator('.adultRoleSwitch a[href^="/family"]').click();
      await page.waitForURL(url => url.pathname === "/family");
      await page.locator("#add-name").waitFor();
      await page.locator('.acActions a[href^="/adult"]').click();
      await page.locator(".filumireAdultSignOut").waitFor();
      await logout(".filumireAdultSignOut");
      await ui("guardian-signed-out");
      await page.goto(`${origin}/family?lang=${lang}`);
      await page.waitForURL(url => url.pathname === "/login");
      await language();
      assert.equal(new URL(page.url()).searchParams.get("returnTo"), "family");
      await login(guardian, "/family", "&returnTo=family");
      await page.locator("#add-name").waitFor();
      await ui("guardian-sign-in-destination");
      await logout(".acActions > button.quiet");

      await login(locked, "/dashboard");
      await page.locator('[data-class-mode="locked"]').waitFor();
      assert.equal(new URL(page.url()).searchParams.get("view"), "setup");
      assert.equal(await page.locator("#setupLevel").count(), 0);
      assert.match(await page.locator('[data-class-mode="locked"]').innerText(), /5/);
      assert.equal(await page.locator("nav.filumireBottomNav").count(), 0);
      await ui("locked-setup");
      const other = lang === "en" ? "fr" : "en";
      await page.getByRole("button", { name: lang === "en" ? "Passer en français" : "Switch to English", exact: true }).click();
      await page.waitForFunction(value => document.documentElement.lang === value, other);
      assert.equal(new URL(page.url()).searchParams.get("lang"), other);
      await page.getByRole("button", { name: other === "en" ? "Passer en français" : "Switch to English", exact: true }).click();
      await language();
      result.stages.push("live-language-switch");
      await attack(grades.b6, true);
      await page.goto(`${origin}/dashboard?lang=${lang}&view=progress`);
      await page.locator('[data-class-mode="locked"]').waitFor();
      await page.waitForURL(url => url.searchParams.get("view") === "setup");
      await page.locator(".filumireSetupAskFilu").click();
      await page.waitForURL(url => url.searchParams.get("returnTo") === "ask-filu");
      await page.locator('[data-class-mode="locked"]').waitFor();
      assert.equal(new URL(page.url()).searchParams.get("returnTo"), "ask-filu");
      await page.locator(".approvedSetupContinue").click();
      await page.waitForURL(url => url.searchParams.get("view") === "ask-filu");
      await page.locator("#filu-question").waitFor();
      await ui("setup-to-assistant");
      await attack(grades.b4);
      await page.reload();
      await page.locator("#filu-question").waitFor();
      await page.goto(`${origin}/dashboard?lang=${lang}`);
      await page.locator(".homeGreeting").waitFor();
      await ui("dashboard");
      await page.locator(".homeCta").click();
      await page.waitForURL(url => url.pathname === "/learn");
      // Teaching-first: a new topic opens on its lesson, not a question.
      await page.locator(".lesson-body").waitFor();
      assert.equal(await page.locator('input[type="radio"]').count(), 0);
      await ui("learning-lesson");
      await page.locator(".checkFirst button").click();
      await page.locator('input[type="radio"]').first().waitFor();
      await ui("learning-activity");
      await page.goto(`${origin}/dashboard?lang=${lang}`);
      await page.locator(".homeGreeting").waitFor();
      for (const view of ["learning", "progress", "challenges"]) {
        await page.locator(`nav a[href*="view=${view}"]`).click();
        await page.waitForURL(url => url.searchParams.get("view") === view);
        await ui(view);
        assert.equal(await page.locator('nav [aria-current="page"]').count(), 1);
      }
      await page.locator(".filumireSetupAvatar,.filumireAvatar").click();
      await page.waitForURL(url => url.searchParams.get("view") === "profile");
      await ui("profile");
      assert.equal(await page.locator('nav [aria-current="page"]').count(), 0);
      await logout(".prRow.out");

      await login(unlocked, "/dashboard");
      await page.locator("#setupLevel").waitFor();
      assert.equal(await page.locator("#setupLevel").inputValue(), "");
      await page.locator(".approvedSetupContinue").click();
      await page.locator('.approvedSetup p[role="alert"]').waitFor();
      assert.equal(new URL(page.url()).searchParams.get("view"), "setup");
      await page.locator("#setupLevel").focus();
      await page.keyboard.press("b");
      await page.locator("#setupLevel").selectOption(grades.b6);
      await ui("learner-choice-setup");
      await page.locator(".approvedSetupContinue").click();
      await page.waitForURL(url => url.pathname === "/dashboard" && !url.searchParams.has("view"));
      await page.locator(".homeGreeting").waitFor();
      await ui("learner-choice-dashboard");
      const chosen = await overview();
      assert.equal(chosen.status, 200);
      assert.equal(chosen.body.gradeId, grades.b6);
      assert.equal(chosen.body.gradeSetByGuardian, false);
      await page.reload();
      await page.locator(".homeGreeting").waitFor();
      await logout(".learnerSignOutButton");
      await login(unlocked, "/dashboard");
      await page.locator(".homeGreeting").waitFor();
      assert.notEqual(new URL(page.url()).searchParams.get("view"), "setup");
      await logout(".learnerSignOutButton");

      await page.goto(`${origin}/register?lang=${lang}&role=teacher`);
      await page.locator("#reg-email").waitFor();
      await register(teacher, "teacher");
      await page.locator(".filumireAdultSignOut").waitFor();
      assert.equal(await page.locator('.adultRoleSwitch a[href^="/family"],.adultRoleSwitch a[href^="/adult"]').count(), 0);
      await ui("teacher-workspace");
      // Simulated revocation failure: the browser must remain signed in and
      // offer retry. This response is an intentional negative-path fixture.
      await page.route("**/api/session/logout", route => route.fulfill({ status: 503,
        contentType: "application/json", body: JSON.stringify({ error: "Fictional sign-out failure" }) }));
      await page.locator(".filumireAdultSignOut").click();
      await page.locator(".filumireAdultSignOutError").waitFor();
      assert.equal(new URL(page.url()).pathname, "/teacher");
      assert.equal(await page.evaluate(async () => (await fetch("/api/session/me")).status), 200);
      await page.unroute("**/api/session/logout");
      result.stages.push("failed-sign-out-retains-session");
      await logout(".filumireAdultSignOut");
      await login(teacher, "/teacher", "&returnTo=family");
      await page.locator(".filumireAdultSignOut").waitFor();
      await ui("teacher-sign-in-destination");
      await page.goto(`${origin}/family?lang=${lang}`);
      await page.waitForURL(url => url.pathname === "/teacher");
      await page.locator(".filumireAdultSignOut").waitFor();
      await language();
      result.stages.push("teacher-family-role-redirect");
      await logout(".filumireAdultSignOut");
      await page.goto(`${origin}/teacher?lang=${lang}`);
      await page.locator('a[href^="/login"]').waitFor();
      assert.equal(await page.locator(".filumireAdultSignOut").count(), 0);
      await ui("teacher-signed-out");

      result.linkChecks = [];
      const paths = new Set(["/", "/login", "/register", "/privacy", "/family", "/adult", "/teacher", "/dashboard", "/learn"]);
      const seen = new Set();
      for (const entry of result.links.flatMap(stage => stage.links)) {
        const url = new URL(entry.href, origin);
        if (url.origin !== origin || !paths.has(url.pathname) || seen.has(url.href)) continue;
        seen.add(url.href);
        const response = await context.request.get(url.href, { maxRedirects: 0 });
        result.linkChecks.push({ path: url.pathname + url.search, status: response.status() });
        assert(response.status() < 400, `broken local navigation link: ${url.pathname}`);
      }

      assert.equal(result.pageErrors.length, 0, "unhandled browser errors");
      assert.equal(result.externalBlocked.length, 0, "unexpected external requests");
      assert.equal(result.inaccessible.length, 0, "unnamed controls in Chromium accessibility tree");
      const unexpectedHttp = result.httpErrors.filter(({ url, status }) => {
        const path = new URL(url).pathname;
        return !((status === 401 && ["/api/session/me", "/api/teacher/summary"].includes(path)) ||
          (status === 400 && /^\/api\/account\/learners\/[^/]+$/.test(path)) ||
          (status === 503 && path === "/api/session/logout"));
      });
      const unexpectedConsole = result.console.filter(({ type, text }) =>
        !(type === "warning" && text === "Service Worker registration blocked by Playwright") &&
        !(type === "error" && /Failed to load resource: the server responded with a status of (400|401|503)\b/.test(text)));
      result.diagnostics = { unexpectedHttp, unexpectedConsole };
      assert.deepEqual(unexpectedHttp, [], "unexpected failed HTTP requests");
      assert.deepEqual(unexpectedConsole, [], "unexpected browser console output");
      assert.deepEqual(result.failedRequests, [], "failed network transports");
      result.pass = true;
    } catch (error) {
      result.pass = false;
      result.failure = error.stack;
      result.url = page.url();
      result.visibleText = (await page.locator("body").innerText()).slice(0, 6000);
      await page.screenshot({ path: join(out, `${width}-${lang}-FAIL.png`), fullPage: true });
      console.log(`${width}/${lang}: FAIL ${error.message}`);
      // Stop at the first broken boundary to reproduce/correct it.
      throw error;
    } finally {
      await context.close();
      writeFileSync(join(out, "results.json"), JSON.stringify(results, null, 2));
    }
  }
} finally { await browser.close(); }
console.log(`PASS: ${results.length} actual Chromium grade/navigation journeys`);
