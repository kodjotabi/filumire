import {
  GHANA_B4_COMPUTING_ADAPTIVE_SPECS,
} from "../packages/curriculum/ghana-b4-computing-adaptive";

import {
  GHANA_COMPUTING_PILOT_SUBJECT_ID,
  getAllCompetencies,
} from "../packages/curriculum";

import {
  SUBJECT_GHANA_BASIC4_COMPUTING_ID,
  getCompetencyMappingsForNode,
  getCurriculumNodesForSubject,
  getSubjectCapability,
} from "../packages/curriculum-framework";

import {
  GHANA_B4_COMPUTING_GENERATED_CONTENT,
} from "../services/content-store/ghana-b4-computing-content";

import {
  getContentForCompetency,
} from "../services/content-store";

import {
  seedContent,
} from "../services/content-store/seed";

function assert(
  condition: unknown,
  message: string,
): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

seedContent();

assert(
  GHANA_B4_COMPUTING_ADAPTIVE_SPECS.length === 27,
  `Expected 27 adaptive Computing specs, found ${GHANA_B4_COMPUTING_ADAPTIVE_SPECS.length}.`,
);

const computingCompetencies =
  getAllCompetencies().filter(
    (competency) =>
      competency.subjectId === GHANA_COMPUTING_PILOT_SUBJECT_ID,
  );

assert(
  computingCompetencies.length === 27,
  `Expected 27 Computing competencies, found ${computingCompetencies.length}.`,
);

const computingNodes = getCurriculumNodesForSubject(
  SUBJECT_GHANA_BASIC4_COMPUTING_ID,
);

const indicatorNodes = computingNodes.filter(
  (node) => node.nodeType === "learning_indicator",
);

assert(
  indicatorNodes.length === 27,
  `Expected 27 Computing learning indicators, found ${indicatorNodes.length}.`,
);

let totalContent = 0;

for (const spec of GHANA_B4_COMPUTING_ADAPTIVE_SPECS) {
  const directMapping = spec.indicatorMappings.find(
    (mapping) => mapping.relationship === "direct",
  );

  assert(
    directMapping,
    `${spec.competencyId} must have a direct indicator mapping.`,
  );

  const code = directMapping.code;

  const competency = computingCompetencies.find(
    (candidate) => candidate.id === spec.competencyId,
  );

  assert(
    competency,
    `Computing competency missing: ${spec.competencyId}.`,
  );

  assert(
    competency.masteryRequirements.masteryThreshold === 0.8,
    `${spec.competencyId} mastery threshold must be 0.8.`,
  );

  assert(
    competency.masteryRequirements.confidenceThreshold === 0.8,
    `${spec.competencyId} confidence threshold must be 0.8.`,
  );

  assert(
    competency.retentionRequirements.required === true &&
      competency.retentionRequirements.confidenceThreshold === 0.8,
    `${spec.competencyId} retention requirement is incomplete.`,
  );

  assert(
    competency.transferRequirements.required === true &&
      competency.transferRequirements.confidenceThreshold === 0.8,
    `${spec.competencyId} transfer requirement is incomplete.`,
  );

  const node = indicatorNodes.find(
    (candidate) => candidate.code === code,
  );

  assert(
    node,
    `Learning-indicator node missing for ${code}.`,
  );

  const mappings =
    getCompetencyMappingsForNode(node.id);

  assert(
    mappings.length === 1 &&
      mappings[0]?.competencyId === spec.competencyId &&
      mappings[0]?.relationship === "direct",
    `${code} must map directly and uniquely to ${spec.competencyId}.`,
  );

  const content =
    getContentForCompetency(spec.competencyId, "en");

  totalContent += content.length;

  assert(
    content.length >= 8,
    `${spec.competencyId} must have at least 8 adaptive content records; found ${content.length}.`,
  );

  const diagnostic = content.find(
    (item) =>
      item.metadata?.assessmentPurpose === "diagnostic",
  );

  const reassessment = content.find(
    (item) =>
      item.metadata?.assessmentPurpose === "reassessment",
  );

  const retention = content.find(
    (item) =>
      item.metadata?.assessmentPurpose === "retention",
  );

  const transfer = content.find(
    (item) =>
      item.metadata?.assessmentPurpose === "transfer",
  );

  assert(
    diagnostic &&
      reassessment &&
      retention &&
      transfer,
    `${spec.competencyId} is missing required adaptive assessment evidence.`,
  );

  assert(
    diagnostic.assessmentItemId &&
      reassessment.assessmentItemId &&
      retention.assessmentItemId &&
      transfer.assessmentItemId,
    `${spec.competencyId} assessment IDs are incomplete.`,
  );

  assert(
    new Set([
      diagnostic.assessmentItemId,
      reassessment.assessmentItemId,
      retention.assessmentItemId,
      transfer.assessmentItemId,
    ]).size === 4,
    `${spec.competencyId} assessment IDs must be distinct.`,
  );

  assert(
    new Set([
      diagnostic.body,
      reassessment.body,
      retention.body,
      transfer.body,
    ]).size === 4,
    `${spec.competencyId} diagnostic, reassessment, retention and transfer evidence must be distinct.`,
  );

  assert(
    diagnostic.metadata?.diagnosticRules,
    `${spec.competencyId} diagnostic content must contain misconception-linked diagnostic rules.`,
  );
}

assert(
  totalContent >= 216,
  `Expected at least 216 total B4 Computing content records, found ${totalContent}.`,
);

assert(
  GHANA_B4_COMPUTING_GENERATED_CONTENT.length === 216,
  `Expected 216 generated Computing records, found ${GHANA_B4_COMPUTING_GENERATED_CONTENT.length}.`,
);

const capability = getSubjectCapability(
  SUBJECT_GHANA_BASIC4_COMPUTING_ID,
);

assert(
  capability?.status === "full",
  `Computing subject capability must be full, found ${capability?.status ?? "none"}.`,
);

console.log(
  "B4 Computing adaptive coverage PASS: 27 competencies, 27 mappings, 216 content records, mastery + retention + transfer evidence verified.",
);

export {};
