import {
  evaluateRetention,
  evaluateTransfer,
  RETENTION_TRANSFER_ENGINE_VERSION,
} from "../services/retention-transfer/evaluator";

function assert(
  condition: boolean,
  message: string,
): void {
  if (!condition) {
    throw new Error(`FAIL: ${message}`);
  }
}

function evidence(
  id: string,
  outcome: "correct" | "incorrect" | "partial",
  interventionType:
    | "retention_check"
    | "transfer_check",
): any {
  return {
    id,
    learnerId: "learner-rt-v1",
    competencyId: "competency-rt-v1",
    source: "assessment",
    outcome,
    timestamp: new Date().toISOString(),
    assessmentItemId: id,
    sessionId: id,
    policyVersion: "test",
    interventionType,
    interventionId: `intervention-${id}`,
  };
}

/* One success is evidence, not confirmation. */
const oneRetention = evaluateRetention([
  evidence(
    "retention-1",
    "correct",
    "retention_check",
  ),
]);

assert(
  oneRetention.status === "pending",
  "one correct retention check must remain pending",
);

assert(
  oneRetention.confidence === 0.5,
  "one correct retention check must not have full confidence",
);

/* Repeated successful delayed retrieval confirms retention. */
const confirmedRetention = evaluateRetention([
  evidence(
    "retention-1",
    "correct",
    "retention_check",
  ),
  evidence(
    "retention-2",
    "correct",
    "retention_check",
  ),
]);

assert(
  confirmedRetention.status === "retained",
  "two successful retention checks must confirm retention",
);

assert(
  confirmedRetention.confidence === 1,
  "consistent retention evidence must produce full confidence",
);

/* A retention failure must remain visible. */
const failedRetention = evaluateRetention([
  evidence(
    "retention-fail",
    "incorrect",
    "retention_check",
  ),
]);

assert(
  failedRetention.status === "not_retained",
  "failed retention must mark knowledge as not retained",
);

/* One transfer success is not enough. */
const oneTransfer = evaluateTransfer([
  evidence(
    "transfer-1",
    "correct",
    "transfer_check",
  ),
]);

assert(
  oneTransfer.status === "pending",
  "one correct transfer check must remain pending",
);

/* Repeated successful transfer confirms transfer. */
const confirmedTransfer = evaluateTransfer([
  evidence(
    "transfer-1",
    "correct",
    "transfer_check",
  ),
  evidence(
    "transfer-2",
    "correct",
    "transfer_check",
  ),
]);

assert(
  confirmedTransfer.status === "demonstrated",
  "two successful transfer checks must demonstrate transfer",
);

assert(
  confirmedTransfer.confidence === 1,
  "consistent transfer evidence must produce full confidence",
);

/* Mixed evidence must not falsely confirm transfer. */
const mixedTransfer = evaluateTransfer([
  evidence(
    "transfer-1",
    "correct",
    "transfer_check",
  ),
  evidence(
    "transfer-2",
    "incorrect",
    "transfer_check",
  ),
]);

assert(
  mixedTransfer.status === "not_demonstrated",
  "mixed transfer evidence must not establish transfer",
);

assert(
  mixedTransfer.version ===
    RETENTION_TRANSFER_ENGINE_VERSION,
  "evaluation must expose the V1 engine version",
);

console.log({
  retentionTransferV1: "PASS",
  version: RETENTION_TRANSFER_ENGINE_VERSION,
});
