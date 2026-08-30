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

  if (action === "diagnose") {
    const unusedAssessment =
      candidates.find(
        (content) =>
          content.type ===
            "assessment" &&
          content.assessmentItemId &&
          !usedAssessmentItemIds.includes(
            content.assessmentItemId,
          ),
      );

    return (
      unusedAssessment ??
      selectFirstByType(
        candidates,
        [
          "practice",
          "example",
          "lesson",
        ],
      ) ??
      candidates[0]
    );
  }

  if (action === "teach") {
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
          "example",
        ],
      ) ??
      candidates[0]
    );
  }

  if (action === "practice") {
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
          "practice",
          "example",
        ],
      ) ??
      candidates[0]
    );
  }

  if (action === "scaffold") {
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
          "scaffold",
          "example",
        ],
      ) ??
      candidates[0]
    );
  }

  if (action === "remediate") {
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
          "remediation",
          "lesson",
        ],
      ) ??
      candidates[0]
    );
  }

  if (action === "reassess") {
    return (
      candidates.find(
        (content) =>
          content.type ===
            "assessment" &&
          content.assessmentItemId &&
          !usedAssessmentItemIds.includes(
            content.assessmentItemId,
          ),
      ) ??
      candidates.find(
        (content) =>
          content.type ===
          "assessment",
      ) ??
      candidates[0]
    );
  }

  if (action === "retention_check") {
    return (
      candidates.find(
        (content) =>
          content.type ===
            "assessment" &&
          content.assessmentItemId &&
          !usedAssessmentItemIds.includes(
            content.assessmentItemId,
          ),
      ) ??
      candidates.find(
        (content) =>
          content.type ===
          "assessment",
      ) ??
      candidates[0]
    );
  }

  if (action === "transfer_check") {
    const transferAssessment =
      candidates.find(
        (content) =>
          content.assessmentItemId ===
          `item-number-sequence-transfer-001-${learnerState.language}`,
      );

    return (
      transferAssessment ??
      candidates.find(
        (content) =>
          content.type ===
            "assessment" &&
          content.assessmentItemId &&
          !usedAssessmentItemIds.includes(
            content.assessmentItemId,
          ),
      ) ??
      candidates.find(
        (content) =>
          content.type ===
          "assessment",
      ) ??
      candidates[0]
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
      strategyCandidates,
      ["lesson"],
    ) ??
    candidates[0]
  );
}