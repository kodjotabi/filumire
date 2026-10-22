import { isPrivateJhsEnabled, privateJhsGrade, privateJhsSubject } from '../curriculum/jhs-private-policy';
import { GHANA_B4_SCIENCE_ADAPTIVE_SPECS } from "../curriculum/ghana-b4-science-adaptive";
import { GHANA_B4_COMPUTING_ADAPTIVE_SPECS } from "../curriculum/ghana-b4-computing-adaptive";
import { GHANA_B5_SCIENCE_PUBLISHED_SPECS } from "../curriculum/ghana-b5-science-adaptive";
import { getGhanaB5ScienceNodes } from "./ghana-b5-science";
import { GHANA_B6_SCIENCE_PUBLISHED_SPECS } from "../curriculum/ghana-b6-science-adaptive";
import { getGhanaB6ScienceNodes } from "./ghana-b6-science";
import { GHANA_B5_COMPUTING_PUBLISHED_SPECS } from "../curriculum/ghana-b5-computing-adaptive";
import { getGhanaB5ComputingNodes } from "./ghana-b5-computing";
import { GHANA_B6_COMPUTING_PUBLISHED_SPECS } from "../curriculum/ghana-b6-computing-adaptive";
import { getGhanaB6ComputingNodes } from "./ghana-b6-computing";
import { GHANA_B5_MATHEMATICS_PUBLISHED_SPECS } from "../curriculum/ghana-b5-mathematics-adaptive";
import { getGhanaB5MathematicsNodes } from "./ghana-b5-mathematics";
import { GHANA_B6_MATHEMATICS_PUBLISHED_SPECS } from "../curriculum/ghana-b6-mathematics-adaptive";
import { getGhanaB6MathematicsNodes } from "./ghana-b6-mathematics";
import { GHANA_B5_ENGLISH_PUBLISHED_SPECS } from "../curriculum/ghana-b5-english-adaptive";
import { getGhanaB5EnglishNodes } from "./ghana-b5-english";
import { GHANA_B6_ENGLISH_PUBLISHED_SPECS } from "../curriculum/ghana-b6-english-adaptive";
import { getGhanaB6EnglishNodes } from "./ghana-b6-english";
import type { CompetencyId } from "../domain";
import { GHANA_B4_ENGLISH_PRODUCTION_SPECS } from "../curriculum/ghana-b4-english-production";
import { GHANA_B4_MATHEMATICS_ADAPTIVE_SPECS } from "../curriculum/ghana-b4-mathematics-adaptive";
import { getGhanaB4EnglishNodes } from "./ghana-b4-english";
import { GHANA_B89_CCP_REGISTRY } from "./ghana-b89-ccp";
import { GHANA_CCP_RUNTIME_ID } from '../curriculum/ghana-ccp-runtime';
import {
  GHANA_B7_CCP_REGISTRY,
  CURRICULUM_VERSION_GHANA_CCP_2020_ID,
  PHASE_GHANA_JHS_CCP_ID,
  GRADE_GHANA_BASIC_7_CCP_ID,
  type CurriculumSourceProvenance,
  type FrameworkCompetencyRegistration,
  type CurriculumSourceIssue,
} from "./ghana-b7-ccp";
export { CURRICULUM_VERSION_GHANA_CCP_2020_ID, PHASE_GHANA_JHS_CCP_ID, GRADE_GHANA_BASIC_7_CCP_ID };
export type { FrameworkCompetencyRegistration, CurriculumSourceIssue, CurriculumSourceProvenance };

const jhsSubjects = [...GHANA_B7_CCP_REGISTRY.subjects, ...GHANA_B89_CCP_REGISTRY.subjects];
const jhsRegistrations = [...GHANA_B7_CCP_REGISTRY.competencies, ...GHANA_B89_CCP_REGISTRY.competencies];

import {
  GHANA_MATH_PILOT_CURRICULUM_ID,
  GHANA_MATH_PILOT_LEVEL_ID,
  GHANA_MATH_PILOT_SUBJECT_ID,
  GHANA_SCIENCE_B4_ANIMAL_CLASSIFICATION_COMPETENCY_ID,
  GHANA_SCIENCE_PILOT_SUBJECT_ID,
  GHANA_B5_PILOT_LEVEL_ID,
  GHANA_B5_SCIENCE_PILOT_SUBJECT_ID,
  GHANA_B6_PILOT_LEVEL_ID,
  GHANA_B6_SCIENCE_PILOT_SUBJECT_ID,
  GHANA_B5_COMPUTING_PILOT_SUBJECT_ID,
  GHANA_B6_COMPUTING_PILOT_SUBJECT_ID,
  GHANA_B5_MATHEMATICS_PILOT_SUBJECT_ID,
  GHANA_B6_MATHEMATICS_PILOT_SUBJECT_ID,
  GHANA_B5_ENGLISH_PILOT_SUBJECT_ID,
  GHANA_B6_ENGLISH_PILOT_SUBJECT_ID,
  getInitialCompetencyForCurriculumSubjectLevel,
} from "../curriculum";

import {
  getGhanaB4MathematicsAdditionalNodes,
} from "./ghana-b4-mathematics";

import {
  getGhanaB4ScienceNodes,
} from "./ghana-b4-science";
import {
  getGhanaB4ComputingNodes,
} from "./ghana-b4-computing";

/*
 * ============================================================
 * LAYER 1 - CURRICULUM KNOWLEDGE
 * ============================================================
 */

export type CountryId = string;
export type CurriculumId = string;
export type CurriculumVersionId = string;
export type PhaseId = string;
export type FrameworkGradeId = string;
export type FrameworkSubjectId = string;
export type CurriculumNodeId = string;

export type CurriculumNodeType =
  | "strand"
  | "sub_strand"
  | "content_standard"
  | "learning_outcome"
  | "learning_indicator"
  | "objective"
  | "other";

export interface Country {
  id: CountryId;
  name: string;
  isoCode: string;
}

export interface Curriculum {
  id: CurriculumId;
  countryId: CountryId;
  name: string;
  description?: string;
}

