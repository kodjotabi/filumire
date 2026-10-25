import type {
  AdaptiveAction,
  InstructionalStrategy,
  LearnerState,
} from "../../packages/domain";

import type {
  LearningContent,
} from "../../packages/content";

import {
  getContentForCompetency,
} from "../content-store";

import {
  isOnAdaptivePath,
} from "../content-store/evidence-role";

function getPreferredTeachingStrategies(
  action: AdaptiveAction,
): InstructionalStrategy[] {
  switch (action) {
    case "teach":
      return [
        "direct_explanation",
        "worked_example",
        "guided_practice",
        "questioning",
        "visual_representation",
        "concrete_representation",
        "analogy",
        "demonstration",
        "story_context",
        "mixed_representation",
      ];

    case "practice":
      return [
        "guided_practice",
        "retrieval_practice",
        "worked_example",
        "mixed_representation",
      ];

    case "scaffold":
      return [
        "step_by_step_scaffold",
        "worked_example",
        "visual_representation",
        "concrete_representation",
        "guided_practice",
      ];

    case "remediate":
      return [
        "error_analysis",
        "direct_explanation",
        "worked_example",
        "concrete_representation",
        "analogy",
        "visual_representation",
        "demonstration",
      ];

    case "advance":
      return [
        "story_context",
        "questioning",
        "demonstration",
        "worked_example",
        "direct_explanation",
        "mixed_representation",
      ];

    default:
      return [];
  }
}

function selectByTeachingStrategy(
  candidates: LearningContent[],
  preferredStrategies: InstructionalStrategy[],
): LearningContent | undefined {
  for (const strategy of preferredStrategies) {
    const content =
      candidates.find(
        (candidate) =>
          candidate.teachingStrategy ===
          strategy,
      );

    if (content) {
      return content;
    }
  }

  return undefined;
}

function selectFirstByType(
  candidates: LearningContent[],
  types: LearningContent["type"][],
): LearningContent | undefined {
  for (const type of types) {
    const content =
      candidates.find(
        (candidate) =>
          candidate.type === type,
      );

    if (content) {
      return content;
    }
  }

  return undefined;
}

/*
 * Question pools by purpose (Tranche 4B step 1).
 *
 * "practice" is the topic's guided practice question and
 * "general" an assessment item authored without a purpose.
 * Retention and transfer items are evidence of their own kind
 * and are never served for another action; mastery actions
 * only fall back across the mastery pools.
 */
type QuestionPool =
  | "diagnostic"
  | "reassessment"
  | "practice"
  | "general"
  | "retention"
  | "transfer";

const QUESTION_POOLS_BY_ACTION:
  Partial<Record<AdaptiveAction, QuestionPool[]>> = {
  diagnose: [
    "diagnostic",
    "general",
    "practice",
    "reassessment",
  ],
  reassess: [
    "reassessment",
    "general",
    "diagnostic",
    "practice",
  ],
  practice: [
    "practice",
    "general",
    "reassessment",
    "diagnostic",
  ],
  retention_check: [
    "retention",
  ],
  transfer_check: [
    "transfer",
  ],
};

/*
 * A topic that authors no retention (or transfer) item keeps
 * the long-standing fallback to its mastery items, so a check
 * can still be made.
 */
const MASTERY_POOLS: QuestionPool[] = [
  "general",
  "reassessment",
  "diagnostic",
  "practice",
];

function getQuestionPool(
  content: LearningContent,
): QuestionPool | undefined {
  if (!content.assessmentItemId) {
    return undefined;
  }

  /* Optional teacher extensions and retired items are never chosen. */
  if (!isOnAdaptivePath(content)) {
    return undefined;
  }

  const purpose =
    content.metadata?.assessmentPurpose;

  if (
    purpose === "diagnostic" ||
    purpose === "reassessment" ||
    purpose === "retention" ||
    purpose === "transfer"
  ) {
    return purpose;
  }

  /* The original test topic's transfer item predates purpose tags. */
  if (
    content.assessmentItemId.startsWith(
      "item-number-sequence-transfer-001-",
    )
  ) {
    return "transfer";
  }

  return content.type === "practice"
    ? "practice"
    : "general";
}

function selectQuestionFromPools(
  availableContent: LearningContent[],
  pools: QuestionPool[],
  usedAssessmentItemIds: string[],
): LearningContent | undefined {
  for (const pool of pools) {
    const content =
      availableContent.find(
        (candidate) =>
          getQuestionPool(candidate) === pool &&
          !usedAssessmentItemIds.includes(
            candidate.assessmentItemId!,
          ),
      );

    if (content) {
      return content;
    }
  }

  return undefined;
}

