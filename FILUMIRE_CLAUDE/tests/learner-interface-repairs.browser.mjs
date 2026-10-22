// Run against a local, memory-only app with account registration open:
// node --import tsx tests/learner-interface-repairs.browser.mjs
// Uses real API responses, fictional accounts, and visible UI controls.
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { resolvePlaywright, launchBrowser, loopbackOrigin } from "../scripts/grade-navigation-support.mjs";
import { seedContent } from "../services/content-store/seed.ts";
import { getContentForCompetency } from "../services/content-store/index.ts";

assert.equal(process.env.FILUMIRE_PERSISTENCE, "memory");
const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const origin = loopbackOrigin(process.env.FILUMIRE_TEST_URL);
assert.equal(new URL(origin).hostname, "127.0.0.1", "regress the originally failing loopback Host");
const { chromium } = await import(resolvePlaywright(root));
const artifacts = process.env.FILUMIRE_NAVIGATION_ARTIFACTS;
if (artifacts) await mkdir(artifacts, { recursive: true });
seedContent();
const password = "Fictional-interface-repairs-password-61";
const run = crypto.randomUUID().slice(0, 8);
const results = [];
let requestNumber = 0;
async function fixture(path, body, cookie = "", method = "POST") {
  const response = await fetch(origin + path, { method,
    headers: { origin, "content-type": "application/json", "x-forwarded-for": `192.0.2.${++requestNumber}`, ...(cookie ? { cookie } : {}) },
    body: JSON.stringify(body), signal: AbortSignal.timeout(120000) });
  const data = await response.json();
  assert(response.ok, `${path}: ${response.status} ${JSON.stringify(data)}`);
  return { data, cookie: response.headers.get("set-cookie")?.match(/filumire_auth_session=([^;]*)/)?.[1] };
}
const guardian = await fixture("/api/account/register", {
  email: `interface-repairs.${run}@example.test`, password, displayName: "Fictional Guardian",
  preferredLanguage: "en", confirmsGuardian: true, acceptsNotice: true,
});
const browser = await launchBrowser(chromium);
try {
  for (const [width, language] of [[390, "en"], [1280, "fr"]]) for (const grade of [4, 5, 6]) {
    const username = `repairs.${run}.${width}.${grade}`;
    const gradeId = `level-gh-basic-${grade}-pilot`;
    const added = await fixture("/api/account/learners", { displayName: "Fictional Learner", username, password,
      gradeId, preferredLanguage: language, consentsToLearnerData: true }, `filumire_auth_session=${guardian.cookie}`);
    await fixture(`/api/account/learners/${added.data.learnerId}`, { gradeId, completeOnboarding: true }, `filumire_auth_session=${guardian.cookie}`, "PATCH");
    const signed = await fixture("/api/session/login", { login: username, password });
    const context = await browser.newContext({ viewport: { width, height: 900 }, serviceWorkers: "block",
      extraHTTPHeaders: { "x-forwarded-for": `198.51.100.${results.length + 1}` } });
    await context.addCookies([
      { name: "filumire_auth_session", value: signed.cookie, url: origin, httpOnly: true, sameSite: "Lax" },
      { name: "filumire_signed_in", value: "1", url: origin },
    ]);
    await context.route("**/*", route => {
      const url = new URL(route.request().url());
      return url.origin === origin || ["data:", "blob:"].includes(url.protocol) ? route.continue() : route.abort();
    });
    const page = await context.newPage();
    page.setDefaultTimeout(20000);
    page.setDefaultNavigationTimeout(120000);
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    const nextResponse = () => page.waitForResponse(response =>
      new URL(response.url()).pathname === "/api/learning" && response.request().method() === "POST");
    for (const discipline of ["english", "mathematics", "computing", "science"]) {
      const result = { grade, discipline, language, width };
      results.push(result);
      const label = `B${grade} ${discipline} ${language.toUpperCase()} ${width}px`;
      try {
        await page.goto(`${origin}/dashboard?lang=${language}`);
        await page.locator(`.homeSubject.${discipline}`).click();
        const topic = page.locator(".subjectPage .subjectArea").first();
        await topic.waitFor({ state: "attached" });
        if (!await topic.isVisible()) await page.locator(".subjectPage details summary").first().click();
        await topic.click();
        await page.locator(".checkFirst button").waitFor();
        const diagnostic = nextResponse();
        await page.locator(".checkFirst button").click();
        const delivered = await (await diagnostic).json();
        await page.locator('input[name="answer"]').first().waitFor();
        const question = delivered.content;
        const authored = getContentForCompetency(question.competencyId).find(item => item.id === question.id);
        assert(authored?.metadata?.expectedResponse);
        const expected = authored.metadata.expectedResponse;
        const options = await page.locator('input[name="answer"]').evaluateAll(inputs => inputs.map(input => input.value));
        const wrongIndex = options.findIndex(option => option !== expected);
        assert(wrongIndex >= 0);
        await page.locator('input[name="answer"]').nth(wrongIndex).check();
        const wrongReply = nextResponse();
        await page.locator(".assessment button.primary-button").click();
        const wrong = await (await wrongReply).json();
        assert.equal(wrong.assessment.result.correct, false);
        await page.locator('.answerCorrection[data-phase="explain"]').waitFor();
        assert.equal(await page.locator(".answerCorrection .passage").count(), 2);
        const questionText = await page.locator(".lesson-body").innerText();
        const snapshot = async () => {
          const response = await context.request.get(`${origin}/api/learning?dashboard=1`);
          assert.equal(response.status(), 200);
          const { progress, learnerState } = await response.json();
          return { competencies: learnerState.competencies, mastery: progress.masteryEstimate,
            evidence: progress.evidenceCount, completed: progress.completedCompetencies };
        };
        const beforeSwitch = await snapshot();
        const switched = language === "en" ? "fr" : "en";
        await page.getByRole("button", { name: language === "en" ? "Passer en français" : "Switch to English", exact: true }).click();
        await page.waitForFunction(value => document.documentElement.lang === value, switched);
        assert.equal(await page.locator(".lesson-body").innerText(), questionText);
        assert.deepEqual(await snapshot(), beforeSwitch, "language switching preserves progress and evidence");
        const notice = await page.locator(".contentLanguageNotice").innerText();
        assert.match(notice, switched === "fr" ? /question reste en anglais.*correction.*essai/ : /question stays in French.*correction.*retry/);
        assert(!/not been supplied|pas été fournie/.test(notice), "retained questions are not missing translations");
        await page.getByRole("button", { name: switched === "fr" ? "Réessayer la question" : "Try the question again", exact: true }).click();
        assert.deepEqual(await page.locator('input[name="answer"]').evaluateAll(inputs => inputs.map(input => input.value)), options);
        await page.locator('input[name="answer"]').nth(options.indexOf(expected)).check();
        const retryReply = nextResponse();
        await page.locator(".assessment button.primary-button").click();
        const retried = await (await retryReply).json();
        await page.locator(".answerCorrection .result.correct").waitFor();
        assert.equal(retried.correction.assessmentItemId, question.assessmentItemId);
        assert.equal(retried.assessment.evidence.independence, "guided");
        assert.equal(await page.locator(".answerCorrection h2").innerText(), switched === "fr" ? "Tu as corrigé ton erreur." : "You corrected your mistake.");
        await page.locator(".answerCorrection button.primary").click();
        await page.locator(".nextButton").waitFor();
        const acknowledgement = nextResponse();
        await page.locator(".nextButton").click();
        assert.equal((await acknowledgement).status(), 200);
        await page.locator(".closureCard").waitFor();
        assert.equal(await page.locator(".closureCard h2").innerText(), switched === "fr" ? "Le résumé de ta leçon" : "Your lesson summary");
        assert.equal(await page.getByText(switched === "fr" ? "Le résumé n’est pas disponible pour le moment. Ton travail enregistré est conservé." : "Your summary is unavailable just now. Your recorded work is kept.", { exact: true }).count(), 0);
        const beforeView = await snapshot();
        for (const headers of [
          { origin: "https://evil.example", "sec-fetch-site": "cross-site" },
          { origin: origin.replace("127.0.0.1", "localhost"), "sec-fetch-site": "same-origin" },
        ]) {
          const refused = await context.request.post(`${origin}/api/learning/closure`, { headers, data: { receipt: "foreign-request", language: switched } });
          assert.equal(refused.status(), 403);
          assert.equal((await refused.json()).code, "invalid_origin");
        }
        assert.deepEqual(await snapshot(), beforeView, "summary views and rejected cross-site requests preserve progress and evidence");
        await page.getByRole("button", { name: switched === "fr" ? "Voir ma révision recommandée" : "See my recommended review", exact: true }).click();
        await page.getByRole("button", { name: switched === "fr" ? "Continuer vers l’activité recommandée" : "Continue to the recommended activity", exact: true }).click();
        await page.locator(".closureCard").waitFor({ state: "detached" });
        await page.locator(".lesson-body").waitFor();
        assert.deepEqual(errors, [], "no browser runtime errors");
        result.status = "PASS";
        console.log(`PASS ${label}: retained question, guided retry heading, summary/review on 127.0.0.1, cross-site protection`);
      } catch (error) {
        result.status = "FAIL";
        result.error = error.message;
        if (artifacts) await page.screenshot({ path: join(artifacts, `repair-failure-${grade}-${discipline}-${width}.png`), fullPage: true });
        console.error(`FAIL ${label}: ${error.message}`);
      }
      if (artifacts) await writeFile(join(artifacts, "interface-repairs-results.json"), JSON.stringify(results, null, 2));
    }
    await context.close();
  }
} finally { await browser.close(); }
const failed = results.filter(result => result.status !== "PASS");
console.log(`Interface repair browser matrix: ${results.length - failed.length}/${results.length} passed`);
assert.equal(results.length, 24);
assert.equal(failed.length, 0, "all subject/grade/language repair journeys pass");
