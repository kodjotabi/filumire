import {
  GHANA_SCIENCE_B4_ANIMAL_CLASSIFICATION_COMPETENCY_ID,
  GHANA_SCIENCE_PILOT_SUBJECT_ID,
  getCompetency,
  getInitialCompetencyForCurriculumSubjectLevel,
} from "../packages/curriculum";

import {
  CURRICULUM_GHANA_ID,
  CURRICULUM_NODE_GH_B4_SCIENCE_1_1_1_1_1_ID,
  CURRICULUM_VERSION_GHANA_PILOT_V1_ID,
  GRADE_GHANA_BASIC_4_ID,
  SUBJECT_GHANA_BASIC4_SCIENCE_ID,
  getCompetencyMappingsForNode,
  getSubjectCapability,
  resolveCurriculumContext,
  getInitialCompetencyIdForResolvedContext,
} from "../packages/curriculum-framework";

import {
  getContentForCompetency,
} from "../services/content-store";

import {
  seedContent,
} from "../services/content-store/seed";

import {
  selectLearningContent,
} from "../services/content-selection";

import {
  evaluateAssessment,
} from "../services/assessment";

function assert(
  condition: unknown,
  message: string,
): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

async function main(): Promise<void> {
  seedContent();

  const competency = getCompetency(
    GHANA_SCIENCE_B4_ANIMAL_CLASSIFICATION_COMPETENCY_ID,
  );

  assert(
    competency,
    "Science adaptive competency must exist.",
  );

  assert(
    competency.subjectId ===
      GHANA_SCIENCE_PILOT_SUBJECT_ID,
    "Science competency must belong to Science.",
  );

  const resolved = resolveCurriculumContext(
    CURRICULUM_VERSION_GHANA_PILOT_V1_ID,
    GRADE_GHANA_BASIC_4_ID,
    SUBJECT_GHANA_BASIC4_SCIENCE_ID,
  );

  assert(
    resolved,
    "Science curriculum context must resolve.",
  );

  assert(
    getInitialCompetencyIdForResolvedContext(resolved) ===
      GHANA_SCIENCE_B4_ANIMAL_CLASSIFICATION_COMPETENCY_ID,
    "Science context must resolve to the Science adaptive competency.",
  );

  assert(
    getInitialCompetencyForCurriculumSubjectLevel(
      CURRICULUM_GHANA_ID,
      SUBJECT_GHANA_BASIC4_SCIENCE_ID,
      GRADE_GHANA_BASIC_4_ID,
    )?.id ===
      GHANA_SCIENCE_B4_ANIMAL_CLASSIFICATION_COMPETENCY_ID,
    "Legacy adaptive registry must resolve the Science initial competency.",
  );

  const mappings =
    getCompetencyMappingsForNode(
      CURRICULUM_NODE_GH_B4_SCIENCE_1_1_1_1_1_ID,
    );

  assert(
    mappings.some(
      (mapping) =>
        mapping.competencyId ===
          GHANA_SCIENCE_B4_ANIMAL_CLASSIFICATION_COMPETENCY_ID &&
        mapping.relationship === "direct",
    ),
    "NaCCA B4.1.1.1.1 must map directly to the Science competency.",
  );

  const capability =
    getSubjectCapability(
      SUBJECT_GHANA_BASIC4_SCIENCE_ID,
    );

  assert(
    capability?.status === "full",
    "Science capability must be full after complete adaptive coverage.",
  );

  const content =
    getContentForCompetency(
      GHANA_SCIENCE_B4_ANIMAL_CLASSIFICATION_COMPETENCY_ID,
      "en",
    );

  assert(
    content.length >= 8,
    `Expected at least 8 Science content records, received ${content.length}.`,
  );

  const purposes =
    content
      .map((item) => item.metadata?.assessmentPurpose ?? (item.type === "practice" ? "practice" : undefined))
      .filter(Boolean);

  for (const required of [
    "diagnostic",
    "practice",
    "reassessment",
    "retention",
    "transfer",
  ]) {
    assert(
      purposes.includes(required),
      `Missing Science assessment purpose: ${required}`,
    );
  }

  const learnerState = {
    learnerId: "learner-science-test",
    language: "en",
    competencies: [
      {
        competencyId:
          GHANA_SCIENCE_B4_ANIMAL_CLASSIFICATION_COMPETENCY_ID,
        strategyEvidence: [],
      },
    ],
  } as any;

  const diagnostic =
    selectLearningContent(
      learnerState,
      "diagnose",
    );

  assert(
    diagnostic?.metadata?.assessmentPurpose ===
      "diagnostic",
    "Diagnose must select the Science diagnostic assessment.",
  );

  const retention =
    selectLearningContent(
      learnerState,
      "retention_check",
    );

  assert(
    retention?.metadata?.assessmentPurpose ===
      "retention",
    "Retention check must select the Science retention assessment.",
  );

  const transfer =
    selectLearningContent(
      learnerState,
      "transfer_check",
    );

  assert(
    transfer?.metadata?.assessmentPurpose ===
      "transfer",
    "Transfer check must select the Science transfer assessment.",
  );

  assert(
    diagnostic?.assessmentItemId,
    "Diagnostic assessment item must exist.",
  );

  const evaluated =
    await evaluateAssessment(
      {
        learnerId: "learner-science-test",
        competencyId:
          GHANA_SCIENCE_B4_ANIMAL_CLASSIFICATION_COMPETENCY_ID,
        sessionId: "science-session-test",
        assessmentItemId:
          diagnostic.assessmentItemId,
        response: "Bird",
      } as any,
      diagnostic.metadata?.expectedResponse,
      diagnostic.id,
      diagnostic.metadata,
    );

  assert(
    evaluated.result.correct === false,
    "Bat classified as bird must be incorrect.",
  );

  assert(
    evaluated.evidence.diagnosticState ===
      "misconception",
    "Bat-as-bird response must diagnose a misconception.",
  );

  assert(
    evaluated.evidence.errorPattern ===
      "classifies_flying_animals_as_birds",
    "Bat-as-bird response must record the expected misconception pattern.",
  );

  console.log(
    "B4 Science adaptive slice PASS: authoritative mapping, competency, diagnosis, content, retention and transfer verified.",
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});