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
  "tests/learner-intelligence-policy.test.ts",
  "tests/retention-transfer-policy.test.ts",
  "tests/retention-transfer.test.ts",
  "tests/api-assessment-security.test.ts",
  "tests/api-identity-security.test.ts",
  "tests/payment-service-config.test.ts",
  "tests/payment-service.test.ts",
  "tests/paystack-adapter.test.ts"
];

let failed = false;

function run(command: string, args: string[]): boolean {
  try {
    execFileSync(command, args, {
      cwd: process.cwd(),
      env: process.env,
      stdio: "inherit",
      windowsHide: false
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

const buildPassed = run("npm.cmd", [
  "run",
  "build",
  "--workspace=@filumire/learner"
]);

if (!buildPassed) {
  failed = true;
  console.error("FAILED: learner production build");
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