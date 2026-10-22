import assert from 'node:assert/strict';
import { persistenceStore } from '../services/persistence-provider';
import { createPrincipalLearnerAccess } from '../services/principal';
import { placeLearnerInCurriculum } from '../services/learner-context/placement';
import { getOrCreateLearnerLearningContext, getLearnerLearningContext, getCurrentCompetencyForSubject } from '../services/learner-context';
import { createInitialLearnerState, saveLearnerState, getLearnerState } from '../services/learner-state';
import { getEvidence } from '../services/evidence-store';
import { JHS_PREVIEW_SOURCES } from '../services/content-store/jhs-representative-preview';
import { installRepresentativePreview } from './fixtures/jhs-representative-preview';

Object.defineProperty(process.env, 'NODE_ENV', {value:'test',writable:true,configurable:true,enumerable:true});
process.env.FILUMIRE_JHS_PREVIEW = 'test-only';
installRepresentativePreview();
const learnerId = `preview-placement-${crypto.randomUUID()}`, guardian = `guardian-${learnerId}`;
await persistenceStore.ensureLearnerExists(learnerId); await persistenceStore.createPrincipal(guardian);
await createPrincipalLearnerAccess(`placement-access-${learnerId}`, guardian, learnerId, 'guardian');
const original = await getOrCreateLearnerLearningContext(learnerId);
const primaryId = getCurrentCompetencyForSubject(original, original.activeSubjectId)!;
assert(primaryId, 'The historical fixture uses a real supported primary competency');
// Fictional historical record. Placement must leave it byte-equivalent.
const historical = createInitialLearnerState(learnerId, primaryId);
await saveLearnerState(historical);
const saved = await getLearnerState(learnerId, primaryId);
for (const source of JHS_PREVIEW_SOURCES) {
  const next = await placeLearnerInCurriculum(guardian, learnerId, { curriculumVersionId: source.curriculumVersionId, gradeId: source.gradeId, subjectId: source.subjectId });
  assert.equal(next.curriculumVersionId, source.curriculumVersionId);
  assert.equal(next.gradeId, source.gradeId); assert.equal(next.activeSubjectId, source.subjectId);
  assert.equal(next.gradeSetBy, 'guardian');
  assert.deepEqual(await getLearnerState(learnerId, primaryId), saved);
  assert.deepEqual(await getEvidence(learnerId, source.id), [], 'Placement manufactures no assessment evidence');
  const before = await getLearnerLearningContext(learnerId);
  await assert.rejects(placeLearnerInCurriculum(guardian, learnerId, { curriculumVersionId: source.curriculumVersionId, gradeId: 'level-gh-basic-4-pilot', subjectId: source.subjectId }));
  assert.deepEqual(await getLearnerLearningContext(learnerId), before);
}
const returned = await placeLearnerInCurriculum(guardian, learnerId, { curriculumVersionId: original.curriculumVersionId, gradeId: original.gradeId, subjectId: original.activeSubjectId });
assert.equal(returned.curriculumVersionId, original.curriculumVersionId);
assert.deepEqual(await getLearnerState(learnerId, primaryId), saved);
console.log('PASS controlled CCP placement across all 12 contexts, mismatched-grade refusal, primary return path and unchanged historical state/no fabricated evidence');
