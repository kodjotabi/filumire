import { existsSync, mkdirSync, mkdtempSync, readdirSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export function resolvePlaywright(root, env = process.env) {
  try {
    if (env.FILUMIRE_PLAYWRIGHT_MODULE) {
      const value = env.FILUMIRE_PLAYWRIGHT_MODULE;
      const path = value.startsWith("file:") ? fileURLToPath(value) : resolve(value);
      if (!existsSync(path)) throw Error("Module does not exist");
      return pathToFileURL(path).href;
    }
    const require = createRequire(join(root, "package.json"));
    for (const name of ["playwright", "@playwright/test", "playwright-core"]) {
      try { return pathToFileURL(require.resolve(name)).href; } catch {}
    }
  } catch (error) {
    throw new Error("Invalid FILUMIRE_PLAYWRIGHT_MODULE: supply an existing local module file.", { cause: error });
  }
  throw Error("Playwright unavailable. Use an already-installed playwright, @playwright/test or playwright-core package (Node resolution/NODE_PATH), or set FILUMIRE_PLAYWRIGHT_MODULE to its local entry file. Nothing was installed.");
}

export function browserOptions(env = process.env) {
  const options = { headless: true };
  if (env.FILUMIRE_CHROMIUM_PATH && env.FILUMIRE_BROWSER_CHANNEL) throw Error("Choose a Chromium executable OR browser channel, not both.");
  if (env.FILUMIRE_CHROMIUM_PATH) {
    if (!isAbsolute(env.FILUMIRE_CHROMIUM_PATH) || !existsSync(env.FILUMIRE_CHROMIUM_PATH)) throw Error("FILUMIRE_CHROMIUM_PATH must name an existing absolute executable path.");
    options.executablePath = env.FILUMIRE_CHROMIUM_PATH;
  }
  if (env.FILUMIRE_BROWSER_CHANNEL) {
    if (!["chromium", "chrome", "msedge"].includes(env.FILUMIRE_BROWSER_CHANNEL)) throw Error("Unsupported FILUMIRE_BROWSER_CHANNEL; use chromium, chrome or msedge.");
    options.channel = env.FILUMIRE_BROWSER_CHANNEL;
  }
  return options;
}

export async function launchBrowser(chromium, env = process.env) {
  const options = browserOptions(env);
  try { return await chromium.launch(options); }
  catch (error) {
    throw new Error("Chromium could not start. Supply an already-installed Playwright-managed Chromium (PLAYWRIGHT_BROWSERS_PATH is supported), FILUMIRE_BROWSER_CHANNEL, or FILUMIRE_CHROMIUM_PATH. No browser download was attempted.", { cause: error });
  }
}

export function loopbackOrigin(value) {
  const url = new URL(value);
  if (url.protocol !== "http:" || url.hostname !== "127.0.0.1" || url.username || url.password || url.pathname !== "/" || url.search || url.hash) {
    throw Error("Browser target must be a plain http://127.0.0.1 loopback origin.");
  }
  return url.origin;
}

export function createEvidenceDirectory(root, requested) {
  if (!requested) {
    const parent = join(root, ".vercel");
    mkdirSync(parent, { recursive: true });
    return mkdtempSync(join(parent, "grade-navigation-"));
  }
  const out = resolve(requested);
  if (["apps", "services", "packages", "scripts", "drizzle", "node_modules"].includes(relative(root, out).split(/[\\/]/)[0])) {
    throw Error("Evidence output must be outside source/dependency directories copied by the runner.");
  }
  mkdirSync(dirname(out), { recursive: true });
  try { mkdirSync(out); }
  catch (error) { throw new Error("Evidence output must be a NEW directory; existing evidence will not be overwritten.", { cause: error }); }
  return out;
}

export function claimBrowserEvidence(out) {
  // The runner already owns this directory; a second browser run must not reuse it.
  if (readdirSync(out).some(file => ["results.json", "browser-environment.json"].includes(file) || file.endsWith(".png"))) {
    throw Error("Existing browser evidence found; refusing to overwrite it.");
  }
  writeFileSync(join(out, ".browser-started"), "Browser evidence reserved\n", { flag: "wx" });
}

export function offlinePreloadSource(root, fontUrls) {
  const require = createRequire(join(root, "package.json"));
  return `
if (process.env.FILUMIRE_PERSISTENCE !== 'memory') throw Error('Memory persistence required');
const pg = require(${JSON.stringify(require.resolve("pg"))});
const denied = () => { throw Error('OFFLINE_GUARD: PostgreSQL access forbidden'); };
for (const type of [pg.Pool, pg.Client]) for (const method of ['query','connect']) type.prototype[method] = denied;
const font = require(${JSON.stringify(require.resolve("next/dist/compiled/@next/font/dist/google/fetch-font-file.js"))});
const allowed = new Set(${JSON.stringify(fontUrls)});
font.fetchFontFile = async url => {
  if (!allowed.has(url)) throw Error('OFFLINE_GUARD: unexpected font URL');
  return require('node:fs').readFileSync(require('node:url').fileURLToPath(url));
};
`;
}
