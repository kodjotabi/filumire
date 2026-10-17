import type {
  CompetencyId,
  LearnerCompetencyState,
} from "../../packages/domain";

import {
  buildLearnerPath,
  DEFAULT_PATH_POLICY,
  recommendNext,
  type PathCurriculum,
  type PathPolicy,
} from "./index";

/*
 * Time-aware retention, as one decision: where should the learner
 * be working right now, and is retention testable yet?
 *
 * Two rules, nothing more:
 *
 *  1. A competency that has just been acquired is not retention
 *     tested straight away. Its retention window is "not_yet_open"
 *     until the gap has passed, so the learner can move on.
 *
 *  2. When a review has come due on an earlier competency, the
 *     learner comes back to it, but only at a natural boundary:
 *     never while they are in the middle of learning or stuck on
 *     the current competency.
 */
export interface PathFocus {
  /* Competency the learner should work on. */
  competencyId: CompetencyId;

  /* True when a current or earlier competency is due for review. */
  reviewDue: boolean;

  /* Retention window of the current competency. */
  retentionWindow: "open" | "not_yet_open";

  reasonCode?: string;
}

export function chooseFocus(input: {
  states: LearnerCompetencyState[];
  currentCompetencyId: CompetencyId;
  curriculum: PathCurriculum;
  now?: Date;
  policy?: PathPolicy;
}): PathFocus {
  const policy = input.policy ?? DEFAULT_PATH_POLICY;

  const path = buildLearnerPath({
    states: input.states,
    curriculum: input.curriculum,
    now: input.now,
    policy,
  });

  const current = path.entries.find(
    (entry) => entry.competencyId === input.currentCompetencyId,
  );

  const retentionWindow: PathFocus["retentionWindow"] =
    current &&
    current.acquisition === "established" &&
    (current.retention === "waiting" ||
      current.retention === "lapsed")
      ? "not_yet_open"
      : "open";

  const atBoundary =
    !current ||
    current.status === "not_started" ||
    current.acquisition === "established";

  if (atBoundary) {
    const review = recommendNext({
      path,
      curriculum: input.curriculum,
      currentCompetencyId: input.currentCompetencyId,
      limit: 10,
    }).find(
      (item) =>
        item.kind === "retention_review" &&
        item.competencyId !== undefined,
    );

    if (review?.competencyId) {
      return {
        competencyId: review.competencyId,
        reviewDue: true,
        retentionWindow,
        reasonCode: "RETENTION_REVIEW_DUE",
      };
    }
  }

  return {
    competencyId: input.currentCompetencyId,
    reviewDue: false,
    retentionWindow,
  };
}