/*
 * Controlled reuse (Tranche 4B step 3). When no fresh item is left
 * in an action's pools, an answered item may be served again only:
 * - if it is not the item answered last;
 * - after teaching was acknowledged since its last answer, or after
 *   at least REUSE_SPACING_ANSWERS other answers;
 * - or (Tranche 4C) once REUSE_SPACING_MS has passed since its last
 *   answer, even if it was the last item answered (spaced retry of a
 *   competency that ran out of content);
 * - while it has been answered fewer than MAX_ITEM_EXPOSURES times.
 * The least exposed, longest-unseen item is chosen, so the learner
 * does not cycle between one or two items. Mastery counts a repeated
 * item for less (services/mastery).
 */
export const MAX_ITEM_EXPOSURES = 2;
export const REUSE_SPACING_ANSWERS = 2;
export const REUSE_SPACING_MS = 24 * 60 * 60 * 1000;

export interface QuestionReuseContext {
  /* Answered items, oldest first. */
  answers: {
    assessmentItemId: string;
    timestamp: string;
  }[];
  /* When teaching (cards) was acknowledged or completed. */
  instructionTimes: string[];
  /* Decision time, for spacing in time (Tranche 4C). */
  now?: string;
}

function selectReusableQuestion(
  availableContent: LearningContent[],
  pools: QuestionPool[],
  reuse: QuestionReuseContext,
): LearningContent | undefined {
  const answers = reuse.answers;

  if (answers.length === 0) {
    return undefined;
  }

  const lastAnsweredItemId =
    answers[answers.length - 1].assessmentItemId;

  const candidates = availableContent
    .filter((content) => {
      const pool = getQuestionPool(content);

      if (!pool || !pools.includes(pool)) {
        return false;
      }

      const itemId = content.assessmentItemId!;

      const exposures = answers.filter(
        (answer) => answer.assessmentItemId === itemId,
      );

      if (
        exposures.length === 0 ||
        exposures.length >= MAX_ITEM_EXPOSURES
      ) {
        return false;
      }

      const lastSeenAt =
        exposures[exposures.length - 1].timestamp;

      const spacedInTime =
        reuse.now !== undefined &&
        Date.parse(reuse.now) - Date.parse(lastSeenAt) >=
          REUSE_SPACING_MS;

      if (spacedInTime) {
        return true;
      }

      if (itemId === lastAnsweredItemId) {
        return false;
      }

      const answersSince = answers.filter(
        (answer) => answer.timestamp > lastSeenAt,
      ).length;

      const taughtSince = reuse.instructionTimes.some(
        (time) => time > lastSeenAt,
      );

      return (
        taughtSince ||
        answersSince >= REUSE_SPACING_ANSWERS
      );
    })
    .map((content) => {
      const exposures = answers.filter(
        (answer) =>
          answer.assessmentItemId ===
          content.assessmentItemId,
      );

      return {
        content,
        exposureCount: exposures.length,
        lastSeenAt:
          exposures[exposures.length - 1].timestamp,
      };
    })
    .sort(
      (a, b) =>
        a.exposureCount - b.exposureCount ||
        a.lastSeenAt.localeCompare(b.lastSeenAt),
    );

  return candidates[0]?.content;
}

export function selectQuestionForAction(
  availableContent: LearningContent[],
  action: AdaptiveAction,
  usedAssessmentItemIds: string[],
  reuse?: QuestionReuseContext,
): LearningContent | undefined {
  const pools =
    QUESTION_POOLS_BY_ACTION[action];

  if (!pools) {
    return undefined;
  }

  const ownPool = pools[0];

  /*
   * A topic that authors no retention (or transfer) item checks
   * with its mastery items instead.
   */
  const effectivePools =
    (ownPool === "retention" ||
      ownPool === "transfer") &&
    !availableContent.some(
      (content) =>
        getQuestionPool(content) === ownPool,
    )
      ? MASTERY_POOLS
      : pools;

  return (
    selectQuestionFromPools(
      availableContent,
      effectivePools,
      usedAssessmentItemIds,
    ) ??
    (reuse
      ? selectReusableQuestion(
          availableContent,
          effectivePools,
          reuse,
        )
      : undefined)
  );
}

function getUsedTeachingStrategies(
  competency: LearnerState["competencies"][number],
): InstructionalStrategy[] {
  return (
    competency.strategyEvidence?.map(
      (evidence) =>
        evidence.strategy,
    ) ?? []
  );
}

