import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { askFiluHref, navItemForView, setupRedirect, setupDestination } from "../apps/learner/services/dashboard-navigation";
import { destinationFor, type Account } from "../apps/learner/services/account-client";

Object.assign(globalThis, { React });
const { LearnerHeader } = await import("../apps/learner/components/filumire/LearnerHeader");
const { LearnerBottomNav } = await import("../apps/learner/components/filumire/LearnerBottomNav");
const learner: Account = {
  principalId: "fixture-principal", accountKind: "learner", preferredLanguage: "en",
  activeLearnerId: "fixture-learner", learners: [{ learnerId: "fixture-learner",
    displayName: "Fictional learner", preferredLanguage: "en", onboardingComplete: false }],
};

for (const language of ["en", "fr"] as const) {
  assert.equal(destinationFor(learner, language, "family"), `/dashboard?lang=${language}&view=setup`);
  const props = { language, setupHeader: true, backHref: "/dashboard", subjectId: "science & computing" };
  const firstTime = renderToStaticMarkup(React.createElement(LearnerHeader, { ...props, onboarding: true }));
  assert.doesNotMatch(firstTime, /class="filumireBack"|class="filumireSetupAvatar"/);
  assert.doesNotMatch(firstTime, /<a[^>]*class="filumireHeaderLogo/);
  assert.match(firstTime, /<span class="filumireHeaderLogo filumireSetupLogo"/);
  assert.match(firstTime, /filumirePublicHome/);
  assert.match(firstTime, /filumireSetupAskFilu/);
  const ask = askFiluHref(language, props.subjectId);
  const redirected = setupRedirect(ask.split("?")[1], language)!;
  assert.equal(setupDestination(redirected.split("?")[1], language), ask);
  assert.equal(setupRedirect(redirected.split("?")[1], language), null);

  const returning = renderToStaticMarkup(React.createElement(LearnerHeader, { ...props, onboarding: false }));
  assert.match(returning, /class="filumireBack"/);
  assert.match(returning, /class="filumireSetupAvatar"/);
  assert.match(returning, /<a[^>]*class="filumireHeaderLogo/);
  const completed = structuredClone(learner);
  completed.learners[0].onboardingComplete = true;
  assert.equal(destinationFor(completed, language), `/dashboard?lang=${language}`);

  for (const view of ["profile", "setup"] as const) {
    assert.equal(navItemForView(view), null);
    const nav = renderToStaticMarkup(React.createElement(LearnerBottomNav, { language, active: navItemForView(view) }));
    assert.doesNotMatch(nav, /aria-current="page"|filumireNavItemActive/);
  }
  for (const view of ["home", "learning", "progress", "challenges", "ask-filu"] as const) {
    const nav = renderToStaticMarkup(React.createElement(LearnerBottomNav, { language, active: navItemForView(view) }));
    assert.equal((nav.match(/aria-current="page"/g) ?? []).length, 1);
  }
}
// Dashboard composition contracts complement component rendering; these are not browser layout checks.
const dashboard = readFileSync(new URL("../apps/learner/app/dashboard/page.tsx", import.meta.url), "utf8");
assert.match(dashboard, /const view = activeLearner\(account\)\?\.onboardingComplete === false \? "setup" : requestedView/);
assert.match(dashboard, /onboarding=\{onboarding\}/);
assert.match(dashboard, /\{!onboarding && <LearnerBottomNav/);
assert.match(dashboard, /<LearnerSignOut language=\{language\}/);
console.log("PASS: EN/FR first-time and returning setup, preserved assistant destination, profile/setup without false highlights, dashboard navigation composition");
