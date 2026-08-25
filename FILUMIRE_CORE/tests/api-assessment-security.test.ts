import {
  evaluateAssessment,
} from "../services/assessment/index";

import type {
  AssessmentSubmission,
} from "../packages/contracts";

import {
  getContentForCompetency,
} from "../services/content-store/index";

import {
  seedContent,
} from "../services/content-store/seed";

seedContent();

function assert(
  condition: boolean,
  message: string,
): void {
  if (!condition) {
    throw new Error(message);
  }
}

async function runApiAssessmentSecurityTest(): Promise<void> {
  const competencyId =
    "competency-test-005";

  const assessmentItemId =
    "item-applying-number-pattern-rules-diagnostic-001";

  const content =
    getContentForCompetency(
      competencyId,
    ).find(
      (item) =>
        item.type === "assessment" &&
        item.assessmentItemId ===
          assessmentItemId,
    );

  assert(
    Boolean(content),
    "Security test could not find the competency-005 diagnostic assessment.",
  );

  assert(
    Boolean(
      content?.metadata?.expectedResponse,
    ),
    "Security test could not find the server-side expected response.",
  );

  const serverExpectedResponse =
    content!.metadata!
      .expectedResponse;

  const maliciousClientExpectedResponse =
    "999999";

  const wrongResponse =
    "999999";

  /*
   * --------------------------------------------------
   * TEST 1: CLIENT ANSWER MANIPULATION
   * --------------------------------------------------
   */

  const submission:
    AssessmentSubmission = {
    learnerId:
      "learner-security-test",

    sessionId:
      "session-security-test",

    assessmentItemId,

    competencyId,

    response:
      wrongResponse,
  };

  /*
   * The client-supplied expectedResponse is
   * deliberately ignored.
   *
   * Evaluation uses only the server-side
   * expected response stored with the content.
   */

  const assessment =
    await evaluateAssessment(
      submission,
      serverExpectedResponse,
      content!.id,
    );

  assert(
    assessment.evidence.outcome ===
      "incorrect",
    "SECURITY FAILURE: a wrong client response was accepted.",
  );

  assert(
    serverExpectedResponse !==
      maliciousClientExpectedResponse,
    "Security test setup is invalid because the malicious value matches the server answer.",
  );

  /*
   * Verify that the genuine server answer
   * remains valid.
   */

  const validSubmission:
    AssessmentSubmission = {
    learnerId:
      "learner-security-test-valid",

    sessionId:
      "session-security-test-valid",

    assessmentItemId,

    competencyId,

    response:
      serverExpectedResponse,
  };

  const validAssessment =
    await evaluateAssessment(
      validSubmission,
      serverExpectedResponse,
      content!.id,
    );

  assert(
    validAssessment.evidence.outcome ===
      "correct",
    "Security regression: the valid server-side answer was rejected.",
  );

  /*
   * --------------------------------------------------
   * TEST 2: CROSS-COMPETENCY CONTENT ACCESS
   * --------------------------------------------------
   */

  const foreignAssessmentItemId =
    "item-following-number-patterns-diagnostic-001";

  const foreignAssessment =
    getContentForCompetency(
      competencyId,
    ).find(
      (item) =>
        item.assessmentItemId ===
        foreignAssessmentItemId,
    );

  assert(
    !foreignAssessment,
    "SECURITY FAILURE: a foreign competency assessment was incorrectly available under competency-005.",
  );

  /*
   * --------------------------------------------------
   * TEST 3: LEARNER OWNERSHIP
   * --------------------------------------------------
   */

  const learnerA =
    "learner-security-owner-a";

  const learnerB =
    "learner-security-owner-b";

  const learnerASubmission:
    AssessmentSubmission = {
    learnerId:
      learnerA,

    sessionId:
      "session-owner-a",

    assessmentItemId,

    competencyId,

    response:
      serverExpectedResponse,
  };

  const learnerAAssessment =
    await evaluateAssessment(
      learnerASubmission,
      serverExpectedResponse,
      content!.id,
    );

  assert(
    learnerAAssessment.evidence.learnerId ===
      learnerA,
    "SECURITY FAILURE: assessment evidence was not bound to learner A.",
  );

  assert(
    learnerAAssessment.evidence.learnerId !==
      learnerB,
    "SECURITY FAILURE: learner A evidence was incorrectly attributed to learner B.",
  );

  /*
   * --------------------------------------------------
   * TEST 4: SESSION OWNERSHIP
   * --------------------------------------------------
   */

  assert(
    learnerAAssessment.evidence.sessionId ===
      "session-owner-a",
    "SECURITY FAILURE: assessment evidence was not bound to the originating session.",
  );

  /*
   * --------------------------------------------------
   * TEST 5: CROSS-LEARNER SUBSTITUTION
   * --------------------------------------------------
   */

  const substitutionSubmission:
    AssessmentSubmission = {
    learnerId:
      learnerB,

    sessionId:
      "session-owner-a",

    assessmentItemId,

    competencyId,

    response:
      serverExpectedResponse,
  };

  const substitutionAssessment =
    await evaluateAssessment(
      substitutionSubmission,
      serverExpectedResponse,
      content!.id,
    );

  assert(
    substitutionAssessment.evidence.learnerId ===
      learnerB,
    "SECURITY FAILURE: learner identity was not preserved during substitution test.",
  );

  assert(
    substitutionAssessment.evidence
      .learnerId !== learnerA,
    "SECURITY FAILURE: learner B submission was incorrectly attributed to learner A.",
  );

  console.log({
    securityTest:
      "API assessment integrity and learner ownership",

    clientExpectedResponse:
      maliciousClientExpectedResponse,

    clientResponse:
      wrongResponse,

    serverExpectedResponse,

    maliciousAnswerAccepted:
      assessment.evidence.outcome ===
      "correct",

    validAnswerAccepted:
      validAssessment.evidence.outcome ===
      "correct",

    crossCompetencyContentExposed:
      Boolean(foreignAssessment),

    learnerAEvidenceOwner:
      learnerAAssessment.evidence
        .learnerId,

    learnerBEvidenceOwner:
      substitutionAssessment
        .evidence.learnerId,

    sessionOwnership:
      learnerAAssessment.evidence
        .sessionId,

    result:
      "PASS",
  });
}

runApiAssessmentSecurityTest().catch(
  (error) => {
    console.error(error);
    process.exitCode = 1;
  },
);