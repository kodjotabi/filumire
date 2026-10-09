import {
  createInitialLearnerState,
  applyEvidence,
} from "../services/learner-state";

import {
  evaluateAssessment,
} from "../services/assessment";

import {
  createIntervention,
  getIntervention,
  evaluateInterventionFromEvidence,
} from "../services/intervention-store";

import {
  saveEvidence,
} from "../services/evidence-store";

function assert(
  condition: boolean,
  message: string,
): void {
  if (!condition) {
    throw new Error(
      `FAIL: ${message}`,
    );
  }
}

const learnerId =
  "learner-persistence-test";

const competencyId =
  "competency-persistence-001";

const sessionId =
  "session-persistence-001";

const intervention =
  await createIntervention({
    learnerId,
    competencyId,
    sessionId,
    decisionId:
      "decision-persistence-001",
    type: "teach",
  });

const retrieved =
  await getIntervention(
    intervention.interventionId,
  );

assert(
  Boolean(retrieved),
  "intervention must survive persistence round trip",
);

assert(
  retrieved?.interventionId ===
    intervention.interventionId,
  "persistent intervention identity must remain stable",
);

let learnerState =
  createInitialLearnerState(
    learnerId,
    competencyId,
  );

const submission = {
  learnerId,
  sessionId:
    `${sessionId}-response`,
  assessmentItemId:
    "item-persistence-001",
  competencyId,
  response:
    "correct-answer",
  interventionId:
    intervention.interventionId,
};

const assessment =
  await evaluateAssessment(
    submission,
    "correct-answer",
  );

assert(
  assessment.evidence.interventionId ===
    intervention.interventionId,
  "evidence must preserve intervention identity",
);

assert(
  assessment.evidence.interventionType ===
    "teach",
  "evidence must preserve intervention type",
);

await saveEvidence(
  assessment.evidence,
);

learnerState =
  applyEvidence(
    learnerState,
    assessment.evidence,
  );

const competency =
  learnerState.competencies[0];

assert(
  competency.interventionHistory.length ===
    1,
  "learner state must record the intervention",
);

assert(
  competency.interventionHistory[0]
    .interventionId ===
    intervention.interventionId,
  "learner state must link intervention identity",
);

assert(
  competency.interventionHistory[0]
    .evidenceIds.includes(
      assessment.evidence.id,
    ),
  "learner state must link intervention evidence",
);

const completed =
  await evaluateInterventionFromEvidence(
    intervention.interventionId,
    {
      id:
        assessment.evidence.id,
      outcome:
        assessment.evidence.outcome,
    },
  );

assert(
  completed.status ===
    "completed",
  "intervention must become completed",
);

assert(
  completed.outcome ===
    "effective",
  "correct evidence must produce effective outcome",
);

const persistedCompleted =
  await getIntervention(
    intervention.interventionId,
  );

assert(
  persistedCompleted?.status ===
    "completed",
  "completed intervention must persist",
);

assert(
  persistedCompleted?.outcome ===
    "effective",
  "completed intervention outcome must persist",
);

console.log({
  interventionPersistence:
    "PASS",

  interventionId:
    intervention.interventionId,

  learnerStateIntervention:
    competency
      .interventionHistory[0]
      .interventionId,

  outcome:
    persistedCompleted?.outcome,
});
