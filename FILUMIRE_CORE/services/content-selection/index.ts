import type {
  AdaptiveAction,
  LearnerState,
} from "../../packages/domain";

import type {
  LearningContent,
} from "../../packages/content";

import {
  getContentForCompetency,
} from "../content-store";

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

  if (action === "diagnose") {
    const unusedAssessment =
      candidates.find(
        (content) =>
          content.type === "assessment" &&
          content.assessmentItemId &&
          !usedAssessmentItemIds.includes(
            content.assessmentItemId,
          ),
      );

    return (
      unusedAssessment ??
      candidates.find(
        (content) =>
          content.type === "practice",
      ) ??
      candidates[0]
    );
  }

  if (action === "teach") {
    return (
      candidates.find(
        (content) =>
          content.type === "lesson",
      ) ??
      candidates.find(
        (content) =>
          content.type === "example",
      ) ??
      candidates[0]
    );
  }

  if (action === "practice") {
    return (
      candidates.find(
        (content) =>
          content.type === "practice",
      ) ??
      candidates.find(
        (content) =>
          content.type === "example",
      ) ??
      candidates[0]
    );
  }

  if (action === "scaffold") {
    return (
      candidates.find(
        (content) =>
          content.type === "scaffold",
      ) ??
      candidates.find(
        (content) =>
          content.type === "example",
      ) ??
      candidates[0]
    );
  }

  if (action === "remediate") {
    return (
      candidates.find(
        (content) =>
          content.type === "remediation",
      ) ??
      candidates.find(
        (content) =>
          content.type === "lesson",
      ) ??
      candidates[0]
    );
  }

  if (action === "reassess") {
    return (
      candidates.find(
        (content) =>
          content.type === "assessment" &&
          content.assessmentItemId &&
          !usedAssessmentItemIds.includes(
            content.assessmentItemId,
          ),
      ) ??
      candidates.find(
        (content) =>
          content.type === "assessment",
      ) ??
      candidates[0]
    );
  }

  if (action === "advance") {
    return (
      candidates.find(
        (content) =>
          content.type === "lesson",
      ) ??
      candidates.find(
        (content) =>
          content.type === "practice",
      ) ??
      candidates.find(
        (content) =>
          content.type === "assessment",
      ) ??
      candidates[0]
    );
  }

  return (
    candidates.find(
      (content) =>
        content.type === "lesson",
    ) ??
    candidates[0]
  );
}
