import type {
  AdaptiveDecisionRequest,
  AdaptiveDecisionResponse,
} from "../../packages/contracts";

import type {
  AdaptiveAction,
} from "../../packages/domain";

import {
  getCompetency,
  prerequisitesSatisfied,
} from "../../packages/curriculum";

import {
  selectInstructionalStrategy,
  selectResponseMode,
} from "../../packages/pedagogy";

import {
  ADAPTIVE_POLICY_VERSION,
  decideNextBestAction,
} from "../adaptive-policy";

import {
  MAX_ITEM_EXPOSURES,
  selectLearningContent,
  type QuestionReuseContext,
} from "../content-selection";

import {
  getContentForCompetency,
} from "../content-store";

import {
  getEvidence,
} from "../evidence-store";
import { readAssessmentRecovery } from "../edututor/assessment-recovery";
import { reviewToResume, unansweredActivities } from "../learner-path/revision";

import {
  INSTRUCTIONAL_INTERVENTION_TYPES,
  cancelIntervention,
  createIntervention,
  evaluateInterventionFromEvidence,
  getLearnerInterventions,
  isAwaitingInstructionCheck,
} from "../intervention-store";

import {
  createInitialLearnerState,
  updateLearnerState,
} from "../learner-state";

import {
  chooseFocus,
} from "../learner-path/focus";

import {
  createPathCurriculum,
} from "../learner-path/curriculum";

import {
  choosePrerequisiteRepair,
  chooseNextCompetency,
  isCompetencyCompleted,
  isContentExhausted,
  mergeCompetencyStates,
  needsSupportRetryDueAt,
} from "../learner-path/progression";

import {
  getLearnerStates,
} from "../learner-state-store";

export interface AdaptiveDecisionOptions {
  /*
   * Time-aware retention: a newly acquired competency is not
   * retention tested straight away, and earlier competencies are
   * revisited when their review comes due. Off unless switched on,
   * so existing behaviour is unchanged.
   */
  timeAwareRetention?: boolean;

  /*
   * Teaching-first (Phase 1): the learner chose "Check my knowledge
   * first" on a new topic, so its introduction is skipped and the
   * diagnostic check starts. Ignored once the topic has evidence.
   */
  checkKnowledgeFirst?: boolean;

  /*
   * Phase 2: the learner chose this topic from the topic list. A
   * revision due elsewhere does not replace it, and a topic already
   * completed is revisited from its explanation.
   */
  selectedTopic?: boolean;

  /* For tests. */
  now?: Date;
}

/*
 * Teaching-first (Phase 1) reason codes. A new topic is introduced
 * with its explanation, then its worked example, then a guided
 * practice question, before any diagnostic check.
 */
export const NEW_TOPIC_INSTRUCTION_REASON_CODE = "NEW_TOPIC_INSTRUCTION";
export const NEW_TOPIC_WORKED_EXAMPLE_REASON_CODE = "NEW_TOPIC_WORKED_EXAMPLE";
export const GUIDED_PRACTICE_REASON_CODE = "GUIDED_PRACTICE";
export const TOPIC_REVISIT_REASON_CODE = "TOPIC_REVISIT";

/* Introductory cards: explanation, then worked example. */
const INTRODUCTION_CARD_TYPES = ["lesson", "example"];
const MAX_INTRODUCTION_CARDS = 2;