export function selectLearningContent(
  learnerState: LearnerState,
  action: AdaptiveAction,
  usedAssessmentItemIds: string[] = [],
  usedContentIds: string[] = [],
  reuse?: QuestionReuseContext,
): LearningContent | undefined {
  if (action === "complete") {
    return undefined;
  }

  const competency =
    learnerState.competencies[0];

  if (!competency) {
    return undefined;
  }

  const availableContent =
    getContentForCompetency(
      competency.competencyId,
      learnerState.language,
    );

  if (availableContent.length === 0) {
    return undefined;
  }

  const usedContent =
    new Set(usedContentIds);

  const unusedContent =
    availableContent.filter(
      (content) =>
        !usedContent.has(content.id),
    );

  const candidates =
    unusedContent.length > 0
      ? unusedContent
      : availableContent;

  const usedTeachingStrategies =
    getUsedTeachingStrategies(
      competency,
    );

  const unusedStrategyCandidates =
    candidates.filter(
      (content) =>
        content.teachingStrategy &&
        !usedTeachingStrategies.includes(
          content.teachingStrategy,
        ),
    );

  const strategyCandidates =
    unusedStrategyCandidates.length > 0
      ? unusedStrategyCandidates
      : candidates;

  /*
   * Question actions serve an eligible question whenever one
   * remains; a card is only the last resort.
   */
  const question =
    selectQuestionForAction(
      availableContent,
      action,
      usedAssessmentItemIds,
      reuse,
    );

  if (question) {
    return question;
  }

  /*
   * Tranche 4C: from here on only cards. A question is served only
   * by the controlled selection above (pools, reuse spacing,
   * exposure cap); a fallback must never hand out an assessment
   * item, or exhaustion would go unnoticed and items be over-reused.
   */
  const cardPool = availableContent.filter(
    (content) => !content.assessmentItemId,
  );

  const unusedCards = cardPool.filter(
    (content) => !usedContent.has(content.id),
  );

  const cards =
    unusedCards.length > 0 ? unusedCards : cardPool;

  const unusedStrategyCards = cards.filter(
    (content) =>
      content.teachingStrategy &&
      !usedTeachingStrategies.includes(
        content.teachingStrategy,
      ),
  );

  const strategyCards =
    unusedStrategyCards.length > 0
      ? unusedStrategyCards
      : cards;

  if (action === "diagnose") {
    return (
      selectFirstByType(
        cards,
        [
          "example",
          "lesson",
        ],
      ) ??
      cards[0]
    );
  }

  if (action === "teach") {
    return (
      selectByTeachingStrategy(
        strategyCards,
        getPreferredTeachingStrategies(
          action,
        ),
      ) ??
      selectFirstByType(
        strategyCards,
        [
          "lesson",
          "example",
        ],
      ) ??
      cards[0]
    );
  }

  if (action === "practice") {
    return (
      selectByTeachingStrategy(
        strategyCards,
        getPreferredTeachingStrategies(
          action,
        ),
      ) ??
      selectFirstByType(
        strategyCards,
        [
          "practice",
          "example",
        ],
      ) ??
      cards[0]
    );
  }

  if (action === "scaffold") {
    return (
      selectByTeachingStrategy(
        strategyCards,
        getPreferredTeachingStrategies(
          action,
        ),
      ) ??
      selectFirstByType(
        strategyCards,
        [
          "scaffold",
          "example",
        ],
      ) ??
      cards[0]
    );
  }

  if (action === "remediate") {
    return (
      selectByTeachingStrategy(
        strategyCards,
        getPreferredTeachingStrategies(
          action,
        ),
      ) ??
      selectFirstByType(
        strategyCards,
        [
          "remediation",
          "lesson",
        ],
      ) ??
      cards[0]
    );
  }

  if (
    action === "reassess" ||
    action === "retention_check" ||
    action === "transfer_check"
  ) {
    return (
      selectFirstByType(
        cards,
        [
          "lesson",
          "example",
        ],
      ) ??
      cards[0]
    );
  }

  if (action === "advance") {
    return (
      selectByTeachingStrategy(
        strategyCandidates,
        getPreferredTeachingStrategies(
          action,
        ),
      ) ??
      selectFirstByType(
        strategyCandidates,
        [
          "lesson",
          "practice",
          "assessment",
        ],
      ) ??
      candidates[0]
    );
  }

  return (
    selectFirstByType(
      strategyCards,
      ["lesson"],
    ) ??
    cards[0]
  );
}