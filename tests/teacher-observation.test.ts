import { deleteTestLearners } from "./postgres-test-cleanup";
import crypto from "node:crypto";

import { pool } from "../services/database";
import { getEvidence } from "../services/evidence-store";
import { getLearnerState } from "../services/learner-state";
import { persistenceStore } from "../services/persistence-provider";
import { recordTeacherObservation } from "../services/teacher-observation";

function assert(
  condition: boolean,
  message: string,
): asserts condition {
  if (!condition) {
    throw new Error(`FAIL: ${message}`);
  }
}

async function run(): Promise<void> {
  assert(
    process.env.FILUMIRE_PERSISTENCE === "postgres",
    "This test requires PostgreSQL persistence.",
  );

  const learnerId =
    `learner-teacher-observation-${crypto.randomUUID()}`;
  const competencyId =
    `competency-teacher-observation-${crypto.randomUUID()}`;
  const teacherId =
    `teacher-${crypto.randomUUID()}`;
  const clientRequestId =
    `request-${crypto.randomUUID()}`;

  try {
    await persistenceStore.ensureLearnerExists(learnerId);

    const before =
      await getLearnerState(learnerId, competencyId);

    const first =
      await recordTeacherObservation({
        learnerId,
        competencyId,
        teacherId,
        clientRequestId,
        outcome: "observed",
        independence: "guided",
        difficulty: "standard",
        representation: "verbal",
        strength: "moderate",
        errorClass: "misconception",
        errorPattern: "teacher-observed-pattern",
      });

    const second =
      await recordTeacherObservation({
        learnerId,
        competencyId,
        teacherId,
        clientRequestId,
        outcome: "observed",
        independence: "guided",
        difficulty: "standard",
        representation: "verbal",
        strength: "moderate",
        errorClass: "misconception",
        errorPattern: "teacher-observed-pattern",
      });

    const evidence =
      await getEvidence(learnerId, competencyId);

    const after =
      await getLearnerState(learnerId, competencyId);

    assert(first.duplicate === false, "first observation was not inserted");
    assert(second.duplicate === true, "duplicate observation was not protected");
    assert(evidence.length === 1, "observation evidence was not persisted exactly once");
    assert(evidence[0].source === "teacher", "observation source was not teacher");
    assert(evidence[0].purpose === "teacher_observation", "observation purpose was not preserved");
    assert(evidence[0].evaluatorType === "teacher", "teacher provenance was not preserved");
    assert(evidence[0].evaluatorId === teacherId, "teacher identity was not preserved");
    assert(evidence[0].errorClass === "misconception", "structured observation signal was not preserved");
    assert(before === undefined && after === undefined, "teacher observation directly mutated learner state");

    console.log({
      teacherObservationV1: "PASS",
      persisted: evidence.length,
      duplicateProtected: second.duplicate,
      learnerStateMutated: after !== undefined,
    });
  } finally {
    await pool.query(
      `DELETE FROM learning_evidence WHERE learner_id = $1`,
      [learnerId],
    );
    /* Clears every table that references the test learner(s) first (tests/postgres-test-cleanup.ts). */
    await deleteTestLearners(pool, [learnerId]);
    await pool.end();
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
