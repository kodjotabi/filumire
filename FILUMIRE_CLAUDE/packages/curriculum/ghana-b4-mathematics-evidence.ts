export type MathematicsEvidenceProfile =
  | "conceptual_understanding"
  | "procedural_fluency"
  | "representation"
  | "mathematical_reasoning"
  | "problem_solving"
  | "estimation"
  | "measurement"
  | "data_interpretation"
  | "application";

export interface MathematicsEvidenceDesign {
  profile: MathematicsEvidenceProfile;

  /*
   * Independent evidence tasks.
   * Teaching or supported practice must never establish mastery.
   */
  diagnosticTask: string;
  reassessmentTask: string;
  retentionTask: string;
  transferTask: string;

  /*
   * Observable requirements for successful independent performance.
   */
  successCriteria: string[];

  /*
   * Explicit curriculum and subskill coverage prevents a competency
   * that spans several indicators from being treated as mastered after
   * evidence from only one part of the competency.
   */
  targetIndicatorCodes: string[];
  targetSubskills: string[];
}
