import { pool } from "../services/database";
import { PostgresPersistenceStore } from "../services/persistence-postgres";
import { createInitialLearnerState } from "../services/learner-state";
import { deleteTestLearners } from "./postgres-test-cleanup";
import type { LearningEvidence } from "../packages/domain";

/*
 * Postgres-only regression (8 October 2026). Found by running the 36-journey
 * route sweep on Postgres: learners who answered correctly could never reach
 * mastery and ran out of questions.
 *  1. learning_evidence had no columns for contextTags / attemptCount, so they
 *     were silently dropped (contextTags feeds mastery variation).
 *  2. saveEvidenceAndUpdateLearnerState (every answer POST) read the history
 *     with raw SELECT * (snake_case) and mapped it as camelCase, so every
 *     multi-word field (assessmentItemId, interventionType, exposureCount, ...)
 *     reached the engine as undefined.
 * Every field written must come back identical, through both read paths.
 *
 * Run: FILUMIRE_PERSISTENCE=postgres npx tsx --env-file=.env.postgres-test.local tests/evidence-postgres-roundtrip.test.ts
 */

function assert(condition: unknown, message: string): void {
  if (!condition) throw new Error(`FAIL: ${message}`);
}

const COMPETENCY_ID = "competency-test-001";

function differences(written: LearningEvidence, read: LearningEvidence | undefined): string[] {
  const a = written as unknown as Record<string, unknown>;
  const b = (read ?? {}) as Record<string, unknown>;
  return Object.keys(a).filter((key) => JSON.stringify(a[key]) !== JSON.stringify(b[key])).map((key) => `${key}: ${JSON.stringify(a[key])} -> ${JSON.stringify(b[key])}`);
}

async function run(): Promise<void> {
  assert(process.env.FILUMIRE_PERSISTENCE === "postgres", "This test must run with FILUMIRE_PERSISTENCE=postgres.");
  const database = (await pool.query("SELECT current_database() AS db")).rows[0].db;
  assert(/test/i.test(database), `refusing to run in database "${database}"`);

  const store = new PostgresPersistenceStore();
  const learnerId = `learner-pg-roundtrip-${crypto.randomUUID()}`;
  const full = (id: string, extra: Partial<LearningEvidence> = {}): LearningEvidence => ({
    id, learnerId, competencyId: COMPETENCY_ID, source: "assessment", outcome: "incorrect",
    timestamp: new Date(Date.now() - 60_000).toISOString(), policyVersion: "test", sessionId: "s-roundtrip", contentId: "content-x",
    assessmentItemId: "item-roundtrip", purpose: "mastery", independence: "independent", supportLevel: 0, difficulty: "standard",
    representation: "verbal", strength: "strong", errorClass: "misconception", errorPattern: "larger_denominator_larger",
    prerequisiteCompetencyId: "competency-test-000", misconceptionId: "misc-1", exposureCount: 2, attemptCount: 3,
    contextTags: ["market", "school"], evaluatorType: "system_exact_match", evaluatorId: "eval-1", evaluationPolicyVersion: "p-1",
    interpretationVersion: "evidence-v1", instructionalStrategy: "worked_example", responseMode: "multiple_choice",
    diagnosticState: "misconception", diagnosticConfidence: 0.8, interventionType: "remediate", interventionId: "intervention-1",
    ...extra,
  } as LearningEvidence);

  try {
    await store.ensureLearnerExists(learnerId);
    await store.saveLearnerState(createInitialLearnerState(learnerId, COMPETENCY_ID));

    /* Read path 1: saveEvidence + getEvidence. */
    const first = full(`ev-roundtrip-1-${crypto.randomUUID()}`);
    await store.saveEvidence(first);
    const loaded = (await store.getEvidence(learnerId, COMPETENCY_ID)).find((item) => item.id === first.id);
    const lost1 = differences(first, loaded);
    assert(lost1.length === 0, `saveEvidence/getEvidence round trip lost fields: ${lost1.join("; ")}`);

    /* Read path 2: the history handed to the engine by the atomic answer path. */
    const second = full(`ev-roundtrip-2-${crypto.randomUUID()}`, { timestamp: new Date().toISOString(), outcome: "correct", contextTags: ["home"], attemptCount: 1, exposureCount: 1, assessmentItemId: "item-roundtrip-2" });
    let seen: LearningEvidence[] = [];
    await store.saveEvidenceAndUpdateLearnerState(second, COMPETENCY_ID, (current, _isNew, history) => {
      seen = history;
      return current ?? createInitialLearnerState(learnerId, COMPETENCY_ID);
    });
    assert(seen.length === 2, `engine history has both records (${seen.length})`);
    const lost2 = [...differences(first, seen.find((item) => item.id === first.id)), ...differences(second, seen.find((item) => item.id === second.id))];
    assert(lost2.length === 0, `atomic-path history lost fields: ${lost2.join("; ")}`);

    console.log({ test: "Postgres evidence round trip (both read paths)", fieldsChecked: Object.keys(first).length, result: "PASS" });
  } finally {
    await deleteTestLearners(pool, [learnerId]);
    await pool.end();
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
