import {
  createInitialLearnerState,
  applyEvidence,
  getLearnerState,
  saveLearnerState,
} from "../services/learner-state/index";

import {
  evaluateAssessment,
} from "../services/assessment/index";

import {
  makeAdaptiveDecision,
} from "../services/adaptive-engine/index";

import {
  seedContent,
} from "../services/content-store/seed";

import {
  saveEvidence,
} from "../services/evidence-store/index";

import {
  recordRetentionCheck,
  recordTransferCheck,
} from "../services/retention-transfer/index";

import type {
  AssessmentSubmission,
} from "../packages/contracts";

seedContent();

const learnerId =
  "learner-test-003-validation";

const sessionId =
  "session-competency-progression-validation";

async function persistState(
  state: Awaited<
    ReturnType<typeof createInitialLearnerState>
  >,
): Promise<void> {
  await saveLearnerState(state);
}

async function addNextCompetency(
  state: Awaited<
    ReturnType<typeof createInitialLearnerState>
  >,
  competencyId: string,
) {
  const next =
    createInitialLearnerState(
      learnerId,
      competencyId,
    ).competencies[0];

  const updated = {
    ...state,

    competencies: [
      next,
      ...state.competencies,
    ],

    updatedAt:
      new Date().toISOString(),

    stateVersion:
      "state-0.3",
  };

  await persistState(updated);

  const persisted =
    await getLearnerState(
      learnerId,
      competencyId,
    );

  if (!persisted) {
    throw new Error(
      `Failed to persist ${competencyId}.`,
    );
  }

  return persisted;
}

async function establishMastery(
  competencyId: string,
  correctResponse: string,
  assessmentItemId: string,
  state: Awaited<
    ReturnType<typeof createInitialLearnerState>
  >,
) {
  let learnerState = state;

  const responses = [
    correctResponse,
    correctResponse,
    correctResponse,
    correctResponse,
  ];

  let retentionRequested = false;

  for (
    let index = 0;
    index < responses.length;
    index += 1
  ) {
    const submission:
      AssessmentSubmission = {
      learnerId,

      sessionId:
        `${sessionId}-${competencyId}-${index + 1}`,

      assessmentItemId,

      competencyId,

      response:
        responses[index],
    };

    const assessment =
      await evaluateAssessment(
        submission,
        correctResponse,
      );

    await saveEvidence(
      assessment.evidence,
    );

    learnerState =
      applyEvidence(
        learnerState,
        assessment.evidence,
      );

    await persistState(
      learnerState,
    );

    const decision =
      await makeAdaptiveDecision({
        learnerId,

        sessionId:
          submission.sessionId,

        learnerState,
      });

    const competency =
      learnerState.competencies.find(
        (item) =>
          item.competencyId ===
          competencyId,
      );

    if (!competency) {
      throw new Error(
        `Competency state missing: ${competencyId}`,
      );
    }

    console.log({
      stage:
        "mastery evidence",

      competency:
        competencyId,

      attempt:
        index + 1,

      outcome:
        assessment.evidence.outcome,

      masteryEstimate:
        competency.masteryEstimate,

      confidence:
        competency.confidence,

      action:
        decision.decision.action,

      reasonCode:
        decision.decision.reasonCode,
    });

    if (
      decision.decision.action ===
      "retention_check"
    ) {
      retentionRequested = true;
      break;
    }
  }

  if (!retentionRequested) {
    throw new Error(
      `${competencyId} did not reach retention_check.`,
    );
  }

  const persisted =
    await getLearnerState(
      learnerId,
      competencyId,
    );

  if (!persisted) {
    throw new Error(
      `Persisted state missing for ${competencyId} before retention.`,
    );
  }

  learnerState =
    persisted;

  const retention =
    await recordRetentionCheck({
      learnerId,

      competencyId,

      evidenceId:
        `retention-${competencyId}-001`,

      outcome:
        "correct",
    });

  console.log({
    stage:
      "retention",

    competency:
      competencyId,

    status:
      retention.status,

    confidence:
      retention.confidence,
  });

  const afterRetention =
    await getLearnerState(
      learnerId,
      competencyId,
    );

  if (!afterRetention) {
    throw new Error(
      `Persisted state missing for ${competencyId} after retention.`,
    );
  }

  learnerState =
    afterRetention;

  const transferDecision =
    await makeAdaptiveDecision({
      learnerId,

      sessionId:
        `${sessionId}-${competencyId}-transfer`,

      learnerState,
    });

  console.log({
    stage:
      "post-retention decision",

    competency:
      competencyId,

    action:
      transferDecision.decision.action,

    reasonCode:
      transferDecision.decision.reasonCode,
  });

  if (
    transferDecision.decision.action !==
    "transfer_check"
  ) {
    throw new Error(
      `Expected ${competencyId} to require transfer after retention, received ${transferDecision.decision.action}.`,
    );
  }

  const transfer =
    await recordTransferCheck({
      learnerId,

      competencyId,

      evidenceId:
        `transfer-${competencyId}-001`,

      outcome:
        "correct",
    });

  console.log({
    stage:
      "transfer",

    competency:
      competencyId,

    status:
      transfer.status,

    confidence:
      transfer.confidence,
  });

  const afterTransfer =
    await getLearnerState(
      learnerId,
      competencyId,
    );

  if (!afterTransfer) {
    throw new Error(
      `Persisted state missing for ${competencyId} after transfer.`,
    );
  }

  learnerState =
    afterTransfer;

  const finalDecision =
    await makeAdaptiveDecision({
      learnerId,

      sessionId:
        `${sessionId}-${competencyId}-advance`,

      learnerState,
    });

  console.log({
    stage:
      "post-transfer decision",

    competency:
      competencyId,

    action:
      finalDecision.decision.action,

    reasonCode:
      finalDecision.decision.reasonCode,

    nextCompetency:
      finalDecision.nextCompetency,
  });

  if (
    finalDecision.decision.action !==
    "advance"
  ) {
    throw new Error(
      `Expected ${competencyId} to advance after retention and transfer, received ${finalDecision.decision.action}.`,
    );
  }

  return {
    state:
      learnerState,

    decision:
      finalDecision,
  };
}

