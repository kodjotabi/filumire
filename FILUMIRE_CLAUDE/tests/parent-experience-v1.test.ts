import { GHANA_MATH_PILOT_INITIAL_COMPETENCY_ID } from "../packages/curriculum";
﻿import assert from "node:assert/strict";

import {
  createInitialLearnerState,
  saveLearnerState,
} from "../services/learner-state";

import {
  updateActiveCompetency,
} from "../services/learner-context";

import {
  buildAdultLearnerSummary,
  PARENT_HOME_EXPERIENCE_VERSION,
} from "../services/adult-summary";

import {
  persistenceStore,
} from "../services/persistence-provider";

async function run(): Promise<void> {
  const stamp = crypto.randomUUID();

  const learnerId =
    `parent-experience-${stamp}`;

  const competencyId =
    GHANA_MATH_PILOT_INITIAL_COMPETENCY_ID;

  await persistenceStore.ensureLearnerExists(
    learnerId,
  );

  const state =
    createInitialLearnerState(
      learnerId,
      competencyId,
    );

  const competency =
    state.competencies[0];

  competency.diagnosticState =
    "prerequisite_gap";

  competency.diagnosticConfidence = 0.9;

  competency.retentionState = {
    status: "not_retained",
    confidence: 0.8,
    evidenceIds: [],
  };

  competency.transferState = {
    status: "not_demonstrated",
    confidence: 0.8,
    evidenceIds: [],
  };

  competency.readinessState = {
    readyForAdvancement: false,
    confidence: 0.9,
    reasonCode:
      "MASTERY_RETENTION_TRANSFER_NOT_CONFIRMED",
    evaluatedAt:
      new Date().toISOString(),
  };

  await saveLearnerState(state);

  await updateActiveCompetency(
    learnerId,
    competencyId,
  );

  const before =
    JSON.stringify(state);

  const summary =
    await buildAdultLearnerSummary(
      learnerId,
    );

  assert.equal(
    summary.parentExperienceVersion,
    PARENT_HOME_EXPERIENCE_VERSION,
  );

  assert.ok(
    summary.supportAreas &&
      summary.supportAreas.length > 0,
    "parent summary should expose understandable support areas",
  );

  assert.ok(
    summary.homeSupport &&
      summary.homeSupport.length > 0,
    "parent summary should provide home-support guidance",
  );

  assert.ok(
    summary.homeSupport.every(
      (item) =>
        item.boundary.length > 0,
    ),
    "every home-support item should preserve the parent authority boundary",
  );

  assert.ok(
    summary.alerts &&
      summary.alerts.length > 0,
    "meaningful alerts should be generated from learner state",
  );

  assert.ok(
    summary.alerts.length <= 3,
    "parent alerts must remain sparse",
  );

  assert.ok(
    summary.alerts.some(
      (alert) =>
        alert.type ===
        "retention_support",
    ),
    "retention failure should create a parent-facing alert",
  );

  assert.ok(
    summary.alerts.some(
      (alert) =>
        alert.type ===
        "transfer_support",
    ),
    "transfer failure should create a parent-facing alert",
  );

  const afterState =
    await import(
      "../services/learner-state"
    ).then(
      ({ getLearnerState }) =>
        getLearnerState(
          learnerId,
          competencyId,
        ),
    );

  assert.ok(
    afterState,
    "learner state should remain available",
  );

  assert.deepEqual(
    afterState,
    state,
    "building the parent experience must not mutate learner state",
  );

  console.log({
    parentExperienceV1: "PASS",
    homeSupportGenerated:
      summary.homeSupport.length,
    alertsGenerated:
      summary.alerts.length,
    retentionAlert: true,
    transferAlert: true,
    sparseAlerts:
      summary.alerts.length <= 3,
    learnerStateMutated: false,
  });
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});


