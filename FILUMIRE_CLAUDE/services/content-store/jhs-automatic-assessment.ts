import type { LearningContent } from '../../packages/content';
import type { CompetencyDefinition } from '../../packages/curriculum';
import { getFrameworkCompetencyRegistration } from '../../packages/curriculum-framework';
import { buildTopic, type Question, type State, type Text } from './authored-builder';
import { OPTIONAL_TEACHER_EXTENSION, RETIRED_ITEM } from './evidence-role';
import { JHS_AUTOMATIC_TOPICS } from './jhs-automatic-items';
import { jhsSequence } from './jhs-sequence';

/*
 * Basic 7-9 Step 0 (owner direction, 24 Oct 2026): Basic 7-9 learns and
 * reaches mastery through the same automatic adaptive assessment as
 * Basic 4-6. For every authored topic this module
 * - adds automatically marked questions (practice, 2 diagnostic,
 *   2 reassessment, 2 retention, 2 transfer) built with buildTopic, every
 *   wrong option mapped to a named misconception;
 * - keeps the earlier teacher-reviewed tasks as optional extensions and
 *   retires the earlier automatic items (same ids, never selected);
 * - links each topic to the previous scoped indicator of its NaCCA content
 *   standard (the Basic 5 English rule), and records understanding-only
 *   scope where a performance is not assessed.
 * Mastery thresholds and policies are unchanged.
 */

/** A wrong option: English, French, misconception id, diagnostic state. */
export type JhsWrongOption = readonly [string, string, string, State];

/** One automatically marked question. `right` is the correct option. */
export interface JhsAutoItem {
  q: Text;
  right: readonly [string, string];
  wrong: readonly JhsWrongOption[];
}

export interface JhsAutomaticTopic {
  /* The indicator also asks for a performance FILUMIRE does not capture. */
  scope?: 'understanding_only';
  practice: JhsAutoItem;
  diagnostic: readonly [JhsAutoItem, JhsAutoItem];
  reassessment: readonly [JhsAutoItem, JhsAutoItem];
  retention: readonly [JhsAutoItem, JhsAutoItem];
  transfer: readonly [JhsAutoItem, JhsAutoItem];
}

export const JHS_AUTOMATIC_VERSION = 'ccp-automatic-1';
const AUTO_SLUG = 'ccp-auto-';

function topicFor(competencyId: string): JhsAutomaticTopic {
  const topic = JHS_AUTOMATIC_TOPICS[competencyId];
  if (!topic) throw new Error(`No automatic assessment authored: ${competencyId}`);
  return topic;
}

function items(topic: JhsAutomaticTopic): JhsAutoItem[] {
  return [topic.practice, ...topic.diagnostic, ...topic.reassessment, ...topic.retention, ...topic.transfer];
}

/** Source-backed live sequence; adding a bridge never mutates primary definitions. */
export function jhsProgression(competencyId: string): { prerequisites: string[]; successors: string[] } {
  return jhsSequence(competencyId);
}

export function automateJhsCompetencies(definitions: CompetencyDefinition[]): CompetencyDefinition[] {
  return definitions.map(definition => {
    const topic = topicFor(definition.id);
    const progression = jhsProgression(definition.id);
    const { assessmentScope: _scope, ...rest } = definition;
    return {
      ...rest,
      prerequisiteCompetencyIds: progression.prerequisites,
      successorCompetencyIds: progression.successors,
      misconceptions: [...new Set(items(topic).flatMap(item => item.wrong.map(w => w[2])))],
      ...(topic.scope ? { assessmentScope: topic.scope } : {}),
    };
  });
}

const TITLE: Text = { en: 'Check your understanding', fr: 'Vérifie ta compréhension' };

function question(key: string, item: JhsAutoItem, code: string, subskills: string[], purpose?: Question['purpose']): Question {
  return {
    key, purpose, title: TITLE, body: item.q,
    options: { en: [item.right[0], ...item.wrong.map(w => w[0])], fr: [item.right[1], ...item.wrong.map(w => w[1])] },
    answer: 0,
    rules: Object.fromEntries(item.wrong.map((w, i) => [i + 1, [w[2], w[3]] as const])),
    code, subskills, criteria: ['Choose the answer the lesson supports and reject the misconceptions'], contexts: [key],
  };
}

function automaticItems(competency: CompetencyDefinition, existing: LearningContent[]): LearningContent[] {
  const topic = topicFor(competency.id);
  const source = getFrameworkCompetencyRegistration(competency.id);
  if (!source) throw new Error(`Unknown Basic 7-9 source: ${competency.id}`);
  const level = `b${source.gradeId.match(/basic-(\d)/)![1]}`;
  const code = source.officialCode;
  const purposes = ['diagnostic', 'reassessment', 'retention', 'transfer'] as const;
  const built = buildTopic({
    competencyId: competency.id, slug: `${AUTO_SLUG}${competency.id}`, version: JHS_AUTOMATIC_VERSION, level,
    source: `${source.source.url}#page=${source.source.pdfPages[0]}; SHA-256 ${source.source.sha256}`, defaultCode: code,
  }, [], question('practice', topic.practice, code, competency.subskills),
  purposes.flatMap(purpose => topic[purpose].map((item, n) => question(`${purpose}-${n + 1}`, item, code, competency.subskills, purpose))));
  return built.map(item => {
    const lesson = existing.find(c => c.type === 'lesson' && c.language === item.language);
    if (!lesson) throw new Error(`No lesson for automatic practice: ${competency.id} ${item.language}`);
    return {
      ...item,
      prerequisiteContentIds: item.type === 'practice' ? [lesson.id] : item.prerequisiteContentIds,
      metadata: {
        ...item.metadata,
        sourceDocumentSha256: source.source.sha256, sourcePdfPage: String(source.source.pdfPages[0]),
        sourceIssueIds: JSON.stringify([...source.sourceIssueIds, ...source.globalSourceIssueIds]),
        authoringStatus: 'draft_automatic_assessment', educatorApproval: 'pending', frenchApproval: 'pending',
        ...(item.type === 'practice' ? { evidenceIndependence: 'guided' } : {}),
      },
    };
  });
}

/** Idempotent: a competency that already has automatic items is left as it is. */
export function automateJhsContent(records: LearningContent[], competencies: CompetencyDefinition[]): LearningContent[] {
  const targets = competencies.filter(c => !records.some(r => r.competencyId === c.id && r.id.includes(`-${AUTO_SLUG}`)));
  const ids = new Set(targets.map(c => c.id));
  const kept = records.map(record => !ids.has(record.competencyId) || !record.assessmentItemId ? record : {
    ...record,
    metadata: {
      ...record.metadata,
      evidenceRole: record.metadata?.evaluationMethod === 'trusted_rubric_evaluation' ? OPTIONAL_TEACHER_EXTENSION : RETIRED_ITEM,
    },
  });
  return [...kept, ...targets.flatMap(c => automaticItems(c, records.filter(r => r.competencyId === c.id)))];
}
