import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("../", import.meta.url));
const tests = ["learning-continuity-client", "learning-continuity-api", "learner-learning-context-persistence", "api-learning-session-persistence", "learner-journey-route-4h", "intervention-lifecycle"];
for (const test of tests) {
  console.log(`Continuity: ${test}`);
  const result = spawnSync(process.execPath, ["--env-file=.env.local", "--import", "tsx", `tests/${test}.test.ts`], {
    cwd: root, stdio: "inherit", env: { ...process.env, FILUMIRE_PERSISTENCE: "memory" },
  });
  if (result.error) console.error(result.error.message);
  if (result.status !== 0) process.exit(result.status ?? 1);
}
console.log(`Continuity: PASS (${tests.length} suites; memory persistence)`);
