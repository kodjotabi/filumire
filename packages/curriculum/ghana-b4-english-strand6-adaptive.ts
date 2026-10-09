import type { ResponseMode } from "../domain";
import type { GhanaB4EnglishAdaptiveSpec } from "./ghana-b4-english-adaptive";
import type {
  EnglishEvidenceDesign,
  EnglishEvidenceProfile,
} from "./ghana-b4-english-evidence";

export interface GhanaB4EnglishStrand6Spec
  extends GhanaB4EnglishAdaptiveSpec {
  evidence: EnglishEvidenceDesign;
  prerequisiteCodes: string[];
}

type SpecInput = {
  code: string;
  title: string;
  description: string;
  responseMode: ResponseMode;
  profile: EnglishEvidenceProfile;
  subskills: string[];
  misconceptions: string[];
  diagnostic: string;
  reassessment: string;
  retention: string;
  transfer: string;
  criteria: string[];
  prerequisites?: string[];
  difficulty?: number;
};

function buildSpec(
  input: SpecInput,
): GhanaB4EnglishStrand6Spec {
  const parts = input.code.split(".");

  return {
    code: input.code,
    competencyId: `competency-gh-english-${input.code
      .toLowerCase()
      .replace(/\./g, "-")}`,
    strandCode: parts.slice(0, 2).join("."),
    subStrandCode: parts.slice(0, 3).join("."),
    contentStandardCode: parts.slice(0, 4).join("."),
    title: input.title,
    description: input.description,
    responseMode: input.responseMode,
    difficulty: input.difficulty ?? 3,
    subskills: input.subskills,
    misconceptions: input.misconceptions,
    prerequisiteCodes: input.prerequisites ?? [],
    evidence: {
      profile: input.profile,
      diagnosticTask: input.diagnostic,
      reassessmentTask: input.reassessment,
      retentionTask: input.retention,
      transferTask: input.transfer,
      successCriteria: input.criteria,
    },
  };
}

export const GHANA_B4_ENGLISH_STRAND6_ADAPTIVE_SPECS:
  GhanaB4EnglishStrand6Spec[] = [
    buildSpec({
      code: "B4.6.1.1.1",
      title: "Summarise Age-Appropriate Books",
      description:
        "Read a variety of age- and level-appropriate books and present a two-paragraph summary of each book read.",
      responseMode: "constructed_response",
      profile: "written_summary",
      subskills: [
        "identify_main_ideas_or_key_events",
        "select_important_supporting_details",
        "paraphrase_source_meaning",
        "organise_summary_into_two_paragraphs",
        "maintain_fidelity_to_source",
      ],
      misconceptions: [
        "copies_source_instead_of_summarising",
        "includes_minor_details_but_omits_main_ideas",
        "adds_unsupported_information_or_personal_opinion",
        "produces_disconnected_paragraphs",
        "changes_source_meaning_while_paraphrasing",
      ],
      diagnostic:
        "Read an age-appropriate text and independently produce a two-paragraph summary of its main ideas or key events and important supporting details.",
      reassessment:
        "Read a different age-appropriate text and produce a fresh two-paragraph summary in your own words.",
      retention:
        "After a delay, read another suitable text and independently produce a two-paragraph summary without reviewing earlier summary instruction.",
      transfer:
        "Read an unfamiliar age-appropriate text on a different topic or in a different genre and produce a coherent two-paragraph summary for a reader who has not read the source.",
      criteria: [
        "main_ideas_or_key_events_are_accurate",
        "important_supporting_details_are_selected",
        "summary_uses_own_words_without_distorting_meaning",
        "ideas_are_organised_into_two_coherent_paragraphs",
        "unsupported_information_is_not_added",
      ],
    }),
  ];

if (
  GHANA_B4_ENGLISH_STRAND6_ADAPTIVE_SPECS.length !== 1
) {
  throw new Error(
    `Expected 1 Ghana B4 English Strand 6 adaptive specification, found ${GHANA_B4_ENGLISH_STRAND6_ADAPTIVE_SPECS.length}.`,
  );
}