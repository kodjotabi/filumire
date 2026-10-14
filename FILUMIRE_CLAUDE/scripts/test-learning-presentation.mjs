import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("../", import.meta.url));
const tests = ["learning-presentation", "learning-progress-render", "learner-progress", "api-assessment-security", "learning-language", "adaptive-learning-loop", "competency-003-adaptive-loop", "learner-journey-route-4h"];
for (const test of tests) {
  console.log(`Presentation: ${test}`);
  const result = spawnSync(process.execPath, ["--env-file=.env.local", "--import", "tsx", `tests/${test}.test.ts`], { cwd: root, stdio: "inherit", env: { ...process.env, FILUMIRE_PERSISTENCE: "memory" } });
  if (result.error) console.error(result.error.message);
  if (result.status !== 0) process.exit(result.status ?? 1);
}
console.log(`Presentation: PASS (${tests.length} suites; memory persistence)`);
