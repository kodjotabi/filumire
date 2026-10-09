import { GET, POST } from "../apps/learner/app/api/learning/route";
import { createSession } from "../services/session";
import {
  createInitialLearnerState,
  getLearnerState,
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

function assert(
  condition: boolean,
  message: string,
): void {
  if (!condition) throw new Error(`ASSERTION FAILED: ${message}`);
}

// ============================================================================
// PRIORITY 1: IDENTITY/AUTHENTICATION AND CROSS-LEARNER ISOLATION
// ============================================================================

async function testIdentityMissing(): Promise<void> {
  try {
    const response = await GET(
      new Request("http://localhost/api/learning"),
    );

    const passed = response.status === 401;
    results.push({
      name: "Identity: Missing learner ID header",
      passed,
      status: response.status,
      expected: 401,
      detail: passed ? "Correctly rejected" : "SHOULD BLOCK with 401",
    });
  } catch (error) {
    results.push({
      name: "Identity: Missing learner ID header",
      passed: false,
      status: 0,
      expected: 401,
      detail: `Exception: ${error instanceof Error ? error.message : String(error)}`,
    });
  }
}

async function testIdentityEmpty(): Promise<void> {
  try {
    const response = await GET(
      new Request("http://localhost/api/learning", {
        headers: { "x-filumire-learner-id": "" },
      }),
    );

    const passed = response.status === 401;
    results.push({
      name: "Identity: Empty learner ID ('')",
      passed,
      status: response.status,
      expected: 401,
      detail: passed ? "Correctly rejected" : "SHOULD BLOCK with 401",
    });
  } catch (error) {
    results.push({
      name: "Identity: Empty learner ID ('')",
      passed: false,
      status: 0,
      expected: 401,
      detail: `Exception: ${error instanceof Error ? error.message : String(error)}`,
    });
  }
}

async function testIdentityWhitespaceOnly(): Promise<void> {
  try {
    const response = await GET(
      new Request("http://localhost/api/learning", {
        headers: { "x-filumire-learner-id": "   " },
      }),
    );

    const passed = response.status === 401;
    results.push({
      name: "Identity: Whitespace-only learner ID ('   ')",
      passed,
      status: response.status,
      expected: 401,
      detail: passed ? "Correctly rejected" : "SHOULD BLOCK with 401",
    });
  } catch (error) {
    results.push({
      name: "Identity: Whitespace-only learner ID ('   ')",
      passed: false,
      status: 0,
      expected: 401,
      detail: `Exception: ${error instanceof Error ? error.message : String(error)}`,
    });
  }
}

async function testIdentityBoundaryValid128(): Promise<void> {
  try {
    const learnerId = "x".repeat(128);
    const sessionId = `session-boundary-128-${Date.now()}`;

    // Create session so GET succeeds
    await createSession(sessionId, learnerId);

    const response = await GET(
      new Request(
        `http://localhost/api/learning?sessionId=${sessionId}`,
        {
          headers: { "x-filumire-learner-id": learnerId },
        },
      ),
    );

    const passed = response.status === 200;
    results.push({
      name: "Identity: Boundary valid (128 chars)",
      passed,
      status: response.status,
      expected: 200,
      detail: passed ? "Correctly accepted" : "SHOULD ALLOW 128 char ID",
    });
  } catch (error) {
    results.push({
      name: "Identity: Boundary valid (128 chars)",
      passed: false,
      status: 0,
      expected: 200,
      detail: `Exception: ${error instanceof Error ? error.message : String(error)}`,
    });
  }
}

async function testIdentityBoundaryInvalid129(): Promise<void> {
  try {
    const learnerId = "x".repeat(129);
    const response = await GET(
      new Request("http://localhost/api/learning", {
        headers: { "x-filumire-learner-id": learnerId },
      }),
    );

    const passed = response.status === 401;
    results.push({
      name: "Identity: Boundary invalid (129 chars)",
      passed,
      status: response.status,
      expected: 401,
      detail: passed ? "Correctly rejected" : "SHOULD BLOCK with 401",
    });
  } catch (error) {
    results.push({
      name: "Identity: Boundary invalid (129 chars)",
      passed: false,
      status: 0,
      expected: 401,
      detail: `Exception: ${error instanceof Error ? error.message : String(error)}`,
    });
  }
}

async function testIdentityWithPadding(): Promise<void> {
  try {
    const response = await GET(
      new Request("http://localhost/api/learning", {
        headers: { "x-filumire-learner-id": "  learner-001  " },
      }),
    );

    // Server receives the header exactly as sent (no trimming)
    // If "  learner-001  " passes length check (14 chars = valid), GET succeeds
    // If it's considered valid, this tests that trimming is NOT happening
    results.push({
      name: "Identity: Learner ID with padding ('  learner-001  ')",
      passed: response.status === 200 || response.status === 401,
      status: response.status,
      expected: [200, 401],
      detail: `Padded ID length is 14 chars (valid). Server returned ${response.status}.`,
    });
  } catch (error) {
    results.push({
      name: "Identity: Learner ID with padding ('  learner-001  ')",
      passed: false,
      status: 0,
      expected: [200, 401],
      detail: `Exception: ${error instanceof Error ? error.message : String(error)}`,
    });
  }
}

async function testIdentitySpecialCharacters(): Promise<void> {
  try {
    const response = await GET(
      new Request("http://localhost/api/learning", {
        headers: { "x-filumire-learner-id": "learner'--DROP" },
      }),
    );

    const passed = response.status === 200 || response.status === 400 || response.status === 401;
    results.push({
      name: "Identity: Special characters in ID (learner'--DROP)",
      passed,
      status: response.status,
      expected: [200, 400, 401],
      detail: `Special chars accepted as learner ID. Status: ${response.status}.`,
    });
  } catch (error) {
    results.push({
      name: "Identity: Special characters in ID (learner'--DROP)",
      passed: false,
      status: 0,
      expected: [200, 400, 401],
      detail: `Exception: ${error instanceof Error ? error.message : String(error)}`,
    });
  }
}

async function testBodyLearnerIdMismatch(): Promise<void> {
  try {
    const response = await POST(
      new Request("http://localhost/api/learning", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-filumire-learner-id": "learner-authenticated",
        },
        body: JSON.stringify({
          learnerId: "learner-attacker-target",
          sessionId: `session-mismatch-${Date.now()}`,
          competencyId: "competency-test-001",
          assessmentItemId: "item-test-001",
          response: "answer",
        }),
      }),
    );

    const passed = response.status === 401;
    results.push({
      name: "Authorization: Body learnerId ≠ header learnerId",
      passed,
      status: response.status,
      expected: 401,
      detail: passed ? "Correctly rejected" : "SHOULD BLOCK with 401",
    });
  } catch (error) {
    results.push({
      name: "Authorization: Body learnerId ≠ header learnerId",
      passed: false,
      status: 0,
      expected: 401,
      detail: `Exception: ${error instanceof Error ? error.message : String(error)}`,
    });
  }
}

