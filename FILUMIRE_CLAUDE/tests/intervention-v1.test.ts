import {
  evaluateInterventionEvidence,
  inferInterventionOutcome,
  INTERVENTION_ENGINE_VERSION,
} from "../services/intervention";

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`FAIL: ${message}`);
  }
}

assert(
  INTERVENTION_ENGINE_VERSION === "intervention-v1",
  "engine must identify itself as intervention-v1",
);

assert(
  inferInterventionOutcome("teach", "correct") === "effective",
  "correct intervention evidence must be effective",
);

assert(
  inferInterventionOutcome("teach", "partial") === "partial_recovery",
  "partial evidence must produce partial recovery",
);

assert(
  inferInterventionOutcome("teach", "incorrect") === "ineffective",
  "incorrect evidence must produce ineffective outcome",
);

assert(
  inferInterventionOutcome("retention_check", "correct") ===
    "effective_with_retention",
  "successful retention check must preserve retention meaning",
);

assert(
  inferInterventionOutcome("transfer_check", "correct") ===
    "effective_with_transfer",
  "successful transfer check must preserve transfer meaning",
);

for (const outcome of ["skipped", "observed"] as const) {
  const evaluation = evaluateInterventionEvidence(
    {
      type: "teach",
      outcome: "not_yet_evaluated",
    },
    { outcome },
  );

  assert(
    evaluation.outcome === "not_yet_evaluated",
    `${outcome} evidence must not claim intervention effectiveness`,
  );

  assert(
    evaluation.shouldExit === false,
    `${outcome} evidence must not exit the intervention`,
  );

  assert(
    evaluation.shouldEscalate === false,
    `${outcome} evidence must not escalate the intervention`,
  );
}

const failure = evaluateInterventionEvidence(
  {
    type: "teach",
    outcome: "not_yet_evaluated",
  },
  { outcome: "incorrect" },
);

assert(
  failure.shouldEscalate === true,
  "ineffective intervention must signal escalation",
);

const partial = evaluateInterventionEvidence(
  {
    type: "teach",
    outcome: "not_yet_evaluated",
  },
  { outcome: "partial" },
);

assert(
  partial.shouldExit === false &&
    partial.shouldEscalate === false,
  "partial recovery must remain bounded without claiming success or immediate escalation",
);

console.log({
  interventionV1: "PASS",
  version: INTERVENTION_ENGINE_VERSION,
});
