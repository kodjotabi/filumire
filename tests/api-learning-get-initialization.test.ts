import { GET } from "../apps/learner/app/api/learning/route";
import { getLearnerState } from "../services/learner-state";
import {
  persistenceStore,
} from "../services/persistence-provider";

function assert(
  condition: boolean,
  message: string,
): void {
  if (!condition) throw new Error(`FAIL: ${message}`);
}

async function testGetInitialization(): Promise<void> {
  const learnerId = `learner-get-init-${Date.now()}`;
  const sessionId = `session-get-init-${Date.now()}`;
  const competencyId = "competency-test-001";

  console.log({
    test: "GET /api/learning initialization",
    learnerId,
    sessionId,
  });

  // Call GET endpoint
  const response = await GET(
    new Request(
      `http://localhost/api/learning?sessionId=${sessionId}`,
      {
        headers: {
          "x-filumire-learner-id": learnerId,
        },
      },
    ),
  );

  assert(
    response.status === 200,
    `Expected 200, got ${response.status}`,
  );

  const result = (await response.json()) as any;

  // Verify response structure
  assert(
    result.learnerState,
    "Response missing learnerState",
  );

  assert(
    result.learnerState.learnerId === learnerId,
    `Learner ID mismatch: expected ${learnerId}, got ${result.learnerState.learnerId}`,
  );

  assert(
    Array.isArray(result.learnerState.competencies),
    "learnerState.competencies must be an array",
  );

  assert(
    result.learnerState.competencies.length > 0,
    "learnerState must include at least one competency",
  );

  const competency = result.learnerState.competencies[0];
  assert(
    competency.competencyId === competencyId,
    `Expected competency ${competencyId}, got ${competency.competencyId}`,
  );

  assert(
    typeof competency.masteryEstimate === "number",
    "masteryEstimate must be a number",
  );

  assert(
    typeof competency.confidence === "number",
    "confidence must be a number",
  );

  assert(
    typeof competency.evidenceCount === "number",
    "evidenceCount must be a number",
  );

  // Verify decision structure
  assert(
    result.decision,
    "Response missing decision",
  );

  assert(
    result.decision.action,
    "decision missing action",
  );

  assert(
    result.decision.competencyId === competencyId,
    `decision.competencyId mismatch`,
  );

  assert(
    result.decision.reasonCode,
    "decision missing reasonCode",
  );

  // Verify instruction structure
  assert(
    result.instruction,
    "Response missing instruction",
  );

  assert(
    result.instruction.content,
    "instruction missing content",
  );

  // Verify session created in persistence
  const sessionLearnerId =
    await persistenceStore.getSessionLearnerId(sessionId);

  assert(
    sessionLearnerId === learnerId,
    `Session not created or learner mismatch`,
  );

  // Verify learner state created in persistence
  const persistedState = await getLearnerState(
    learnerId,
    competencyId,
  );

  if (!persistedState) {
    throw new Error("Learner state not persisted");
  }

  assert(
    persistedState.learnerId === learnerId,
    "Persisted state has wrong learner ID",
  );

  console.log({
    test: "GET /api/learning initialization",
    result: "PASS",
    sessionCreated: true,
    learnerStateCreated: true,
    decisionGenerated: true,
    instructionGenerated: true,
  });
}

testGetInitialization().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
