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

export type LearningLanguage =
  | "en"
  | "fr";

export interface LearningContent {
  id: ContentId;

  competencyId: CompetencyId;

  type: ContentType;

  title: string;

  body: string;

  language: LearningLanguage;

  translationOfContentId?: ContentId;

  assessmentItemId?: AssessmentItemId;

  prerequisiteContentIds?: ContentId[];

  metadata?: Record<string, string>;

  version: string;

  createdAt: string;

  updatedAt: string;
}