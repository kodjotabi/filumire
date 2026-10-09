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
  saveEvidence,
} from "../services/evidence-store";

import {
  seedContent,
} from "../services/content-store/seed";

function assert(
  condition: boolean,
  message: string,
): void {
  if (!condition) {
    throw new Error(`FAIL: ${message}`);
  }
}

async function runCompleteInterventionLoop(): Promise<void> {
  seedContent();

  const learnerId =
    "learner-complete-intervention-loop";

  const competencyId =
    "competency-test-001";

  const sessionId =
    "session-complete-intervention-loop";

  let state =
    createInitialLearnerState(
      learnerId,
      competencyId,
    );

  /*
   * 1. Produce diagnostic evidence showing
   * conceptual misunderstanding.
   */

  const diagnostic =
    await evaluateAssessment(
      {
        learnerId,
        sessionId,
        assessmentItemId:
          "item-complete-intervention-diagnostic-001",
        competencyId,
        response:
          "incorrect-answer",
      },
      "correct-answer",
      undefined,
      {
        diagnosticRules:
          JSON.stringify({
            "incorrect-answer": {
              errorPattern:
                "sequence_rule_not_identified",

              diagnosticState:
                "conceptual_misunderstanding",

              diagnosticConfidence:
                0.9,
            },
          }),
      },
    );

  await saveEvidence(
    diagnostic.evidence,
  );

  state =
    applyEvidence(
      state,
      diagnostic.evidence,
    );

  /*
   * 2. Adaptive engine should create a
   * teaching intervention.
   */

  const teachingDecision =
    await makeAdaptiveDecision({
      learnerId,
      sessionId,
      learnerState: state,
    });

  console.log({
    stage:
      "initial adaptive decision",

    action:
      teachingDecision.decision.action,

    reasonCode:
      teachingDecision.decision
        .reasonCode,

    interventionId:
      teachingDecision.decision
        .interventionId,
  });

  assert(
    teachingDecision.decision.action ===
      "teach",
    "diagnostic misunderstanding must produce teach",
  );

  assert(
    Boolean(
      teachingDecision.decision
        .interventionId,
    ),
    "teach decision must create an intervention",
  );

  const interventionId =
    teachingDecision.decision
      .interventionId!;

  /*
   * 3. Recovery assessment succeeds after
   * the intervention.
   */

  const recoveryAssessment =
    await evaluateAssessment(
      {
        learnerId,
        sessionId:
          `${sessionId}-recovery`,
        assessmentItemId:
          "item-complete-intervention-recovery-001",
        competencyId,
        response:
          "correct-answer",
        interventionId,
      },
      "correct-answer",
      undefined,
      {
        interventionType:
          teachingDecision.decision
            .action,
      },
    );

  console.log(
    "RECOVERY EVIDENCE:",
    recoveryAssessment.evidence,
  );

  assert(
    recoveryAssessment.evidence.outcome ===
      "correct",
    "recovery assessment must be correct",
  );

  assert(
    recoveryAssessment.evidence
      .interventionId ===
      interventionId,
    "recovery evidence must reference the teaching intervention",
  );

  assert(
    recoveryAssessment.evidence
      .interventionType ===
      teachingDecision.decision.action,
    "recovery evidence must preserve intervention type",
  );

  await saveEvidence(
    recoveryAssessment.evidence,
  );

  /*
   * 4. Apply recovery evidence to the
   * learner model.
   */

  state =
    applyEvidence(
      state,
      recoveryAssessment.evidence,
    );

  console.log(
    "STATE AFTER APPLY:",
    JSON.stringify(
      state.competencies[0]
        .interventionHistory,
      null,
      2,
    ),
  );

  const interventionRecord =
    state.competencies[0]
      .interventionHistory
      .find(
        (record) =>
          record.interventionId ===
          interventionId,
      );

  assert(
    Boolean(interventionRecord),
    "learner state must contain the intervention record",
  );

  assert(
    interventionRecord?.evidenceIds.includes(
      recoveryAssessment.evidence.id,
    ) ?? false,
    "intervention record must contain recovery evidence",
  );

  console.log({
    completeInterventionLoop:
      "PASS",

    interventionId,

    recoveryOutcome:
      recoveryAssessment.evidence
        .outcome,

    interventionType:
      recoveryAssessment.evidence
        .interventionType,

    evidenceId:
      recoveryAssessment.evidence.id,
  });
}

runCompleteInterventionLoop().catch(
  (error) => {
    console.error(error);
    process.exitCode = 1;
  },
);