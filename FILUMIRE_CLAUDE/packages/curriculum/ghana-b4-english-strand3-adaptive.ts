import type { ResponseMode } from "../domain";

import type {
  GhanaB4EnglishAdaptiveSpec,
} from "./ghana-b4-english-adaptive";

import type {
  EnglishEvidenceDesign,
} from "./ghana-b4-english-evidence";

export interface GhanaB4EnglishStrand3Spec
  extends GhanaB4EnglishAdaptiveSpec {
  evidence: EnglishEvidenceDesign;
  prerequisiteCodes: string[];
}

function competencyId(code: string): string {
  return `competency-gh-english-${code
    .toLowerCase()
    .replace(/\./g, "-")}`;
}

function evidence(
  diagnosticTask: string,
  reassessmentTask: string,
  retentionTask: string,
  transferTask: string,
  successCriteria: string[],
): EnglishEvidenceDesign {
  return {
    profile: "grammar_application",
    diagnosticTask,
    reassessmentTask,
    retentionTask,
    transferTask,
    successCriteria,
  };
}

function spec(
  code: string,
  title: string,
  description: string,
  responseMode: ResponseMode,
  subskills: string[],
  misconceptions: string[],
  evidenceDesign: EnglishEvidenceDesign,
  difficulty = 2,
  prerequisiteCodes: string[] = [],
): GhanaB4EnglishStrand3Spec {
  const parts = code.split(".");

  return {
    code,
    competencyId: competencyId(code),
    strandCode: parts.slice(0, 2).join("."),
    subStrandCode: parts.slice(0, 3).join("."),
    contentStandardCode: parts.slice(0, 4).join("."),
    title,
    description,
    subskills,
    misconceptions,
    difficulty,
    responseMode,
    evidence: evidenceDesign,
    prerequisiteCodes,
  };
}

