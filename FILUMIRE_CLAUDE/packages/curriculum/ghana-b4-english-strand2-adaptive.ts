import type { ResponseMode } from "../domain";

import type {
  GhanaB4EnglishAdaptiveSpec,
} from "./ghana-b4-english-adaptive";

import type {
  EnglishEvidenceDesign,
  EnglishEvidenceProfile,
} from "./ghana-b4-english-evidence";

export interface GhanaB4EnglishStrand2Spec
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
  profile: EnglishEvidenceProfile,
  diagnosticTask: string,
  reassessmentTask: string,
  retentionTask: string,
  transferTask: string,
  successCriteria: string[],
): EnglishEvidenceDesign {
  return {
    profile,
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
): GhanaB4EnglishStrand2Spec {
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

export const GHANA_B4_ENGLISH_STRAND2_ADAPTIVE_SPECS:
  GhanaB4EnglishStrand2Spec[] = [

  spec(
    "B4.2.2.1.1",
    "Match Speech Sounds to Letter Patterns",
    "Match familiar speech sounds to corresponding letters and letter patterns.",
    "matching",
    [
      "hear_target_sound",
      "identify_corresponding_letter",
      "distinguish_similar_letter_patterns",
      "match_sound_to_written_pattern",
    ],
    [
      "matches_by_letter_name_instead_of_sound",
      "confuses_similar_sounds",
      "ignores_position_of_sound_in_word",
    ],
    evidence(
      "sound_symbol_mapping",
      "Hear a set of familiar sounds and match each one to the correct letter or letter pattern.",
      "Match a new set of sounds to letter patterns not used in the diagnostic task.",
      "After a delay, identify the letter patterns representing previously learned sounds without reviewing them first.",
      "Use sound-letter knowledge to identify the correct pattern inside unfamiliar but decodable words.",
      [
        "accurately_discriminates_target_sounds",
        "selects_corresponding_letter_patterns",
        "does_not_rely_only_on_letter_names",
      ],
    ),
  ),

  spec(
    "B4.2.2.1.2",
    "Read Words with Consonant Digraphs",
    "Read single-syllable words containing taught consonant digraphs in isolation and connected text.",
    "oral_response",
    [
      "recognise_consonant_digraph",
      "blend_digraph_with_other_sounds",
      "decode_single_syllable_word",
      "read_word_in_connected_text",
    ],
    [
      "sounds_each_digraph_letter_separately",
      "guesses_word_from_first_letter",
      "decodes_word_in_isolation_but_not_in_text",
    ],
    evidence(
      "oral_decoding",
      "Read aloud unfamiliar single-syllable words containing taught digraphs, then read the same patterns inside short sentences.",
      "Read a fresh list and short passage containing the same digraph patterns.",
      "After a delay, read new words containing the previously taught digraphs without rehearsal.",
      "Decode taught digraphs in unfamiliar words embedded in a new everyday passage.",
      [
        "recognises_digraph_as_sound_unit",
        "blends_complete_word_accurately",
        "maintains_accuracy_in_connected_text",
      ],
    ),
    2,
    ["B4.2.2.1.1"],
  ),

  spec(
    "B4.2.2.1.3",
    "Use Digraph Words in Sentences",
    "Use words containing consonant digraphs to make meaningful sentences.",
    "application",
    [
      "decode_target_word",
      "understand_word_meaning",
      "select_word_for_sentence",
      "construct_meaningful_sentence",
    ],
    [
      "uses_target_word_without_understanding",
      "produces_fragment_instead_of_sentence",
      "changes_target_word_to_unrelated_word",
    ],
    evidence(
      "sentence_application",
      "Use selected digraph words to create complete sentences that show their meanings.",
      "Create fresh sentences using different digraph words.",
      "After a delay, use previously learned digraph words correctly in new sentences.",
      "Use suitable digraph words while writing or speaking about a new familiar situation.",
      [
        "uses_target_word_appropriately",
        "sentence_is_complete_and_meaningful",
        "word_meaning_fits_context",
      ],
    ),
    2,
    ["B4.2.2.1.2"],
  ),

  spec(
    "B4.2.2.2.1",
    "Use Word Cues to Recognise Words",
    "Recognise and read words using cues such as prefixes and word beginnings.",
    "classification",
    [
      "notice_word_beginning",
      "recognise_prefix_or_known_part",
      "combine_cue_with_remaining_letters",
      "confirm_word_from_context",
    ],
    [
      "guesses_from_first_letter_only",
      "treats_prefix_as_complete_word",
      "ignores_remaining_letter_pattern",
    ],
    evidence(
      "word_analysis",
      "Identify the useful cue in each unfamiliar word and use it to read the complete word.",
      "Analyse a fresh set of words with different beginnings and prefixes.",
      "After a delay, use familiar word-part cues to recognise new examples.",
      "Apply word-analysis cues while reading unfamiliar words in a short passage.",
      [
        "identifies_relevant_word_part",
        "uses_more_than_initial_letter_guessing",
        "confirms_complete_word_accurately",
      ],
    ),
    2,
    ["B4.2.2.1.1"],
  ),

  spec(
    "B4.2.3.1.1",
    "Decode Words Using Rhyming Families",
    "Use common rhyming and ending patterns to decode words.",
    "application",
    [
      "recognise_rime_pattern",
      "compare_word_endings",
      "substitute_initial_sound",
      "decode_new_word_from_family",
    ],
    [
      "matches_words_by_first_letter",
      "confuses_visual_similarity_with_rhyme",
      "cannot_transfer_known_ending_to_new_word",
    ],
    evidence(
      "word_analysis",
      "Use known word endings to decode unfamiliar words from the same word family.",
      "Decode a fresh set of words using different known rime patterns.",
      "After a delay, recognise and use previously learned word families.",
      "Use a familiar rime pattern to decode a new word encountered in connected text.",
      [
        "recognises_shared_ending_pattern",
        "changes_initial_sound_correctly",
        "reads_resulting_word_accurately",
      ],
    ),
    2,
    ["B4.2.2.1.1"],
  ),

  spec(
    "B4.2.3.1.2",
    "Read Digraph Words in Meaningful Sentences",
    "Read words with digraphs accurately within meaningful sentences.",
    "oral_response",
    [
      "recognise_digraph",
      "decode_complete_word",
      "read_sentence_smoothly",
      "preserve_sentence_meaning",
    ],
    [
      "reads_digraph_letters_separately",
      "loses_word_accuracy_in_sentence",
      "reads_words_without_sentence_phrasing",
    ],
    evidence(
      "oral_decoding",
      "Read aloud short meaningful sentences containing unfamiliar examples of taught digraphs.",
      "Read a fresh set of sentences containing the same digraph patterns.",
      "After a delay, read connected sentences containing taught digraphs without prior rehearsal.",
      "Read a new short passage where digraph words must be decoded while maintaining sentence meaning.",
      [
        "decodes_digraph_words_accurately",
        "reads_complete_sentence",
        "maintains_meaning_and_basic_phrasing",
      ],
    ),
    2,
    ["B4.2.2.1.2"],
  ),

  spec(
    "B4.2.4.1.1",
    "Use Diphthong Words in Sentences",
    "Use words containing taught closing diphthongs in meaningful sentences.",
    "application",
    [
      "recognise_diphthong_sound",
      "identify_word_with_target_pattern",
      "understand_target_word",
      "use_word_in_sentence",
    ],
    [
      "treats_diphthong_as_two_unrelated_sounds",
      "selects_word_with_wrong_vowel_pattern",
      "uses_word_in_semantically_wrong_context",
    ],
    evidence(
      "sentence_application",
      "Select words containing target diphthongs and use them in meaningful sentences.",
      "Use a fresh set of diphthong words in different sentences.",
      "After a delay, produce correct sentences with previously learned diphthong patterns.",
      "Use appropriate diphthong words in a new spoken or written everyday context.",
      [
        "recognises_target_diphthong",
        "selects_correct_word",
        "uses_word_meaningfully",
      ],
    ),
    2,
    ["B4.2.2.1.1"],
  ),

  spec(
    "B4.2.5.1.1",
    "Blend Sounds to Produce Words",
    "Orally blend phonemes, including consonant blends, to produce single-syllable words.",
    "oral_response",
    [
      "hear_individual_phonemes",
      "hold_sound_sequence",
      "blend_sounds_continuously",
      "produce_complete_word",
    ],
    [
      "omits_sound_during_blending",
      "reorders_phonemes",
      "segments_when_blending_is_required",
    ],
    evidence(
      "oral_decoding",
      "Listen to segmented sounds and orally blend them into complete single-syllable words.",
      "Blend a fresh set of segmented words containing different consonant combinations.",
      "After a delay, orally blend previously practised sound patterns without modelling.",
      "Blend sounds to identify an unfamiliar word needed to complete a spoken sentence.",
      [
        "preserves_all_phonemes",
        "maintains_correct_sound_order",
        "produces_complete_word",
      ],
    ),
    2,
    ["B4.2.2.1.1"],
  ),

  spec(
    "B4.2.5.1.2",
    "Apply Digraph Spelling-Sound Correspondence",
    "Use spelling-sound correspondences for common consonant digraphs.",
    "application",
    [
      "identify_written_digraph",
      "recall_corresponding_sound",
      "apply_sound_during_decoding",
      "apply_pattern_during_word_use",
    ],
    [
      "pronounces_each_digraph_letter_individually",
      "uses_wrong_digraph_sound",
      "memorises_word_without_generalising_pattern",
    ],
    evidence(
      "sound_symbol_mapping",
      "Given common digraph spellings, produce or select the corresponding sounds and use them to decode words.",
      "Apply the same correspondences to a fresh group of words.",
      "After a delay, identify and use learned digraph correspondences without review.",
      "Apply a known digraph correspondence in an unfamiliar word encountered in a new context.",
      [
        "maps_digraph_to_correct_sound",
        "uses_mapping_in_complete_word",
        "generalises_correspondence_to_new_example",
      ],
    ),
    2,
    ["B4.2.2.1.1"],
  ),

  spec(
    "B4.2.6.1.1",
    "Use Content and Function Words Appropriately",
    "Use level-appropriate content words and common function words appropriately in spoken and written communication.",
    "application",
    [
      "distinguish_content_and_function_roles",
      "select_context_appropriate_word",
      "place_word_grammatically",
      "communicate_intended_meaning",
    ],
    [
      "selects_word_by_topic_without_sentence_fit",
      "omits_needed_function_word",
      "uses_correct_word_class_in_wrong_context",
    ],
    evidence(
      "vocabulary_application",
      "Complete and create spoken or written sentences using suitable content and function words.",
      "Use different target words in fresh sentences and contexts.",
      "After a delay, use learned vocabulary appropriately without a supplied word bank.",
      "Choose suitable words for a new home, school or community communication task.",
      [
        "word_choice_matches_intended_meaning",
        "word_fits_grammatical_role",
        "sentence_remains_clear",
      ],
    ),
  ),

  spec(
    "B4.2.6.1.2",
    "Use Language and Vocabulary Terms",
    "Use terms such as compound word, idiom, simile, synonym, antonym, prefix, suffix and phrasal verb appropriately.",
    "application",
    [
      "recognise_language_term",
      "distinguish_term_from_other_categories",
      "identify_example",
      "use_term_when_explaining_language",
    ],
    [
      "memorises_definition_without_recognition",
      "confuses_synonym_and_antonym",
      "confuses_prefix_and_suffix",
    ],
    evidence(
      "vocabulary_application",
      "Identify examples of language features and correctly name or use the relevant terminology.",
      "Classify and explain a fresh set of examples using the correct terms.",
      "After a delay, retrieve the terminology and apply it to new examples.",
      "Use the appropriate terminology while discussing unfamiliar sentences or a short text.",
      [
        "selects_correct_term",
        "distinguishes_related_terms",
        "applies_term_to_valid_example",
      ],
    ),
  ),

  spec(
    "B4.2.6.2.1",
    "Develop Vocabulary Through Reading",
    "Build vocabulary through extensive reading of age-appropriate texts.",
    "application",
    [
      "notice_unfamiliar_word",
      "infer_or_check_word_meaning",
      "retain_useful_new_word",
      "use_new_word_in_context",
    ],
    [
      "skips_all_unfamiliar_words",
      "copies_definition_without_understanding",
      "recognises_word_but_cannot_use_it",
    ],
    evidence(
      "vocabulary_application",
      "Read a short age-appropriate text, identify useful unfamiliar words, establish their meanings and use selected words.",
      "Repeat the process with a fresh text and different vocabulary.",
      "After a delay, explain or use vocabulary acquired from earlier reading.",
      "Apply vocabulary learned from reading while discussing or writing about a different topic.",
      [
        "identifies_relevant_new_vocabulary",
        "establishes_contextually_valid_meaning",
        "uses_new_word_appropriately",
      ],
    ),
    3,
  ),

  spec(
    "B4.2.6.3.1",
    "Infer Word Meaning from Context",
    "Deduce the meaning of words from how they are used in context.",
    "explanation",
    [
      "locate_unknown_word",
      "identify_context_clues",
      "form_possible_meaning",
      "verify_meaning_against_sentence",
    ],
    [
      "guesses_without_context_evidence",
      "uses_only_prior_word_association",
      "chooses_meaning_that_breaks_sentence",
    ],
    evidence(
      "contextual_inference",
      "Infer the meaning of an unfamiliar word from surrounding sentence or passage clues and explain the evidence used.",
      "Infer meanings of different unfamiliar words in fresh contexts.",
      "After a delay, infer a new word meaning without being reminded of the strategy.",
      "Infer the meaning of an unfamiliar word in a new subject or everyday passage.",
      [
        "identifies_relevant_context_clue",
        "proposes_contextually_plausible_meaning",
        "explains_connection_between_clue_and_meaning",
      ],
    ),
    3,
  ),

  spec(
    "B4.2.6.3.2",
    "Infer Meaning Through Word Relationships",
    "Deduce word meanings using relationships such as synonyms and antonyms.",
    "explanation",
    [
      "identify_word_relationship",
      "recognise_synonym_or_antonym_signal",
      "infer_target_meaning",
      "verify_against_context",
    ],
    [
      "confuses_synonym_with_antonym",
      "assumes_related_words_mean_exactly_same",
      "ignores_context_when_using_relationship",
    ],
    evidence(
      "contextual_inference",
      "Use synonym or antonym relationships in sentences to infer target word meanings and explain the reasoning.",
      "Infer meanings from a fresh set of synonym and antonym contexts.",
      "After a delay, use word relationships independently to infer unfamiliar meanings.",
      "Use a relationship between words to interpret vocabulary in a new passage.",
      [
        "recognises_correct_relationship",
        "infers_plausible_meaning",
        "supports_inference_with_word_relationship",
      ],
    ),
    3,
  ),

  spec(
    "B4.2.6.4.1",
    "Build Vocabulary Through Affixation",
    "Expand vocabulary by using prefixes and suffixes to form and understand words.",
    "application",
    [
      "identify_base_word",
      "identify_affix",
      "recognise_affix_effect",
      "form_or_interpret_new_word",
    ],
    [
      "treats_affix_as_unrelated_letters",
      "changes_base_word_without considering_meaning",
      "assumes_every_affix_has_same_effect",
    ],
    evidence(
      "word_analysis",
      "Add or analyse prefixes and suffixes to form words and explain how meaning changes.",
      "Work with different base words and affixes in a fresh task.",
      "After a delay, construct or interpret affixed words without a model.",
      "Use knowledge of affixes to interpret an unfamiliar word in connected text.",
      [
        "identifies_base_and_affix",
        "forms_valid_word",
        "explains_or_applies_meaning_change",
      ],
    ),
    3,
  ),

  spec(
    "B4.2.6.4.2",
    "Recognise Playful Uses of Words",
    "Recognise playful word use in jokes and riddles.",
    "classification",
    [
      "identify_unusual_word_use",
      "notice_multiple_or_unexpected_meaning",
      "distinguish_literal_and_playful_use",
      "explain_basic_wordplay",
    ],
    [
      "interprets_all_language_literally",
      "labels_any_funny_sentence_as_wordplay",
      "cannot_identify_word_causing_playfulness",
    ],
    evidence(
      "contextual_inference",
      "Identify the word or phrase creating the playful effect in short jokes or riddles and explain the basic reason.",
      "Analyse a fresh set of simple jokes and riddles.",
      "After a delay, recognise playful word use in new examples.",
      "Identify and interpret simple wordplay encountered in a new spoken or written context.",
      [
        "locates_relevant_word_or_phrase",
        "distinguishes_literal_from_playful_meaning",
        "gives_contextually_sensible_explanation",
      ],
    ),
    3,
  ),

  spec(
    "B4.2.6.4.3",
    "Choose Vocabulary for Purpose and Audience",
    "Use words suitable for purpose, audience, context and culture when producing explanatory texts.",
    "application",
    [
      "identify_purpose",
      "identify_audience",
      "select_suitable_vocabulary",
      "check_word_choice_for_context",
    ],
    [
      "uses_same_register_for_every_audience",
      "chooses_complex_word_without_clear meaning",
      "ignores_cultural_or_contextual_fit",
    ],
    evidence(
      "vocabulary_application",
      "Choose vocabulary for a short explanation after being given a specific audience, purpose and context.",
      "Produce a fresh explanation for a different audience or purpose.",
      "After a delay, independently adjust vocabulary to match a stated audience.",
      "Adapt vocabulary when explaining the same idea in a different real-life context.",
      [
        "word_choice_matches_purpose",
        "word_choice_is_accessible_to_audience",
        "language_is_contextually_appropriate",
      ],
    ),
    3,
  ),

  spec(
    "B4.2.7.1.1",
    "Construct Meaning from Text",
    "Construct coherent meaning from a level-appropriate text.",
    "explanation",
    [
      "identify_topic",
      "connect_key_information",
      "infer_overall_message",
      "support_interpretation_with_text",
    ],
    [
      "retells_isolated_details_without_overall meaning",
      "uses_only_prior_knowledge",
      "gives_interpretation_without_text_support",
    ],
    evidence(
      "reading_comprehension",
      "Read a short passage and explain its overall meaning using important information from the text.",
      "Read a fresh passage and explain its meaning using textual support.",
      "After a delay, independently construct meaning from a new passage.",
      "Interpret a text from a different everyday or curriculum context and support the interpretation.",
      [
        "identifies_central_meaning",
        "connects_relevant_information",
        "supports_interpretation_with_textual_evidence",
      ],
    ),
    3,
  ),

  spec(
    "B4.2.7.1.2",
    "Recall Main Ideas in Sequence",
    "Identify and recall main ideas from a text in their correct sequence.",
    "sequence_ordering",
    [
      "identify_main_ideas",
      "distinguish_main_from_minor_detail",
      "track_text_order",
      "reconstruct_sequence",
    ],
    [
      "orders_minor_details_instead_of_main_ideas",
      "recalls_ideas_but_changes_sequence",
      "uses_memory_of_topic_instead_of_text_order",
    ],
    evidence(
      "reading_comprehension",
      "Read a short text, identify its main ideas and arrange them in the sequence presented.",
      "Sequence the main ideas from a fresh passage.",
      "After a delay, reconstruct the order of main ideas from a newly read text without prompts.",
      "Sequence main ideas from a different type of text such as instructions or a short account.",
      [
        "selects_main_ideas",
        "orders_ideas_correctly",
        "excludes_irrelevant_minor_details",
      ],
    ),
    3,
    ["B4.2.7.1.1"],
  ),

  spec(
    "B4.2.7.1.3",
    "Skim to Identify Main Ideas",
    "Skim a level-appropriate text to identify its main ideas.",
    "short_answer",
    [
      "use_title_and_headings",
      "notice_repeated_key_information",
      "avoid_reading_every_word",
      "state_main_idea_concisely",
    ],
    [
      "reads_every_word_when_skimming_is_required",
      "selects_first_sentence_automatically",
      "reports_minor_detail_as_main_idea",
    ],
    evidence(
      "reading_comprehension",
      "Skim a short text within a limited reading period and state its main idea.",
      "Skim a fresh text and identify the main idea without close-reading every sentence.",
      "After a delay, independently use skimming to identify the main idea of a new text.",
      "Skim an unfamiliar informational or everyday text to decide what it is mainly about.",
      [
        "uses_text_features_and_key_information",
        "identifies_central_idea",
        "avoids_dependence_on_minor_details",
      ],
    ),
    3,
  ),

  spec(
    "B4.2.7.1.4",
    "Read Closely for Comprehension",
    "Read level-appropriate text silently and closely to understand its meaning.",
    "short_answer",
    [
      "sustain_silent_reading",
      "track_key_information",
      "connect_details",
      "answer_from_text",
    ],
    [
      "finishes_text_without_monitoring_meaning",
      "answers_from_guess_or_prior knowledge",
      "misses_information_later_in_text",
    ],
    evidence(
      "reading_comprehension",
      "Read a short text silently and answer meaning-focused questions that require attention to the text.",
      "Read a fresh passage silently and answer new comprehension questions.",
      "After a delay, independently read and comprehend another passage without strategy reminders.",
      "Use close reading to obtain needed information from a new practical or informational text.",
      [
        "answers_are_supported_by_text",
        "integrates_information_across_text",
        "maintains_attention_to_complete_passage",
      ],
    ),
    3,
  ),

  spec(
    "B4.2.7.2.1",
    "Respond to Text with Reasons",
    "Give a response to a text and support it with relevant reasons.",
    "explanation",
    [
      "form_response_to_text",
      "identify_supporting_information",
      "connect_reason_to_response",
      "express_reason_clearly",
    ],
    [
      "states_opinion_without_reason",
      "gives_reason_unrelated_to_text",
      "retells_text_instead_of_responding",
    ],
    evidence(
      "reading_comprehension",
      "Respond to an idea or event in a text and explain the response using a relevant reason.",
      "Respond with reasons to a different text and prompt.",
      "After a delay, independently justify a response to a new passage.",
      "Use evidence and reasoning to respond to an unfamiliar everyday or informational text.",
      [
        "response_addresses_text",
        "reason_is_relevant",
        "reason_is_connected_clearly_to_response",
      ],
    ),
    3,
    ["B4.2.7.1.1"],
  ),

  spec(
    "B4.2.7.2.2",
    "Connect Text to Real-Life Experience",
    "Make meaningful connections between a text and personal experience or real life.",
    "explanation",
    [
      "identify_text_event_or_idea",
      "recall_relevant_real_life_example",
      "state_connection",
      "explain_similarity_or_difference",
    ],
    [
      "shares_personal_story_unrelated_to_text",
      "repeats_text_without_real_life_connection",
      "states_connection_without_explanation",
    ],
    evidence(
      "reading_comprehension",
      "Identify an important idea or event in a text and explain a relevant connection to real life.",
      "Make and explain a connection using a fresh passage.",
      "After a delay, independently connect a new text to relevant experience or knowledge.",
      "Transfer the same connection-making skill to an unfamiliar community or curriculum context.",
      [
        "connection_is_relevant_to_text",
        "real_life_example_is_clear",
        "relationship_between_text_and_example_is_explained",
      ],
    ),
    3,
    ["B4.2.7.1.1"],
  ),

  spec(
    "B4.2.7.2.3",
    "Recognise Text Structure",
    "Recognise basic text structure including introduction, body and conclusion.",
    "classification",
    [
      "recognise_opening_function",
      "recognise_development_of_ideas",
      "recognise_closing_function",
      "classify_text_sections",
    ],
    [
      "classifies_sections_by_length_only",
      "assumes_first_sentence_is_entire introduction",
      "confuses_body_detail_with conclusion",
    ],
    evidence(
      "reading_comprehension",
      "Identify and classify the introduction, body and conclusion in a short structured text.",
      "Classify the sections of a fresh text with different paragraph lengths.",
      "After a delay, identify basic text structure without labels or highlighting.",
      "Recognise introduction, body and conclusion in an unfamiliar explanatory or informational text.",
      [
        "identifies_opening_function",
        "identifies_development_section",
        "identifies_closing_function",
      ],
    ),
    3,
  ),

  spec(
    "B4.2.7.3.1",
    "Determine Contextual Meaning",
    "Determine the contextual meaning of words and phrases in a text.",
    "explanation",
    [
      "identify_target_word_or_phrase",
      "locate_relevant_context",
      "infer_contextual_meaning",
      "justify_interpretation",
    ],
    [
      "uses_first_dictionary_meaning_regardless_of_context",
      "ignores_surrounding_sentences",
      "gives_meaning_without_support",
    ],
    evidence(
      "contextual_inference",
      "Explain the meaning of selected words or phrases as they are used in a passage and identify supporting clues.",
      "Interpret different words and phrases in a fresh passage.",
      "After a delay, infer contextual meanings independently in a new text.",
      "Determine the meaning of an unfamiliar expression in a different real-life or curriculum passage.",
      [
        "meaning_fits_passage",
        "uses_relevant_context_clues",
        "explains_reasoning",
      ],
    ),
    3,
    ["B4.2.6.3.1"],
  ),

  spec(
    "B4.2.8.1.1",
    "Read Silently for Meaning",
    "Read level-appropriate texts silently at a reasonable pace and construct meaning.",
    "short_answer",
    [
      "maintain_silent_attention",
      "read_at_functional_pace",
      "monitor_understanding",
      "extract_key_meaning",
    ],
    [
      "rushes_without_comprehension",
      "subvocal_difficulty_blocks_meaning",
      "cannot_state_meaning_after_reading",
    ],
    evidence(
      "reading_comprehension",
      "Read a level-appropriate passage silently and give concise answers showing understanding.",
      "Read a fresh passage silently and demonstrate comprehension.",
      "After a delay, silently read and understand another text without prior review.",
      "Use silent reading to obtain meaning from an unfamiliar practical text.",
      [
        "comprehends_without_reading_aloud_support",
        "answers_reflect_text_meaning",
        "maintains_reasonable_reading_flow",
      ],
    ),
    3,
  ),

  spec(
    "B4.2.8.1.2",
    "Find Word Meaning in Context",
    "Determine the meaning of words as they are used in a passage.",
    "short_answer",
    [
      "locate_target_word",
      "read_surrounding_context",
      "infer_local_meaning",
      "select_or_state_best_meaning",
    ],
    [
      "uses_out_of_context_meaning",
      "guesses_from_word_shape",
      "ignores_sentence_relationships",
    ],
    evidence(
      "contextual_inference",
      "Read a passage and state the contextual meanings of selected words.",
      "Determine meanings of different words in a fresh passage.",
      "After a delay, infer word meaning from a new passage without prompts.",
      "Use context to interpret unfamiliar vocabulary in a different subject or everyday text.",
      [
        "meaning_matches_local_context",
        "uses_surrounding_information",
        "avoids_unrelated_dictionary_meaning",
      ],
    ),
    3,
    ["B4.2.6.3.1"],
  ),

  spec(
    "B4.2.8.1.3",
    "Answer Passage-Based Questions",
    "Answer questions accurately using information and meaning from a passage.",
    "application",
    [
      "interpret_question",
      "locate_relevant_information",
      "integrate_text_information",
      "form_accurate_answer",
    ],
    [
      "answers_from_general_knowledge_only",
      "copies_unrelated_sentence",
      "misreads_question_requirement",
    ],
    evidence(
      "reading_comprehension",
      "Read a passage and answer literal and meaning-focused questions using evidence from the text.",
      "Answer a new set of questions on a fresh passage.",
      "After a delay, independently answer passage-based questions without strategy prompts.",
      "Use information from an unfamiliar practical or informational text to answer purposeful questions.",
      [
        "answers_question_asked",
        "uses_relevant_text_information",
        "response_is_consistent_with_passage",
      ],
    ),
    3,
    ["B4.2.7.1.4"],
  ),

  spec(
    "B4.2.9.1.1",
    "Read Aloud Fluently and Expressively",
    "Read grade-level text aloud with appropriate pace, accuracy and expression.",
    "oral_response",
    [
      "decode_words_accurately",
      "maintain_suitable_pace",
      "phrase_connected_text",
      "use_expression_to_support_meaning",
    ],
    [
      "equates_fluency_with_speed",
      "reads_word_by_word",
      "sacrifices_accuracy_for_pace",
    ],
    evidence(
      "reading_fluency",
      "Read an unfamiliar grade-level passage aloud while an evaluator judges accuracy, pace, phrasing and expression.",
      "Read a fresh passage of comparable difficulty aloud.",
      "After a delay, read another unfamiliar grade-level passage without rehearsal.",
      "Read aloud a different type of text while adapting pace and expression to its meaning.",
      [
        "word_reading_is_accurate",
        "pace_supports_comprehension",
        "phrasing_is_meaningful",
        "expression_reflects_text",
      ],
    ),
    3,
    ["B4.2.3.1.2"],
  ),

  spec(
    "B4.2.9.1.2",
    "Use Recognition Strategies to Check Understanding",
    "Use word-recognition and meaning-monitoring strategies to confirm understanding while reading.",
    "application",
    [
      "notice_breakdown_in_understanding",
      "apply_word_recognition_strategy",
      "reread_or_check_context",
      "confirm_revised_understanding",
    ],
    [
      "continues_reading_after_meaning_breakdown",
      "guesses_unknown_word_without_checking",
      "uses_strategy_but_never_verifies_meaning",
    ],
    evidence(
      "reading_comprehension",
      "Read a short passage containing a deliberate challenge and show how a recognition or checking strategy restores understanding.",
      "Use an appropriate checking strategy on a fresh passage with a different challenge.",
      "After a delay, independently notice and repair a comprehension breakdown.",
      "Apply recognition and checking strategies while reading an unfamiliar practical or informational text.",
      [
        "notices_understanding_problem",
        "selects_relevant_strategy",
        "verifies_result_against_text_meaning",
      ],
    ),
    3,
  ),

  spec(
    "B4.2.10.1.1",
    "Summarise a Passage Orally",
    "Give an oral summary of a level-appropriate passage or text.",
    "oral_response",
    [
      "identify_main_idea",
      "select_key_supporting_points",
      "omit_minor_details",
      "present_concise_oral_summary",
    ],
    [
      "retells_entire_passage",
      "lists_unconnected_details",
      "omits_central_idea",
    ],
    evidence(
      "oral_summary",
      "Read a short passage and give an oral summary containing the central idea and essential supporting information.",
      "Give an oral summary of a fresh passage without repeating the original wording.",
      "After a delay, orally summarise a newly read passage without a summary template.",
      "Summarise orally an unfamiliar informational or everyday text for another listener.",
      [
        "states_central_idea",
        "includes_essential_points",
        "excludes_minor_or_redundant_details",
        "summary_is_coherent_and_concise",
      ],
    ),
    3,
    ["B4.2.7.1.1"],
  ),

  spec(
    "B4.2.10.1.2",
    "Write a Short Passage Summary",
    "Write a concise summary of a level-appropriate passage or text.",
    "constructed_response",
    [
      "identify_central_idea",
      "select_essential_information",
      "organise_summary",
      "write_in_own_words",
    ],
    [
      "copies_large_sections_of_source",
      "includes_every_minor_detail",
      "writes_opinion_instead_of_summary",
    ],
    evidence(
      "written_summary",
      "Read a short passage and write a concise summary in the learner's own words.",
      "Write a summary of a fresh passage with different content.",
      "After a delay, independently summarise a newly read passage without a scaffold.",
      "Write a concise summary of an unfamiliar informational or everyday text for a stated audience.",
      [
        "captures_central_idea",
        "retains_essential_information",
        "uses_own_words",
        "is_coherent_and_concise",
      ],
    ),
    3,
    ["B4.2.10.1.1"],
  ),
];

if (GHANA_B4_ENGLISH_STRAND2_ADAPTIVE_SPECS.length !== 32) {
  throw new Error(
    `Expected 32 Ghana B4 English Strand 2 adaptive specifications, found ${GHANA_B4_ENGLISH_STRAND2_ADAPTIVE_SPECS.length}.`,
  );
}