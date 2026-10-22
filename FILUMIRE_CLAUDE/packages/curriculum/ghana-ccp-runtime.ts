import basic7 from '../curriculum-framework/ghana-b7-ccp-data.json';
import basic89 from '../curriculum-framework/ghana-b89-ccp-data.json';
import type { CurriculumFramework, EducationSystem, LearningLevel, Subject, Strand, SubStrand, ContentStandard, LearningIndicator } from './index';

export const GHANA_CCP_RUNTIME_ID = 'curriculum-gh-nacca-ccp-2020';
export const GHANA_CCP_EDUCATION_SYSTEM_ID = 'education-system-gh-jhs-ccp';
export const CCP_RUNTIME_FRAMEWORK: CurriculumFramework = {
  id: GHANA_CCP_RUNTIME_ID, name: 'Ghana NaCCA Common Core Programme', countryOrRegion: 'Ghana', version: '2020',
};
export const CCP_EDUCATION_SYSTEM: EducationSystem = {
  id: GHANA_CCP_EDUCATION_SYSTEM_ID, curriculumFrameworkId: GHANA_CCP_RUNTIME_ID,
  name: 'Ghana Junior High School', description: 'Inactive CCP foundation; source registration does not authorise learner placement.',
};
export const CCP_RUNTIME_LEVELS: LearningLevel[] = [7, 8, 9].map(order => ({
  id: `level-gh-basic-${order}-ccp`, educationSystemId: GHANA_CCP_EDUCATION_SYSTEM_ID, name: `Basic ${order}`, order,
}));
export const CCP_RUNTIME_SUBJECTS: Subject[] = [...basic7.subjects, ...basic89.subjects].map(s => ({
  id: s.id, learningLevelId: s.gradeId, name: s.name, code: s.code,
}));
export const CCP_SOURCE_REGISTRATIONS = [...basic7.competencies, ...basic89.competencies];
const sourceIssues = [...basic7.sourceIssues, ...basic89.originalSourceIssues.issues];
/** Clarification flags remain part of provenance. Unknown/unresolved row issues block authoring. */
export function getCcpBlockingSourceIssueIds(issueIds: readonly string[]): string[] {
  return issueIds.filter(id => !sourceIssues.find(issue => issue.id === id)?.status.startsWith('resolved'));
}
type Node = { id: string; subjectId: string; parentNodeId?: string; nodeType: string; title: string; code?: string; order: number };
const nodes: Node[] = [...basic7.nodes, ...basic89.nodes];
export const CCP_RUNTIME_STRANDS: Strand[] = nodes.filter(n => n.nodeType === 'strand').map(n => ({ id: n.id, subjectId: n.subjectId, name: n.title, code: n.code ?? '', order: n.order }));
export const CCP_RUNTIME_SUBSTRANDS: SubStrand[] = nodes.filter(n => n.nodeType === 'sub_strand').map(n => ({ id: n.id, strandId: n.parentNodeId!, name: n.title, code: n.code ?? '', order: n.order }));
export const CCP_RUNTIME_STANDARDS: ContentStandard[] = nodes.filter(n => n.nodeType === 'content_standard').map(n => ({ id: n.id, subStrandId: n.parentNodeId!, title: n.title, description: n.title }));
export const CCP_RUNTIME_INDICATORS: LearningIndicator[] = nodes.filter(n => n.nodeType === 'learning_indicator').map(n => ({ id: n.id, contentStandardId: n.parentNodeId!, statement: n.title, order: n.order }));
