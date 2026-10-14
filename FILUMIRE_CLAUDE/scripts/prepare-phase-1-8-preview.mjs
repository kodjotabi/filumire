// Prepare current working-tree source, including untracked Phase 1–8 files.
// No deployment, database access, environment changes or Git mutation.
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve, dirname, sep } from "node:path";
import { parseEnv } from "node:util";
const repo = resolve(new URL("../../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"));
function git(args) {
  const r = spawnSync("git", args, { cwd: repo, encoding: "utf8", maxBuffer: 16 * 1024 * 1024 });
  if (r.status !== 0) throw new Error("git_read_failed");
  return r.stdout;
}
const link = JSON.parse(readFileSync(resolve(repo, ".vercel/project.json"), "utf8"));
if (link.projectId !== "prj_jozdDNN1pW1q5Ez66e32RvXhbYwC" || link.orgId !== "team_ZGp9TfdK3M45ks3ViQZ9WgSW") throw new Error("incorrect_target");
const checkpoint = git(["rev-parse", "HEAD"]).trim();
const branch = git(["branch", "--show-current"]).trim();
if (branch !== "filumire-interface-testing") throw new Error("incorrect_branch");
const inputs = [...new Set(git(["ls-files", "--cached", "--others", "--exclude-standard", "-z", "--", "FILUMIRE_CLAUDE"]).split("\0").filter(Boolean))].sort();
const files = inputs.filter(file => /^FILUMIRE_CLAUDE\/(apps\/learner\/|services\/|packages\/|package(?:-lock)?\.json$|tsconfig\.json$)/.test(file) && !/(^|\/)(\.env[^/]*|node_modules|\.next|\.vercel|\.git|coverage|out)(\/|$)/.test(file) && !/\.(?:tsbuildinfo|log|sql|csv|bak|dump|sqlite|db)$/.test(file));
const required = ["services/family-access/otp.ts", "apps/learner/components/filumire/FamilyAccessPrototype.tsx", "services/lesson-closure/index.ts", "services/edututor/conversation-api.ts", "apps/learner/services/learning-continuity.ts", "apps/learner/app/learner-interface.css"].map(path => `FILUMIRE_CLAUDE/${path}`);
if (required.some(path => !files.includes(path))) throw new Error("latest_phase_source_missing");
const secrets = new Set();
for (const env of [".vercel/.env.preview.private.local", "FILUMIRE_CLAUDE/.env.local", "FILUMIRE_CLAUDE/.env.preview-accounts.local", "FILUMIRE_CLAUDE/apps/learner/.env.local"]) {
  const path = resolve(repo, env); if (!existsSync(path)) continue;
  for (const [key, value] of Object.entries(parseEnv(readFileSync(path, "utf8")))) {
    if (/SECRET|TOKEN|PASSWORD|DATABASE_URL|POSTGRES_URL|API_KEY/.test(key) && value.length >= 16) secrets.add(value);
    if (/URL/.test(key)) { try { const password = decodeURIComponent(new URL(value).password); if (password.length >= 12) secrets.add(password); } catch {} }
  }
}
const content = files.map(file => ({ file, data: readFileSync(resolve(repo, file)) }));
for (const { file, data } of content) if ([...secrets].some(secret => data.includes(Buffer.from(secret)))) throw new Error(`known_secret_in_source:${file}`);
const manifest = content.map(({ file, data }) => ({ path: file, sha256: createHash("sha256").update(data).digest("hex") }));
const sourceSha256 = createHash("sha256").update(JSON.stringify(manifest)).digest("hex");
const destination = resolve(repo, "FILUMIRE_CLAUDE/.vercel", `phase1-8-${sourceSha256.slice(0,12)}`);
if (existsSync(destination)) throw new Error("existing_package_preserved");
mkdirSync(destination, { recursive: true });
for (const { file, data } of content) {
  const target = resolve(destination, file);
  if (!target.startsWith(destination + sep)) throw new Error("unsafe_path");
  mkdirSync(dirname(target), { recursive: true }); writeFileSync(target, data, { flag: "wx" });
  if (!readFileSync(target).equals(data)) throw new Error("copy_mismatch");
}
mkdirSync(resolve(destination, ".vercel"));
writeFileSync(resolve(destination, ".vercel/project.json"), JSON.stringify(link), { flag: "wx" });
writeFileSync(resolve(destination, ".vercelignore"), ".vercel\n.env*\n**/.env*\nnode_modules\n**/node_modules\n**/.next\n", { flag: "wx" });
const report = { checkpoint, branch, dirty: true, sourceSha256, files: files.length, destination, projectId: link.projectId, teamId: link.orgId, rootDirectory: "FILUMIRE_CLAUDE/apps/learner", containsEnvironmentFiles: false, knownSecretMatches: 0, manifest };
writeFileSync(resolve(repo, "FILUMIRE_CLAUDE/.vercel/phase1-8-source.json"), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ ...report, manifest: undefined }, null, 2));
