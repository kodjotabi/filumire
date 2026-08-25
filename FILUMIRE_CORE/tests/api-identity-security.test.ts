import { GET, POST } from "../apps/learner/app/api/learning/route";
import { createSession } from "../services/session";

function assert(
  condition: boolean,
  message: string,
): void {
  if (!condition) {
    throw new Error(message);
  }
}

async function testMissingIdentity(): Promise<void> {
  const request = new Request(
    "http://localhost/api/learning",
  );

  const response = await GET(request);

  assert(
    response.status === 401,
    `Expected 401 for missing identity, received ${response.status}.`,
  );

  console.log({
    test: "missing identity",
    expectedStatus: 401,
    actualStatus: response.status,
    result: "PASS",
  });
}

async function testValidIdentity(): Promise<void> {
  const request = new Request(
    "http://localhost/api/learning",
    {
      headers: {
        "x-filumire-learner-id":
          "learner-security-boundary-001",
      },
    },
  );

  const response = await GET(request);

  assert(
    response.status === 200,
    `Expected 200 for valid identity, received ${response.status}.`,
  );

  const body =
    await response.json();

  assert(
    body.learnerState?.learnerId ===
      "learner-security-boundary-001",
    "Response learner identity does not match the authenticated identity.",
  );

  console.log({
    test: "valid identity",
    expectedStatus: 200,
    actualStatus: response.status,
    learnerId:
      body.learnerState?.learnerId,
    result: "PASS",
  });
}

async function testMismatchedBodyIdentity(): Promise<void> {
  const request = new Request(
    "http://localhost/api/learning",
    {
      method: "POST",
      headers: {
        "content-type":
          "application/json",
        "x-filumire-learner-id":
          "learner-security-boundary-001",
      },
      body: JSON.stringify({
        learnerId:
          "learner-attacker-target",
        sessionId:
          "session-security-boundary-001",
        assessmentItemId:
          "item-applying-number-pattern-rules-diagnostic-001",
        competencyId:
          "competency-test-005",
        response: "48",
        expectedResponse: "48",
      }),
    },
  );

  const response =
    await POST(request);

  assert(
    response.status === 401,
    `Expected 401 for mismatched learner identity, received ${response.status}.`,
  );

  console.log({
    test: "mismatched body learner identity",
    expectedStatus: 401,
    actualStatus: response.status,
    result: "PASS",
  });
}

async function testMatchingBodyIdentity(): Promise<void> {
  const learnerId =
    "learner-security-boundary-001";

  const sessionId =
    `session-security-boundary-${Date.now()}`;

  await createSession(
    sessionId,
    learnerId,
  );

  const request = new Request(
    "http://localhost/api/learning",
    {
      method: "POST",
      headers: {
        "content-type":
          "application/json",
        "x-filumire-learner-id":
          learnerId,
      },
      body: JSON.stringify({
        learnerId,
        sessionId,
        assessmentItemId:
          "item-applying-number-pattern-rules-diagnostic-001",
        competencyId:
          "competency-test-005",
        response: "48",
        expectedResponse: "999999",
      }),
    },
  );

  const response =
    await POST(request);

  assert(
    response.status === 200,
    `Expected 200 for matching learner identity, received ${response.status}.`,
  );

  const body =
    await response.json();

  assert(
    body.assessment?.result?.correct ===
      true,
    "Valid learner response was not accepted.",
  );

  assert(
    body.assessment?.evidence
      ?.learnerId ===
      learnerId,
    "Assessment evidence was not bound to the authenticated learner identity.",
  );

  console.log({
    test: "matching body learner identity",
    expectedStatus: 200,
    actualStatus: response.status,
    learnerId:
      body.assessment?.evidence
        ?.learnerId,
    clientExpectedResponse:
      "999999",
    assessmentAccepted:
      body.assessment?.result
        ?.correct,
    sessionId,
    result: "PASS",
  });
}

async function runIdentitySecurityTests(): Promise<void> {
  await testMissingIdentity();
  await testValidIdentity();
  await testMismatchedBodyIdentity();
  await testMatchingBodyIdentity();

  console.log({
    securityTest:
      "learner identity and data ownership boundary",
    result: "PASS",
  });
}

runIdentitySecurityTests().catch(
  (error) => {
    console.error(error);
    process.exitCode = 1;
  },
);