export async function makeAdaptiveDecision(
  request: AdaptiveDecisionRequest,
  options: AdaptiveDecisionOptions = {},
): Promise<AdaptiveDecisionResponse> {
  const learnerState =
    request.learnerState;

  const currentCompetency =
    learnerState.competencies[0];

  if (!currentCompetency) {
    throw new Error(
      "No competency found in learner state.",
    );
  }

  const timeAware =
    options.timeAwareRetention ??
    process.env.FILUMIRE_TIME_AWARE_RETENTION === "on";

  /*
   * Tranche 4B step 4: every competency state stored for the
   * learner, not only the ones carried in this state object, so
   * prerequisites and path completion see the whole learner.
   */
  const allCompetencyStates =
    await loadAllCompetencyStates(learnerState);

  const currentDefinition =
    getCompetency(currentCompetency.competencyId);

  let focus = timeAware
    ? chooseFocus({
        states: allCompetencyStates,
        currentCompetencyId:
          currentCompetency.competencyId,
        /* Reviews stay inside the learner's subject and grade. */
        curriculum: createPathCurriculum(
          currentDefinition?.subjectId,
          currentDefinition?.learningLevelId,
        ),
        now: options.now,
      })
    : undefined;

  if (timeAware && currentDefinition) {
    const open = await unansweredActivities(request.learnerId, currentDefinition.subjectId, currentCompetency.competencyId);
    if (open.length) {
      // Preserve a delivered question/instruction on the current topic; resume
      // a delivered review on its own competency rather than starting another.
      const review = reviewToResume(open);
      focus = review
        ? { competencyId: review.competencyId, reviewDue: true, retentionWindow: "open" }
        : focus ? { ...focus, competencyId: currentCompetency.competencyId, reviewDue: false } : undefined;
    }
  }

  // Phase 2: a topic the learner chose is learnt now; due reviews wait.
  if (options.selectedTopic && focus) {
    focus = { ...focus, competencyId: currentCompetency.competencyId, reviewDue: false };
  }

  const reviewTarget = focus?.reviewDue
    ? allCompetencyStates.find(
        (item) =>
          item.competencyId === focus.competencyId,
      )
    : undefined;

  const competency =
    reviewTarget ?? currentCompetency;

  /*
   * Content selection reads the first competency, so a review
   * puts the competency being reviewed first.
   */
  const focusedLearnerState = reviewTarget
    ? {
        ...learnerState,
        competencies: [
          reviewTarget,
          ...learnerState.competencies.filter(
            (item) => item !== reviewTarget,
          ),
        ],
      }
    : learnerState;

  const evidence =
    await getEvidence(
      request.learnerId,
      competency.competencyId,
    );

  const consecutiveFailures =
    calculateConsecutiveFailures(
      evidence,
    );

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

  /*
   * Tranche 4B step 2: a teaching card the learner acknowledged
   * with Next and has not yet answered a question under is
   * checked with a question evaluated under that same
   * intervention, before the policy chooses anything new.
   */
  let storedInterventions =
    await getLearnerInterventions(
      request.learnerId,
      competency.competencyId,
    );
  // Guardian-recovered attempts remain historical records. Do not reuse,
  // cancel or evaluate them when selecting the next real learning activity.
  const recoveredHistory = await readAssessmentRecovery(request.learnerId);
  // Teaching-first: a recovered question was still put to the learner, so
  // the topic is not introduced again.
  const recoveredQuestionPut = storedInterventions.some(item =>
    recoveredHistory.recovered(item) && QUESTION_ACTIONS.includes(item.type));
  storedInterventions = storedInterventions.filter(item => !recoveredHistory.recovered(item));

  /*
   * Answers name the intervention they were given under, but only
   * retention/transfer closed it. Close every answered intervention
   * from its evidence so answered steps are not left "active".
   */
  let closedAnsweredInterventions = false;

  for (const intervention of storedInterventions) {
    if (
      intervention.status !== "active" &&
      !isAwaitingInstructionCheck(intervention)
    ) {
      continue;
    }

    for (const item of evidence) {
      if (
        item.interventionId ===
          intervention.interventionId &&
        !intervention.evidenceIds.includes(item.id)
      ) {
        await evaluateInterventionFromEvidence(
          intervention.interventionId,
          {
            id: item.id,
            outcome: item.outcome,
          },
        );
        closedAnsweredInterventions = true;
      }
    }
  }

  if (closedAnsweredInterventions) {
    storedInterventions =
      await getLearnerInterventions(
        request.learnerId,
        competency.competencyId,
      );
    storedInterventions = storedInterventions.filter(item => !recoveredHistory.recovered(item));
  }

  const answeredInterventionIds =
    new Set(
      evidence
        .map(
          (item) =>
            item.interventionId,
        )
        .filter(Boolean),
    );

  const latestEvidenceAt =
    evidence.reduce(
      (latest, item) =>
        item.timestamp > latest
          ? item.timestamp
          : latest,
      "",
    );

  /*
   * Teaching-first (Phase 1). Interventions keep no record of the
   * card they showed, so the cards already shown are rebuilt by
   * replaying completed teaching through the same deterministic
   * selection. They join usedContentIds, so corrective teaching
   * moves on to a card the learner has not seen (the worked example
   * after the explanation) instead of repeating it.
   */
  const shownCardIds =
    replayShownCardIds(
      focusedLearnerState,
      storedInterventions,
    );

  usedContentIds.push(...shownCardIds);

  /*
   * A topic is introduced while it has no answers and no question
   * was ever put to the learner on it (a delivered question, or the
   * learner's "Check my knowledge first", keeps the check going).
   */
  const introductionCardCount = Math.min(
    MAX_INTRODUCTION_CARDS,
    getContentForCompetency(
      competency.competencyId,
      learnerState.language,
    ).filter(
      (item) =>
        !item.assessmentItemId &&
        INTRODUCTION_CARD_TYPES.includes(item.type),
    ).length,
  );

  const introducing =
    !reviewTarget &&
    !options.checkKnowledgeFirst &&
    evidence.length === 0 &&
    competency.evidenceCount === 0 &&
    competency.diagnosticState === "unknown" &&
    introductionCardCount > 0 &&
    !recoveredQuestionPut &&
    !storedInterventions.some(
      (item) =>
        item.status !== "cancelled" &&
        QUESTION_ACTIONS.includes(item.type),
    );

  const completedIntroductionCards =
    storedInterventions.filter(
      (item) =>
        item.type === "teach" &&
        item.status === "completed",
    ).length;

  /*
   * Phase 2: a completed topic the learner chose again is revisited
   * from its explanation (then checked as usual), instead of being
   * handed straight over to the next topic.
   */
  const revisiting =
    Boolean(options.selectedTopic) &&
    !reviewTarget &&
    !introducing &&
    introductionCardCount > 0 &&
    isCompetencyCompleted(competency, timeAware);

  const introductionStep:
    | "explain"
    | "worked_example"
    | "guided_practice"
    | undefined =
    revisiting
      ? "explain"
      : !introducing
      ? undefined
      : completedIntroductionCards === 0
        ? "explain"
        : completedIntroductionCards < introductionCardCount
          ? "worked_example"
          : "guided_practice";

  /*
   * Teaching shown before the topic's first answer. A wrong guided
   * practice answer under it shows what corrective teaching is
   * needed; it is not evidence that the teaching failed.
   */
  const firstEvidenceAt =
    [...evidence]
      .map((item) => item.timestamp)
      .sort()[0];

  const introductoryInterventionIds =
    storedInterventions
      .filter(
        (item) =>
          item.type === "teach" &&
          item.status !== "cancelled" &&
          (
            !firstEvidenceAt ||
            item.startedAt <= firstEvidenceAt
          ),
      )
      .map((item) => item.interventionId);

  const instructionToCheck =
    reviewTarget ||
    introductionStep === "explain" ||
    introductionStep === "worked_example"
    ? undefined
    : storedInterventions
        .filter(
          (item) =>
            isAwaitingInstructionCheck(item) &&
            !answeredInterventionIds.has(
              item.interventionId,
            ) &&
            (item.completedAt ?? "") >=
              latestEvidenceAt,
        )
        .sort((a, b) =>
          (b.completedAt ?? "").localeCompare(
            a.completedAt ?? "",
          ),
        )[0];

  /*
   * Tranche 4B step 3: what controlled reuse needs to know.
   */
  const reuse: QuestionReuseContext = {
    answers: [...evidence]
      .filter((item) => item.assessmentItemId)
      .sort((a, b) =>
        a.timestamp.localeCompare(b.timestamp),
      )
      .map((item) => ({
        assessmentItemId: item.assessmentItemId!,
        timestamp: item.timestamp,
      })),
    instructionTimes: storedInterventions
      .filter(
        (item) =>
          item.status === "completed" &&
          INSTRUCTIONAL_INTERVENTION_TYPES.includes(
            item.type,
          ) &&
          Boolean(item.completedAt),
      )
      .map((item) => item.completedAt!),
    now: (options.now ?? new Date()).toISOString(),
  };

  const instructionCheckContent =
    instructionToCheck
      ? selectLearningContent(
          focusedLearnerState,
          instructionToCheck.type === "practice" ||
            introductionStep === "guided_practice"
            ? "practice"
            : "reassess",
          usedAssessmentItemIds,
          usedContentIds,
          reuse,
        )
      : undefined;

  const instructionCheck =
    instructionToCheck &&
    instructionCheckContent?.assessmentItemId
      ? {
          intervention: instructionToCheck,
          content: instructionCheckContent,
        }
      : undefined;

  /*
   * Completed = mastery + confidence + transfer + retention (or,
   * time-aware, retention not failed while it waits). One shared
   * definition with the learner path (Tranche 4B step 4).
   */
  const completedCompetencyIds =
    allCompetencyStates
      .filter(
        (item) =>
          item.competencyId !==
            competency.competencyId &&
          isCompetencyCompleted(item, timeAware),
      )
      .map(
        (item) =>
          item.competencyId,
      );

  /*
   * Tranche 4D: strong evidence on the competency itself (mastery
   * gate met) shows the prerequisite knowledge is there; the
   * learner is not held back by the prerequisite check.
   */
  const prerequisiteSatisfied =
    prerequisitesSatisfied(
      competency.competencyId,
      completedCompetencyIds,
    ) ||
    (
      competency.masteryEstimate >= 0.8 &&
      competency.confidence >= 0.8
    );

  /*
   * Tranche 4B step 4: where the learner goes once this competency
   * is completed. Successor first, then the learner path, inside
   * the same subject and grade, prerequisites completed across all
   * stored states.
   */
  /*
   * Tranche 4C: exhausted competencies of this subject and grade
   * whose retry is due (gap passed) and that still have a question
   * the learner may answer again.
   */
  const retryableNeedsSupport =
    await findRetryableNeedsSupport(
      request.learnerId,
      competency.competencyId,
      allCompetencyStates,
      options.now ?? new Date(),
    );

  let nextChoice =
    chooseNextCompetency({
      currentCompetencyId:
        competency.competencyId,
      states: allCompetencyStates,
      currentCompleted: true,
      timeAware,
      retryable: retryableNeedsSupport,
    });

  let nextCompetency =
    nextChoice.competencyId
      ? getCompetency(nextChoice.competencyId)
      : undefined;

  let pedagogicalDecision: {
    action: AdaptiveAction;
    reasonCode: string;
    policyVersion: string;
  } = reviewTarget
    ? {
        action: "retention_check" as const,
        reasonCode: "RETENTION_REVIEW_DUE",
        policyVersion: ADAPTIVE_POLICY_VERSION,
      }
    : introductionStep === "explain" ||
      introductionStep === "worked_example"
    ? {
        action: "teach" as const,
        reasonCode:
          revisiting
            ? TOPIC_REVISIT_REASON_CODE
            : introductionStep === "explain"
            ? NEW_TOPIC_INSTRUCTION_REASON_CODE
            : NEW_TOPIC_WORKED_EXAMPLE_REASON_CODE,
        policyVersion: ADAPTIVE_POLICY_VERSION,
      }
    : instructionCheck &&
      introductionStep === "guided_practice"
    ? {
        action: "practice" as const,
        reasonCode: GUIDED_PRACTICE_REASON_CODE,
        policyVersion: ADAPTIVE_POLICY_VERSION,
      }
    : instructionCheck
    ? {
        action: "reassess" as const,
        reasonCode: "INSTRUCTION_CHECK",
        policyVersion: ADAPTIVE_POLICY_VERSION,
      }
    : decideNextBestAction({
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

      introductoryInterventionIds,

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

      retentionPerformance:
        competency.retentionPerformance,

      transferPerformance:
        competency.transferPerformance,

      retentionWindow:
        focus?.retentionWindow,
    });

  /*
   * Tranche 4D: missing prerequisites are repaired, not scaffolded in
   * a loop. The learner goes to the missing prerequisite; this
   * competency is resumed once its prerequisites are completed.
   */
  if (
    pedagogicalDecision.reasonCode === "PREREQUISITE_NOT_SATISFIED"
  ) {
    const repairId = choosePrerequisiteRepair({
      currentCompetencyId: competency.competencyId,
      states: allCompetencyStates,
      timeAware,
      retryable: retryableNeedsSupport,
    });

    if (repairId) {
      pedagogicalDecision = {
        action: "advance",
        reasonCode: "PREREQUISITE_REPAIR",
        policyVersion: ADAPTIVE_POLICY_VERSION,
      };

      nextCompetency = getCompetency(repairId);

      await markPrerequisiteRepair(
        request.learnerId,
        competency.competencyId,
        repairId,
        learnerState,
        options.now ?? new Date(),
      );
    }
  }

  let selectedContent =
    introductionStep === "explain" ||
    introductionStep === "worked_example"
      ? selectIntroductionCard(
          focusedLearnerState,
          introductionStep,
          // A revisit shows the explanation again, even though it was seen.
          revisiting ? [] : usedContentIds,
        )
      : instructionCheck?.content ??
        selectLearningContent(
          focusedLearnerState,
          pedagogicalDecision.action,
          usedAssessmentItemIds,
          usedContentIds,
          reuse,
        );

  /*
   * Tranche 4B step 3: a question is needed but no fresh or
   * reusable item is left, or acknowledged teaching cannot be
   * checked. The topic is exhausted for now: the learner moves on,
   * the competency is marked as needing support, and no mastery is
   * claimed. Never a silent card loop.
   */
  const contentExhausted =
    !reviewTarget &&
    (
      (Boolean(instructionToCheck) &&
        !instructionCheck) ||
      (QUESTION_ACTIONS.includes(
        pedagogicalDecision.action,
      ) &&
        !selectedContent?.assessmentItemId)
    );

  if (contentExhausted) {
    /*
     * The competency is not completed, so its successors keep an
     * unmet prerequisite: choose again without counting it.
     */
    nextChoice =
      chooseNextCompetency({
        currentCompetencyId:
          competency.competencyId,
        states: allCompetencyStates.map((item) =>
          item.competencyId === competency.competencyId
            ? {
                ...item,
                readinessState: {
                  readyForAdvancement: false,
                  confidence: item.confidence,
                  reasonCode:
                    CONTENT_EXHAUSTED_REASON_CODE,
                  evaluatedAt:
                    new Date().toISOString(),
                },
              }
            : item,
        ),
        currentCompleted: false,
        timeAware,
        retryable: retryableNeedsSupport,
      });

    nextCompetency =
      nextChoice.competencyId
        ? getCompetency(nextChoice.competencyId)
        : undefined;

    pedagogicalDecision = {
      action: nextCompetency
        ? "advance"
        : "complete",
      reasonCode:
        CONTENT_EXHAUSTED_REASON_CODE,
      policyVersion:
        ADAPTIVE_POLICY_VERSION,
    };

    selectedContent =
      selectLearningContent(
        focusedLearnerState,
        pedagogicalDecision.action,
        usedAssessmentItemIds,
        usedContentIds,
      );

    await markContentExhausted(
      request.learnerId,
      competency.competencyId,
      learnerState,
    );
  }

  /*
   * "Learning path complete" only when the subject and grade are
   * genuinely finished; otherwise the learner is blocked and needs
   * support or new content.
   */
  if (
    pedagogicalDecision.action === "complete" &&
    pedagogicalDecision.reasonCode === "LEARNING_PATH_COMPLETE" &&
    !nextChoice.pathComplete
  ) {
    pedagogicalDecision = {
      ...pedagogicalDecision,
      reasonCode: nextChoice.reasonCode,
    };
  }

  /*
   * Tranche 4G: an advance names the NEXT competency, so its content
   * must come from that competency (an introductory card), never from
   * the one being left. Before this, every advance through the
   * learning route failed instruction generation (content and
   * decision competency differed) with a 500, so a learner who
   * finished a topic could not move on in the app.
   */
  let nextInterventions:
    Awaited<ReturnType<typeof getLearnerInterventions>> = [];

  if (
    pedagogicalDecision.action === "advance" &&
    nextCompetency
  ) {
    const nextId = nextCompetency.id;
    const nextState =
      learnerState.competencies.find(
        (item) => item.competencyId === nextId,
      ) ??
      createInitialLearnerState(
        request.learnerId,
        nextId,
      ).competencies[0];

    const nextLearnerState = {
      ...learnerState,
      competencies: [
        nextState,
        ...learnerState.competencies.filter(
          (item) => item.competencyId !== nextId,
        ),
      ],
    };

    /*
     * Teaching-first (Phase 1): the hand-over card is the next
     * topic's first teaching step, delivered under a teach
     * intervention on that topic, so it is not shown again.
     */
    nextInterventions =
      (await getLearnerInterventions(
        request.learnerId,
        nextId,
      )).filter((item) => !recoveredHistory.recovered(item));

    selectedContent = selectLearningContent(
      nextLearnerState,
      "teach",
      [],
      replayShownCardIds(
        nextLearnerState,
        nextInterventions,
      ),
    );
  }

  const strategyDecision =
    selectInstructionalStrategy(
      pedagogicalDecision.action,
      competency.strategyEvidence,
    );

  const responseModeDecision =
    selectResponseMode(
      pedagogicalDecision.action,
      competency.responseModeEvidence,
    );

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
      pedagogicalDecision.policyVersion,

    createdAt:
      new Date().toISOString(),

    confidence:
      competency.confidence,

    instructionalStrategy:
      strategyDecision
        .instructionalStrategy,

    responseMode:
      responseModeDecision
        .responseMode,
  };

  /*
   * Intervention persistence is authoritative.
   *
   * The intervention store owns the intervention
   * record. The Learner Model is not independently
   * mutated here. Subsequent evidence is responsible
   * for updating intervention history through
   * applyEvidence().
   */
  if (instructionCheck) {
    decision.interventionId =
      instructionCheck.intervention
        .interventionId;
  } else if (
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
      "diagnose" ||
    pedagogicalDecision.action ===
      "retention_check" ||
    pedagogicalDecision.action ===
      "transfer_check"
  ) {
    /*
     * Repeated requests for an unchanged decision, with no answer
     * since, reuse the open intervention; other open interventions
     * the learner never acted on are cancelled (Tranche 4B).
     */
    const openInterventions =
      storedInterventions.filter(
        (item) =>
          item.status === "active" &&
          item.evidenceIds.length === 0 &&
          !answeredInterventionIds.has(
            item.interventionId,
          ),
      );

    const reusable =
      openInterventions
        .filter(
          (item) =>
            item.type ===
              pedagogicalDecision.action &&
            item.startedAt >= latestEvidenceAt,
        )
        .sort((a, b) =>
          b.startedAt.localeCompare(
            a.startedAt,
          ),
        )[0];

    for (const item of openInterventions) {
      if (item !== reusable) {
        await cancelIntervention(
          item.interventionId,
        );
      }
    }

    const intervention =
      reusable ??
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

        instructionalStrategy:
          strategyDecision
            .instructionalStrategy,

        responseMode:
          responseModeDecision
            .responseMode,

        policyVersion:
          "intervention-v1",
      });

    decision.interventionId =
      intervention.interventionId;
  } else if (
    pedagogicalDecision.action === "advance" &&
    nextCompetency &&
    selectedContent &&
    !selectedContent.assessmentItemId
  ) {
    /*
     * Teaching-first (Phase 1): an unacknowledged hand-over card
     * already open on the next topic is reused, not duplicated.
     */
    const openIntroduction =
      nextInterventions.find(
        (item) =>
          item.type === "teach" &&
          item.status === "active" &&
          item.evidenceIds.length === 0,
      );

    const intervention =
      openIntroduction ??
      await createIntervention({
        interventionId:
          `intervention-${crypto.randomUUID()}`,
        learnerId:
          request.learnerId,
        competencyId:
          nextCompetency.id,
        sessionId:
          request.sessionId,
        decisionId:
          decision.id,
        type: "teach",
        instructionalStrategy:
          strategyDecision
            .instructionalStrategy,
        responseMode:
          responseModeDecision
            .responseMode,
        policyVersion:
          "intervention-v1",
      });

    decision.interventionId =
      intervention.interventionId;
  }

  /*
   * Strategy and response-mode selections are part
   * of the decision, but are not duplicated into
   * Learner Model history here.
   *
   * The next evidence event records what happened
   * after the selected approach.
   */

  const content =
    selectedContent;

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

