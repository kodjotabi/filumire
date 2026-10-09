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

async function testErrorHandling(): Promise<void> {
  seedContent();

  const learnerId = `learner-error-handling-${Date.now()}`;
  const competencyId = "competency-test-001";
  const sessionId = `session-error-handling-${Date.now()}`;
  const content = getContentForCompetency(
    competencyId,
  ).find((c) => c.assessmentItemId);

  console.log({
    test: "Error handling and state integrity",
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

  // Test 1: Missing assessmentItemId
  console.log("Test 1: Missing assessmentItemId");
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
        competencyId,
        response: "some-answer",
        // Missing assessmentItemId
      }),
    }),
  );

  assert(
    response1.status === 400,
    `Expected 400 for missing assessmentItemId, got ${response1.status}`,
  );

  console.log({
    test: "Missing assessmentItemId",
    status: response1.status,
    result: "BLOCKED",
  });

  // Test 2: Missing response
  console.log("Test 2: Missing response");
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
        interactionType: "assessment",
        assessmentItemId: content?.assessmentItemId,
        competencyId,
        // Missing response
      }),
    }),
  );

  assert(
    response2.status === 400,
    `Expected 400 for missing response, got ${response2.status}`,
  );

  console.log({
    test: "Missing response",
    status: response2.status,
    result: "BLOCKED",
  });

  // Test 3: Invalid competencyId
  console.log("Test 3: Invalid competencyId");
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
        interactionType: "assessment",
        assessmentItemId: content?.assessmentItemId,
        competencyId: "nonexistent-competency-xyz",
        response: "answer",
      }),
    }),
  );

  assert(
    response3.status === 404,
    `Expected 404 for invalid competencyId, got ${response3.status}`,
  );

  console.log({
    test: "Invalid competencyId",
    status: response3.status,
    result: "BLOCKED",
  });

  // Test 4: Cross-learner attempt (different header learner)
  console.log("Test 4: Cross-learner session hijack");
  const response4 = await POST(
    new Request("http://localhost/api/learning", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-filumire-learner-id": `other-learner-${Date.now()}`,
      },
      body: JSON.stringify({
        learnerId,
        sessionId,
        interactionType: "assessment",
        assessmentItemId: content?.assessmentItemId,
        competencyId,
        response: "answer",
      }),
    }),
  );

  assert(
    response4.status === 401,
    `Expected 401 for cross-learner attempt, got ${response4.status}`,
  );

  console.log({
    test: "Cross-learner session hijack",
    status: response4.status,
    result: "BLOCKED",
  });

  // Test 5: Attempt client-supplied retention outcome (must be 400)
  console.log("Test 5: Client-supplied retention outcome");
  const response5 = await POST(
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
    response5.status === 400,
    `Expected 400 for client-supplied retention, got ${response5.status}`,
  );

  console.log({
    test: "Client-supplied retention outcome",
    status: response5.status,
    result: "BLOCKED",
  });

  // Test 6: Attempt client-supplied transfer outcome (must be 400)
  console.log("Test 6: Client-supplied transfer outcome");
  const response6 = await POST(
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
    response6.status === 400,
    `Expected 400 for client-supplied transfer, got ${response6.status}`,
  );

  console.log({
    test: "Client-supplied transfer outcome",
    status: response6.status,
    result: "BLOCKED",
  });

  console.log({
    test: "Error handling and state integrity",
    result: "PASS",
    testsRun: 6,
    allBlocked: true,
  });
}

testErrorHandling().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
