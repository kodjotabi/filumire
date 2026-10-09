export const RUBRIC_ENGINE_VERSION = "rubric-v1";

export type RubricCriterionRating =
  | "meets"
  | "partially_meets"
  | "does_not_meet"
  | "not_observed";

export interface RubricCriterion {
  id: string;
  label: string;
  description: string;
  required: boolean;
}

export interface RubricDefinition {
  id: string;
  version: string;
  competencyId: string;
  criteria: RubricCriterion[];
}

export interface RubricCriterionEvaluation {
  criterionId: string;
  rating: RubricCriterionRating;
  note?: string;
}

export interface RubricEvaluation {
  rubricId: string;
  rubricVersion: string;
  criteria: RubricCriterionEvaluation[];
}

export function validateRubricEvaluation(
  rubric: RubricDefinition,
  evaluation: RubricEvaluation,
): boolean {
  if (
    evaluation.rubricId !== rubric.id ||
    evaluation.rubricVersion !== rubric.version
  ) {
    return false;
  }

  const rubricCriterionIds = new Set(
    rubric.criteria.map((criterion) => criterion.id),
  );

  const evaluatedCriterionIds = new Set(
    evaluation.criteria.map((criterion) => criterion.criterionId),
  );

  if (
    evaluatedCriterionIds.size !== evaluation.criteria.length
  ) {
    return false;
  }

  for (const evaluationCriterion of evaluation.criteria) {
    if (!rubricCriterionIds.has(evaluationCriterion.criterionId)) {
      return false;
    }
  }

  for (const criterion of rubric.criteria) {
    if (
      criterion.required &&
      !evaluatedCriterionIds.has(criterion.id)
    ) {
      return false;
    }
  }

  return true;
}
