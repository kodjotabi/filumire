import type {
  CompetencyId,
  DiagnosticState,
  LearnerCompetencyState,
} from "../../packages/domain";

/*
 * Learner path: one view of a learner across ALL of their
 * competencies.
 *
 * The adaptive engine decides what to do inside one competency.
 * The path answers the questions that sit above that:
 *   - Which competencies are secure, still being learned, or in
 *     need of support?
 *   - Which are mastered but too soon to test for retention, so
 *     the learner can move on and return later?
 *   - Which retention reviews are due now?
 *   - If the learner is struggling, which earlier competency is
 *     the likely root cause?
 *
 * Everything here is a pure function of learner state, the
 * curriculum graph and the clock. Nothing is stored or changed.
 */

export const LEARNER_PATH_VERSION = "learner-path-v1";

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

export interface PathPolicy {
  masteryThreshold: number;
  confidenceThreshold: number;

  /*
   * Minimum time after mastery before retention evidence is
   * meaningful. Earlier than this, a correct answer shows the
   * learner remembers for minutes, not that it has been retained.
   */
  retentionGapMs: number;

  /*
   * Spacing for reviews once retention is confirmed. Each
   * further successful review moves to the next interval.
   * These are defaults, not universal rules.
   */
  reviewIntervalsMs: number[];

  /*
   * A prerequisite counts as weak when it has not been
   * acquired. Prerequisites with no evidence at all are weak
   * only if the learner is stuck on something that depends on them.
   */
}

export const DEFAULT_PATH_POLICY: PathPolicy = {
  masteryThreshold: 0.8,
  confidenceThreshold: 0.8,
  retentionGapMs: 24 * HOUR,
  reviewIntervalsMs: [7 * DAY, 30 * DAY],
};

export interface PathCurriculum {
  /* Ordered list of competency ids in curriculum order. */
  listCompetencyIds(): CompetencyId[];

  /* Undefined when the competency is not in the curriculum. */
  getPrerequisites(
    competencyId: CompetencyId,
  ): CompetencyId[] | undefined;
}

export type AcquisitionLevel =
  | "none"
  | "emerging"
  | "established";

export type RetentionLevel =
  | "untested"
  | "waiting"
  | "due"
  | "retained"
  | "lapsed";

export type TransferLevel =
  | "untested"
  | "pending"
  | "demonstrated"
  | "not_demonstrated";

export type PathStatus =
  | "not_started"
  | "learning"
  | "needs_support"
  | "consolidating"
  | "secured"
  | "review_due";

export interface PathEntry {
  competencyId: CompetencyId;
  status: PathStatus;
  acquisition: AcquisitionLevel;
  retention: RetentionLevel;
  transfer: TransferLevel;
  diagnosticState: DiagnosticState;

  /*
   * When retention becomes testable (waiting) or became due
   * (due), or when the next review is due (retained).
   */
  retentionDueAt?: string;

  /*
   * Earlier competencies that may be the root cause of
   * difficulty here, deepest first. Only filled in when this
   * competency is not progressing.
   */
  likelyRootCauses: CompetencyId[];
}

export interface LearnerPath {
  version: typeof LEARNER_PATH_VERSION;
  generatedAt: string;
  entries: PathEntry[];
}

const SUPPORT_STATES: ReadonlySet<DiagnosticState> = new Set([
  "prerequisite_gap",
  "misconception",
  "persistent_difficulty",
]);

function isAcquired(
  state: LearnerCompetencyState,
  policy: PathPolicy,
): boolean {
  return (
    state.masteryEstimate >= policy.masteryThreshold &&
    state.confidence >= policy.confidenceThreshold
  );
}

function toMs(value: string | undefined): number | undefined {
  if (!value) {
    return undefined;
  }

  const parsed = new Date(value).getTime();

  return Number.isFinite(parsed) ? parsed : undefined;
}

