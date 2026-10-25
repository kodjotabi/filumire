// Runs offline test suites, one process each: the named suites, or by
// default the offline security and integrity suites below.
// Every suite is forced onto the in-memory store with an unreachable
// database URL, whatever .env files or the shell contain, so this
// command can never reach PostgreSQL. Database-dependent suites are
// listed in docs/SECURITY_TEST_SUITES.md and are run separately.
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

export const OFFLINE_SECURITY_SUITES = [
  // Red-team suites
  "red-team-01-identity-auth", "red-team-02-trusted-evidence", "red-team-03-json-parsing",
  "red-team-04-session-competency", "red-team-05-progression-integrity", "red-team-06-concurrency",
  // Learning API and assessment integrity
  "api-evidence-integrity", "api-learning-client-side-forgery-comprehensive",
  "api-learning-session-persistence", "api-learning-error-handling",
  "assessment-evidence-hardening", "assessment-external-evidence", "learner-state-hardening",
  "pilot-session-hardening", "pilot-storage-hardening", "pilot-concurrency-hardening",
  "learning-continuity-api", "production-learner-journey", "grade-aware-subject-selection",
  // Principals, sessions and learner access
  "principal-auth-session", "principal-identity", "principal-learner-access", "principal-resolution",
  "adult-supervision", "adult-signout", "account-client-signout", "reviewer-access",
  // Teachers
  "teacher-authorization", "teacher-summary-api", "teacher-trusted-review", "teacher-review-end-to-end",
  "teacher-pending-review", "learner-pending-teacher-review", "teacher-professional-notes",
  "controlled-teacher-actions", "controlled-teacher-actions-api", "teacher-write-origin",
  // Families, parents and messaging
  "parent-teacher-communication-api", "family-access-api", "family-subscriptions", "family-phone-otp", "learner-removal",
  "jhs-add-learner",
  // Tutoring, lesson closure and safeguarding
  "tutoring-conversation-identity", "tutoring-conversation-api", "tutoring-recovery",
  "tutoring-conceptual-help", "filu-teaching-quality",
  "outline-visuals",
  "lesson-closure-api", "lesson-closure-production", "cluster5c-safeguarding",
];

const env = {
  ...process.env,
  FILUMIRE_PERSISTENCE: "memory",
  DATABASE_URL: "postgresql://offline:offline@127.0.0.1:1/offline",
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  // Accepts suite names or test file paths (tests/<suite>.test.ts).
  const suites = process.argv.length > 2
    ? process.argv.slice(2).map((arg) => arg.replace(/^(\.\/)?tests\//, "").replace(/\.test\.ts$/, ""))
    : OFFLINE_SECURITY_SUITES;
  const failed = [];
  for (const suite of suites) {
    const started = Date.now();
    const result = spawnSync(process.execPath, ["--import", "tsx", join("tests", `${suite}.test.ts`)],
      { cwd: root, env, encoding: "utf8", timeout: 300_000, windowsHide: true });
    const seconds = ((Date.now() - started) / 1000).toFixed(1);
    if (result.status === 0) {
      console.log(`PASS ${suite} (${seconds}s)`);
    } else {
      failed.push(suite);
      console.log(`FAIL ${suite} (${seconds}s)`);
      console.log(`${result.stdout ?? ""}${result.stderr ?? ""}`.trim().split("\n").slice(-15).join("\n"));
    }
  }
  console.log(failed.length
    ? `${failed.length} of ${suites.length} offline suites FAILED: ${failed.join(", ")}`
    : `PASS: all ${suites.length} offline suites (memory only, PostgreSQL unreachable)`);
  process.exitCode = failed.length ? 1 : 0;
}
