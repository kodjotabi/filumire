import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("../", import.meta.url));
for (const test of ["learner-interface-render", "learner-interface-copy", "learner-interface-layout"]) {
  const result = spawnSync(process.execPath, ["--env-file=.env.local", "--import", "tsx", `tests/${test}.test.ts`], { cwd: root, stdio: "inherit", env: { ...process.env, FILUMIRE_PERSISTENCE: "memory" } });
  if (result.error) console.error(result.error.message);
  if (result.status !== 0) process.exit(result.status ?? 1);
}
console.log("Phase 6: PASS (3 suites; rendering/style contracts, fictional fixtures, memory persistence)");