export interface CurriculumVersion {
  id: CurriculumVersionId;
  curriculumId: CurriculumId;
  name: string;
  isActive: boolean;
  runtimeFrameworkId?: string;
}

export interface Phase {
  id: PhaseId;
  curriculumVersionId: CurriculumVersionId;
  name: string;
  order: number;
}

export interface FrameworkGrade {
  id: FrameworkGradeId;
  phaseId: PhaseId;
  name: string;
  order: number;
  learnerVisibility?: "visible" | "hidden";
  supportStatus?: "unsupported";
}

/*
 * Stable subject-type identifier shared by every grade's
 * instance of a subject (for example "english" for Basic 4, 5
 * and 6 English). Data relationships use subject ids; this is
 * what presentation layers key on instead of display names.
 */
export type SubjectDisciplineId = string;

export interface FrameworkSubject {
  id: FrameworkSubjectId;
  gradeId: FrameworkGradeId;
  name: string;
  code: string;
  discipline: SubjectDisciplineId;
}

export interface CurriculumNode {
  id: CurriculumNodeId;
  subjectId: FrameworkSubjectId;
  parentNodeId?: CurriculumNodeId;
  nodeType: CurriculumNodeType;
  code?: string;
  title: string;
  description?: string;
  sourceReference?: string;
  order: number;
  source?: CurriculumSourceProvenance;
  officialTitle?: string | null;
  structuralKey?: string;
  reviewFlags?: string[];
}

export interface ResolvedCurriculumContext {
  country: Country;
  curriculum: Curriculum;
  curriculumVersion: CurriculumVersion;
  phase: Phase;
  grade: FrameworkGrade;
  subject: FrameworkSubject;
}

/*
 * ============================================================
 * SUBJECT CAPABILITY
 * ============================================================
 */

export type SubjectCapabilityStatus =
  | "full"
  | "partial"
  | "unsupported";

export interface SubjectCapability {
  subjectId: FrameworkSubjectId;
  status: SubjectCapabilityStatus;
  notes?: string;
}

/*
 * ============================================================
 * LAYER 2 - CURRICULUM <-> COMPETENCY MAPPING
 * ============================================================
 */

export type CurriculumCompetencyRelationshipKind =
  | "direct"
  | "partial"
  | "supports";

export interface CurriculumCompetencyMapping {
  id: string;
  curriculumNodeId: CurriculumNodeId;
  competencyId: CompetencyId;
  relationship: CurriculumCompetencyRelationshipKind;
}

export type CompetencyRelationshipType =
  | "prerequisite"
  | "supports"
  | "extends"
  | "related";

export interface CompetencyRelationship {
  id: string;
  fromCompetencyId: CompetencyId;
  toCompetencyId: CompetencyId;
  type: CompetencyRelationshipType;
  strength?: number;
}

/*
 * ============================================================
 * GHANA CURRICULUM ADAPTER
 * ============================================================
 */

export const COUNTRY_GHANA_ID = "country-gh";

export const CURRICULUM_GHANA_ID =
  GHANA_MATH_PILOT_CURRICULUM_ID;

export const CURRICULUM_VERSION_GHANA_PILOT_V1_ID =
  "curriculum-version-gh-pilot-v1";

export const PHASE_GHANA_BASIC_EDUCATION_ID =
  "phase-gh-basic-education";

export const GRADE_GHANA_BASIC_4_ID =
  GHANA_MATH_PILOT_LEVEL_ID;

export const SUBJECT_GHANA_BASIC4_MATH_ID =
  GHANA_MATH_PILOT_SUBJECT_ID;

export const SUBJECT_GHANA_BASIC4_ENGLISH_ID =
  "subject-gh-basic4-english-pilot";

export const SUBJECT_GHANA_BASIC4_SCIENCE_ID =
  GHANA_SCIENCE_PILOT_SUBJECT_ID;

export const GRADE_GHANA_BASIC_5_ID =
  GHANA_B5_PILOT_LEVEL_ID;

export const SUBJECT_GHANA_BASIC5_SCIENCE_ID =
  GHANA_B5_SCIENCE_PILOT_SUBJECT_ID;

export const GRADE_GHANA_BASIC_6_ID =
  GHANA_B6_PILOT_LEVEL_ID;

export const SUBJECT_GHANA_BASIC6_SCIENCE_ID =
  GHANA_B6_SCIENCE_PILOT_SUBJECT_ID;

export const SUBJECT_GHANA_BASIC5_COMPUTING_ID =
  GHANA_B5_COMPUTING_PILOT_SUBJECT_ID;

export const SUBJECT_GHANA_BASIC6_COMPUTING_ID =
  GHANA_B6_COMPUTING_PILOT_SUBJECT_ID;

export const SUBJECT_GHANA_BASIC5_MATHEMATICS_ID =
  GHANA_B5_MATHEMATICS_PILOT_SUBJECT_ID;

export const SUBJECT_GHANA_BASIC6_MATHEMATICS_ID =
  GHANA_B6_MATHEMATICS_PILOT_SUBJECT_ID;

export const SUBJECT_GHANA_BASIC5_ENGLISH_ID =
  GHANA_B5_ENGLISH_PILOT_SUBJECT_ID;

export const SUBJECT_GHANA_BASIC6_ENGLISH_ID =
  GHANA_B6_ENGLISH_PILOT_SUBJECT_ID;

export const SUBJECT_GHANA_BASIC4_COMPUTING_ID =
  "subject-gh-basic4-computing-pilot";

export const CURRICULUM_NODE_GH_B4_SCIENCE_1_1_1_1_1_ID =
  "node-gh-b4-science-b4.1.1.1.1";

/*
 * Existing pilot-authored nodes.
 * These remain for compatibility with the architecture already
 * validated and any historical mappings that may depend on them.
 */

export const CURRICULUM_NODE_GH_PATTERNS_001_ID =
  "node-gh-b4-number-patterns-001";

export const CURRICULUM_NODE_GH_PATTERNS_002_ID =
  "node-gh-b4-number-patterns-002";

