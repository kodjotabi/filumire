import assert from "node:assert/strict";
import { createServer } from "node:http";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve, join } from "node:path";
import { build } from "esbuild";
import { resolvePlaywright, launchBrowser } from "../scripts/grade-navigation-support.mjs";

assert.equal(process.env.NODE_ENV, "test");
assert.equal(process.env.FILUMIRE_PERSISTENCE, "memory");
assert.equal(process.env.FILUMIRE_BASIC7_PILOT, "test-only");
assert(!process.env.VERCEL);
process.env.FILUMIRE_AUTH_JWT_SECRET = "fictional-jhs-browser-preview-secret-at-least-32-characters";
const representative = process.env.FILUMIRE_JHS_PREVIEW === 'test-only';
const completionBatchId = process.env.FILUMIRE_JHS_BATCH;
const completion = completionBatchId ? (await import('../services/content-store/jhs-completion-batches.ts')).getJhsCompletionBatch(completionBatchId) : undefined;
if (completion) assert(representative, 'Completion batch requires the guarded JHS preview environment');
const { installMaterialsBatch } = completion
  ? { installMaterialsBatch: () => import('./fixtures/jhs-completion-batch.ts').then(m => m.installCompletionBatch(completionBatchId)) }
  : representative
  ? { installMaterialsBatch: (await import('./fixtures/jhs-representative-preview.ts')).installRepresentativePreview }
  : await import("./fixtures/jhs-materials-batch.ts");
const { MATERIALS_SOURCES, MATERIALS_BATCH_CONTENT } = completion
  ? { MATERIALS_SOURCES: completion.sources, MATERIALS_BATCH_CONTENT: completion.content }
  : representative
  ? (({ JHS_PREVIEW_SOURCES, JHS_REPRESENTATIVE_CONTENT }) => ({ MATERIALS_SOURCES: JHS_PREVIEW_SOURCES, MATERIALS_BATCH_CONTENT: JHS_REPRESENTATIVE_CONTENT }))(await import('../services/content-store/jhs-representative-preview.ts'))
  : await import("../services/content-store/ghana-b7-science-materials-batch.ts");
