import {
  DeterministicGovernedInstructionalEngine,
  type GovernedInstructionalRequest,
} from "../packages/ai";
import { getCompetency } from "../packages/curriculum";
import { GHANA_B4_ENGLISH_GENERATED_CONTENT } from "../services/content-store/ghana-b4-english-content";
import { GHANA_B4_MATHEMATICS_GENERATED_CONTENT } from "../services/content-store/ghana-b4-mathematics-content";
import { GHANA_B4_SCIENCE_GENERATED_CONTENT } from "../services/content-store/ghana-b4-science-content";
import { GHANA_B4_COMPUTING_GENERATED_CONTENT } from "../services/content-store/ghana-b4-computing-content";
import type { LearningContent } from "../packages/content";

type SubjectCase = {
  name: string;
  content: LearningContent;
  action: string;
  strategy: string;
  responseMode: string;
};

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`FAIL: ${message}`);
  }
}

const cases: SubjectCase[] = [
  {
    name: "English",
    content: GHANA_B4_ENGLISH_GENERATED_CONTENT[0],
    action: "teach",
    strategy: "demonstration",
    responseMode: "observed_performance",
  },
  {
    name: "Mathematics",
    content: GHANA_B4_MATHEMATICS_GENERATED_CONTENT[0],
    action: "scaffold",
    strategy: "step_by_step_scaffold",
    responseMode: "constructed_response",
  },
  {
    name: "Science",
    content: GHANA_B4_SCIENCE_GENERATED_CONTENT[0],
    action: "remediate",
    strategy: "error_analysis",
    responseMode: "multiple_choice",
  },
  {
    name: "Computing",
    content: GHANA_B4_COMPUTING_GENERATED_CONTENT[0],
    action: "practice",
    strategy: "retrieval_practice",
    responseMode: "multiple_choice",
  },
];

async function runCase(testCase: SubjectCase): Promise<void> {
  const competency = getCompetency(testCase.content.competencyId);

  if (!competency) {
    throw new Error(
      `FAIL: ${testCase.name} competency ${testCase.content.competencyId} missing.`,
    );
  }

  const request: GovernedInstructionalRequest = {
    learnerId: `learner-filu-${testCase.name.toLowerCase()}`,
    sessionId: `session-filu-${testCase.name.toLowerCase()}`,
    competency: {
      id: competency.id,
      title: competency.title,
      description: competency.description,
      prerequisiteCompetencyIds: competency.prerequisiteCompetencyIds,
      misconceptions: competency.misconceptions,
    },
    decision: {
      id: `decision-filu-${testCase.name.toLowerCase()}`,
      action: testCase.action,
      reasonCode: `FILU_V1_${testCase.name.toUpperCase()}_TEST`,
      competencyId: competency.id,
      instructionalStrategy: testCase.strategy,
      responseMode: testCase.responseMode,
    },
    learnerProfile: {
      masteryEstimate: 0.45,
      confidence: 0.7,
      diagnosticState:
        testCase.action === "remediate"
          ? "conceptual_misunderstanding"
          : "unknown",
      diagnosticConfidence:
        testCase.action === "remediate" ? 0.8 : 0,
      errorPatterns:
        testCase.action === "remediate"
          ? ["subject_specific_error"]
          : [],
    },
    content: {
      id: testCase.content.id,
      competencyId: testCase.content.competencyId,
      type: testCase.content.type,
      title: testCase.content.title,
      body: testCase.content.body,
      assessmentItemId: testCase.content.assessmentItemId,
    },
    instructionalContext:
      "FILUMIRE four-subject FILU V1 instructional validation.",
  };

  const engine = new DeterministicGovernedInstructionalEngine();
  const instruction = await engine.generate(request);

  assert(
    instruction.modelId === "filu-governed-instructional-engine-v1",
    `${testCase.name} must use FILU V1`,
  );

  if (!instruction.structured) {
    throw new Error(
      `FAIL: ${testCase.name} must return structured instruction.`,
    );
  }

  const structured = instruction.structured;

  assert(
    structured.competencyId === competency.id,
    `${testCase.name} instruction must remain on adaptive competency`,
  );

  assert(
    structured.groundedContentId === testCase.content.id,
    `${testCase.name} instruction must remain grounded in selected content`,
  );

  assert(
    structured.action === testCase.action,
    `${testCase.name} instruction must preserve adaptive action`,
  );

  assert(
    instruction.content.includes(testCase.content.body),
    `${testCase.name} instruction must include curriculum-grounded content`,
  );

  assert(
    structured.authority.mayChangeIdentity === false &&
      structured.authority.mayChangeAuthorization === false &&
      structured.authority.mayChangeCompetency === false &&
      structured.authority.mayChangeMastery === false &&
      structured.authority.mayOverrideAdaptivePolicy === false,
    `${testCase.name} must preserve FILUMIRE authority boundaries`,
  );

  const texts = structured.elements.map((element) => element.text);

  switch (testCase.strategy) {
    case "demonstration":
      assert(
        structured.elements.some(
          (element) => element.type === "worked_example",
        ),
        `${testCase.name} must express demonstration strategy`,
      );
      break;

    case "step_by_step_scaffold":
      assert(
        structured.elements.some(
          (element) =>
            element.type === "hint" &&
            element.text.toLowerCase().includes("first"),
        ),
        `${testCase.name} must express step-by-step scaffolding`,
      );
      break;

    case "error_analysis":
      assert(
        structured.elements.some(
          (element) =>
            element.type === "corrective_feedback" &&
            element.text.toLowerCase().includes("error"),
        ),
        `${testCase.name} must express error analysis`,
      );
      break;

    case "retrieval_practice":
      assert(
        structured.elements.some(
          (element) =>
            element.type === "learner_task" &&
            element.text.toLowerCase().includes("recall"),
        ),
        `${testCase.name} must express retrieval practice`,
      );
      break;
  }

  if (testCase.responseMode === "observed_performance") {
    assert(
      texts.some((text) =>
        text.toLowerCase().includes("demonstrate"),
      ),
      `${testCase.name} must honour observed-performance response mode`,
    );
  }

  if (testCase.responseMode === "constructed_response") {
    assert(
      texts.some((text) =>
        text.toLowerCase().includes("reasoning"),
      ),
      `${testCase.name} must honour constructed-response mode`,
    );
  }

  if (testCase.responseMode === "multiple_choice") {
    assert(
      texts.some((text) =>
        text.toLowerCase().includes("choose the best answer"),
      ),
      `${testCase.name} must honour multiple-choice response mode`,
    );
  }

  console.log(
    `${testCase.name} FILU PASS: ${testCase.action} -> ${testCase.strategy} -> ${testCase.responseMode}`,
  );
}

async function run(): Promise<void> {
  for (const testCase of cases) {
    await runCase(testCase);
  }

  console.log("Four-subject FILU V1 PASS.");
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
