import { deleteTestLearners } from "./postgres-test-cleanup";
import crypto from "node:crypto";

import { pool } from "../services/database";
import { getEvidence } from "../services/evidence-store";
import { getLearnerState } from "../services/learner-state";
import { persistenceStore } from "../services/persistence-provider";
import {
  PILOT_MEASUREMENT_VERSION,
  getPilotMeasurementEvents,
  recordPilotMeasurementEvent,
} from "../services/pilot-measurement";

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
    `learner-pilot-measurement-${crypto.randomUUID()}`;
  const competencyId =
    `competency-pilot-measurement-${crypto.randomUUID()}`;
  const clientRequestId =
    `request-${crypto.randomUUID()}`;

  try {
    await persistenceStore.ensureLearnerExists(
      learnerId,
    );

    const stateBefore =
      await getLearnerState(
        learnerId,
        competencyId,
      );

    const evidenceBefore =
      await getEvidence(
        learnerId,
        competencyId,
      );

    const first =
      await recordPilotMeasurementEvent({
        learnerId,
        competencyId,
        sessionId: "pilot-session-1",
        subjectId: "mathematics",
        eventType: "adaptive_decision",
        clientRequestId,
        metadata: {
          decision: "practice",
          confidence: 0.72,
          pilot: true,
        },
      });

    const second =
      await recordPilotMeasurementEvent({
        learnerId,
        competencyId,
        sessionId: "pilot-session-1",
        subjectId: "mathematics",
        eventType: "adaptive_decision",
        clientRequestId,
        metadata: {
          decision: "practice",
          confidence: 0.72,
          pilot: true,
        },
      });

    const events =
      await getPilotMeasurementEvents(
        learnerId,
      );

    const stateAfter =
      await getLearnerState(
        learnerId,
        competencyId,
      );

    const evidenceAfter =
      await getEvidence(
        learnerId,
        competencyId,
      );

    assert(
      first.duplicate === false,
      "first pilot event was not inserted",
    );

    assert(
      second.duplicate === true,
      "duplicate pilot event was not protected",
    );

    assert(
      events.length === 1,
      "pilot event was not persisted exactly once",
    );

    assert(
      events[0].eventType === "adaptive_decision",
      "pilot event type was not preserved",
    );

    assert(
      events[0].measurementVersion ===
        PILOT_MEASUREMENT_VERSION,
      "measurement version was not preserved",
    );

    assert(
      events[0].metadata.decision === "practice",
      "pilot metadata was not preserved",
    );

    assert(
      stateBefore === undefined &&
        stateAfter === undefined,
      "pilot measurement directly mutated learner state",
    );

    assert(
      evidenceBefore.length === 0 &&
        evidenceAfter.length === 0,
      "pilot measurement created learning evidence",
    );

    console.log({
      pilotMeasurementV1: "PASS",
      persisted: events.length,
      duplicateProtected: second.duplicate,
      learnerStateMutated:
        stateAfter !== undefined,
      learningEvidenceCreated:
        evidenceAfter.length > 0,
      researchBoundaryProtected: true,
    });
  } finally {
    await pool.query(
      `DELETE FROM pilot_measurement_events WHERE learner_id = $1`,
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
