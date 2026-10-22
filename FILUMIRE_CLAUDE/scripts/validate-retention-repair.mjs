// Run the entire legacy validation inventory plus offline security and the
// retention regressions through the existing memory-only test runner. Avoid
// validate-all.ps1's log deletion, real-DB environment file and runtime writes.
import { spawn } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { OFFLINE_SECURITY_SUITES } from "./run-offline-suites.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const legacy = ["scripts/validate-all.ps1", "tests/validate-all.ts"].flatMap((file) =>
  [...readFileSync(join(root, file), "utf8").matchAll(/"tests\/([^"\r\n]+)\.test\.ts"/g)].map((match) => match[1]));
const suites = [...new Set([...legacy, ...OFFLINE_SECURITY_SUITES,
  "teaching-first-retention", "basic7-materials-pilot", "b7-framework-registration", "b7-existing-curriculum-regression",
  "b4-framework-registration", "spaced-revision", "spaced-revision-subjects", "teaching-first-journey", "immediate-correction", "retention-transfer-negative-gate",
])];
console.log(`Full validation inventory: ${suites.length} suites, memory only; missing legacy entries are reported as failures.`);
const startedAt = new Date().toISOString();
const child = spawn(process.execPath, [join(root, "scripts/run-offline-suites.mjs"), ...suites], {
  cwd: root, windowsHide: true, env: { ...process.env, FILUMIRE_PERSISTENCE: "memory", DATABASE_URL: "postgresql://offline:offline@127.0.0.1:1/offline" },
});
let output = "";
child.stdout.on("data", (data) => { output += data; process.stdout.write(data); });
child.stderr.on("data", (data) => { output += data; process.stderr.write(data); });
const exitCode = await new Promise((resolve, reject) => { child.on("error", reject); child.on("close", resolve); });
const passed = [...output.matchAll(/^PASS ([^\s:]+) \(/gm)].map((match) => match[1]);
const failed = [...output.matchAll(/^FAIL ([^\s:]+) \(/gm)].map((match) => match[1]);
writeFileSync(join(root, "docs/phase8e/retention-validation.log"), output);
writeFileSync(join(root, "docs/phase8e/retention-validation.json"), `${JSON.stringify({ startedAt, completedAt: new Date().toISOString(), persistence: "memory", requested: suites.length, passed, failed, exitCode }, null, 2)}\n`);
process.exitCode = exitCode ?? 1;
