export type EnglishEvidenceProfile =
  | "sound_symbol_mapping"
  | "oral_decoding"
  | "sentence_application"
  | "word_analysis"
  | "vocabulary_application"
  | "contextual_inference"
  | "reading_comprehension"
  | "reading_fluency"
  | "oral_summary"
  | "written_summary"
  | "grammar_application"
  | "writing_composition";

export interface EnglishEvidenceDesign {
  profile: EnglishEvidenceProfile;
  diagnosticTask: string;
  reassessmentTask: string;
  retentionTask: string;
  transferTask: string;
  successCriteria: string[];
}