// Read-only Vercel administrative fallback. Never emits secret-bearing metadata.
import { spawnSync } from "node:child_process";
const paths = [
  "/v1/integrations/configurations?view=account&teamId=team_ZGp9TfdK3M45ks3ViQZ9WgSW",
  "/v1/storage/stores/store_1GtAwVi3NaSUJhuY?teamId=team_ZGp9TfdK3M45ks3ViQZ9WgSW",
];
const scrub = (value, key = "") => {
  if (/secret|password|token|connection|value|uri|url|credential/i.test(key)) return "[redacted]";
  if (Array.isArray(value)) return value.map(item => scrub(item));
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([name, item]) => [name, scrub(item, name)]));
  if (typeof value === "string" && /postgres(?:ql)?:\/\/|Bearer /i.test(value)) return "[redacted]";
  return value;
};
for (const path of paths) {
  const result = spawnSync("npx.cmd", ["--yes", "vercel@63.1.2", "api", path, "--method", "GET", "--scope", "team_ZGp9TfdK3M45ks3ViQZ9WgSW"], { encoding: "utf8", shell: true, timeout: 120000, maxBuffer: 4 * 1024 * 1024 });
  let response;
  try { response = scrub(JSON.parse(result.stdout)); }
  catch { response = { unavailable: true, exitCode: result.status, reason: "CLI did not return JSON; raw output suppressed" }; }
  console.log(JSON.stringify({ path, response }, null, 2));
}
