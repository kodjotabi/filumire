import assert from 'node:assert/strict';
import { existsSync, writeFileSync } from 'node:fs';
import { SignJWT } from 'jose';
import { getAllCompetencies, getCompetency, getLearningIndicator } from '../packages/curriculum';
import { getFrameworkCompetencyRegistration, CURRICULUM_VERSION_GHANA_PILOT_V1_ID } from '../packages/curriculum-framework';
import { PRIVATE_JHS_SCOPE } from '../packages/curriculum/jhs-private-policy';
import { getCcpBlockingSourceIssueIds, CCP_SOURCE_REGISTRATIONS } from '../packages/curriculum/ghana-ccp-runtime';
import { JHS_SEQUENCE_LINKS } from '../services/content-store/jhs-sequence';
import originalLinks from './fixtures/jhs-step0-original-links.json';
import { seedContent } from '../services/content-store/seed';
import { getAllContent, getContentForCompetency } from '../services/content-store';
import { createInitialLearnerState, saveLearnerState, getLearnerState } from '../services/learner-state';
import { getLearnerStates } from '../services/learner-state-store';
import { saveLearnerLearningContext, getLearnerLearningContext, updateActiveCompetency } from '../services/learner-context';
import { chooseNextCompetency, choosePrerequisiteRepair } from '../services/learner-path/progression';
import { prerequisiteReturnTargets, isAuthorisedRepair } from '../services/learner-path/repair-scope';
import { makeAdaptiveDecision } from '../services/adaptive-engine';
import { persistenceStore } from '../services/persistence-provider';
import { createPrincipalLearnerAccess } from '../services/principal';
import { createPrincipalAuthSession } from '../services/auth-session';
import { createSession } from '../services/session';
import { GET, POST } from '../apps/learner/app/api/learning/route';
import { assertJhsAutomaticBank } from './fixtures/jhs-automatic-bank';

