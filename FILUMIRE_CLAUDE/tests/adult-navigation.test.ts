import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { destinationFor, type Account, type AccountKind } from "../apps/learner/services/account-client";

Object.assign(globalThis, { React });
const { AdultHeader, AdultRoleSwitch, adultRole } = await import("../apps/learner/components/filumire/AdultRoleSwitch");
const account = (accountKind: AccountKind): Account => ({
  principalId: "fixture-adult", accountKind, preferredLanguage: "en", learners: [], activeLearnerId: null,
});
const hrefs = (html: string) => [...html.matchAll(/<a\b[^>]*\shref="([^"]+)"/g)].map(m => m[1].replaceAll("&amp;", "&"));
assert.equal(adultRole(undefined), undefined);
assert.equal(adultRole(null), "none");
assert.equal(adultRole(account("learner")), "none");
assert.equal(adultRole(account("external")), "none");

for (const language of ["en", "fr"] as const) {
  for (const active of ["parent", "teacher"] as const) {
    for (const kind of ["guardian", "teacher"] as const) {
      const role = adultRole(account(kind));
      assert.equal(role, kind);
      const nav = renderToStaticMarkup(React.createElement(AdultRoleSwitch, { role, active, language }));
      assert.deepEqual(hrefs(nav), (kind === "guardian" ? ["/family", "/adult"] : ["/teacher"]).map(p => `${p}?lang=${language}`));
      assert.equal((nav.match(/aria-current="page"/g) ?? []).length,
        (kind === "guardian" && active === "parent") || (kind === "teacher" && active === "teacher") ? 1 : 0);
      const header = renderToStaticMarkup(React.createElement(AdultHeader, { role, active, language, onLanguage: () => {} }));
      assert.equal(hrefs(header)[0], `${kind === "guardian" ? "/family" : "/teacher"}?lang=${language}`);
      assert.match(header, /class="filumireAdultSignOut"/);
      assert.match(header, language === "en" ? /Sign out/ : /Se déconnecter/);
    }
    for (const role of [undefined, "none"] as const) {
      assert.equal(renderToStaticMarkup(React.createElement(AdultRoleSwitch, { role, active, language })), "");
      const header = renderToStaticMarkup(React.createElement(AdultHeader, { role, active, language, onLanguage: () => {} }));
      assert.doesNotMatch(header, /filumireAdultSignOut/);
      if (role === "none") assert.equal(hrefs(header)[0], `/?lang=${language}`);
    }
  }
  for (const requested of [undefined, "family", "https://outside.invalid", "/teacher"]) {
    assert.equal(destinationFor(account("guardian"), language, requested), `/family?lang=${language}`);
    assert.equal(destinationFor(account("teacher"), language, requested), `/teacher?lang=${language}`);
  }
  const guardianWithLearner = { ...account("guardian"), activeLearnerId: "fixture-learner" };
  assert.equal(destinationFor(guardianWithLearner, language, "family"), `/family?lang=${language}`);
}
console.log("PASS: EN/FR guardian/teacher tabs, role-based home links, loading/signed-out/learner navigation exclusion, sign-out visibility and safe sign-in destinations");
