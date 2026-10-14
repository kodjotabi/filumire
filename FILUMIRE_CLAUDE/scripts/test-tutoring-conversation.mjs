import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("../", import.meta.url));
const tests = ["tutoring-conversation-api", "tutoring-conversation-context", "tutoring-conversation-identity", "tutoring-conversation-client", "governed-instructional-engine", "four-subject-filu-v1"];
for (const test of tests) {
  console.log(`Conversation: ${test}`);
  const result = spawnSync(process.execPath, ["--env-file=.env.local", "--import", "tsx", `tests/${test}.test.ts`], {
    cwd: root, stdio: "inherit", env: { ...process.env, FILUMIRE_PERSISTENCE: "memory" },
  });
  if (result.error) console.error(result.error.message);
  if (result.status !== 0) process.exit(result.status ?? 1);
}
console.log(`Conversation: PASS (${tests.length} suites; memory persistence; mock only)`);
