// Local memory-only server required; creates and removes fictional fixtures only.
import assert from "node:assert/strict";
import { resolve } from "node:path";
import { resolvePlaywright, launchBrowser, loopbackOrigin } from "../scripts/grade-navigation-support.mjs";

assert.equal(process.env.FILUMIRE_PERSISTENCE, "memory");
const origin = loopbackOrigin(process.env.FILUMIRE_TEST_URL);
const { chromium } = await import(resolvePlaywright(resolve(".")));
const run = crypto.randomUUID().slice(0, 8);
const password = "Fictional-removal-browser-password";
const browser = await launchBrowser(chromium);
try {
  const context = await browser.newContext({ viewport: { width: 390, height: 900 }, serviceWorkers: "block" });
  const registered = await context.request.post(`${origin}/api/account/register`, { data: {
    email: `remove.${run}@example.test`, displayName: "Fictional guardian", password,
    confirmsGuardian: true, acceptsNotice: true, preferredLanguage: "en",
  } });
  assert.equal(registered.status(), 201, await registered.text());
  for (const language of ["en", "fr"]) {
    const added = await context.request.post(`${origin}/api/account/learners`, { data: {
      displayName: `Fictional ${language}`, username: `remove.${run}.${language}`, password,
      preferredLanguage: language, consentsToLearnerData: true,
    } });
    assert.equal(added.status(), 201, await added.text());
  }
  const page = await context.newPage();
  page.setDefaultTimeout(30000);
  page.setDefaultNavigationTimeout(120000);
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  for (const language of ["en", "fr"]) {
    await page.goto(`${origin}/family?lang=${language}`);
    const card = page.locator("li.fmLearner").filter({ has: page.getByRole("heading", { name: `Fictional ${language}`, exact: true }) });
    const label = language === "en" ? "Remove Learner" : "Retirer l’apprenant";
    const cancel = language === "en" ? "Cancel" : "Annuler";
    let deletes = 0;
    const listener = request => { if (request.method() === "DELETE") deletes++; };
    page.on("request", listener);
    await card.getByRole("button", { name: label, exact: true }).click();
    const confirmation = card.getByRole("form", { name: `${label}: Fictional ${language}` });
    assert.equal(await confirmation.getByRole("button", { name: label, exact: true }).isDisabled(), true);
    await confirmation.getByRole("button", { name: cancel, exact: true }).click();
    assert.equal(deletes, 0, "cancel sends no deletion request");
    await card.getByRole("button", { name: label, exact: true }).click();
    await confirmation.getByRole("checkbox").check();
    let fail = true;
    await page.route("**/api/account/learners/*", route => {
      if (route.request().method() === "DELETE" && fail) {
        fail = false;
        return route.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({ code: "server_error" }) });
      }
      return route.continue();
    });
    await confirmation.getByRole("button", { name: label, exact: true }).click();
    await card.getByRole("status").filter({ hasText: language === "en" ? "Something went wrong" : "Une erreur" }).waitFor();
    assert.equal(await card.count(), 1, "failed request keeps learner visible");
    const response = page.waitForResponse(r => r.request().method() === "DELETE" && r.status() === 200);
    await confirmation.getByRole("button", { name: label, exact: true }).click();
    await response;
    await card.waitFor({ state: "detached" });
    await page.reload();
    await page.getByRole("heading", { name: language === "en" ? "Your learners" : "Tes apprenants", exact: true }).waitFor();
    assert.equal(await card.count(), 0, "removed learner stays absent after refresh");
    page.off("request", listener);
    await page.unroute("**/api/account/learners/*");
  }
  assert.deepEqual(errors, []);
  console.log("PASS learner removal browser: English/French confirmation, cancel, failure/retry, removal and refresh (390px)");
} finally {
  await browser.close();
}
