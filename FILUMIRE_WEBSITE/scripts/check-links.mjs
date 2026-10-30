import assert from "node:assert/strict";
const base = new URL(process.argv[2] || "http://127.0.0.1:3147");
const english = ["/", "/how-it-works", "/subjects", "/learners", "/parents", "/schools", "/about", "/contact", "/privacy", "/ghana", "/cote-divoire", "/nigeria"];
const routes = english.flatMap(path => [path, path === "/" ? "/fr" : "/fr" + path]);
const decode = value => value.replaceAll("&amp;", "&").replaceAll("&#x27;", "'").replaceAll("&quot;", '"');
const pages = new Map();
const links = new Set();
const images = new Set();
const assets = new Set();
async function page(path) {
  if (pages.has(path)) return pages.get(path);
  const response = await fetch(new URL(path, base), { signal: AbortSignal.timeout(30000), redirect: "manual" });
  assert.equal(response.status, 200, path + " should return 200");
  const html = await response.text();
  assert.match(html, /<main[^>]*id="main-content"/, path + " needs a main landmark");
  assert.match(html, /<h1\b/, path + " needs a page heading");
  const french = /^\/fr(?:\/|$)/.test(path);
  assert.ok(html.includes('<html lang="' + (french ? "fr" : "en") + '"'), path + " needs correct document language");
  assert.match(html, /<title>[^<]+FILUMIRE<\/title>/, path + " needs page metadata");
  assert.match(html, /rel="canonical"/, path + " needs canonical metadata");
  assert.match(html, /rel="alternate" hrefLang="en"/, path + " needs English alternate");
  assert.match(html, /rel="alternate" hrefLang="fr"/, path + " needs French alternate");
  if (french) {
    const visible = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, "");
    for (const anchor of visible.matchAll(/<a\b([^>]*?)href="([^"]+)"([^>]*)>/g)) {
      const href = decode(anchor[2]);
      if (href.startsWith("/") && !href.startsWith("//") && !href.startsWith("/curriculum-sources/") && !/data-language-switch/.test(anchor[1] + anchor[3])) assert.ok(/^\/fr(?:[/?#]|$)/.test(href), path + " leaked English link " + href);
    }
    assert.doesNotMatch(visible, /French Overview|For Families|Full name|Review email draft|Recipient awaiting verification/);
  }
  assert.doesNotMatch(html, /&amp;check;|&check;/);
  pages.set(path, html);
  return html;
}
for (const path of routes) {
  const html = await page(path);
  for (const match of html.matchAll(/<a\b[^>]*\bhref="([^"]*)"[^>]*>/g)) links.add(decode(match[1]));
  for (const match of html.matchAll(/(?:src|href)="([^" ]+\.(?:js|css|woff2))(?:\?[^" ]*)?"/g)) assets.add(decode(match[1]));
  for (const match of html.matchAll(/<img\b[^>]*\bsrc="([^"]+)"/g)) images.add(decode(match[1]));
  // The landing page (/ and /fr) has its own header, Choose Your Country and landscape band;
  // every other page shares the site header (navigation and menu control) and footer. Both carry EN/FR.
  if (path === "/" || path === "/fr") {
    assert.match(html, /aria-controls="landing-menu"/);
    assert.match(html, /aria-controls="choose-country"/);
    assert.match(html, /class="intl-landscape"/);
  } else {
    assert.match(html, /aria-controls="primary-navigation"/);
    assert.match(html, /id="primary-navigation"/);
    assert.match(html, /class="fs-footer"/);
  }
  assert.match(html, /data-language-switch="true"/);
  assert.doesNotMatch(html, /app\.filumire\.example\.com|Your inquiry has been received|Endpoint status: Connected|FranÃ§ais|â€¢|Â©/);
}
let internal = 0;
let email = 0;
let external = 0;
for (const href of links) {
  assert.ok(href && href !== "#", "No empty or placeholder link");
  if (href.startsWith("mailto:")) { assert.match(href, /^mailto:[^\s@]+@[^\s@]+\.[^\s@]+/); email++; continue; }
  const destination = new URL(href, base);
  if (destination.origin !== base.origin) { assert.equal(destination.protocol, "https:"); assert.doesNotMatch(destination.hostname, /example\.(com|org|net)$/); external++; continue; }
  if(destination.pathname.startsWith('/curriculum-sources/')){const pdf=await fetch(destination,{signal:AbortSignal.timeout(30000)});assert.equal(pdf.status,200);assert.ok(pdf.headers.get('content-type')?.includes('application/pdf'));if(destination.hash)assert.match(destination.hash,/^#page=\d+$/);await pdf.arrayBuffer();internal++;continue;}
  const html = await page(destination.pathname + destination.search);
  if (destination.hash) {
    const id = decodeURIComponent(destination.hash.slice(1));
    assert.ok(html.includes('id="' + id + '"'), href + " needs its target section");
  }
  internal++;
}
for (const src of images) {
  assert.ok(src.startsWith("/"), "Website images should be local");
  const response = await fetch(new URL(src, base), { signal: AbortSignal.timeout(30000) });
  assert.equal(response.status, 200, src + " should load");
  assert.ok(response.headers.get("content-type")?.startsWith("image/"), src + " should be an image");
  await response.arrayBuffer();
}
for (const src of assets) {
 const url=new URL(src,base);
 assert.equal(url.origin,base.origin);
 const response=await fetch(url,{signal:AbortSignal.timeout(10000)});
 assert.equal(response.status,200,src+" should load");
 if(src.endsWith(".css")){const css=await response.text();for(const match of css.matchAll(/url\(([^)]+\.woff2)\)/g)){const fontUrl=new URL(match[1].replaceAll('"',''),url);const font=await fetch(fontUrl,{signal:AbortSignal.timeout(10000)});assert.equal(font.status,200,fontUrl+" should load");await font.arrayBuffer();}}else await response.arrayBuffer();
}
const categories = ["general", "learner-access", "family", "teacher", "school-pilot", "curriculum", "partnership", "unknown"];
for (const prefix of ["", "/fr"]) for (const category of categories) {
  const html = await page(prefix + "/contact?inquiry=" + category);
  const visible = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, "");
  assert.equal([...visible.matchAll(/<form\b/g)].length, 1, "One contact form");
  assert.ok(visible.includes('href="/contact?inquiry=' + category + '"'), "English switch keeps legacy inquiry URL");
  assert.ok(visible.includes('href="/fr/contact?inquiry=' + category + '"'), "French switch keeps legacy inquiry URL");
  for (const id of ["name", "email", "message"]) {
    assert.ok(visible.includes('for="inquiry-' + id + '"'), "Label for " + id);
    assert.ok(visible.includes('id="inquiry-' + id + '"'), "Control for " + id);
  }
  for (const id of ["category", "subject", "organization", "phone", "country"])
    assert.ok(!visible.includes('id="inquiry-' + id + '"'), "Removed control " + id);
  assert.doesNotMatch(visible, /contact-details-card|email-contact-actions|webmail-options|href="mailto:|<select\b/);
  assert.ok(visible.includes('id="inquiry-form"'), "Existing form anchor retained");
  for (const label of prefix ? ["Votre nom", "Votre adresse e-mail", "Votre message", "Envoyer le message"] : ["Your name", "Your email address", "Your message", "Send Message"])
    assert.ok(visible.includes(label), "Localized form label: " + label);
}

for (const prefix of ["", "/fr"]) {
 const missing = await fetch(new URL(prefix + "/a-page-that-does-not-exist",base));
 assert.equal(missing.status,404);
 const html = await missing.text();
 assert.ok(html.includes(prefix ? "Revenir à l’accueil" : "Return home"));
 assert.ok(html.includes('<html lang="'+(prefix?"fr":"en")+'"'));
}
// Retired pages redirect (query kept) and pricing stays hidden until payments are live.
for (const [from, to] of [["/for-families", "/parents"], ["/for-schools", "/schools"], ["/curriculum", "/subjects"], ["/access", "/contact"], ["/partners", "/about#work-with-us"], ["/for-schools?inquiry=teacher", "/schools?inquiry=teacher"]]) for (const prefix of ["", "/fr"]) {
  const response = await fetch(new URL(prefix + from, base), { redirect: "manual" });
  assert.equal(response.status, 307, prefix + from + " redirects");
  assert.equal(new URL(response.headers.get("location"), base).href, new URL(prefix + to, base).href, prefix + from + " goes to " + prefix + to);
}
// While payments are off, the learner app's pricing links (/pricing, /fr/pricing, possibly with ?lang) reach family support.
for (const [from, to] of [["/pricing", "/contact?inquiry=family"], ["/pricing?lang=en", "/contact?lang=en&inquiry=family"]]) for (const prefix of ["", "/fr"]) {
  const response = await fetch(new URL(prefix + from, base), { redirect: "manual" });
  assert.equal(response.status, 307, prefix + from + " redirects while payments are off");
  assert.equal(new URL(response.headers.get("location"), base).href, new URL(prefix + to, base).href, prefix + from + " goes to " + prefix + to);
}
const sitemap = await fetch(new URL("/sitemap.xml",base));
assert.equal(sitemap.status,200);
const xml=await sitemap.text();
for (const route of routes) assert.ok(xml.includes(new URL(route,base).href), "Sitemap includes " + route);
console.log(JSON.stringify({ pagesChecked: pages.size, uniqueLinks: links.size, internalLinks: internal, emailLinks: email, externalLinks: external, localImages: images.size, generatedAssets: assets.size, categoriesChecked: categories.length * 2, notFoundRecovery: "passed" }, null, 2));
