import assert from 'node:assert/strict';
import { SignJWT } from 'jose';
import { createPrincipalAuthSession } from '../services/auth-session';
import { PRIVATE_JHS_SCOPE } from '../packages/curriculum/jhs-private-policy';
import { getCompetency } from '../packages/curriculum';
import { getFrameworkCompetencyRegistration, getFrameworkSubject } from '../packages/curriculum-framework';
import { seedContent } from '../services/content-store/seed';
import { getContentForCompetency } from '../services/content-store';
import { getEvidence } from '../services/evidence-store';
import { getLearnerState, saveLearnerState, createInitialLearnerState } from '../services/learner-state';
import { persistenceStore } from '../services/persistence-provider';
import { submitPendingTeacherReview, getPendingTeacherReview } from '../services/teacher-review';
import { readAssessmentRecovery } from '../services/edututor/assessment-recovery';
import { createPrincipalLearnerAccess } from '../services/principal';
import { POST as reviewPOST } from '../apps/learner/app/api/teacher/review/route';
import { summariseSubjects } from '../services/learner-progress';
import { buildAdultLearnerSummary } from '../services/adult-summary';
import { saveLearnerLearningContext } from '../services/learner-context';
import { choosePrerequisiteRepair } from '../services/learner-path/progression';
import { answer } from './repro-4a-helpers';
import { evaluateMastery } from '../services/mastery';
import { JHS_SEQUENCE_LINKS } from '../services/content-store/jhs-sequence';
import originalLinks from './fixtures/jhs-step0-original-links.json';

assert(process.env.FILUMIRE_PERSISTENCE === 'memory' ||
  (process.env.FILUMIRE_PERSISTENCE === 'postgres' && process.env.FILUMIRE_JHS_PG_TEST_VERIFIED === 'true'),
  'Only memory or the verified fresh local PostgreSQL fixture');
process.env.FILUMIRE_JHS_MODE = 'private-presentation';
Object.defineProperty(process.env, 'NODE_ENV', { value: 'test', writable: true, configurable: true, enumerable: true });
seedContent();
const definitions = PRIVATE_JHS_SCOPE.map(r => getCompetency(r.competencyId)!);
assert.equal(definitions.filter(c => c.assessmentScope === 'understanding_only').length, 9);
let links = 0;
for (const definition of definitions) for (const prerequisiteId of definition.prerequisiteCompetencyIds) {
  links++;
  const prerequisite = getCompetency(prerequisiteId)!;
  assert(prerequisite, 'every prerequisite is a live competency');
  const proof = JHS_SEQUENCE_LINKS.find(link => link.from === prerequisiteId && link.to === definition.id);
  assert(proof?.justification && proof.fromCode && proof.toCode, 'every link needs a NaCCA justification');
  if (proof.kind !== 'b6-bridge') assert(prerequisite.successorCompetencyIds.includes(definition.id));
  else assert.equal(prerequisite.learningLevelId, 'level-gh-basic-6-pilot');
  assert(choosePrerequisiteRepair({ currentCompetencyId: definition.id, states: [] }), 'missing prerequisite can be repaired');
}
assert.equal(links, JHS_SEQUENCE_LINKS.length);
for (const original of originalLinks) assert(JHS_SEQUENCE_LINKS.some(link => link.from === original.from && link.to === original.to), 'every original Step 0 link is preserved');

const definition = definitions.find(c => c.assessmentScope === 'understanding_only')!;
const learnerId = `fictional-jhs-history-${crypto.randomUUID()}`;
await persistenceStore.ensureLearnerExists(learnerId);
const records = getContentForCompetency(definition.id);
const retired = records.find(c => c.language === 'en' && c.metadata?.evidenceRole === 'retired')!;
const optional = records.find(c => c.language === 'en' && c.metadata?.evidenceRole === 'optional_teacher_extension')!;
let state = createInitialLearnerState(learnerId, definition.id);
await saveLearnerState(state);
state = (await answer(learnerId, state, definition.id, retired, retired.metadata!.expectedResponse, undefined)).state;
const pending = await submitPendingTeacherReview({ learnerId, competencyId: definition.id,
  contentId: optional.id, assessmentItemId: optional.assessmentItemId!, sessionId: 'fictional-historical-session',
  response: 'Fictional archived learner work awaiting its existing teacher review.' });
const before = structuredClone({ state: await getLearnerState(learnerId, definition.id),
  evidence: await getEvidence(learnerId, definition.id), review: await getPendingTeacherReview(pending.review.id) });