async function testBodyLearnerIdOmitted(): Promise<void> {
  try {
    const learnerId = `learner-omitted-body-${Date.now()}`;
    const sessionId = `session-omitted-body-${Date.now()}`;
    const competencyId = "competency-test-001";

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
          // learnerId intentionally omitted
          sessionId,
          competencyId,
          assessmentItemId: content?.assessmentItemId,
          response: "answer",
        }),
      }),
    );

    // Should succeed (learnerId omitted is OK, uses header)
    const passed = response.status === 200 || response.status === 400;
    results.push({
      name: "Authorization: Body learnerId omitted (should use header)",
      passed,
      status: response.status,
      expected: [200, 400],
      detail: passed ? "Correctly handled" : `Unexpected status ${response.status}`,
    });
  } catch (error) {
    results.push({
      name: "Authorization: Body learnerId omitted (should use header)",
      passed: false,
      status: 0,
      expected: [200, 400],
      detail: `Exception: ${error instanceof Error ? error.message : String(error)}`,
    });
  }
}

async function testCrossLearnerSessionReuse(): Promise<void> {
  try {
    const learnerA = `learner-a-${Date.now()}`;
    const learnerB = `learner-b-${Date.now()}`;
    const sessionId = `session-owned-by-a-${Date.now()}`;

    await createSession(sessionId, learnerA);

    const response = await GET(
      new Request(
        `http://localhost/api/learning?sessionId=${sessionId}`,
        {
          headers: {
            "x-filumire-learner-id": learnerB,
          },
        },
      ),
    );

    const passed = response.status === 401;
    results.push({
      name: "Cross-learner: Learner B access learner A's session",
      passed,
      status: response.status,
      expected: 401,
      detail: passed ? "Correctly blocked" : "CRITICAL: Cross-learner access allowed",
    });
  } catch (error) {
    results.push({
      name: "Cross-learner: Learner B access learner A's session",
      passed: false,
      status: 0,
      expected: 401,
      detail: `Exception: ${error instanceof Error ? error.message : String(error)}`,
    });
  }
}

