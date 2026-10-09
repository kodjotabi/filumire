import {
  ADAPTIVE_POLICY_VERSION,
  decideNextBestAction,
  type AdaptivePolicyContext,
} from "../services/adaptive-policy";

function assert(
  condition: boolean,
  message: string,
): void {
  if (!condition) {
    throw new Error(message);
  }
}

const base: AdaptivePolicyContext = {
  masteryEstimate: 0.9,
  confidence: 0.9,
  evidenceCount: 5,
  consecutiveFailures: 0,
  diagnosticState: "probable_mastery",
  diagnosticConfidence: 0.9,
  errorPatterns: [],
  interventionHistory: [],
  prerequisiteSatisfied: true,
  hasNextCompetency: true,
  retentionStatus: "retained",
  retentionConfidence: 0.9,
  transferStatus: "demonstrated",
  transferConfidence: 0.9,
  readyForAdvancement: true,
};

const misconception = decideNextBestAction({
  ...base,
  diagnosticState: "misconception",
});

assert(
  misconception.action === "remediate",
  "Misconception must trigger remediation.",
);

const insufficientEvidence = decideNextBestAction({
  ...base,
  diagnosticState: "insufficient_evidence",
  evidenceCount: 1,
});

assert(
  insufficientEvidence.action === "diagnose",
  "Insufficient evidence must trigger diagnosis.",
);

const retention = decideNextBestAction({
  ...base,
  retentionStatus: "not_tested",
  transferStatus: "not_tested",
});

assert(
  retention.action === "retention_check",
  "Retention must be checked before transfer.",
);

const transfer = decideNextBestAction({
  ...base,
  transferStatus: "not_tested",
});

assert(
  transfer.action === "transfer_check",
  "Transfer must be checked after retention.",
);

const advance = decideNextBestAction(base);

assert(
  advance.action === "advance",
  "Verified learner state must advance.",
);

assert(
  advance.policyVersion === ADAPTIVE_POLICY_VERSION,
  "Decision must carry Adaptive Policy V1 version.",
);

console.log({
  adaptivePolicyV1: "PASS",
  version: ADAPTIVE_POLICY_VERSION,
});
