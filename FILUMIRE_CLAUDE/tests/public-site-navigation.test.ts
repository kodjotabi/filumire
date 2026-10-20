import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { PublicHomeLink, publicSiteHref, publicSiteOrigin } from "../apps/learner/components/filumire/PublicHomeLink";
Object.assign(globalThis, { React });

// Learner → website links follow the configured website origin and open in the same tab.
delete process.env.NEXT_PUBLIC_FILUMIRE_PUBLIC_SITE_URL;
assert.equal(publicSiteOrigin(), "https://filumire.com");
assert.equal(publicSiteHref("/", "en"), "https://filumire.com/");
assert.equal(publicSiteHref("/", "fr"), "https://filumire.com/fr");
assert.equal(publicSiteHref("/contact", "fr"), "https://filumire.com/fr/contact");

process.env.NEXT_PUBLIC_FILUMIRE_PUBLIC_SITE_URL = "https://website-preview.fictional.example/some/path?x=1";
assert.equal(publicSiteHref("/pricing", "en"), "https://website-preview.fictional.example/pricing");
process.env.NEXT_PUBLIC_FILUMIRE_PUBLIC_SITE_URL = "http://localhost:3200";
assert.equal(publicSiteHref("/", "en"), "http://localhost:3200/");
for (const unsafe of ["http://website.fictional.example", "https://user:pass@website.fictional.example", "javascript:alert(1)", "not a url"]) {
  process.env.NEXT_PUBLIC_FILUMIRE_PUBLIC_SITE_URL = unsafe;
  assert.equal(publicSiteOrigin(), "https://filumire.com", unsafe);
}
delete process.env.NEXT_PUBLIC_FILUMIRE_PUBLIC_SITE_URL;
for (const language of ["en", "fr"] as const) {
  const html = renderToStaticMarkup(React.createElement(PublicHomeLink, { language }));
  assert(!html.includes("target="), "the website link replaces the learner page in the same tab");
  assert(html.includes(`href="${publicSiteHref("/", language)}"`));
}
console.log("PASS: learner → website links use the configured origin, reject unsafe origins and open in the same tab");
