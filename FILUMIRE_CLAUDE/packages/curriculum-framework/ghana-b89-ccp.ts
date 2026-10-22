import data from './ghana-b89-ccp-data.json';
import type { CurriculumNode, FrameworkSubject } from './index';
import type { FrameworkCompetencyRegistration, CurriculumSourceIssue } from './ghana-b7-ccp';

/** Source-only structures. Registration conveys no learner entitlement or mastery. */
export const GHANA_B89_CCP_REGISTRY = {
  subjects: data.subjects as FrameworkSubject[],
  nodes: data.nodes as CurriculumNode[],
  competencies: data.competencies as FrameworkCompetencyRegistration[],
  originalSourceIssues: data.originalSourceIssues,
  sourceIssues: data.originalSourceIssues.issues.map(i => ({ ...i, decision: null })) as CurriculumSourceIssue[],
};
