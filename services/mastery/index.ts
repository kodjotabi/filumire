import type {
  LearningEvidence,
} from "../../packages/domain";

/*
 * mastery-v2 (Tranche 4B): same thresholds as v1. Adds the recorded
 * Option B decision (after instruction proves effective, earlier
 * errors stop counting toward CURRENT mastery; they stay in the
 * history), lower weight for repeated items, "observed" outcomes
 * excluded, and confidence held below the threshold until enough
 * distinct items were answered correctly without help.
 */
export const MASTERY_ENGINE_VERSION = "mastery-v2";

export const MASTERY_V1_POLICY = {
  minimumVerificationObservations: 3,
  minimumIndependentCorrectObservations: 3,
  masteryThreshold: 0.8,
  confidenceThreshold: 0.8,
  preferredEvidenceQuantity: 5,
  minimumVerificationRepresentations: 2,
  /* Correct answers given before effective instruction. */
  preInstructionCorrectWeight: 0.5,
  /* An answer to an item the learner has already answered. */
  repeatedItemWeight: 0.5,
} as const;

/*
 * Instruction whose success re-bases the current estimate
 * (decision: Tabi, 7 October 2026, option B).
 */
const INSTRUCTIONAL_INTERVENTION_TYPES: string[] = [
  "teach",
  "scaffold",
  "remediate",
];

/* Assisted evidence never counts as unaided success. */
const ASSISTED_INDEPENDENCE: string[] = [
  "light_support",
  "guided",
  "fully_supported",
];

export type MasteryReasonCode =
  | "NO_MASTERY_EVIDENCE"
  | "INSUFFICIENT_MASTERY_EVIDENCE"
  | "DEVELOPING_MASTERY"
  | "LIMITED_DISTINCT_EVIDENCE"
  | "STRONG_MASTERY_EVIDENCE";

export interface MasteryDimensions {
  correctness: number;
  independence: number;
  evidenceStrength: number;
  difficultyCoverage: number;
  variation: number;
  recency: number;
}

export interface MasteryResult {
  masteryEstimate: number;
  confidence: number;
  evidenceCount: number;
  masteryEvidenceCount: number;
  reasonCode: MasteryReasonCode;
  dimensions: MasteryDimensions;
  evidenceIds: string[];
  /* Pre-instruction errors kept in history but not in the estimate. */
  excludedEvidenceIds: string[];
  instructionAnchorEvidenceId?: string;
  repeatedEvidenceCount: number;
  distinctIndependentCorrectItems: number;
  version: typeof MASTERY_ENGINE_VERSION;
}

const clamp = (value: number): number =>
  Math.max(0, Math.min(1, value));

function average(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }

  return (
    values.reduce(
      (sum, value) => sum + value,
      0,
    ) / values.length
  );
}

function outcomeValue(
  evidence: LearningEvidence,
): number {
  switch (evidence.outcome) {
    case "correct":
      return 1;
    case "partial":
      return 0.5;
    case "incorrect":
      return 0;
    default:
      return 0;
  }
}

function independenceValue(
  evidence: LearningEvidence,
): number {
  switch (evidence.independence) {
    case "independent":
      return 1;
    case "light_support":
      return 0.8;
    case "guided":
      return 0.55;
    case "fully_supported":
      return 0.3;
    default:
      return 0.6;
  }
}

function strengthValue(
  evidence: LearningEvidence,
): number {
  switch (evidence.strength) {
    case "strong":
      return 1;
    case "moderate":
      return 0.75;
    case "weak":
      return 0.45;
    default:
      return 0.55;
  }
}

function difficultyValue(
  evidence: LearningEvidence,
): number {
  switch (evidence.difficulty) {
    case "extension":
      return 1;
    case "challenging":
      return 1;
    case "standard":
      return 0.85;
    case "foundational":
      return 0.65;
    default:
      return 0.7;
  }
}

function isMasteryEvidence(
  evidence: LearningEvidence,
): boolean {
  /*
   * "observed" records that a teacher saw the work, not whether it
   * was right; it is history, not a failed mastery observation.
   */
  if (evidence.outcome === "observed") {
    return false;
  }

  if (
    evidence.purpose === "retention" ||
    evidence.purpose === "transfer"
  ) {
    return false;
  }

  if (
    evidence.interventionType === "retention_check" ||
    evidence.interventionType === "transfer_check"
  ) {
    return false;
  }

  return true;
}

function recencyWeight(
  index: number,
  total: number,
): number {
  if (total <= 1) {
    return 1;
  }

  /*
   * Older evidence remains meaningful, but newer evidence
   * carries moderately greater weight.
   */
  return 0.8 + 0.2 * (index / (total - 1));
}

