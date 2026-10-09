import { GET, POST } from "../apps/learner/app/api/learning/route";
import {
  createInitialLearnerState,
  getLearnerState,
  saveLearnerState,
  applyEvidence,
} from "../services/learner-state";
import { createSession } from "../services/session";
import {
  getContentForCompetency,
} from "../services/content-store";
import { seedContent } from "../services/content-store/seed";

function assert(
  condition: boolean,
  message: string,
): void {
  if (!condition) throw new Error(`FAIL: ${message}`);
}

async function testSessionPersistence(): Promise<void> {
  seedContent();

  const learnerId = `learner-session-persist-${Date.now()}`;
  const competencyId = "competency-test-001";
  const sessionId = `session-persist-${Date.now()}`;

  console.log({
    test: "Session state persistence across requests",
    learnerId,
    sessionId,
  });

  // Step 1: Initialize via GET
  const getResponse1 = await GET(
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
    getResponse1.status === 200,
    "Initial GET failed",
  );

  const result1 = (await getResponse1.json()) as any;
  const initialMastery =
    result1.learnerState.competencies[0]
      .masteryEstimate;
  const initialEvidence =
    result1.learnerState.competencies[0].evidenceCount;

  console.log({
    step: "Initial GET",
    mastery: initialMastery,
    evidence: initialEvidence,
  });

  // Step 2: Submit assessment via POST
  const content = getContentForCompetency(
    competencyId,
  ).find(
    (c) =>
      (c.type === "assessment" || c.type === "practice") &&
      c.assessmentItemId,
  );

  if (!content?.assessmentItemId) {
    throw new Error("No assessment content");
  }

  if (!content.metadata?.expectedResponse) {
    throw new Error(
      "No expected response for assessment",
    );
  }

  const postResponse = await POST(
    new Request("http://localhost/api/learning", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-filumire-learner-id": learnerId,
      },
      body: JSON.stringify({
        learnerId,
        sessionId,
        interactionType: "assessment",
        assessmentItemId: content.assessmentItemId,
        competencyId,
        response: content.metadata.expectedResponse,
      }),
    }),
  );

  assert(
    postResponse.status === 200,
    "POST assessment failed",
  );

  const postResult = (await postResponse.json()) as any;
  const postMastery =
    postResult.learnerState.competencies[0]
      .masteryEstimate;
  const postEvidence =
    postResult.learnerState.competencies[0]
      .evidenceCount;

  console.log({
    step: "POST assessment",
    mastery: postMastery,
    evidence: postEvidence,
  });

  // Step 3: Get updated state via GET
  const getResponse2 = await GET(
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
    getResponse2.status === 200,
    "Follow-up GET failed",
  );

  const result2 = (await getResponse2.json()) as any;
  const finalMastery =
    result2.learnerState.competencies[0]
      .masteryEstimate;
  const finalEvidence =
    result2.learnerState.competencies[0]
      .evidenceCount;

  console.log({
    step: "Follow-up GET",
    mastery: finalMastery,
    evidence: finalEvidence,
  });

  // Verify state consistency
  assert(
    finalEvidence > initialEvidence,
    `Evidence count did not increase: initial=${initialEvidence}, final=${finalEvidence}`,
  );

  assert(
    finalEvidence === postEvidence,
    `Final GET evidence differs from POST response: post=${postEvidence}, final=${finalEvidence}`,
  );

  assert(
    finalMastery === postMastery,
    `Final GET mastery differs from POST response: post=${postMastery}, final=${finalMastery}`,
  );

  // Verify via direct persistence check
  const directState = await getLearnerState(
    learnerId,
    competencyId,
  );

  assert(
    directState?.competencies[0].evidenceCount ===
      finalEvidence,
    "Direct persistence query differs from API",
  );

  console.log({
    test: "Session state persistence across requests",
    result: "PASS",
    initialEvidence,
    finalEvidence,
    stateConsistent: true,
  });
}

testSessionPersistence().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