export const CONTENT_EXHAUSTED_REASON_CODE =
  "CONTENT_EXHAUSTED_NEEDS_SUPPORT";

/*
 * Teaching-first (Phase 1): the teaching cards already shown on the
 * learner state's first competency, rebuilt by replaying its
 * completed teaching interventions, oldest first, through the same
 * card selection. Replay ignores strategy evidence, which grows with
 * answers; before the first answer it matches what was shown
 * exactly, afterwards closely. Questions are never counted.
 */
/*
 * Teaching-first: the explanation (the topic's first unseen "lesson"
 * card) or the worked example (its first unseen "example" card), for
 * a topic's introduction or revisit.
 */
function selectIntroductionCard(
  learnerState: Parameters<typeof selectLearningContent>[0],
  step: "explain" | "worked_example",
  shownCardIds: string[],
) {
  const competency = learnerState.competencies[0];

  if (competency) {
    const card = getContentForCompetency(
      competency.competencyId,
      learnerState.language,
    ).find(
      (item) =>
        !item.assessmentItemId &&
        item.type === (step === "explain" ? "lesson" : "example") &&
        !shownCardIds.includes(item.id),
    );

    if (card) {
      return card;
    }
  }

  return selectLearningContent(
    learnerState,
    "teach",
    [],
    shownCardIds,
  );
}

