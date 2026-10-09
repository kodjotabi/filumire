import {
  GHANA_B4_ENGLISH_STRAND3_ADAPTIVE_SPECS,
} from "../packages/curriculum/ghana-b4-english-strand3-adaptive";

import {
  GHANA_B4_ENGLISH_PRODUCTION_SPECS,
} from "../packages/curriculum/ghana-b4-english-production";

import {
  GHANA_B4_ENGLISH_COMPETENCIES,
} from "../packages/curriculum/ghana-b4-english-runtime";

import {
  GHANA_B4_ENGLISH_GENERATED_CONTENT,
} from "../services/content-store/ghana-b4-english-content";

function assert(
  condition: boolean,
  message: string,
): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

assert(
  GHANA_B4_ENGLISH_STRAND3_ADAPTIVE_SPECS.length === 24,
  "English Strand 3 must contain exactly 24 adaptive competencies.",
);

assert(
  GHANA_B4_ENGLISH_PRODUCTION_SPECS.length >= 93,
  "English production registry must retain at least the 93 competencies established through Strand 3.",
);

assert(
  GHANA_B4_ENGLISH_COMPETENCIES.length >= 93,
  "English runtime must retain at least the 93 competencies established through Strand 3.",
);

const strand3Ids =
  new Set(
    GHANA_B4_ENGLISH_STRAND3_ADAPTIVE_SPECS.map(
      (spec) => spec.competencyId,
    ),
  );

const strand3Content =
  GHANA_B4_ENGLISH_GENERATED_CONTENT.filter(
    (content) =>
      strand3Ids.has(content.competencyId),
  );

assert(
  strand3Content.length === 192,
  "English Strand 3 must generate exactly 192 adaptive content records.",
);

assert(
  GHANA_B4_ENGLISH_GENERATED_CONTENT.length >= 744,
  "English production content must retain at least the 744 records established through Strand 3.",
);

for (
  const spec of
  GHANA_B4_ENGLISH_STRAND3_ADAPTIVE_SPECS
) {
  assert(
    spec.evidence.diagnosticTask.trim().length > 0,
    `${spec.code} is missing diagnostic evidence design.`,
  );

  assert(
    spec.evidence.reassessmentTask.trim().length > 0,
    `${spec.code} is missing reassessment evidence design.`,
  );

  assert(
    spec.evidence.retentionTask.trim().length > 0,
    `${spec.code} is missing retention evidence design.`,
  );

  assert(
    spec.evidence.transferTask.trim().length > 0,
    `${spec.code} is missing transfer evidence design.`,
  );

  assert(
    spec.evidence.successCriteria.length >= 3,
    `${spec.code} requires explicit success criteria.`,
  );

  assert(
    spec.subskills.length >= 4,
    `${spec.code} requires explicit subskills.`,
  );

  assert(
    spec.misconceptions.length >= 3,
    `${spec.code} requires explicit misconceptions.`,
  );
}

const modeCounts =
  new Map<string, number>();

for (
  const spec of
  GHANA_B4_ENGLISH_STRAND3_ADAPTIVE_SPECS
) {
  modeCounts.set(
    spec.responseMode,
    (modeCounts.get(spec.responseMode) ?? 0) + 1,
  );
}

const expectedModes: Record<string, number> = {
  application: 10,
  classification: 11,
  constructed_response: 1,
  observed_performance: 2,
};

for (
  const [mode, expectedCount] of
  Object.entries(expectedModes)
) {
  assert(
    modeCounts.get(mode) === expectedCount,
    `Expected ${expectedCount} Strand 3 ${mode} competencies, found ${modeCounts.get(mode) ?? 0}.`,
  );
}

console.log({
  englishStrand3AdaptiveIntegrity: "PASS",
  strand3Competencies:
    GHANA_B4_ENGLISH_STRAND3_ADAPTIVE_SPECS.length,
  totalEnglishCompetencies:
    GHANA_B4_ENGLISH_PRODUCTION_SPECS.length,
  strand3AdaptiveRecords:
    strand3Content.length,
  totalEnglishAdaptiveRecords:
    GHANA_B4_ENGLISH_GENERATED_CONTENT.length,
  modeCounts:
    Object.fromEntries(
      [...modeCounts.entries()].sort(),
    ),
});