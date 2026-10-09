import { POST, GET } from "../apps/learner/app/api/learning/route";
import { createSession } from "../services/session";
import {
  createInitialLearnerState,
  saveLearnerState,
} from "../services/learner-state";
import { getContentForCompetency } from "../services/content-store";
import { seedContent } from "../services/content-store/seed";

seedContent();

interface TestResult {
  name: string;
  passed: boolean;
  status: number;
  expected: number | number[];
  detail?: string;
}

const results: TestResult[] = [];

// ============================================================================
// PRIORITY 4: SESSION, COMPETENCY, AND ASSESSMENT-ITEM INTEGRITY
// ============================================================================

async function testEmptySessionId(): Promise<void> {
  try {
    const learnerId = `learner-empty-session-${Date.now()}`;
    const competencyId = "competency-test-001";

    const response = await POST(
      new Request("http://localhost/api/learning", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-filumire-learner-id": learnerId,
        },
        body: JSON.stringify({
          learnerId,
          sessionId: "", // empty
          competencyId,
          assessmentItemId: "item-test-001",
          response: "answer",
        }),
      }),
    );

    const passed = response.status === 400;
    results.push({
      name: "Session Integrity: Empty sessionId",
      passed,
      status: response.status,
      expected: 400,
      detail: passed
        ? "Correctly rejected"
        : `Unexpected status ${response.status}`,
    });
  } catch (error) {
    results.push({
      name: "Session Integrity: Empty sessionId",
      passed: false,
      status: 0,
      expected: 400,
      detail: `Exception: ${error instanceof Error ? error.message : String(error)}`,
    });
  }
}

async function testNonexistentSessionId(): Promise<void> {
  try {
    const learnerId = `learner-nonexist-session-${Date.now()}`;
    const competencyId = "competency-test-001";
    const sessionId = `nonexistent-session-${Date.now()}-${Math.random()}`;

    // Don't create the session - try to use a UUID that was never created
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
          competencyId,
          assessmentItemId: "item-test-001",
          response: "answer",
        }),
      }),
    );

    // Server may return 404 (not found), 401 (not owned), or create it
    const passed = response.status === 404 || response.status === 401 || response.status === 200;
    results.push({
      name: "Session Integrity: Nonexistent sessionId (not pre-created)",
      passed,
      status: response.status,
      expected: [200, 401, 404],
      detail: `Server handled with status ${response.status} (acceptable)`,
    });
  } catch (error) {
    results.push({
      name: "Session Integrity: Nonexistent sessionId (not pre-created)",
      passed: false,
      status: 0,
      expected: [200, 401, 404],
      detail: `Exception: ${error instanceof Error ? error.message : String(error)}`,
    });
  }
}

async function testEmptyCompetencyId(): Promise<void> {
  try {
    const learnerId = `learner-empty-competency-${Date.now()}`;
    const sessionId = `session-empty-competency-${Date.now()}`;

    await createSession(sessionId, learnerId);

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
          competencyId: "", // empty
          assessmentItemId: "item-test-001",
          response: "answer",
        }),
      }),
    );

    const passed = response.status === 400;
    results.push({
      name: "Competency Integrity: Empty competencyId",
      passed,
      status: response.status,
      expected: 400,
      detail: passed
        ? "Correctly rejected"
        : `Unexpected status ${response.status}`,
    });
  } catch (error) {
    results.push({
      name: "Competency Integrity: Empty competencyId",
      passed: false,
      status: 0,
      expected: 400,
      detail: `Exception: ${error instanceof Error ? error.message : String(error)}`,
    });
  }
}

async function testNonexistentCompetencyId(): Promise<void> {
  try {
    const learnerId = `learner-nonexist-competency-${Date.now()}`;
    const sessionId = `session-nonexist-competency-${Date.now()}`;

    await createSession(sessionId, learnerId);

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
          competencyId: "nonexistent-competency-xyz-999",
          assessmentItemId: "item-test-001",
          response: "answer",
        }),
      }),
    );

    // Should reject because competency doesn't exist
    const passed = response.status === 404;
    results.push({
      name: "Competency Integrity: Nonexistent competencyId",
      passed,
      status: response.status,
      expected: 404,
      detail: passed
        ? "Correctly returned 404"
        : `Unexpected status ${response.status}`,
    });
  } catch (error) {
    results.push({
      name: "Competency Integrity: Nonexistent competencyId",
      passed: false,
      status: 0,
      expected: 404,
      detail: `Exception: ${error instanceof Error ? error.message : String(error)}`,
    });
  }
}

