// Fresh isolated production build + real browser journeys. Installs nothing.
import { cpSync, existsSync, mkdirSync, readFileSync, symlinkSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { createEvidenceDirectory, launchBrowser, loopbackOrigin, offlinePreloadSource, resolvePlaywright } from "./grade-navigation-support.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
if (process.argv.slice(2).some(arg => arg !== "--build-only")) throw Error("Supported option: --build-only. Each invocation builds a fresh snapshot; --test-only is no longer supported.");
const node = process.env.FILUMIRE_BROWSER_NODE ?? process.execPath;
if (!existsSync(node)) throw Error("FILUMIRE_BROWSER_NODE must name an existing Node executable.");
const playwright = resolvePlaywright(root);
// Public Playwright launch API discovers its managed headless shell or selected
// installed system channel. Never crawl personal npm/browser cache directories.
const playwrightModule = await import(playwright);
const chromium = playwrightModule.chromium ?? playwrightModule.default?.chromium;
if (!chromium?.launch) throw Error("Selected Playwright module does not export chromium.launch.");
const preflight = await launchBrowser(chromium);
const browserVersion = preflight.version();
await preflight.close();
const port = Number(process.env.FILUMIRE_BROWSER_PORT ?? 3217);
if (!Number.isInteger(port) || port < 1024 || port > 65535) throw Error("FILUMIRE_BROWSER_PORT must be an integer from 1024 to 65535.");
const origin = loopbackOrigin(`http://127.0.0.1:${port}`);
// Bind rather than fetch: do not contact an unrelated service on an occupied port.
await new Promise((done, reject) => {
  const probe = createServer();
  probe.once("error", () => reject(Error(`Loopback port ${port} unavailable; refusing to attach to an existing service.`)));
  probe.listen(port, "127.0.0.1", () => probe.close(done));
});
const out = createEvidenceDirectory(root, process.env.FILUMIRE_NAVIGATION_ARTIFACTS);
console.log(`Fresh browser evidence: ${out}`);
const snapshot = join(out, "source");
mkdirSync(snapshot);
const env = {};
for (const key of ["PATH", "SystemRoot", "WINDIR", "TEMP", "TMP", "APPDATA", "LOCALAPPDATA", "USERPROFILE", "ComSpec", "NUMBER_OF_PROCESSORS", "PLAYWRIGHT_BROWSERS_PATH", "FILUMIRE_CHROMIUM_PATH", "FILUMIRE_BROWSER_CHANNEL"]) {
  if (process.env[key]) env[key] = process.env[key];
}
Object.assign(env, {
  NODE_ENV: "production", FILUMIRE_PERSISTENCE: "memory",
  DATABASE_URL: "postgresql://forbidden:forbidden@127.0.0.1:1/forbidden",
  FILUMIRE_AUTH_JWT_SECRET: "isolated-grade-navigation-only-secret-at-least-32",
  FILUMIRE_ACCOUNT_REGISTRATION: "open", NEXT_TELEMETRY_DISABLED: "1",
  FILUMIRE_TEST_URL: origin,
  FILUMIRE_NAVIGATION_ARTIFACTS: out, FILUMIRE_PLAYWRIGHT_MODULE: playwright,
});

function run(args, logName, cwd = snapshot) {
  return new Promise((done, reject) => {
    const child = spawn(node, args, { cwd, env, stdio: ["ignore", "pipe", "pipe"], windowsHide: true });
    let output = "";
    child.stdout.on("data", data => { output += data; writeFileSync(join(out, logName), output); if (logName === "browser.log") process.stdout.write(data); });
    child.stderr.on("data", data => { output += data; writeFileSync(join(out, logName), output); });
    child.on("error", reject);
    child.on("exit", code => {
      writeFileSync(join(out, logName), output);
      console.log(`${logName}: ${code}`);
      if (code !== 0) { console.log(output.slice(-6000)); reject(new Error(`${logName} failed`)); }
      else done();
    });
  });
}

// All font inputs are reviewed, licensed fixtures, independent of generated
// output. Hash verification runs before Next starts; no external fetch fallback.
const fixtures = join(root, "tests/fixtures/browser-fonts");
const fontManifest = JSON.parse(readFileSync(join(fixtures, "manifest.json"), "utf8"));
const fontHashes = {};
const fontsOut = join(out, "fonts");
cpSync(fixtures, fontsOut, { recursive: true });
for (const asset of fontManifest.assets) {
  const bytes = readFileSync(join(fontsOut, asset.file));
  const hash = createHash("sha256").update(bytes).digest("hex");
  if (hash !== asset.sha256 || bytes.length !== asset.bytes) throw Error(`Offline font fixture corrupt: ${asset.file}`);
  fontHashes[asset.file] = hash;
}
const css = readFileSync(join(fontsOut, "fonts.css"), "utf8");
const faces = css.match(/(?:\/\*[^*]*\*\/\s*)?@font-face\s*\{[^}]+\}/g) ?? [];
const responses = {};
for (const [family, weights] of [["Montserrat", "400;500;600;700;800"], ["Kalam", "400;700"]]) {
  const familyFaces = faces.filter(face => face.includes(`font-family: '${family}'`));
  if (!familyFaces.length) throw Error(`Offline ${family} font CSS missing`);
  responses[`https://fonts.googleapis.com/css2?family=${family}:wght@${weights}&display=swap`] = familyFaces.join("\n")
    .replace(/url\(\/fonts\/([^()]+)\)/g, (_, file) => {
      if (!fontHashes[file]) throw Error(`Unverified font CSS reference: ${file}`);
      return `url(${pathToFileURL(join(fontsOut, file)).href})`;
    });
}
// Applies to build workers, server and browser test process.
const preload = join(out, "offline-preload.cjs");
writeFileSync(preload, offlinePreloadSource(root, Object.keys(fontHashes).map(file => pathToFileURL(join(fontsOut, file)).href)));
env.NODE_OPTIONS = `--require "${preload.replaceAll("\\", "/")}"`;
env.NEXT_FONT_GOOGLE_MOCKED_RESPONSES = join(out, "font-responses.cjs");
writeFileSync(env.NEXT_FONT_GOOGLE_MOCKED_RESPONSES, `module.exports = ${JSON.stringify(responses)};`);
writeFileSync(join(out, "isolation.json"), JSON.stringify({ persistence: "memory", environmentFilesCopied: false,
  postgres: "query/connect blocked by preload", fonts: "licensed repository fixtures", fontHashes,
  node: process.version, browserVersion, origin }, null, 2));

