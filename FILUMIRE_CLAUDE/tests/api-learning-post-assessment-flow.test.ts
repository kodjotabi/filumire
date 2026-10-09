import { POST } from "../apps/learner/app/api/learning/route";
import {
  createInitialLearnerState,
  saveLearnerState,
  getLearnerState,
} from "../services/learner-state";
import { createSession } from "../services/session";
import {
  getContentForCompetency,
} from "../services/content-store";
import { seedContent } from "../services/content-store/seed";

function assert(
  condition: boolean,
  message: string,
): void {
  if (!condition) throw new Error(`FAIL: ${message}`);
}

async function testPostAssessmentFlow(): Promise<void> {
  seedContent();

  const learnerId = `learner-post-assessment-${Date.now()}`;
  const competencyId = "competency-test-001";
  const sessionId = `session-post-assessment-${Date.now()}`;

  console.log({
    test: "POST /api/learning assessment flow",
    learnerId,
    sessionId,
  });

  // Setup: create session and learner state
  await createSession(sessionId, learnerId);
  const initialState = createInitialLearnerState(
    learnerId,
    competencyId,
  );
  await saveLearnerState(initialState);

  // Get assessment content
  const content = getContentForCompetency(
    competencyId,
  ).find(
    (c) =>
      (c.type === "assessment" || c.type === "practice") &&
      c.assessmentItemId,
  );

  if (!content) {
    throw new Error(
      "No assessment content found for competency",
    );
  }

  if (!content.assessmentItemId) {
    throw new Error("Assessment item has no ID");
  }

  if (
    !content.metadata?.expectedResponse
  ) {
    throw new Error(
      "Assessment has no expected response",
    );
  }

  const correctResponse =
    content.metadata.expectedResponse;

  // Record state before submission
  const stateBefore = await getLearnerState(
    learnerId,
    competencyId,
  );

  const masteryBefore =
    stateBefore?.competencies[0]?.masteryEstimate ?? 0;
  const evidenceBefore =
    stateBefore?.competencies[0]?.evidenceCount ?? 0;

  // Submit assessment with correct response
  const response = await POST(
    new Request("http://localhost/api/learning", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-filumire-learner-id": learnerId,
      },
      body: JSON.stringify({
        learnerId,
        sessionId,
        interactionType: "assessment",
        assessmentItemId: content.assessmentItemId,
        competencyId,
        response: correctResponse,
      }),
    }),
  );

  assert(
    response.status === 200,
    `Expected 200, got ${response.status}`,
  );

  const result = (await response.json()) as any;

  // Verify assessment result
  assert(
    result.assessment,
    "Response missing assessment result",
  );

  assert(
    result.assessment.result?.correct === true,
    "Assessment should be marked correct",
  );

  // Verify learner state updated
  assert(
    result.learnerState,
    "Response missing updated learnerState",
  );

  // Verify decision generated
  assert(
    result.decision,
    "Response missing decision after assessment",
  );

  assert(
    result.decision.action,
    "decision missing action",
  );

  // Verify state persisted with evidence
  const stateAfter = await getLearnerState(
    learnerId,
    competencyId,
  );

  const masteryAfter =
    stateAfter?.competencies[0]?.masteryEstimate ?? 0;
  const evidenceAfter =
    stateAfter?.competencies[0]?.evidenceCount ?? 0;

  assert(
    evidenceAfter > evidenceBefore,
    `Evidence count not incremented: before=${evidenceBefore}, after=${evidenceAfter}`,
  );

  assert(
    masteryAfter >= masteryBefore,
    `Mastery should not decrease: before=${masteryBefore}, after=${masteryAfter}`,
  );

  console.log({
    test: "POST /api/learning assessment flow",
    result: "PASS",
    assessmentEvaluated: true,
    evidenceApplied: true,
    stateUpdated: true,
    decisionGenerated: true,
    masteryBefore,
    masteryAfter,
    evidenceBefore,
    evidenceAfter,
  });
}

testPostAssessmentFlow().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
