import assert from "node:assert/strict";

import { GHANA_B4_COMPUTING_ADAPTIVE_SPECS } from "../packages/curriculum/ghana-b4-computing-adaptive";
import {
  GHANA_B4_COMPUTING_COMPETENCIES,
  GHANA_B4_COMPUTING_INDICATORS,
  GHANA_B4_COMPUTING_STANDARDS,
  GHANA_B4_COMPUTING_STRANDS,
  GHANA_B4_COMPUTING_SUBSTRANDS,
} from "../packages/curriculum/ghana-b4-computing-runtime";
import { getGhanaB4ComputingNodes } from "../packages/curriculum-framework/ghana-b4-computing";

const SUBJECT_ID = "subject-gh-basic4-computing-pilot";

const nodes = getGhanaB4ComputingNodes(SUBJECT_ID);

const strandNodes = nodes.filter((node) => node.nodeType === "strand");
const subStrandNodes = nodes.filter((node) => node.nodeType === "sub_strand");
const standardNodes = nodes.filter(
  (node) => node.nodeType === "content_standard",
);
const indicatorNodes = nodes.filter(
  (node) => node.nodeType === "learning_indicator",
);

assert.equal(GHANA_B4_COMPUTING_ADAPTIVE_SPECS.length, 27);
assert.equal(GHANA_B4_COMPUTING_COMPETENCIES.length, 27);
assert.equal(GHANA_B4_COMPUTING_INDICATORS.length, 27);
assert.equal(GHANA_B4_COMPUTING_STANDARDS.length, 7);
assert.equal(GHANA_B4_COMPUTING_SUBSTRANDS.length, 6);
assert.equal(GHANA_B4_COMPUTING_STRANDS.length, 3);

assert.equal(nodes.length, 43);
assert.equal(strandNodes.length, 3);
assert.equal(subStrandNodes.length, 6);
assert.equal(standardNodes.length, 7);
assert.equal(indicatorNodes.length, 27);

const indicatorCodes = new Set(indicatorNodes.map((node) => node.code));

for (const spec of GHANA_B4_COMPUTING_ADAPTIVE_SPECS) {
  const directMappings = spec.indicatorMappings.filter(
    (mapping) => mapping.relationship === "direct",
  );

  assert.equal(
    directMappings.length,
    1,
    `${spec.competencyId} must have exactly one direct indicator mapping`,
  );

  assert.ok(
    indicatorCodes.has(directMappings[0].code),
    `Missing curriculum node for ${directMappings[0].code}`,
  );

  assert.ok(spec.subskills.length > 0);
  assert.ok(spec.misconceptions.length > 0);
  assert.ok(spec.difficulty > 0);
}

const competencyIds = new Set(
  GHANA_B4_COMPUTING_COMPETENCIES.map((competency) => competency.id),
);

for (const spec of GHANA_B4_COMPUTING_ADAPTIVE_SPECS) {
  assert.ok(
    competencyIds.has(spec.competencyId),
    `Missing runtime competency ${spec.competencyId}`,
  );

  for (const prerequisiteId of spec.prerequisiteCompetencyIds) {
    assert.ok(
      competencyIds.has(prerequisiteId),
      `Missing prerequisite ${prerequisiteId}`,
    );
  }

  for (const relatedId of spec.relatedCompetencyIds) {
    assert.ok(
      competencyIds.has(relatedId),
      `Missing related competency ${relatedId}`,
    );
  }
}

console.log({
  computingCurriculumIntegrity: "PASS",
  strands: strandNodes.length,
  subStrands: subStrandNodes.length,
  standards: standardNodes.length,
  indicators: indicatorNodes.length,
  competencies: GHANA_B4_COMPUTING_COMPETENCIES.length,
  totalFrameworkNodes: nodes.length,
});
