import type {
  CompetencyId,
  LearnerCompetencyState,
} from "../../packages/domain";

import {
  getCompetency,
} from "../../packages/curriculum";

import {
  buildLearnerPath,
  DEFAULT_PATH_POLICY,
} from "./index";

import {
  createPathCurriculum,
} from "./curriculum";

/*
 * Tranche 4B step 4: whole-subject forward progression.
 *
 * Where does the learner go when the current competency is finished
 * (or cannot progress)? Successor first, then the learner path,
 * always inside the current subject AND grade, always with every
 * prerequisite completed across ALL the learner's stored states.
 * Retention review is separate (chooseFocus); this is forward
 * progression only.
 */

/* Same marker the adaptive engine records on exhaustion. */
export const CONTENT_EXHAUSTED_NEEDS_SUPPORT =
  "CONTENT_EXHAUSTED_NEEDS_SUPPORT";

/*
 * Tranche 4C: an exhausted competency is retried, never straight
 * away: at least this long after it was marked, and only while it
 * still has a question the learner may answer again (the engine
 * checks that and passes the retryable ids in).
 */
export const NEEDS_SUPPORT_RETRY_GAP_MS = 24 * 60 * 60 * 1000;

export type NextCompetencyReason =
  | "SUCCESSOR_PREREQUISITES_MET"
  | "RESUME_UNFINISHED_COMPETENCY"
  | "RETURN_TO_NEEDS_SUPPORT_COMPETENCY"
  | "NEXT_COMPETENCY_UNLOCKED"
  | "LEARNING_PATH_COMPLETE"
  | "NO_ELIGIBLE_COMPETENCY_NEEDS_SUPPORT";

export interface NextCompetencyChoice {
  competencyId?: CompetencyId;
  reasonCode: NextCompetencyReason;

  /*
   * True only when every competency of the subject and grade is
   * completed (or mastered). Blocked is not complete.
   */
  pathComplete: boolean;

  /*
   * When blocked: the earliest time an exhausted competency whose
   * prerequisites are met becomes due for a retry.
   */
  retryAt?: string;
}

/*
 * One definition of "done" for prerequisites and path completion:
 * mastery + confidence, transfer demonstrated, and retention
 * confirmed (or, with time-aware retention, not failed while it
 * waits for its window).
 */
export function isCompetencyCompleted(
  state: LearnerCompetencyState | undefined,
  timeAware = false,
): boolean {
  if (
    !state ||
    state.masteryEstimate < DEFAULT_PATH_POLICY.masteryThreshold ||
    state.confidence < DEFAULT_PATH_POLICY.confidenceThreshold
  ) {
    return false;
  }

  if (state.transferState?.status !== "demonstrated") {
    return false;
  }

  if (state.retentionState?.status === "retained") {
    return true;
  }

  return (
    timeAware &&
    state.retentionState?.status !== "not_retained"
  );
}

/* Acquired (mastery gate met): never ordinary forward progression. */
function isMastered(
  state: LearnerCompetencyState | undefined,
): boolean {
  return Boolean(
    state &&
      state.masteryEstimate >= DEFAULT_PATH_POLICY.masteryThreshold &&
      state.confidence >= DEFAULT_PATH_POLICY.confidenceThreshold,
  );
}

export function isContentExhausted(
  state: LearnerCompetencyState | undefined,
): boolean {
  return (
    state?.readinessState?.reasonCode ===
    CONTENT_EXHAUSTED_NEEDS_SUPPORT
  );
}

/* When an exhausted competency may be retried (gap only). */
export function needsSupportRetryDueAt(
  state: LearnerCompetencyState | undefined,
): string | undefined {
  const markedAt = Date.parse(
    state?.readinessState?.evaluatedAt ?? "",
  );

  return isContentExhausted(state) && Number.isFinite(markedAt)
    ? new Date(markedAt + NEEDS_SUPPORT_RETRY_GAP_MS).toISOString()
    : undefined;
}

/*
 * Tranche 4D: the learner is on a competency whose prerequisites are
 * not completed (initial placement or a teacher assignment; forward
 * progression never does this). Which prerequisite should be learnt
 * first? The first missing one, in prerequisite order, whose own
 * prerequisites are completed, going deeper when they are not. An
 * exhausted prerequisite is skipped unless its retry is due.
 */
export function choosePrerequisiteRepair(input: {
  currentCompetencyId: CompetencyId;
  states: LearnerCompetencyState[];
  timeAware?: boolean;
  retryable?: ReadonlySet<CompetencyId>;
}): CompetencyId | undefined {
  const byId = new Map(
    mergeCompetencyStates(input.states).map((state) => [
      state.competencyId,
      state,
    ]),
  );

  const completed = (id: CompetencyId): boolean =>
    isCompetencyCompleted(byId.get(id), input.timeAware);

  const visited = new Set<CompetencyId>();

  const walk = (id: CompetencyId): CompetencyId | undefined => {
    for (const prerequisite of getCompetency(id)?.prerequisiteCompetencyIds ?? []) {
      if (visited.has(prerequisite) || completed(prerequisite)) {
        continue;
      }

      visited.add(prerequisite);

      const ownPrerequisites =
        getCompetency(prerequisite)?.prerequisiteCompetencyIds ?? [];

      const blocked =
        isContentExhausted(byId.get(prerequisite)) &&
        !input.retryable?.has(prerequisite);

      if (!blocked && ownPrerequisites.every(completed)) {
        return prerequisite;
      }

      const deeper = walk(prerequisite);

      if (deeper) {
        return deeper;
      }
    }

    return undefined;
  };

  return walk(input.currentCompetencyId);
}

