import { persistenceStore } from "../services/persistence-provider";
import {
  getOrCreateLearnerLearningContext,
  saveLearnerLearningContext,
  updateActiveCompetency,
} from "../services/learner-context";
import {
  CURRICULUM_VERSION_GHANA_PILOT_V1_ID,
  GRADE_GHANA_BASIC_4_ID,
  SUBJECT_GHANA_BASIC4_MATH_ID,
} from "../packages/curriculum-framework";

function assert(
  condition: boolean,
  message: string,
): void {
  if (!condition) {
    throw new Error(`FAIL: ${message}`);
  }
}

async function runLearnerLearningContextPersistenceTest(): Promise<void> {
  const learnerId = `learner-context-${crypto.randomUUID()}`;
  await persistenceStore.ensureLearnerExists(learnerId);

  // 1/2. Persistence: no context initially.
  const initial = await persistenceStore.getLearnerLearningContext(
    learnerId,
  );

  assert(
    initial === undefined,
    "a fresh learner must have no learning context initially",
  );

  // Lazy default creation (Ghana Mathematics pilot).
  const created = await getOrCreateLearnerLearningContext(
    learnerId,
  );

  assert(
    created.curriculumVersionId ===
      CURRICULUM_VERSION_GHANA_PILOT_V1_ID &&
      created.gradeId === GRADE_GHANA_BASIC_4_ID &&
      created.activeSubjectId ===
        SUBJECT_GHANA_BASIC4_MATH_ID &&
      created.activeCompetencyId === undefined,
    "a learner with no context must lazily default to the Ghana Mathematics pilot",
  );

  const persisted = await persistenceStore.getLearnerLearningContext(
    learnerId,
  );

  assert(
    persisted?.curriculumVersionId ===
      created.curriculumVersionId,
    "the lazily-created default context must actually be persisted",
  );

  console.log({
    test: "learner learning-context lazy default persists",
    result: "PASS",
  });

  // Calling again must not recreate/overwrite.
  await saveLearnerLearningContext({
    ...created,
    activeCompetencyId: "competency-gh-math-b4-number-patterns-002",
    updatedAt: new Date().toISOString(),
  });

  const second = await getOrCreateLearnerLearningContext(
    learnerId,
  );

  assert(
    second.activeCompetencyId ===
      "competency-gh-math-b4-number-patterns-002",
    "an existing persisted context must not be recreated/overwritten",
  );

  console.log({
    test: "existing context is reused, not recreated",
    result: "PASS",
  });

  // updateActiveCompetency only changes activeCompetencyId.
  await updateActiveCompetency(
    learnerId,
    "competency-gh-math-b4-number-patterns-003",
  );

  const afterUpdate = await persistenceStore.getLearnerLearningContext(
    learnerId,
  );

  assert(
    afterUpdate?.activeCompetencyId ===
      "competency-gh-math-b4-number-patterns-003" &&
      afterUpdate.curriculumVersionId ===
        created.curriculumVersionId &&
      afterUpdate.gradeId === created.gradeId &&
      afterUpdate.activeSubjectId ===
        created.activeSubjectId,
    "updating the active competency must not alter curriculum version/grade/subject",
  );

  console.log({
    test: "updateActiveCompetency preserves the rest of the context",
    result: "PASS",
  });

  console.log({
    learnerLearningContextPersistenceTest: "PASS",
    persistence: process.env.FILUMIRE_PERSISTENCE ?? "memory",
  });
}

runLearnerLearningContextPersistenceTest().catch((error) => {
  console.error(error);
  process.exit(1);
});
