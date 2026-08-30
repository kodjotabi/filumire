import { POST } from "../apps/learner/app/api/learning/route";
import { createSession } from "../services/session";
import {
  createInitialLearnerState,
  saveLearnerState,
  applyEvidence,
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
// PRIORITY 5: STATE/PROGRESSION INTEGRITY
// ============================================================================

async function testInitialStateIsZero(): Promise<void> {
  try {
    const learnerId = `learner-initial-state-${Date.now()}`;
    const competencyId = "competency-test-001";

    const state = createInitialLearnerState(learnerId, competencyId);
    const comp = state.competencies[0];

    const passed =
      comp.masteryEstimate === 0 &&
      comp.confidence === 0 &&
      comp.evidenceCount === 0;

    results.push({
      name: "State Integrity: Initial state is zero",
      passed,
      status: 200,
      expected: 200,
      detail: passed
        ? "Initial state correct (mastery=0, confidence=0, evidence=0)"
        : `State corrupted: mastery=${comp.masteryEstimate}, confidence=${comp.confidence}, evidence=${comp.evidenceCount}`,
    });
  } catch (error) {
    results.push({
      name: "State Integrity: Initial state is zero",
      passed: false,
      status: 0,
      expected: 200,
      detail: `Exception: ${error instanceof Error ? error.message : String(error)}`,
    });
  }
}

async function testSingleCorrectAnswerProgression(): Promise<void> {
  try {
    const learnerId = `learner-single-correct-${Date.now()}`;
    const competencyId = "competency-test-001";
    const sessionId = `session-single-correct-${Date.now()}`;

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
          response: validAnswer,
        }),
      }),
    );

    const body = await response.json();
    const mastery = body.learnerState?.competencies[0]?.masteryEstimate;
    const evidenceCount = body.learnerState?.competencies[0]?.evidenceCount;

    // Single correct answer should increase mastery
    const passed =
      response.status === 200 && mastery > 0 && evidenceCount === 1;
    results.push({
      name: "Progression: Single correct answer increases mastery",
      passed,
      status: response.status,
      expected: 200,
      detail: passed
        ? `Mastery increased to ${mastery}, evidence=1`
        : `Mastery=${mastery}, evidence=${evidenceCount}`,
    });
  } catch (error) {
    results.push({
      name: "Progression: Single correct answer increases mastery",
      passed: false,
      status: 0,
      expected: 200,
      detail: `Exception: ${error instanceof Error ? error.message : String(error)}`,
    });
  }
}

async function testMultipleWrongAnswersNoMastery(): Promise<void> {
  try {
    const learnerId = `learner-multiple-wrong-${Date.now()}`;
    const competencyId = "competency-test-001";
    const sessionId = `session-multiple-wrong-${Date.now()}`;

    await createSession(sessionId, learnerId);
    await saveLearnerState(
      createInitialLearnerState(learnerId, competencyId),
    );

    const content = getContentForCompetency(competencyId).find(
      (c) => c.assessmentItemId,
    );

    // Submit 3 wrong answers
    let mastery = 0;
    for (let i = 0; i < 3; i++) {
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
            response: `wrong-answer-${i}`,
          }),
        }),
      );

      const body = await response.json();
      mastery = body.learnerState?.competencies[0]?.masteryEstimate;
    }

    // Wrong answers should not grant mastery
    const passed = mastery <= 0.5; // mastery should stay low
    results.push({
      name: "Progression: Multiple wrong answers do not grant mastery",
      passed,
      status: 200,
      expected: 200,
      detail: passed
        ? `Mastery stayed low (${mastery})`
        : `VULNERABILITY: Mastery rose to ${mastery} despite wrong answers`,
    });
  } catch (error) {
    results.push({
      name: "Progression: Multiple wrong answers do not grant mastery",
      passed: false,
      status: 0,
      expected: 200,
      detail: `Exception: ${error instanceof Error ? error.message : String(error)}`,
    });
  }
}

async function testPrematureRetentionBlockedByDefault(): Promise<void> {
  try {
    const learnerId = `learner-premature-retention-${Date.now()}`;
    const competencyId = "competency-test-001";

    const state = createInitialLearnerState(learnerId, competencyId);
    const comp = state.competencies[0];

    // Initial state should NOT be ready for retention
    const passed =
      comp.retentionState?.status !== "retained" &&
      comp.readinessState?.readyForAdvancement !== true;

    results.push({
      name: "Progression: Premature retention blocked (initial state)",
      passed,
      status: 200,
      expected: 200,
      detail: passed
        ? "Initial state correctly not ready for advancement"
        : "VULNERABILITY: Initial state marked ready for advancement",
    });
  } catch (error) {
    results.push({
      name: "Progression: Premature retention blocked (initial state)",
      passed: false,
      status: 0,
      expected: 200,
      detail: `Exception: ${error instanceof Error ? error.message : String(error)}`,
    });
  }
}

