import assert from 'node:assert/strict';
import { placeLearnerInCurriculum } from '../services/learner-context/placement';
import { persistenceStore } from '../services/persistence-provider';
import { createPrincipalLearnerAccess } from '../services/principal';
import { getOrCreateLearnerLearningContext, getLearnerLearningContext } from '../services/learner-context';
import { CURRICULUM_VERSION_GHANA_PILOT_V1_ID, CURRICULUM_VERSION_GHANA_CCP_2020_ID, getSupportedGradesForCurriculumVersion, getAvailableSubjectsForGrade } from '../packages/curriculum-framework';
import { POST } from '../apps/learner/app/api/account/learners/[learnerId]/placement/route';

const learnerId = `placement-${crypto.randomUUID()}`, guardian = `guardian-${learnerId}`, self = `self-${learnerId}`, stranger = `stranger-${learnerId}`;
await persistenceStore.ensureLearnerExists(learnerId);
for (const principal of [guardian, self, stranger]) await persistenceStore.createPrincipal(principal);
await createPrincipalLearnerAccess(`guardian-access-${learnerId}`, guardian, learnerId, 'guardian');
await createPrincipalLearnerAccess(`self-access-${learnerId}`, self, learnerId, 'self');
const before = await getOrCreateLearnerLearningContext(learnerId);
const primary = { curriculumVersionId: before.curriculumVersionId, gradeId: before.gradeId, subjectId: before.activeSubjectId };
for (const principal of [self, stranger]) await assert.rejects(placeLearnerInCurriculum(principal, learnerId, primary));
assert.deepEqual(await getLearnerLearningContext(learnerId), before);
for (const grade of [7, 8, 9]) for (const subject of ['english', 'mathematics', 'science', 'computing']) {
  await assert.rejects(placeLearnerInCurriculum(guardian, learnerId, { curriculumVersionId: CURRICULUM_VERSION_GHANA_CCP_2020_ID, gradeId: `level-gh-basic-${grade}-ccp`, subjectId: `subject-gh-basic${grade}-${subject}-ccp` }));
  assert.deepEqual(await getLearnerLearningContext(learnerId), before, 'Inactive placement does not partially change context');
}
let combinations = 0;
for (const grade of getSupportedGradesForCurriculumVersion(CURRICULUM_VERSION_GHANA_PILOT_V1_ID)) for (const subject of getAvailableSubjectsForGrade(CURRICULUM_VERSION_GHANA_PILOT_V1_ID, grade.id)) {
  const next = await placeLearnerInCurriculum(guardian, learnerId, { curriculumVersionId: CURRICULUM_VERSION_GHANA_PILOT_V1_ID, gradeId: grade.id, subjectId: subject.id });
  assert.equal(next.gradeId, grade.id); assert.equal(next.activeSubjectId, subject.id); assert.equal(next.gradeSetBy, 'guardian');
  assert(next.activeCompetencyId);
  combinations++;
}
assert.equal(combinations, 12);
const returned = await placeLearnerInCurriculum(guardian, learnerId, primary);
assert.equal(returned.activeSubjectId, before.activeSubjectId);
const response = await POST(new Request('http://localhost/api/account/learners/test/placement', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(primary) }), { params: Promise.resolve({ learnerId }) });
assert.equal(response.status, 401, 'Public placement requires an authenticated session');
console.log('PASS guardian-only placement, 12 hidden CCP refusals without writes, 12 supported primary contexts, return path and unauthenticated API rejection');
