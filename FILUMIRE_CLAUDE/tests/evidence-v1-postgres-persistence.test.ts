import { deleteTestLearners } from "./postgres-test-cleanup";
import crypto from "node:crypto";

import type { LearningEvidence } from "../packages/domain";
import { pool } from "../services/database";
import { PostgresPersistenceStore } from "../services/persistence-postgres";

function assert(
  condition: boolean,
  message: string,
): asserts condition {
  if (!condition) {
    throw new Error(`FAIL: ${message}`);
  }
}

async function runEvidenceV1PostgresPersistenceTest(): Promise<void> {
  assert(
    process.env.FILUMIRE_PERSISTENCE === "postgres",
    "This test must run with FILUMIRE_PERSISTENCE=postgres.",
  );

  const store = new PostgresPersistenceStore();

  const learnerId =
    `learner-evidence-v1-${crypto.randomUUID()}`;

  const competencyId =
    `competency-evidence-v1-${crypto.randomUUID()}`;

  const evidenceId =
    `ev-evidence-v1-${crypto.randomUUID()}`;

  const evidence: LearningEvidence = {
    id: evidenceId,
    learnerId,
    competencyId,

    source: "assessment",
    outcome: "incorrect",
    timestamp: new Date().toISOString(),

    assessmentItemId: "assessment-evidence-v1-001",
    sessionId: `session-${crypto.randomUUID()}`,
    contentId: "content-evidence-v1-001",

    policyVersion: "assessment-0.9",

    errorPattern: "prerequisite-number-place-value",
    diagnosticState: "prerequisite_gap",
    diagnosticConfidence: 0.87,

    interventionType: "scaffold",
    interventionId: `intervention-${crypto.randomUUID()}`,

    instructionalStrategy: "worked_example",
    responseMode: "worked_solution",

    purpose: "diagnostic",
    independence: "light_support",
    supportLevel: 0.25,
    difficulty: "challenging",
    representation: "visual",
    strength: "strong",

    errorClass: "prerequisite_gap",
    prerequisiteCompetencyId:
      "competency-prerequisite-evidence-v1",

    misconceptionId:
      "misconception-place-value-evidence-v1",

    exposureCount: 3,

    evaluatorType: "system_rubric",
    evaluatorId: "filumire-evidence-v1-test-evaluator",
    evaluationPolicyVersion:
      "evidence-v1-test-evaluation-policy",

    interpretationVersion: "evidence-v1",
  };

  try {
    await store.ensureLearnerExists(learnerId);

    const inserted =
      await store.saveEvidence(evidence);

    assert(
      inserted === true,
      "first Evidence V1 persistence attempt must insert a new record.",
    );

    const persisted =
      await store.getEvidence(
        learnerId,
        competencyId,
      );

    assert(
      persisted.length === 1,
      `expected exactly one persisted evidence record, found ${persisted.length}.`,
    );

    const roundTrip = persisted[0];

    const fields: Array<keyof LearningEvidence> = [
      "id",
      "learnerId",
      "competencyId",
      "source",
      "outcome",
      "assessmentItemId",
      "sessionId",
      "contentId",
      "policyVersion",
      "errorPattern",
      "diagnosticState",
      "diagnosticConfidence",
      "interventionType",
      "interventionId",
      "instructionalStrategy",
      "responseMode",
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
      assert(
        roundTrip[field] === evidence[field],
        `${String(field)} did not survive PostgreSQL round trip. Expected ${JSON.stringify(
          evidence[field],
        )}, got ${JSON.stringify(roundTrip[field])}.`,
      );
    }

    const duplicateInserted =
      await store.saveEvidence(evidence);

    assert(
      duplicateInserted === false,
      "duplicate Evidence V1 id must remain idempotent.",
    );

    const afterDuplicate =
      await store.getEvidence(
        learnerId,
        competencyId,
      );

    assert(
      afterDuplicate.length === 1,
      "duplicate Evidence V1 persistence must not create a second row.",
    );

    console.log({
      test: "Evidence V1 PostgreSQL persistence round trip",
      evidenceId,
      verifiedFields: fields.length,
      duplicateProtected: true,
      result: "PASS",
    });
  } finally {
    await pool.query(
      "DELETE FROM learning_evidence WHERE learner_id = $1",
      [learnerId],
    );

    /* Clears every table that references the test learner(s) first (tests/postgres-test-cleanup.ts). */
    await deleteTestLearners(pool, [learnerId]);
  }
}

runEvidenceV1PostgresPersistenceTest()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