assert.equal(process.env.FILUMIRE_PERSISTENCE, 'memory');
delete process.env.FILUMIRE_JHS_MODE;
seedContent();
const primary = getAllCompetencies().filter(c => /basic-[456]-pilot/.test(c.learningLevelId));
const primaryBefore = JSON.stringify(primary);
const ids = new Set(primary.map(c => c.id));
const contentBefore = JSON.stringify(getAllContent().filter(c => ids.has(c.competencyId)));
async function primaryDecisions() {
  const results = [];
  for (const level of [4, 5, 6]) for (const subject of new Set(primary.filter(c => c.learningLevelId === `level-gh-basic-${level}-pilot`).map(c => c.subjectId))) {
    const root = primary.find(c => c.subjectId === subject && c.learningLevelId === `level-gh-basic-${level}-pilot` && !c.prerequisiteCompetencyIds.length)!;
    assert(root);
    const learnerId = 'fictional-primary-sequence-' + crypto.randomUUID();
    await persistenceStore.ensureLearnerExists(learnerId);
    await saveLearnerLearningContext({ learnerId, curriculumVersionId: CURRICULUM_VERSION_GHANA_PILOT_V1_ID, gradeId: root.learningLevelId,
      activeSubjectId: subject, activeCompetencyId: root.id, updatedAt: new Date().toISOString() });
    const state = createInitialLearnerState(learnerId, root.id);
    const result = await makeAdaptiveDecision({ learnerId, sessionId: 'fictional-session', learnerState: state });
    results.push({ action: result.decision.action, reason: result.decision.reasonCode, competency: result.decision.competencyId, content: result.content });
    assert.deepEqual(await prerequisiteReturnTargets(learnerId, root.id, state.competencies), []);
  }
  return JSON.stringify(results);
}
const decisionsOff = await primaryDecisions();
process.env.FILUMIRE_JHS_MODE = 'private-presentation';
seedContent();
assert.equal(JSON.stringify(getAllCompetencies().filter(c => ids.has(c.id))), primaryBefore, 'primary definitions are byte-for-byte unchanged');
assert.equal(JSON.stringify(getAllContent().filter(c => ids.has(c.competencyId))), contentBefore, 'primary content is byte-for-byte unchanged');
assert.equal(await primaryDecisions(), decisionsOff, 'all 12 primary class/subject decisions are unchanged while JHS is on');
const live = new Set(PRIVATE_JHS_SCOPE.map(r => r.competencyId));
assert.equal(live.size, 42);
for (const old of originalLinks) assert(JHS_SEQUENCE_LINKS.some(l => l.from === old.from && l.to === old.to));
for (const link of JHS_SEQUENCE_LINKS) {
  const from = getCompetency(link.from)!, to = getCompetency(link.to)!;
  assert(from && to && live.has(to.id), 'links never activate hidden registrations');
  assert(link.justification.length > 20 && link.sourceFiles.every(path => existsSync(path)));
  assert(to.prerequisiteCompetencyIds.includes(from.id));
  const source = getFrameworkCompetencyRegistration(to.id)!;
  assert.equal(source.officialCode, link.toCode);
  assert.deepEqual(getCcpBlockingSourceIssueIds(source.sourceIssueIds), []);
  if (link.kind === 'b6-bridge') {
    assert.equal(from.learningLevelId, 'level-gh-basic-6-pilot');
    assert(getLearningIndicator(from.learningIndicatorId)!.id.includes(link.fromCode));
    assert(!from.successorCompetencyIds.includes(to.id), 'B6 definitions remain untouched');
  } else {
    assert(live.has(from.id));
    assert(from.successorCompetencyIds.includes(to.id));
    const earlier = getFrameworkCompetencyRegistration(from.id)!;
    assert.equal(earlier.officialCode, link.fromCode);
    if (link.kind !== 'grade-continuation') {
      assert(CCP_SOURCE_REGISTRATIONS.findIndex(r => r.id === from.id) < CCP_SOURCE_REGISTRATIONS.findIndex(r => r.id === to.id), 'same-grade links follow the literal CCP source order');
      assert.equal(earlier.gradeId, source.gradeId);
      assert.equal(earlier.hierarchy.subStrandId, source.hierarchy.subStrandId);
      if (link.kind === 'content-standard-order') assert.equal(earlier.hierarchy.contentStandardId, source.hierarchy.contentStandardId);
    } else {
      const parts = (code: string) => code.replace(/\s/g, '').split('.');
      assert.deepEqual(parts(link.fromCode).slice(1, 3), parts(link.toCode).slice(1, 3));
      assert.equal(Number(parts(link.toCode)[0].slice(1)), Number(parts(link.fromCode)[0].slice(1)) + 1);
    }
  }
}
function acyclic(id: string, path = new Set<string>(), done = new Set<string>()) {
  assert(!path.has(id), 'the live prerequisite graph must be acyclic: ' + id);
  if (done.has(id)) return;
  const next = new Set(path).add(id);
  for (const parent of getCompetency(id)?.prerequisiteCompetencyIds ?? []) acyclic(parent, next, done);
  done.add(id);
}
for (const id of live) acyclic(id);
for (const id of live) {
  const topic = getCompetency(id)!;
  const items = getContentForCompetency(id);
  assertJhsAutomaticBank(items);
  assert(topic.misconceptions.length >= 2);
  for (const misconception of topic.misconceptions) {
    assert(!/^(misconception|error|wrong-answer|placeholder|generic)([-_ ]?\d+)?$/i.test(misconception));
    for (const language of ['en', 'fr']) assert(items.some(item => item.language === language && item.metadata?.diagnosticRules &&
      Object.values(JSON.parse(item.metadata.diagnosticRules) as Record<string, { errorPattern: string }>).some(rule => rule.errorPattern === misconception)));
  }
}
const doneState = (learnerId: string, id: string) => {
  const row = createInitialLearnerState(learnerId, id).competencies[0];
  return { ...row, masteryEstimate: .9, confidence: .9, evidenceCount: 9, masteredAt: '2026-10-01T09:00:00.000Z',
    retentionState: { status: 'retained' as const, confidence: .9, evidenceIds: [] },
    transferState: { status: 'demonstrated' as const, confidence: .9, evidenceIds: [] },
    readinessState: { readyForAdvancement: true, confidence: .9, reasonCode: 'FIXTURE_PRIOR_LEARNING', evaluatedAt: new Date().toISOString() } };
};
const parents = (id: string, visited = new Set<string>()): string[] => {
  for (const parent of getCompetency(id)!.prerequisiteCompetencyIds) if (!visited.has(parent)) { visited.add(parent); parents(parent, visited); }
  return [...visited];
};
const edge = JHS_SEQUENCE_LINKS.find(l => l.kind === 'sub-strand-order')!;
const pathLearner = 'fictional-sequence-successor-' + crypto.randomUUID();
const priorStates = parents(edge.to).map(id => doneState(pathLearner, id));
assert.equal(chooseNextCompetency({ currentCompetencyId: edge.from, states: priorStates, currentCompleted: true, timeAware: true }).competencyId, edge.to);
const missing = priorStates.filter(c => c.competencyId !== edge.from);
assert.equal(choosePrerequisiteRepair({ currentCompetencyId: edge.to, states: missing }), edge.from);
const gradeContinuation = JHS_SEQUENCE_LINKS.find(link => link.kind === 'grade-continuation')!;
assert.notEqual(chooseNextCompetency({ currentCompetencyId: gradeContinuation.from,
  states: parents(gradeContinuation.to).map(id => doneState(pathLearner, id)), currentCompleted: true, timeAware: true }).competencyId,
  gradeContinuation.to, 'source continuity must not silently promote a guardian-assigned class');
