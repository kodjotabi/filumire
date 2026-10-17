import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { runInNewContext } from "node:vm";
import { browserOptions, claimBrowserEvidence, createEvidenceDirectory, launchBrowser, loopbackOrigin, offlinePreloadSource, resolvePlaywright } from "../scripts/grade-navigation-support.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const temp = mkdtempSync(join(tmpdir(), "filumire-browser-runner-test-"));
writeFileSync(join(temp, "package.json"), "{}");
assert.throws(() => resolvePlaywright(temp, {}), /Playwright unavailable/);
assert.throws(() => resolvePlaywright(temp, { FILUMIRE_PLAYWRIGHT_MODULE: join(temp, "missing.mjs") }), /Invalid FILUMIRE_PLAYWRIGHT_MODULE/);
const moduleDir = join(temp, "node_modules/playwright");
mkdirSync(moduleDir, { recursive: true });
writeFileSync(join(moduleDir, "package.json"), '{"main":"index.js"}');
writeFileSync(join(moduleDir, "index.js"), "// Resolution fixture only");
assert.equal(resolvePlaywright(temp, {}), pathToFileURL(join(moduleDir, "index.js")).href);
assert.equal(resolvePlaywright(temp, { FILUMIRE_PLAYWRIGHT_MODULE: join(moduleDir, "index.js") }), resolvePlaywright(temp, {}));
assert.equal(resolvePlaywright(temp, { FILUMIRE_PLAYWRIGHT_MODULE: resolvePlaywright(temp, {}) }), resolvePlaywright(temp, {}));
assert.deepEqual(browserOptions({}), { headless: true });
assert.deepEqual(browserOptions({ FILUMIRE_BROWSER_CHANNEL: "msedge" }), { headless: true, channel: "msedge" });
assert.throws(() => browserOptions({ FILUMIRE_CHROMIUM_PATH: "missing" }), /absolute executable/);
assert.throws(() => browserOptions({ FILUMIRE_BROWSER_CHANNEL: "unknown" }), /Unsupported/);
assert.throws(() => browserOptions({ FILUMIRE_CHROMIUM_PATH: "x", FILUMIRE_BROWSER_CHANNEL: "chrome" }), /not both/);
let launches = 0;
await assert.rejects(launchBrowser({ launch: async options => { launches++; assert.deepEqual(options, { headless: true }); throw Error("missing executable"); } }, {}), /No browser download was attempted/);
assert.equal(launches, 1);

assert.equal(loopbackOrigin("http://127.0.0.1:3217"), "http://127.0.0.1:3217");
for (const value of ["https://example.com", "http://localhost:3217", "http://127.0.0.2:3217", "http://127.0.0.1:3217/path", "http://user@127.0.0.1:3217", "http://127.0.0.1:3217?remote=true"]) {
  assert.throws(() => loopbackOrigin(value), /loopback origin/);
}
const first = createEvidenceDirectory(temp);
const second = createEvidenceDirectory(temp);
assert.notEqual(first, second);
const explicit = createEvidenceDirectory(temp, join(temp, "explicit"));
writeFileSync(join(explicit, "results.json"), "prior evidence");
assert.throws(() => createEvidenceDirectory(temp, explicit), /NEW directory/);
assert.equal(readFileSync(join(explicit, "results.json"), "utf8"), "prior evidence");
assert.throws(() => claimBrowserEvidence(explicit), /Existing browser evidence/);
assert.ok(!existsSync(join(explicit, ".browser-started")));
assert.throws(() => createEvidenceDirectory(temp, join(temp, "apps/nested-output")), /outside source/);
claimBrowserEvidence(first);
assert.throws(() => claimBrowserEvidence(first), /EEXIST/);

// Execute the actual worker preload with instrumented dependencies. A regression
// must not let any query/connect or unexpected font fetch reach those dependencies.
const manifest = JSON.parse(readFileSync(join(root, "tests/fixtures/browser-fonts/manifest.json"), "utf8"));
for (const asset of manifest.assets) {
  const bytes = readFileSync(join(root, "tests/fixtures/browser-fonts", asset.file));
  assert.equal(bytes.length, asset.bytes);
  assert.equal(createHash("sha256").update(bytes).digest("hex"), asset.sha256);
}
for (const family of ["Montserrat", "Kalam"]) assert.ok(existsSync(join(root, `tests/fixtures/browser-fonts/OFL-${family}.txt`)));
const fontUrl = pathToFileURL(join(root, "tests/fixtures/browser-fonts", manifest.assets[0].file)).href;
const preload = offlinePreloadSource(root, [fontUrl]);
let originalCalls = 0;
class Pool { query() { originalCalls++; } connect() { originalCalls++; } }
class Client extends Pool {}
const font = {};
const context = { process: { env: { FILUMIRE_PERSISTENCE: "memory" } }, require: name => {
  if (name.endsWith("fetch-font-file.js")) return font;
  if (name.includes("pg")) return { Pool, Client };
  if (name === "node:fs") return { readFileSync };
  if (name === "node:url") return { fileURLToPath };
  throw Error(`Unexpected require: ${name}`);
} };
runInNewContext(preload, context);
for (const Type of [Pool, Client]) for (const method of ["query", "connect"]) assert.throws(() => new Type()[method](), /PostgreSQL access forbidden/);
assert.equal(originalCalls, 0);
await assert.rejects(font.fetchFontFile("https://fonts.example.test/download"), /unexpected font URL/);
await assert.rejects(font.fetchFontFile(pathToFileURL(join(temp, "package.json")).href), /unexpected font URL/);
assert.ok((await font.fetchFontFile(fontUrl)).length > 0);
assert.throws(() => runInNewContext(preload, { ...context, process: { env: { FILUMIRE_PERSISTENCE: "postgres" } } }), /Memory persistence required/);
console.log("PASS browser-runner resolution, dependency refusal, loopback, immutable evidence, font hashes and PostgreSQL/font isolation regressions");
