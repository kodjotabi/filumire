import {
  createInitialLearnerState,
  applyEvidence,
} from "../services/learner-state";

import {
  evaluateAssessment,
} from "../services/assessment";

import {
  makeAdaptiveDecision,
} from "../services/adaptive-engine";

import {
  getIntervention,
  evaluateInterventionFromEvidence,
} from "../services/intervention-store";

import {
  saveEvidence,
} from "../services/evidence-store";

function assert(
  condition: boolean,
  message: string,
): void {
  if (!condition) {
    throw new Error(
      `FAIL: ${message}`,
    );
  }
}

async function main(): Promise<void> {
  const learnerId =
    "learner-intervention-failure";

  const competencyId =
    "competency-test-001";

  const sessionId =
    `session-intervention-failure-${Date.now()}`;

  let learnerState =
    createInitialLearnerState(
      learnerId,
      competencyId,
    );

  /*
   * 1. Initial incorrect evidence.
   */

  const initialSubmission = {
    learnerId,
    sessionId,
    assessmentItemId:
      "item-intervention-failure-001",
    competencyId,
    response:
      "incorrect-answer",
  };

  const initialAssessment =
    await evaluateAssessment(
      initialSubmission,
      "correct-answer",
    );

  await saveEvidence(
    initialAssessment.evidence,
  );

  learnerState =
    applyEvidence(
      learnerState,
      initialAssessment.evidence,
    );

  /*
   * 2. Adaptive engine creates the
   * first intervention.
   */

  const firstDecision =
    await makeAdaptiveDecision({
      learnerId,
      sessionId,
      learnerState,
    });

  console.log({
    stage:
      "initial adaptive decision",

    action:
      firstDecision
        .decision
        .action,

    reasonCode:
      firstDecision
        .decision
        .reasonCode,

    interventionId:
      firstDecision
        .decision
        .interventionId,
  });

  assert(
    Boolean(
      firstDecision
        .decision
        .interventionId,
    ),
    "initial adaptive decision must create an intervention",
  );

  const firstInterventionId =
    firstDecision
      .decision
      .interventionId!;

  const firstIntervention =
    await getIntervention(
      firstInterventionId,
    );

  assert(
    Boolean(firstIntervention),
    "initial intervention must be retrievable",
  );

  /*
   * 3. The learner remains incorrect.
   * This is deliberate failure evidence.
   */

  const failedRecoverySubmission = {
    ...initialSubmission,

    sessionId:
      `${sessionId}-failed-recovery`,

    assessmentItemId:
      "item-intervention-failure-002",

    response:
      "still-incorrect",

    interventionId:
      firstInterventionId,
  };

  const failedRecovery =
    await evaluateAssessment(
      failedRecoverySubmission,
      "correct-answer",
    );

  console.log(
    "FAILED RECOVERY EVIDENCE:",
    failedRecovery.evidence,
  );

  assert(
    failedRecovery.evidence.outcome ===
      "incorrect",
    "failed recovery evidence must be incorrect",
  );

  assert(
    failedRecovery.evidence.interventionId ===
      firstInterventionId,
    "failed recovery evidence must preserve intervention identity",
  );

  assert(
    failedRecovery.evidence.interventionType ===
      firstIntervention?.type,
    "failed recovery evidence must preserve intervention type",
  );

  await saveEvidence(
    failedRecovery.evidence,
  );

  learnerState =
    applyEvidence(
      learnerState,
      failedRecovery.evidence,
    );

  /*
   * 4. Mark the first intervention
   * as ineffective.
   */

  const ineffective =
    await evaluateInterventionFromEvidence(
      firstInterventionId,
      {
        id:
          failedRecovery.evidence.id,

        outcome:
          failedRecovery.evidence.outcome,
      },
    );

  console.log({
    stage:
      "intervention outcome",

    interventionId:
      ineffective.interventionId,

    status:
      ineffective.status,

    outcome:
      ineffective.outcome,

    evidenceIds:
      ineffective.evidenceIds,
  });

  assert(
    ineffective.status ===
      "completed",
    "failed intervention must become completed",
  );

  assert(
    ineffective.outcome ===
      "ineffective",
    "incorrect recovery evidence must mark intervention ineffective",
  );

  /*
   * 5. Re-run the adaptive engine.
   *
   * The learner state now contains an
   * ineffective intervention.
   */

  const reassessmentSessionId =
    `${sessionId}-reassessment`;

  const reassessmentDecision =
    await makeAdaptiveDecision({
      learnerId,
      sessionId:
        reassessmentSessionId,
      learnerState,
    });

  console.log({
    stage:
      "post-failure adaptive decision",

    action:
      reassessmentDecision
        .decision
        .action,

    reasonCode:
      reassessmentDecision
        .decision
        .reasonCode,

    interventionId:
      reassessmentDecision
        .decision
        .interventionId,

    contentType:
      reassessmentDecision
        .content
        ?.type,
  });

  /*
   * 6. The intelligence policy must
   * change course after failure.
   */

  assert(
    reassessmentDecision
      .decision
      .action ===
      "reassess",
    "ineffective intervention must cause reassessment",
  );

  assert(
    reassessmentDecision
      .decision
      .reasonCode ===
      "INEFFECTIVE_INTERVENTION",
    "reassessment must use INEFFECTIVE_INTERVENTION reason code",
  );

  /*
   * 7. Reassessment must create a
   * distinct intervention.
   */

  assert(
    Boolean(
      reassessmentDecision
        .decision
        .interventionId,
    ),
    "reassessment must create a new intervention",
  );

  const reassessmentInterventionId =
    reassessmentDecision
      .decision
      .interventionId!;

  assert(
    reassessmentInterventionId !==
      firstInterventionId,
    "reassessment must create a distinct intervention",
  );

  const reassessmentIntervention =
    await getIntervention(
      reassessmentInterventionId,
    );

  assert(
    Boolean(
      reassessmentIntervention,
    ),
    "reassessment intervention must be retrievable",
  );

  assert(
    reassessmentIntervention?.type ===
      "reassess",
    "new intervention must be of type reassess",
  );

  assert(
    reassessmentIntervention?.decisionId ===
      reassessmentDecision
        .decision
        .id,
    "reassessment intervention must point to its originating decision",
  );

  /*
   * 8. Final report.
   */

  console.log({
    interventionFailureRecovery:
      "PASS",

    failedIntervention:
      firstInterventionId,

    failedOutcome:
      ineffective.outcome,

    reassessmentIntervention:
      reassessmentInterventionId,

    reassessmentAction:
      reassessmentDecision
        .decision
        .action,

    reassessmentReason:
      reassessmentDecision
        .decision
        .reasonCode,
  });
}

main().catch(
  (error) => {
    console.error(error);
    process.exit(1);
  },
);