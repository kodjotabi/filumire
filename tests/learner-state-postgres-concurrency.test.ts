import { deleteTestLearners } from "./postgres-test-cleanup";
import {
  createInitialLearnerState,
} from "../services/learner-state";
import { pool } from "../services/database";
import {
  PostgresPersistenceStore,
} from "../services/persistence-postgres";

const CONCURRENT_WRITES = 24;
const COMPETENCY_ID =
  "competency-test-001";

function assert(
  condition: boolean,
  message: string,
): void {
  if (!condition) {
    throw new Error(`FAIL: ${message}`);
  }
}

function createState(
  learnerId: string,
  writeNumber: number,
) {
  const initial = createInitialLearnerState(
    learnerId,
    COMPETENCY_ID,
  );
  const competency = initial.competencies[0];

  return {
    ...initial,
    competencies: [
      {
        ...competency,
        confidence: writeNumber / CONCURRENT_WRITES,
        evidenceCount: writeNumber,
        lastUpdated: new Date().toISOString(),
        masteryEstimate: writeNumber / CONCURRENT_WRITES,
      },
    ],
    updatedAt: new Date().toISOString(),
  };
}

async function runConcurrencyTest(): Promise<void> {
  assert(
    process.env.FILUMIRE_PERSISTENCE === "postgres",
    "This test must run with FILUMIRE_PERSISTENCE=postgres.",
  );

  const learnerId =
    `learner-pg-state-race-${crypto.randomUUID()}`;

  try {
    await new PostgresPersistenceStore().ensureLearnerExists(
      learnerId,
    );

    const writes = Array.from(
      { length: CONCURRENT_WRITES },
      (_, index) =>
        new PostgresPersistenceStore().saveLearnerState(
          createState(learnerId, index + 1),
        ),
    );
    const results = await Promise.allSettled(writes);
    const failures = results.filter(
      (result) => result.status === "rejected",
    );
    const rows = await pool.query(
      "SELECT evidence_count, mastery_estimate, state FROM learner_states WHERE learner_id = $1 AND competency_id = $2",
      [learnerId, COMPETENCY_ID],
    );

    console.log({
      test: "PostgreSQL learner-state concurrent creation",
      attemptedWrites: CONCURRENT_WRITES,
      duplicateRows: rows.rowCount,
      writeFailures: failures.length,
      result:
        rows.rowCount === 1 &&
        failures.length === 0
          ? "NO_RACE_OBSERVED"
          : "RACE_DEMONSTRATED",
    });

    assert(
      rows.rowCount === 1,
      `Expected one learner-state row, found ${rows.rowCount}.`,
    );
    assert(
      failures.length === 0,
      `${failures.length} concurrent learner-state writes failed.`,
    );

    const persistedRow = rows.rows[0];
    const persistedCompetency = (
      persistedRow.state as {
        competencies?: Array<{
          competencyId?: string;
          evidenceCount?: number;
          masteryEstimate?: number;
        }>;
      }
    ).competencies?.find(
      (competency) =>
        competency.competencyId ===
        COMPETENCY_ID,
    );

    if (
      !persistedCompetency ||
      persistedCompetency.evidenceCount !==
        persistedRow.evidence_count ||
      typeof persistedCompetency.masteryEstimate !==
        "number" ||
      Math.abs(
        persistedCompetency.masteryEstimate -
          persistedRow.mastery_estimate,
      ) >= 0.000001
    ) {
      throw new Error(
        "FAIL: Stored learner state and denormalized columns are inconsistent.",
      );
    }
  } finally {
    await pool.query(
      "DELETE FROM learner_states WHERE learner_id = $1 AND competency_id = $2",
      [learnerId, COMPETENCY_ID],
    );
    /* Clears every table that references the test learner(s) first (tests/postgres-test-cleanup.ts). */
    await deleteTestLearners(pool, [learnerId]);
    await pool.end();
  }
}

runConcurrencyTest().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});