export function replayShownCardIds(
  learnerState: Parameters<typeof selectLearningContent>[0],
  interventions: Awaited<ReturnType<typeof getLearnerInterventions>>,
): string[] {
  const competency = learnerState.competencies[0];

  if (!competency) {
    return [];
  }

  const replayState = {
    ...learnerState,
    competencies: [
      { ...competency, strategyEvidence: [] },
      ...learnerState.competencies.slice(1),
    ],
  };

  const shown: string[] = [];

  /*
   * Teaching completed before any question was put to the learner
   * on this topic was its introduction: explanation, then worked
   * example.
   */
  const firstQuestionAt =
    interventions
      .filter(
        (intervention) =>
          intervention.competencyId === competency.competencyId &&
          intervention.status !== "cancelled" &&
          QUESTION_ACTIONS.includes(intervention.type),
      )
      .map((intervention) => intervention.startedAt)
      .sort()[0];

  let introductionCards = 0;

  for (const item of [...interventions]
    .filter(
      (intervention) =>
        intervention.competencyId === competency.competencyId &&
        intervention.status === "completed" &&
        intervention.type !== "practice" &&
        INSTRUCTIONAL_INTERVENTION_TYPES.includes(intervention.type),
    )
    .sort((a, b) => a.startedAt.localeCompare(b.startedAt))) {
    const introduction =
      item.type === "teach" &&
      introductionCards < MAX_INTRODUCTION_CARDS &&
      (!firstQuestionAt || item.startedAt < firstQuestionAt);

    const card = introduction
      ? selectIntroductionCard(
          replayState,
          introductionCards === 0 ? "explain" : "worked_example",
          shown,
        )
      : selectLearningContent(
          replayState,
          item.type,
          [],
          shown,
        );

    if (introduction) {
      introductionCards += 1;
    }

    if (card && !card.assessmentItemId && !shown.includes(card.id)) {
      shown.push(card.id);
    }
  }

  return shown;
}

