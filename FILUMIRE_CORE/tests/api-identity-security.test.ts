import { GET, POST } from "../apps/learner/app/api/learning/route";
import { createSession } from "../services/session";
import {
  createInitialLearnerState,
  getLearnerState,
  saveLearnerState,
} from "../services/learner-state";

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

async function testMissingIdentity(): Promise<void> {
  const response = await GET(
    new Request("http://localhost/api/learning"),
  );

  assert(response.status === 401, `Expected 401, received ${response.status}.`);

  console.log({
    test: "missing identity",
    expectedStatus: 401,
    actualStatus: response.status,
    result: "PASS",
  });
}

async function testValidIdentity(): Promise<void> {
  const learnerId = "learner-security-boundary-001";

  const response = await GET(
    new Request("http://localhost/api/learning", {
      headers: {
        "x-filumire-learner-id": learnerId,
      },
    }),
  );

  assert(response.status === 200, `Expected 200, received ${response.status}.`);

  const body = await response.json();

  assert(
    body.learnerState?.learnerId === learnerId,
    "Response learner identity does not match authenticated identity.",
  );

  console.log({
    test: "valid identity",
    expectedStatus: 200,
    actualStatus: response.status,
    result: "PASS",
  });
}

async function testMismatchedBodyIdentity(): Promise<void> {
  const response = await POST(
    new Request("http://localhost/api/learning", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-filumire-learner-id": "learner-security-boundary-001",
      },
      body: JSON.stringify({
        learnerId: "learner-attacker-target",
        sessionId: "session-security-boundary-001",
        assessmentItemId:
          "item-applying-number-pattern-rules-diagnostic-001",
        competencyId: "competency-test-005",
        response: "48",
      }),
    }),
  );

  assert(response.status === 401, `Expected 401, received ${response.status}.`);

  console.log({
    test: "mismatched body learner identity",
    expectedStatus: 401,
    actualStatus: response.status,
    result: "PASS",
  });
}

async function testMatchingBodyIdentity(): Promise<void> {
  const learnerId = "learner-security-boundary-001";
  const sessionId = `session-security-boundary-${Date.now()}`;

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
        assessmentItemId:
          "item-applying-number-pattern-rules-diagnostic-001",
        competencyId: "competency-test-005",
        response: "48",
        expectedResponse: "999999",
      }),
    }),
  );

  assert(response.status === 200, `Expected 200, received ${response.status}.`);

  const body = await response.json();

  assert(
    body.assessment?.result?.correct === true,
    "Valid learner response was not accepted.",
  );

  console.log({
    test: "matching body learner identity",
    expectedStatus: 200,
    actualStatus: response.status,
    result: "PASS",
  });
}

async function testCrossLearnerSessionReuse(): Promise<void> {
  const learnerA = "learner-session-owner-a";
  const learnerB = "learner-session-attacker-b";
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

  assert(response.status === 401, `Expected 401, received ${response.status}.`);

  console.log({
    test: "cross-learner session reuse",
    expectedStatus: 401,
    actualStatus: response.status,
    result: "PASS",
  });
}

async function testCrossLearnerSessionReuseOnPost(): Promise<void> {
  const learnerA = "learner-post-session-owner-a";
  const learnerB = "learner-post-session-attacker-b";
  const sessionId = `session-post-owned-by-a-${Date.now()}`;

  await createSession(sessionId, learnerA);

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
        assessmentItemId:
          "item-applying-number-pattern-rules-diagnostic-001",
        competencyId: "competency-test-005",
        response: "48",
      }),
    }),
  );

  assert(response.status === 401, `Expected 401, received ${response.status}.`);

  console.log({
    test: "cross-learner session reuse on POST",
    expectedStatus: 401,
    actualStatus: response.status,
    result: "PASS",
  });
}

