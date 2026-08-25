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

import {
  saveLearnerState,
} from "../learner-state";

export async function makeAdaptiveDecision(
  request: AdaptiveDecisionRequest,
): Promise<AdaptiveDecisionResponse> {
  const learnerState =
    request.learnerState;

  const competency =
    learnerState.competencies[0];

  if (!competency) {
    throw new Error(
      "No competency found in learner state.",
    );
  }

  const evidence =
    await getEvidence(
      request.learnerId,
      competency.competencyId,
    );

  const consecutiveFailures =
    calculateConsecutiveFailures(
      evidence,
    );

  const completedCompetencyIds =
    learnerState.competencies
      .filter(
        (item) =>
          item.competencyId !==
            competency.competencyId &&
          item.masteryEstimate >=
            0.8 &&
          item.confidence >=
            0.8 &&
          item.retentionState
            ?.status === "retained" &&
          item.transferState
            ?.status === "demonstrated",
      )
      .map(
        (item) =>
          item.competencyId,
      );

  const prerequisiteSatisfied =
    prerequisitesSatisfied(
      competency.competencyId,
      completedCompetencyIds,
    );

  const nextCompetency =
    getNextCompetency(
      competency.competencyId,
    );

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
        competency.retentionState?.status ??
        "not_tested",

      retentionConfidence:
        competency.retentionState?.confidence ??
        0,

      transferStatus:
        competency.transferState?.status ??
        "not_tested",

      transferConfidence:
        competency.transferState?.confidence ??
        0,

      readyForAdvancement:
        competency.readinessState
          ?.readyForAdvancement ??
        false,
    });

  const decision:
    AdaptiveDecisionResponse["decision"] = {
    id:
      `decision-${crypto.randomUUID()}`,

    learnerId:
      request.learnerId,

    sessionId:
      request.sessionId,

    action:
      pedagogicalDecision.action,

    competencyId:
      pedagogicalDecision.action ===
        "advance" &&
      nextCompetency
        ? nextCompetency.id
        : competency.competencyId,

    reasonCode:
      pedagogicalDecision.reasonCode,

    evidenceIds:
      evidence.map(
        (item) => item.id,
      ),

    policyVersion:
      "pedagogy-v1",

    createdAt:
      new Date().toISOString(),

    confidence:
      competency.confidence,
  };

  let contentState =
    learnerState;

  if (
    pedagogicalDecision.action ===
      "teach" ||
    pedagogicalDecision.action ===
      "practice" ||
    pedagogicalDecision.action ===
      "scaffold" ||
    pedagogicalDecision.action ===
      "remediate" ||
    pedagogicalDecision.action ===
      "reassess" ||
    pedagogicalDecision.action ===
      "diagnose"
  ) {
    const intervention =
      await createIntervention({
        interventionId:
          `intervention-${crypto.randomUUID()}`,

        learnerId:
          request.learnerId,

        competencyId:
          competency.competencyId,

        sessionId:
          request.sessionId,

        decisionId:
          decision.id,

        type:
          pedagogicalDecision.action,

        policyVersion:
          "intervention-v1",
      });

    decision.interventionId =
      intervention.interventionId;

    const interventionRecord = {
      interventionId:
        intervention.interventionId,

      competencyId:
        competency.competencyId,

      type:
        pedagogicalDecision.action,

      startedAt:
        intervention.startedAt,

      outcome:
        intervention.outcome,

      evidenceIds:
        intervention.evidenceIds,
    };

    contentState = {
      ...learnerState,

      competencies:
        learnerState.competencies.map(
          (item) =>
            item.competencyId ===
            competency.competencyId
              ? {
                  ...item,

                  interventionHistory:
                    [
                      ...(item.interventionHistory ??
                        []),

                      interventionRecord,
                    ],
                }
              : item,
        ),
    };

    await saveLearnerState(
      contentState,
    );
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

  const usedContentIds =
    evidence
      .map(
        (item) =>
          item.contentId,
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
      usedContentIds,
    );

  return {
    decision,

    content,

    nextCompetency:
      pedagogicalDecision.action ===
        "advance"
        ? nextCompetency?.id
        : undefined,
  };
}

function calculateConsecutiveFailures(
  evidence: Array<{
    outcome:
      | "correct"
      | "incorrect"
      | "partial"
      | "skipped"
      | "observed";
  }>,
): number {
  let count = 0;

  for (
    let index =
      evidence.length - 1;
    index >= 0;
    index -= 1
  ) {
    if (
      evidence[index].outcome ===
      "incorrect"
    ) {
      count += 1;
      continue;
    }

    break;
  }

  return count;
}