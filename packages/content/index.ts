import type {
  AssessmentItemId,
  CompetencyId,
  ContentId,
  InstructionalStrategy,
  ResponseMode,
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

export type TeachingStrategy =
  InstructionalStrategy;

export type AssessmentStrategy =
  ResponseMode;

export interface LearningContent {
  id: ContentId;

  competencyId: CompetencyId;

  type: ContentType;

  title: string;

  body: string;

  language: LearningLanguage;

  /*
   * HOW FILUMIRE teaches this content.
   *
   * The authoritative vocabulary lives in the
   * domain learner model as InstructionalStrategy.
   */
  teachingStrategy?: InstructionalStrategy;

  /*
   * HOW the learner demonstrates understanding.
   *
   * The authoritative vocabulary lives in the
   * domain learner model as ResponseMode.
   */
  assessmentStrategy?: ResponseMode;

  translationOfContentId?: ContentId;

  assessmentItemId?: AssessmentItemId;

  prerequisiteContentIds?: ContentId[];

  metadata?: Record<string, string>;

  version: string;

  createdAt: string;

  updatedAt: string;
}