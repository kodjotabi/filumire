import { POST } from "../apps/learner/app/api/learning/route";
import {
  createInitialLearnerState,
  saveLearnerState,
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

async function testClientSideForgeryComprehensive(): Promise<void> {
  seedContent();

  const learnerId = `learner-forgery-test-${Date.now()}`;
  const competencyId = "competency-test-001";
  const sessionId = `session-forgery-test-${Date.now()}`;

  console.log({
    test: "Comprehensive client-side forgery prevention",
    learnerId,
    sessionId,
  });

  // Setup
  await createSession(sessionId, learnerId);
  const initialState = createInitialLearnerState(
    learnerId,
    competencyId,
  );
  await saveLearnerState(initialState);

  const content = getContentForCompetency(
    competencyId,
  ).find((c) => c.assessmentItemId);

  if (!content || !content.assessmentItemId) {
    throw new Error("No assessment content");
  }

  // Test 1: Attempt to submit wrong answer expecting it to be marked correct
  console.log(
    "Test 1: Forged correct answer submission",
  );
  const response1 = await POST(
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
        response: "deliberately-wrong-answer-xyz",
      }),
    }),
  );

  assert(
    response1.status === 200,
    "Request should succeed (validation happens server-side)",
  );

  const result1 = (await response1.json()) as any;
  const isCorrect1 =
    result1.assessment?.result?.correct;

  assert(
    isCorrect1 === false,
    "Wrong answer must not be marked correct",
  );

  console.log({
    test: "Forged correct answer submission",
    result: "BLOCKED",
    submittedAnswer: "deliberately-wrong-answer-xyz",
    serverResult: isCorrect1,
  });

  // Test 2: Already tested and verified - client cannot supply retention outcome
  console.log("Test 2: Client-supplied retention outcome");
  const response2 = await POST(
    new Request("http://localhost/api/learning", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-filumire-learner-id": learnerId,
      },
      body: JSON.stringify({
        learnerId,
        sessionId,
        interactionType: "retention",
        competencyId,
        outcome: "correct",
      }),
    }),
  );

  assert(
    response2.status === 400,
    `Expected 400 for retention self-assertion, got ${response2.status}`,
  );

  console.log({
    test: "Client-supplied retention outcome",
    result: "BLOCKED",
    status: response2.status,
  });

  // Test 3: Already tested and verified - client cannot supply transfer outcome
  console.log("Test 3: Client-supplied transfer outcome");
  const response3 = await POST(
    new Request("http://localhost/api/learning", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-filumire-learner-id": learnerId,
      },
      body: JSON.stringify({
        learnerId,
        sessionId,
        interactionType: "transfer",
        competencyId,
        outcome: "correct",
      }),
    }),
  );

  assert(
    response3.status === 400,
    `Expected 400 for transfer self-assertion, got ${response3.status}`,
  );

  console.log({
    test: "Client-supplied transfer outcome",
    result: "BLOCKED",
    status: response3.status,
  });

  // Test 4: Attempt to inject masteryEstimate in request body (should be ignored)
  console.log(
    "Test 4: Attempt masteryEstimate injection",
  );
  const response4 = await POST(
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
        response: content.metadata?.expectedResponse,
        masteryEstimate: 0.99, // Attempted injection
      }),
    }),
  );

  assert(
    response4.status === 200,
    "Valid assessment should succeed",
  );

  const result4 = (await response4.json()) as any;
  assert(
    result4.assessment?.result?.correct === true,
    "Correct answer should be accepted",
  );

  // Verify mastery wasn't artificially injected - should accumulate naturally
  const resultMastery =
    result4.learnerState.competencies[0]
      .masteryEstimate;

  assert(
    resultMastery < 0.99,
    `Mastery injection prevented: expected < 0.99, got ${resultMastery}`,
  );

  console.log({
    test: "Attempt masteryEstimate injection",
    result: "BLOCKED",
    attemptedValue: 0.99,
    actualValue: resultMastery,
  });

  // Test 5: Verify cross-learner cannot modify another's competency state
  console.log("Test 5: Cross-learner state modification");
  const otherLearnerId = `other-learner-${Date.now()}`;
  const response5 = await POST(
    new Request("http://localhost/api/learning", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-filumire-learner-id": otherLearnerId,
      },
      body: JSON.stringify({
        learnerId, // Attempting to modify original learner's state
        sessionId,
        interactionType: "assessment",
        assessmentItemId: content.assessmentItemId,
        competencyId,
        response: content.metadata?.expectedResponse,
      }),
    }),
  );

  assert(
    response5.status === 401,
    `Expected 401 for cross-learner modification, got ${response5.status}`,
  );

  console.log({
    test: "Cross-learner state modification",
    result: "BLOCKED",
    status: response5.status,
  });

  console.log({
    test: "Comprehensive client-side forgery prevention",
    result: "PASS",
    allAttacksBlocked: true,
    testsRun: 5,
  });
}

testClientSideForgeryComprehensive().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
