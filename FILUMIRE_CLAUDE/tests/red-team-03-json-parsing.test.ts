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
// PRIORITY 3: JSON PARSING AND TYPE CONFUSION
// ============================================================================

async function testMalformedJsonBody(): Promise<void> {
  try {
    const learnerId = `learner-malformed-${Date.now()}`;
    const response = await POST(
      new Request("http://localhost/api/learning", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-filumire-learner-id": learnerId,
        },
        body: "{invalid json here",
      }),
    );

    // Should handle malformed JSON gracefully (500 likely, but should not crash)
    const passed =
      response.status >= 400 &&
      response.status < 600;
    results.push({
      name: "JSON Parsing: Malformed JSON body",
      passed,
      status: response.status,
      expected: [400, 500],
      detail: passed
        ? "Server handled gracefully"
        : "DEFECT: Unexpected response code",
    });
  } catch (error) {
    results.push({
      name: "JSON Parsing: Malformed JSON body",
      passed: false,
      status: 0,
      expected: [400, 500],
      detail: `Exception: ${error instanceof Error ? error.message : String(error)}`,
    });
  }
}

async function testNullResponse(): Promise<void> {
  try {
    const learnerId = `learner-null-response-${Date.now()}`;
    const competencyId = "competency-test-001";
    const sessionId = `session-null-response-${Date.now()}`;

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
          assessmentItemId: "item-test-001",
          response: null, // null instead of string
        }),
      }),
    );

    const passed = response.status === 400;
    results.push({
      name: "JSON Parsing: null response field",
      passed,
      status: response.status,
      expected: 400,
      detail: passed
        ? "Correctly rejected"
        : `Unexpected status ${response.status}`,
    });
  } catch (error) {
    results.push({
      name: "JSON Parsing: null response field",
      passed: false,
      status: 0,
      expected: 400,
      detail: `Exception: ${error instanceof Error ? error.message : String(error)}`,
    });
  }
}

async function testNullSessionId(): Promise<void> {
  try {
    const learnerId = `learner-null-session-${Date.now()}`;
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
          sessionId: null, // null instead of string
          competencyId,
          assessmentItemId: "item-test-001",
          response: "answer",
        }),
      }),
    );

    const passed = response.status === 400;
    results.push({
      name: "JSON Parsing: null sessionId field",
      passed,
      status: response.status,
      expected: 400,
      detail: passed
        ? "Correctly rejected"
        : `Unexpected status ${response.status}`,
    });
  } catch (error) {
    results.push({
      name: "JSON Parsing: null sessionId field",
      passed: false,
      status: 0,
      expected: 400,
      detail: `Exception: ${error instanceof Error ? error.message : String(error)}`,
    });
  }
}

async function testNullCompetencyId(): Promise<void> {
  try {
    const learnerId = `learner-null-competency-${Date.now()}`;
    const sessionId = `session-null-competency-${Date.now()}`;

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
          competencyId: null, // null instead of string
          assessmentItemId: "item-test-001",
          response: "answer",
        }),
      }),
    );

    const passed = response.status === 400;
    results.push({
      name: "JSON Parsing: null competencyId field",
      passed,
      status: response.status,
      expected: 400,
      detail: passed
        ? "Correctly rejected"
        : `Unexpected status ${response.status}`,
    });
  } catch (error) {
    results.push({
      name: "JSON Parsing: null competencyId field",
      passed: false,
      status: 0,
      expected: 400,
      detail: `Exception: ${error instanceof Error ? error.message : String(error)}`,
    });
  }
}

