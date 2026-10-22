import data from "./ghana-b7-ccp-data.json";
import type { CurriculumNode, FrameworkSubject } from "./index";

export const CURRICULUM_VERSION_GHANA_CCP_2020_ID = "curriculum-version-gh-nacca-ccp-2020";
export const PHASE_GHANA_JHS_CCP_ID = "phase-gh-jhs-ccp";
export const GRADE_GHANA_BASIC_7_CCP_ID = "level-gh-basic-7-ccp";

export interface CurriculumSourceProvenance {
  documentId: string;
  localPath: string;
  url: string;
  sha256: string;
  pdfPages: number[];
  printedPage?: string;
}

/** A source-backed intended competency, not a teachable/runtime CompetencyDefinition.
 * Runtime definitions require reviewed pedagogy/evidence fields which do not yet exist for Basic 7.
 */
export interface FrameworkCompetencyRegistration {
  id: string;
  curriculumVersionId: string;
  gradeId: string;
  subjectId: string;
  curriculumNodeId: string;
  title: string;
  registrationStatus: "proposed";
  learnerVisibility: "hidden";
  officialCode: string;
  sourceEntryId: string;
  source: CurriculumSourceProvenance;
  hierarchy: { strandId: string; subStrandId: string; contentStandardId: string };
  numbering: { filumire_format_alias: string | null; decision: string; evidence_pdf_pages: number[]; official_code_replaced: boolean };
  mappingStatus: string;
  sourceIssueIds: string[];
  globalSourceIssueIds: string[];
  review: Record<string, unknown>;
  phase8aReviewFlags: string[];
  assessmentRequirements: Array<{ kind: string; suggested_response_modes: string[]; source_excerpt: string; source_pdf_pages: number[]; interpretation: string }>;
  activitySourceReference: string;
}

export interface CurriculumSourceIssue {
  id: string;
  subject: string;
  status: string;
  description: string;
  source_pdf_pages: number[];
  affected_entries: string[];
  decision: string | null;
}

interface SourceRegistry {
  subjects: FrameworkSubject[];
  nodes: CurriculumNode[];
  competencies: FrameworkCompetencyRegistration[];
  sourceIssues: CurriculumSourceIssue[];
}

// Generated only from verified Phase 8B files. No filesystem or document parsing at runtime.
export const GHANA_B7_CCP_REGISTRY = data as SourceRegistry;
