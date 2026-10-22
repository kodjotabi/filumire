// Loopback-only, memory-only integration harness. Never starts a Next route or deployment.
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { resolve } from "node:path";
import { build } from "esbuild";
import { resolvePlaywright, launchBrowser } from "../scripts/grade-navigation-support.mjs";

assert.equal(process.env.NODE_ENV, "test", "explicit test environment required");
assert.equal(process.env.FILUMIRE_PERSISTENCE, "memory");
assert.equal(process.env.FILUMIRE_BASIC7_PILOT, "test-only");
assert(!process.env.VERCEL, "never run on a deployed instance");
const { installPilot, pilotContext } = await import("./fixtures/basic7-materials-pilot.ts");
const { source, pilotContent, observationContent } = await import("../services/content-store/ghana-b7-materials-pilot.ts");
const { GET, POST } = await import("../apps/learner/app/api/learning/route.ts");
const { createSession } = await import("../services/session/index.ts");
const { persistenceStore } = await import("../services/persistence-provider.ts");
const { getMaterialsPilotProgress } = await import("../services/learner-progress/ghana-b7-materials-pilot.ts");
const { submitPendingTeacherReview } = await import("../services/teacher-review/index.ts");
const { getEvidence } = await import("../services/evidence-store/index.ts");
installPilot();
const bundle = await build({ entryPoints: ["tests/fixtures/basic7-materials-app.tsx"], bundle: true, write: false, platform: "browser", format: "esm", jsx: "automatic", define: { "process.env.NODE_ENV": '"production"' } });
const contexts = new Map();
const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, "http://127.0.0.1");
    let raw = ""; for await (const chunk of req) { raw += chunk; if (raw.length > 50000) throw Error("Request too large"); }
    const json = (value) => { res.setHeader("content-type", "application/json"); res.end(JSON.stringify(value)); };
    if (url.pathname === "/") { res.setHeader("content-type", "text/html; charset=utf-8"); res.end('<!doctype html><meta name="viewport" content="width=device-width, initial-scale=1"><div id="root"></div><script type="module" src="/pilot.js"></script>'); }
    else if (url.pathname === "/pilot.js") { res.setHeader("content-type", "text/javascript"); res.end(bundle.outputFiles[0].text); }
    else if (url.pathname === "/test/new") {
      const learnerId = `learner-browser-b7-${crypto.randomUUID()}`, sessionId = `session-${learnerId}`;
      await persistenceStore.ensureLearnerExists(learnerId); await createSession(sessionId, learnerId);
      contexts.set(learnerId, await pilotContext(learnerId));
      json({ learnerId, sessionId, subjectId: source.subjectId, competencyId: source.id });
    } else if (url.pathname === "/test/progress") json(await getMaterialsPilotProgress(url.searchParams.get("learnerId"), contexts.get(url.searchParams.get("learnerId"))));
    else if (url.pathname === "/test/observation") {
      const body = JSON.parse(raw); assert(contexts.has(body.learnerId));
      const item = observationContent.find((c) => c.language === body.language);
      json(await submitPendingTeacherReview({ learnerId: body.learnerId, sessionId: body.sessionId, competencyId: source.id,
        assessmentItemId: item.assessmentItemId, contentId: item.id, response: body.response, clientRequestId: crypto.randomUUID() }));
    } else if (url.pathname === "/api/learning") {
      const request = new Request(`http://${req.headers.host}${req.url}`, { method: req.method, headers: req.headers, ...(raw ? { body: raw } : {}) });
      const response = await (req.method === "POST" ? POST(request) : GET(request));
      res.writeHead(response.status, Object.fromEntries(response.headers)); res.end(await response.text());
    } else { res.statusCode = 404; res.end(); }
  } catch (error) { res.statusCode = 500; res.end(JSON.stringify({ error: String(error) })); }
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
let browser;
try {
  const { chromium } = await import(resolvePlaywright(resolve(".")));
  browser = await launchBrowser(chromium);
  for (const [width, language] of [[390, "en"], [1280, "en"], [390, "fr"], [1280, "fr"]]) {
    const context = await browser.newContext({ viewport: { width, height: 900 } });
    const page = await context.newPage();
    const errors = []; page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(`${origin}/?lang=${language}`);
    const continuation = language === "en" ? "Continue" : "Continuer";
    await page.getByRole("button", { name: continuation, exact: true }).click();
    await page.getByRole("heading", { name: /three worked examples|trois exemples résolus/ }).waitFor();
    await page.getByRole("button", { name: continuation, exact: true }).click();
    const article = page.locator("article");
    await page.locator('input[name="answer"]').first().waitFor();
    const itemId = await article.getAttribute("data-item");
    const item = pilotContent.find((c) => c.assessmentItemId === itemId);
    const wrong = JSON.parse(item.metadata.options).find((option) => option !== item.metadata.expectedResponse);
    await page.getByRole("radio", { name: wrong, exact: true }).check();
    await page.getByRole("button", { name: /Submit answer|Envoyer la réponse/ }).click();
    await page.locator(".answerCorrection").waitFor();
    // Switching UI language retains the actual question and its correction.
    await page.getByRole("button", { name: "English / Français" }).click();
    assert.equal(await article.getAttribute("data-item"), itemId);
    await page.getByRole("note").waitFor();
    await page.getByRole("button", { name: /Try the question again|Réessayer la question/ }).click();
    await page.getByRole("radio", { name: item.metadata.expectedResponse, exact: true }).check();
    await page.getByRole("button", { name: /Submit answer|Envoyer la réponse/ }).click();
    await page.getByRole("heading", { name: /You corrected your mistake|Tu as corrigé ton erreur/ }).waitFor();
    await page.getByRole("button", { name: "English / Français" }).click();
    await page.locator(".answerCorrection .actions button").click();
    // Offline while answering a fresh question, through visible controls.
    for (let n = 0; n < 5 && !(await article.getAttribute("data-item")); n++) await article.getByRole("button", { name: continuation, exact: true }).click();
    const offlineId = await article.getAttribute("data-item"); assert(offlineId);
    const offlineItem = pilotContent.find((c) => c.assessmentItemId === offlineId);
    const before = await page.evaluate(() => document.querySelector("article").textContent);
    await context.setOffline(true);
    assert.equal(await article.textContent(), before, "delivered lesson/question remains readable offline");
    await page.getByRole("radio", { name: offlineItem.metadata.expectedResponse, exact: true }).check();
    await page.getByRole("button", { name: /Submit answer|Envoyer la réponse/ }).click();
    await page.getByRole("status").filter({ hasText: /Offline:|Hors ligne/ }).waitFor();
    const queued = await page.evaluate(() => JSON.parse(localStorage.getItem("filumire.pendingAssessmentSubmission")));
    assert.equal(queued.assessmentItemId, offlineId);
    assert(!(await getEvidence(queued.learnerId, source.id)).some((e) => e.assessmentItemId === offlineId));
    await context.setOffline(false);
    await page.getByRole("status").filter({ hasText: /synchronised|synchronisée/ }).waitFor();
    assert.equal((await getEvidence(queued.learnerId, source.id)).filter((e) => e.assessmentItemId === offlineId).length, 1);
    for (let n = 0; n < 65 && await article.getAttribute("data-complete") !== "true"; n++) {
      const id = await article.getAttribute("data-item");
      const wait = page.waitForResponse((r) => new URL(r.url()).pathname === "/api/learning" && r.request().method() === "POST");
      if (id) {
        const current = pilotContent.find((c) => c.assessmentItemId === id); assert(current);
        await page.getByRole("radio", { name: current.metadata.expectedResponse, exact: true }).check();
        await page.getByRole("button", { name: /Submit answer|Envoyer la réponse/ }).click();
      } else await article.getByRole("button", { name: continuation, exact: true }).click();
      await wait;
      await page.waitForTimeout(30);
    }
    assert.equal(await article.getAttribute("data-complete"), "true");
    await page.getByRole("button", { name: /View progress|Voir les progrès/ }).click();
    await page.getByTestId("progress").filter({ hasText: /1\/1/ }).waitFor();
    const beforeReview = await (await fetch(`${origin}/test/progress?learnerId=${queued.learnerId}`)).json();
    assert.equal(beforeReview.journey.complete, false, "practical evidence is required separately from quiz mastery");
    for (const material of ["stone", "water", "air"]) for (const property of ["texture", "appearance", "colour", "shape", "state"]) await page.getByLabel(`${material}-${property}`, { exact: true }).fill(property === "state" ? ({ stone: "solid", water: "liquid", air: "gas" }[material]) : "observed sample / not observed");
    await page.getByLabel("discussion", { exact: true }).fill("Stone keeps its shape; water takes the container shape; air spreads through available space. Examples: stone, water and balloon air.");
    await page.getByRole("button", { name: /Send for teacher review|Envoyer à l'enseignant/ }).click();
    await page.getByTestId("practical-status").filter({ hasText: /Awaiting|En attente/ }).waitFor();
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), "no horizontal overflow");
    assert.deepEqual(errors, []);
    console.log(`PASS browser ${language} ${width}px: teaching, wrong answer, correction, guided retry, language switch, offline queue/reconnect, mastery, progress, observation submission`);
    await context.close();
  }
} finally { await browser?.close(); server.closeAllConnections(); await new Promise((resolve) => server.close(resolve)); }
