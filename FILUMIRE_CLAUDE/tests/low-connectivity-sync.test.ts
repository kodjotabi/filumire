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

async function runLowConnectivitySyncTests(): Promise<void> {
  seedContent();

  // 1. A retried submission with the same client request id
  // must not create duplicate trusted evidence or double-apply
  // mastery/progress (safe synchronization idempotency).
  const learnerId = `learner-sync-${crypto.randomUUID()}`;
  const sessionId = `session-sync-${crypto.randomUUID()}`;
  const clientRequestId = crypto.randomUUID();

  await persistenceStore.ensureLearnerExists(learnerId);

  const submissionBody = {
    sessionId,
    interactionType: "assessment",
    assessmentItemId: ASSESSMENT_ITEM_ID,
    competencyId: COMPETENCY_ID,
    response: EXPECTED_RESPONSE,
    clientRequestId,
  };

  const firstResponse = await POST(
    learningRequest(learnerId, submissionBody),
  );

  assert(
    firstResponse.status === 200,
    `expected first synchronization to succeed, got ${firstResponse.status}`,
  );

  const firstBody = await firstResponse.json() as {
    assessment?: {
      result?: { correct?: boolean; duplicate?: boolean };
    };
    progress: {
      evidenceCount: number;
      masteryEstimate: number;
      confidence: number;
    };
  };

  assert(
    firstBody.assessment?.result?.correct === true &&
      firstBody.assessment?.result?.duplicate !== true,
    "first synchronization must be evaluated as new, trusted evidence",
  );

  const evidenceAfterFirst = await getEvidence(
    learnerId,
    COMPETENCY_ID,
  );

  assert(
    evidenceAfterFirst.length === 1,
    "first successful synchronization must persist exactly one evidence record",
  );

  console.log({
    test: "first synchronization creates real evidence",
    result: "PASS",
  });

  // Retry the EXACT same submission (simulating a client that
  // never received the first response and resends after
  // reconnecting).
  const retryResponse = await POST(
    learningRequest(learnerId, submissionBody),
  );

  assert(
    retryResponse.status === 200,
    `expected idempotent retry to still succeed, got ${retryResponse.status}`,
  );

  const retryBody = await retryResponse.json() as {
    assessment?: {
      result?: { correct?: boolean; duplicate?: boolean };
    };
    progress: {
      evidenceCount: number;
      masteryEstimate: number;
      confidence: number;
    };
  };

  assert(
    retryBody.assessment?.result?.duplicate === true,
    "retried synchronization with the same client request id must be recognised as a duplicate",
  );

  const evidenceAfterRetry = await getEvidence(
    learnerId,
    COMPETENCY_ID,
  );

  assert(
    evidenceAfterRetry.length === 1,
    "repeated synchronization must not create a second trusted evidence record",
  );

  const stateAfterRetry = await getLearnerState(
    learnerId,
    COMPETENCY_ID,
  );
  const competencyAfterRetry =
    stateAfterRetry?.competencies.find(
      (item) => item.competencyId === COMPETENCY_ID,
    );

  assert(
    competencyAfterRetry?.evidenceCount === 1 &&
      retryBody.progress.evidenceCount === 1 &&
      retryBody.progress.masteryEstimate ===
        firstBody.progress.masteryEstimate &&
      retryBody.progress.confidence ===
        firstBody.progress.confidence,
    "repeated synchronization must not double-apply mastery/progress",
  );

  console.log({
    test: "duplicate synchronization is idempotent",
    result: "PASS",
  });

  // 2. A different client request id represents a genuinely
  // new interaction and must be recorded as new evidence.
  const secondSubmission = {
    ...submissionBody,
    response: "9",
    clientRequestId: crypto.randomUUID(),
  };

  const secondResponse = await POST(
    learningRequest(learnerId, secondSubmission),
  );

  assert(
    secondResponse.status === 200,
    `expected a genuinely new submission to succeed, got ${secondResponse.status}`,
  );

  const secondBody = await secondResponse.json() as {
    assessment?: { result?: { duplicate?: boolean } };
  };

  assert(
    secondBody.assessment?.result?.duplicate !== true,
    "a new client request id must not be treated as a duplicate",
  );

  const evidenceAfterSecond = await getEvidence(
    learnerId,
    COMPETENCY_ID,
  );

  assert(
    evidenceAfterSecond.length === 2,
    "a genuinely new submission must persist as its own evidence record",
  );

  console.log({
    test: "new client request id creates new evidence",
    result: "PASS",
  });

  // 3. The client cannot use the sync path to claim
  // correctness/mastery/retention/transfer outcomes directly.
  const forgedInteractionResponse = await POST(
    learningRequest(learnerId, {
      sessionId,
      interactionType: "retention",
      competencyId: COMPETENCY_ID,
      outcome: "correct",
      clientRequestId: crypto.randomUUID(),
    }),
  );

  assert(
    forgedInteractionResponse.status === 400,
    `expected client-claimed retention outcome to remain rejected even with a clientRequestId, got ${forgedInteractionResponse.status}`,
  );

  console.log({
    test: "queued interaction cannot establish retention/transfer outcomes",
    result: "PASS",
  });

  // 4. Malformed/stale pending submissions fail safely rather
  // than silently succeeding.
  const malformedResponse = await POST(
    learningRequest(learnerId, {
      sessionId,
      interactionType: "assessment",
      assessmentItemId: ASSESSMENT_ITEM_ID,
      competencyId: COMPETENCY_ID,
      // missing response
      clientRequestId: crypto.randomUUID(),
    }),
  );

  assert(
    malformedResponse.status === 400,
    `expected malformed pending submission replay to fail safely, got ${malformedResponse.status}`,
  );

  console.log({
    test: "malformed pending submission fails safely",
    result: "PASS",
  });

  // 5. An unauthorized/cross-learner session must not become a
  // successful synchronization.
  const unauthorizedLearnerId =
    `learner-sync-unauthorized-${crypto.randomUUID()}`;
  await persistenceStore.ensureLearnerExists(
    unauthorizedLearnerId,
  );

  const crossLearnerResponse = await POST(
    learningRequest(unauthorizedLearnerId, {
      ...submissionBody,
      sessionId,
      clientRequestId: crypto.randomUUID(),
    }),
  );

  assert(
    crossLearnerResponse.status === 401,
    `expected a session owned by another learner to be rejected, got ${crossLearnerResponse.status}`,
  );

  const evidenceForUnauthorizedLearner = await getEvidence(
    unauthorizedLearnerId,
    COMPETENCY_ID,
  );

  assert(
    evidenceForUnauthorizedLearner.length === 0,
    "a rejected cross-learner synchronization attempt must not create evidence",
  );

  console.log({
    test: "cross-learner session synchronization rejected",
    result: "PASS",
  });

  console.log({
    lowConnectivitySyncTest: "PASS",
    persistence: process.env.FILUMIRE_PERSISTENCE ?? "memory",
  });
}

runLowConnectivitySyncTests().catch((error) => {
  console.error(error);
  process.exit(1);
});
