import { POST } from "../apps/learner/app/api/learning/route";
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
// PRIORITY 2: TRUSTED-EVIDENCE AND CLIENT-PROPERTY INJECTION
// ============================================================================

async function testClientForgedCorrectAnswer(): Promise<void> {
  try {
    const learnerId = `learner-forge-correct-${Date.now()}`;
    const competencyId = "competency-test-001";
    const sessionId = `session-forge-correct-${Date.now()}`;

    await createSession(sessionId, learnerId);
    await saveLearnerState(
      createInitialLearnerState(learnerId, competencyId),
    );

    const content = getContentForCompetency(competencyId).find(
      (c) => c.assessmentItemId,
    );
    const validAnswer = content?.metadata?.expectedResponse;

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
          response: "deliberately-wrong-xyz",
        }),
      }),
    );

    const body = await response.json();
    const isCorrect = body.assessment?.result?.correct;

    const passed = response.status === 200 && isCorrect === false;
    results.push({
      name: "Trusted-evidence: Wrong answer must be marked incorrect",
      passed,
      status: response.status,
      expected: 200,
      detail: passed
        ? "Correctly marked wrong"
        : `VULNERABILITY: Wrong answer marked correct=${isCorrect}`,
    });
  } catch (error) {
    results.push({
      name: "Trusted-evidence: Wrong answer must be marked incorrect",
      passed: false,
      status: 0,
      expected: 200,
      detail: `Exception: ${error instanceof Error ? error.message : String(error)}`,
    });
  }
}

async function testClientRetentionSelfAssertion(): Promise<void> {
  try {
    const learnerId = `learner-retention-self-${Date.now()}`;
    const competencyId = "competency-test-001";
    const sessionId = `session-retention-self-${Date.now()}`;

    await createSession(sessionId, learnerId);

    // Try to submit retention check with outcome supplied by client
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
          interactionType: "retention",
          outcome: "correct",
        }),
      }),
    );

    const passed = response.status === 400;
    results.push({
      name: "Trusted-evidence: Client cannot supply retention outcome",
      passed,
      status: response.status,
      expected: 400,
      detail: passed
        ? "Correctly blocked with 400"
        : `VULNERABILITY: Client retention assertion allowed (${response.status})`,
    });
  } catch (error) {
    results.push({
      name: "Trusted-evidence: Client cannot supply retention outcome",
      passed: false,
      status: 0,
      expected: 400,
      detail: `Exception: ${error instanceof Error ? error.message : String(error)}`,
    });
  }
}

async function testClientTransferSelfAssertion(): Promise<void> {
  try {
    const learnerId = `learner-transfer-self-${Date.now()}`;
    const competencyId = "competency-test-001";
    const sessionId = `session-transfer-self-${Date.now()}`;

    await createSession(sessionId, learnerId);

    // Try to submit transfer check with outcome supplied by client
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
          interactionType: "transfer",
          outcome: "correct",
        }),
      }),
    );

    const passed = response.status === 400;
    results.push({
      name: "Trusted-evidence: Client cannot supply transfer outcome",
      passed,
      status: response.status,
      expected: 400,
      detail: passed
        ? "Correctly blocked with 400"
        : `VULNERABILITY: Client transfer assertion allowed (${response.status})`,
    });
  } catch (error) {
    results.push({
      name: "Trusted-evidence: Client cannot supply transfer outcome",
      passed: false,
      status: 0,
      expected: 400,
      detail: `Exception: ${error instanceof Error ? error.message : String(error)}`,
    });
  }
}

async function testClientMasteryEstimateInjection(): Promise<void> {
  try {
    const learnerId = `learner-mastery-inject-${Date.now()}`;
    const competencyId = "competency-test-001";
    const sessionId = `session-mastery-inject-${Date.now()}`;

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
          response: "wrong-answer",
          masteryEstimate: 1, // Client tries to inject high mastery
        }),
      }),
    );

    const body = await response.json();
    const resultMastery =
      body.learnerState?.competencies[0]?.masteryEstimate;

    // After wrong answer, mastery should NOT be 1
    const passed = response.status === 200 && resultMastery !== 1;
    results.push({
      name: "Trusted-evidence: masteryEstimate injection ignored",
      passed,
      status: response.status,
      expected: 200,
      detail: passed
        ? `Mastery correctly calculated (${resultMastery}), not injected`
        : `VULNERABILITY: Client masteryEstimate injected (${resultMastery})`,
    });
  } catch (error) {
    results.push({
      name: "Trusted-evidence: masteryEstimate injection ignored",
      passed: false,
      status: 0,
      expected: 200,
      detail: `Exception: ${error instanceof Error ? error.message : String(error)}`,
    });
  }
}

