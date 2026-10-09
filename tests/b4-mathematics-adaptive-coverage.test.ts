import assert from "node:assert/strict";

import {
  SUBJECT_GHANA_BASIC4_MATH_ID,
  getCurriculumNodesForSubject,
} from "../packages/curriculum-framework";

import {
  GHANA_B4_MATHEMATICS_ADAPTIVE_SPECS,
} from "../packages/curriculum/ghana-b4-mathematics-adaptive";

const nodes = getCurriculumNodesForSubject(
  SUBJECT_GHANA_BASIC4_MATH_ID,
);

const indicators = nodes.filter(
  (node: any) => node.nodeType === "learning_indicator",
);

const officialCodes = indicators
  .map((node: any) => node.code)
  .sort();

const mappedCodes = GHANA_B4_MATHEMATICS_ADAPTIVE_SPECS
  .flatMap((spec: any) =>
    spec.indicatorMappings.map((mapping: any) => mapping.code),
  )
  .sort();

const officialSet = new Set(officialCodes);
const mappedSet = new Set(mappedCodes);

const missing = officialCodes.filter(
  (code) => !mappedSet.has(code),
);

const extra = [...mappedSet].filter(
  (code) => !officialSet.has(code),
);

const duplicateMappings = mappedCodes.filter(
  (code, index) => mappedCodes.indexOf(code) !== index,
);

assert.equal(
  officialCodes.length,
  71,
  `Expected 71 official B4 Mathematics learning indicators, found ${officialCodes.length}.`,
);

assert.equal(
  GHANA_B4_MATHEMATICS_ADAPTIVE_SPECS.length,
  64,
  `Expected 64 B4 Mathematics adaptive specs, found ${GHANA_B4_MATHEMATICS_ADAPTIVE_SPECS.length}.`,
);

assert.equal(
  mappedCodes.length,
  71,
  `Expected 71 adaptive indicator mappings, found ${mappedCodes.length}.`,
);

assert.deepEqual(
  missing,
  [],
  `Official Mathematics indicators are missing adaptive mappings: ${missing.join(", ")}`,
);

assert.deepEqual(
  extra,
  [],
  `Adaptive Mathematics mappings reference non-official indicators: ${extra.join(", ")}`,
);

assert.deepEqual(
  [...new Set(duplicateMappings)],
  [],
  `Duplicate Mathematics indicator mappings found: ${[
    ...new Set(duplicateMappings),
  ].join(", ")}`,
);

console.log(
  `B4 Mathematics adaptive mapping coverage PASS: ${officialCodes.length} official indicators, ${GHANA_B4_MATHEMATICS_ADAPTIVE_SPECS.length} competencies, ${mappedCodes.length} direct indicator mappings.`,
);
