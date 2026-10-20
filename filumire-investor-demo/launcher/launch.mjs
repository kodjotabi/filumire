// Starts the offline FILUMIRE demo: the learner server on 127.0.0.1 only,
// then an Edge (or Chrome) app window with its own demo profile.
// Closing the window stops the server.
//
//   node launcher/launch.mjs                 normal start
//   node launcher/launch.mjs --no-browser    server only (for testing)
//   node launcher/launch.mjs --offline-check browser may reach 127.0.0.1 only
import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createServer } from "node:net";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const data = join(root, "data");
const serverDir = join(root, "app", "apps", "learner");
const args = new Set(process.argv.slice(2));
mkdirSync(data, { recursive: true });
const log = (line) => { const text = `${new Date().toISOString()} ${line}`; console.log(line); appendFileSync(join(data, "launcher.log"), text + "\n"); };

// A signing key made on this laptop at first start; it never leaves the demo folder.
const secretFile = join(data, "session-key.txt");
if (!existsSync(secretFile)) writeFileSync(secretFile, randomBytes(48).toString("base64url"));
const secret = readFileSync(secretFile, "utf8").trim();

function freePort(start) {
  return new Promise((done) => {
    const probe = createServer().once("error", () => done(freePort(start + 1))).once("listening", () => probe.close(() => done(start)));
    probe.listen(start, "127.0.0.1");
  });
}
async function waitFor(url, child) {
  for (let i = 0; i < 120; i++) {
    if (child.exitCode !== null) throw new Error("the demo server stopped while starting; see data/launcher.log");
    try { if ((await fetch(url)).status < 500) return; } catch { /* still starting */ }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error("the demo server did not start within 60 seconds");
}
function findBrowser() {
  const bases = [process.env["ProgramFiles(x86)"], process.env.ProgramFiles, process.env.LOCALAPPDATA].filter(Boolean);
  for (const path of ["Microsoft/Edge/Application/msedge.exe", "Google/Chrome/Application/chrome.exe"])
    for (const base of bases) if (existsSync(join(base, path))) return join(base, path);
}

const port = await freePort(3417);
const origin = `http://127.0.0.1:${port}`;
const server = spawn(join(root, "node", "node.exe"), ["server.js"], {
  cwd: serverDir, windowsHide: true, stdio: ["ignore", "pipe", "pipe"],
  env: {
    SystemRoot: process.env.SystemRoot, TEMP: process.env.TEMP, TMP: process.env.TMP,
    NODE_ENV: "production", NEXT_TELEMETRY_DISABLED: "1", HOSTNAME: "127.0.0.1", PORT: String(port),
    FILUMIRE_PERSISTENCE: "memory", DATABASE_URL: "postgresql://offline:offline@127.0.0.1:1/offline",
    FILUMIRE_AUTH_JWT_SECRET: secret, FILUMIRE_ACCOUNT_REGISTRATION: "open", FILUMIRE_DEMO: "1", FILUMIRE_DEMO_STATE: join(data, "demo-state.json"),
  },
});
server.stdout.on("data", (chunk) => appendFileSync(join(data, "server.log"), chunk));
server.stderr.on("data", (chunk) => appendFileSync(join(data, "server.log"), chunk));
const stop = () => { if (server.exitCode === null) server.kill(); };
// Progress is saved every few seconds; this saves the last moments before stopping.
async function saveAndStop() {
  try { await fetch(`${origin}/api/demo/state`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "save" }), signal: AbortSignal.timeout(3000) }); } catch { /* the periodic save still applies */ }
  stop(); process.exit(0);
}
process.on("SIGINT", () => void saveAndStop());
process.on("exit", stop);

log(`Starting FILUMIRE demo on ${origin} …`);
await waitFor(`${origin}/demo`, server);
log(`FILUMIRE demo is ready: ${origin}`);

if (args.has("--no-browser")) {
  log("Server only. Press Ctrl+C to stop.");
} else {
  const browser = findBrowser();
  if (!browser) { log(`No Edge or Chrome found. Open ${origin} in any browser; close this window to stop.`); }
  else {
    const flags = [`--app=${origin}/demo`, `--user-data-dir=${join(data, "browser-profile")}`, "--no-first-run", "--no-default-browser-check", "--disable-sync", "--window-size=1280,860"];
    // Test mode: every host except the demo server is unreachable.
    if (args.has("--offline-check")) flags.push("--host-resolver-rules=MAP * ~NOTFOUND , EXCLUDE 127.0.0.1");
    const window = spawn(browser, flags, { stdio: "ignore", windowsHide: false });
    log("Demo window opened. Close it to stop FILUMIRE.");
    window.on("exit", () => { log("Demo window closed; saving and stopping."); void saveAndStop(); });
  }
}
