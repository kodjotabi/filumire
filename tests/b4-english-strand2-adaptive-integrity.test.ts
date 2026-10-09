import {
  GHANA_B4_ENGLISH_STRAND2_ADAPTIVE_SPECS,
} from "../packages/curriculum/ghana-b4-english-strand2-adaptive";

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
  condition: unknown,
  message: string,
): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

assert(
  GHANA_B4_ENGLISH_STRAND2_ADAPTIVE_SPECS.length === 32,
  "Expected exactly 32 Strand 2 adaptive specifications.",
);

assert(
  GHANA_B4_ENGLISH_PRODUCTION_SPECS.length >= 69,
  "Expected 69 total English production specifications.",
);

assert(
  GHANA_B4_ENGLISH_COMPETENCIES.length >= 69,
  "Expected 69 runtime English competencies.",
);

const codes = GHANA_B4_ENGLISH_STRAND2_ADAPTIVE_SPECS
  .map((spec) => spec.code);

assert(
  new Set(codes).size === 32,
  "Strand 2 contains duplicate curriculum indicator codes.",
);

for (const spec of GHANA_B4_ENGLISH_STRAND2_ADAPTIVE_SPECS) {
  assert(
    spec.code.startsWith("B4.2."),
    `Non-Strand-2 code found: ${spec.code}`,
  );

  assert(
    spec.subskills.length >= 3,
    `${spec.code} requires deliberate subskills.`,
  );

  assert(
    spec.misconceptions.length >= 3,
    `${spec.code} requires misconception/error patterns.`,
  );

  assert(
    spec.evidence.diagnosticTask.trim().length > 20,
    `${spec.code} diagnostic evidence is too weak.`,
  );

  assert(
    spec.evidence.reassessmentTask.trim().length > 20,
    `${spec.code} reassessment evidence is too weak.`,
  );

  assert(
    spec.evidence.retentionTask.trim().length > 20,
    `${spec.code} retention evidence is too weak.`,
  );

  assert(
    spec.evidence.transferTask.trim().length > 20,
    `${spec.code} transfer evidence is too weak.`,
  );

  assert(
    spec.evidence.successCriteria.length >= 3,
    `${spec.code} requires at least three success criteria.`,
  );

  const tasks = [
    spec.evidence.diagnosticTask,
    spec.evidence.reassessmentTask,
    spec.evidence.retentionTask,
    spec.evidence.transferTask,
  ];

  assert(
    new Set(tasks).size === 4,
    `${spec.code} reuses an evidence task across stages.`,
  );
}

const modeCounts = new Map<string, number>();

for (const spec of GHANA_B4_ENGLISH_STRAND2_ADAPTIVE_SPECS) {
  modeCounts.set(
    spec.responseMode,
    (modeCounts.get(spec.responseMode) ?? 0) + 1,
  );
}

const expectedModeCounts: Record<string, number> = {
  application: 11,
  classification: 3,
  constructed_response: 1,
  explanation: 6,
  matching: 1,
  oral_response: 5,
  sequence_ordering: 1,
  short_answer: 4,
};

for (const [mode, expected] of Object.entries(expectedModeCounts)) {
  assert(
    modeCounts.get(mode) === expected,
    `Expected ${expected} ${mode} Strand 2 competencies, found ${modeCounts.get(mode) ?? 0}.`,
  );
}

const strand2CompetencyIds = new Set(
  GHANA_B4_ENGLISH_STRAND2_ADAPTIVE_SPECS
    .map((spec) => spec.competencyId),
);

const strand2Content =
  GHANA_B4_ENGLISH_GENERATED_CONTENT.filter(
    (record) =>
      strand2CompetencyIds.has(record.competencyId),
  );

assert(
  strand2Content.length === 256,
  `Expected 256 Strand 2 content/evidence records, found ${strand2Content.length}.`,
);

for (const spec of GHANA_B4_ENGLISH_STRAND2_ADAPTIVE_SPECS) {
  const records = strand2Content.filter(
    (record) => record.competencyId === spec.competencyId,
  );

  assert(
    records.length === 8,
    `${spec.code} expected 8 adaptive records, found ${records.length}.`,
  );

  const purposes = records
    .filter((record) => record.type === "assessment")
    .map((record) => record.metadata?.assessmentPurpose)
    .sort();

  assert(
    JSON.stringify(purposes) ===
      JSON.stringify([
        "diagnostic",
        "reassessment",
        "retention",
        "transfer",
      ]),
    `${spec.code} is missing an adaptive evidence stage.`,
  );

  for (const record of records) {
    if (record.type !== "assessment") {
      continue;
    }

    assert(
      record.metadata?.evaluationMethod ===
        "trusted_rubric_evaluation",
      `${spec.code} assessment bypasses trusted evaluation.`,
    );

    assert(
      record.metadata?.expectedResponse ===
        "rubric_evaluated_performance",
      `${spec.code} exposes an ordinary expected response.`,
    );
  }
}

console.log({
  englishStrand2AdaptiveIntegrity: "PASS",
  strand2Competencies:
    GHANA_B4_ENGLISH_STRAND2_ADAPTIVE_SPECS.length,
  totalEnglishCompetencies:
    GHANA_B4_ENGLISH_PRODUCTION_SPECS.length,
  strand2AdaptiveRecords:
    strand2Content.length,
  modeCounts:
    Object.fromEntries(
      [...modeCounts.entries()].sort(),
    ),
});