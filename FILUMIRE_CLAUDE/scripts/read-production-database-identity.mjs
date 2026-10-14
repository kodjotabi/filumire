// Read-only, fixed-target API queries. No connection strings or raw errors escape.
import { spawnSync } from "node:child_process";
const team = "team_ZGp9TfdK3M45ks3ViQZ9WgSW";
const paths = [
  `/v1/projects/prj_jozdDNN1pW1q5Ez66e32RvXhbYwC/env/aCnjoIipkkc4qu24?teamId=${team}`,
  `/v13/deployments/dpl_qrqeL1qomMu434xDobMZysC9eSFc?teamId=${team}`,
];
function identity(value) {
  try {
    const url = new URL(value);
    if (!["postgres:", "postgresql:"].includes(url.protocol) || !/^ep-[a-z0-9-]+(?:-pooler)?\.[a-z0-9.-]+\.neon\.tech$/.test(url.hostname)) return null;
    const database = decodeURIComponent(url.pathname.slice(1));
    const role = decodeURIComponent(url.username);
    if (!/^[a-zA-Z0-9_-]+$/.test(database) || !/^[a-zA-Z0-9_-]+$/.test(role)) return null;
    return { endpoint: url.hostname, database, role, branchMappingStillRequired: true };
  } catch { return null; }
}
for (const [index, path] of paths.entries()) {
  const result = spawnSync("npx.cmd", ["--yes", "vercel@63.1.2", "api", path, "--method", "GET", "--scope", team], { shell: true, encoding: "utf8", timeout: 45000, maxBuffer: 4 * 1024 * 1024 });
  let parsed;
  try { parsed = JSON.parse(result.stdout); } catch {}
  if (result.status !== 0 || !parsed || parsed.error) {
    console.log(JSON.stringify({ source: index ? "existing_production_deployment" : "production_environment", available: false, rawOutputSuppressed: true }));
    continue;
  }
  if (!index) {
    const env = parsed.env ?? parsed;
    console.log(JSON.stringify({ source: "production_environment", available: true, key: env.key === "DATABASE_URL" ? env.key : "unexpected_key", type: env.type, target: env.target, decrypted: env.decrypted === true, identity: identity(env.value), effectiveRuntimeStillRequiresVerification: true }));
  } else {
    const env = parsed.env ?? parsed.build?.env;
    const value = Array.isArray(env) ? env.find(item => item.key === "DATABASE_URL")?.value : env?.DATABASE_URL;
    console.log(JSON.stringify({ source: "existing_production_deployment", available: true, id: parsed.id, target: parsed.target, projectId: parsed.projectId, databaseEnvironmentAvailable: Boolean(value), identity: identity(value) }));
  }
}