async function runProgression(): Promise<void> {
  let learnerState =
    createInitialLearnerState(
      learnerId,
      "competency-test-002",
    );

  const prerequisite =
    learnerState.competencies[0];

  if (!prerequisite) {
    throw new Error(
      "Prerequisite competency state missing.",
    );
  }

  learnerState = {
    ...learnerState,

    competencies: [
      {
        ...prerequisite,

        competencyId:
          "competency-test-002",

        masteryEstimate: 1,

        evidenceCount: 5,

        confidence: 1,

        diagnosticState:
          "probable_mastery",

        diagnosticConfidence: 1,

        retentionState: {
          status: "retained" as const,
                  confidence: 1,
                  evidenceIds: [],
        },

        transferState: {
          status: "demonstrated" as const,
                  confidence: 1,
                  evidenceIds: [],
        },

        readinessState: {
          readyForAdvancement: true,

          confidence: 1,

          reasonCode:
            "MASTERY_THRESHOLD_REACHED",

          evaluatedAt:
            new Date().toISOString(),
        },
      },
    ],
  };

  learnerState =
    await addNextCompetency(
      learnerState,
      "competency-test-003",
    );

  const result003 =
    await establishMastery(
      "competency-test-003",
      "24",
      "item-next-curriculum-competency-diagnostic-001",
      learnerState,
    );

  if (
    result003.decision.nextCompetency !==
    "competency-test-004"
  ) {
    throw new Error(
      `Expected competency-test-003 to advance to competency-test-004, received ${result003.decision.nextCompetency}.`,
    );
  }

  console.log({
    stage:
      "003 advancement",

    result:
      "PASS",

    nextCompetency:
      result003.decision
        .nextCompetency,
  });

  const state003Completed = {
    ...result003.state,

    competencies:
      result003.state.competencies.map(
        (item) =>
          item.competencyId ===
          "competency-test-003"
            ? {
                ...item,

                retentionState: {
                  status: "retained" as const,
                  confidence: 1,
                  evidenceIds: [],
                },

                transferState: {
                  status: "demonstrated" as const,
                  confidence: 1,
                  evidenceIds: [],
                },
              }
            : item,
      ),
  };

  learnerState =
    await addNextCompetency(
      state003Completed,
      "competency-test-004",
    );

  const result004 =
    await establishMastery(
      "competency-test-004",
      "40",
      "item-following-number-patterns-diagnostic-001",
      learnerState,
    );

  if (
    result004.decision.nextCompetency !==
    "competency-test-005"
  ) {
    throw new Error(
      `Expected competency-test-004 to advance to competency-test-005, received ${result004.decision.nextCompetency}.`,
    );
  }

  console.log({
    stage:
      "004 advancement",

    result:
      "PASS",

    nextCompetency:
      result004.decision
        .nextCompetency,
  });

  learnerState =
    await addNextCompetency(
      result004.state,
      "competency-test-005",
    );

  const diagnosticDecision =
    await makeAdaptiveDecision({
      learnerId,

      sessionId:
        `${sessionId}-005-diagnostic`,

      learnerState,
    });

  console.log({
    stage:
      "005 diagnostic",

    competency:
      "competency-test-005",

    action:
      diagnosticDecision
        .decision.action,

    reasonCode:
      diagnosticDecision
        .decision.reasonCode,

    contentType:
      diagnosticDecision
        .content?.type,

    contentTitle:
      diagnosticDecision
        .content?.title,

    assessmentItemId:
      diagnosticDecision
        .content?.assessmentItemId,
  });

  if (
    diagnosticDecision.decision.action !==
    "diagnose"
  ) {
    throw new Error(
      `Expected competency-test-005 to begin with diagnose, received ${diagnosticDecision.decision.action}.`,
    );
  }

  if (
    diagnosticDecision
      .decision.competencyId !==
    "competency-test-005"
  ) {
    throw new Error(
      "Diagnostic decision did not target competency-test-005.",
    );
  }

  if (
    diagnosticDecision.content?.type !==
    "assessment"
  ) {
    throw new Error(
      "Expected competency-test-005 diagnostic content to be an assessment.",
    );
  }

  if (
    diagnosticDecision.content
      ?.assessmentItemId !==
    "item-applying-number-pattern-rules-diagnostic-001"
  ) {
    throw new Error(
      "Expected competency-test-005 diagnostic assessment item.",
    );
  }

  if (
    diagnosticDecision.content
      ?.title !==
    "Applying Number Pattern Rules Check"
  ) {
    throw new Error(
      "Expected competency-test-005 diagnostic title.",
    );
  }

  console.log({
    progression:
      "003 -> retention -> transfer -> advance -> 004 -> retention -> transfer -> advance -> 005 -> diagnose",

    result:
      "PASS",

    diagnosticContentType:
      diagnosticDecision.content.type,

    diagnosticContentTitle:
      diagnosticDecision.content.title,

    diagnosticAssessmentItemId:
      diagnosticDecision.content
        .assessmentItemId,
  });
}

runProgression().catch(
  (error) => {
    console.error(error);
    process.exitCode = 1;
  },
);

