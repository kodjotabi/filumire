import assert from 'node:assert/strict';
import type { LearningContent } from '../../packages/content';
import { isOnAdaptivePath, OPTIONAL_TEACHER_EXTENSION, RETIRED_ITEM } from '../../services/content-store/evidence-role';

/** All original records survive; only the new bilingual bank is on the assessment path. */
export function assertJhsAutomaticBank(records: LearningContent[]) {
  for (const language of ['en', 'fr'] as const) {
    const items = records.filter(c => c.language === language);
    assert.equal(items.length, 22);
    assert.equal(items.filter(c => c.metadata?.evidenceRole === OPTIONAL_TEACHER_EXTENSION).length, 6);
    assert.equal(items.filter(c => c.metadata?.evidenceRole === RETIRED_ITEM).length, 3);
    const questions = items.filter(c => c.assessmentItemId && isOnAdaptivePath(c));
    assert.equal(questions.length, 9);
    assert.equal(questions.filter(c => c.type === 'practice' && c.metadata?.evidenceIndependence === 'guided').length, 1);
    for (const purpose of ['diagnostic', 'reassessment', 'retention', 'transfer']) {
      assert.equal(questions.filter(c => c.metadata?.assessmentPurpose === purpose).length, 2);
    }
    assert.equal(new Set(questions.map(c => c.body)).size, 9, 'distinct prompts, including retention and transfer');
    for (const item of questions) {
      assert.equal(item.assessmentStrategy, 'multiple_choice');
      assert.notEqual(item.metadata?.evaluationMethod, 'trusted_rubric_evaluation');
      const options = JSON.parse(item.metadata!.options) as string[];
      const rules = JSON.parse(item.metadata!.diagnosticRules) as Record<string, { errorPattern: string }>;
      assert(options.length >= 3 && new Set(options).size === options.length, item.id);
      assert(options.includes(item.metadata!.expectedResponse), item.id);
      for (const wrong of options.filter(o => o !== item.metadata!.expectedResponse)) assert(rules[wrong]?.errorPattern, `${item.id}: wrong option diagnostic rule`);
      if (language === 'fr') assert(records.some(c => c.id === item.translationOfContentId && c.language === 'en'));
    }
  }
}
