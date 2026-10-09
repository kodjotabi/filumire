import {
  GHANA_B4_ENGLISH_STRAND4_ADAPTIVE_SPECS,
} from "../packages/curriculum/ghana-b4-english-strand4-adaptive";

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
  GHANA_B4_ENGLISH_STRAND4_ADAPTIVE_SPECS.length === 21,
  "English Strand 4 must contain exactly 21 adaptive competencies.",
);

assert(
  GHANA_B4_ENGLISH_PRODUCTION_SPECS.length >= 114,
  "English production registry must contain 114 competencies after Strand 4.",
);

assert(
  GHANA_B4_ENGLISH_COMPETENCIES.length >= 114,
  "English runtime must expose 114 competencies after Strand 4.",
);

const strand4Ids =
  new Set(
    GHANA_B4_ENGLISH_STRAND4_ADAPTIVE_SPECS.map(
      (spec) => spec.competencyId,
    ),
  );

const strand4Content =
  GHANA_B4_ENGLISH_GENERATED_CONTENT.filter(
    (content) =>
      strand4Ids.has(content.competencyId),
  );

assert(
  strand4Content.length === 168,
  "English Strand 4 must generate exactly 168 adaptive content records.",
);

assert(
  GHANA_B4_ENGLISH_GENERATED_CONTENT.length >= 912,
  "English production content must contain 912 records after Strand 4.",
);

for (
  const spec of
  GHANA_B4_ENGLISH_STRAND4_ADAPTIVE_SPECS
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
  GHANA_B4_ENGLISH_STRAND4_ADAPTIVE_SPECS
) {
  modeCounts.set(
    spec.responseMode,
    (modeCounts.get(spec.responseMode) ?? 0) + 1,
  );
}

const expectedModes: Record<string, number> = {
  application: 3,
  classification: 1,
  constructed_response: 14,
  observed_performance: 2,
  sequence_ordering: 1,
};

for (
  const [mode, expectedCount] of
  Object.entries(expectedModes)
) {
  assert(
    modeCounts.get(mode) === expectedCount,
    `Expected ${expectedCount} Strand 4 ${mode} competencies, found ${modeCounts.get(mode) ?? 0}.`,
  );
}

console.log({
  englishStrand4AdaptiveIntegrity: "PASS",
  strand4Competencies:
    GHANA_B4_ENGLISH_STRAND4_ADAPTIVE_SPECS.length,
  totalEnglishCompetencies:
    GHANA_B4_ENGLISH_PRODUCTION_SPECS.length,
  strand4AdaptiveRecords:
    strand4Content.length,
  totalEnglishAdaptiveRecords:
    GHANA_B4_ENGLISH_GENERATED_CONTENT.length,
  modeCounts:
    Object.fromEntries(
      [...modeCounts.entries()].sort(),
    ),
});