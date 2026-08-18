import type {
  AssessmentItemId,
  CompetencyId,
  ContentId,
} from "../domain";

export type ContentType =
  | "lesson"
  | "example"
  | "practice"
  | "scaffold"
  | "remediation"
  | "assessment";

export interface LearningContent {
  id: ContentId;
  competencyId: CompetencyId;
  type: ContentType;
  title: string;
  body: string;
  assessmentItemId?: AssessmentItemId;
  prerequisiteContentIds?: ContentId[];
  metadata?: Record<string, string>;
  version: string;
  createdAt: string;
  updatedAt: string;
}