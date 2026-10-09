$ErrorActionPreference = "Stop"

$Root = "C:\Users\tabi\Desktop\filumire\FILUMIRE_CORE"

@'
import type {
  AdaptiveDecisionRequest,
  AdaptiveDecisionResponse,
} from "../../packages/contracts";

import {
  getNextCompetency,
  prerequisitesSatisfied,
} from "../../packages/curriculum";

import {
  selectPedagogicalAction,
} from "../../packages/pedagogy";

import {
  selectLearningContent,
} from "../content-selection";

import {
  getEvidence,
} from "../evidence-store";

import {
  createIntervention,
} from "../intervention-store";

export async function makeAdaptiveDecision(
  request: AdaptiveDecisionRequest,
): Promise<AdaptiveDecisionResponse> {
  const competency =
    request.learnerState.competencies[0];

  if (!competency) {
    throw new Error(
      "No competency state available for adaptive decision.",
    );
  }

  const evidence =
    await getEvidence(
      request.learnerId,
      competency.competencyId,
    );

  let consecutiveFailures = 0;

  for (
    let index =
      evidence.length - 1;
    index >= 0;
    index -= 1
  ) {
    if (
      evidence[index].outcome !==
      "incorrect"
    ) {
      break;
    }

    consecutiveFailures += 1;
  }

  const nextCompetency =
    getNextCompetency(
      competency.competencyId,
    );

  const prerequisiteStates =
    Object.values(
      competency.prerequisiteState ??
        {},
    );

  const prerequisiteSatisfied =
    prerequisiteStates.length === 0 ||
    prerequisiteStates.every(
      (state) =>
        state === "ready" ||
        state === "mastered",
    );

  const readyForAdvancement =
    competency.readinessState
      ?.readyForAdvancement ??
    false;

  const pedagogicalDecision =
    selectPedagogicalAction({
      masteryEstimate:
        competency.masteryEstimate,

      confidence:
        competency.confidence,

      evidenceCount:
        competency.evidenceCount,

      consecutiveFailures,

      diagnosticState:
        competency.diagnosticState,

      diagnosticConfidence:
        competency.diagnosticConfidence,

      errorPatterns:
        competency.errorPatterns,

      interventionHistory:
        competency.interventionHistory,

      prerequisiteSatisfied,

      hasNextCompetency:
        Boolean(nextCompetency),

      retentionStatus:
        competency.retentionState
          ?.status ??
        "not_tested",

      retentionConfidence:
        competency.retentionState
          ?.confidence ??
        0,

      transferStatus:
        competency.transferState
          ?.status ??
        "not_tested",

      transferConfidence:
        competency.transferState
          ?.confidence ??
        0,

      readyForAdvancement,
    });

  let decisionCompetencyId =
    competency.competencyId;

  let contentState =
    request.learnerState;

  if (
    pedagogicalDecision.action ===
      "advance" &&
    nextCompetency &&
    prerequisitesSatisfied(
      nextCompetency.id,
      request.learnerState.competencies
        .filter(
          (item) =>
            item.masteryEstimate >=
              0.8 &&
            item.confidence >=
              0.8 &&
            (
              item.readinessState
                ?.readyForAdvancement ??
              false
            ),
        )
        .map(
          (item) =>
            item.competencyId,
        ),
    )
  ) {
    decisionCompetencyId =
      nextCompetency.id;

    const alreadyTracked =
      request.learnerState.competencies.some(
        (item) =>
          item.competencyId ===
          nextCompetency.id,
      );

    if (!alreadyTracked) {
      const now =
        new Date().toISOString();

      contentState = {
        ...request.learnerState,

        competencies: [
          {
            learnerId:
              request.learnerId,

            competencyId:
              nextCompetency.id,

            masteryEstimate: 0,

            evidenceCount: 0,

            confidence: 0,

            diagnosticState:
              "unknown",

            diagnosticConfidence: 0,

            errorPatterns: [],

            interventionHistory: [],

            prerequisiteState: {},

            retentionState: {
              status:
                "not_tested",

              confidence: 0,

              evidenceIds: [],
            },

            transferState: {
              status:
                "not_tested",

              confidence: 0,

              evidenceIds: [],
            },

            readinessState: {
              readyForAdvancement:
                false,

              confidence: 0,

              reasonCode:
                "NEW_COMPETENCY",

              evaluatedAt:
                now,
            },

            lastUpdated:
              now,

            stateVersion:
              "state-0.3",
          },

          ...request.learnerState
            .competencies,
        ],
      };
    }
  }

  const decision = {
    id:
      `decision-${request.sessionId}-${decisionCompetencyId}`,

    learnerId:
      request.learnerId,

    sessionId:
      request.sessionId,

    action:
      pedagogicalDecision.action,

    competencyId:
      decisionCompetencyId,

    reasonCode:
      pedagogicalDecision.reasonCode,

    evidenceIds:
      evidence.map(
        (item) =>
          item.id,
      ),

    policyVersion:
      "policy-0.3",

    createdAt:
      new Date().toISOString(),

    confidence:
      competency.confidence,
  };

  if (
    pedagogicalDecision.action ===
    "complete"
  ) {
    return {
      decision,
    };
  }

  let interventionId:
    string | undefined;

  const interventionActions = [
    "diagnose",
    "teach",
    "practice",
    "scaffold",
    "remediate",
    "reassess",
    "retention_check",
    "transfer_check",
    "teacher_review",
  ];

  if (
    interventionActions.includes(
      pedagogicalDecision.action,
    )
  ) {
    const intervention =
      await createIntervention({
        learnerId:
          request.learnerId,

        competencyId:
          decisionCompetencyId,

        sessionId:
          request.sessionId,

        decisionId:
          decision.id,

        type:
          pedagogicalDecision.action,
      });

    interventionId =
      intervention.interventionId;

    (
      decision as typeof decision & {
        interventionId?: string;
      }
    ).interventionId =
      interventionId;
  }

  const usedAssessmentItemIds =
    evidence
      .map(
        (item) =>
          item.assessmentItemId,
      )
      .filter(
        (
          item,
        ): item is string =>
          Boolean(item),
      );

  const content =
    selectLearningContent(
      contentState,
      pedagogicalDecision.action,
      usedAssessmentItemIds,
    );

  return {
    decision,
    content,
  };
}
'@ | Set-Content `
  "$Root\services\adaptive-engine\index.ts" `
  -Encoding UTF8

Write-Host ""
Write-Host "Complete adaptive engine installed."
Write-Host ""
Write-Host "Run:"
Write-Host "npx tsx --env-file=.env.local ./tests/complete-intervention-loop.test.ts"