export const CURRICULUM_NODE_GH_PATTERNS_003_ID =
  "node-gh-b4-number-patterns-003";

/*
 * Authoritative NaCCA B4 Mathematics nodes.
 *
 * Source:
 * NaCCA Mathematics Curriculum for Primary Schools,
 * Basic 4-6, September 2019.
 *
 * These nodes establish authoritative curriculum structure.
 * FILUMIRE competencies remain independent adaptive-learning
 * units and are mapped to these official nodes below.
 */

export const CURRICULUM_NODE_GH_B4_MATH_ALGEBRA_ID =
  "node-gh-b4-math-algebra";

export const CURRICULUM_NODE_GH_B4_MATH_PATTERNS_ID =
  "node-gh-b4-math-algebra-patterns-relationships";

export const CURRICULUM_NODE_GH_B4_2_1_1_ID =
  "node-gh-b4-math-b4.2.1.1";

export const CURRICULUM_NODE_GH_B4_2_1_1_1_ID =
  "node-gh-b4-math-b4.2.1.1.1";

export const CURRICULUM_NODE_GH_B4_2_1_1_2_ID =
  "node-gh-b4-math-b4.2.1.1.2";

export const CURRICULUM_NODE_GH_B4_2_1_1_3_ID =
  "node-gh-b4-math-b4.2.1.1.3";

export const CURRICULUM_NODE_GH_B4_2_1_3_ID =
  "node-gh-b4-math-b4.2.1.3";

export const CURRICULUM_NODE_GH_B4_2_1_3_1_ID =
  "node-gh-b4-math-b4.2.1.3.1";

export const CURRICULUM_NODE_GH_B4_2_1_3_2_ID =
  "node-gh-b4-math-b4.2.1.3.2";

const NACCA_B4_MATH_SOURCE =
  "NaCCA Mathematics Curriculum for Primary Schools, Basic 4-6, September 2019";

const countries: Country[] = [
  {
    id: COUNTRY_GHANA_ID,
    name: "Ghana",
    isoCode: "GH",
  },
];

const curricula: Curriculum[] = [
  {
    id: CURRICULUM_GHANA_ID,
    countryId: COUNTRY_GHANA_ID,
    name: "Ghana Basic Education curriculum representation",
    description:
      "FILUMIRE curriculum representation containing both compatibility pilot nodes and explicitly source-backed NaCCA curriculum nodes.",
  },
];

const curriculumVersions: CurriculumVersion[] = [
  {
    id: CURRICULUM_VERSION_GHANA_CCP_2020_ID,
    curriculumId: CURRICULUM_GHANA_ID,
    name: "Ghana NaCCA Common Core Programme (September 2020)",
    runtimeFrameworkId: GHANA_CCP_RUNTIME_ID,
    isActive: false,
  },
  {
    id: CURRICULUM_VERSION_GHANA_PILOT_V1_ID,
    curriculumId: CURRICULUM_GHANA_ID,
    name: "Ghana curriculum representation v1",
    isActive: true,
  },
];

const phases: Phase[] = [
  { id: PHASE_GHANA_JHS_CCP_ID, curriculumVersionId: CURRICULUM_VERSION_GHANA_CCP_2020_ID, name: "Junior High School (Common Core Programme)", order: 2 },
  {
    id: PHASE_GHANA_BASIC_EDUCATION_ID,
    curriculumVersionId:
      CURRICULUM_VERSION_GHANA_PILOT_V1_ID,
    name: "Basic Education",
    order: 1,
  },
];

const grades: FrameworkGrade[] = [
  ...[8, 9].map(order => ({ id: `level-gh-basic-${order}-ccp`, phaseId: PHASE_GHANA_JHS_CCP_ID, name: `Basic ${order}`, order, learnerVisibility: "hidden" as const, supportStatus: "unsupported" as const })),
  { id: GRADE_GHANA_BASIC_7_CCP_ID, phaseId: PHASE_GHANA_JHS_CCP_ID, name: "Basic 7", order: 7, learnerVisibility: "hidden", supportStatus: "unsupported" },
  {
    id: GRADE_GHANA_BASIC_4_ID,
    phaseId: PHASE_GHANA_BASIC_EDUCATION_ID,
    name: "Basic 4",
    order: 4,
  },
  {
    id: GRADE_GHANA_BASIC_5_ID,
    phaseId: PHASE_GHANA_BASIC_EDUCATION_ID,
    name: "Basic 5",
    order: 5,
  },
  {
    id: GRADE_GHANA_BASIC_6_ID,
    phaseId: PHASE_GHANA_BASIC_EDUCATION_ID,
    name: "Basic 6",
    order: 6,
  },
];

