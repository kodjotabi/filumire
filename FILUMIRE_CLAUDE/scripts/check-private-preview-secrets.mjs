// Exact-match audit against locally available credentials; prints paths, never values.
import { readFileSync, existsSync, statSync } from "node:fs";
import { parseEnv } from "node:util";
import { spawnSync } from "node:child_process";
const envFiles = [".vercel/.env.preview.private.local", "FILUMIRE_CLAUDE/.env.local", "FILUMIRE_CLAUDE/.env.preview-accounts.local", "FILUMIRE_CLAUDE/apps/learner/.env.local"];
const secrets = new Set();
const files = [];
for (const file of envFiles.filter(existsSync)) {
  const parsed = parseEnv(readFileSync(file, "utf8"));
  const ignored = spawnSync("git", ["check-ignore", "-q", "--", file]).status === 0;
  const tracked = Boolean(spawnSync("git", ["ls-files", "--", file], { encoding: "utf8" }).stdout.trim());
  files.push({ file, ignored, tracked, hasNeonAdminKey: Boolean(parsed.NEON_API_KEY), variableCount: Object.keys(parsed).length });
  for (const [key, value] of Object.entries(parsed)) {
    if (/PASSWORD|SECRET|TOKEN|DATABASE_URL|POSTGRES_URL/.test(key) && value.length >= 16) secrets.add(value);
    if (/URL/.test(key)) { try { const password = decodeURIComponent(new URL(value).password); if (password.length >= 12) secrets.add(password); } catch {} }
  }
}
const trackedFiles = spawnSync("git", ["ls-files", "-z"], { encoding: "utf8" }).stdout.split("\0").filter(Boolean);
const newFiles = spawnSync("git", ["ls-files", "--others", "--exclude-standard", "-z", "--", "FILUMIRE_CLAUDE/scripts", "FILUMIRE_CLAUDE/docs", "FILUMIRE_CLAUDE/tests"], { encoding: "utf8" }).stdout.split("\0").filter(Boolean);
const matches = [];
let scanned = 0;
for (const file of [...new Set([...trackedFiles, ...newFiles])]) {
  if (!existsSync(file) || !statSync(file).isFile()) continue;
  const content = readFileSync(file);
  scanned++;
  if ([...secrets].some(secret => content.includes(Buffer.from(secret)))) matches.push(file);
}
console.log(JSON.stringify({ environmentFiles: files, scannedFiles: scanned, locallyKnownCredentialMatches: matches, scope: "Current tracked files and untracked preparation scripts/reports; not historical logs or unknown remote Secrets" }, null, 2));
if (matches.length || files.some(file => file.tracked || !file.ignored)) process.exitCode = 1;
