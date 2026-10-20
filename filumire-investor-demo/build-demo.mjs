// Builds the portable FILUMIRE investor demo from one frozen commit.
// The live learner app is never modified: the commit is exported with
// `git archive` into .build/, the demo overlay is applied to that copy only,
// and the result is assembled in dist/FILUMIRE Demo/.
//
// Usage (from the repo root or this folder):
//   node filumire-investor-demo/build-demo.mjs [commit]
import { spawnSync } from "node:child_process";
import { cpSync, existsSync, linkSync, lstatSync, mkdirSync, readdirSync, readFileSync, renameSync, rmSync, statSync, writeFileSync, copyFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const DEFAULT_COMMIT = "5459e405"; // learner voices: African first + temporary device fallback
const demo = dirname(fileURLToPath(import.meta.url));
const repo = resolve(demo, "..");
const work = join(demo, ".build");
const frozen = join(work, "FILUMIRE_CLAUDE");
const out = join(demo, "dist", "FILUMIRE Demo");

function run(command, args, options = {}) {
  const result = spawnSync(command, args, { stdio: "inherit", windowsHide: true, ...options });
  if (result.status !== 0) throw new Error(`${command} ${args.join(" ")} failed (${result.status ?? result.error})`);
}
function capture(command, args, options = {}) {
  const result = spawnSync(command, args, { encoding: "utf8", windowsHide: true, ...options });
  if (result.status !== 0) throw new Error(`${command} ${args.join(" ")} failed: ${result.stderr}`);
  return result.stdout.trim();
}
/** Hard-link a dependency tree (no extra disk space; the source is only read). */
function linkTree(from, to) {
  mkdirSync(to, { recursive: true });
  for (const entry of readdirSync(from, { withFileTypes: true })) {
    const source = join(from, entry.name), target = join(to, entry.name);
    if (entry.isDirectory()) linkTree(source, target);
    else if (entry.isSymbolicLink()) cpSync(source, target, { dereference: true, recursive: true });
    else { try { linkSync(source, target); } catch { copyFileSync(source, target); } }
  }
}
function walk(dir, visit) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    entry.isDirectory() ? walk(path, visit) : visit(path);
  }
}

const commit = capture("git", ["rev-parse", "--verify", `${process.argv[2] ?? DEFAULT_COMMIT}^{commit}`], { cwd: repo });
console.log(`Freezing ${commit}`);

// 1. Frozen copy of the learner workspace at that commit.
rmSync(work, { recursive: true, force: true });
mkdirSync(work, { recursive: true });
const archive = join(work, "frozen.tar");
run("git", ["archive", "--format=tar", "-o", archive, commit, "FILUMIRE_CLAUDE"], { cwd: repo });
run("tar", ["-xf", "frozen.tar"], { cwd: work }); // relative: GNU tar reads "C:" as a remote host
rmSync(archive);

// 2. Dependencies: the lockfile must match the installed tree exactly.
const liveLock = readFileSync(join(repo, "FILUMIRE_CLAUDE", "package-lock.json"), "utf8");
if (readFileSync(join(frozen, "package-lock.json"), "utf8") !== liveLock) throw new Error("package-lock.json differs from the installed dependencies; run npm ci for the frozen commit first");
linkTree(join(repo, "FILUMIRE_CLAUDE", "node_modules"), join(frozen, "node_modules"));

// 3. Demo overlay and small checked patches, applied to the frozen copy only.
cpSync(join(demo, "overlay", "FILUMIRE_CLAUDE"), frozen, { recursive: true });
const PATCHES = [
  // Demo strip on every screen.
  ["apps/learner/app/layout.tsx", 'import ServiceWorkerRegister from "./ServiceWorkerRegister";',
    'import ServiceWorkerRegister from "./ServiceWorkerRegister";\nimport { Suspense } from "react";\nimport { DemoBanner } from "../components/filumire/DemoBanner";'],
  ["apps/learner/app/layout.tsx", "        {children}\n        <ServiceWorkerRegister />",
    "        <Suspense fallback={null}><DemoBanner /></Suspense>\n        {children}\n        <ServiceWorkerRegister />"],
  // Saved progress: let demo-state.ts reach the in-memory store's maps.
  ["services/persistence-memory.ts", "export const memoryPersistence =\n  new MemoryPersistenceStore();",
    "export const memoryPersistence =\n  new MemoryPersistenceStore();\n(memoryPersistence as unknown as { __demoState: object }).__demoState = { principals, externalIdentitiesByProviderKey, externalIdentityIds, learners, principalLearnerAccessRecords, authSessions, learnerStates, learnerLearningContexts, pendingTeacherReviews, teacherProfessionalNotes, parentTeacherMessages, controlledTeacherActions, pilotMeasurementEvents, evidenceStore, sessions, sessionStatuses, interventions };"],
  // Offline: no links to the public website.
  ["apps/learner/components/filumire/PublicHomeLink.tsx", "export function PublicHomeLink({ language, className }: { language: Language; className?: string }) {\n",
    "export function PublicHomeLink({ language, className }: { language: Language; className?: string }) {\n  if (language) return null; // Investor demo: offline, no public website link.\n"],
  ["apps/learner/components/filumire/AdditionalSettings.tsx", '      <a href={publicSiteHref("/pricing", language)}>{t.pricing}</a><p>{t.contactHelp}</p>\n      <a href={publicSiteHref("/contact", language)}>{t.contact}</a>\n',
    '      <p>{language === "fr" ? "Dans cette démonstration hors ligne, les abonnements et le contact se trouvent sur filumire.com." : "In this offline demo, subscriptions and contact details are on filumire.com."}</p>\n'],
];
for (const [file, find, replace] of PATCHES) {
  const path = join(frozen, file), text = readFileSync(path, "utf8").replaceAll("\r\n", "\n");
  if (text.split(find).length !== 2) throw new Error(`patch does not match exactly once: ${file}`);
  writeFileSync(path, text.replace(find, () => replace));
}