function weightedAverage(
  values: number[],
  weights: number[],
): number {
  if (values.length === 0) {
    return 0;
  }

  const totalWeight =
    weights.reduce(
      (sum, weight) => sum + weight,
      0,
    );

  if (totalWeight === 0) {
    return 0;
  }

  return (
    values.reduce(
      (sum, value, index) =>
        sum + value * weights[index],
      0,
    ) / totalWeight
  );
}

function variationScore(
  evidence: LearningEvidence[],
): number {
  const representations = new Set<string>(
    evidence
      .map((item) => item.representation)
      .filter(
        (value): value is NonNullable<typeof value> =>
          value !== undefined &&
          value !== "unknown",
      ),
  );

  /*
   * Real-life contexts also count as variation: the same
   * competency shown in different settings is stronger
   * evidence than repeated familiarity with one setting.
   */
  for (const item of evidence) {
    for (const tag of item.contextTags ?? []) {
      representations.add(`context:${tag}`);
    }
  }

  if (representations.size >= 3) {
    return 1;
  }

  if (representations.size === 2) {
    return 0.7;
  }

  if (representations.size === 1) {
    return 0.4;
  }

  return 0.2;
}

function difficultyCoverageScore(
  evidence: LearningEvidence[],
): number {
  if (evidence.length === 0) {
    return 0;
  }

  return average(
    evidence.map(difficultyValue),
  );
}

function isUnassistedCorrect(
  evidence: LearningEvidence,
): boolean {
  return (
    evidence.outcome === "correct" &&
    !ASSISTED_INDEPENDENCE.includes(
      evidence.independence ?? "",
    )
  );
}

