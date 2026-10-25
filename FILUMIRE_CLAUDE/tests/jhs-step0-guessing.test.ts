import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { PRIVATE_JHS_SCOPE } from '../packages/curriculum/jhs-private-policy';
import { getCompetency } from '../packages/curriculum';
import { seedContent } from '../services/content-store/seed';
import { getContentForCompetency } from '../services/content-store';
import { isOnAdaptivePath } from '../services/content-store/evidence-role';
import { prepareLearnerContent } from '../services/assessment/learner-content';
import { createInitialLearnerState, saveLearnerState } from '../services/learner-state';
import { acknowledgeIntervention } from '../services/intervention-store';
import { persistenceStore } from '../services/persistence-provider';
import { decide, answer } from './repro-4a-helpers';

assert.equal(process.env.FILUMIRE_PERSISTENCE, 'memory');
process.env.FILUMIRE_JHS_MODE = 'private-presentation';
seedContent();
let random = 0x24_10_2026;
const results: object[] = [];
let acquired = 0, ready = 0;
for (const row of PRIVATE_JHS_SCOPE) for (const language of ['en', 'fr'] as const) for (const strategy of ['first', 'last', 'seeded-random'] as const) {
  const definition = getCompetency(row.competencyId)!;
  const learnerId = `fictional-jhs-guess-${row.competencyId}-${language}-${strategy}`;
  await persistenceStore.ensureLearnerExists(learnerId);
  let state = createInitialLearnerState(learnerId, definition.id);
  state.language = language;
  for (const prerequisite of definition.prerequisiteCompetencyIds) {
    const done = createInitialLearnerState(learnerId, prerequisite).competencies[0];
    Object.assign(done, { masteryEstimate: .9, confidence: .9, evidenceCount: 9,
      readinessState: { readyForAdvancement: true, confidence: .9, reasonCode: 'FIXTURE', evaluatedAt: new Date().toISOString() } });
    state.competencies.push(done);
  }
  await saveLearnerState(state);
  let questions = 0;
  for (let turn = 0; turn < 40; turn++) {
    const step = await decide(learnerId, state);
    if (step.decision.action === 'advance' || step.decision.action === 'complete' || !step.content) break;
    const item = step.content;
    assert.equal(item.competencyId, definition.id);
    assert.equal(item.language, language);
    assert(isOnAdaptivePath(item));
    if (!item.assessmentItemId) {
      if (step.decision.interventionId) await acknowledgeIntervention({ interventionId: step.decision.interventionId, learnerId, competencyId: item.competencyId });
      continue;
    }
    questions++;
    const shown = prepareLearnerContent(item, learnerId);
    assert(!shown.metadata?.expectedResponse && !shown.metadata?.diagnosticRules, 'keys never reach the learner');
    const options: string[] = JSON.parse(shown.metadata!.options);
    random = (Math.imul(random, 1664525) + 1013904223) >>> 0;
    const position = strategy === 'first' ? 0 : strategy === 'last' ? options.length - 1 : random % options.length;
    state = (await answer(learnerId, state, definition.id, item, options[position], step.decision.interventionId)).state;
  }
  const target = state.competencies.find(c => c.competencyId === definition.id)!;
  const mastered = target.masteryEstimate >= .8 && target.confidence >= .8;
  if (mastered) acquired++;
  if (target.readinessState?.readyForAdvancement) ready++;
  assert(questions > 0, 'a guessing trace must actually answer questions');
  // Do not claim that a finite choice bank makes lucky guesses impossible.
  // The sampled traces must reject at least 95% at acquisition and all at readiness.
  results.push({ competencyId: definition.id, language, strategy, questions, mastered,
    ready: Boolean(target.readinessState?.readyForAdvancement) });
  const bank = getContentForCompetency(definition.id).filter(c => c.language === language && c.assessmentItemId && isOnAdaptivePath(c));
  assert.equal(bank.length, 9);
}
mkdirSync('.vercel/jhs-step0', { recursive: true });
writeFileSync('.vercel/jhs-step0/guessing.json', JSON.stringify({ seed: '0x24102026', results, acquired, ready }, null, 2));
assert(acquired / results.length <= .05, `guessing acquisition: ${acquired}/${results.length}`);
assert.equal(ready, 0, 'none of these deterministic guessing traces satisfies every readiness gate');
console.log(`PASS ${results.length} EN/FR guessing traces: acquired ${acquired}, fully ready ${ready}; finite sampling, not a proof against lucky guessing`);