// 4. Production build with a clean, offline-only environment (no database or Vercel values).
const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => !/^(DATABASE|POSTGRES|PG|NEON|VERCEL|FLPREVIEW|NEXT_PUBLIC_FILUMIRE|FILUMIRE_)/i.test(key)));
// The database module needs a URL to load; this placeholder points nowhere and is never used in memory mode.
Object.assign(env, { NEXT_TELEMETRY_DISABLED: "1", FILUMIRE_PERSISTENCE: "memory", NODE_ENV: "production", DATABASE_URL: "postgresql://offline:offline@127.0.0.1:1/offline" });
run(process.execPath, [join(frozen, "node_modules", "next", "dist", "bin", "next"), "build", "apps/learner"], { cwd: frozen, env });

// 5. Assemble the portable folder.
const standalone = join(frozen, "apps", "learner", ".next", "standalone");
const serverDir = join(out, "app", "apps", "learner");
// Keep data/ (saved progress, session key, browser profile) across rebuilds.
const keptData = join(work, "data-kept");
if (existsSync(join(out, "data"))) {
  try { renameSync(join(out, "data"), keptData); }
  catch (error) { throw new Error(`dist/FILUMIRE Demo/data is in use (${error.code}); close the demo and any window open on that folder, then build again`); }
}
rmSync(out, { recursive: true, force: true });
cpSync(standalone, join(out, "app"), { recursive: true, dereference: true });
if (existsSync(keptData)) renameSync(keptData, join(out, "data"));
cpSync(join(frozen, "apps", "learner", ".next", "static"), join(serverDir, ".next", "static"), { recursive: true });
cpSync(join(frozen, "apps", "learner", "public"), join(serverDir, "public"), { recursive: true });
mkdirSync(join(out, "node"), { recursive: true });
copyFileSync(process.execPath, join(out, "node", "node.exe"));
cpSync(join(demo, "launcher"), join(out, "launcher"), { recursive: true });
copyFileSync(join(demo, "launcher", "Start FILUMIRE Demo.cmd"), join(out, "Start FILUMIRE Demo.cmd"));
rmSync(join(out, "launcher", "Start FILUMIRE Demo.cmd"));
copyFileSync(join(demo, "launcher", "READ ME FIRST.txt"), join(out, "READ ME FIRST.txt"));
rmSync(join(out, "launcher", "READ ME FIRST.txt"));
if (!existsSync(join(serverDir, "server.js"))) throw new Error("standalone server.js missing");

// 6. Nothing secret or environment-specific may ship.
const problems = [];
walk(out, (file) => {
  const name = relative(out, file);
  if (/^data[\\/]/.test(name)) return; // the owner's local data, not shipped content
  if (/(^|[\\/])\.env(\.|$)/.test(name)) { rmSync(file); return; }
  if (statSync(file).size > 5_000_000 || !/\.(js|json|mjs|cjs|txt|html|cmd|map)$/.test(file)) return;
  const text = readFileSync(file, "utf8");
  for (const [label, pattern] of [["database URL", /postgres(ql)?:\/\/(?!offline:offline@127\.0\.0\.1)[^\s"'`]+@/], ["Neon credential", /FLPREVIEW_|NEON_API_KEY/], ["API key", /\bsk-[A-Za-z0-9_-]{20,}/], ["Vercel token", /VERCEL_OIDC_TOKEN=|vercel_[A-Za-z0-9]{24,}/]])
    if (pattern.test(text)) problems.push(`${label}: ${name}`);
});
if (problems.length) throw new Error("Refusing to ship:\n" + problems.join("\n"));

let bytes = 0; walk(out, (file) => { if (!/^data[\\/]/.test(relative(out, file))) bytes += lstatSync(file).size; });
writeFileSync(join(out, "build-info.json"), JSON.stringify({ commit, builtAt: new Date().toISOString(), node: process.version, sizeMB: Math.round(bytes / 1e6) }, null, 2) + "\n");
console.log(`Built ${relative(repo, out)} (${Math.round(bytes / 1e6)} MB) from ${commit.slice(0, 8)}`);
