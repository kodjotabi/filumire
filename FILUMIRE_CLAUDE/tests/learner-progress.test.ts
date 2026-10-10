import assert from "node:assert/strict";

import { getCompetenciesForSubject } from "../packages/curriculum";
import {
  GRADE_GHANA_BASIC_5_ID,
} from "../packages/curriculum-framework";
import { buildAdultLearnerSummary } from "../services/adult-summary";
import {
  getAvailableSubjectsForContext,
  getLearnerLearningContext,
  setLearnerGrade,
} from "../services/learner-context";
import { buildLearnerProgress } from "../services/learner-progress";
import {
  createInitialLearnerState,
  saveLearnerState,
} from "../services/learner-state";
import { persistenceStore } from "../services/persistence-provider";
import { buildLearningOverview } from "../apps/learner/app/api/learning/overview-data";

/*
 * Activity, mastery and curriculum progress are separate measures:
 * lots of answers or a high mastery estimate never count as a
 * mastered topic unless the engine judged the learner ready.
 */
async function run(): Promise<void> {
  const learnerId = `progress-${crypto.randomUUID()}`;
  await persistenceStore.ensureLearnerExists(learnerId);
  await setLearnerGrade(learnerId, GRADE_GHANA_BASIC_5_ID);

  const context = (await getLearnerLearningContext(learnerId))!;
  const [first, second] = getAvailableSubjectsForContext(context);
  const [masteredId, practisedId] = getCompetenciesForSubject(first.id).map((c) => c.id);
  const [estimateOnlyId] = getCompetenciesForSubject(second.id).map((c) => c.id);

  const mastered = createInitialLearnerState(learnerId, masteredId);
  Object.assign(mastered.competencies[0], {
    evidenceCount: 6,
    masteryEstimate: 0.9,
    readinessState: { readyForAdvancement: true, confidence: 0.9, reasonCode: "TEST", evaluatedAt: new Date().toISOString() },
  });
  await saveLearnerState(mastered);

  const practised = createInitialLearnerState(learnerId, practisedId);
  Object.assign(practised.competencies[0], { evidenceCount: 3, masteryEstimate: 0.4 });
  await saveLearnerState(practised);

  // High estimate, many answers, but not judged ready: not mastered.
  const estimateOnly = createInitialLearnerState(learnerId, estimateOnlyId);
  Object.assign(estimateOnly.competencies[0], {
    evidenceCount: 11,
    masteryEstimate: 0.95,
    readinessState: { readyForAdvancement: false, confidence: 0.7, reasonCode: "TEST", evaluatedAt: new Date().toISOString() },
  });
  await saveLearnerState(estimateOnly);

  const progress = await buildLearnerProgress(learnerId, context);

  assert.equal(progress.activity.answersRecorded, 20, "activity counts every recorded answer");
  assert.equal(progress.mastery.masteredCompetencies, 1, "only engine-judged topics are mastered");
  assert.equal(progress.mastery.inProgressCompetencies, 2, "started but not judged ready is in progress");

  const total = getAvailableSubjectsForContext(context)
    .reduce((sum, subject) => sum + getCompetenciesForSubject(subject.id).length, 0);
  assert.equal(progress.curriculum.totalCompetencies, total, "curriculum total covers the class");
  assert.equal(progress.curriculum.masteredCompetencies, 1);
  assert.equal(progress.curriculum.percent, Math.round((1 / total) * 100));
  assert.ok(progress.lastActiveAt, "last activity is known");

  const firstRow = progress.subjects.find((s) => s.subjectId === first.id)!;
  const secondRow = progress.subjects.find((s) => s.subjectId === second.id)!;
  assert.deepEqual(
    [firstRow.masteredCompetencies, firstRow.inProgressCompetencies, firstRow.answersRecorded],
    [1, 1, 9],
  );
  assert.deepEqual(
    [secondRow.masteredCompetencies, secondRow.inProgressCompetencies, secondRow.answersRecorded],
    [0, 1, 11],
  );
  console.log({ test: "activity, mastery and curriculum are counted separately", result: "PASS" });

  const summary = await buildAdultLearnerSummary(learnerId);
  assert.deepEqual(summary.progress, progress, "parent summary carries the same roll-up");

  const overview = await buildLearningOverview(learnerId, first.id);
  assert.equal(overview.subjects[first.id].completed, firstRow.masteredCompetencies, "learner overview agrees with parent view");
  assert.equal(overview.subjects[second.id].completed, 0);
  console.log({ test: "parent summary and learner overview agree", result: "PASS" });

  console.log({ learnerProgressTest: "PASS", persistence: process.env.FILUMIRE_PERSISTENCE ?? "memory" });
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