await persistenceStore.ensureLearnerExists(pathLearner);
const targetDefinition = getCompetency(edge.to)!;
await saveLearnerLearningContext({ learnerId: pathLearner, curriculumVersionId: 'curriculum-version-gh-nacca-ccp-2020',
  gradeId: targetDefinition.learningLevelId, activeSubjectId: targetDefinition.subjectId, activeCompetencyId: edge.to, updatedAt: new Date().toISOString() });
const weak = createInitialLearnerState(pathLearner, edge.to);
Object.assign(weak.competencies[0], { masteryEstimate: .5, confidence: .5, evidenceCount: 4 });
weak.competencies.push(...missing);
await saveLearnerState(weak);
const repair = await makeAdaptiveDecision({ learnerId: pathLearner, sessionId: 'fictional-jhs-repair', learnerState: weak }, { checkKnowledgeFirst: true });
assert.equal(repair.decision.reasonCode, 'PREREQUISITE_REPAIR');
assert.equal(repair.decision.competencyId, edge.from);

const bridge = JHS_SEQUENCE_LINKS.find(l => l.kind === 'b6-bridge' && l.to.includes('mathematics'))!;
assert(bridge);
const learnerId = 'fictional-sequence-bridge-' + crypto.randomUUID();
await persistenceStore.ensureLearnerExists(learnerId);
const definition = getCompetency(bridge.to)!;
const bridged = createInitialLearnerState(learnerId, bridge.to);
Object.assign(bridged.competencies[0], { masteryEstimate: .5, confidence: .5, evidenceCount: 4 });
bridged.competencies.push(...parents(bridge.to).filter(id => id !== bridge.from).map(id => doneState(learnerId, id)));
await saveLearnerState(bridged);
await saveLearnerLearningContext({ learnerId, curriculumVersionId: 'curriculum-version-gh-nacca-ccp-2020',
  gradeId: definition.learningLevelId, activeSubjectId: definition.subjectId, activeCompetencyId: definition.id, updatedAt: new Date().toISOString() });
assert.equal(await isAuthorisedRepair((await getLearnerLearningContext(learnerId))!, bridge.from), false, 'ancestry alone is not permission');
const principalId = 'fictional-sequence-self-' + crypto.randomUUID(), sessionId = 'fictional-sequence-session-' + crypto.randomUUID();
await persistenceStore.createPrincipal(principalId);
await createPrincipalLearnerAccess(crypto.randomUUID(), principalId, learnerId, 'self');
await createSession(sessionId, learnerId);
await createPrincipalAuthSession(sessionId, principalId, new Date(Date.now() + 86400000).toISOString());
const secret = process.env.FILUMIRE_AUTH_JWT_SECRET = 'fictional-jhs-sequence-only-auth-secret-at-least-32-characters';
const token = await new SignJWT({ sid: sessionId, learner_id: learnerId }).setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
  .setAudience('filumire-learner-api').setIssuer('filumire-learner').setSubject(principalId).setIssuedAt().setExpirationTime('1d').sign(new TextEncoder().encode(secret));