const excluded = new Set(["node_modules", ".next", ".git", ".vercel"]);
const filter = path => !excluded.has(path.split(/[\\/]/).at(-1)) && !path.split(/[\\/]/).at(-1).startsWith(".env");
for (const dir of ["apps/learner", "services", "packages", "scripts", "drizzle"]) {
  cpSync(join(root, dir), join(snapshot, dir), { recursive: true, filter });
}
for (const file of ["package.json", "package-lock.json", "tsconfig.json"]) cpSync(join(root, file), join(snapshot, file));
const nextConfigPath = join(snapshot, "apps/learner/next.config.ts");
writeFileSync(nextConfigPath, readFileSync(nextConfigPath, "utf8").replace("const nextConfig: NextConfig = {",
  `const nextConfig: NextConfig = {\n  outputFileTracingRoot: ${JSON.stringify(snapshot)},`));
symlinkSync(join(root, "node_modules"), join(snapshot, "node_modules"), process.platform === "win32" ? "junction" : "dir");
await run(["scripts/deploy-guard.mjs"], "local-build-guard.log");
await run(["node_modules/next/dist/bin/next", "build", "apps/learner"], "build.log");
if (process.argv.includes("--build-only")) process.exit(0);

const server = spawn(node, ["node_modules/next/dist/bin/next", "start", "apps/learner", "--hostname", "127.0.0.1", "--port", String(port)],
  { cwd: snapshot, env, stdio: ["ignore", "pipe", "pipe"], windowsHide: true });
let serverLog = "";
let serverError;
let serverListening = false;
server.on("error", error => { serverError = error; });
server.stdout.on("data", data => { serverLog += data; serverListening ||= /Ready in/.test(serverLog); });
server.stderr.on("data", data => { serverLog += data; });
try {
  let ready = false;
  for (let attempt = 0; attempt < 60; attempt++) {
    if (serverError) throw serverError;
    if (server.exitCode !== null) throw Error("Isolated server exited before readiness");
    try { if (serverListening && (await fetch(origin + "/login", { redirect: "error", signal: AbortSignal.timeout(1500) })).ok) { ready = true; break; } } catch {}
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  if (!ready) throw new Error("Isolated server did not become ready");
  await run([join(root, "tests/grade-navigation.browser.mjs")], "browser.log", root);
  if (serverLog.includes("OFFLINE_GUARD")) throw new Error("Unexpected PostgreSQL access was blocked");
} finally {
  server.kill();
  writeFileSync(join(out, "server.log"), serverLog);
}
