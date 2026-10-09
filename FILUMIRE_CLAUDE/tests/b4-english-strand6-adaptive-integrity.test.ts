import {
  GHANA_B4_ENGLISH_STRAND6_ADAPTIVE_SPECS,
} from "../packages/curriculum/ghana-b4-english-strand6-adaptive";

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
  GHANA_B4_ENGLISH_STRAND6_ADAPTIVE_SPECS.length === 1,
  "English Strand 6 must contain exactly one adaptive competency.",
);

const spec =
  GHANA_B4_ENGLISH_STRAND6_ADAPTIVE_SPECS[0];

assert(
  spec.code === "B4.6.1.1.1",
  "English Strand 6 must contain verified indicator B4.6.1.1.1.",
);

assert(
  spec.responseMode === "constructed_response",
  "B4.6.1.1.1 must use constructed_response.",
);

assert(
  spec.evidence.profile === "written_summary",
  "B4.6.1.1.1 must use written_summary evidence.",
);

assert(
  spec.subskills.length >= 4,
  "B4.6.1.1.1 requires explicit subskills.",
);

assert(
  spec.misconceptions.length >= 3,
  "B4.6.1.1.1 requires explicit misconceptions.",
);

assert(
  spec.evidence.successCriteria.length >= 3,
  "B4.6.1.1.1 requires explicit success criteria.",
);

assert(
  spec.evidence.diagnosticTask.trim().length > 0,
  "B4.6.1.1.1 requires diagnostic evidence.",
);

assert(
  spec.evidence.reassessmentTask.trim().length > 0,
  "B4.6.1.1.1 requires reassessment evidence.",
);

assert(
  spec.evidence.retentionTask.trim().length > 0,
  "B4.6.1.1.1 requires retention evidence.",
);

assert(
  spec.evidence.transferTask.trim().length > 0,
  "B4.6.1.1.1 requires transfer evidence.",
);

assert(
  GHANA_B4_ENGLISH_PRODUCTION_SPECS.length === 131,
  "English production registry must contain 131 competencies after Strand 6.",
);

assert(
  GHANA_B4_ENGLISH_COMPETENCIES.length === 131,
  "English runtime must expose 131 competencies after Strand 6.",
);

const strand6Content =
  GHANA_B4_ENGLISH_GENERATED_CONTENT.filter(
    (record) =>
      record.competencyId === spec.competencyId,
  );

assert(
  strand6Content.length === 8,
  "English Strand 6 must generate exactly 8 adaptive content records.",
);

assert(
  GHANA_B4_ENGLISH_GENERATED_CONTENT.length === 1048,
  "English production content must contain 1048 records after Strand 6.",
);

const strand6Assessments =
  strand6Content.filter(
    (record) => record.type === "assessment",
  );

assert(
  strand6Assessments.length === 4,
  "English Strand 6 must contain diagnostic, reassessment, retention and transfer assessments.",
);

for (const assessment of strand6Assessments) {
  const metadata =
    assessment.metadata as
      | Record<string, unknown>
      | undefined;

  assert(
    metadata?.responseMode === "constructed_response",
    `${assessment.id} must preserve constructed_response evidence mode.`,
  );

  assert(
    metadata?.evidenceProfile === "written_summary",
    `${assessment.id} must preserve written_summary evidence profile.`,
  );

  assert(
    metadata?.evaluationMethod ===
      "trusted_rubric_evaluation",
    `${assessment.id} must require trusted rubric evaluation.`,
  );

  assert(
    metadata?.expectedResponse ===
      "rubric_evaluated_performance",
    `${assessment.id} must not expose an ordinary client-submittable correct answer.`,
  );
}

console.log({
  englishStrand6AdaptiveIntegrity: "PASS",
  strand6Competencies:
    GHANA_B4_ENGLISH_STRAND6_ADAPTIVE_SPECS.length,
  totalEnglishCompetencies:
    GHANA_B4_ENGLISH_PRODUCTION_SPECS.length,
  strand6AdaptiveRecords:
    strand6Content.length,
  strand6Assessments:
    strand6Assessments.length,
  totalEnglishAdaptiveRecords:
    GHANA_B4_ENGLISH_GENERATED_CONTENT.length,
  responseMode:
    spec.responseMode,
  evidenceProfile:
    spec.evidence.profile,
  trustedEvaluationBoundary:
    "PASS",
});