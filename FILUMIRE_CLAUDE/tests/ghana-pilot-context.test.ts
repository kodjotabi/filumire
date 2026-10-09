import {
  GHANA_MATH_PILOT_CURRICULUM_ID,
  GHANA_MATH_PILOT_INITIAL_COMPETENCY_ID,
  getAllCompetencies,
  getCompetency,
  getCurriculumFramework,
  getEducationSystem,
} from "../packages/curriculum";
import { getContentForCompetency } from "../services/content-store";
import { seedContent } from "../services/content-store/seed";

function assert(
  condition: boolean,
  message: string,
): void {
  if (!condition) {
    throw new Error(`FAIL: ${message}`);
  }
}

const LOCAL_CONTEXT_MARKERS = [
  "cedi",
  "cedis",
  "market",
  "trader",
  "trotro",
  "shopkeeper",
  "basket",
];

async function runGhanaPilotContextTest(): Promise<void> {
  seedContent();

  // The pilot must remain explicit that it is not official
  // curriculum alignment.
  const educationSystem = getEducationSystem(
    "education-system-gh-basic-pilot",
  );

  assert(
    Boolean(
      educationSystem?.description
        ?.toLowerCase()
        .includes("not official curriculum alignment"),
    ),
    "Ghana pilot education system must preserve the pilot-authored, non-official disclaimer",
  );

  const framework = getCurriculumFramework(
    GHANA_MATH_PILOT_CURRICULUM_ID,
  );

  assert(
    framework?.countryOrRegion === "Ghana",
    "Ghana pilot curriculum framework must remain scoped to Ghana",
  );

  console.log({
    test: "pilot-authored/non-official status preserved",
    result: "PASS",
  });

  // Mathematical competency/content grounding must remain
  // valid: every Ghana pilot competency must resolve real
  // content with a trusted expected response where it is an
  // assessment.
  const ghanaCompetencies = getAllCompetencies().filter(
    (competency) =>
      competency.curriculumFrameworkId ===
      GHANA_MATH_PILOT_CURRICULUM_ID,
  );

  assert(
    ghanaCompetencies.length >= 3,
    "Ghana pilot curriculum must define its pilot competencies",
  );

  let localContextItemCount = 0;
  let assessmentItemCount = 0;

  for (const competency of ghanaCompetencies) {
    const content = getContentForCompetency(
      competency.id,
    );

    assert(
      content.length > 0,
      `Ghana pilot competency ${competency.id} must have content`,
    );

    for (const item of content) {
      if (item.assessmentItemId) {
        assessmentItemCount += 1;

        assert(
          typeof item.metadata?.expectedResponse ===
            "string" &&
            item.metadata.expectedResponse.length > 0,
          `assessment content ${item.id} must have a trusted expected response`,
        );
      }

      const lowerBody = item.body.toLowerCase();

      if (
        LOCAL_CONTEXT_MARKERS.some((marker) =>
          lowerBody.includes(marker),
        )
      ) {
        localContextItemCount += 1;
      }
    }
  }

  assert(
    assessmentItemCount > 0,
    "Ghana pilot competencies must include real assessment content",
  );

  console.log({
    test: "mathematical competency/content grounding remains valid",
    assessmentItemCount,
    result: "PASS",
  });

  // At least some, but not all, pilot content should use
  // locally intelligible context - the concept must remain
  // primary rather than context being forced everywhere.
  const totalItems = ghanaCompetencies.reduce(
    (count, competency) =>
      count +
      getContentForCompetency(competency.id).length,
    0,
  );

  assert(
    localContextItemCount > 0,
    "Ghana pilot content must include legitimate locally contextualised examples",
  );
  assert(
    localContextItemCount < totalItems,
    "locally contextualised examples must not be forced into every item",
  );

  console.log({
    test: "locally contextualised examples present without being forced",
    localContextItemCount,
    totalItems,
    result: "PASS",
  });

  // The initial pilot competency and its content must still
  // resolve correctly (no regression to the production entry
  // point used by the learner journey).
  const initialCompetency = getCompetency(
    GHANA_MATH_PILOT_INITIAL_COMPETENCY_ID,
  );

  assert(
    Boolean(initialCompetency) &&
      getContentForCompetency(
        GHANA_MATH_PILOT_INITIAL_COMPETENCY_ID,
      ).length > 0,
    "the Ghana pilot initial competency must still resolve real content",
  );

  console.log({
    test: "initial pilot competency resolves content",
    result: "PASS",
  });

  console.log({ ghanaPilotContextTest: "PASS" });
}

runGhanaPilotContextTest().catch((error) => {
  console.error(error);
  process.exit(1);
});
