import { deleteTestLearners } from "./postgres-test-cleanup";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import type { LearningEvidence } from "../packages/domain/index";
import { pool } from "../services/database";
import { PostgresPersistenceStore } from "../services/persistence-postgres";
import { createInitialLearnerState } from "../services/learner-state/index";

async function main() {
  assert.equal(process.env.FILUMIRE_PERSISTENCE, "postgres");

  const store = new PostgresPersistenceStore();
  const suffix = randomUUID();

  const learnerId = `learner-evidence-v1-atomic-${suffix}`;
  const competencyId = `competency-evidence-v1-atomic-${suffix}`;
  const evidenceId = `ev-evidence-v1-atomic-${suffix}`;

  const evidence: LearningEvidence = {
    id: evidenceId,
    learnerId,
    competencyId,
    source: "assessment",
    outcome: "incorrect",
    timestamp: new Date().toISOString(),
    assessmentItemId: `assessment-${suffix}`,
    sessionId: `session-${suffix}`,
    contentId: `content-${suffix}`,
    instructionalStrategy: "worked_example" as LearningEvidence["instructionalStrategy"],
    responseMode: "worked_solution" as LearningEvidence["responseMode"],
    policyVersion: "assessment-0.9",
    errorPattern: "prerequisite-number-fact-gap",
    diagnosticState: "prerequisite_gap",
    diagnosticConfidence: 0.87,
    interventionType: "scaffold",
    interventionId: `intervention-${suffix}`,
    purpose: "diagnostic",
    independence: "light_support",
    supportLevel: 0.25,
    difficulty: "challenging",
    representation: "visual",
    strength: "strong",
    errorClass: "prerequisite_gap",
    prerequisiteCompetencyId: `prerequisite-${suffix}`,
    misconceptionId: `misconception-${suffix}`,
    exposureCount: 3,
    evaluatorType: "system_rubric",
    evaluatorId: "evidence-v1-atomic-test",
    evaluationPolicyVersion: "evidence-v1-test-rubric-1",
    interpretationVersion: "evidence-v1",
  };

  await store.ensureLearnerExists(learnerId);

  let mutationCount = 0;

  try {
    const first = await store.saveEvidenceAndUpdateLearnerState(
      evidence,
      competencyId,
      (currentState, isNewEvidence) => {
        const state =
          currentState ??
          createInitialLearnerState(learnerId, competencyId);

        if (isNewEvidence) {
          mutationCount += 1;
        }

        return state;
      },
    );

    assert.equal(first.isNewEvidence, true);
    assert.equal(mutationCount, 1);

    const stored = await store.getEvidence(learnerId, competencyId);
    assert.equal(stored.length, 1);

    const persisted = stored[0];

    const fields: Array<keyof LearningEvidence> = [
      "id",
      "learnerId",
      "competencyId",
      "source",
      "outcome",
      "assessmentItemId",
      "sessionId",
      "contentId",
      "instructionalStrategy",
      "responseMode",
      "policyVersion",
      "errorPattern",
      "diagnosticState",
      "diagnosticConfidence",
      "interventionType",
      "interventionId",
      "purpose",
      "independence",
      "supportLevel",
      "difficulty",
      "representation",
      "strength",
      "errorClass",
      "prerequisiteCompetencyId",
      "misconceptionId",
      "exposureCount",
      "evaluatorType",
      "evaluatorId",
      "evaluationPolicyVersion",
      "interpretationVersion",
    ];

    for (const field of fields) {
      assert.deepEqual(
        persisted[field],
        evidence[field],
        `Changed field: ${String(field)}`,
      );
    }

    const second = await store.saveEvidenceAndUpdateLearnerState(
      evidence,
      competencyId,
      (currentState, isNewEvidence) => {
        const state =
          currentState ??
          createInitialLearnerState(learnerId, competencyId);

        if (isNewEvidence) {
          mutationCount += 1;
        }

        return state;
      },
    );

    assert.equal(second.isNewEvidence, false);
    assert.equal(mutationCount, 1);

    const afterRetry = await store.getEvidence(
      learnerId,
      competencyId,
    );

    assert.equal(afterRetry.length, 1);

    console.log({
      test: "Evidence V1 PostgreSQL atomic persistence round trip",
      verifiedFields: fields.length,
      firstInsertNew: first.isNewEvidence,
      duplicateProtected: second.isNewEvidence === false,
      learnerStateMutationCount: mutationCount,
      result: "PASS",
    });
  } finally {
    await pool.query(
      "DELETE FROM learning_evidence WHERE learner_id = $1",
      [learnerId],
    );

    await pool.query(
      "DELETE FROM learner_states WHERE learner_id = $1",
      [learnerId],
    );

    /* Clears every table that references the test learner(s) first (tests/postgres-test-cleanup.ts). */
    await deleteTestLearners(pool, [learnerId]);

    await pool.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