const subjects: FrameworkSubject[] = [
  ...jhsSubjects,
  {
    id: SUBJECT_GHANA_BASIC4_MATH_ID,
    gradeId: GRADE_GHANA_BASIC_4_ID,
    name: "Mathematics",
    code: "GH-B4-MATH",
    discipline: "mathematics",
  },
  {
    id: SUBJECT_GHANA_BASIC4_ENGLISH_ID,
    gradeId: GRADE_GHANA_BASIC_4_ID,
    name: "English Language",
    code: "GH-B4-ENG",
    discipline: "english",
  },
  {
    id: SUBJECT_GHANA_BASIC4_SCIENCE_ID,
    gradeId: GRADE_GHANA_BASIC_4_ID,
    name: "Science",
    code: "GH-B4-SCI",
    discipline: "science",
  },
  {
    id: SUBJECT_GHANA_BASIC4_COMPUTING_ID,
    gradeId: GRADE_GHANA_BASIC_4_ID,
    name: "Computing",
    code: "GH-B4-COMP",
    discipline: "computing",
  },
  {
    id: SUBJECT_GHANA_BASIC5_SCIENCE_ID,
    gradeId: GRADE_GHANA_BASIC_5_ID,
    name: "Science",
    code: "GH-B5-SCI",
    discipline: "science",
  },
  {
    id: SUBJECT_GHANA_BASIC6_SCIENCE_ID,
    gradeId: GRADE_GHANA_BASIC_6_ID,
    name: "Science",
    code: "GH-B6-SCI",
    discipline: "science",
  },
  {
    id: SUBJECT_GHANA_BASIC5_COMPUTING_ID,
    gradeId: GRADE_GHANA_BASIC_5_ID,
    name: "Computing",
    code: "GH-B5-COMP",
    discipline: "computing",
  },
  {
    id: SUBJECT_GHANA_BASIC6_COMPUTING_ID,
    gradeId: GRADE_GHANA_BASIC_6_ID,
    name: "Computing",
    code: "GH-B6-COMP",
    discipline: "computing",
  },
  {
    id: SUBJECT_GHANA_BASIC5_MATHEMATICS_ID,
    gradeId: GRADE_GHANA_BASIC_5_ID,
    name: "Mathematics",
    code: "GH-B5-MATH",
    discipline: "mathematics",
  },
  {
    id: SUBJECT_GHANA_BASIC6_MATHEMATICS_ID,
    gradeId: GRADE_GHANA_BASIC_6_ID,
    name: "Mathematics",
    code: "GH-B6-MATH",
    discipline: "mathematics",
  },
  {
    id: SUBJECT_GHANA_BASIC5_ENGLISH_ID,
    gradeId: GRADE_GHANA_BASIC_5_ID,
    name: "English Language",
    code: "GH-B5-ENG",
    discipline: "english",
  },
  {
    id: SUBJECT_GHANA_BASIC6_ENGLISH_ID,
    gradeId: GRADE_GHANA_BASIC_6_ID,
    name: "English Language",
    code: "GH-B6-ENG",
    discipline: "english",
  },
];

const subjectCapabilities: SubjectCapability[] = [
  ...jhsSubjects.map((subject) => ({ subjectId: subject.id, status: "unsupported" as const, notes: "Source framework registered only. No CCP learner placement, lessons or assessments are activated." })),
  {
    subjectId: SUBJECT_GHANA_BASIC4_MATH_ID,
    status: "partial",
    notes:
      "FILUMIRE currently implements only a source-backed subset of the NaCCA Basic 4 Mathematics curriculum.",
  },
  {
    subjectId: SUBJECT_GHANA_BASIC4_ENGLISH_ID,
    status: "partial",
    notes:
      "Adaptive coverage is implemented for all modelled NaCCA Basic 4 English learning indicators. Full capability is not claimed because richer oral, observed-performance and constructed-response evidence still requires production trusted evaluator implementations.",
  },
  {
    subjectId: SUBJECT_GHANA_BASIC4_SCIENCE_ID,
    status: "full",
    notes:
      "FILUMIRE implements adaptive coverage for all modelled NaCCA Basic 4 Science learning indicators.",
  },
  {
    subjectId: SUBJECT_GHANA_BASIC4_COMPUTING_ID,
    status: "full",
    notes:
      "FILUMIRE implements adaptive coverage for all modelled NaCCA Basic 4 Computing learning indicators.",
  },
  {
    subjectId: SUBJECT_GHANA_BASIC5_SCIENCE_ID,
    status: "partial",
    notes:
      "Basic 5 Science is being built topic by topic. Only topics with authored and verified content are available to learners.",
  },
  {
    subjectId: SUBJECT_GHANA_BASIC6_SCIENCE_ID,
    status: "partial",
    notes:
      "Basic 6 Science is being built topic by topic. Only topics with authored and verified content are available to learners.",
  },
  {
    subjectId: SUBJECT_GHANA_BASIC5_COMPUTING_ID,
    status: "partial",
    notes:
      "Basic 5 Computing is being built topic by topic. Only topics with authored and verified content are available to learners.",
  },
  {
    subjectId: SUBJECT_GHANA_BASIC6_COMPUTING_ID,
    status: "partial",
    notes:
      "Basic 6 Computing is being built topic by topic. Only topics with authored and verified content are available to learners.",
  },
  {
    subjectId: SUBJECT_GHANA_BASIC5_MATHEMATICS_ID,
    status: "partial",
    notes:
      "Basic 5 Mathematics is being built topic by topic. Only topics with authored and verified content are available to learners.",
  },
  {
    subjectId: SUBJECT_GHANA_BASIC6_MATHEMATICS_ID,
    status: "partial",
    notes:
      "Basic 6 Mathematics is being built topic by topic. Only topics with authored and verified content are available to learners.",
  },
  {
    subjectId: SUBJECT_GHANA_BASIC5_ENGLISH_ID,
    status: "partial",
    notes:
      "All 134 NaCCA Basic 5 English learning indicators have authored and verified content. Full capability is not claimed because oral, observed-performance and constructed-response evidence still requires production trusted evaluator implementations.",
  },
  {
    subjectId: SUBJECT_GHANA_BASIC6_ENGLISH_ID,
    status: "partial",
    notes:
      "All 134 NaCCA Basic 6 English learning indicators have authored and verified content. Full capability is not claimed because oral, observed-performance and constructed-response evidence still requires production trusted evaluator implementations.",
  },
];

