import {
  createInitialLearnerState,
  applyEvidence,
  saveLearnerState,
} from "../services/learner-state";

import {
  evaluateAssessment,
} from "../services/assessment";

import {
  makeAdaptiveDecision,
} from "../services/adaptive-engine";

import {
  saveEvidence,
} from "../services/evidence-store";

import {
  seedContent,
} from "../services/content-store/seed";

function assert(
  condition: boolean,
  message: string,
): void {
  if (!condition) {
    throw new Error(`FAIL: ${message}`);
  }
}

const learnerId =
  "learner-adaptive-integration";

const competencyId =
  "competency-test-001";

const sessionId =
  "session-adaptive-integration";

seedContent();

let state =
  createInitialLearnerState(
    learnerId,
    competencyId,
  );

await saveLearnerState(state);

/*
 * 1. Diagnostic evidence.
 */

const diagnostic =
  await evaluateAssessment(
    {
      learnerId,
      sessionId,
      assessmentItemId:
        "item-number-sequence-diagnostic-001",
      competencyId,
      response: "7",
    },
    "8",
    undefined,
    {
      diagnosticRules:
        JSON.stringify({
          "7": {
            errorPattern:
              "sequence_rule_not_identified",
            diagnosticState:
              "conceptual_misunderstanding",
            diagnosticConfidence:
              0.9,
          },
        }),
    },
  );

await saveEvidence(
  diagnostic.evidence,
);

state =
  applyEvidence(
    state,
    diagnostic.evidence,
  );

await saveLearnerState(state);

/*
 * 2. Adaptive decision.
 */

const teachingDecision =
  await makeAdaptiveDecision({
    learnerId,
    sessionId,
    learnerState: state,
  });

console.log({
  stage:
    "diagnostic decision",
  action:
    teachingDecision.decision.action,
  reasonCode:
    teachingDecision.decision.reasonCode,
  interventionId:
    teachingDecision.decision
      .interventionId,
  contentType:
    teachingDecision.content?.type,
  contentTitle:
    teachingDecision.content?.title,
});

assert(
  teachingDecision.decision.action ===
    "teach",
  "conceptual misunderstanding must produce teach action",
);

assert(
  Boolean(
    teachingDecision.decision
      .interventionId,
  ),
  "teach decision must create intervention",
);

assert(
  teachingDecision.content?.type ===
    "lesson",
  "teach action must select lesson content",
);

/*
 * 3. Recovery assessment.
 *
 * The intervention relationship is deliberately
 * supplied through the interventionId and metadata.
 */

const interventionId =
  teachingDecision.decision
    .interventionId!;

const interventionType =
  teachingDecision.decision.action;

const recovery =
  await evaluateAssessment(
    {
      learnerId,
      sessionId:
        `${sessionId}-recovery`,
      assessmentItemId:
        "item-number-sequence-practice-001",
      competencyId,
      response: "20",
      interventionId,
    },
    "20",
    undefined,
    {
      interventionType,
    },
  );

console.log(
  "RECOVERY EVIDENCE:",
  recovery.evidence,
);

assert(
  recovery.evidence.interventionId ===
    interventionId,
  "recovery evidence must contain interventionId",
);

assert(
  recovery.evidence.interventionType ===
    interventionType,
  "recovery evidence must contain interventionType",
);

await saveEvidence(
  recovery.evidence,
);

/*
 * 4. Apply recovery evidence to the
 * in-memory learner model.
 */

state =
  applyEvidence(
    state,
    recovery.evidence,
  );

console.log(
  "STATE AFTER APPLY:",
  JSON.stringify(
    state.competencies[0]
      .interventionHistory,
    null,
    2,
  ),
);

const interventionRecord =
  state.competencies[0]
    .interventionHistory
    .find(
      (item) =>
        item.interventionId ===
        interventionId,
    );

assert(
  Boolean(interventionRecord),
  "recovery evidence must belong to the teaching intervention",
);

assert(
  interventionRecord?.evidenceIds.includes(
    recovery.evidence.id,
  ) ?? false,
  "teaching intervention must contain recovery evidence",
);

await saveLearnerState(state);

/*
 * 5. Verify persistence.
 */

const persisted =
  await import(
    "../services/learner-state"
  ).then(
    async ({
      getLearnerState,
    }) =>
      getLearnerState(
        learnerId,
        competencyId,
      ),
  );

const persistedRecord =
  persisted?.competencies[0]
    .interventionHistory
    .find(
      (item) =>
        item.interventionId ===
        interventionId,
    );

console.log(
  "PERSISTED INTERVENTION RECORD:",
  persistedRecord,
);

assert(
  Boolean(persistedRecord),
  "intervention record must persist in learner state",
);

assert(
  persistedRecord?.evidenceIds.includes(
    recovery.evidence.id,
  ) ?? false,
  "recovery evidence must persist in intervention history",
);

console.log({
  adaptiveContentInterventionIntegration:
    "PASS",
});