const { GET, POST } = await import("../apps/learner/app/api/learning/route.ts");
const { persistenceStore } = await import("../services/persistence-provider.ts");
const { createPrincipalLearnerAccess } = await import("../services/principal/index.ts");
const { issueSessionForPrincipal } = await import("../services/identity/index.ts");
const { createSession } = await import("../services/session/index.ts");
const { saveLearnerLearningContext } = await import("../services/learner-context/index.ts");
const { getEvidence } = await import("../services/evidence-store/index.ts");
const { getLearnerState } = await import("../services/learner-state/index.ts");
const { getCompetency } = await import('../packages/curriculum/index.ts');
const { jhsValidationFingerprint } = await import('../services/content-store/jhs-validation-fingerprint.ts');
await installMaterialsBatch();
const output = completion ? `docs/jhs-development/completion/${completion.id}/browser` : representative ? 'docs/jhs-development/representative-browser' : "docs/jhs-development/browser";
await mkdir(output, { recursive: true });
const bundle = await build({ entryPoints: ["tests/fixtures/jhs-materials-app.tsx"], bundle: true, write: false, platform: "browser", format: "esm", jsx: "automatic", define: { "process.env.NODE_ENV": '"production"' } });
const learners = new Map();
const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    let raw = ""; for await (const chunk of req) { raw += chunk; if (raw.length > 50000) throw Error("oversized test request"); }
    const json = value => { res.setHeader("content-type", "application/json"); res.end(JSON.stringify(value)); };
    if (url.pathname === "/") { res.setHeader("content-type", "text/html; charset=utf-8"); res.end('<!doctype html><meta name="viewport" content="width=device-width, initial-scale=1"><div id="root"></div><script type="module" src="/batch.js"></script>'); }
    else if (url.pathname === "/batch.js") { res.setHeader("content-type", "text/javascript"); res.end(bundle.outputFiles[0].text); }
    else if (url.pathname === "/test/new") {
      const source = MATERIALS_SOURCES[Number(url.searchParams.get("topic") ?? 0)]; assert(source);
      const learnerId = `learner-jhs-browser-${crypto.randomUUID()}`, principalId = `self-${learnerId}`;
      await persistenceStore.ensureLearnerExists(learnerId); await persistenceStore.createPrincipal(principalId);
      await createPrincipalLearnerAccess(`access-${learnerId}`, principalId, learnerId, "self");
      const session = await issueSessionForPrincipal(principalId, learnerId); await createSession(session.sessionId, learnerId);
      await saveLearnerLearningContext({ learnerId, curriculumVersionId: source.curriculumVersionId, gradeId: source.gradeId, activeSubjectId: source.subjectId, activeCompetencyId: source.id, updatedAt: new Date().toISOString() });
      learners.set(learnerId, source.id);
      res.setHeader("set-cookie", `filumire_auth_session=${session.token}; HttpOnly; SameSite=Strict; Path=/`);
      json({ learnerId, sessionId: session.sessionId, competencyId: source.id, subjectId: source.subjectId, gradeLabel: source.gradeId.match(/basic-(\d)/)[1], subjectLabel: source.subjectId.match(/basic\d-(.+)-ccp/)[1], topics: MATERIALS_SOURCES.map(s => ({ id: s.id, title: { en: s.title, fr: MATERIALS_BATCH_CONTENT.find(c => c.competencyId === s.id && c.language === "fr" && c.type === "lesson").title } })) });
    } else if (url.pathname === "/test/progress") {
      const learnerId = url.searchParams.get("learnerId"), competencyId = learners.get(learnerId); assert(competencyId);
      const evidence = await getEvidence(learnerId, competencyId);
      json({ evidenceCount: evidence.length, evidence, state: (await getLearnerState(learnerId, competencyId))?.competencies });
    } else if (url.pathname === "/api/learning") {
      const request = new Request(url, { method: req.method, headers: req.headers, ...(raw ? { body: raw } : {}) });
      const reply = await (req.method === "POST" ? POST(request) : GET(request));
      res.writeHead(reply.status, Object.fromEntries(reply.headers)); res.end(await reply.text());
    } else { res.statusCode = 404; res.end(); }
  } catch (error) { res.statusCode = 500; res.end(JSON.stringify({ error: String(error) })); }
});
const previewPort = process.env.FILUMIRE_PREVIEW_SERVE === 'loopback-only' ? Number(process.env.FILUMIRE_PREVIEW_PORT ?? 3281) : 0;
assert(Number.isInteger(previewPort) && previewPort >= 0 && previewPort <= 65535, 'Invalid local preview port');
await new Promise((resolve, reject) => { server.once('error', reject); server.listen(previewPort, "127.0.0.1", resolve); });
const origin = `http://127.0.0.1:${server.address().port}`;
if (process.env.FILUMIRE_PREVIEW_SERVE === 'loopback-only') {
  assert(representative, 'Persistent preview requires the representative scope');
  const routes = MATERIALS_SOURCES.map((s, i) => ({ competencyId: s.id, gradeId: s.gradeId, subjectId: s.subjectId, english: `${origin}/?topic=${i}&lang=en`, french: `${origin}/?topic=${i}&lang=fr` }));
  await writeFile('docs/jhs-development/preview-live-routes.json', JSON.stringify({ origin, fictionalLearners: true, persistence: 'memory', routes }, null, 2));
  console.log(`Fictional, unpublished loopback preview: ${origin}`);
  console.log('Routes: docs/jhs-development/preview-live-routes.json. Ctrl+C stops this process; all fictional memory state is lost.');
  await new Promise(resolve => { process.once('SIGINT', resolve); process.once('SIGTERM', resolve); });
  server.closeAllConnections(); await new Promise(resolve => server.close(resolve));
  process.exit(0);
}
const { chromium } = await import(resolvePlaywright(resolve(".")));
const browser = await launchBrowser(chromium), results = [];
try {
  for (const width of [390, 1280]) for (const language of ["en", "fr"]) for (const [i, source] of MATERIALS_SOURCES.entries()) {
    const context = await browser.newContext({ viewport: { width, height: 900 } });
    const page = await context.newPage(), errors = [];
    page.setDefaultTimeout(15000);
    page.on("pageerror", error => errors.push(error.message));
    const result = { competencyId: source.id, gradeId: source.gradeId, subjectId: source.subjectId, contentFingerprint: jhsValidationFingerprint(getCompetency(source.id), MATERIALS_BATCH_CONTENT), code: source.officialCode, width, language };
    results.push(result);
    try {
      const newIdentity = page.waitForResponse(r => new URL(r.url()).pathname === "/test/new");
      await page.goto(`${origin}/?topic=${i}&lang=${language}`);
      let identity = await (await newIdentity).json();
      await page.getByRole("heading", { level: 2 }).waitFor();
      assert.equal(await page.locator("nav a").count(), MATERIALS_SOURCES.length);
      const selected = page.waitForResponse(r => new URL(r.url()).pathname === "/test/new");
      await page.locator("nav a").nth(i).click();
      identity = await (await selected).json();
      assert.equal(identity.competencyId, source.id);
      await page.getByRole("heading", { level: 2 }).waitFor();
      const response = () => page.waitForResponse(r => new URL(r.url()).pathname === "/api/learning" && r.request().method() === "POST");
      const continuation = language === "en" ? "Continue" : "Continuer";
      for (let n = 0; n < 2; n++) { const reply = response(); await page.getByRole("button", { name: continuation, exact: true }).click(); const body = await (await reply).json(); assert.equal(body.content.competencyId, source.id); }
      await page.locator('input[name="answer"]').first().waitFor();
      const prompt = await page.getByTestId("body").innerText();
      const practice = MATERIALS_BATCH_CONTENT.find(c => c.competencyId === source.id && c.language === language && c.type === "practice");
      const options = await page.locator('input[name="answer"]').evaluateAll(inputs => inputs.map(input => input.value));
      const expected = practice.metadata.expectedResponse;
      assert(options.includes(expected), "match actual shuffled display values");
      await page.locator('input[name="answer"]').nth(options.findIndex(o => o !== expected)).check();
      await context.setOffline(true);
      await page.getByRole("button", { name: language === "en" ? "Submit answer" : "Envoyer la réponse", exact: true }).click();
      await page.getByRole("status").filter({ hasText: /Offline|Hors ligne/ }).waitFor();
      await page.getByRole("button", { name: language === "en" ? "Français" : "English", exact: true }).click();
      assert.equal(await page.getByTestId("body").innerText(), prompt);
      const synced = response(); await context.setOffline(false); await page.evaluate(() => window.dispatchEvent(new Event("online")));
      const wrong = await (await synced).json();
      assert.equal(wrong.assessment.result.correct, false);
      assert.equal(wrong.correction.assessmentItemId, practice.assessmentItemId);
      await page.getByRole("button", { name: /Try the question again|Réessayer la question/, exact: true }).click();
      await page.locator('input[name="answer"]').nth(options.indexOf(expected)).check();
      const retried = response(); await page.getByRole("button", { name: /Submit answer|Envoyer la réponse/, exact: true }).click();
      const retry = await (await retried).json(); assert.equal(retry.assessment.evidence.independence, "guided"); assert.equal(retry.correction.assessmentItemId, practice.assessmentItemId);
      await page.locator(".answerCorrection button.primary").click();
      await page.getByRole("textbox", { name: "Independent work" }).waitFor();
      const before = await (await context.request.get(`${origin}/test/progress?learnerId=${identity.learnerId}`)).json();
      assert.equal(before.evidence.filter(e => e.outcome === "correct" && e.independence === "independent").length, 0);
      await page.getByRole("textbox", { name: "Independent work" }).fill("FICTIONAL BROWSER FIXTURE: incomplete work; no real observation, model or educator approval is claimed.");
      const pending = response(); await page.getByRole("button", { name: /Send for teacher review|Envoyer à l'enseignant/, exact: true }).click();
      assert.equal((await (await pending).json()).pendingTeacherReview.status, "pending");
      const after = await (await context.request.get(`${origin}/test/progress?learnerId=${identity.learnerId}`)).json(); assert.deepEqual(after, before);
      await page.getByRole("button", { name: /View progress|Voir les progrès/, exact: true }).click(); await page.getByTestId("progress").waitFor();
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)); assert.deepEqual(errors, []);
      await page.screenshot({ path: join(output, `materials-${i}-${language}-${width}.png`), fullPage: true });
      result.status = "PASS"; console.log(`PASS ${source.id} ${language} ${width}px`);
    } catch (error) { result.status = "FAIL"; result.error = String(error); console.error(`FAIL ${source.officialCode} ${language} ${width}px: ${error.message}`); }
    finally { await context.close(); }
    await writeFile(join(output, "results.json"), JSON.stringify(results, null, 2));
  }
} finally { await browser.close(); server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
assert.equal(results.length, MATERIALS_SOURCES.length * 4); assert.equal(results.filter(r => r.status !== "PASS").length, 0);
