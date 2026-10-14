import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("../", import.meta.url));
const tests = ["lesson-closure-api", "lesson-closure-production", "lesson-closure-presentation", "lesson-closure-client", "retention-transfer", "retention-transfer-policy", "learner-path-v1", "learner-journey-route-4h"];
for (const test of tests) {
  console.log(`Closure: ${test}`);
  const result = spawnSync(process.execPath, ["--env-file=.env.local", "--import", "tsx", `tests/${test}.test.ts`], { cwd: root, stdio: "inherit", env: { ...process.env, FILUMIRE_PERSISTENCE: "memory" } });
  if (result.error) console.error(result.error.message);
  if (result.status !== 0) process.exit(result.status ?? 1);
}
console.log(`Closure: PASS (${tests.length} suites; memory persistence)`);