async function testCrossLearnerRetentionModification(): Promise<void> {
  const ownerLearner = "learner-retention-owner-a";
  const attackerLearner = "learner-retention-attacker-b";
  const targetCompetencyId = "competency-test-004";
  const sessionId = `session-retention-attacker-${Date.now()}`;

  await saveLearnerState(
    createInitialLearnerState(
      ownerLearner,
      targetCompetencyId,
    ),
  );

  await saveLearnerState(
    createInitialLearnerState(
      attackerLearner,
      targetCompetencyId,
    ),
  );

  const ownerBefore = await getLearnerState(
    ownerLearner,
    targetCompetencyId,
  );

  await createSession(sessionId, attackerLearner);

  const response = await POST(
    new Request("http://localhost/api/learning", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-filumire-learner-id": attackerLearner,
      },
      body: JSON.stringify({
        learnerId: attackerLearner,
        sessionId,
        interactionType: "retention",
        competencyId: targetCompetencyId,
        outcome: "correct",
      }),
    }),
  );

  const ownerAfter = await getLearnerState(
    ownerLearner,
    targetCompetencyId,
  );

  const ownerBeforeStatus =
    ownerBefore?.competencies[0]?.retentionState?.status;

  const ownerAfterStatus =
    ownerAfter?.competencies[0]?.retentionState?.status;

  assert(
    ownerAfterStatus === ownerBeforeStatus,
    "SECURITY FAILURE: attacker modified another learner's retention state.",
  );

  console.log({
    test: "cross-learner retention modification",
    ownerLearner,
    attackerLearner,
    targetCompetencyId,
    actualStatus: response.status,
    ownerRetentionBefore: ownerBeforeStatus,
    ownerRetentionAfter: ownerAfterStatus,
    result:
      response.status === 200
        ? "VULNERABILITY"
        : response.status >= 500
          ? "UNPROVEN"
          : "BLOCKED",
  });
}

async function testCrossLearnerTransferModification(): Promise<void> {
  const ownerLearner = "learner-transfer-owner-a";
  const attackerLearner = "learner-transfer-attacker-b";
  const targetCompetencyId = "competency-test-004";
  const sessionId = `session-transfer-attacker-${Date.now()}`;

  await saveLearnerState(
    createInitialLearnerState(
      ownerLearner,
      targetCompetencyId,
    ),
  );

  await saveLearnerState(
    createInitialLearnerState(
      attackerLearner,
      targetCompetencyId,
    ),
  );

  const ownerBefore = await getLearnerState(
    ownerLearner,
    targetCompetencyId,
  );

  await createSession(sessionId, attackerLearner);

  const response = await POST(
    new Request("http://localhost/api/learning", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-filumire-learner-id": attackerLearner,
      },
      body: JSON.stringify({
        learnerId: attackerLearner,
        sessionId,
        interactionType: "transfer",
        competencyId: targetCompetencyId,
        outcome: "correct",
      }),
    }),
  );

  const ownerAfter = await getLearnerState(
    ownerLearner,
    targetCompetencyId,
  );

  const ownerBeforeStatus =
    ownerBefore?.competencies[0]?.transferState?.status;

  const ownerAfterStatus =
    ownerAfter?.competencies[0]?.transferState?.status;

  assert(
    ownerAfterStatus === ownerBeforeStatus,
    "SECURITY FAILURE: attacker modified another learner's transfer state.",
  );

  console.log({
    test: "cross-learner transfer modification",
    ownerLearner,
    attackerLearner,
    targetCompetencyId,
    actualStatus: response.status,
    ownerTransferBefore: ownerBeforeStatus,
    ownerTransferAfter: ownerAfterStatus,
    result:
      response.status === 200
        ? "VULNERABILITY"
        : response.status >= 500
          ? "UNPROVEN"
          : "BLOCKED",
  });
}

async function runSecurityTests(): Promise<void> {
  await testMissingIdentity();
  await testValidIdentity();
  await testMismatchedBodyIdentity();
  await testMatchingBodyIdentity();
  await testCrossLearnerSessionReuse();
  await testCrossLearnerSessionReuseOnPost();
  await testCrossLearnerRetentionModification();
  await testCrossLearnerTransferModification();

  console.log({
    securityTest:
      "identity, session, and cross-learner state ownership boundaries",
    result: "PASS",
  });
}

runSecurityTests().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