const curriculumNodes: CurriculumNode[] = [
  ...GHANA_B7_CCP_REGISTRY.nodes,
  ...GHANA_B89_CCP_REGISTRY.nodes,
  /*
   * Compatibility pilot nodes
   */
  {
    id: CURRICULUM_NODE_GH_PATTERNS_001_ID,
    subjectId: SUBJECT_GHANA_BASIC4_MATH_ID,
    nodeType: "other",
    title: "Continue Simple Number Patterns",
    description: "Legacy FILUMIRE pilot-authored curriculum node.",
    order: 9001,
  },
  {
    id: CURRICULUM_NODE_GH_PATTERNS_002_ID,
    subjectId: SUBJECT_GHANA_BASIC4_MATH_ID,
    nodeType: "other",
    title: "Describe Number Pattern Rules",
    description: "Legacy FILUMIRE pilot-authored curriculum node.",
    order: 9002,
  },
  {
    id: CURRICULUM_NODE_GH_PATTERNS_003_ID,
    subjectId: SUBJECT_GHANA_BASIC4_MATH_ID,
    nodeType: "other",
    title: "Apply Number Patterns in Context",
    description: "Legacy FILUMIRE pilot-authored curriculum node.",
    order: 9003,
  },

  /*
   * Existing authoritative NaCCA hierarchy
   */
  {
    id: CURRICULUM_NODE_GH_B4_MATH_ALGEBRA_ID,
    subjectId: SUBJECT_GHANA_BASIC4_MATH_ID,
    nodeType: "strand",
    code: "B4.2",
    title: "Algebra",
    sourceReference: NACCA_B4_MATH_SOURCE,
    order: 2,
  },
  {
    id: CURRICULUM_NODE_GH_B4_MATH_PATTERNS_ID,
    subjectId: SUBJECT_GHANA_BASIC4_MATH_ID,
    parentNodeId: CURRICULUM_NODE_GH_B4_MATH_ALGEBRA_ID,
    nodeType: "sub_strand",
    code: "B4.2.1",
    title: "Patterns and Relationships",
    sourceReference: NACCA_B4_MATH_SOURCE,
    order: 1,
  },
  {
    id: CURRICULUM_NODE_GH_B4_2_1_1_ID,
    subjectId: SUBJECT_GHANA_BASIC4_MATH_ID,
    parentNodeId: CURRICULUM_NODE_GH_B4_MATH_PATTERNS_ID,
    nodeType: "content_standard",
    code: "B4.2.1.1",
    title:
      "Identify and describe patterns found in tables and charts",
    description:
      "Demonstrate an understanding of how to identify and describe patterns found in tables and charts, including a multiplication chart.",
    sourceReference: NACCA_B4_MATH_SOURCE,
    order: 1,
  },
  {
    id: CURRICULUM_NODE_GH_B4_2_1_1_1_ID,
    subjectId: SUBJECT_GHANA_BASIC4_MATH_ID,
    parentNodeId: CURRICULUM_NODE_GH_B4_2_1_1_ID,
    nodeType: "learning_indicator",
    code: "B4.2.1.1.1",
    title: "Describe patterns in a table or chart",
    description:
      "Describe the pattern found in a given table or chart.",
    sourceReference: NACCA_B4_MATH_SOURCE,
    order: 1,
  },
  {
    id: CURRICULUM_NODE_GH_B4_2_1_1_2_ID,
    subjectId: SUBJECT_GHANA_BASIC4_MATH_ID,
    parentNodeId: CURRICULUM_NODE_GH_B4_2_1_1_ID,
    nodeType: "learning_indicator",
    code: "B4.2.1.1.2",
    title: "Determine missing elements in a table or chart",
    description:
      "Determine the missing element(s) in a given table or chart.",
    sourceReference: NACCA_B4_MATH_SOURCE,
    order: 2,
  },
  {
    id: CURRICULUM_NODE_GH_B4_2_1_1_3_ID,
    subjectId: SUBJECT_GHANA_BASIC4_MATH_ID,
    parentNodeId: CURRICULUM_NODE_GH_B4_2_1_1_ID,
    nodeType: "learning_indicator",
    code: "B4.2.1.1.3",
    title: "Identify errors in a table or chart",
    description:
      "Identify the error(s) in a given table or chart.",
    sourceReference: NACCA_B4_MATH_SOURCE,
    order: 3,
  },
  {
    id: CURRICULUM_NODE_GH_B4_2_1_3_ID,
    subjectId: SUBJECT_GHANA_BASIC4_MATH_ID,
    parentNodeId: CURRICULUM_NODE_GH_B4_MATH_PATTERNS_ID,
    nodeType: "content_standard",
    code: "B4.2.1.3",
    title:
      "Represent, describe and extend patterns and relationships",
    description:
      "Represent, describe and extend patterns and relationships, using charts and tables, to solve problems.",
    sourceReference: NACCA_B4_MATH_SOURCE,
    order: 3,
  },
  {
    id: CURRICULUM_NODE_GH_B4_2_1_3_1_ID,
    subjectId: SUBJECT_GHANA_BASIC4_MATH_ID,
    parentNodeId: CURRICULUM_NODE_GH_B4_2_1_3_ID,
    nodeType: "learning_indicator",
    code: "B4.2.1.3.1",
    title: "Translate problem information into a table or chart",
    description:
      "Translate the information in a given problem into a table or chart.",
    sourceReference: NACCA_B4_MATH_SOURCE,
    order: 1,
  },
  {
    id: CURRICULUM_NODE_GH_B4_2_1_3_2_ID,
    subjectId: SUBJECT_GHANA_BASIC4_MATH_ID,
    parentNodeId: CURRICULUM_NODE_GH_B4_2_1_3_ID,
    nodeType: "learning_indicator",
    code: "B4.2.1.3.2",
    title: "Extend patterns to solve a problem",
    description:
      "Identify and extend the patterns in a table or chart to solve a given problem.",
    sourceReference: NACCA_B4_MATH_SOURCE,
    order: 2,
  },

  ...getGhanaB4MathematicsAdditionalNodes(
    SUBJECT_GHANA_BASIC4_MATH_ID,
  ),
  ...getGhanaB4EnglishNodes(SUBJECT_GHANA_BASIC4_ENGLISH_ID),

  ...getGhanaB4ScienceNodes(
    SUBJECT_GHANA_BASIC4_SCIENCE_ID,
  ),
  ...getGhanaB4ComputingNodes(
    SUBJECT_GHANA_BASIC4_COMPUTING_ID,
  ),
  ...getGhanaB5ScienceNodes(
    SUBJECT_GHANA_BASIC5_SCIENCE_ID,
  ),
  ...getGhanaB6ScienceNodes(
    SUBJECT_GHANA_BASIC6_SCIENCE_ID,
  ),
  ...getGhanaB5ComputingNodes(
    SUBJECT_GHANA_BASIC5_COMPUTING_ID,
  ),
  ...getGhanaB6ComputingNodes(
    SUBJECT_GHANA_BASIC6_COMPUTING_ID,
  ),
  ...getGhanaB5MathematicsNodes(
    SUBJECT_GHANA_BASIC5_MATHEMATICS_ID,
  ),
  ...getGhanaB6MathematicsNodes(
    SUBJECT_GHANA_BASIC6_MATHEMATICS_ID,
  ),
  ...getGhanaB5EnglishNodes(
    SUBJECT_GHANA_BASIC5_ENGLISH_ID,
  ),
  ...getGhanaB6EnglishNodes(
    SUBJECT_GHANA_BASIC6_ENGLISH_ID,
  ),
];