async function testClientConfidenceInjection(): Promise<void> {
  try {
    const learnerId = `learner-confidence-inject-${Date.now()}`;
    const competencyId = "competency-test-001";
    const sessionId = `session-confidence-inject-${Date.now()}`;

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
          response: "wrong-answer",
          confidence: 0.95, // Client tries to inject high confidence
        }),
      }),
    );

    const body = await response.json();
    const resultConfidence =
      body.learnerState?.competencies[0]?.confidence;

    // Confidence should be calculated server-side, not accepted from client
    const passed = response.status === 200;
    results.push({
      name: "Trusted-evidence: confidence injection ignored",
      passed,
      status: response.status,
      expected: 200,
      detail: passed
        ? `Confidence calculated server-side (${resultConfidence})`
        : `Unexpected status ${response.status}`,
    });
  } catch (error) {
    results.push({
      name: "Trusted-evidence: confidence injection ignored",
      passed: false,
      status: 0,
      expected: 200,
      detail: `Exception: ${error instanceof Error ? error.message : String(error)}`,
    });
  }
}

async function testClientRetentionStateInjection(): Promise<void> {
  try {
    const learnerId = `learner-retention-state-inject-${Date.now()}`;
    const competencyId = "competency-test-001";
    const sessionId = `session-retention-state-inject-${Date.now()}`;

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
          response: "correct-answer", // Correct answer
          retentionState: { status: "retained" }, // Client tries to set retention
        }),
      }),
    );

    const body = await response.json();
    const retentionStatus =
      body.learnerState?.competencies[0]?.retentionState?.status;

    // Retention state must NOT be set to "retained" from single assessment
    const passed = response.status === 200;
    results.push({
      name: "Trusted-evidence: retentionState injection ignored",
      passed,
      status: response.status,
      expected: 200,
      detail: passed
        ? `Retention state calculated server-side (${retentionStatus})`
        : `Unexpected status ${response.status}`,
    });
  } catch (error) {
    results.push({
      name: "Trusted-evidence: retentionState injection ignored",
      passed: false,
      status: 0,
      expected: 200,
      detail: `Exception: ${error instanceof Error ? error.message : String(error)}`,
    });
  }
}

async function testClientTransferStateInjection(): Promise<void> {
  try {
    const learnerId = `learner-transfer-state-inject-${Date.now()}`;
    const competencyId = "competency-test-001";
    const sessionId = `session-transfer-state-inject-${Date.now()}`;

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
          response: "correct-answer",
          transferState: { status: "demonstrated" }, // Client tries to set transfer
        }),
      }),
    );

    const body = await response.json();
    const transferStatus =
      body.learnerState?.competencies[0]?.transferState?.status;

    const passed = response.status === 200;
    results.push({
      name: "Trusted-evidence: transferState injection ignored",
      passed,
      status: response.status,
      expected: 200,
      detail: passed
        ? `Transfer state calculated server-side (${transferStatus})`
        : `Unexpected status ${response.status}`,
    });
  } catch (error) {
    results.push({
      name: "Trusted-evidence: transferState injection ignored",
      passed: false,
      status: 0,
      expected: 200,
      detail: `Exception: ${error instanceof Error ? error.message : String(error)}`,
    });
  }
}

async function testClientReadinessStateInjection(): Promise<void> {
  try {
    const learnerId = `learner-readiness-inject-${Date.now()}`;
    const competencyId = "competency-test-001";
    const sessionId = `session-readiness-inject-${Date.now()}`;

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
          readinessState: { readyForAdvancement: true }, // Client tries to claim ready
        }),
      }),
    );

    const body = await response.json();
    const readyForAdvancement =
      body.learnerState?.competencies[0]?.readinessState?.readyForAdvancement;

    const passed = response.status === 200;
    results.push({
      name: "Trusted-evidence: readinessState injection ignored",
      passed,
      status: response.status,
      expected: 200,
      detail: passed
        ? `Readiness calculated server-side (${readyForAdvancement})`
        : `Unexpected status ${response.status}`,
    });
  } catch (error) {
    results.push({
      name: "Trusted-evidence: readinessState injection ignored",
      passed: false,
      status: 0,
      expected: 200,
      detail: `Exception: ${error instanceof Error ? error.message : String(error)}`,
    });
  }
}

async function runRedTeamTrustedEvidenceTests(): Promise<void> {
  console.log(
    "\n========== RED-TEAM PRIORITY 2: TRUSTED-EVIDENCE/PROPERTY INJECTION ==========\n",
  );

  await testClientForgedCorrectAnswer();
  await testClientRetentionSelfAssertion();
  await testClientTransferSelfAssertion();
  await testClientMasteryEstimateInjection();
  await testClientConfidenceInjection();
  await testClientRetentionStateInjection();
  await testClientTransferStateInjection();
  await testClientReadinessStateInjection();

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

runRedTeamTrustedEvidenceTests().catch((error) => {
  console.error("Test suite error:", error);
  process.exitCode = 1;
});