async function testNumericResponse(): Promise<void> {
  try {
    const learnerId = `learner-numeric-response-${Date.now()}`;
    const competencyId = "competency-test-001";
    const sessionId = `session-numeric-response-${Date.now()}`;

    await createSession(sessionId, learnerId);
    await saveLearnerState(
      createInitialLearnerState(learnerId, competencyId),
    );

    const content = getContentForCompetency(competencyId).find(
      (c) => c.assessmentItemId,
    );

    // Submit numeric response instead of string
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
          assessmentItemId: content?.assessmentItemId,
          response: 123, // numeric instead of string
        }),
      }),
    );

    // Should either accept (and evaluate as JSON) or reject
    const passed = response.status === 200 || response.status === 400;
    results.push({
      name: "Type Confusion: Numeric response (should be string)",
      passed,
      status: response.status,
      expected: [200, 400],
      detail: `Server handled numeric response as status ${response.status}`,
    });
  } catch (error) {
    results.push({
      name: "Type Confusion: Numeric response (should be string)",
      passed: false,
      status: 0,
      expected: [200, 400],
      detail: `Exception: ${error instanceof Error ? error.message : String(error)}`,
    });
  }
}

async function testBooleanResponse(): Promise<void> {
  try {
    const learnerId = `learner-boolean-response-${Date.now()}`;
    const competencyId = "competency-test-001";
    const sessionId = `session-boolean-response-${Date.now()}`;

    await createSession(sessionId, learnerId);
    await saveLearnerState(
      createInitialLearnerState(learnerId, competencyId),
    );

    const content = getContentForCompetency(competencyId).find(
      (c) => c.assessmentItemId,
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
          assessmentItemId: content?.assessmentItemId,
          response: true, // boolean instead of string
        }),
      }),
    );

    const passed = response.status === 200 || response.status === 400;
    results.push({
      name: "Type Confusion: Boolean response (should be string)",
      passed,
      status: response.status,
      expected: [200, 400],
      detail: `Server handled boolean response as status ${response.status}`,
    });
  } catch (error) {
    results.push({
      name: "Type Confusion: Boolean response (should be string)",
      passed: false,
      status: 0,
      expected: [200, 400],
      detail: `Exception: ${error instanceof Error ? error.message : String(error)}`,
    });
  }
}

async function testArrayResponse(): Promise<void> {
  try {
    const learnerId = `learner-array-response-${Date.now()}`;
    const competencyId = "competency-test-001";
    const sessionId = `session-array-response-${Date.now()}`;

    await createSession(sessionId, learnerId);
    await saveLearnerState(
      createInitialLearnerState(learnerId, competencyId),
    );

    const content = getContentForCompetency(competencyId).find(
      (c) => c.assessmentItemId,
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
          assessmentItemId: content?.assessmentItemId,
          response: ["answer"], // array instead of string
        }),
      }),
    );

    const passed = response.status === 200 || response.status === 400;
    results.push({
      name: "Type Confusion: Array response (should be string)",
      passed,
      status: response.status,
      expected: [200, 400],
      detail: `Server handled array response as status ${response.status}`,
    });
  } catch (error) {
    results.push({
      name: "Type Confusion: Array response (should be string)",
      passed: false,
      status: 0,
      expected: [200, 400],
      detail: `Exception: ${error instanceof Error ? error.message : String(error)}`,
    });
  }
}

async function testObjectResponse(): Promise<void> {
  try {
    const learnerId = `learner-object-response-${Date.now()}`;
    const competencyId = "competency-test-001";
    const sessionId = `session-object-response-${Date.now()}`;

    await createSession(sessionId, learnerId);
    await saveLearnerState(
      createInitialLearnerState(learnerId, competencyId),
    );

    const content = getContentForCompetency(competencyId).find(
      (c) => c.assessmentItemId,
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
          assessmentItemId: content?.assessmentItemId,
          response: { answer: "value" }, // object instead of string
        }),
      }),
    );

    const passed = response.status === 200 || response.status === 400;
    results.push({
      name: "Type Confusion: Object response (should be string)",
      passed,
      status: response.status,
      expected: [200, 400],
      detail: `Server handled object response as status ${response.status}`,
    });
  } catch (error) {
    results.push({
      name: "Type Confusion: Object response (should be string)",
      passed: false,
      status: 0,
      expected: [200, 400],
      detail: `Exception: ${error instanceof Error ? error.message : String(error)}`,
    });
  }
}