const competencyMappings: CurriculumCompetencyMapping[] = [
  ...jhsRegistrations.map((registration) => ({ id: `mapping-${registration.id}`, curriculumNodeId: registration.curriculumNodeId, competencyId: registration.id, relationship: "direct" as const })),
  /*
   * Legacy compatibility mappings
   */
  {
    id: "mapping-gh-b4-patterns-001",
    curriculumNodeId: CURRICULUM_NODE_GH_PATTERNS_001_ID,
    competencyId:
      "competency-gh-math-b4-number-patterns-001",
    relationship: "direct",
  },
  {
    id: "mapping-gh-b4-patterns-002",
    curriculumNodeId: CURRICULUM_NODE_GH_PATTERNS_002_ID,
    competencyId:
      "competency-gh-math-b4-number-patterns-002",
    relationship: "direct",
  },
  {
    id: "mapping-gh-b4-patterns-003",
    curriculumNodeId: CURRICULUM_NODE_GH_PATTERNS_003_ID,
    competencyId:
      "competency-gh-math-b4-number-patterns-003",
    relationship: "direct",
  },

  /*
   * Authoritative NaCCA mappings
   */

  {
    id: "mapping-gh-b4-2-1-1-2-competency-001",
    curriculumNodeId: CURRICULUM_NODE_GH_B4_2_1_1_2_ID,
    competencyId:
      "competency-gh-math-b4-number-patterns-001",
    relationship: "direct",
  },
  {
    id: "mapping-gh-b4-2-1-3-2-competency-001",
    curriculumNodeId: CURRICULUM_NODE_GH_B4_2_1_3_2_ID,
    competencyId:
      "competency-gh-math-b4-number-patterns-001",
    relationship: "supports",
  },
  {
    id: "mapping-gh-b4-2-1-1-1-competency-002",
    curriculumNodeId: CURRICULUM_NODE_GH_B4_2_1_1_1_ID,
    competencyId:
      "competency-gh-math-b4-number-patterns-002",
    relationship: "direct",
  },
  {
    id: "mapping-gh-b4-2-1-3-competency-002",
    curriculumNodeId: CURRICULUM_NODE_GH_B4_2_1_3_ID,
    competencyId:
      "competency-gh-math-b4-number-patterns-002",
    relationship: "supports",
  },
  {
    id: "mapping-gh-b4-2-1-3-2-competency-003",
    curriculumNodeId: CURRICULUM_NODE_GH_B4_2_1_3_2_ID,
    competencyId:
      "competency-gh-math-b4-number-patterns-003",
    relationship: "direct",
  },
  {
    id: "mapping-gh-b4-2-1-3-1-competency-003",
    curriculumNodeId: CURRICULUM_NODE_GH_B4_2_1_3_1_ID,
    competencyId:
      "competency-gh-math-b4-number-patterns-003",
    relationship: "supports",
  },
  ...GHANA_B4_ENGLISH_PRODUCTION_SPECS.map((spec) => ({
    id: `mapping-gh-b4-english-${spec.code.toLowerCase().replace(/\./g, "-")}`,
    curriculumNodeId: `node-gh-b4-english-${spec.code.toLowerCase()}`,
    competencyId: spec.competencyId,
    relationship: "direct" as const,
  })),
  ...GHANA_B4_MATHEMATICS_ADAPTIVE_SPECS.flatMap((spec) =>
    spec.indicatorMappings.map((indicator) => ({
      id: `mapping-gh-b4-math-${spec.competencyId}-${indicator.code.toLowerCase().replace(/\./g, "-")}`,
      curriculumNodeId: `node-gh-b4-math-${indicator.code.toLowerCase()}`,
      competencyId: spec.competencyId,
      relationship: indicator.relationship,
    })),
  ),
  ...GHANA_B4_SCIENCE_ADAPTIVE_SPECS
    .filter((spec) => spec.code !== "B4.1.1.1.1")
    .map((spec) => ({
      id: `mapping-gh-b4-science-${spec.code.toLowerCase().replace(/\./g, "-")}`,
      curriculumNodeId: `node-gh-b4-science-${spec.code.toLowerCase()}`,
      competencyId: spec.competencyId,
      relationship: "direct" as const,
    })),
  {
    id: "mapping-gh-b4-science-1-1-1-1-1-animal-classification",
    curriculumNodeId:
      CURRICULUM_NODE_GH_B4_SCIENCE_1_1_1_1_1_ID,
    competencyId:
      GHANA_SCIENCE_B4_ANIMAL_CLASSIFICATION_COMPETENCY_ID,
    relationship: "direct",
  },
  ...GHANA_B4_COMPUTING_ADAPTIVE_SPECS.flatMap((spec) =>
    spec.indicatorMappings
      .filter((indicator) => indicator.relationship === "direct")
      .map((indicator) => ({
        id: `mapping-gh-b4-computing-${indicator.code.toLowerCase().replace(/\./g, "-")}`,
        curriculumNodeId: `node-gh-b4-computing-${indicator.code.toLowerCase()}`,
        competencyId: spec.competencyId,
        relationship: "direct" as const,
      })),
  ),
  ...GHANA_B5_SCIENCE_PUBLISHED_SPECS.map((spec) => ({
    id: `mapping-gh-b5-science-${spec.code.toLowerCase().replace(/\./g, "-")}`,
    curriculumNodeId: `node-gh-b5-science-${spec.code.toLowerCase()}`,
    competencyId: spec.competencyId,
    relationship: "direct" as const,
  })),
  ...GHANA_B6_SCIENCE_PUBLISHED_SPECS.map((spec) => ({
    id: `mapping-gh-b6-science-${spec.code.toLowerCase().replace(/\./g, "-")}`,
    curriculumNodeId: `node-gh-b6-science-${spec.code.toLowerCase()}`,
    competencyId: spec.competencyId,
    relationship: "direct" as const,
  })),
  ...GHANA_B5_COMPUTING_PUBLISHED_SPECS.map((spec) => ({
    id: `mapping-gh-b5-computing-${spec.code.toLowerCase().replace(/\./g, "-")}`,
    curriculumNodeId: `node-gh-b5-computing-${spec.code.toLowerCase()}`,
    competencyId: spec.competencyId,
    relationship: "direct" as const,
  })),
  ...GHANA_B6_COMPUTING_PUBLISHED_SPECS.map((spec) => ({
    id: `mapping-gh-b6-computing-${spec.code.toLowerCase().replace(/\./g, "-")}`,
    curriculumNodeId: `node-gh-b6-computing-${spec.code.toLowerCase()}`,
    competencyId: spec.competencyId,
    relationship: "direct" as const,
  })),
  ...GHANA_B5_MATHEMATICS_PUBLISHED_SPECS.map((spec) => ({
    id: `mapping-gh-b5-mathematics-${spec.code.toLowerCase().replace(/\./g, "-")}`,
    curriculumNodeId: `node-gh-b5-mathematics-${spec.code.toLowerCase()}`,
    competencyId: spec.competencyId,
    relationship: "direct" as const,
  })),
  ...GHANA_B6_MATHEMATICS_PUBLISHED_SPECS.map((spec) => ({
    id: `mapping-gh-b6-mathematics-${spec.code.toLowerCase().replace(/\./g, "-")}`,
    curriculumNodeId: `node-gh-b6-mathematics-${spec.code.toLowerCase()}`,
    competencyId: spec.competencyId,
    relationship: "direct" as const,
  })),
  ...GHANA_B5_ENGLISH_PUBLISHED_SPECS.map((spec) => ({
    id: `mapping-gh-b5-english-${spec.code.toLowerCase().replace(/\./g, "-")}`,
    curriculumNodeId: `node-gh-b5-english-${spec.code.toLowerCase()}`,
    competencyId: spec.competencyId,
    relationship: "direct" as const,
  })),
  ...GHANA_B6_ENGLISH_PUBLISHED_SPECS.map((spec) => ({
    id: `mapping-gh-b6-english-${spec.code.toLowerCase().replace(/\./g, "-")}`,
    curriculumNodeId: `node-gh-b6-english-${spec.code.toLowerCase()}`,
    competencyId: spec.competencyId,
    relationship: "direct" as const,
  })),
];

