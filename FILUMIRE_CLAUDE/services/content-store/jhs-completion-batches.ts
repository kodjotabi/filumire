import { getFrameworkCompetencyRegistration } from '../../packages/curriculum-framework';
import { GHANA_CCP_RUNTIME_ID, GHANA_CCP_EDUCATION_SYSTEM_ID, getCcpBlockingSourceIssueIds } from '../../packages/curriculum/ghana-ccp-runtime';
import type { CompetencyDefinition } from '../../packages/curriculum';
import type { LearningContent } from '../../packages/content';
import { competency as existingPolicy } from './ghana-b7-materials-pilot';
import { buildJhsContent } from './jhs-learning-builder';
import { automateJhsCompetencies, automateJhsContent } from './jhs-automatic-assessment';
import { B7_SCIENCE_FOUNDATIONS } from './jhs-b7-science-foundations';
import { B7_SCIENCE_SYSTEMS } from './jhs-b7-science-systems';
import { B7_SCIENCE_ENERGY } from './jhs-b7-science-energy';

// Never imported by production content seeds. No grade/capability is activated here.
function batch(id: string, units: typeof B7_SCIENCE_FOUNDATIONS) {
  const sources = units.map(unit => {
    const source = getFrameworkCompetencyRegistration(unit.id);
    if (!source || getCcpBlockingSourceIssueIds(source.sourceIssueIds).length) throw new Error(`Unresolved source cannot be authored: ${unit.id}`);
    return source;
  });
  const competencies: CompetencyDefinition[] = automateJhsCompetencies(sources.map((source, i) => ({
    ...existingPolicy, id: source.id, curriculumFrameworkId: GHANA_CCP_RUNTIME_ID, educationSystemId: GHANA_CCP_EDUCATION_SYSTEM_ID,
    learningLevelId: source.gradeId, subjectId: source.subjectId, strandId: source.hierarchy.strandId, subStrandId: source.hierarchy.subStrandId,
    contentStandardId: source.hierarchy.contentStandardId, learningIndicatorId: source.curriculumNodeId, title: source.title, description: source.title,
    prerequisiteCompetencyIds: [], successorCompetencyIds: [], relatedCompetencyIds: [],
    subskills: units[i].subskills!, misconceptions: [units[i].misconception!],
  })));
  const content: LearningContent[] = automateJhsContent(buildJhsContent(units, sources, competencies).map(item => ({ ...item,
    metadata: { ...item.metadata, authoringStatus: 'draft_subject_batch', batchId: id, educatorApproval: 'pending', frenchApproval: 'pending' },
  })), competencies).map(item => ({ ...item, metadata: { ...item.metadata, batchId: id } }));
  return { id, units, sources, competencies, content };
}
export const JHS_COMPLETION_BATCHES = [
  batch('batch02-b7-science-foundations', B7_SCIENCE_FOUNDATIONS),
  batch('batch03-b7-science-systems', B7_SCIENCE_SYSTEMS),
  batch('batch04-b7-science-energy', B7_SCIENCE_ENERGY),
];
export function getJhsCompletionBatch(id: string) {
  const result = JHS_COMPLETION_BATCHES.find(b => b.id === id);
  if (!result) throw new Error(`Unknown JHS completion batch: ${id}`);
  return result;
}
