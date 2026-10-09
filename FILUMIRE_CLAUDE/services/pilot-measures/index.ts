import type {
  LearnerCompetencyState,
  LearningEvidence,
} from "../../packages/domain";

import {
  isContentExhausted,
} from "../learner-path/progression";

/*
 * Tranche 4C: pilot measures for the Option B mastery model
 * (decision of 7 October: validate the model with pilot data).
 *
 * A pure function of stored learner states and evidence; nothing is
 * changed. Every rate comes with its denominator, and is null when
 * there is nothing to measure, so a small pilot cannot look better
 * than it is.
 */
export const PILOT_MEASURES_VERSION = "pilot-measures-v1";

export const PILOT_MEASURES_POLICY = {
  /* Retention evidence this long after mastery counts as delayed. */
  delayedRetentionMs: 24 * 60 * 60 * 1000,
  /* Answers without mastery (and not exhausted) that count as stuck. */
  stuckAnswerThreshold: 15,
  /* Answers at each end used for the learning-gain proxy. */
  gainWindow: 3,
} as const;

export interface PilotCompetencyRecord {
  learnerId: string;
  state: LearnerCompetencyState;
}

export interface Rate {
  numerator: number;
  denominator: number;
  rate: number | null;
}

export interface MasteryPilotMeasures {
  version: typeof PILOT_MEASURES_VERSION;
  learners: number;
  competenciesAttempted: number;
  competenciesMastered: number;

  /*
   * Mastered, then the FIRST retention or transfer answer after
   * mastery was wrong. Denominator: mastered competencies with any
   * retention/transfer answer after mastery.
   */
  falseMasteryRate: Rate;

  /* First retention answer after mastery correct (any delay / >= 24 h). */
  retentionAfterMastery: Rate;
  delayedRetentionAfterMastery: Rate;

  /* First transfer answer after mastery correct. */
  transferAfterMastery: Rate;

  /*
   * Teacher-evaluated answers given after the system recorded
   * mastery that the teacher marked correct.
   */
  teacherAgreementAfterMastery: Rate;

  /*
   * Attempted competencies that are exhausted (needs support) or have
   * many answers and no mastery.
   */
  stuckRate: Rate;
  contentExhaustedCount: number;

  /* Medians over mastered competencies. */
  medianAnswersToMastery: number | null;
  medianMinutesToMastery: number | null;

  /*
   * Proxy: share correct in the last answers minus share correct in
   * the first answers (mastery answers only), averaged over
   * competencies with at least 2 x gainWindow answers.
   */
  meanLearningGain: number | null;
  learningGainSample: number;
}

const ANSWER_OUTCOMES = new Set(["correct", "incorrect", "partial"]);

function rate(numerator: number, denominator: number): Rate {
  return {
    numerator,
    denominator,
    rate: denominator > 0 ? numerator / denominator : null,
  };
}

function median(values: number[]): number | null {
  if (values.length === 0) {
    return null;
  }

  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);

  return sorted.length % 2 === 1
    ? sorted[middle]
    : (sorted[middle - 1] + sorted[middle]) / 2;
}

function isRetention(item: LearningEvidence): boolean {
  return (
    item.purpose === "retention" ||
    item.interventionType === "retention_check"
  );
}

function isTransfer(item: LearningEvidence): boolean {
  return (
    item.purpose === "transfer" ||
    item.interventionType === "transfer_check"
  );
}

function correctShare(items: LearningEvidence[]): number {
  return (
    items.filter((item) => item.outcome === "correct").length /
    items.length
  );
}

