import type { ResponseMode } from "../domain";
import type { GhanaB4EnglishAdaptiveSpec } from "./ghana-b4-english-adaptive";
import type {
  EnglishEvidenceDesign,
  EnglishEvidenceProfile,
} from "./ghana-b4-english-evidence";

export interface GhanaB4EnglishStrand5Spec
  extends GhanaB4EnglishAdaptiveSpec {
  evidence: EnglishEvidenceDesign;
  prerequisiteCodes: string[];
}

type SpecInput = {
  code: string;
  title: string;
  description: string;
  responseMode: ResponseMode;
  profile?: EnglishEvidenceProfile;
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

function buildSpec(input: SpecInput): GhanaB4EnglishStrand5Spec {
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
    difficulty: input.difficulty ?? 2,
    subskills: input.subskills,
    misconceptions: input.misconceptions,
    prerequisiteCodes: input.prerequisites ?? [],
    evidence: {
      profile: input.profile ?? "grammar_application",
      diagnosticTask: input.diagnostic,
      reassessmentTask: input.reassessment,
      retentionTask: input.retention,
      transferTask: input.transfer,
      successCriteria: input.criteria,
    },
  };
}

export const GHANA_B4_ENGLISH_STRAND5_ADAPTIVE_SPECS:
  GhanaB4EnglishStrand5Spec[] = [

  buildSpec({
    code: "B4.5.2.1.1",
    title: "Use Commas with Yes, No and Direct Address",
    description:
      "Use commas correctly with Yes and No and when directly addressing a person.",
    responseMode: "application",
    subskills: [
      "recognise_direct_address",
      "punctuate_yes_and_no",
      "place_comma_with_name_in_direct_address",
      "apply_comma_rule_in_sentence",
    ],
    misconceptions: [
      "omits_comma_in_direct_address",
      "places_comma_randomly",
      "treats_person_addressed_as_sentence_subject_only",
    ],
    diagnostic:
      "Punctuate sentences containing Yes, No and direct address.",
    reassessment:
      "Apply the same comma rules to a fresh sentence set.",
    retention:
      "After a delay, punctuate new direct-address sentences independently.",
    transfer:
      "Apply the comma rules in an unfamiliar dialogue or message.",
    criteria: [
      "comma_position_is_correct",
      "direct_address_is_recognised",
      "sentence_meaning_remains_clear",
    ],
  }),

  buildSpec({
    code: "B4.5.3.1.1",
    title: "Identify and Use Nouns",
    description:
      "Identify and use nouns for people, animals, events and objects.",
    responseMode: "classification",
    subskills: [
      "recognise_nouns",
      "identify_noun_referents",
      "distinguish_nouns_from_other_word_classes",
      "use_nouns_in_sentences",
    ],
    misconceptions: [
      "classifies_action_words_as_nouns",
      "assumes_all_nouns_are_objects",
      "identifies_noun_without_understanding_its_sentence_role",
    ],
    diagnostic:
      "Identify nouns in sentences and classify what they name.",
    reassessment:
      "Classify nouns in a fresh group of sentences.",
    retention:
      "After a delay, identify nouns independently.",
    transfer:
      "Identify and use nouns in an unfamiliar short passage.",
    criteria: [
      "noun_is_correctly_identified",
      "referent_category_is_correct",
      "noun_is_used_appropriately",
    ],
  }),

  buildSpec({
    code: "B4.5.3.1.2",
    title: "Use Proper and Common Nouns",
    description:
      "Identify and use proper nouns and common nouns.",
    responseMode: "classification",
    subskills: [
      "recognise_common_nouns",
      "recognise_proper_nouns",
      "distinguish_specific_from_general_names",
      "apply_capitalisation_to_proper_nouns",
    ],
    misconceptions: [
      "capitalises_all_nouns",
      "treats_specific_and_general_names_as_equivalent",
      "classifies_by_capital_letter_without considering_meaning",
    ],
    diagnostic:
      "Classify nouns as proper or common and use them in sentences.",
    reassessment:
      "Classify a fresh set of proper and common nouns.",
    retention:
      "After a delay, distinguish proper and common nouns independently.",
    transfer:
      "Apply the distinction in an unfamiliar paragraph.",
    criteria: [
      "noun_type_is_correct",
      "proper_nouns_are_capitalised",
      "sentence_use_matches_noun_type",
    ],
    prerequisites: ["B4.5.3.1.1"],
  }),

  buildSpec({
    code: "B4.5.3.1.3",
    title: "Use Collective Nouns",
    description:
      "Identify and use collective nouns for groups of objects and people.",
    responseMode: "classification",
    subskills: [
      "recognise_group_reference",
      "identify_collective_nouns",
      "match_collective_noun_to_group",
      "use_collective_noun_in_context",
    ],
    misconceptions: [
      "confuses_plural_noun_with_collective_noun",
      "treats_any_group_phrase_as_collective_noun",
      "matches_collective_noun_to_wrong_group",
    ],
    diagnostic:
      "Identify collective nouns and match them to the groups they describe.",
    reassessment:
      "Classify and use a fresh set of collective nouns.",
    retention:
      "After a delay, identify collective nouns independently.",
    transfer:
      "Use collective nouns correctly in an unfamiliar context.",
    criteria: [
      "collective_noun_is_identified",
      "group_reference_is_accurate",
      "contextual_use_is_correct",
    ],
    prerequisites: ["B4.5.3.1.1"],
  }),

  buildSpec({
    code: "B4.5.3.1.4",
    title: "Use Abstract Nouns",
    description:
      "Identify and use abstract nouns for concepts and ideas.",
    responseMode: "classification",
    subskills: [
      "recognise_nonphysical_concepts",
      "identify_abstract_nouns",
      "distinguish_abstract_from_concrete_nouns",
      "use_abstract_nouns_in_context",
    ],
    misconceptions: [
      "assumes_all_nouns_are_physical",
      "confuses_adjectives_with_abstract_nouns",
      "classifies_by familiarity_instead_of_meaning",
    ],
    diagnostic:
      "Identify abstract nouns and distinguish them from concrete nouns.",
    reassessment:
      "Classify a fresh set of abstract and concrete nouns.",
    retention:
      "After a delay, distinguish abstract nouns independently.",
    transfer:
      "Identify and use abstract nouns in an unfamiliar passage.",
    criteria: [
      "abstract_noun_is_identified",
      "abstract_concrete_distinction_is_correct",
      "contextual_use_is_meaningful",
    ],
    prerequisites: ["B4.5.3.1.1"],
  }),

  buildSpec({
    code: "B4.5.4.1.1",
    title: "Apply Subject Verb Agreement",
    description:
      "Use singular and plural subjects with the verb forms that agree with them.",
    responseMode: "application",
    subskills: [
      "identify_subject_number",
      "identify_required_verb_form",
      "match_subject_and_verb",
      "check_agreement_in_sentence",
    ],
    misconceptions: [
      "uses_plural_verb_with_singular_subject",
      "ignores_subject_number",
      "chooses_verb_form_from_nearest_word",
    ],
    diagnostic:
      "Select verb forms that agree with singular and plural subjects.",
    reassessment:
      "Correct agreement in a fresh sentence set.",
    retention:
      "After a delay, apply subject-verb agreement independently.",
    transfer:
      "Maintain correct agreement in an unfamiliar paragraph.",
    criteria: [
      "subject_number_is_recognised",
      "verb_agrees_with_subject",
      "agreement_is_consistent",
    ],
    difficulty: 3,
  }),

  buildSpec({
    code: "B4.5.4.1.2",
    title: "Use the Simple Past",
    description:
      "Use the simple past form in speech and writing to express past conditions.",
    responseMode: "application",
    subskills: [
      "recognise_past_time_context",
      "select_simple_past_form",
      "distinguish_regular_and_irregular_forms",
      "maintain_past_time_reference",
    ],
    misconceptions: [
      "uses_present_form_for_past_condition",
      "adds_ed_to_every_past_verb",
      "switches_tense_without_reason",
    ],
    diagnostic:
      "Complete and produce sentences requiring simple past verb forms.",
    reassessment:
      "Apply simple past forms to a fresh set of situations.",
    retention:
      "After a delay, use simple past forms independently.",
    transfer:
      "Describe an unfamiliar past situation using appropriate verb forms.",
    criteria: [
      "past_time_is_recognised",
      "verb_form_is_appropriate",
      "tense_is_consistent",
    ],
    difficulty: 3,
  }),

  buildSpec({
    code: "B4.5.4.1.3",
    title: "Use the Present Perfect",
    description:
      "Use the present perfect form to relate past events to the present.",
    responseMode: "application",
    subskills: [
      "recognise_past_present_connection",
      "select_have_or_has",
      "select_past_participle",
      "apply_present_perfect_in_context",
    ],
    misconceptions: [
      "uses_simple_past_when_present_connection_is_required",
      "omits_have_or_has",
      "uses_incorrect_past_participle",
    ],
    diagnostic:
      "Complete sentences requiring present perfect verb forms.",
    reassessment:
      "Apply present perfect forms to fresh situations.",
    retention:
      "After a delay, use the present perfect independently.",
    transfer:
      "Apply present perfect forms in an unfamiliar past-to-present context.",
    criteria: [
      "auxiliary_is_correct",
      "past_participle_is_correct",
      "past_present_relationship_is_clear",
    ],
    difficulty: 3,
  }),

  buildSpec({
    code: "B4.5.5.1.1",
    title: "Use Adjectives for Comparison",
    description:
      "Use adjectives correctly to make comparisons.",
    responseMode: "application",
    subskills: [
      "identify_quality_being_compared",
      "select_comparative_form",
      "select_superlative_form",
      "apply_comparison_in_sentence",
    ],
    misconceptions: [
      "uses_base_form_when_comparison_is_required",
      "uses_double_comparative",
      "confuses_comparative_and_superlative_forms",
    ],
    diagnostic:
      "Complete comparison sentences using appropriate adjective forms.",
    reassessment:
      "Make fresh comparisons using different adjectives.",
    retention:
      "After a delay, apply comparison forms independently.",
    transfer:
      "Describe unfamiliar people or objects using accurate comparisons.",
    criteria: [
      "adjective_form_matches_comparison",
      "comparison_is_logically_correct",
      "sentence_is_grammatical",
    ],
  }),

  buildSpec({
    code: "B4.5.5.1.2",
    title: "Distinguish Comparative and Superlative Forms",
    description:
      "Differentiate comparative and superlative adjective forms in sentences.",
    responseMode: "classification",
    subskills: [
      "recognise_comparative_forms",
      "recognise_superlative_forms",
      "identify_scope_of_comparison",
      "classify_comparison_type",
    ],
    misconceptions: [
      "treats_comparative_and_superlative_as_interchangeable",
      "uses_superlative_for_two_items",
      "classifies_only_from_word_ending",
    ],
    diagnostic:
      "Classify sentences as comparative or superlative.",
    reassessment:
      "Classify a fresh set of comparison sentences.",
    retention:
      "After a delay, distinguish both forms independently.",
    transfer:
      "Apply the distinction in an unfamiliar descriptive passage.",
    criteria: [
      "comparison_type_is_correct",
      "form_matches_scope_of_comparison",
      "usage_is_contextually_correct",
    ],
    prerequisites: ["B4.5.5.1.1"],
  }),

  buildSpec({
    code: "B4.5.6.1.1",
    title: "Use Adverbs of Time and Place",
    description:
      "Use adverbs to show when and where the action of a verb took place.",
    responseMode: "application",
    subskills: [
      "identify_action",
      "identify_time_adverb",
      "identify_place_adverb",
      "position_adverb_appropriately",
    ],
    misconceptions: [
      "confuses_adverb_with_adjective",
      "confuses_when_and_where_functions",
      "places_adverb_where_meaning_is_unclear",
    ],
    diagnostic:
      "Select suitable adverbs of time and place for sentences.",
    reassessment:
      "Apply different time and place adverbs to fresh sentences.",
    retention:
      "After a delay, use time and place adverbs independently.",
    transfer:
      "Describe unfamiliar actions with accurate time and place information.",
    criteria: [
      "adverb_matches_intended_meaning",
      "time_and_place_functions_are_distinguished",
      "sentence_position_is_clear",
    ],
  }),

  buildSpec({
    code: "B4.5.7.1.1",
    title: "Use Prepositions for Meaning",
    description:
      "Use prepositions to convey direction, time, purpose, possession and comparison.",
    responseMode: "application",
    subskills: [
      "recognise_relationship_between_words",
      "select_preposition_for_direction_or_time",
      "select_preposition_for_purpose_or_possession",
      "apply_preposition_in_context",
    ],
    misconceptions: [
      "selects_preposition_by_sound_only",
      "uses_one_preposition_for_all_relationships",
      "confuses_prepositions_with_conjunctions",
    ],
    diagnostic:
      "Choose appropriate prepositions for different relationships.",
    reassessment:
      "Complete a fresh set of prepositional sentences.",
    retention:
      "After a delay, apply prepositions independently.",
    transfer:
      "Use suitable prepositions in an unfamiliar functional text.",
    criteria: [
      "preposition_matches_relationship",
      "sentence_meaning_is_clear",
      "usage_is_grammatically_appropriate",
    ],
  }),

  buildSpec({
    code: "B4.5.8.1.1",
    title: "Identify and Use Conjunctions",
    description:
      "Use conjunctions such as and, but, or and nor to link ideas.",
    responseMode: "classification",
    subskills: [
      "recognise_conjunctions",
      "identify_relationship_between_ideas",
      "distinguish_addition_contrast_and_alternative",
      "select_suitable_conjunction",
    ],
    misconceptions: [
      "uses_and_for_every_relationship",
      "confuses_contrast_and_alternative",
      "identifies_conjunction_without_understanding_function",
    ],
    diagnostic:
      "Identify conjunctions and classify the relationships they express.",
    reassessment:
      "Classify and use conjunctions in a fresh sentence set.",
    retention:
      "After a delay, identify conjunction functions independently.",
    transfer:
      "Link ideas appropriately in an unfamiliar paragraph.",
    criteria: [
      "conjunction_is_identified",
      "relationship_is_correctly_classified",
      "selected_conjunction_is_appropriate",
    ],
  }),

  buildSpec({
    code: "B4.5.9.1.1",
    title: "Identify Subjects and Verbs",
    description:
      "Identify subjects and verbs in simple sentences.",
    responseMode: "classification",
    subskills: [
      "identify_sentence_subject",
      "identify_main_verb",
      "distinguish_subject_from_object",
      "connect_subject_to_action_or_state",
    ],
    misconceptions: [
      "assumes_first_word_is_always_subject",
      "confuses_object_with_subject",
      "identifies_noun_without_identifying_sentence_subject",
    ],
    diagnostic:
      "Identify subjects and verbs in simple sentences.",
    reassessment:
      "Analyse subjects and verbs in a fresh sentence set.",
    retention:
      "After a delay, identify subjects and verbs independently.",
    transfer:
      "Analyse sentence structure in an unfamiliar short passage.",
    criteria: [
      "subject_is_correct",
      "verb_is_correct",
      "subject_verb_relationship_is_understood",
    ],
  }),

  buildSpec({
    code: "B4.5.9.1.2",
    title: "Construct Simple Sentences",
    description:
      "Construct simple sentences correctly.",
    responseMode: "application",
    subskills: [
      "select_subject",
      "select_finite_verb",
      "apply_correct_word_order",
      "express_complete_thought",
    ],
    misconceptions: [
      "writes_sentence_fragment",
      "omits_subject_or_finite_verb",
      "uses_incorrect_word_order",
    ],
    diagnostic:
      "Construct complete simple sentences from supplied ideas.",
    reassessment:
      "Construct a fresh set of simple sentences.",
    retention:
      "After a delay, construct correct simple sentences independently.",
    transfer:
      "Use simple sentences appropriately in an unfamiliar functional task.",
    criteria: [
      "sentence_has_subject_and_verb",
      "sentence_expresses_complete_thought",
      "word_order_is_correct",
    ],
    prerequisites: ["B4.5.9.1.1"],
  }),

  buildSpec({
    code: "B4.5.10.1.1",
    title: "Use Invented Spelling During Drafting",
    description:
      "Use plausible invented spelling to increase fluency and freedom during writing.",
    responseMode: "application",
    profile: "writing_composition",
    subskills: [
      "segment_words_into_sounds",
      "represent_sounds_with_plausible_letters",
      "maintain_writing_flow",
      "distinguish_drafting_from_final_editing",
    ],
    misconceptions: [
      "stops_writing_when_exact_spelling_is_unknown",
      "treats_invented_spelling_as_final_standard_spelling",
      "uses_letter_sequences_unrelated_to_heard_sounds",
    ],
    diagnostic:
      "Draft a short response using plausible sound-based spelling when necessary.",
    reassessment:
      "Complete a fresh drafting task without allowing spelling uncertainty to stop writing.",
    retention:
      "After a delay, use sound-based approximations appropriately while drafting.",
    transfer:
      "Draft an unfamiliar short piece while maintaining idea flow despite uncertain spellings.",
    criteria: [
      "writing_flow_is_maintained",
      "invented_spelling_has_plausible_sound_letter_relationship",
      "learner_distinguishes_drafting_from_final_editing",
    ],
  }),
];

if (GHANA_B4_ENGLISH_STRAND5_ADAPTIVE_SPECS.length !== 16) {
  throw new Error(
    `Expected 16 Ghana B4 English Strand 5 adaptive specifications, found ${GHANA_B4_ENGLISH_STRAND5_ADAPTIVE_SPECS.length}.`,
  );
}