function evaluateEntry(
  competencyId: CompetencyId,
  state: LearnerCompetencyState | undefined,
  now: number,
  policy: PathPolicy,
): Omit<PathEntry, "likelyRootCauses"> {
  if (!state || state.evidenceCount === 0) {
    return {
      competencyId,
      status: "not_started",
      acquisition: "none",
      retention: "untested",
      transfer: "untested",
      diagnosticState: state?.diagnosticState ?? "unknown",
    };
  }

  const base = {
    competencyId,
    diagnosticState: state.diagnosticState,
  };

  const transferStatus = state.transferState?.status;

  const transfer: TransferLevel =
    transferStatus === "demonstrated"
      ? "demonstrated"
      : transferStatus === "not_demonstrated"
        ? "not_demonstrated"
        : transferStatus === "pending"
          ? "pending"
          : "untested";

  if (!isAcquired(state, policy)) {
    const stuck = SUPPORT_STATES.has(state.diagnosticState);

    return {
      ...base,
      status: stuck ? "needs_support" : "learning",
      acquisition: "emerging",
      retention: "untested",
      transfer,
    };
  }

  const retentionStatus = state.retentionState?.status;
  const checkedAt = toMs(state.retentionState?.lastCheckedAt);

  const masteredAt =
    toMs(state.masteredAt) ??
    toMs(state.readinessState?.evaluatedAt) ??
    toMs(state.lastUpdated) ??
    now;

  if (retentionStatus === "retained") {
    const successful =
      state.retentionPerformance?.successfulAttempts ?? 2;

    const reviewsDone = Math.max(0, successful - 2);

    const interval =
      policy.reviewIntervalsMs[
        Math.min(
          reviewsDone,
          policy.reviewIntervalsMs.length - 1,
        )
      ];

    const dueAt = (checkedAt ?? masteredAt) + interval;
    const due = now >= dueAt;

    return {
      ...base,
      status: due
        ? "review_due"
        : transfer === "demonstrated"
          ? "secured"
          : "consolidating",
      acquisition: "established",
      retention: due ? "due" : "retained",
      transfer,
      retentionDueAt: new Date(dueAt).toISOString(),
    };
  }

  /*
   * Not yet retained. The clock starts at mastery, or at the
   * last retention check if one was missed or only half
   * confirmed, so checks are always spaced apart.
   */
  const lapsed = retentionStatus === "not_retained";

  const startedAt =
    checkedAt !== undefined &&
    retentionStatus !== undefined &&
    retentionStatus !== "not_tested"
      ? Math.max(masteredAt, checkedAt)
      : masteredAt;

  const dueAt = startedAt + policy.retentionGapMs;

  return {
    ...base,
    status: "consolidating",
    acquisition: "established",
    retention:
      now >= dueAt ? "due" : lapsed ? "lapsed" : "waiting",
    transfer,
    retentionDueAt: new Date(dueAt).toISOString(),
  };
}

function findRootCauses(
  competencyId: CompetencyId,
  curriculum: PathCurriculum,
  acquired: Map<CompetencyId, boolean>,
): CompetencyId[] {
  /*
   * Walk up the prerequisites. A root cause is an unacquired
   * competency whose own prerequisites are all acquired (or
   * which has none): fixing it unlocks the chain above it.
   */
  const roots: CompetencyId[] = [];
  const visited = new Set<CompetencyId>([competencyId]);

  const walk = (id: CompetencyId): void => {
    for (const prerequisite of
      curriculum.getPrerequisites(id) ?? []) {
      if (visited.has(prerequisite)) {
        continue;
      }

      visited.add(prerequisite);

      if (acquired.get(prerequisite)) {
        continue;
      }

      const parents =
        curriculum
          .getPrerequisites(prerequisite)
          ?.filter((parent) => !acquired.get(parent)) ?? [];

      if (parents.length === 0) {
        roots.push(prerequisite);
      } else {
        walk(prerequisite);
      }
    }
  };

  walk(competencyId);

  return roots;
}

export function buildLearnerPath(input: {
  states: LearnerCompetencyState[];
  curriculum: PathCurriculum;
  now?: Date;
  policy?: PathPolicy;
}): LearnerPath {
  const policy = input.policy ?? DEFAULT_PATH_POLICY;
  const now = (input.now ?? new Date()).getTime();

  /*
   * If the same competency appears more than once, the state
   * with the most evidence wins.
   */
  const byId = new Map<CompetencyId, LearnerCompetencyState>();

  for (const state of input.states) {
    const known = byId.get(state.competencyId);

    if (!known || state.evidenceCount > known.evidenceCount) {
      byId.set(state.competencyId, state);
    }
  }

  const ids = input.curriculum.listCompetencyIds();

  const partial = ids.map((id) =>
    evaluateEntry(id, byId.get(id), now, policy),
  );

  const acquired = new Map<CompetencyId, boolean>(
    partial.map((entry) => [
      entry.competencyId,
      entry.acquisition === "established",
    ]),
  );

  const entries: PathEntry[] = partial.map((entry) => ({
    ...entry,
    likelyRootCauses:
      entry.status === "learning" ||
      entry.status === "needs_support"
        ? findRootCauses(
            entry.competencyId,
            input.curriculum,
            acquired,
          )
        : [],
  }));

  return {
    version: LEARNER_PATH_VERSION,
    generatedAt: new Date(now).toISOString(),
    entries,
  };
}

