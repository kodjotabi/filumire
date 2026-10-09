import { POST } from "../apps/learner/app/api/learning/route";
import { getEvidence } from "../services/evidence-store";
import { getLearnerState } from "../services/learner-state-store";
import { persistenceStore } from "../services/persistence-provider";
import { seedContent } from "../services/content-store/seed";

function assert(
  condition: boolean,
  message: string,
): void {
  if (!condition) {
    throw new Error(`FAIL: ${message}`);
  }
}

const COMPETENCY_ID = "competency-test-001";
const ASSESSMENT_ITEM_ID =
  "item-number-sequence-diagnostic-001-en";
const EXPECTED_RESPONSE = "8";

function learningRequest(
  learnerId: string,
  body: Record<string, unknown>,
): Request {
  return new Request("http://localhost/api/learning", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-filumire-learner-id": learnerId,
    },
    body: JSON.stringify(body),
  });
}

async function runConcurrencyHardeningTest(): Promise<void> {
  seedContent();

  // 1. Two genuinely concurrent requests with the SAME
  // clientRequestId must not both apply evidence: exactly one
  // trusted evidence record, and both responses must report
  // the same, coherent final progress.
  const learnerId = `learner-concurrency-${crypto.randomUUID()}`;
  const sessionId = `session-concurrency-${crypto.randomUUID()}`;
  const clientRequestId = crypto.randomUUID();

  await persistenceStore.ensureLearnerExists(learnerId);

  const duplicateBody = {
    sessionId,
    interactionType: "assessment",
    assessmentItemId: ASSESSMENT_ITEM_ID,
    competencyId: COMPETENCY_ID,
    response: EXPECTED_RESPONSE,
    clientRequestId,
  };

  const [firstResult, secondResult] = await Promise.all([
    POST(learningRequest(learnerId, duplicateBody)),
    POST(learningRequest(learnerId, duplicateBody)),
  ]);

  assert(
    firstResult.status === 200 &&
      secondResult.status === 200,
    `expected both concurrent identical submissions to succeed, got ${firstResult.status} and ${secondResult.status}`,
  );

  const firstJson = await firstResult.json() as {
    assessment?: { result?: { duplicate?: boolean } };
    progress: { evidenceCount: number };
  };
  const secondJson = await secondResult.json() as {
    assessment?: { result?: { duplicate?: boolean } };
    progress: { evidenceCount: number };
  };

  const duplicateFlags = [
    firstJson.assessment?.result?.duplicate === true,
    secondJson.assessment?.result?.duplicate === true,
  ];

  assert(
    duplicateFlags.filter(Boolean).length === 1,
    "exactly one of two concurrent identical submissions must be recognised as the duplicate",
  );

  const evidenceAfterConcurrent = await getEvidence(
    learnerId,
    COMPETENCY_ID,
  );

  assert(
    evidenceAfterConcurrent.length === 1,
    `expected exactly one trusted evidence record from concurrent duplicate submissions, got ${evidenceAfterConcurrent.length}`,
  );

  assert(
    firstJson.progress.evidenceCount === 1 &&
      secondJson.progress.evidenceCount === 1,
    "both concurrent responses must report the same coherent evidence count, not a stale read",
  );

  console.log({
    test: "concurrent identical clientRequestId cannot double-apply evidence",
    result: "PASS",
  });

  // 2. Two genuinely concurrent requests with DIFFERENT
  // clientRequestIds are both legitimate new submissions and
  // must not lose an update to the other (no lost-update race
  // on learner state under concurrency).
  const raceLearnerId = `learner-concurrency-race-${crypto.randomUUID()}`;
  await persistenceStore.ensureLearnerExists(raceLearnerId);

  const bodyA = {
    sessionId: `session-race-a-${crypto.randomUUID()}`,
    interactionType: "assessment",
    assessmentItemId: ASSESSMENT_ITEM_ID,
    competencyId: COMPETENCY_ID,
    response: EXPECTED_RESPONSE,
    clientRequestId: crypto.randomUUID(),
  };
  const bodyB = {
    ...bodyA,
    sessionId: `session-race-b-${crypto.randomUUID()}`,
    response: "9",
    clientRequestId: crypto.randomUUID(),
  };

  const [resultA, resultB] = await Promise.all([
    POST(learningRequest(raceLearnerId, bodyA)),
    POST(learningRequest(raceLearnerId, bodyB)),
  ]);

  assert(
    resultA.status === 200 && resultB.status === 200,
    `expected both concurrent distinct submissions to succeed, got ${resultA.status} and ${resultB.status}`,
  );

  const evidenceAfterRace = await getEvidence(
    raceLearnerId,
    COMPETENCY_ID,
  );

  assert(
    evidenceAfterRace.length === 2,
    `expected both concurrent distinct submissions to persist as separate evidence, got ${evidenceAfterRace.length}`,
  );

  const stateAfterRace = await getLearnerState(
    raceLearnerId,
    COMPETENCY_ID,
  );
  const competencyAfterRace =
    stateAfterRace?.competencies.find(
      (item) => item.competencyId === COMPETENCY_ID,
    );

  assert(
    competencyAfterRace?.evidenceCount === 2,
    `expected learner state to reflect both concurrent submissions without a lost update, got ${competencyAfterRace?.evidenceCount}`,
  );

  console.log({
    test: "concurrent distinct submissions do not lose an update",
    result: "PASS",
  });

  console.log({
    concurrencyHardeningTest: "PASS",
    persistence: process.env.FILUMIRE_PERSISTENCE ?? "memory",
  });
}

runConcurrencyHardeningTest().catch((error) => {
  console.error(error);
  process.exit(1);
});
