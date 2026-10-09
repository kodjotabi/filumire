import {
  GHANA_B4_ENGLISH_STRAND5_ADAPTIVE_SPECS,
} from "../packages/curriculum/ghana-b4-english-strand5-adaptive";

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
  GHANA_B4_ENGLISH_STRAND5_ADAPTIVE_SPECS.length === 16,
  "English Strand 5 must contain exactly 16 adaptive competencies.",
);

const expectedCodes = [
  "B4.5.2.1.1",
  "B4.5.3.1.1",
  "B4.5.3.1.2",
  "B4.5.3.1.3",
  "B4.5.3.1.4",
  "B4.5.4.1.1",
  "B4.5.4.1.2",
  "B4.5.4.1.3",
  "B4.5.5.1.1",
  "B4.5.5.1.2",
  "B4.5.6.1.1",
  "B4.5.7.1.1",
  "B4.5.8.1.1",
  "B4.5.9.1.1",
  "B4.5.9.1.2",
  "B4.5.10.1.1",
];

assert(
  JSON.stringify(
    GHANA_B4_ENGLISH_STRAND5_ADAPTIVE_SPECS.map(
      (spec) => spec.code,
    ),
  ) === JSON.stringify(expectedCodes),
  "English Strand 5 indicator inventory does not match the verified 16-code manifest.",
);

assert(
  GHANA_B4_ENGLISH_PRODUCTION_SPECS.length >= 130,
  "English production registry must contain 130 competencies after Strand 5.",
);

assert(
  GHANA_B4_ENGLISH_COMPETENCIES.length >= 130,
  "English runtime must expose 130 competencies after Strand 5.",
);

const strand5Ids = new Set(
  GHANA_B4_ENGLISH_STRAND5_ADAPTIVE_SPECS.map(
    (spec) => spec.competencyId,
  ),
);

const strand5Content =
  GHANA_B4_ENGLISH_GENERATED_CONTENT.filter(
    (record) => strand5Ids.has(record.competencyId),
  );

assert(
  strand5Content.length === 128,
  "English Strand 5 must produce exactly 128 adaptive content records.",
);

assert(
  GHANA_B4_ENGLISH_GENERATED_CONTENT.length >= 1040,
  "English production content must contain 1040 records after Strand 5.",
);

const modeCounts = new Map<string, number>();

for (const spec of GHANA_B4_ENGLISH_STRAND5_ADAPTIVE_SPECS) {
  modeCounts.set(
    spec.responseMode,
    (modeCounts.get(spec.responseMode) ?? 0) + 1,
  );

  assert(
    spec.subskills.length >= 4,
    `${spec.code} requires explicit subskills.`,
  );

  assert(
    spec.misconceptions.length >= 3,
    `${spec.code} requires explicit misconceptions.`,
  );

  assert(
    spec.evidence.successCriteria.length >= 3,
    `${spec.code} requires explicit success criteria.`,
  );

  assert(
    spec.evidence.diagnosticTask.trim().length > 0,
    `${spec.code} requires diagnostic evidence.`,
  );

  assert(
    spec.evidence.reassessmentTask.trim().length > 0,
    `${spec.code} requires reassessment evidence.`,
  );

  assert(
    spec.evidence.retentionTask.trim().length > 0,
    `${spec.code} requires retention evidence.`,
  );

  assert(
    spec.evidence.transferTask.trim().length > 0,
    `${spec.code} requires transfer evidence.`,
  );
}

assert(
  modeCounts.get("application") === 9,
  `Expected 9 application competencies, found ${
    modeCounts.get("application") ?? 0
  }.`,
);

assert(
  modeCounts.get("classification") === 7,
  `Expected 7 classification competencies, found ${
    modeCounts.get("classification") ?? 0
  }.`,
);

assert(
  modeCounts.size === 2,
  "Strand 5 must use only the two response modes verified in the adaptive manifest.",
);

console.log({
  englishStrand5AdaptiveIntegrity: "PASS",
  strand5Competencies:
    GHANA_B4_ENGLISH_STRAND5_ADAPTIVE_SPECS.length,
  totalEnglishCompetencies:
    GHANA_B4_ENGLISH_PRODUCTION_SPECS.length,
  strand5AdaptiveRecords:
    strand5Content.length,
  totalEnglishAdaptiveRecords:
    GHANA_B4_ENGLISH_GENERATED_CONTENT.length,
  modeCounts: Object.fromEntries(
    [...modeCounts.entries()].sort(),
  ),
});