async function testEmptyAssessmentItemId(): Promise<void> {
  try {
    const learnerId = `learner-empty-item-${Date.now()}`;
    const competencyId = "competency-test-001";
    const sessionId = `session-empty-item-${Date.now()}`;

    await createSession(sessionId, learnerId);
    await saveLearnerState(
      createInitialLearnerState(learnerId, competencyId),
    );

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
          competencyId,
          assessmentItemId: "", // empty
          response: "answer",
        }),
      }),
    );

    const passed = response.status === 400;
    results.push({
      name: "Assessment Integrity: Empty assessmentItemId",
      passed,
      status: response.status,
      expected: 400,
      detail: passed
        ? "Correctly rejected"
        : `Unexpected status ${response.status}`,
    });
  } catch (error) {
    results.push({
      name: "Assessment Integrity: Empty assessmentItemId",
      passed: false,
      status: 0,
      expected: 400,
      detail: `Exception: ${error instanceof Error ? error.message : String(error)}`,
    });
  }
}

async function testNonexistentAssessmentItemId(): Promise<void> {
  try {
    const learnerId = `learner-nonexist-item-${Date.now()}`;
    const competencyId = "competency-test-001";
    const sessionId = `session-nonexist-item-${Date.now()}`;

    await createSession(sessionId, learnerId);
    await saveLearnerState(
      createInitialLearnerState(learnerId, competencyId),
    );

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
          competencyId,
          assessmentItemId: "nonexistent-item-xyz-999", // doesn't exist
          response: "answer",
        }),
      }),
    );

    const passed = response.status === 404;
    results.push({
      name: "Assessment Integrity: Nonexistent assessmentItemId",
      passed,
      status: response.status,
      expected: 404,
      detail: passed
        ? "Correctly returned 404"
        : `Unexpected status ${response.status}`,
    });
  } catch (error) {
    results.push({
      name: "Assessment Integrity: Nonexistent assessmentItemId",
      passed: false,
      status: 0,
      expected: 404,
      detail: `Exception: ${error instanceof Error ? error.message : String(error)}`,
    });
  }
}

async function testAssessmentItemFromWrongCompetency(): Promise<void> {
  try {
    const learnerId = `learner-wrong-competency-${Date.now()}`;
    const competencyId = "competency-test-001";
    const wrongCompetencyId = "competency-test-002";
    const sessionId = `session-wrong-competency-${Date.now()}`;

    await createSession(sessionId, learnerId);
    await saveLearnerState(
      createInitialLearnerState(learnerId, competencyId),
    );

    // Get assessment item from competency-test-002
    const content = getContentForCompetency(wrongCompetencyId).find(
      (c) => c.assessmentItemId,
    );

    if (!content?.assessmentItemId) {
      results.push({
        name: "Assessment Integrity: Assessment item from wrong competency",
        passed: false,
        status: 0,
        expected: 404,
        detail: "Test setup: could not find assessment for competency-test-002",
      });
      return;
    }

    // Try to use that item for competency-test-001
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
          competencyId, // competency-test-001
          assessmentItemId: content.assessmentItemId, // from competency-test-002
          response: "answer",
        }),
      }),
    );

    // Should reject because item doesn't belong to this competency
    const passed = response.status === 404;
    results.push({
      name: "Assessment Integrity: Assessment item from wrong competency",
      passed,
      status: response.status,
      expected: 404,
      detail: passed
        ? "Correctly rejected cross-competency item"
        : `Unexpected status ${response.status}`,
    });
  } catch (error) {
    results.push({
      name: "Assessment Integrity: Assessment item from wrong competency",
      passed: false,
      status: 0,
      expected: 404,
      detail: `Exception: ${error instanceof Error ? error.message : String(error)}`,
    });
  }
}