async function testRetentionStateCalculated(): Promise<void> {
  try {
    const learnerId = `learner-retention-state-${Date.now()}`;
    const competencyId = "competency-test-001";

    let state = createInitialLearnerState(learnerId, competencyId);

    // Apply 4 correct answers to reach mastery
    for (let i = 0; i < 4; i++) {
      state = applyEvidence(state, {
        id: `evidence-mastery-${i}`,
        learnerId,
        competencyId,
        source: "assessment",
        outcome: "correct",
        timestamp: new Date().toISOString(),
        assessmentItemId: `item-${i}`,
        sessionId: "session-test",
        policyVersion: "test",
        interventionType: "practice",
      });
    }

    const comp = state.competencies[0];
    const masteryReached = comp.masteryEstimate >= 0.8;
    const retentionCheck =
      comp.retentionState?.status === "not_tested" ||
      comp.retentionState?.status === "not_retained";

    const passed = masteryReached && retentionCheck;
    results.push({
      name: "Progression: Retention state after mastery",
      passed,
      status: 200,
      expected: 200,
      detail: passed
        ? `Retention properly calculated (${comp.retentionState?.status})`
        : `State invalid: mastery=${comp.masteryEstimate}, retention=${comp.retentionState?.status}`,
    });
  } catch (error) {
    results.push({
      name: "Progression: Retention state after mastery",
      passed: false,
      status: 0,
      expected: 200,
      detail: `Exception: ${error instanceof Error ? error.message : String(error)}`,
    });
  }
}

async function testTransferStateRequiresRetention(): Promise<void> {
  try {
    const learnerId = `learner-transfer-requires-retention-${Date.now()}`;
    const competencyId = "competency-test-001";

    let state = createInitialLearnerState(learnerId, competencyId);

    // Apply mastery
    for (let i = 0; i < 4; i++) {
      state = applyEvidence(state, {
        id: `evidence-mastery-transfer-${i}`,
        learnerId,
        competencyId,
        source: "assessment",
        outcome: "correct",
        timestamp: new Date().toISOString(),
        assessmentItemId: `item-transfer-${i}`,
        sessionId: "session-transfer",
        policyVersion: "test",
        interventionType: "practice",
      });
    }

    const comp = state.competencies[0];

    // Transfer should not be "demonstrated" without retention
    const retention = comp.retentionState?.status;
    const transfer = comp.transferState?.status;

    const passed =
      transfer !== "demonstrated" || retention === "retained";

    results.push({
      name: "Progression: Transfer requires retention",
      passed,
      status: 200,
      expected: 200,
      detail: passed
        ? `Transfer state correct (${transfer}) pending retention`
        : `VULNERABILITY: Transfer demonstrated without retention`,
    });
  } catch (error) {
    results.push({
      name: "Progression: Transfer requires retention",
      passed: false,
      status: 0,
      expected: 200,
      detail: `Exception: ${error instanceof Error ? error.message : String(error)}`,
    });
  }
}

async function testReadinessBlockedUntilFullProgression(): Promise<void> {
  try {
    const learnerId = `learner-readiness-blocked-${Date.now()}`;
    const competencyId = "competency-test-001";

    let state = createInitialLearnerState(learnerId, competencyId);
    const initialReady = state.competencies[0]?.readinessState
      ?.readyForAdvancement;

    // Apply just mastery, not retention/transfer
    for (let i = 0; i < 4; i++) {
      state = applyEvidence(state, {
        id: `evidence-readiness-${i}`,
        learnerId,
        competencyId,
        source: "assessment",
        outcome: "correct",
        timestamp: new Date().toISOString(),
        assessmentItemId: `item-readiness-${i}`,
        sessionId: "session-readiness",
        policyVersion: "test",
        interventionType: "practice",
      });
    }

    const afterMasteryReady = state.competencies[0]?.readinessState
      ?.readyForAdvancement;
    const retention = state.competencies[0]?.retentionState?.status;

    // Should not be ready until retention is verified
    const passed =
      initialReady !== true && afterMasteryReady !== true;

    results.push({
      name: "Progression: Readiness blocked without retention/transfer",
      passed,
      status: 200,
      expected: 200,
      detail: passed
        ? "Readiness correctly blocked"
        : `VULNERABILITY: Ready for advancement despite retention=${retention}`,
    });
  } catch (error) {
    results.push({
      name: "Progression: Readiness blocked without retention/transfer",
      passed: false,
      status: 0,
      expected: 200,
      detail: `Exception: ${error instanceof Error ? error.message : String(error)}`,
    });
  }
}

async function runRedTeamProgressionTests(): Promise<void> {
  console.log(
    "\n========== RED-TEAM PRIORITY 5: STATE/PROGRESSION INTEGRITY ==========\n",
  );

  await testInitialStateIsZero();
  await testSingleCorrectAnswerProgression();
  await testMultipleWrongAnswersNoMastery();
  await testPrematureRetentionBlockedByDefault();
  await testRetentionStateCalculated();
  await testTransferStateRequiresRetention();
  await testReadinessBlockedUntilFullProgression();

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

runRedTeamProgressionTests().catch((error) => {
  console.error("Test suite error:", error);
  process.exitCode = 1;
});
