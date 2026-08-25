import {
  evaluateAssessment,
} from "./services/assessment/index";

import type {
  AssessmentSubmission,
} from "./packages/contracts";

async function run(): Promise<void> {
  const submission:
    AssessmentSubmission = {
    learnerId:
      "learner-debug-intervention",

    sessionId:
      "session-debug-intervention",

    assessmentItemId:
      "item-debug-intervention",

    competencyId:
      "competency-test-001",

    response:
      "incorrect-answer",

    interventionId:
      "intervention-debug-001",
  };

  const evidenceResult =
    await evaluateAssessment(
      submission,
      "correct-answer",
      undefined,
    );

  console.dir(
    evidenceResult.evidence,
    {
      depth: 10,
    },
  );
}

run().catch(
  (error) => {
    console.error(error);
    process.exitCode = 1;
  },
);