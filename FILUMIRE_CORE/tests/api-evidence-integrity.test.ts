import { POST } from "../apps/learner/app/api/learning/route";
import { createSession } from "../services/session";
import {
  createInitialLearnerState,
  getLearnerState,
  saveLearnerState,
} from "../services/learner-state";

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

async function testClientControlledRetentionOutcome(): Promise<void> {
  const learnerId = "learner-retention-forgery";
  const competencyId = "competency-test-004";
  const sessionId = `session-retention-forgery-${Date.now()}`;

  await saveLearnerState(
    createInitialLearnerState(
      learnerId,
      competencyId,
    ),
  );

  await createSession(sessionId, learnerId);

  const before = await getLearnerState(
    learnerId,
    competencyId,
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
        interactionType: "retention",
        competencyId,
        outcome: "correct",
      }),
    }),
  );

  const after = await getLearnerState(
    learnerId,
    competencyId,
  );

  const beforeStatus =
    before?.competencies[0]?.retentionState?.status;

  const afterStatus =
    after?.competencies[0]?.retentionState?.status;

  console.log({
    test: "client-controlled retention outcome",
    actualStatus: response.status,
    submittedOutcome: "correct",
    retentionBefore: beforeStatus,
    retentionAfter: afterStatus,
    result:
      response.status === 200 &&
      afterStatus === "retained"
        ? "VULNERABILITY"
        : "BLOCKED_OR_UNPROVEN",
  });
}

async function testClientControlledTransferOutcome(): Promise<void> {
  const learnerId = "learner-transfer-forgery";
  const competencyId = "competency-test-004";
  const sessionId = `session-transfer-forgery-${Date.now()}`;

  await saveLearnerState(
    createInitialLearnerState(
      learnerId,
      competencyId,
    ),
  );

  await createSession(sessionId, learnerId);

  const before = await getLearnerState(
    learnerId,
    competencyId,
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
        interactionType: "transfer",
        competencyId,
        outcome: "correct",
      }),
    }),
  );

  const after = await getLearnerState(
    learnerId,
    competencyId,
  );

  const beforeStatus =
    before?.competencies[0]?.transferState?.status;

  const afterStatus =
    after?.competencies[0]?.transferState?.status;

  console.log({
    test: "client-controlled transfer outcome",
    actualStatus: response.status,
    submittedOutcome: "correct",
    transferBefore: beforeStatus,
    transferAfter: afterStatus,
    result:
      response.status === 200 &&
      afterStatus === "demonstrated"
        ? "VULNERABILITY"
        : "BLOCKED_OR_UNPROVEN",
  });
}

async function runSecurityTests(): Promise<void> {
  await testClientControlledRetentionOutcome();
  await testClientControlledTransferOutcome();

  console.log({
    securityTest:
      "client-controlled retention and transfer evidence integrity",
    result: "COMPLETE",
  });
}

runSecurityTests().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
