import type { ResponseMode } from "../domain";

import type {
  GhanaB4EnglishAdaptiveSpec,
} from "./ghana-b4-english-adaptive";

import type {
  EnglishEvidenceDesign,
} from "./ghana-b4-english-evidence";

export interface GhanaB4EnglishStrand4Spec
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
    profile: "writing_composition",
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
): GhanaB4EnglishStrand4Spec {
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

export const GHANA_B4_ENGLISH_STRAND4_ADAPTIVE_SPECS:
  GhanaB4EnglishStrand4Spec[] = [

  spec(
    "B4.4.2.1.1",
    "Write Clearly with Joined Letters",
    "Write clearly using joined letters of consistent size.",
    "constructed_response",
    [
      "form_legible_letters",
      "join_letters_appropriately",
      "maintain_consistent_letter_size",
      "maintain_readable_word_spacing",
    ],
    [
      "joins_letters_in_ways_that_reduce_legibility",
      "varies_letter_size_excessively",
      "focuses_on_speed_instead_of_readability",
    ],
    evidence(
      "Produce a short handwritten passage using joined letters of consistent size.",
      "Write a fresh passage showing the same handwriting features.",
      "After a delay, reproduce clear joined handwriting without a model.",
      "Apply clear joined handwriting to an unfamiliar functional writing task.",
      [
        "letters_are_legible",
        "letter_size_is_consistent",
        "joining_supports_readability",
      ],
    ),
  ),

  spec(
    "B4.4.2.1.2",
    "Use Simple Sentences Clearly",
    "Use simple sentences clearly and correctly.",
    "application",
    [
      "identify_complete_thought",
      "use_subject_and_predicate",
      "maintain_correct_word_order",
      "apply_basic_sentence_punctuation",
    ],
    [
      "writes_sentence_fragment",
      "joins_unrelated_ideas_into_one_sentence",
      "omits_required_sentence_punctuation",
    ],
    evidence(
      "Construct simple sentences from familiar ideas.",
      "Construct fresh simple sentences accurately.",
      "After a delay, write complete simple sentences independently.",
      "Use clear simple sentences in a new practical writing task.",
      [
        "sentence_expresses_complete_thought",
        "word_order_is_clear",
        "basic_punctuation_is_correct",
      ],
    ),
  ),

  spec(
    "B4.4.6.1.1",
    "Choose Writing for Purpose and Audience",
    "Choose appropriate writing modes for different purposes, audiences and contexts and organise ideas using suitable text features.",
    "constructed_response",
    [
      "identify_writing_purpose",
      "identify_target_audience",
      "select_appropriate_writing_mode",
      "organise_relevant_information",
      "use_suitable_text_features",
    ],
    [
      "uses_same_writing_style_for_every_audience",
      "ignores_purpose_when_selecting_format",
      "includes_information_without_logical_organisation",
    ],
    evidence(
      "Given a purpose and audience, choose a suitable writing form and organise the main ideas.",
      "Plan a fresh piece for a different audience and purpose.",
      "After a delay, independently match writing form to purpose and audience.",
      "Create an appropriate plan for an unfamiliar real-world writing situation.",
      [
        "writing_mode_matches_purpose",
        "writing_is_audience_appropriate",
        "ideas_are_logically_organised",
      ],
    ),
    3,
  ),

  spec(
    "B4.4.6.1.2",
    "Identify Main and Supporting Ideas",
    "Identify the main idea and supporting details in a paragraph.",
    "classification",
    [
      "identify_paragraph_topic",
      "identify_main_idea",
      "distinguish_supporting_detail",
      "connect_details_to_main_idea",
    ],
    [
      "treats_first_sentence_as_main_idea_automatically",
      "selects_interesting_detail_as_main_idea",
      "cannot_distinguish_main_and_minor_information",
    ],
    evidence(
      "Identify the main idea and classify details as supporting or non-supporting.",
      "Analyse a fresh paragraph for its main and supporting ideas.",
      "After a delay, identify paragraph structure independently.",
      "Use the same distinction when organising information for a new paragraph.",
      [
        "main_idea_is_correct",
        "supporting_details_are_relevant",
        "relationship_between_ideas_is_clear",
      ],
    ),
  ),

  spec(
    "B4.4.9.1.1",
    "Plan Before Writing",
    "Select a topic, brainstorm and organise ideas before writing.",
    "constructed_response",
    [
      "select_relevant_topic",
      "generate_related_ideas",
      "group_related_ideas",
      "organise_ideas_before_drafting",
    ],
    [
      "begins_drafting_without_planning",
      "includes_unrelated_brainstormed_ideas",
      "treats_brainstorm_as_finished_draft",
    ],
    evidence(
      "Choose an immediate-environment topic and produce an organised pre-writing plan.",
      "Plan a fresh paragraph on a different topic.",
      "After a delay, independently use brainstorming and organisation before drafting.",
      "Plan writing for an unfamiliar community or everyday issue.",
      [
        "topic_is_clear",
        "ideas_are_relevant",
        "ideas_are_organised_before_drafting",
      ],
    ),
  ),

  spec(
    "B4.4.9.2.1",
    "Develop a Cohesive Paragraph Draft",
    "Develop organised ideas into a one-paragraph draft using nouns and pronouns clearly and cohesively.",
    "constructed_response",
    [
      "develop_planned_ideas",
      "maintain_paragraph_focus",
      "use_nouns_and_pronouns_for_reference",
      "avoid_ambiguous_reference",
      "connect_sentences_cohesively",
    ],
    [
      "changes_topic_within_paragraph",
      "uses_pronouns_with_unclear_referents",
      "writes_disconnected_sentences",
    ],
    evidence(
      "Develop a prepared plan into one coherent paragraph.",
      "Draft a fresh paragraph from a different organised plan.",
      "After a delay, produce a cohesive paragraph independently.",
      "Write a coherent paragraph for a new audience or context.",
      [
        "paragraph_has_clear_focus",
        "pronoun_reference_is_clear",
        "sentences_connect_cohesively",
      ],
    ),
    3,
    ["B4.4.9.1.1"],
  ),

  spec(
    "B4.4.9.3.1",
    "Revise a Paragraph",
    "Review and revise a one-paragraph draft by removing irrelevant details and improving meaning.",
    "constructed_response",
    [
      "reread_draft_critically",
      "identify_irrelevant_detail",
      "remove_or_replace_weak_content",
      "improve_paragraph_focus",
    ],
    [
      "treats_revision_as_copying_neatly",
      "keeps_every_detail_regardless_of_relevance",
      "changes_surface_errors_only",
    ],
    evidence(
      "Revise a draft by identifying and removing irrelevant details.",
      "Revise a fresh paragraph for relevance and clarity.",
      "After a delay, distinguish revision from proofreading and revise independently.",
      "Improve the content and focus of an unfamiliar draft.",
      [
        "irrelevant_details_are_identified",
        "revisions_improve_focus",
        "meaning_is_preserved_or_improved",
      ],
    ),
    3,
    ["B4.4.9.2.1"],
  ),

  spec(
    "B4.4.9.3.2",
    "Proofread a Draft",
    "Proofread writing for capitalisation, usage, punctuation and spelling.",
    "constructed_response",
    [
      "check_capitalisation",
      "check_language_usage",
      "check_punctuation",
      "check_spelling",
      "correct_surface_errors",
    ],
    [
      "confuses_proofreading_with_content_revision",
      "corrects_one_error_type_only",
      "changes_correct_language_unnecessarily",
    ],
    evidence(
      "Proofread a paragraph and correct capitalisation, usage, punctuation and spelling errors.",
      "Proofread a fresh draft containing different error patterns.",
      "After a delay, independently apply a complete proofreading check.",
      "Proofread an unfamiliar functional text before publication or sharing.",
      [
        "errors_are_detected_accurately",
        "corrections_are_appropriate",
        "all_required_error_categories_are_checked",
      ],
    ),
    3,
    ["B4.4.9.3.1"],
  ),

  spec(
    "B4.4.9.3.3",
    "Prepare Writing for an Audience",
    "Prepare and display a completed writing piece for others to read.",
    "observed_performance",
    [
      "prepare_final_copy",
      "apply_legible_presentation",
      "make_text_ready_for_audience",
      "share_completed_writing",
    ],
    [
      "shares_unrevised_draft_as_final_work",
      "ignores_legibility_for_audience",
      "does_not_distinguish_private_draft_from_published_piece",
    ],
    evidence(
      "Prepare a revised and proofread piece for display to other readers.",
      "Prepare a different completed piece for a new audience.",
      "After a delay, independently take writing from draft to audience-ready form.",
      "Publish or present an unfamiliar piece using appropriate presentation choices.",
      [
        "piece_is_complete",
        "presentation_is_readable",
        "final_version_is_ready_for_audience",
      ],
    ),
    3,
    ["B4.4.9.3.2"],
  ),

  spec(
    "B4.4.10.1.1",
    "Write a Structured Narrative",
    "Write about real or imagined experiences using a beginning, middle and ending with cohesive noun and pronoun references.",
    "sequence_ordering",
    [
      "establish_beginning",
      "develop_middle_events",
      "create_appropriate_ending",
      "sequence_events_coherently",
      "maintain_clear_reference_across_sentences",
    ],
    [
      "lists_events_without_story_structure",
      "places_events_in_confusing_order",
      "uses_unclear_pronoun_references",
    ],
    evidence(
      "Arrange and develop events into a narrative with a beginning, middle and ending.",
      "Write a fresh narrative using a different event sequence.",
      "After a delay, independently organise a coherent narrative.",
      "Create a structured narrative from an unfamiliar real or imagined situation.",
      [
        "story_structure_is_complete",
        "events_follow_coherent_sequence",
        "references_across_sentences_are_clear",
      ],
    ),
    3,
  ),

  spec(
    "B4.4.11.1.1",
    "Write Freely About the Immediate Environment",
    "Write freely about a chosen topic from the learner's immediate environment.",
    "constructed_response",
    [
      "select_personally_relevant_topic",
      "generate_content_independently",
      "maintain_topic_focus",
      "express_ideas_in_connected_sentences",
    ],
    [
      "waits_for_fixed_sentence_template",
      "moves_between_unrelated_topics",
      "produces_list_instead_of_connected_writing",
    ],
    evidence(
      "Write independently about a familiar topic from the immediate environment.",
      "Write about a different familiar topic without a sentence template.",
      "After a delay, independently generate and sustain a short piece.",
      "Write freely about a new but relatable setting or experience.",
      [
        "writing_remains_on_topic",
        "ideas_are_expressed_independently",
        "sentences_form_a_connected_piece",
      ],
    ),
  ),

  spec(
    "B4.4.11.1.2",
    "Write Poems and Imaginative Stories",
    "Create poems and imaginative narrative stories and support them with suitable illustration where appropriate.",
    "constructed_response",
    [
      "generate_imaginative_idea",
      "choose_poetic_or_narrative_form",
      "develop_creative_content",
      "connect_illustration_to_text",
    ],
    [
      "copies_familiar_story_without_original_development",
      "treats_random_sentences_as_poem_or_story",
      "adds_illustration_unrelated_to_text",
    ],
    evidence(
      "Create a short original poem or imaginative narrative with coherent meaning.",
      "Create a fresh imaginative piece using a different theme.",
      "After a delay, independently produce an original creative piece.",
      "Transform an unfamiliar prompt into a poem or imaginative narrative.",
      [
        "piece_has_coherent_creative_idea",
        "chosen_form_is_recognisable",
        "illustration_if_used_supports_meaning",
      ],
    ),
    3,
  ),

  spec(
    "B4.4.12.1.1",
    "Use Descriptive Language",
    "Use descriptive words and expressions to describe places, personal experiences and events.",
    "application",
    [
      "identify_relevant_detail",
      "select_precise_descriptive_word",
      "use_sensory_or_specific_language",
      "match_description_to_subject",
    ],
    [
      "uses_generic_word_for_every_description",
      "adds_description_unrelated_to_subject",
      "confuses_description_with_event_sequence",
    ],
    evidence(
      "Improve plain sentences by adding precise descriptive words and expressions.",
      "Describe a fresh place, experience or event.",
      "After a delay, use descriptive language independently.",
      "Describe an unfamiliar scene or experience using relevant detail.",
      [
        "descriptive_language_is_relevant",
        "word_choice_adds_specific_meaning",
        "description_remains_clear",
      ],
    ),
  ),

  spec(
    "B4.4.13.1.1",
    "Support an Opinion",
    "Support opinions using simple sentences.",
    "constructed_response",
    [
      "state_clear_opinion",
      "give_relevant_reason",
      "express_reason_in_complete_sentence",
      "connect_reason_to_opinion",
    ],
    [
      "states_opinion_without_reason",
      "gives_reason_unrelated_to_opinion",
      "confuses_fact_with_personal_preference",
    ],
    evidence(
      "State an opinion and support it with clear simple sentences.",
      "Support a different opinion with relevant reasons.",
      "After a delay, independently construct an opinion-and-reason response.",
      "Respond to an unfamiliar everyday issue with a supported opinion.",
      [
        "opinion_is_clear",
        "reason_is_relevant",
        "supporting_sentence_is_complete",
      ],
    ),
  ),

  spec(
    "B4.4.13.2.1",
    "Introduce and Support a Claim",
    "Introduce a claim and support it with clear reasons and relevant evidence.",
    "constructed_response",
    [
      "state_claim_clearly",
      "generate_relevant_reason",
      "select_supporting_evidence",
      "connect_evidence_to_claim",
    ],
    [
      "states_claim_without_support",
      "uses_unrelated_evidence",
      "repeats_claim_instead_of_giving_reason",
    ],
    evidence(
      "Write a clear claim with at least one relevant reason and supporting evidence.",
      "Support a fresh claim using different evidence.",
      "After a delay, independently construct a claim-reason-evidence response.",
      "Argue for a position on an unfamiliar age-appropriate issue.",
      [
        "claim_is_explicit",
        "reason_supports_claim",
        "evidence_is_relevant",
      ],
    ),
    3,
    ["B4.4.13.1.1"],
  ),

  spec(
    "B4.4.13.2.2",
    "Link Claims and Reasons",
    "Use words, phrases and clauses to clarify relationships between claims and reasons.",
    "application",
    [
      "identify_claim_reason_relationship",
      "select_linking_word_or_phrase",
      "connect_reason_to_claim",
      "maintain_logical_flow",
    ],
    [
      "uses_linking_word_without_logical_relationship",
      "joins_claim_and_reason_ambiguously",
      "overuses_single_connector",
    ],
    evidence(
      "Choose appropriate words or phrases to connect claims with their reasons.",
      "Link a fresh set of claims and reasons clearly.",
      "After a delay, independently use logical connectors in argument writing.",
      "Improve coherence in an unfamiliar short argument.",
      [
        "connector_matches_relationship",
        "claim_reason_link_is_clear",
        "argument_flow_is_coherent",
      ],
    ),
    3,
    ["B4.4.13.2.1"],
  ),

  spec(
    "B4.4.13.2.3",
    "Maintain a Formal Style",
    "Establish and maintain a formal style in appropriate writing.",
    "constructed_response",
    [
      "recognise_formal_context",
      "select_formal_vocabulary",
      "avoid_inappropriate_informal_expression",
      "maintain_consistent_tone",
    ],
    [
      "uses_conversational_slang_in_formal_piece",
      "switches_between_formal_and_informal_tone",
      "assumes_formal_writing_requires_unnecessarily_complex_words",
    ],
    evidence(
      "Rewrite an informal passage so that it maintains an appropriate formal style.",
      "Produce a fresh formal paragraph for a specified audience.",
      "After a delay, independently maintain formal style throughout a short piece.",
      "Adapt writing to a new context requiring formal language.",
      [
        "tone_matches_formal_context",
        "word_choice_is_appropriate",
        "style_is_consistent",
      ],
    ),
    3,
  ),

  spec(
    "B4.4.13.2.4",
    "Conclude an Argument",
    "Provide a concluding statement that follows from the argument presented.",
    "constructed_response",
    [
      "identify_main_claim",
      "review_supporting_reasons",
      "formulate_logical_conclusion",
      "avoid_introducing_unrelated_new_claim",
    ],
    [
      "ends_without_concluding_statement",
      "introduces_new_unrelated_argument_in_conclusion",
      "copies_opening_without_resolving_argument",
    ],
    evidence(
      "Write a concluding statement that follows logically from a short argument.",
      "Conclude a fresh argument coherently.",
      "After a delay, independently produce an appropriate argumentative conclusion.",
      "Provide a conclusion for an unfamiliar age-appropriate argument.",
      [
        "conclusion_relates_to_claim",
        "conclusion_follows_from_reasons",
        "no_unrelated_new_argument_is_added",
      ],
    ),
    3,
    ["B4.4.13.2.1"],
  ),

  spec(
    "B4.4.14.1.1",
    "Write Information About Family",
    "Write words and sentences that give information about family.",
    "constructed_response",
    [
      "select_relevant_family_information",
      "use_appropriate_family_vocabulary",
      "construct_clear_sentences",
      "organise_related_information",
    ],
    [
      "lists_names_without_information",
      "uses_unclear_relationship_terms",
      "mixes_unrelated_information",
    ],
    evidence(
      "Write a short informative piece about a family using clear relevant details.",
      "Write a fresh family-information piece with different details.",
      "After a delay, independently organise family information in writing.",
      "Write about an unfamiliar fictional family using the same informational structure.",
      [
        "information_is_relevant",
        "relationships_are_clear",
        "sentences_are_coherent",
      ],
    ),
  ),

  spec(
    "B4.4.14.2.1",
    "Present Personal Experiences from Pictures",
    "Write about picture events connected to personal experiences and present them orally through an appropriate media-style presentation.",
    "observed_performance",
    [
      "interpret_picture_event",
      "connect_event_to_personal_experience",
      "write_coherent_account",
      "prepare_oral_presentation",
      "communicate_to_audience",
    ],
    [
      "describes_picture_without_personal_connection",
      "writes_unrelated_personal_story",
      "reads_written_text_without_presenting_meaningfully",
    ],
    evidence(
      "Use a picture to write about a related personal experience and present the account to an audience.",
      "Repeat the task with a different picture and experience.",
      "After a delay, independently move from visual prompt to written and oral presentation.",
      "Create and present an account from an unfamiliar picture-based event.",
      [
        "picture_event_is_understood",
        "personal_connection_is_relevant",
        "presentation_communicates_the_written_account",
      ],
    ),
    3,
  ),

  spec(
    "B4.4.15.1.1",
    "Write a Personal Letter",
    "Write to friends about personal experiences using an appropriate letter format.",
    "constructed_response",
    [
      "identify_personal_letter_purpose",
      "use_appropriate_letter_format",
      "describe_personal_experience",
      "maintain_friendly_audience_appropriate_tone",
      "close_letter_appropriately",
    ],
    [
      "omits_key_letter_features",
      "uses_formal_report_style_for_friend",
      "lists_events_without_personal_message",
    ],
    evidence(
      "Write a personal letter to a friend describing an experience using appropriate format.",
      "Write a fresh personal letter about a different experience.",
      "After a delay, independently reproduce the personal-letter structure.",
      "Write an appropriate letter for an unfamiliar but realistic personal situation.",
      [
        "letter_format_is_appropriate",
        "experience_is_communicated_clearly",
        "tone_matches_personal_audience",
      ],
    ),
    3,
  ),
];

if (
  GHANA_B4_ENGLISH_STRAND4_ADAPTIVE_SPECS.length !== 21
) {
  throw new Error(
    `Expected 21 Ghana B4 English Strand 4 adaptive specifications, found ${GHANA_B4_ENGLISH_STRAND4_ADAPTIVE_SPECS.length}.`,
  );
}