async function testResponseWithSqlInjectionPattern(): Promise<void> {
  try {
    const learnerId = `learner-sql-inject-${Date.now()}`;
    const competencyId = "competency-test-001";
    const sessionId = `session-sql-inject-${Date.now()}`;

    await createSession(sessionId, learnerId);
    await saveLearnerState(
      createInitialLearnerState(learnerId, competencyId),
    );

    const content = getContentForCompetency(competencyId).find(
      (c) => c.assessmentItemId,
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
          assessmentItemId: content?.assessmentItemId,
          response: "' OR '1'='1", // SQL injection pattern in response
        }),
      }),
    );

    // Should accept and evaluate as a string (not execute SQL)
    const body = await response.json();
    const isCorrect = body.assessment?.result?.correct;

    // SQL pattern is just a string, evaluation should work normally
    const passed = response.status === 200;
    results.push({
      name: "Input Validation: SQL injection pattern in response",
      passed,
      status: response.status,
      expected: 200,
      detail: passed
        ? "Pattern treated as regular string (correct behavior)"
        : `Unexpected status ${response.status}`,
    });
  } catch (error) {
    results.push({
      name: "Input Validation: SQL injection pattern in response",
      passed: false,
      status: 0,
      expected: 200,
      detail: `Exception: ${error instanceof Error ? error.message : String(error)}`,
    });
  }
}

async function testExtraPropertiesInBody(): Promise<void> {
  try {
    const learnerId = `learner-extra-props-${Date.now()}`;
    const competencyId = "competency-test-001";
    const sessionId = `session-extra-props-${Date.now()}`;

    await createSession(sessionId, learnerId);
    await saveLearnerState(
      createInitialLearnerState(learnerId, competencyId),
    );

    const content = getContentForCompetency(competencyId).find(
      (c) => c.assessmentItemId,
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
          assessmentItemId: content?.assessmentItemId,
          response: "answer",
          extraField1: "should-be-ignored",
          extraField2: 12345,
          extraField3: { nested: "data" },
        }),
      }),
    );

    // Should succeed and ignore extra fields
    const passed = response.status === 200;
    results.push({
      name: "Input Validation: Extra properties in body",
      passed,
      status: response.status,
      expected: 200,
      detail: passed
        ? "Extra properties correctly ignored"
        : `Unexpected status ${response.status}`,
    });
  } catch (error) {
    results.push({
      name: "Input Validation: Extra properties in body",
      passed: false,
      status: 0,
      expected: 200,
      detail: `Exception: ${error instanceof Error ? error.message : String(error)}`,
    });
  }
}

async function testEmptyStringResponse(): Promise<void> {
  try {
    const learnerId = `learner-empty-response-${Date.now()}`;
    const competencyId = "competency-test-001";
    const sessionId = `session-empty-response-${Date.now()}`;

    await createSession(sessionId, learnerId);
    await saveLearnerState(
      createInitialLearnerState(learnerId, competencyId),
    );

    const content = getContentForCompetency(competencyId).find(
      (c) => c.assessmentItemId,
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
          assessmentItemId: content?.assessmentItemId,
          response: "", // empty string
        }),
      }),
    );

    const passed = response.status === 400;
    results.push({
      name: "Input Validation: Empty string response",
      passed,
      status: response.status,
      expected: 400,
      detail: passed
        ? "Correctly rejected"
        : `Unexpected status ${response.status}`,
    });
  } catch (error) {
    results.push({
      name: "Input Validation: Empty string response",
      passed: false,
      status: 0,
      expected: 400,
      detail: `Exception: ${error instanceof Error ? error.message : String(error)}`,
    });
  }
}

async function runRedTeamJsonTests(): Promise<void> {
  console.log(
    "\n========== RED-TEAM PRIORITY 3: JSON PARSING AND TYPE CONFUSION ==========\n",
  );

  await testMalformedJsonBody();
  await testNullResponse();
  await testNullSessionId();
  await testNullCompetencyId();
  await testNumericResponse();
  await testBooleanResponse();
  await testArrayResponse();
  await testObjectResponse();
  await testResponseWithSqlInjectionPattern();
  await testExtraPropertiesInBody();
  await testEmptyStringResponse();

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

runRedTeamJsonTests().catch((error) => {
  console.error("Test suite error:", error);
  process.exitCode = 1;
});
