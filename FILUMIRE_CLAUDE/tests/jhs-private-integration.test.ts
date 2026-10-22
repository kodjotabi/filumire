import assert from 'node:assert/strict';
import { seedContent } from '../services/content-store/seed';
import { getAllCompetencies, getCompetency } from '../packages/curriculum';
import { getAvailableSubjectsForGrade, getSupportedGradesForCurriculumVersion, isSupportedGrade } from '../packages/curriculum-framework';
import { PRIVATE_JHS_SCOPE, isPrivateJhsEnabled } from '../packages/curriculum/jhs-private-policy';
import { getContentForCompetency } from '../services/content-store';
import { jhsValidationFingerprint } from '../services/content-store/jhs-validation-fingerprint';
import { JHS_PREVIEW_COMPETENCIES } from '../services/content-store/jhs-representative-preview';
import { persistenceStore } from '../services/persistence-provider';
import { createPrincipalLearnerAccess } from '../services/principal';
import { getLearnerPlacementOptions, placeLearnerInCurriculum } from '../services/learner-context/placement';
import { getLearnerLearningContext } from '../services/learner-context';
import { getEvidenceForLearner } from '../services/evidence-store';

delete process.env.FILUMIRE_JHS_MODE;
seedContent();
const primary = getAllCompetencies();
assert.equal(primary.some(item => PRIVATE_JHS_SCOPE.some(row => row.competencyId === item.id)), false);
assert.deepEqual(getSupportedGradesForCurriculumVersion('curriculum-version-gh-nacca-ccp-2020'), []);
process.env.FILUMIRE_JHS_MODE = 'private-presentation';
const originalTitle = JHS_PREVIEW_COMPETENCIES[0].title;
JHS_PREVIEW_COMPETENCIES[0].title = 'Unvalidated content alteration';
assert.throws(seedContent, /fingerprint mismatch/);
assert.equal(getAllCompetencies().length, primary.length, 'A mismatched batch must register nothing');
JHS_PREVIEW_COMPETENCIES[0].title = originalTitle;
seedContent(); seedContent();
assert.equal(PRIVATE_JHS_SCOPE.length, 42);
assert.equal(getAllCompetencies().length, primary.length + 42);
for (const row of PRIVATE_JHS_SCOPE) {
  const competency = getCompetency(row.competencyId)!;
  assert(competency);
  assert.equal(jhsValidationFingerprint(competency, getContentForCompetency(competency.id)), row.contentFingerprint);
}
for (const grade of [7, 8, 9]) assert.equal(getAvailableSubjectsForGrade('curriculum-version-gh-nacca-ccp-2020', `level-gh-basic-${grade}-ccp`).length, 4);
assert.deepEqual(getAllCompetencies().filter(item => primary.some(old => old.id === item.id)), primary);
const learner = `private-placement-${crypto.randomUUID()}`, guardian = `g-${learner}`, stranger = `s-${learner}`;
await persistenceStore.ensureLearnerExists(learner);
await persistenceStore.createPrincipal(guardian); await persistenceStore.createPrincipal(stranger);
await createPrincipalLearnerAccess(`a-${learner}`, guardian, learner, 'guardian');
assert.deepEqual((await getLearnerPlacementOptions(guardian, learner)).choices.map(choice => choice.name), ['Basic 4', 'Basic 5', 'Basic 6', 'Basic 7', 'Basic 8', 'Basic 9']);
await assert.rejects(getLearnerPlacementOptions(stranger, learner));
const target = { curriculumVersionId: 'curriculum-version-gh-nacca-ccp-2020', gradeId: PRIVATE_JHS_SCOPE[0].gradeId, subjectId: PRIVATE_JHS_SCOPE[0].subjectId };
await placeLearnerInCurriculum(guardian, learner, target);
const before = await getLearnerLearningContext(learner);
await assert.rejects(placeLearnerInCurriculum(stranger, learner, target));
await assert.rejects(placeLearnerInCurriculum(guardian, learner, { ...target, gradeId: 'level-gh-basic-8-ccp' }));
assert.deepEqual(await getLearnerLearningContext(learner), before);
// Local rehearsal only: any Vercel deployment (Production or Preview) refuses.
for (const vercel of [{ VERCEL_ENV: 'production' }, { VERCEL_ENV: 'preview' }, { VERCEL: '1' }]) {
  Object.assign(process.env, vercel);
  assert.equal(isPrivateJhsEnabled(), false, JSON.stringify(vercel));
  assert.deepEqual(getSupportedGradesForCurriculumVersion('curriculum-version-gh-nacca-ccp-2020'), []);
  for (const key of Object.keys(vercel)) delete process.env[key];
}
assert.equal(isPrivateJhsEnabled(), true);

// Rollback: switching the presentation off strands nothing silently. The stored
// class is reported as not offered; the guardian returns the learner to primary.
const evidenceBefore = await getEvidenceForLearner(learner);
delete process.env.FILUMIRE_JHS_MODE;
assert.equal(isSupportedGrade(target.curriculumVersionId, target.gradeId), false, 'stored JHS class is no longer offered');
const stranded = await getLearnerPlacementOptions(guardian, learner);
assert.equal(stranded.current?.gradeId, target.gradeId);
assert.equal(stranded.choices.some(choice => choice.draft), false);
const primaryGrade = stranded.choices[0];
await placeLearnerInCurriculum(guardian, learner, { curriculumVersionId: primaryGrade.curriculumVersionId, gradeId: primaryGrade.gradeId, subjectId: primaryGrade.subjects[0].id });
const returned = await getLearnerLearningContext(learner);
assert.equal(returned?.gradeId, primaryGrade.gradeId);
assert.equal(isSupportedGrade(returned!.curriculumVersionId, returned!.gradeId), true);
assert.deepEqual(await getEvidenceForLearner(learner), evidenceBefore, 'no evidence rewritten');
process.env.FILUMIRE_JHS_MODE = 'private-presentation';
console.log('PASS private opt-in, Vercel refusal, 42 pinned bilingual journeys, 12 contexts, idempotent seed, unchanged primary definitions and guardian rollback');