const competencyRelationships: CompetencyRelationship[] = [
  {
    id: "relationship-gh-b4-patterns-002-prereq-001",
    fromCompetencyId:
      "competency-gh-math-b4-number-patterns-002",
    toCompetencyId:
      "competency-gh-math-b4-number-patterns-001",
    type: "prerequisite",
  },
  {
    id: "relationship-gh-b4-patterns-003-prereq-002",
    fromCompetencyId:
      "competency-gh-math-b4-number-patterns-003",
    toCompetencyId:
      "competency-gh-math-b4-number-patterns-002",
    type: "prerequisite",
  },
];

// ---- Layer 1 accessors ----

export function getCountry(
  countryId: CountryId,
): Country | undefined {
  return countries.find(
    (country) => country.id === countryId,
  );
}

export function getCurriculum(
  curriculumId: CurriculumId,
): Curriculum | undefined {
  return curricula.find(
    (curriculum) => curriculum.id === curriculumId,
  );
}

export function getCurriculumVersion(
  curriculumVersionId: CurriculumVersionId,
): CurriculumVersion | undefined {
  const version = curriculumVersions.find(version => version.id === curriculumVersionId);
  return version && isPrivateJhsEnabled() && version.id === CURRICULUM_VERSION_GHANA_CCP_2020_ID
    ? { ...version, isActive: true } : version;
}

export function getPhase(
  phaseId: PhaseId,
): Phase | undefined {
  return phases.find(
    (phase) => phase.id === phaseId,
  );
}

export function getFrameworkGrade(
  gradeId: FrameworkGradeId,
): FrameworkGrade | undefined {
  const grade = grades.find(grade => grade.id === gradeId);
  return grade && privateJhsGrade(gradeId)
    ? { ...grade, learnerVisibility: 'visible', supportStatus: undefined } : grade;
}

export function getFrameworkSubject(
  subjectId: FrameworkSubjectId,
): FrameworkSubject | undefined {
  return subjects.find(
    (subject) => subject.id === subjectId,
  );
}

export function getSubjectsForGrade(
  gradeId: FrameworkGradeId,
): FrameworkSubject[] {
  return subjects.filter(
    (subject) => subject.gradeId === gradeId,
  );
}

export function getCurriculumNode(
  curriculumNodeId: CurriculumNodeId,
): CurriculumNode | undefined {
  return curriculumNodes.find(
    (node) => node.id === curriculumNodeId,
  );
}

export function getCurriculumNodesForSubject(
  subjectId: FrameworkSubjectId,
): CurriculumNode[] {
  return curriculumNodes.filter(
    (node) => node.subjectId === subjectId,
  );
}

export function getSubjectCapability(
  subjectId: FrameworkSubjectId,
): SubjectCapability | undefined {
  const capability = subjectCapabilities.find(capability => capability.subjectId === subjectId);
  return capability && privateJhsSubject(subjectId)
    ? { ...capability, status: 'partial', notes: 'Private draft scope; educator and French approval pending.' } : capability;
}

