import assert from "node:assert/strict";

import { GHANA_B4_MATHEMATICS_ADAPTIVE_SPECS } from "../packages/curriculum/ghana-b4-mathematics-adaptive";

assert.equal(
  GHANA_B4_MATHEMATICS_ADAPTIVE_SPECS.length,
  64,
  "Expected 64 Mathematics adaptive competencies",
);

const competencyIds = new Set<string>();

for (const spec of GHANA_B4_MATHEMATICS_ADAPTIVE_SPECS) {
  assert.ok(
    !competencyIds.has(spec.competencyId),
    `Duplicate competency: ${spec.competencyId}`,
  );
  competencyIds.add(spec.competencyId);

  assert.ok(
    spec.evidence,
    `Missing evidence design: ${spec.competencyId}`,
  );

  const evidence = spec.evidence!;

  const directIndicators = spec.indicatorMappings
    .filter((mapping) => mapping.relationship === "direct")
    .map((mapping) => mapping.code)
    .sort();

  const evidenceIndicators = [...evidence.targetIndicatorCodes].sort();

  assert.deepEqual(
    evidenceIndicators,
    directIndicators,
    `Evidence indicator mismatch: ${spec.competencyId}`,
  );

  assert.deepEqual(
    [...evidence.targetSubskills].sort(),
    [...spec.subskills].sort(),
    `Evidence subskill mismatch: ${spec.competencyId}`,
  );

  assert.ok(evidence.diagnosticTask.trim().length > 0);
  assert.ok(evidence.reassessmentTask.trim().length > 0);
  assert.ok(evidence.retentionTask.trim().length > 0);
  assert.ok(evidence.transferTask.trim().length > 0);
  assert.ok(evidence.successCriteria.length > 0);
}

console.log({
  mathematicsEvidenceIntegrity: "PASS",
  competencies: GHANA_B4_MATHEMATICS_ADAPTIVE_SPECS.length,
  competenciesWithEvidence:
    GHANA_B4_MATHEMATICS_ADAPTIVE_SPECS.filter((spec) => spec.evidence).length,
});
