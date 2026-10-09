import { deleteTestLearners } from "./postgres-test-cleanup";
import {
  evaluateAssessment,
} from "../services/assessment";
import {
  applyEvidence,
  createInitialLearnerState,
} from "../services/learner-state";
import { pool } from "../services/database";
import {
  PostgresPersistenceStore,
} from "../services/persistence-postgres";

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

async function runSemanticConcurrencyTest(): Promise<void> {
  assert(
    process.env.FILUMIRE_PERSISTENCE === "postgres",
    "This test must run with FILUMIRE_PERSISTENCE=postgres.",
  );

  const learnerId =
    `learner-pg-semantic-race-${crypto.randomUUID()}`;
  const sessionId =
    `session-pg-semantic-race-${crypto.randomUUID()}`;
  const initialState = createInitialLearnerState(
    learnerId,
    COMPETENCY_ID,
  );
  const store = new PostgresPersistenceStore();

  try {
    await store.ensureLearnerExists(learnerId);
    await store.saveLearnerState(initialState);

    const [correctAssessment, incorrectAssessment] =
      await Promise.all([
        evaluateAssessment(
          {
            learnerId,
            sessionId,
            competencyId: COMPETENCY_ID,
            assessmentItemId: "semantic-concurrency-correct",
            response: "correct",
          },
          "correct",
        ),
        evaluateAssessment(
          {
            learnerId,
            sessionId,
            competencyId: COMPETENCY_ID,
            assessmentItemId: "semantic-concurrency-incorrect",
            response: "incorrect",
          },
          "correct",
        ),
      ]);

    /*
     * 8 Oct 2026: modernised. applyEvidence now derives evidenceCount and
     * mastery from the evidence HISTORY it is given (history-less calls count
     * 1), so the old "apply without history" race could no longer detect a
     * lost update. This races the PRODUCTION path instead: two concurrent
     * saveEvidenceAndUpdateLearnerState calls (each passes the full stored
     * history to the mutator, as POST /api/learning does). No lost update
     * means: both evidence rows stored, and the final state counts both and
     * reflects mastery over both.
     */
    const applyWithHistory = (evidence: typeof correctAssessment.evidence) =>
      (
        current: Parameters<typeof applyEvidence>[0] | undefined,
        isNew: boolean,
        history: Parameters<typeof applyEvidence>[2],
      ) => {
        const base = current ?? initialState;
        return isNew ? applyEvidence(base, evidence, history) : base;
      };

    await Promise.all([
      new PostgresPersistenceStore().saveEvidenceAndUpdateLearnerState(
        correctAssessment.evidence,
        COMPETENCY_ID,
        applyWithHistory(correctAssessment.evidence),
      ),
      new PostgresPersistenceStore().saveEvidenceAndUpdateLearnerState(
        incorrectAssessment.evidence,
        COMPETENCY_ID,
        applyWithHistory(incorrectAssessment.evidence),
      ),
    ]);

    const bothEvidence = [
      correctAssessment.evidence,
      incorrectAssessment.evidence,
    ];
    const expectedState = applyEvidence(
      initialState,
      incorrectAssessment.evidence,
      bothEvidence,
    );

    const persistedState = await new PostgresPersistenceStore()
      .getLearnerState(learnerId, COMPETENCY_ID);
    const persistedCompetency =
      persistedState?.competencies.find(
        (competency) =>
          competency.competencyId ===
          COMPETENCY_ID,
      );
    const expectedCompetency =
      expectedState.competencies[0];
    const evidenceRows = await pool.query(
      "SELECT COUNT(*)::int AS count FROM learning_evidence WHERE learner_id = $1 AND competency_id = $2",
      [learnerId, COMPETENCY_ID],
    );
    const persistedEvidenceCount =
      evidenceRows.rows[0]?.count;

    console.log({
      test: "PostgreSQL learner-state semantic concurrency",
      persistedEvidenceRows: persistedEvidenceCount,
      expectedStateEvidenceCount:
        expectedCompetency.evidenceCount,
      persistedStateEvidenceCount:
        persistedCompetency?.evidenceCount,
      expectedMasteryEstimate:
        expectedCompetency.masteryEstimate,
      persistedMasteryEstimate:
        persistedCompetency?.masteryEstimate,
      result:
        persistedCompetency?.evidenceCount ===
          expectedCompetency.evidenceCount
          ? "NO_LOST_UPDATE_OBSERVED"
          : "LOST_UPDATE_DEMONSTRATED",
    });

    assert(
      persistedEvidenceCount ===
        expectedCompetency.evidenceCount,
      "Trusted evidence rows were not persisted as expected.",
    );
    assert(
      persistedCompetency?.evidenceCount ===
        expectedCompetency.evidenceCount,
      "A valid concurrent learner-state update was silently lost.",
    );

    assert(
      Math.abs((persistedCompetency?.masteryEstimate ?? -1) - expectedCompetency.masteryEstimate) < 1e-9,
      "The final state must reflect mastery over both concurrent answers.",
    );
  } finally {
    await pool.query(
      "DELETE FROM learning_evidence WHERE learner_id = $1 AND competency_id = $2",
      [learnerId, COMPETENCY_ID],
    );
    await pool.query(
      "DELETE FROM learner_states WHERE learner_id = $1 AND competency_id = $2",
      [learnerId, COMPETENCY_ID],
    );
    /* Clears every table that references the test learner(s) first (tests/postgres-test-cleanup.ts). */
    await deleteTestLearners(pool, [learnerId]);
    await pool.end();
  }
}

runSemanticConcurrencyTest().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});