export type PathRecommendationKind =
  | "prerequisite_repair"
  | "retention_review"
  | "transfer_check"
  | "continue"
  | "start_next"
  | "complete";

export interface PathRecommendation {
  kind: PathRecommendationKind;
  competencyId?: CompetencyId;
  reasonCode: string;
  dueAt?: string;
}

/*
 * Which competency should the learner work on next, and why.
 * This chooses the competency and the kind of work. The existing
 * adaptive policy still decides the detail inside it.
 */
export function recommendNext(input: {
  path: LearnerPath;
  curriculum: PathCurriculum;
  currentCompetencyId?: CompetencyId;
  limit?: number;
}): PathRecommendation[] {
  const { path, curriculum } = input;
  const limit = input.limit ?? 3;

  const byId = new Map(
    path.entries.map((entry) => [entry.competencyId, entry]),
  );

  const recommendations: PathRecommendation[] = [];

  const push = (item: PathRecommendation): void => {
    if (
      !recommendations.some(
        (existing) =>
          existing.kind === item.kind &&
          existing.competencyId === item.competencyId,
      )
    ) {
      recommendations.push(item);
    }
  };

  const current = input.currentCompetencyId
    ? byId.get(input.currentCompetencyId)
    : undefined;

  /*
   * 1. A learner who is stuck is better served by repairing the
   *    earlier idea than by more of the same practice.
   */
  if (
    current &&
    (current.status === "needs_support" ||
      current.status === "learning") &&
    current.likelyRootCauses.length > 0
  ) {
    for (const root of current.likelyRootCauses) {
      push({
        kind: "prerequisite_repair",
        competencyId: root,
        reasonCode: "LIKELY_ROOT_CAUSE_PREREQUISITE",
      });
    }
  }

  /*
   * 2. Reviews that have come due, most overdue first.
   */
  path.entries
    .filter((entry) => entry.retention === "due")
    .sort(
      (a, b) =>
        (a.retentionDueAt ?? "").localeCompare(
          b.retentionDueAt ?? "",
        ),
    )
    .forEach((entry) =>
      push({
        kind: "retention_review",
        competencyId: entry.competencyId,
        reasonCode: "RETENTION_REVIEW_DUE",
        dueAt: entry.retentionDueAt,
      }),
    );

  /*
   * 3. Finish the current competency. A mastered competency
   *    whose retention check is not yet due does not hold the
   *    learner back, but its transfer check can happen now.
   */
  if (current) {
    if (
      current.status === "learning" ||
      current.status === "needs_support"
    ) {
      push({
        kind: "continue",
        competencyId: current.competencyId,
        reasonCode: "CURRENT_COMPETENCY_IN_PROGRESS",
      });
    } else if (
      current.acquisition === "established" &&
      current.transfer !== "demonstrated"
    ) {
      push({
        kind: "transfer_check",
        competencyId: current.competencyId,
        reasonCode: "TRANSFER_EVIDENCE_NEEDED",
      });
    }
  }

  /*
   * 4. Move on to the next competency whose prerequisites are
   *    in place. This is how a learner keeps progressing while
   *    retention checks wait for their gap to pass.
   */
  const unlocked = curriculum
    .listCompetencyIds()
    .map((id) => byId.get(id))
    .find(
      (entry) =>
        entry &&
        entry.status === "not_started" &&
        (curriculum.getPrerequisites(entry.competencyId) ?? [])
          .every(
            (prerequisite) =>
              byId.get(prerequisite)?.acquisition ===
              "established",
          ),
    );

  if (unlocked) {
    push({
      kind: "start_next",
      competencyId: unlocked.competencyId,
      reasonCode: "NEXT_COMPETENCY_UNLOCKED",
    });
  }

  if (recommendations.length === 0) {
    const anyOpen = path.entries.some(
      (entry) =>
        entry.status === "learning" ||
        entry.status === "needs_support" ||
        entry.status === "consolidating",
    );

    push({
      kind: "complete",
      reasonCode: anyOpen
        ? "WAITING_FOR_RETENTION_WINDOW"
        : "PATH_COMPLETE",
    });
  }

  return recommendations.slice(0, limit);
}
