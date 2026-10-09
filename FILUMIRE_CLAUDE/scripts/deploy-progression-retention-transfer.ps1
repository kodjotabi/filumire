$ErrorActionPreference = "Stop"

$Root = "C:\Users\tabi\Desktop\filumire\FILUMIRE_CORE"

@'
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
  recordRetentionCheck,
  recordTransferCheck,
} from "../services/retention-transfer/index";

import type {
  AssessmentSubmission,
} from "../packages/contracts";

seedContent();

async function runCompetency003Loop(): Promise<void> {
  const learnerId =
    "learner-test-003-validation";

  const sessionId =
    "session-competency-003-validation";

  let learnerState =
    createInitialLearnerState(
      learnerId,
      "competency-test-003",
    );

  await saveLearnerState(
    learnerState,
  );

  /*
   * COMPETENCY 003
   * Establish mastery.
   */

  const responses003 = [
    "24",
    "24",
    "24",
    "24",
  ];

  for (
    let index = 0;
    index < responses003.length;
    index += 1
  ) {
    const submission:
      AssessmentSubmission = {
      learnerId,

      sessionId:
        `${sessionId}-003-${index + 1}`,

      assessmentItemId:
        "item-next-curriculum-competency-diagnostic-001",

      competencyId:
        "competency-test-003",

      response:
        responses003[index],
    };

    const assessment =
      evaluateAssessment(
        submission,
        "24",
      );

    learnerState =
      applyEvidence(
        learnerState,
        assessment.evidence,
      );

    await saveLearnerState(
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
      learnerState.competencies[0];

    console.log({
      competency: "003",

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

      nextCompetency:
        decision.decision.competencyId,

      contentType:
        decision.content?.type,

      contentTitle:
        decision.content?.title,
    });

    if (
      decision.decision.action ===
        "advance" &&
      decision.decision.competencyId ===
        "competency-test-004"
    ) {
      learnerState = {
        ...learnerState,

        competencies: [
          {
            learnerId,

            competencyId:
              "competency-test-004",

            masteryEstimate:
              0,

            evidenceCount:
              0,

            confidence:
              0,

            diagnosticState:
              "unknown",

            diagnosticConfidence:
              0,

            errorPatterns:
              [],

            interventionHistory:
              [],

            prerequisiteState:
              {},

            retentionState: {
              status:
                "not_tested",

              confidence:
                0,

              evidenceIds:
                [],
            },

            transferState: {
              status:
                "not_tested",

              confidence:
                0,

              evidenceIds:
                [],
            },

            readinessState: {
              readyForAdvancement:
                false,

              confidence:
                0,

              reasonCode:
                "NEW_COMPETENCY",

              evaluatedAt:
                new Date()
                  .toISOString(),
            },

            lastUpdated:
              new Date()
                .toISOString(),

            stateVersion:
              "state-0.3",
          },

          ...learnerState.competencies,
        ],
      };

      await saveLearnerState(
        learnerState,
      );

      break;
    }
  }

  /*
   * Reload the persisted state.
   */

  const persisted004 =
    await getLearnerState(
      learnerId,
      "competency-test-004",
    );

  if (!persisted004) {
    throw new Error(
      "Expected persisted learner state for competency-test-004.",
    );
  }

  learnerState =
    persisted004;

  /*
   * COMPETENCY 004
   *
   * mastery
   * -> retention
   * -> transfer
   * -> advance
   */

  const responses004 = [
    "40",
    "40",
    "40",
    "40",
  ];

  for (
    let index = 0;
    index < responses004.length;
    index += 1
  ) {
    const submission:
      AssessmentSubmission = {
      learnerId,

      sessionId:
        `${sessionId}-004-${index + 1}`,

      assessmentItemId:
        "item-following-number-patterns-diagnostic-001",

      competencyId:
        "competency-test-004",

      response:
        responses004[index],
    };

    const assessment =
      evaluateAssessment(
        submission,
        "40",
      );

    learnerState =
      applyEvidence(
        learnerState,
        assessment.evidence,
      );

    await saveLearnerState(
      learnerState,
    );

    let decision =
      await makeAdaptiveDecision({
        learnerId,

        sessionId:
          submission.sessionId,

        learnerState,
      });

    let competency =
      learnerState.competencies[0];

    console.log({
      competency: "004",

      attempt:
        index + 1,

      outcome:
        assessment.evidence.outcome,

      masteryEstimate:
        competency.masteryEstimate,

      confidence:
        competency.confidence,

      retention:
        competency.retentionState
          ?.status,

      transfer:
        competency.transferState
          ?.status,

      action:
        decision.decision.action,

      reasonCode:
        decision.decision.reasonCode,

      nextCompetency:
        decision.decision.competencyId,

      contentType:
        decision.content?.type,

      contentTitle:
        decision.content?.title,
    });

    /*
     * RETENTION
     */

    if (
      decision.decision.action ===
      "retention_check"
    ) {
      const retention =
        await recordRetentionCheck({
          learnerId,

          competencyId:
            "competency-test-004",

          evidenceId:
            `evidence-retention-004-${index + 1}`,

          outcome:
            "correct",
        });

      console.log({
        retentionCheck:
          retention.status,

        confidence:
          retention.confidence,
      });

      const persisted =
        await getLearnerState(
          learnerId,
          "competency-test-004",
        );

      if (!persisted) {
        throw new Error(
          "Learner state disappeared after retention check.",
        );
      }

      learnerState =
        persisted;

      decision =
        await makeAdaptiveDecision({
          learnerId,

          sessionId:
            `${sessionId}-004-retention-${index + 1}`,

          learnerState,
        });

      console.log({
        afterRetention:
          decision.decision.action,

        reasonCode:
          decision.decision.reasonCode,
      });
    }

    /*
     * TRANSFER
     */

    if (
      decision.decision.action ===
      "transfer_check"
    ) {
      const transfer =
        await recordTransferCheck({
          learnerId,

          competencyId:
            "competency-test-004",

          evidenceId:
            `evidence-transfer-004-${index + 1}`,

          outcome:
            "correct",
        });

      console.log({
        transferCheck:
          transfer.status,

        confidence:
          transfer.confidence,
      });

      const persisted =
        await getLearnerState(
          learnerId,
          "competency-test-004",
        );

      if (!persisted) {
        throw new Error(
          "Learner state disappeared after transfer check.",
        );
      }

      learnerState =
        persisted;

      decision =
        await makeAdaptiveDecision({
          learnerId,

          sessionId:
            `${sessionId}-004-transfer-${index + 1}`,

          learnerState,
        });

      console.log({
        afterTransfer:
          decision.decision.action,

        reasonCode:
          decision.decision.reasonCode,

        competency:
          decision.decision
            .competencyId,
      });
    }

    /*
     * ADVANCEMENT
     */

    if (
      decision.decision.action ===
        "advance" &&
      decision.decision.competencyId ===
        "competency-test-005"
    ) {
      learnerState = {
        ...learnerState,

        competencies: [
          {
            learnerId,

            competencyId:
              "competency-test-005",

            masteryEstimate:
              0,

            evidenceCount:
              0,

            confidence:
              0,

            diagnosticState:
              "unknown",

            diagnosticConfidence:
              0,

            errorPatterns:
              [],

            interventionHistory:
              [],

            prerequisiteState:
              {},

            retentionState: {
              status:
                "not_tested",

              confidence:
                0,

              evidenceIds:
                [],
            },

            transferState: {
              status:
                "not_tested",

              confidence:
                0,

              evidenceIds:
                [],
            },

            readinessState: {
              readyForAdvancement:
                false,

              confidence:
                0,

              reasonCode:
                "NEW_COMPETENCY",

              evaluatedAt:
                new Date()
                  .toISOString(),
            },

            lastUpdated:
              new Date()
                .toISOString(),

            stateVersion:
              "state-0.3",
          },

          ...learnerState.competencies,
        ],
      };

      await saveLearnerState(
        learnerState,
      );

      break;
    }
  }

  /*
   * Verify competency 005 exists in persistence.
   */

  const persisted005 =
    await getLearnerState(
      learnerId,
      "competency-test-005",
    );

  if (!persisted005) {
    throw new Error(
      "Expected competency-test-005 to be persisted after advancement.",
    );
  }

  learnerState =
    persisted005;

  /*
   * COMPETENCY 005
   * Must begin with diagnosis.
   */

  const competency005Decision =
    await makeAdaptiveDecision({
      learnerId,

      sessionId:
        `${sessionId}-005-diagnostic`,

      learnerState,
    });

  console.log({
    competency:
      "005",

    attempt:
      1,

    outcome:
      "not-yet-assessed",

    masteryEstimate:
      learnerState
        .competencies[0]
        .masteryEstimate,

    confidence:
      learnerState
        .competencies[0]
        .confidence,

    action:
      competency005Decision
        .decision.action,

    reasonCode:
      competency005Decision
        .decision.reasonCode,

    nextCompetency:
      competency005Decision
        .decision.competencyId,

    contentType:
      competency005Decision
        .content?.type,

    contentTitle:
      competency005Decision
        .content?.title,
  });

  if (
    competency005Decision
      .decision.action !==
    "diagnose"
  ) {
    throw new Error(
      `Expected competency-test-005 to begin with diagnose, received ${competency005Decision.decision.action}.`,
    );
  }

  if (
    competency005Decision
      .decision.competencyId !==
    "competency-test-005"
  ) {
    throw new Error(
      "Expected diagnostic decision to target competency-test-005.",
    );
  }

  if (
    competency005Decision
      .content?.type !==
    "assessment"
  ) {
    throw new Error(
      "Expected competency-test-005 diagnostic content to be an assessment.",
    );
  }

  if (
    competency005Decision
      .content
      ?.assessmentItemId !==
    "item-applying-number-pattern-rules-diagnostic-001"
  ) {
    throw new Error(
      "Expected competency-test-005 diagnostic assessment item was not selected.",
    );
  }

  if (
    competency005Decision
      .content
      ?.title !==
    "Applying Number Pattern Rules Check"
  ) {
    throw new Error(
      "Expected competency-test-005 diagnostic assessment title was not selected.",
    );
  }

  console.log({
    progression:
      "competency-test-004 → retention → transfer → advance → competency-test-005 → diagnose",

    result:
      "PASS",

    diagnosticContentType:
      competency005Decision
        .content.type,

    diagnosticContentTitle:
      competency005Decision
        .content.title,

    diagnosticAssessmentItemId:
      competency005Decision
        .content
        .assessmentItemId,
  });
}

runCompetency003Loop().catch(
  (error) => {
    console.error(error);
    process.exitCode = 1;
  },
);
'@ | Set-Content `
  "$Root\tests\competency-003-adaptive-loop.test.ts" `
  -Encoding UTF8

Write-Host ""
Write-Host "Complete progression retention-transfer test installed."
Write-Host ""
Write-Host "Run:"
Write-Host "npx tsx --env-file=.env.local ./tests/competency-003-adaptive-loop.test.ts"