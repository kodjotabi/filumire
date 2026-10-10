// All integration tests in this runner use memory persistence. Never let
// an application's .env.local send test fixtures or limiter resets to Neon.
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("../", import.meta.url));
const tests = [
  "account-registration-journey", "teacher-linking", "account-client-signout",
  "auth-rate-limit", "principal-auth-session", "principal-learner-access",
  "adult-supervision", "controlled-teacher-actions-api",
  "parent-teacher-communication-api", "parent-experience-v1",
  "learner-progress", "learning-language", "parent-summary-language",
  "content-language-selection", "grade-aware-subject-selection",
  "production-learner-journey", "api-assessment-security", "api-identity-security",
  "adaptive-learning-loop", "competency-003-adaptive-loop",
];
for (const test of tests) {
  console.log(`\nSection 7: ${test}`);
  const result = spawnSync(process.execPath, ["--env-file=.env.local", "--import", "tsx", `tests/${test}.test.ts`], {
    cwd: root, stdio: "inherit", env: { ...process.env, FILUMIRE_PERSISTENCE: "memory" },
  });
  if (result.error) console.error(result.error.message);
  if (result.status !== 0) process.exit(result.status ?? 1);
}
console.log(`Section 7: PASS (${tests.length} suites; memory persistence; no database records changed)`);