export const GHANA_B4_ENGLISH_STRAND3_ADAPTIVE_SPECS:
  GhanaB4EnglishStrand3Spec[] = [

  spec(
    "B4.3.1.1.1",
    "Identify and Use Nouns",
    "Identify and use nouns for people, animals, events and objects.",
    "classification",
    [
      "recognise_noun",
      "distinguish_noun_from_other_word_classes",
      "classify_noun_referent",
      "use_noun_in_sentence",
    ],
    [
      "treats_every_content_word_as_noun",
      "identifies_only_names_of_people_as_nouns",
      "cannot_apply_noun_in_sentence",
    ],
    evidence(
      "Identify nouns in short sentences and explain what each noun names.",
      "Identify and use nouns in a fresh set of sentences.",
      "After a delay, identify nouns without a word-class reminder.",
      "Use suitable nouns while describing a new home, school or community situation.",
      [
        "correctly_identifies_nouns",
        "connects_noun_to_referent",
        "uses_noun_grammatically",
      ],
    ),
  ),

  spec(
    "B4.3.1.1.2",
    "Use Proper and Common Nouns",
    "Identify and use proper nouns and common nouns appropriately.",
    "classification",
    [
      "recognise_proper_noun",
      "recognise_common_noun",
      "distinguish_proper_and_common_nouns",
      "apply_capitalisation_to_proper_nouns",
    ],
    [
      "treats_all_capitalised_words_as_proper_nouns",
      "confuses_category_name_with_specific_name",
      "omits_capital_letter_for_proper_noun",
    ],
    evidence(
      "Classify nouns in sentences as proper or common and use each type correctly.",
      "Classify and use a fresh set of proper and common nouns.",
      "After a delay, distinguish proper and common nouns independently.",
      "Use proper and common nouns accurately when writing about unfamiliar people and places.",
      [
        "classification_is_correct",
        "proper_nouns_are_specific_names",
        "proper_nouns_are_capitalised",
      ],
    ),
    2,
    ["B4.3.1.1.1"],
  ),

  spec(
    "B4.3.1.1.3",
    "Use Collective Nouns",
    "Identify and use collective nouns for groups of people or objects.",
    "classification",
    [
      "recognise_group_reference",
      "identify_collective_noun",
      "distinguish_collective_from_plural_noun",
      "use_collective_noun_in_context",
    ],
    [
      "assumes_every_plural_is_collective",
      "uses_member_name_instead_of_group_name",
      "cannot_match_collective_noun_to_group",
    ],
    evidence(
      "Identify collective nouns and match them to the groups they represent.",
      "Use different collective nouns correctly in fresh sentences.",
      "After a delay, retrieve collective nouns for familiar groups.",
      "Use a suitable collective noun when describing a new group in context.",
      [
        "identifies_group_as_single_collection",
        "selects_valid_collective_noun",
        "uses_noun_meaningfully",
      ],
    ),
    2,
    ["B4.3.1.1.1"],
  ),

  spec(
    "B4.3.1.1.4",
    "Use Abstract Nouns",
    "Identify and use abstract nouns for concepts and ideas.",
    "classification",
    [
      "recognise_nonphysical_concept",
      "identify_abstract_noun",
      "distinguish_abstract_and_concrete_nouns",
      "use_abstract_noun_in_context",
    ],
    [
      "assumes_all_nouns_must_be_physically_visible",
      "confuses_adjective_with_abstract_noun",
      "cannot_connect_abstract_noun_to_idea",
    ],
    evidence(
      "Distinguish abstract nouns from concrete nouns and explain the idea each abstract noun represents.",
      "Classify and use different abstract nouns in fresh sentences.",
      "After a delay, identify abstract nouns without examples being supplied first.",
      "Use abstract nouns appropriately when discussing a new experience or value.",
      [
        "recognises_nonphysical_concept",
        "classifies_noun_correctly",
        "uses_noun_in_meaningful_context",
      ],
    ),
    3,
    ["B4.3.1.1.1"],
  ),

  spec(
    "B4.3.2.1.1",
    "Use Articles",
    "Identify and use the definite and indefinite articles appropriately.",
    "classification",
    [
      "recognise_article",
      "distinguish_definite_and_indefinite_reference",
      "choose_a_or_an",
      "use_article_with_noun_phrase",
    ],
    [
      "chooses_a_or_an_by_spelling_only",
      "uses_definite_article_for_every_noun",
      "omits_article_where_required",
    ],
    evidence(
      "Choose suitable articles for noun phrases and explain whether the reference is specific or general.",
      "Complete fresh sentences using appropriate articles.",
      "After a delay, select articles without prompts.",
      "Use articles accurately while describing unfamiliar people, objects and events.",
      [
        "selects_correct_article",
        "distinguishes_specific_and_general_reference",
        "constructs_valid_noun_phrase",
      ],
    ),
  ),

  spec(
    "B4.3.2.1.2",
    "Use Quantifiers",
    "Identify and use quantifiers to express quantities.",
    "classification",
    [
      "recognise_quantifier",
      "connect_quantifier_to_quantity",
      "distinguish_count_and_amount_contexts",
      "use_quantifier_in_sentence",
    ],
    [
      "uses_any_quantifier_with_any_noun",
      "confuses_number_with_quantifier",
      "ignores_quantity_meaning",
    ],
    evidence(
      "Choose quantifiers that correctly express quantities in short sentences.",
      "Use different quantifiers in fresh quantity contexts.",
      "After a delay, select suitable quantifiers independently.",
      "Apply quantifiers when describing quantities in a new everyday situation.",
      [
        "quantifier_matches_intended_quantity",
        "quantifier_fits_noun_context",
        "sentence_remains_grammatical",
      ],
    ),
  ),

  spec(
    "B4.3.2.1.3",
    "Use Possessive Pronouns",
    "Identify and use possessive pronouns to show possession.",
    "classification",
    [
      "identify_owner",
      "recognise_possessive_pronoun",
      "match_pronoun_to_owner",
      "use_possessive_form_without_redundant_noun",
    ],
    [
      "confuses_possessive_pronoun_and_possessive_adjective",
      "uses_personal_pronoun_instead_of_possessive_form",
      "repeats_possessed_noun_unnecessarily",
    ],
    evidence(
      "Replace repeated ownership phrases with suitable possessive pronouns.",
      "Use possessive pronouns in a fresh set of sentences.",
      "After a delay, select the correct possessive form independently.",
      "Use possessive pronouns while explaining ownership in a new context.",
      [
        "owner_reference_is_clear",
        "correct_possessive_form_is_used",
        "sentence_is_grammatical",
      ],
    ),
  ),

  spec(
    "B4.3.2.1.4",
    "Use Demonstratives",
    "Identify and use this, that, these and those appropriately.",
    "classification",
    [
      "distinguish_near_and_far_reference",
      "distinguish_singular_and_plural_reference",
      "select_demonstrative",
      "use_demonstrative_in_noun_phrase",
    ],
    [
      "ignores_distance",
      "ignores_number",
      "uses_this_or_that_with_plural_noun",
    ],
    evidence(
      "Select this, that, these or those for pictured or described situations.",
      "Use demonstratives correctly in fresh situations.",
      "After a delay, choose demonstratives without prompts.",
      "Use demonstratives while referring to unfamiliar objects in a new environment.",
      [
        "number_agrees_with_referent",
        "distance_reference_is_correct",
        "sentence_is_grammatical",
      ],
    ),
  ),

  spec(
    "B4.3.2.1.5",
    "Use Interrogative Determiners",
    "Identify and use interrogative determiners such as which and whose.",
    "classification",
    [
      "recognise_question_determiner",
      "distinguish_which_and_whose",
      "connect_determiner_to_information_needed",
      "construct_question",
    ],
    [
      "uses_which_when_asking_about_ownership",
      "uses_whose_as_personal_pronoun",
      "constructs_statement_instead_of_question",
    ],
    evidence(
      "Choose which or whose to complete questions about specific objects or ownership.",
      "Construct fresh questions using interrogative determiners.",
      "After a delay, select the correct interrogative determiner independently.",
      "Use which and whose appropriately while seeking information in a new situation.",
      [
        "question_type_matches_information_needed",
        "determiner_is_correct",
        "question_is_grammatical",
      ],
    ),
  ),

  spec(
    "B4.3.3.1.1",
    "Use Personal and Interrogative Pronouns",
    "Identify and use personal and interrogative pronouns appropriately.",
    "classification",
    [
      "recognise_pronoun",
      "identify_pronoun_referent",
      "distinguish_personal_and_interrogative_pronouns",
      "use_pronoun_in_sentence",
    ],
    [
      "uses_noun_repeatedly_instead_of_pronoun",
      "confuses_question_word_with_personal_pronoun",
      "creates_ambiguous_pronoun_reference",
    ],
    evidence(
      "Classify pronouns in sentences and identify what or whom each pronoun refers to.",
      "Use personal and interrogative pronouns in fresh sentences and questions.",
      "After a delay, distinguish pronoun types independently.",
      "Use suitable pronouns while discussing a new situation without unclear references.",
      [
        "pronoun_type_is_correct",
        "referent_is_clear",
        "pronoun_fits_sentence_role",
      ],
    ),
  ),

  spec(
    "B4.3.4.1.1",
    "Use Adjectives for Comparison",
    "Use adjectives to make comparisons.",
    "application",
    [
      "identify_describing_adjective",
      "recognise_comparison",
      "form_comparative_or_superlative",
      "use_comparison_in_sentence",
    ],
    [
      "uses_base_adjective_when_comparison_is_required",
      "confuses_comparative_and_superlative",
      "forms_irregular_comparison_incorrectly",
    ],
    evidence(
      "Complete comparison sentences using suitable adjective forms.",
      "Make comparisons using a fresh set of adjectives.",
      "After a delay, form comparative and superlative expressions independently.",
      "Compare unfamiliar people, objects or places using suitable adjectives.",
      [
        "comparison_form_matches_meaning",
        "adjective_form_is_grammatical",
        "comparison_is_clear",
      ],
    ),
  ),

  spec(
    "B4.3.5.1.1",
    "Use Main and Helping Verbs",
    "Use main verbs and helping verbs appropriately.",
    "application",
    [
      "identify_main_verb",
      "identify_helping_verb",
      "distinguish_verb_roles",
      "construct_complete_verb_phrase",
    ],
    [
      "treats_helping_verb_as_main_action",
      "omits_main_verb",
      "combines_incompatible_helping_and_main_verbs",
    ],
    evidence(
      "Identify main and helping verbs and construct complete verb phrases.",
      "Use different helping and main verbs in fresh sentences.",
      "After a delay, distinguish the two verb roles independently.",
      "Use appropriate verb phrases when describing a new event.",
      [
        "main_action_is_identified",
        "helping_verb_is_correct",
        "verb_phrase_is_grammatical",
      ],
    ),
  ),

  spec(
    "B4.3.5.1.2",
    "Apply Subject-Verb Agreement",
    "Use appropriate subject-verb agreement.",
    "application",
    [
      "identify_subject",
      "determine_subject_number",
      "select_agreeing_verb",
      "check_complete_sentence",
    ],
    [
      "chooses_verb_by_nearest_noun",
      "ignores_singular_plural_subject",
      "applies_agreement_rule_inconsistently",
    ],
    evidence(
      "Select verbs that agree with subjects in short sentences.",
      "Correct agreement errors in a fresh set of sentences.",
      "After a delay, apply subject-verb agreement without reminders.",
      "Use correct agreement while writing about a new situation.",
      [
        "subject_is_correctly_identified",
        "verb_agrees_with_subject",
        "agreement_holds_in_complete_sentence",
      ],
    ),
  ),

  spec(
    "B4.3.5.1.3",
    "Use the Simple Present",
    "Use the simple present for habitual actions, general truths, facts, immediate commentary and scheduled future actions.",
    "observed_performance",
    [
      "recognise_simple_present_context",
      "form_simple_present_verb",
      "maintain_subject_verb_agreement",
      "match_tense_to_intended_meaning",
    ],
    [
      "uses_present_continuous_for_every_present_event",
      "uses_past_form_for_habitual_action",
      "ignores_subject_verb_agreement",
    ],
    evidence(
      "Produce sentences using the simple present for several different present-time meanings.",
      "Use the simple present accurately in a fresh speaking or writing task.",
      "After a delay, select the simple present independently for appropriate contexts.",
      "Use the simple present in an unfamiliar real-life communication task.",
      [
        "tense_matches_intended_meaning",
        "verb_form_is_correct",
        "subject_verb_agreement_is_maintained",
      ],
    ),
  ),

  spec(
    "B4.3.5.1.4",
    "Use Regular Simple Past Forms",
    "Use regular forms of verbs in the simple past tense.",
    "application",
    [
      "recognise_completed_past_action",
      "identify_regular_verb",
      "form_regular_past",
      "use_past_form_in_sentence",
    ],
    [
      "uses_present_form_for_completed_past_action",
      "adds_ed_incorrectly",
      "mixes_present_and_past_without_reason",
    ],
    evidence(
      "Change regular verbs into their simple past forms and use them in sentences.",
      "Use a fresh set of regular verbs in past-tense sentences.",
      "After a delay, form regular past tense without a model.",
      "Describe a new completed event using regular past forms.",
      [
        "regular_past_form_is_correct",
        "tense_matches_completed_action",
        "sentence_is_consistent",
      ],
    ),
  ),

  spec(
    "B4.3.5.1.5",
    "Use the Simple Past",
    "Use the simple past for completed actions and regular actions in the past.",
    "application",
    [
      "recognise_past_time_context",
      "select_simple_past_form",
      "maintain_past_time_reference",
      "construct_complete_sentence",
    ],
    [
      "uses_present_for_past_event",
      "switches_tense_without_reason",
      "confuses_completed_and_ongoing_action",
    ],
    evidence(
      "Choose and use simple past forms to describe completed or repeated past actions.",
      "Describe different past events using fresh examples.",
      "After a delay, use the simple past independently.",
      "Give an account of an unfamiliar past event using consistent past-tense forms.",
      [
        "past_reference_is_clear",
        "verb_form_is_correct",
        "tense_is_consistent",
      ],
    ),
  ),

  spec(
    "B4.3.5.1.6",
    "Relate Past Events to the Present",
    "Use present forms appropriately when relating past events to the present.",
    "observed_performance",
    [
      "identify_past_event",
      "identify_present_relevance",
      "select_appropriate_present_form",
      "maintain_time_relationship",
    ],
    [
      "retells_everything_only_in_past_tense",
      "loses_present_relevance",
      "changes_time_reference_without_reason",
    ],
    evidence(
      "Explain a past event and connect it clearly to a present situation using appropriate verb forms.",
      "Relate a different past event to its present relevance.",
      "After a delay, express a past-to-present relationship independently.",
      "Connect an unfamiliar past experience to a current consequence or situation.",
      [
        "past_event_is_clear",
        "present_connection_is_clear",
        "verb_forms_preserve_time_relationship",
      ],
    ),
    3,
    ["B4.3.5.1.5"],
  ),

  spec(
    "B4.3.5.1.7",
    "Use Imperative Verbs",
    "Use imperative verb forms to give commands, orders and suggestions.",
    "application",
    [
      "recognise_command_or_suggestion",
      "use_base_verb_form",
      "construct_direct_instruction",
      "adjust_tone_to_context",
    ],
    [
      "adds_unnecessary_subject",
      "uses_past_tense_in_command",
      "cannot_distinguish_command_and_statement",
    ],
    evidence(
      "Turn situations into clear commands or suggestions using imperative verbs.",
      "Produce fresh imperatives for different situations.",
      "After a delay, construct imperative sentences independently.",
      "Give clear instructions in a new practical context.",
      [
        "imperative_form_is_correct",
        "instruction_is_clear",
        "tone_matches_context",
      ],
    ),
  ),

  spec(
    "B4.3.6.1.1",
    "Use Adverbs of Time and Place",
    "Use adverbs of time and place appropriately.",
    "constructed_response",
    [
      "recognise_adverb",
      "distinguish_time_and_place",
      "position_adverb_in_sentence",
      "connect_adverb_to_action",
    ],
    [
      "confuses_adverb_with_adjective",
      "labels_every_time_word_as_noun",
      "places_adverb_where_meaning_becomes_unclear",
    ],
    evidence(
      "Write sentences using adverbs of time and place and identify what each adverb modifies.",
      "Use different adverbs in fresh sentences.",
      "After a delay, identify and use time and place adverbs independently.",
      "Use suitable adverbs while writing about a new event or location.",
      [
        "adverb_type_is_correct",
        "adverb_modifies_intended_action",
        "sentence_meaning_is_clear",
      ],
    ),
  ),

  spec(
    "B4.3.6.1.2",
    "Use Adverbs of Time",
    "Use adverbs of time to modify verbs.",
    "application",
    [
      "identify_action_verb",
      "select_time_adverb",
      "connect_time_information_to_action",
      "place_adverb_appropriately",
    ],
    [
      "uses_place_adverb_when_time_is_required",
      "time_adverb_does_not_match_event",
      "fails_to_connect_adverb_to_verb",
    ],
    evidence(
      "Complete and create sentences in which adverbs of time modify actions clearly.",
      "Use fresh time adverbs with different verbs.",
      "After a delay, use time adverbs independently.",
      "Describe the timing of actions in an unfamiliar situation.",
      [
        "time_reference_is_correct",
        "adverb_modifies_intended_verb",
        "sentence_is_grammatical",
      ],
    ),
    2,
    ["B4.3.6.1.1"],
  ),

  spec(
    "B4.3.7.1.1",
    "Use Idiomatic Expressions",
    "Use idiomatic expressions appropriately in communication.",
    "application",
    [
      "recognise_idiom",
      "distinguish_literal_and_idiomatic_meaning",
      "infer_idiom_meaning_from_context",
      "use_idiom_appropriately",
    ],
    [
      "interprets_idiom_word_for_word",
      "uses_idiom_in_wrong_context",
      "changes_words_and_loses_idiomatic_meaning",
    ],
    evidence(
      "Interpret familiar idioms and use them in contexts where their intended meanings fit.",
      "Apply different idioms in fresh situations.",
      "After a delay, interpret and use previously learned idioms without prompts.",
      "Select an appropriate idiom for a new everyday communication context.",
      [
        "idiomatic_meaning_is_understood",
        "context_is_appropriate",
        "expression_is_used_coherently",
      ],
    ),
    3,
  ),

  spec(
    "B4.3.8.1.1",
    "Use Simple Conjunctions",
    "Identify and use and, but, or and nor to connect related, contrasting or alternative ideas.",
    "classification",
    [
      "recognise_conjunction",
      "identify_relationship_between_ideas",
      "select_suitable_conjunction",
      "join_clauses_or_items",
    ],
    [
      "uses_and_for_every_relationship",
      "confuses_contrast_and_alternative",
      "joins_unrelated_ideas",
    ],
    evidence(
      "Choose suitable conjunctions according to the relationship between ideas.",
      "Join a fresh set of ideas using and, but, or or nor.",
      "After a delay, select conjunctions independently.",
      "Use conjunctions to connect ideas in a new spoken or written context.",
      [
        "relationship_between_ideas_is_identified",
        "conjunction_matches_relationship",
        "combined_sentence_is_coherent",
      ],
    ),
  ),

  spec(
    "B4.3.9.1.1",
    "Use Modal Verbs",
    "Use modal verbs to express meanings such as ability, possibility, permission and obligation.",
    "application",
    [
      "recognise_modal_verb",
      "identify_intended_modal_meaning",
      "select_suitable_modal",
      "construct_modal_verb_phrase",
    ],
    [
      "treats_modals_as_main_action_verbs",
      "uses_same_modal_for_every_meaning",
      "adds_inflected_verb_after_modal",
    ],
    evidence(
      "Select modal verbs that correctly express ability, possibility, permission or obligation.",
      "Use different modals in fresh communication situations.",
      "After a delay, select appropriate modals independently.",
      "Use modal verbs appropriately in an unfamiliar practical situation.",
      [
        "modal_matches_intended_meaning",
        "verb_phrase_is_grammatical",
        "communication_is_clear",
      ],
    ),
  ),

  spec(
    "B4.3.10.1.1",
    "Use Prepositions",
    "Use prepositions to express direction, time, purpose, possession and comparison.",
    "application",
    [
      "recognise_preposition",
      "identify_relationship_expressed",
      "select_suitable_preposition",
      "construct_prepositional_phrase",
    ],
    [
      "selects_preposition_by_memorised_phrase_only",
      "confuses_direction_and_location",
      "uses_preposition_that_changes_intended_relationship",
    ],
    evidence(
      "Choose prepositions that correctly express relationships of direction, time, purpose, possession or comparison.",
      "Complete fresh sentences using appropriate prepositions.",
      "After a delay, select prepositions independently.",
      "Use prepositions accurately while describing a new route, event or relationship.",
      [
        "relationship_is_correctly_identified",
        "preposition_matches_intended_relationship",
        "phrase_is_grammatical",
      ],
    ),
  ),
];

if (
  GHANA_B4_ENGLISH_STRAND3_ADAPTIVE_SPECS.length !== 24
) {
  throw new Error(
    `Expected 24 Ghana B4 English Strand 3 adaptive specifications, found ${GHANA_B4_ENGLISH_STRAND3_ADAPTIVE_SPECS.length}.`,
  );
}