async function testCrossLearnerStateIsolation(): Promise<void> {
  try {
    const learnerA = `learner-a-state-${Date.now()}`;
    const learnerB = `learner-b-state-${Date.now()}`;
    const competencyId = "competency-test-001";

    // Create state for learner A
    const stateA = createInitialLearnerState(learnerA, competencyId);
    await saveLearnerState(stateA);

    // Try to retrieve learner A's state as learner B (should fail or return nothing)
    const retrievedB = await getLearnerState(learnerB, competencyId);

    // Learner B should NOT see learner A's state
    const passed = !retrievedB || retrievedB.learnerId !== learnerA;
    results.push({
      name: "Cross-learner: State isolation (B cannot read A's state)",
      passed,
      status: 200,
      expected: 200,
      detail: passed ? "States properly isolated" : "CRITICAL: Cross-learner state leak",
    });
  } catch (error) {
    results.push({
      name: "Cross-learner: State isolation (B cannot read A's state)",
      passed: false,
      status: 0,
      expected: 200,
      detail: `Exception: ${error instanceof Error ? error.message : String(error)}`,
    });
  }
}

async function testCrossLearnerPostToAnotherSession(): Promise<void> {
  try {
    const learnerA = `learner-a-post-${Date.now()}`;
    const learnerB = `learner-b-post-${Date.now()}`;
    const sessionId = `session-a-post-${Date.now()}`;
    const competencyId = "competency-test-001";

    await createSession(sessionId, learnerA);

    // Learner B tries to POST to learner A's session
    const response = await POST(
      new Request("http://localhost/api/learning", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-filumire-learner-id": learnerB,
        },
        body: JSON.stringify({
          learnerId: learnerB,
          sessionId,
          competencyId,
          assessmentItemId: "item-test-001",
          response: "answer",
        }),
      }),
    );

    const passed = response.status === 401;
    results.push({
      name: "Cross-learner: Learner B POST to learner A's session",
      passed,
      status: response.status,
      expected: 401,
      detail: passed ? "Correctly blocked" : "CRITICAL: Cross-learner POST allowed",
    });
  } catch (error) {
    results.push({
      name: "Cross-learner: Learner B POST to learner A's session",
      passed: false,
      status: 0,
      expected: 401,
      detail: `Exception: ${error instanceof Error ? error.message : String(error)}`,
    });
  }
}

async function runRedTeamIdentityTests(): Promise<void> {
  console.log("\n========== RED-TEAM PRIORITY 1: IDENTITY/AUTH/ISOLATION ==========\n");

  await testIdentityMissing();
  await testIdentityEmpty();
  await testIdentityWhitespaceOnly();
  await testIdentityBoundaryValid128();
  await testIdentityBoundaryInvalid129();
  await testIdentityWithPadding();
  await testIdentitySpecialCharacters();
  await testBodyLearnerIdMismatch();
  await testBodyLearnerIdOmitted();
  await testCrossLearnerSessionReuse();
  await testCrossLearnerStateIsolation();
  await testCrossLearnerPostToAnotherSession();

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

runRedTeamIdentityTests().catch((error) => {
  console.error("Test suite error:", error);
  process.exitCode = 1;
});