export function evaluateMastery(
  evidenceHistory: LearningEvidence[],
): MasteryResult {
  const sortedHistory =
    [...evidenceHistory].sort(
      (a, b) =>
        new Date(a.timestamp).getTime() -
        new Date(b.timestamp).getTime(),
    );

  /*
   * An answer to an item already answered earlier (any purpose) is
   * repeated exposure: familiarity, not fresh evidence.
   */
  const repeatedIds = new Set<string>();
  const seenItems = new Set<string>();

  for (const item of sortedHistory) {
    if (!item.assessmentItemId) {
      continue;
    }

    if (
      seenItems.has(item.assessmentItemId) ||
      (item.exposureCount ?? 1) > 1
    ) {
      repeatedIds.add(item.id);
    }

    seenItems.add(item.assessmentItemId);
  }

  const allMasteryEvidence =
    sortedHistory.filter(isMasteryEvidence);

  /*
   * Option B: the latest correct answer under teaching, scaffolding
   * or remediation shows the instruction worked. From there the
   * estimate is based mainly on evidence since; earlier errors stop
   * counting and earlier correct answers count for less.
   */
  let anchorIndex = -1;

  allMasteryEvidence.forEach((item, index) => {
    if (
      item.outcome === "correct" &&
      INSTRUCTIONAL_INTERVENTION_TYPES.includes(
        item.interventionType ?? "",
      )
    ) {
      anchorIndex = index;
    }
  });

  const masteryEvidence: LearningEvidence[] = [];
  const excludedEvidenceIds: string[] = [];
  const evidenceWeights: number[] = [];

  allMasteryEvidence.forEach((item, index) => {
    const beforeInstruction =
      anchorIndex >= 0 &&
      index < anchorIndex;

    if (
      beforeInstruction &&
      item.outcome !== "correct"
    ) {
      excludedEvidenceIds.push(item.id);
      return;
    }

    masteryEvidence.push(item);
    evidenceWeights.push(
      (beforeInstruction
        ? MASTERY_V1_POLICY.preInstructionCorrectWeight
        : 1) *
        (repeatedIds.has(item.id)
          ? MASTERY_V1_POLICY.repeatedItemWeight
          : 1),
    );
  });

  const instructionAnchorEvidenceId =
    anchorIndex >= 0
      ? allMasteryEvidence[anchorIndex].id
      : undefined;

  if (masteryEvidence.length === 0) {
    return {
      masteryEstimate: 0,
      confidence: 0,
      evidenceCount: evidenceHistory.length,
      masteryEvidenceCount: 0,
      reasonCode: "NO_MASTERY_EVIDENCE",
      dimensions: {
        correctness: 0,
        independence: 0,
        evidenceStrength: 0,
        difficultyCoverage: 0,
        variation: 0,
        recency: 0,
      },
      evidenceIds: [],
      excludedEvidenceIds,
      instructionAnchorEvidenceId,
      repeatedEvidenceCount: 0,
      distinctIndependentCorrectItems: 0,
      version: MASTERY_ENGINE_VERSION,
    };
  }

  const recencyWeights =
    masteryEvidence.map(
      (_, index) =>
        recencyWeight(
          index,
          masteryEvidence.length,
        ) * evidenceWeights[index],
    );

  const correctness =
    weightedAverage(
      masteryEvidence.map(outcomeValue),
      recencyWeights,
    );

  const independence =
    weightedAverage(
      masteryEvidence.map(independenceValue),
      recencyWeights,
    );

  /*
   * Correctness is the primary competence signal.
   * Independence controls whether successful performance can
   * legitimately count as mastery.
   */
  const masteryEstimate = clamp(
    correctness *
      (0.65 + 0.35 * independence),
  );

  const evidenceStrength =
    average(
      masteryEvidence.map(strengthValue),
    );

  const difficultyCoverage =
    difficultyCoverageScore(
      masteryEvidence,
    );

  /* Variation comes from distinct items only. */
  const variation =
    variationScore(
      masteryEvidence.filter(
        (item) => !repeatedIds.has(item.id),
      ),
    );

  const recency =
    average(
      masteryEvidence.map((_, index) =>
        recencyWeight(
          index,
          masteryEvidence.length,
        ),
      ),
    );

  /*
   * Confidence measures how well the mastery estimate is
   * supported. Quantity alone cannot create confidence, and a
   * repeated item adds only part of an observation.
   */
  const repeatedEvidenceCount =
    masteryEvidence.filter((item) =>
      repeatedIds.has(item.id),
    ).length;

  const effectiveQuantity =
    masteryEvidence.length -
    repeatedEvidenceCount *
      (1 - MASTERY_V1_POLICY.repeatedItemWeight);

  const quantityCoverage =
    Math.min(
      effectiveQuantity /
        MASTERY_V1_POLICY.preferredEvidenceQuantity,
      1,
    );

  const independentCorrectCount =
    masteryEvidence.filter(
      (item) =>
        item.outcome === "correct" &&
        item.independence === "independent" &&
        !repeatedIds.has(item.id),
    ).length;

  /* A spaced repeat verifies at the repeated-item weight. */
  const repeatedIndependentCorrectCount =
    masteryEvidence.filter(
      (item) =>
        item.outcome === "correct" &&
        item.independence === "independent" &&
        repeatedIds.has(item.id),
    ).length;

  const independentVerification =
    Math.min(
      (independentCorrectCount +
        repeatedIndependentCorrectCount *
          MASTERY_V1_POLICY.repeatedItemWeight) /
        3,
      1,
    );

  let confidence = clamp(
    quantityCoverage * 0.25 +
      independentVerification * 0.3 +
      evidenceStrength * 0.15 +
      difficultyCoverage * 0.1 +
      variation * 0.15 +
      recency * 0.05,
  );

  /*
   * Mastery needs at least three DIFFERENT items answered correctly
   * without help. Until then confidence stays below the threshold:
   * a small item pool or a repeated item cannot manufacture it.
   */
  const distinctIndependentCorrectItems =
    new Set(
      masteryEvidence
        .filter(isUnassistedCorrect)
        .map(
          (item) =>
            item.assessmentItemId ?? item.id,
        ),
    ).size;

  const limitedDistinctEvidence =
    distinctIndependentCorrectItems <
    MASTERY_V1_POLICY.minimumIndependentCorrectObservations;

  if (limitedDistinctEvidence) {
    confidence = Math.min(
      confidence,
      MASTERY_V1_POLICY.confidenceThreshold - 0.01,
    );
  }

  let reasonCode: MasteryReasonCode =
    "DEVELOPING_MASTERY";

  if (masteryEvidence.length < 3) {
    reasonCode =
      "INSUFFICIENT_MASTERY_EVIDENCE";
  } else if (
    limitedDistinctEvidence &&
    masteryEstimate >=
      MASTERY_V1_POLICY.masteryThreshold
  ) {
    reasonCode =
      "LIMITED_DISTINCT_EVIDENCE";
  } else if (
    masteryEstimate >= 0.8 &&
    confidence >= 0.8 &&
    independentCorrectCount >= 3
  ) {
    reasonCode =
      "STRONG_MASTERY_EVIDENCE";
  }

  return {
    masteryEstimate,
    confidence,
    evidenceCount: evidenceHistory.length,
    masteryEvidenceCount:
      masteryEvidence.length,
    reasonCode,
    dimensions: {
      correctness,
      independence,
      evidenceStrength,
      difficultyCoverage,
      variation,
      recency,
    },
    evidenceIds:
      masteryEvidence.map(
        (item) => item.id,
      ),
    excludedEvidenceIds,
    instructionAnchorEvidenceId,
    repeatedEvidenceCount,
    distinctIndependentCorrectItems,
    version: MASTERY_ENGINE_VERSION,
  };
}