seedContent();
assert.equal((await readAssessmentRecovery(learnerId)).pendingTeacherReview, false, 'optional work does not block tutoring');
assert.deepEqual({ state: await getLearnerState(learnerId, definition.id),
  evidence: await getEvidence(learnerId, definition.id), review: await getPendingTeacherReview(pending.review.id) }, before,
  'reseed and recovery classification preserve every historical state, evidence and pending review field');

const teacherId = `fictional-jhs-teacher-${crypto.randomUUID()}`;
const guardianId = `fictional-jhs-guardian-${crypto.randomUUID()}`;
for (const [principal, role] of [[teacherId, 'teacher'], [guardianId, 'guardian']] as const) {
  await persistenceStore.createPrincipal(principal);
  await createPrincipalLearnerAccess(crypto.randomUUID(), principal, learnerId, role);
}
const secret = process.env.FILUMIRE_AUTH_JWT_SECRET = 'fictional-jhs-history-only-test-secret-over-32-characters';
const review = async (principal: string) => {
  const sid = `fictional-review-session-${crypto.randomUUID()}`;
  await createPrincipalAuthSession(sid, principal, new Date(Date.now() + 86400000).toISOString());
  const token = await new SignJWT({ sid, scope: 'principal' }).setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setAudience('filumire-learner-api').setIssuer('filumire-learner').setSubject(principal)
    .setIssuedAt().setExpirationTime('1d').sign(new TextEncoder().encode(secret));
  return reviewPOST(new Request('http://localhost/api/teacher/review', {
    method: 'POST', headers: { 'content-type': 'application/json', cookie: `filumire_auth_session=${token}`, origin: 'http://localhost' },
    body: JSON.stringify({ reviewId: pending.review.id, outcome: 'correct' }) }));
};
assert.equal((await review(guardianId)).status, 403);
const response = await review(teacherId);
assert.equal(response.status, 200, JSON.stringify(await response.clone().json()));
const after = await getEvidence(learnerId, definition.id);
assert.deepEqual(after.filter(e => before.evidence.some(old => old.id === e.id)), before.evidence, 'teacher resolution appends without rewriting old evidence');
assert(after.some(e => e.evaluatorType === 'teacher' && e.evaluatorId === teacherId && e.evaluationPolicyVersion === 'teacher-review-v1'));
const teacherEvidence = after.find(e => e.evaluatorType === 'teacher' && e.evaluatorId === teacherId)!;
assert(evaluateMastery(after).evidenceIds.includes(teacherEvidence.id), 'trusted historical teacher work still counts towards mastery');
assert.equal((await getPendingTeacherReview(pending.review.id))?.status, 'reviewed');
await submitPendingTeacherReview({ learnerId, competencyId: definition.id, assessmentItemId: 'unknown-historical-item',
  sessionId: 'fictional-unknown-session', response: 'Unknown historical work must stay protected.' });
assert.equal((await readAssessmentRecovery(learnerId)).pendingTeacherReview, true);

const source = getFrameworkCompetencyRegistration(definition.id)!;
await saveLearnerLearningContext({ learnerId, curriculumVersionId: source.curriculumVersionId, gradeId: source.gradeId,
  activeSubjectId: definition.subjectId, activeCompetencyId: definition.id, updatedAt: new Date().toISOString() });
for (const language of ['en', 'fr'] as const) assert((await buildAdultLearnerSummary(learnerId, language)).assessmentScopeNote);
const full = definitions.find(c => c.subjectId === definition.subjectId && c.assessmentScope !== 'understanding_only');
const subjects = [getFrameworkSubject(definition.subjectId)!];
const rows = new Map([[definition.id, { evidenceCount: 9, mastered: true, masteryEstimate: .9 }]]);
if (full) rows.set(full.id, { evidenceCount: 9, mastered: true, masteryEstimate: .9 });
const summary = summariseSubjects(subjects, rows)[0];
assert.equal(summary.understandingMasteredCompetencies, 1);
assert.equal(summary.masteredCompetencies, full ? 1 : 0, 'understanding-only never becomes full subject mastery');
const provisional = summariseSubjects(subjects, new Map([[definition.id, { evidenceCount: 5, mastered: false, masteryEstimate: .9, provisional: true }]]))[0];
assert.equal(provisional.provisionalCompetencies, 1);
assert.equal(provisional.masteredCompetencies, 0);
console.log('PASS source-justified live prerequisites and preserved original links; historical evidence/state/reviews preserved; optional review remains teacher-only and resolvable; unknown work protected; EN/FR scope and provisional counts');
