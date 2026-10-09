const { execSync } = require("node:child_process");

const tests = [
  "tests/pedagogical-policy-transition.test.ts",
  "tests/learner-state-hardening.test.ts",
  "tests/assessment-evidence-hardening.test.ts",
  "tests/adaptive-content-intervention-integration.test.ts",
  "tests/intervention-adaptive-integration.test.ts",
];

for (const test of tests) {
  console.log(`\n=== ${test} ===`);
  execSync(`npx tsx "${test}"`, {
    stdio: "inherit",
  });
}

console.log("\nFILUMIRE VERIFY: PASS");
