import assert from "node:assert/strict";

import {
  CURRICULUM_NODE_GH_B4_2_1_1_1_ID,
  CURRICULUM_NODE_GH_B4_2_1_1_2_ID,
  CURRICULUM_NODE_GH_B4_2_1_3_1_ID,
  CURRICULUM_NODE_GH_B4_2_1_3_2_ID,
  CURRICULUM_NODE_GH_PATTERNS_001_ID,
  CURRICULUM_NODE_GH_PATTERNS_002_ID,
  CURRICULUM_NODE_GH_PATTERNS_003_ID,
  SUBJECT_GHANA_BASIC4_MATH_ID,
  getCompetencyMappingsForCompetency,
  getCurriculumNode,
  getCurriculumNodesForSubject,
} from "../packages/curriculum-framework";

const nodes = getCurriculumNodesForSubject(
  SUBJECT_GHANA_BASIC4_MATH_ID,
);

assert.ok(
  nodes.length > 0,
  "Basic 4 Mathematics must contain curriculum nodes.",
);

/*
 * Node IDs must be globally unique within the subject.
 */
const nodeIds = nodes.map((node) => node.id);

assert.equal(
  new Set(nodeIds).size,
  nodeIds.length,
  "Basic 4 Mathematics contains duplicate curriculum-node IDs.",
);

/*
 * Official curriculum codes must be unique.
 * Legacy compatibility nodes have no official NaCCA code.
 */
const codedNodes = nodes.filter(
  (node) => node.code !== undefined,
);

const codes = codedNodes.map((node) => node.code as string);

assert.equal(
  new Set(codes).size,
  codes.length,
  "Basic 4 Mathematics contains duplicate NaCCA curriculum codes.",
);

/*
 * Every parent reference must resolve to an existing node
 * belonging to the same subject.
 */
const nodesById = new Map(
  nodes.map((node) => [node.id, node]),
);

for (const node of nodes) {
  if (!node.parentNodeId) {
    continue;
  }

  const parent = nodesById.get(node.parentNodeId);

  assert.ok(
    parent,
    `Missing parent ${node.parentNodeId} for ${node.id}.`,
  );

  assert.equal(
    parent.subjectId,
    node.subjectId,
    `Parent subject mismatch for ${node.id}.`,
  );
}

/*
 * Existing stable Algebra IDs must remain unchanged.
 */
assert.equal(
  CURRICULUM_NODE_GH_B4_2_1_1_1_ID,
  "node-gh-b4-math-b4.2.1.1.1",
);

assert.equal(
  CURRICULUM_NODE_GH_B4_2_1_1_2_ID,
  "node-gh-b4-math-b4.2.1.1.2",
);

assert.equal(
  CURRICULUM_NODE_GH_B4_2_1_3_1_ID,
  "node-gh-b4-math-b4.2.1.3.1",
);

assert.equal(
  CURRICULUM_NODE_GH_B4_2_1_3_2_ID,
  "node-gh-b4-math-b4.2.1.3.2",
);

/*
 * The previously omitted official B4.2.1.2 branch
 * must now be represented.
 */
assert.ok(
  codedNodes.some(
    (node) => node.code === "B4.2.1.2",
  ),
  "Missing official curriculum node B4.2.1.2.",
);

assert.ok(
  codedNodes.some(
    (node) => node.code === "B4.2.1.2.1",
  ),
  "Missing official learning indicator B4.2.1.2.1.",
);

assert.ok(
  codedNodes.some(
    (node) => node.code === "B4.2.1.2.2",
  ),
  "Missing official learning indicator B4.2.1.2.2.",
);

/*
 * B4.1.3.2.2 was not present in the recovered
 * authoritative source extraction. It must not be invented.
 */
assert.equal(
  codedNodes.some(
    (node) => node.code === "B4.1.3.2.2",
  ),
  false,
  "B4.1.3.2.2 must not be fabricated.",
);

/*
 * B4.4.1.2 is known to exist, but its official
 * content-standard wording was not recovered.
 */
const unresolvedB4412 = codedNodes.find(
  (node) => node.code === "B4.4.1.2",
);

assert.ok(
  unresolvedB4412,
  "Known curriculum code B4.4.1.2 must be represented.",
);

assert.equal(
  unresolvedB4412.title,
  "Construct and interpret pictographs and bar graphs involving many-to-one correspondence to draw conclusions.",
);

/*
 * Legacy pilot nodes must remain available for compatibility.
 */
assert.ok(
  getCurriculumNode(
    CURRICULUM_NODE_GH_PATTERNS_001_ID,
  ),
);

assert.ok(
  getCurriculumNode(
    CURRICULUM_NODE_GH_PATTERNS_002_ID,
  ),
);

assert.ok(
  getCurriculumNode(
    CURRICULUM_NODE_GH_PATTERNS_003_ID,
  ),
);

/*
 * Historical adaptive competency mappings must remain intact.
 */
const competency001Mappings =
  getCompetencyMappingsForCompetency(
    "competency-gh-math-b4-number-patterns-001",
  );

assert.ok(
  competency001Mappings.some(
    (mapping) =>
      mapping.curriculumNodeId ===
        CURRICULUM_NODE_GH_B4_2_1_1_2_ID &&
      mapping.relationship === "direct",
  ),
  "Competency 001 must retain its direct NaCCA mapping.",
);

assert.ok(
  competency001Mappings.some(
    (mapping) =>
      mapping.curriculumNodeId ===
        CURRICULUM_NODE_GH_B4_2_1_3_2_ID &&
      mapping.relationship === "supports",
  ),
  "Competency 001 must retain its supporting NaCCA mapping.",
);

const competency002Mappings =
  getCompetencyMappingsForCompetency(
    "competency-gh-math-b4-number-patterns-002",
  );

assert.ok(
  competency002Mappings.some(
    (mapping) =>
      mapping.curriculumNodeId ===
        CURRICULUM_NODE_GH_B4_2_1_1_1_ID &&
      mapping.relationship === "direct",
  ),
  "Competency 002 must retain its direct NaCCA mapping.",
);

const competency003Mappings =
  getCompetencyMappingsForCompetency(
    "competency-gh-math-b4-number-patterns-003",
  );

assert.ok(
  competency003Mappings.some(
    (mapping) =>
      mapping.curriculumNodeId ===
        CURRICULUM_NODE_GH_B4_2_1_3_2_ID &&
      mapping.relationship === "direct",
  ),
  "Competency 003 must retain its direct NaCCA mapping.",
);

assert.ok(
  competency003Mappings.some(
    (mapping) =>
      mapping.curriculumNodeId ===
        CURRICULUM_NODE_GH_B4_2_1_3_1_ID &&
      mapping.relationship === "supports",
  ),
  "Competency 003 must retain its supporting NaCCA mapping.",
);

console.log(
  `B4 curriculum integrity PASS: ${nodes.length} nodes, ${codedNodes.length} coded nodes.`,
);