/*
 * Tranche 4C retry rule, the content half: an exhausted competency
 * may be retried once its gap has passed and at least one of its
 * mastery questions (not retention/transfer) has been answered
 * fewer than MAX_ITEM_EXPOSURES times; newly authored questions
 * count automatically.
 */
async function findRetryableNeedsSupport(
  learnerId: string,
  currentCompetencyId: string,
  states: Awaited<ReturnType<typeof loadAllCompetencyStates>>,
  now: Date,
): Promise<Set<string>> {
  const current = getCompetency(currentCompetencyId);
  const retryable = new Set<string>();

  for (const state of states) {
    const definition = getCompetency(state.competencyId);
    const dueAt = needsSupportRetryDueAt(state);

    if (
      !isContentExhausted(state) ||
      state.competencyId === currentCompetencyId ||
      !definition ||
      definition.subjectId !== current?.subjectId ||
      definition.learningLevelId !== current?.learningLevelId ||
      !dueAt ||
      Date.parse(dueAt) > now.getTime()
    ) {
      continue;
    }

    const exposures = new Map<string, number>();

    for (const item of await getEvidence(learnerId, state.competencyId)) {
      if (item.assessmentItemId) {
        exposures.set(
          item.assessmentItemId,
          (exposures.get(item.assessmentItemId) ?? 0) + 1,
        );
      }
    }

    const usable = getContentForCompetency(state.competencyId).some(
      (content) =>
        Boolean(content.assessmentItemId) &&
        content.metadata?.assessmentPurpose !== "retention" &&
        content.metadata?.assessmentPurpose !== "transfer" &&
        (exposures.get(content.assessmentItemId!) ?? 0) <
          MAX_ITEM_EXPOSURES,
    );

    if (usable) {
      retryable.add(state.competencyId);
    }
  }

  return retryable;
}

