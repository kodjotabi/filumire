import {
  SUBJECT_GHANA_BASIC4_SCIENCE_ID,
  getCompetencyMappingsForNode,
  getCurriculumNodesForSubject,
  getSubjectCapability,
} from "../packages/curriculum-framework";

import {
  GHANA_B4_SCIENCE_ADAPTIVE_SPECS,
} from "../packages/curriculum/ghana-b4-science-adaptive";

import {
  getCompetency,
} from "../packages/curriculum";

function assert(
  condition: unknown,
  message: string,
): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

const nodes = getCurriculumNodesForSubject(
  SUBJECT_GHANA_BASIC4_SCIENCE_ID,
);

assert(
  nodes.length === 60,
  `Expected 60 B4 Science nodes, found ${nodes.length}.`,
);

const ids = nodes.map((node) => node.id);

assert(
  new Set(ids).size === ids.length,
  "B4 Science curriculum contains duplicate node IDs.",
);

const codes = nodes
  .map((node) => node.code)
  .filter((code): code is string => code !== undefined);

assert(
  new Set(codes).size === codes.length,
  "B4 Science curriculum contains duplicate curriculum codes.",
);

const verifiedStandardAndIndicatorCodes = [
  "B4.1.1.1",
  "B4.1.1.1.1",
  "B4.1.1.1.2",
  "B4.1.1.2",
  "B4.1.1.2.2",
  "B4.1.1.2.3",
  "B4.1.2.2",
  "B4.1.2.2.1",
  "B4.2.1.1",
  "B4.2.1.1.1",
  "B4.2.1.2",
  "B4.2.1.2.1",
  "B4.2.1.3",
  "B4.2.1.3.1",
  "B4.2.1.5",
  "B4.2.1.5.1",
  "B4.2.2.1",
  "B4.2.2.1.1",
  "B4.2.2.1.2",
  "B4.3.1.1",
  "B4.3.1.1.1",
  "B4.3.2.1",
  "B4.3.2.1.1",
  "B4.3.3.1",
  "B4.3.3.1.1",
  "B4.4.1.1",
  "B4.4.1.1.1",
  "B4.4.2.1",
  "B4.4.2.1.1",
  "B4.4.2.1.2",
  "B4.4.2.2",
  "B4.4.2.2.1",
  "B4.4.3.1",
  "B4.4.3.1.1",
  "B4.5.1.1",
  "B4.5.1.1.1",
  "B4.5.1.1.2",
  "B4.5.2.1",
  "B4.5.2.1.1",
  "B4.5.2.1.2",
  "B4.5.4.1",
  "B4.5.4.1.1",
];

assert(
  verifiedStandardAndIndicatorCodes.length === 42,
  "Verified B4 Science standard/indicator count must remain 42.",
);

for (const code of verifiedStandardAndIndicatorCodes) {
  assert(
    codes.includes(code),
    `Missing verified B4 Science curriculum code ${code}.`,
  );
}

const strands = nodes.filter(
  (node) => node.nodeType === "strand",
);

const subStrands = nodes.filter(
  (node) => node.nodeType === "sub_strand",
);

const indicators = nodes.filter(
  (node) => node.nodeType === "learning_indicator",
);

assert(
  strands.length === 5,
  `Expected 5 Science strands, found ${strands.length}.`,
);

assert(
  subStrands.length === 13,
  `Expected 13 Science sub-strands, found ${subStrands.length}.`,
);

assert(
  indicators.length === 24,
  `Expected 24 Science learning indicators, found ${indicators.length}.`,
);

for (const node of nodes) {
  if (!node.parentNodeId) {
    continue;
  }

  const parent = nodes.find(
    (candidate) => candidate.id === node.parentNodeId,
  );

  assert(
    parent,
    `Parent ${node.parentNodeId} for ${node.code ?? node.id} does not resolve.`,
  );

  assert(
    parent.subjectId === node.subjectId,
    `Parent for ${node.code ?? node.id} belongs to another subject.`,
  );
}

const forbiddenCodes = [
  "B4.1.1.2.1",
  "B4.1.2.1",
  "B4.2.1.4",
  "B4.2.4.1.2",
  "B4.4.3.2",
  "B4.5.3",
];

for (const code of forbiddenCodes) {
  assert(
    !codes.includes(code),
    `Unverified or non-B4 Science code ${code} must not be present.`,
  );
}

assert(
  GHANA_B4_SCIENCE_ADAPTIVE_SPECS.length === 24,
  `Expected 24 adaptive Science specifications, found ${GHANA_B4_SCIENCE_ADAPTIVE_SPECS.length}.`,
);

for (const spec of GHANA_B4_SCIENCE_ADAPTIVE_SPECS) {
  const node = indicators.find(
    (candidate) => candidate.code === spec.code,
  );

  assert(
    node,
    `No Science learning-indicator node exists for ${spec.code}.`,
  );

  const mappings =
    getCompetencyMappingsForNode(node.id);

  assert(
    mappings.length === 1,
    `Expected exactly one mapping for ${spec.code}, found ${mappings.length}.`,
  );

  assert(
    mappings[0]?.relationship === "direct",
    `${spec.code} must have a direct competency mapping.`,
  );

  assert(
    mappings[0]?.competencyId === spec.competencyId,
    `${spec.code} maps to the wrong competency.`,
  );

  assert(
    getCompetency(spec.competencyId) !== undefined,
    `Mapped competency ${spec.competencyId} does not exist.`,
  );
}

const capability = getSubjectCapability(
  SUBJECT_GHANA_BASIC4_SCIENCE_ID,
);

assert(
  capability?.status === "full",
  `Science capability must be full after complete validated B4 adaptive coverage; found ${capability?.status ?? "none"}.`,
);

console.log(
  "B4 Science curriculum integrity PASS: 60 nodes, 24 learning indicators, 24 direct adaptive mappings.",
);

export {};
