import assert from "node:assert/strict";
import fs from "node:fs";
import { GHANA_B4_ENGLISH_PRODUCTION_SPECS as specs } from "../packages/curriculum/ghana-b4-english-production";
import { GHANA_B4_ENGLISH_GENERATED_CONTENT as content } from "../services/content-store/ghana-b4-english-content";

const authoritative = fs
  .readFileSync("./docs/curriculum-sources/ghana/2019/ENGLISH-B4-indicators-authoritative.txt", "utf8")
  .split(/\r?\n/)
  .map((line) => line.trim())
  .filter(Boolean)
  .map((line) => line.split("|")[0].trim());

assert.equal(specs.length, 131);
assert.equal(new Set(specs.map((s) => s.code)).size, 131);
assert.deepEqual([...new Set(specs.map((s) => s.code))].sort(), [...new Set(authoritative)].sort());

for (const spec of specs) {
  assert.ok("evidence" in spec && spec.evidence, `Missing evidence: ${spec.code}`);
  const evidence = (spec as any).evidence;
  assert.ok(evidence.diagnosticTask?.trim(), `Missing diagnostic: ${spec.code}`);
  assert.ok(evidence.reassessmentTask?.trim(), `Missing reassessment: ${spec.code}`);
  assert.ok(evidence.retentionTask?.trim(), `Missing retention: ${spec.code}`);
  assert.ok(evidence.transferTask?.trim(), `Missing transfer: ${spec.code}`);
  assert.ok(evidence.successCriteria?.length > 0, `Missing criteria: ${spec.code}`);

  const records = content.filter((c) => c.competencyId === spec.competencyId);
  assert.equal(records.length, 8, `Expected 8 content records: ${spec.code}`);
}

assert.equal(content.length, 1048);
assert.equal(content.filter((c) => c.version === "english-adaptive-2.0").length, 1048);

console.log({
  englishAdaptiveCoverage: "PASS",
  authoritativeIndicators: authoritative.length,
  competencies: specs.length,
  evidenceDesigns: specs.filter((s: any) => s.evidence).length,
  contentRecords: content.length,
});