/*
 * The request's state plus every state stored for the learner.
 * The request's own copy wins ties (it is the newest).
 */
async function loadAllCompetencyStates(
  learnerState: AdaptiveDecisionRequest["learnerState"],
) {
  let stored: AdaptiveDecisionRequest["learnerState"][] = [];

  try {
    stored = await getLearnerStates(
      learnerState.learnerId,
    );
  } catch {
    stored = [];
  }

  return mergeCompetencyStates(
    learnerState.competencies,
    ...stored.map((state) => state.competencies),
  );
}

/* Actions whose purpose is to obtain an answer. */
const QUESTION_ACTIONS: AdaptiveAction[] = [
  "diagnose",
  "practice",
  "reassess",
  "retention_check",
  "transfer_check",
];

/*
 * Recorded on the competency's readiness (not mastery): the learner
 * moved on because the topic had no usable question left. Path
 * selection skips it; adults can see it needs support or content.
 * New evidence re-evaluates readiness and clears it.
 */
/*
 * Tranche 4G: record on the competency the learner was sent back
 * from which prerequisite they went to learn, so teachers can see it.
 * A repeated decision for the same prerequisite keeps the first time.
 */
async function markPrerequisiteRepair(
  learnerId: string,
  competencyId: string,
  repairCompetencyId: string,
  fallbackState: AdaptiveDecisionRequest["learnerState"],
  now: Date,
): Promise<void> {
  await updateLearnerState(
    learnerId,
    competencyId,
    (current) => {
      const state = current ?? fallbackState;

      return {
        ...state,
        competencies: state.competencies.map((item) =>
          item.competencyId === competencyId &&
          item.prerequisiteRepair?.repairCompetencyId !==
            repairCompetencyId
            ? {
                ...item,
                prerequisiteRepair: {
                  repairCompetencyId,
                  startedAt: now.toISOString(),
                },
              }
            : item,
        ),
        updatedAt: now.toISOString(),
      };
    },
  );
}

async function markContentExhausted(
  learnerId: string,
  competencyId: string,
  fallbackState: AdaptiveDecisionRequest["learnerState"],
): Promise<void> {
  await updateLearnerState(
    learnerId,
    competencyId,
    (current) => {
      const state = current ?? fallbackState;
      const evaluatedAt = new Date().toISOString();

      return {
        ...state,
        competencies: state.competencies.map((item) =>
          item.competencyId === competencyId
            ? {
                ...item,
                readinessState: {
                  readyForAdvancement: false,
                  confidence: item.confidence,
                  reasonCode:
                    CONTENT_EXHAUSTED_REASON_CODE,
                  evaluatedAt,
                },
              }
            : item,
        ),
        updatedAt: evaluatedAt,
      };
    },
  );
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


