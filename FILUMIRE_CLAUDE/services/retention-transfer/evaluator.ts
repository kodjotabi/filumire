import type { LearningEvidence } from "../../packages/domain";

export const RETENTION_TRANSFER_ENGINE_VERSION =
  "retention-transfer-v1";

export type RetentionEvaluation = {
  status: "not_tested" | "pending" | "retained" | "not_retained";
  confidence: number;
  attempts: number;
  successfulAttempts: number;
  unsuccessfulAttempts: number;
  evidenceIds: string[];
  version: typeof RETENTION_TRANSFER_ENGINE_VERSION;
};

export type TransferEvaluation = {
  status:
    | "not_tested"
    | "pending"
    | "demonstrated"
    | "not_demonstrated";
  confidence: number;
  attempts: number;
  successfulAttempts: number;
  unsuccessfulAttempts: number;
  evidenceIds: string[];
  version: typeof RETENTION_TRANSFER_ENGINE_VERSION;
};

function relevantEvidence(
  history: LearningEvidence[],
  interventionType: "retention_check" | "transfer_check",
): LearningEvidence[] {
  return history.filter(
    (evidence) =>
      evidence.interventionType === interventionType,
  );
}

function evidenceScore(
  evidence: LearningEvidence,
): number {
  if (evidence.outcome === "correct") return 1;
  if (evidence.outcome === "partial") return 0.5;
  return 0;
}

function confidenceFromHistory(
  evidence: LearningEvidence[],
): number {
  if (evidence.length === 0) return 0;

  const score =
    evidence.reduce(
      (total, item) => total + evidenceScore(item),
      0,
    ) / evidence.length;

  const quantityFactor = Math.min(
    1,
    evidence.length / 2,
  );

  return Number(
    (score * quantityFactor).toFixed(4),
  );
}

export function evaluateRetention(
  history: LearningEvidence[],
): RetentionEvaluation {
  const evidence = relevantEvidence(
    history,
    "retention_check",
  );

  const successfulAttempts =
    evidence.filter(
      (item) => item.outcome === "correct",
    ).length;

  const unsuccessfulAttempts =
    evidence.length - successfulAttempts;

  const confidence =
    confidenceFromHistory(evidence);

  let status: RetentionEvaluation["status"] =
    "not_tested";

  if (evidence.length === 1) {
    status =
      evidence[0].outcome === "incorrect"
        ? "not_retained"
        : "pending";
  } else if (evidence.length >= 2) {
    status =
      confidence >= 0.8
        ? "retained"
        : "not_retained";
  }

  return {
    status,
    confidence,
    attempts: evidence.length,
    successfulAttempts,
    unsuccessfulAttempts,
    evidenceIds: evidence.map((item) => item.id),
    version: RETENTION_TRANSFER_ENGINE_VERSION,
  };
}

export function evaluateTransfer(
  history: LearningEvidence[],
): TransferEvaluation {
  const evidence = relevantEvidence(
    history,
    "transfer_check",
  );

  const successfulAttempts =
    evidence.filter(
      (item) => item.outcome === "correct",
    ).length;

  const unsuccessfulAttempts =
    evidence.length - successfulAttempts;

  const confidence =
    confidenceFromHistory(evidence);

  let status: TransferEvaluation["status"] =
    "not_tested";

  if (evidence.length === 1) {
    status =
      evidence[0].outcome === "incorrect"
        ? "not_demonstrated"
        : "pending";
  } else if (evidence.length >= 2) {
    status =
      confidence >= 0.8
        ? "demonstrated"
        : "not_demonstrated";
  }

  return {
    status,
    confidence,
    attempts: evidence.length,
    successfulAttempts,
    unsuccessfulAttempts,
    evidenceIds: evidence.map((item) => item.id),
    version: RETENTION_TRANSFER_ENGINE_VERSION,
  };
}
