import { buildJhsContent } from "./jhs-learning-builder";
import { getFrameworkCompetencyRegistration } from '../../packages/curriculum-framework';
import { GHANA_CCP_RUNTIME_ID, GHANA_CCP_EDUCATION_SYSTEM_ID } from '../../packages/curriculum/ghana-ccp-runtime';
import type { CompetencyDefinition } from '../../packages/curriculum';
import type { LearningContent } from '../../packages/content';
import { competency as policy } from './ghana-b7-materials-pilot';
import { JHS_PREVIEW_UNITS } from './jhs-preview-units';
import { MATERIALS_SOURCES, MATERIALS_COMPETENCIES, MATERIALS_BATCH_CONTENT } from './ghana-b7-science-materials-batch';
import { automateJhsCompetencies, automateJhsContent } from './jhs-automatic-assessment';

/** Draft representative journeys. Not imported by production seeds or routes.
 * Curriculum mapping, technical testing and educational approval are separate gates.
 */
export const JHS_PREVIEW_SOURCES = [...JHS_PREVIEW_UNITS.map(unit => {
  const source = getFrameworkCompetencyRegistration(unit.id);
  if (!source || source.sourceIssueIds.length) throw new Error(`Preview source requires review: ${unit.id}`);
  return source;
}), ...MATERIALS_SOURCES];
export const JHS_PREVIEW_COMPETENCIES: CompetencyDefinition[] = automateJhsCompetencies(JHS_PREVIEW_SOURCES.map(s => ({
  ...(MATERIALS_COMPETENCIES.find(c => c.id === s.id) ?? policy), id: s.id, curriculumFrameworkId: GHANA_CCP_RUNTIME_ID, educationSystemId: GHANA_CCP_EDUCATION_SYSTEM_ID,
  learningLevelId: s.gradeId, subjectId: s.subjectId, strandId: s.hierarchy.strandId, subStrandId: s.hierarchy.subStrandId,
  contentStandardId: s.hierarchy.contentStandardId, learningIndicatorId: s.curriculumNodeId, title: s.title, description: s.title,
  prerequisiteCompetencyIds: [], successorCompetencyIds: [], relatedCompetencyIds: [],
  subskills: MATERIALS_COMPETENCIES.find(c => c.id === s.id)?.subskills ?? ['explain-the-concept', 'apply-in-source-supported-task', 'justify-independent-work'], misconceptions: MATERIALS_COMPETENCIES.find(c => c.id === s.id)?.misconceptions ?? ['confuses-related-concepts'],
})));
// Materials content is already automatic; automateJhsContent leaves it unchanged.
export const JHS_REPRESENTATIVE_CONTENT: LearningContent[] = automateJhsContent(
  [...buildJhsContent(JHS_PREVIEW_UNITS, JHS_PREVIEW_SOURCES, JHS_PREVIEW_COMPETENCIES), ...MATERIALS_BATCH_CONTENT], JHS_PREVIEW_COMPETENCIES);