const headers = { cookie: 'filumire_auth_session=' + token, origin: 'http://localhost', 'content-type': 'application/json' };
const get = () => GET(new Request('http://localhost/api/learning?subjectId=' + definition.subjectId, { headers }));
const read = async (response: Response) => { const body = await response.json(); assert.equal(response.status, 200, JSON.stringify(body)); return body; };
let step = await read(await get());
assert.equal(step.decision.reasonCode, 'PREREQUISITE_REPAIR');
assert.equal(step.content.competencyId, bridge.from);
assert.equal((await read(await get())).content.id, step.content.id, 'earlier-grade lesson resumes through the signed-in API');
const context = (await getLearnerLearningContext(learnerId))!;
assert.equal(context.gradeId, definition.learningLevelId);
assert.equal(context.activeSubjectId, definition.subjectId);
assert.equal(context.activeCompetencyId, bridge.from);
const unrelated = primary.find(c => c.learningLevelId === 'level-gh-basic-6-pilot' && !parents(bridge.to).includes(c.id))!;
const denied = await GET(new Request('http://localhost/api/learning?subjectId=' + definition.subjectId + '&competencyId=' + unrelated.id, { headers }));
assert.equal(denied.status, 404, 'unrelated primary topics remain inaccessible');
for (let turn = 0; turn < 100 && step.content?.competencyId !== bridge.to; turn++) {
  const contentId = step.content?.competencyId;
  assert(contentId && (contentId === bridge.from || parents(bridge.from).includes(contentId)), 'repair may service due foundation reviews, never unrelated earlier-class topics');
  const content = getContentForCompetency(contentId).find(c => c.id === step.content.id)!;
  const body = content.assessmentItemId
    ? { interactionType: 'assessment', assessmentItemId: content.assessmentItemId, response: content.metadata!.expectedResponse, clientRequestId: crypto.randomUUID() }
    : { interactionType: 'acknowledge' };
  step = await read(await POST(new Request('http://localhost/api/learning', { method: 'POST', headers,
    body: JSON.stringify({ sessionId, competencyId: contentId, interventionId: step.decision.interventionId, ...body }) })));
}
assert.equal(step.decision.action, 'advance');
assert.equal(step.decision.reasonCode, 'ACQUIRED_RETENTION_PENDING_MOVE_ON', 'keep the existing time-aware acquisition policy');
assert.equal(step.content.competencyId, bridge.to);
const returnStates = (await getLearnerStates(learnerId)).flatMap(s => s.competencies);
const returnTargets = await prerequisiteReturnTargets(learnerId, bridge.from, returnStates);
assert.equal(chooseNextCompetency({ currentCompetencyId: bridge.from, states: returnStates, currentCompleted: true, timeAware: true,
  repairReturnTargets: returnTargets }).reasonCode, 'PREREQUISITE_REPAIR_COMPLETED');
assert.equal((await getLearnerLearningContext(learnerId))!.gradeId, definition.learningLevelId, 'repair never changes the guardian class');
delete process.env.FILUMIRE_JHS_MODE;
assert.equal(await isAuthorisedRepair(context, bridge.from), false);
assert.deepEqual(await prerequisiteReturnTargets(learnerId, bridge.from, (await getLearnerStates(learnerId)).flatMap(s => s.competencies)), []);
assert.equal(await primaryDecisions(), decisionsOff);
assert.equal(JSON.stringify(getAllCompetencies().filter(c => ids.has(c.id))), primaryBefore);
assert.equal(JSON.stringify(getAllContent().filter(c => ids.has(c.competencyId))), contentBefore);
writeFileSync(process.env.FILUMIRE_JHS_SEQUENCE_REPORT ?? 'C:/FILUMIRE/filumire-evidence/jhs-sequence-2026-10-24/link-review.json', JSON.stringify({ links: JHS_SEQUENCE_LINKS,
  originalLinksPreserved: originalLinks.length, topics: live.size, misconceptionsReplaced: 0,
  deferredBridges: ['living cells: no Basic 6 cellular-structure continuation', 'animal production: no live Basic 6 animal-production topic',
    'digestion: Basic 6 excretion is not a digestion prerequisite', 'farming systems: no live Basic 6 farming-systems topic'],
  classPromotion: 'Cross-grade source links support earlier-grade repair; guardian placement still controls the class, so successors do not auto-promote a learner.',
}, null, 2));
console.log('PASS source-justified acyclic live sequence; all original links preserved; topic-specific wrong-option mappings; successor advance; B7 repair; signed-in B7-to-B6 repair and return; primary data and all 12 primary decisions unchanged with JHS on/off');
