import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { askFiluHref, dashboardView, navItemForView, setupDestination, setupRedirect } from "../apps/learner/services/dashboard-navigation";

Object.assign(globalThis, { React });
const { LearnerHeader } = await import("../apps/learner/components/filumire/LearnerHeader");
const { LearnerBottomNav } = await import("../apps/learner/components/filumire/LearnerBottomNav");
const { AskFiluPage } = await import("../apps/learner/components/filumire/AskFiluPage");

for (const language of ["en", "fr"] as const) {
  const subjectId = "fixture-science & computing";
  for (const origin of ["", "view=setup", "view=learning", "view=learning&subjectId=fixture-math"]) {
    const href = askFiluHref(language, subjectId);
    const target = new URL(href, "http://fixture.local");
    assert.equal(dashboardView(target.search), "ask-filu", `Ask FILU from ${origin || "Home"}`);
    assert.equal(target.searchParams.get("subjectId"), subjectId);
    assert.equal(target.searchParams.get("lang"), language);
    assert.equal(navItemForView(dashboardView(target.search)), "filu");
    const setup = setupRedirect(target.search, language);
    assert(setup);
    assert.equal(dashboardView(setup.split("?")[1]), "setup");
    assert.equal(setupDestination(setup.split("?")[1], language), href, "required setup must retain the assistant destination");
    assert.equal(setupRedirect(setup.split("?")[1], language), null, "setup must not redirect to itself");
  }
  for (const setupHeader of [true, false]) {
    const html = renderToStaticMarkup(React.createElement(LearnerHeader, { language, setupHeader, subjectId }));
    const link = html.match(/<a\b[^>]*class="filumire(?:Setup)?AskFilu"[^>]*>/)?.[0];
    const href = link?.match(/href="([^"]+)"/)?.[1]?.replaceAll("&amp;", "&");
    assert.equal(href, askFiluHref(language, subjectId), "top bar must use the same assistant destination");
  }
  for (const variant of ["app", "inline"] as const) {
    const html = renderToStaticMarkup(React.createElement(LearnerBottomNav, { language, active: "filu", subjectId, variant }));
    assert.equal((html.match(/aria-current="page"/g) ?? []).length, 1);
    const current = html.match(/<a\b[^>]*class="filumireNavItem filumireNavItemActive"[^>]*>/)?.[0];
    assert.equal(current?.match(/href="([^"]+)"/)?.[1].replaceAll("&amp;", "&"), askFiluHref(language, subjectId), "FILU alone is active in both navigation variants");
    for (const view of ["learning", "progress", "challenges"]) {
      const href = [...html.matchAll(/href="([^"]+)"/g)].map(match => match[1].replaceAll("&amp;", "&")).find(href => new URL(href, "http://fixture.local").searchParams.get("view") === view);
      assert(href);
      assert.equal(new URL(href, "http://fixture.local").searchParams.get("subjectId"), subjectId, "navigation preserves the selected subject, including reserved characters");
    }
  }
  const assistant = renderToStaticMarkup(React.createElement(AskFiluPage, {
    language, subjectName: "Mathematics", topic: "Fictional topic", done: 0, total: 1, elements: [],
  }));
  assert.match(assistant, language === "fr" ? /Parle à FILU/ : /Ask FILU/);
  assert.match(assistant, /id="filu-question"/, "use the existing assistant interface");
  assert.match(assistant, /disabled=""/, "a missing trusted learner context cannot enable conversation");
  assert.equal(setupDestination("returnTo=https://outside.invalid", language), `/dashboard?lang=${language}`);
  assert.equal(setupDestination("returnTo=/learn", language), `/dashboard?lang=${language}`);
}
assert.equal(dashboardView("view=unknown"), "home");
assert.equal(dashboardView("view=learning&subjectId=fixture-math"), "learning");
console.log("PASS: Ask FILU destinations, subject/language preservation, setup return, safe return targets and exclusive navigation active state (EN/FR)");
