import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("../", import.meta.url));
for (const test of ["family-phone-otp", "family-subscriptions", "family-access-api", "family-access-render"]) {
  const result = spawnSync(process.execPath, ["--env-file=.env.local", "--import", "tsx", `tests/${test}.test.ts`], {
    cwd: root, stdio: "inherit", env: { ...process.env, FILUMIRE_PERSISTENCE: "memory", FILUMIRE_LOCAL_FAMILY_ACCESS: "mock", NODE_ENV: "test" },
  });
  if (result.error) console.error(result.error.message);
  if (result.status !== 0) process.exit(result.status ?? 1);
}
console.log("Phase 7 + 8: PASS (4 suites; fictional fixtures, memory, mock providers; no external calls)");