export function computeMasteryPilotMeasures(input: {
  records: PilotCompetencyRecord[];
  evidence: LearningEvidence[];
}): MasteryPilotMeasures {
  const policy = PILOT_MEASURES_POLICY;

  const evidenceByKey = new Map<string, LearningEvidence[]>();

  for (const item of input.evidence) {
    if (!ANSWER_OUTCOMES.has(item.outcome)) {
      continue;
    }

    const key = `${item.learnerId}|${item.competencyId}`;
    const list = evidenceByKey.get(key) ?? [];
    list.push(item);
    evidenceByKey.set(key, list);
  }

  for (const list of evidenceByKey.values()) {
    list.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  }

  const learners = new Set<string>();
  let attempted = 0;
  let mastered = 0;
  let exhausted = 0;
  let stuck = 0;
  let falseMastery = 0;
  let checkedAfterMastery = 0;
  let retentionChecked = 0;
  let retained = 0;
  let delayedChecked = 0;
  let delayedRetained = 0;
  let transferChecked = 0;
  let transferred = 0;
  let teacherAfterMastery = 0;
  let teacherAgreed = 0;
  const answersToMastery: number[] = [];
  const minutesToMastery: number[] = [];
  const gains: number[] = [];

  for (const { learnerId, state } of input.records) {
    const answers =
      evidenceByKey.get(`${learnerId}|${state.competencyId}`) ?? [];

    if (answers.length === 0) {
      continue;
    }

    learners.add(learnerId);
    attempted += 1;

    const masteryAnswers = answers.filter(
      (item) => !isRetention(item) && !isTransfer(item),
    );

    if (masteryAnswers.length >= 2 * policy.gainWindow) {
      gains.push(
        correctShare(masteryAnswers.slice(-policy.gainWindow)) -
          correctShare(masteryAnswers.slice(0, policy.gainWindow)),
      );
    }

    if (isContentExhausted(state)) {
      exhausted += 1;
    }

    const masteredAt = state.masteredAt;

    if (!masteredAt) {
      if (
        isContentExhausted(state) ||
        answers.length >= policy.stuckAnswerThreshold
      ) {
        stuck += 1;
      }

      continue;
    }

    mastered += 1;

    answersToMastery.push(
      masteryAnswers.filter((item) => item.timestamp <= masteredAt)
        .length,
    );

    minutesToMastery.push(
      (Date.parse(masteredAt) - Date.parse(answers[0].timestamp)) /
        60000,
    );

    const after = answers.filter((item) => item.timestamp > masteredAt);
    const firstRetention = after.find(isRetention);
    const firstTransfer = after.find(isTransfer);
    const firstDelayedRetention = after.find(
      (item) =>
        isRetention(item) &&
        Date.parse(item.timestamp) - Date.parse(masteredAt) >=
          policy.delayedRetentionMs,
    );

    if (firstRetention) {
      retentionChecked += 1;
      retained += firstRetention.outcome === "correct" ? 1 : 0;
    }

    if (firstDelayedRetention) {
      delayedChecked += 1;
      delayedRetained +=
        firstDelayedRetention.outcome === "correct" ? 1 : 0;
    }

    if (firstTransfer) {
      transferChecked += 1;
      transferred += firstTransfer.outcome === "correct" ? 1 : 0;
    }

    if (firstRetention || firstTransfer) {
      checkedAfterMastery += 1;

      if (
        firstRetention?.outcome === "incorrect" ||
        firstTransfer?.outcome === "incorrect"
      ) {
        falseMastery += 1;
      }
    }

    for (const item of after) {
      if (item.evaluatorType === "teacher") {
        teacherAfterMastery += 1;
        teacherAgreed += item.outcome === "correct" ? 1 : 0;
      }
    }
  }

  return {
    version: PILOT_MEASURES_VERSION,
    learners: learners.size,
    competenciesAttempted: attempted,
    competenciesMastered: mastered,
    falseMasteryRate: rate(falseMastery, checkedAfterMastery),
    retentionAfterMastery: rate(retained, retentionChecked),
    delayedRetentionAfterMastery: rate(delayedRetained, delayedChecked),
    transferAfterMastery: rate(transferred, transferChecked),
    teacherAgreementAfterMastery: rate(
      teacherAgreed,
      teacherAfterMastery,
    ),
    stuckRate: rate(stuck, attempted),
    contentExhaustedCount: exhausted,
    medianAnswersToMastery: median(answersToMastery),
    medianMinutesToMastery: median(minutesToMastery),
    meanLearningGain:
      gains.length > 0
        ? gains.reduce((sum, value) => sum + value, 0) / gains.length
        : null,
    learningGainSample: gains.length,
  };
}