/* Most evidence wins when a competency appears in several states. */
export function mergeCompetencyStates(
  ...groups: LearnerCompetencyState[][]
): LearnerCompetencyState[] {
  const byId = new Map<CompetencyId, LearnerCompetencyState>();

  for (const group of groups) {
    for (const state of group) {
      const known = byId.get(state.competencyId);

      if (!known || state.evidenceCount > known.evidenceCount) {
        byId.set(state.competencyId, state);
      }
    }
  }

  return [...byId.values()];
}

export function chooseNextCompetency(input: {
  currentCompetencyId: CompetencyId;
  states: LearnerCompetencyState[];

  /*
   * Whether the current competency counts as completed. False when
   * the learner is moving on because content ran out: its
   * successors then keep an unmet prerequisite.
   */
  currentCompleted: boolean;
  timeAware?: boolean;

  /*
   * Exhausted competencies that may be retried now (gap passed and
   * a usable question remains). Decided by the engine.
   */
  retryable?: ReadonlySet<CompetencyId>;
}): NextCompetencyChoice {
  const current = getCompetency(input.currentCompetencyId);

  if (!current) {
    return {
      reasonCode: "NO_ELIGIBLE_COMPETENCY_NEEDS_SUPPORT",
      pathComplete: false,
    };
  }

  const curriculum = createPathCurriculum(
    current.subjectId,
    current.learningLevelId,
  );

  const scope = curriculum.listCompetencyIds();
  const inScope = new Set(scope);

  const byId = new Map(
    mergeCompetencyStates(input.states).map((state) => [
      state.competencyId,
      state,
    ]),
  );

  const completed = (id: CompetencyId): boolean =>
    id === current.id
      ? input.currentCompleted
      : isCompetencyCompleted(byId.get(id), input.timeAware);

  const prerequisitesMet = (id: CompetencyId): boolean =>
    (curriculum.getPrerequisites(id) ?? []).every(completed);

  const open = (id: CompetencyId): boolean =>
    id !== current.id &&
    inScope.has(id) &&
    !completed(id) &&
    !isMastered(byId.get(id)) &&
    prerequisitesMet(id);

  const eligible = (id: CompetencyId): boolean =>
    open(id) && !isContentExhausted(byId.get(id));

  const retryDue = (id: CompetencyId): boolean =>
    open(id) &&
    isContentExhausted(byId.get(id)) &&
    Boolean(input.retryable?.has(id));

  /* 1. Local continuity: a successor that is now unlocked. */
  const successor = current.successorCompetencyIds.find(eligible);

  if (successor) {
    return {
      competencyId: successor,
      reasonCode: "SUCCESSOR_PREREQUISITES_MET",
      pathComplete: false,
    };
  }

  /*
   * 2. The learner path over the subject and grade, built from all
   *    stored states. Resume something already started before
   *    opening something new; among new ones, prefer a competency
   *    that builds on what the learner has completed, then the
   *    official order.
   */
  const path = buildLearnerPath({
    states: [...byId.values()].filter((state) =>
      inScope.has(state.competencyId),
    ),
    curriculum,
  });

  const candidates = path.entries.filter((entry) =>
    eligible(entry.competencyId),
  );

  const resume = candidates.find(
    (entry) => entry.status === "learning",
  );

  if (resume) {
    return {
      competencyId: resume.competencyId,
      reasonCode: "RESUME_UNFINISHED_COMPETENCY",
      pathComplete: false,
    };
  }

  /*
   * 3. Come back to a competency that ran out of content once its
   *    retry is due. It unblocks the competencies that depend on it.
   */
  const retry = scope.find(retryDue);

  if (retry) {
    return {
      competencyId: retry,
      reasonCode: "RETURN_TO_NEEDS_SUPPORT_COMPETENCY",
      pathComplete: false,
    };
  }

  const fresh = candidates.filter(
    (entry) => entry.status === "not_started",
  );

  const buildsOnCompleted = fresh.find(
    (entry) =>
      (curriculum.getPrerequisites(entry.competencyId) ?? []).length > 0,
  );

  const unlocked = buildsOnCompleted ?? fresh[0] ?? candidates[0];

  if (unlocked) {
    return {
      competencyId: unlocked.competencyId,
      reasonCode: "NEXT_COMPETENCY_UNLOCKED",
      pathComplete: false,
    };
  }

  /*
   * 3. Nothing eligible. Complete only when every competency of the
   *    subject and grade is done; otherwise the learner is blocked
   *    (exhausted content or prerequisites that need support).
   */
  const pathComplete = scope.every(
    (id) => completed(id) || isMastered(byId.get(id)),
  );

  const retryAt = pathComplete
    ? undefined
    : scope
        .filter((id) => open(id) && isContentExhausted(byId.get(id)))
        .map((id) => needsSupportRetryDueAt(byId.get(id)))
        .filter((value): value is string => Boolean(value))
        .sort()[0];

  return {
    reasonCode: pathComplete
      ? "LEARNING_PATH_COMPLETE"
      : "NO_ELIGIBLE_COMPETENCY_NEEDS_SUPPORT",
    pathComplete,
    retryAt,
  };
}
