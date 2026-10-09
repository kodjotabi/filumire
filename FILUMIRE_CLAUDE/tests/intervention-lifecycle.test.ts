import {
  createIntervention,
  getIntervention,
  attachEvidenceToIntervention,
  evaluateInterventionFromEvidence,
} from "../services/intervention-store";

function assert(
  condition: boolean,
  message: string,
): void {
  if (!condition) {
    throw new Error(`FAIL: ${message}`);
  }
}

async function main(): Promise<void> {
  const intervention =
    await createIntervention({
      learnerId:
        "learner-intervention-test",
      competencyId:
        "competency-intervention-001",
      sessionId:
        "session-intervention-001",
      decisionId:
        "decision-intervention-001",
      type: "teach",
    });

  console.log({
    test: "intervention created",
    interventionId:
      intervention.interventionId,
    status:
      intervention.status,
    outcome:
      intervention.outcome,
  });

  assert(
    intervention.status ===
      "active",
    "new intervention must be active",
  );

  assert(
    intervention.outcome ===
      "not_yet_evaluated",
    "new intervention must not claim effectiveness",
  );

  await attachEvidenceToIntervention(
    intervention.interventionId,
    "evidence-intervention-001",
  );

  const completed =
    await evaluateInterventionFromEvidence(
      intervention.interventionId,
      {
        id:
          "evidence-intervention-002",
        outcome:
          "correct",
      },
    );

  console.log({
    test:
      "intervention evaluated",
    status:
      completed.status,
    outcome:
      completed.outcome,
    evidenceIds:
      completed.evidenceIds,
  });

  assert(
    completed.status ===
      "completed",
    "evaluated intervention must be completed",
  );

  assert(
    completed.outcome ===
      "effective",
    "correct evidence must produce effective intervention outcome",
  );

  assert(
    completed.evidenceIds.length ===
      2,
    "all linked evidence must remain attached",
  );

  const persisted =
    await getIntervention(
      intervention.interventionId,
    );

  assert(
    Boolean(persisted),
    "intervention must remain retrievable",
  );

  assert(
    persisted?.outcome ===
      "effective",
    "retrieved intervention must preserve outcome",
  );

  assert(
    persisted?.evidenceIds.includes(
      "evidence-intervention-001",
    ) ?? false,
    "persisted intervention must retain first evidence",
  );

  assert(
    persisted?.evidenceIds.includes(
      "evidence-intervention-002",
    ) ?? false,
    "persisted intervention must retain evaluation evidence",
  );

  console.log({
    interventionLifecycleTest:
      "PASS",
  });
}

main().catch(
  (error) => {
    console.error(error);
    process.exit(1);
  },
);