export function resolveCurriculumContext(
  curriculumVersionId: CurriculumVersionId,
  gradeId: FrameworkGradeId,
  subjectId: FrameworkSubjectId,
): ResolvedCurriculumContext | undefined {
  const curriculumVersion = getCurriculumVersion(
    curriculumVersionId,
  );

  if (!curriculumVersion) {
    return undefined;
  }

  const curriculum = getCurriculum(
    curriculumVersion.curriculumId,
  );

  if (!curriculum) {
    return undefined;
  }

  const country = getCountry(curriculum.countryId);

  if (!country) {
    return undefined;
  }

  const grade = getFrameworkGrade(gradeId);

  if (!grade) {
    return undefined;
  }

  const phase = getPhase(grade.phaseId);

  if (
    !phase ||
    phase.curriculumVersionId !== curriculumVersionId
  ) {
    return undefined;
  }

  const subject = getFrameworkSubject(subjectId);

  if (!subject || subject.gradeId !== gradeId) {
    return undefined;
  }

  return {
    country,
    curriculum,
    curriculumVersion,
    phase,
    grade,
    subject,
  };
}

export function getDefaultLearnerLearningContext(): {
  curriculumVersionId: CurriculumVersionId;
  gradeId: FrameworkGradeId;
  activeSubjectId: FrameworkSubjectId;
} {
  return {
    curriculumVersionId:
      CURRICULUM_VERSION_GHANA_PILOT_V1_ID,
    gradeId: GRADE_GHANA_BASIC_4_ID,
    activeSubjectId: SUBJECT_GHANA_BASIC4_MATH_ID,
  };
}

export function getInitialCompetencyIdForResolvedContext(
  resolved: ResolvedCurriculumContext,
): CompetencyId | undefined {
  if (
    !resolved.curriculumVersion.isActive ||
    resolved.grade.learnerVisibility === "hidden" ||
    resolved.grade.supportStatus === "unsupported"
  ) return undefined;
  return getInitialCompetencyForCurriculumSubjectLevel(
    resolved.curriculumVersion.runtimeFrameworkId ?? resolved.curriculum.id,
    resolved.subject.id,
    resolved.grade.id,
  )?.id;
}

/*
 * The subjects a learner in this grade can actually learn:
 * registered for the grade within the curriculum version, not
 * marked unsupported, and with a resolvable initial competency
 * (that is, published competencies exist). This is the single
 * source of truth for grade-aware subject listing.
 */
export function getAvailableSubjectsForGrade(
  curriculumVersionId: CurriculumVersionId,
  gradeId: FrameworkGradeId,
): FrameworkSubject[] {
  const version = getCurriculumVersion(curriculumVersionId);
  const grade = getFrameworkGrade(gradeId);
  // Structural resolution remains available to curriculum tooling. Learner availability fails closed.
  if (!version?.isActive || !grade || grade.learnerVisibility === "hidden" || grade.supportStatus === "unsupported") return [];
  return getSubjectsForGrade(gradeId).filter((subject) => {
    if (
      getSubjectCapability(subject.id)?.status ===
      "unsupported"
    ) {
      return false;
    }

    const resolved = resolveCurriculumContext(
      curriculumVersionId,
      gradeId,
      subject.id,
    );

    return Boolean(
      resolved &&
        getInitialCompetencyIdForResolvedContext(resolved),
    );
  });
}

/*
 * A grade is supported when it is registered under the
 * curriculum version and has at least one available subject.
 */
export function isSupportedGrade(
  curriculumVersionId: CurriculumVersionId,
  gradeId: FrameworkGradeId,
): boolean {
  return (
    getAvailableSubjectsForGrade(
      curriculumVersionId,
      gradeId,
    ).length > 0
  );
}

/*
 * The supported grades of a curriculum version, in order.
 */
export function getSupportedGradesForCurriculumVersion(
  curriculumVersionId: CurriculumVersionId,
): FrameworkGrade[] {
  const phaseIds = phases
    .filter((phase) => phase.curriculumVersionId === curriculumVersionId)
    .map((phase) => phase.id);

  return grades
    .filter(
      (grade) =>
        phaseIds.includes(grade.phaseId) &&
        isSupportedGrade(curriculumVersionId, grade.id),
    )
    .sort((a, b) => a.order - b.order);
}

// ---- Layer 2 accessors ----

/** Source registrations are intentionally separate from the teachable runtime registry. */
export function getFrameworkCompetencyRegistration(competencyId: CompetencyId): FrameworkCompetencyRegistration | undefined {
  return jhsRegistrations.find((registration) => registration.id === competencyId);
}

export function getFrameworkCompetencyRegistrationsForSubject(subjectId: FrameworkSubjectId): FrameworkCompetencyRegistration[] {
  return jhsRegistrations.filter((registration) => registration.subjectId === subjectId);
}

export function getCurriculumSourceIssue(issueId: string): CurriculumSourceIssue | undefined {
  return GHANA_B7_CCP_REGISTRY.sourceIssues.find((issue) => issue.id === issueId) ?? GHANA_B89_CCP_REGISTRY.sourceIssues.find((issue) => issue.id === issueId);
}

export function getCompetencyMappingsForNode(
  curriculumNodeId: CurriculumNodeId,
): CurriculumCompetencyMapping[] {
  return competencyMappings.filter(
    (mapping) =>
      mapping.curriculumNodeId === curriculumNodeId,
  );
}

export function getCurriculumNodesForCompetency(
  competencyId: CompetencyId,
): CurriculumNode[] {
  const nodeIds = competencyMappings
    .filter(
      (mapping) => mapping.competencyId === competencyId,
    )
    .map((mapping) => mapping.curriculumNodeId);

  return curriculumNodes.filter((node) =>
    nodeIds.includes(node.id),
  );
}

export function getCompetencyMappingsForCompetency(
  competencyId: CompetencyId,
): CurriculumCompetencyMapping[] {
  return competencyMappings.filter(
    (mapping) => mapping.competencyId === competencyId,
  );
}

export function getCompetencyRelationships(
  competencyId: CompetencyId,
  type?: CompetencyRelationshipType,
): CompetencyRelationship[] {
  return competencyRelationships.filter(
    (relationship) =>
      (
        relationship.fromCompetencyId === competencyId ||
        relationship.toCompetencyId === competencyId
      ) &&
      (type === undefined || relationship.type === type),
  );
}