async function testNumericSessionId(): Promise<void> {
  try {
    const learnerId = `learner-numeric-session-${Date.now()}`;
    const competencyId = "competency-test-001";

    // Try with numeric sessionId in JSON (gets stringified)
    const response = await POST(
      new Request("http://localhost/api/learning", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-filumire-learner-id": learnerId,
        },
        body: JSON.stringify({
          learnerId,
          sessionId: 12345, // numeric
          competencyId,
          assessmentItemId: "item-test-001",
          response: "answer",
        }),
      }),
    );

    // Server should coerce to string "12345" or reject
    const passed = response.status === 200 || response.status === 400 || response.status === 401 || response.status === 404;
    results.push({
      name: "Session Integrity: Numeric sessionId (JSON coerced to string)",
      passed,
      status: response.status,
      expected: [200, 400, 401, 404],
      detail: `Server handled numeric sessionId as status ${response.status}`,
    });
  } catch (error) {
    results.push({
      name: "Session Integrity: Numeric sessionId (JSON coerced to string)",
      passed: false,
      status: 0,
      expected: [200, 400, 401, 404],
      detail: `Exception: ${error instanceof Error ? error.message : String(error)}`,
    });
  }
}

async function testVeryLongCompetencyId(): Promise<void> {
  try {
    const learnerId = `learner-long-competency-${Date.now()}`;
    const sessionId = `session-long-competency-${Date.now()}`;
    const longCompetencyId = "c".repeat(1000); // 1000 chars

    await createSession(sessionId, learnerId);

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
          competencyId: longCompetencyId,
          assessmentItemId: "item-test-001",
          response: "answer",
        }),
      }),
    );

    // Should reject because competency doesn't exist
    const passed = response.status === 404 || response.status === 400;
    results.push({
      name: "Session Integrity: Very long competencyId (1000 chars)",
      passed,
      status: response.status,
      expected: [400, 404],
      detail: `Server handled long ID as status ${response.status}`,
    });
  } catch (error) {
    results.push({
      name: "Session Integrity: Very long competencyId (1000 chars)",
      passed: false,
      status: 0,
      expected: [400, 404],
      detail: `Exception: ${error instanceof Error ? error.message : String(error)}`,
    });
  }
}

async function testSpecialCharactersInCompetencyId(): Promise<void> {
  try {
    const learnerId = `learner-special-competency-${Date.now()}`;
    const sessionId = `session-special-competency-${Date.now()}`;

    await createSession(sessionId, learnerId);

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
          competencyId: "competency'; DROP TABLE--",
          assessmentItemId: "item-test-001",
          response: "answer",
        }),
      }),
    );

    // Should reject because competency doesn't exist
    const passed = response.status === 404 || response.status === 400;
    results.push({
      name: "Session Integrity: Special characters in competencyId",
      passed,
      status: response.status,
      expected: [400, 404],
      detail: `Handled special chars safely with status ${response.status}`,
    });
  } catch (error) {
    results.push({
      name: "Session Integrity: Special characters in competencyId",
      passed: false,
      status: 0,
      expected: [400, 404],
      detail: `Exception: ${error instanceof Error ? error.message : String(error)}`,
    });
  }
}

async function runRedTeamSessionCompetencyTests(): Promise<void> {
  console.log(
    "\n========== RED-TEAM PRIORITY 4: SESSION/COMPETENCY/ITEM INTEGRITY ==========\n",
  );

  await testEmptySessionId();
  await testNonexistentSessionId();
  await testEmptyCompetencyId();
  await testNonexistentCompetencyId();
  await testEmptyAssessmentItemId();
  await testNonexistentAssessmentItemId();
  await testAssessmentItemFromWrongCompetency();
  await testNumericSessionId();
  await testVeryLongCompetencyId();
  await testSpecialCharactersInCompetencyId();

  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;

  results.forEach((r) => {
    const icon = r.passed ? "✓" : "✗";
    console.log(`${icon} ${r.name}`);
    if (!r.passed || r.detail) {
      console.log(`  Status: ${r.status}, Expected: ${JSON.stringify(r.expected)}`);
      if (r.detail) console.log(`  ${r.detail}`);
    }
  });

  console.log(`\n========== RESULTS: ${passed} PASSED, ${failed} FAILED ==========\n`);

  if (failed > 0) {
    process.exitCode = 1;
  }
}

runRedTeamSessionCompetencyTests().catch((error) => {
  console.error("Test suite error:", error);
  process.exitCode = 1;
});


