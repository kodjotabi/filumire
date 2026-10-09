import { execFileSync } from "node:child_process";

const tests = [
  "tests/adaptive-learning-loop.test.ts",
  "tests/competency-003-adaptive-loop.test.ts",
  "tests/adaptive-content-intervention-integration.test.ts",
  "tests/complete-intervention-loop.test.ts",
  "tests/intervention-adaptive-integration.test.ts",
  "tests/intervention-lifecycle.test.ts",
  "tests/intervention-persistence.test.ts",
  "tests/content-selection.test.ts",
  "tests/content-language-selection.test.ts",
  "tests/governed-instructional-engine.test.ts",
  "tests/learner-intelligence-policy.test.ts",
  "tests/adaptive-learner-intelligence.test.ts",
  "tests/retention-transfer-policy.test.ts",
  "tests/retention-transfer.test.ts",
  "tests/evidence-context-v1.test.ts",
  "tests/misconception-evidence-v1.test.ts",
  "tests/offline-shell-v1.test.ts",
  "tests/learner-path-v1.test.ts",
  "tests/learner-path-curriculum-v1.test.ts",
  "tests/time-aware-retention-v1.test.ts",
  "tests/time-aware-retention-engine-v1.test.ts",
  "tests/api-assessment-security.test.ts",
  "tests/api-identity-security.test.ts",
  "tests/production-learner-journey.test.ts",
  "tests/production-curriculum-foundation.test.ts",
  "tests/curriculum-framework.test.ts",
  "tests/learner-learning-context-persistence.test.ts",
  "tests/production-curriculum-resolution.test.ts",
  "tests/production-learner-product-experience.test.ts",
  "tests/adult-supervision.test.ts",
  "tests/ghana-pilot-context.test.ts",
  "tests/low-connectivity-sync.test.ts",
  "tests/pending-submission-client.test.ts",
  "tests/pilot-concurrency-hardening.test.ts",
  "tests/pilot-session-hardening.test.ts",
  "tests/pilot-storage-hardening.test.ts",
  "tests/pilot-smoke-journey.test.ts",
  "tests/payment-service-config.test.ts",
  "tests/payment-service.test.ts",
  "tests/paystack-adapter.test.ts",
  "tests/payment-lifecycle.test.ts"
];

let failed = false;

function run(command: string, args: string[]): boolean {
  try {
    execFileSync(command, args, {
      cwd: process.cwd(),
      env: process.env,
      stdio: "inherit",
      windowsHide: false,
      shell: process.platform === "win32"
    });

    return true;
  } catch {
    return false;
  }
}

console.log("");
console.log("========================================");
console.log(" FILUMIRE AUTOMATED VALIDATION");
console.log("========================================");

for (const test of tests) {
  console.log("");
  console.log("----------------------------------------");
  console.log(test);
  console.log("----------------------------------------");

  const passed = run("npx.cmd", [
    "tsx",
    "--env-file=.env.local",
    test
  ]);

  if (!passed) {
    failed = true;
    console.error(`FAILED: ${test}`);
  }
}

console.log("");
console.log("----------------------------------------");
console.log("LEARNER PRODUCTION BUILD");
console.log("----------------------------------------");

if (process.env.FILUMIRE_SKIP_BUILD === "1") {
  console.log("Skipped: FILUMIRE_SKIP_BUILD=1");
} else {
  const buildPassed = run("npm.cmd", [
    "run",
    "build",
    "--workspace=@filumire/learner"
  ]);

  if (!buildPassed) {
    failed = true;
    console.error("FAILED: learner production build");
  }
}

console.log("");
console.log("========================================");

if (failed) {
  console.log("FILUMIRE VALIDATION: FAIL");
  console.log("========================================");
  process.exit(1);
}

console.log("FILUMIRE VALIDATION: PASS");
console.log("========================================");
