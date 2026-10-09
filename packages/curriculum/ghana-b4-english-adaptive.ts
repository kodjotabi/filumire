import type { ResponseMode } from "../domain";
import type { EnglishEvidenceDesign, EnglishEvidenceProfile } from "./ghana-b4-english-evidence";

export interface GhanaB4EnglishAdaptiveSpec {
  code: string;
  competencyId: string;
  strandCode: string;
  subStrandCode: string;
  contentStandardCode: string;
  title: string;
  description: string;
  subskills: string[];
  misconceptions: string[];
  difficulty: number;
  responseMode: ResponseMode;
  evidence?: EnglishEvidenceDesign;
}


function evidenceProfileFor(code: string): EnglishEvidenceProfile {
  if (code === "B4.1.3.1.3") return "writing_composition";
  if (code === "B4.1.10.2.2") return "reading_fluency";
  if (code.startsWith("B4.1.7.")) return "reading_comprehension";
  if (code === "B4.1.10.1.1" || code === "B4.1.10.1.2" || code === "B4.1.10.1.3") return "contextual_inference";
  if (code === "B4.1.8.2.1") return "grammar_application";
  return "vocabulary_application";
}

function evidenceForSpec(
  code: string,
  title: string,
  description: string,
  subskills: string[],
): EnglishEvidenceDesign {
  const criteria = subskills.slice(0, 3);

  return {
    profile: evidenceProfileFor(code),
    diagnosticTask: `Demonstrate this competency using a fresh familiar example: ${description}`,
    reassessmentTask: `Demonstrate ${title.toLowerCase()} again independently using a different example after instruction or remediation.`,
    retentionTask: `After a delay and without reviewing the earlier lesson first, demonstrate independently that you can still ${description.charAt(0).toLowerCase()}${description.slice(1)}`,
    transferTask: `Apply ${title.toLowerCase()} independently in a new Ghanaian home, school, community or everyday context.`,
    successCriteria: criteria,
  };
}
function competencyId(code: string): string {
  return `competency-gh-english-${code.toLowerCase().replace(/\./g, "-")}`;
}

function spec(
  code: string,
  title: string,
  description: string,
  subskills: string[],
  misconceptions: string[],
  difficulty = 1,
  responseMode: ResponseMode = "oral_response",
): GhanaB4EnglishAdaptiveSpec {
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
    evidence: evidenceForSpec(code, title, description, subskills),
  };
}

export const GHANA_B4_ENGLISH_STRAND1_ADAPTIVE_SPECS:
  GhanaB4EnglishAdaptiveSpec[] = [
  spec(
    "B4.1.1.1.1",
    "Perform Songs with Appropriate Stress and Rhythm",
    "Listen attentively to songs and sing them with appropriate stress, rhythm and actions.",
    [
      "listen_attentively_to_song",
      "recognise_song_rhythm",
      "apply_stress_in_song",
      "coordinate_song_with_actions",
    ],
    [
      "sings_without_attending_to_rhythm",
      "treats_all_words_as_equally_stressed",
      "confuses_loudness_with_stress",
    ],
  ),

  spec(
    "B4.1.1.1.2",
    "Identify Values in Songs",
    "Identify and discuss values in songs.",
    [
      "identify_message_in_song",
      "recognise_value_in_song",
      "explain_value_from_context",
      "discuss_value_with_examples",
    ],
    [
      "retells_song_without_identifying_value",
      "confuses_topic_with_moral_value",
      "states_value_without_textual_support",
    ],
    2,
  ),

  spec(
    "B4.1.3.1.1",
    "Recite and Interpret Poems",
    "Recite poems with stress, rhythm and actions and interpret them in own words.",
    [
      "recite_poem_with_rhythm",
      "apply_stress_during_recitation",
      "coordinate_actions_with_poem",
      "interpret_poem_in_own_words",
    ],
    [
      "recites_without_understanding_meaning",
      "confuses_memorisation_with_interpretation",
      "ignores_rhythm_and_stress",
    ],
    2,
  ),

  spec(
    "B4.1.3.1.2",
    "Identify Values in Poems",
    "Identify and discuss values in poems.",
    [
      "identify_poem_message",
      "recognise_value_in_poem",
      "connect_value_to_poem_events",
      "discuss_value_with_reasoning",
    ],
    [
      "confuses_subject_with_value",
      "identifies_value_without_evidence",
      "focuses_only_on_rhyme",
    ],
    2,
  ),

  spec(
    "B4.1.3.1.3",
    "Compose Four-Line Poems",
    "Compose four-line poems.",
    [
      "select_simple_poem_topic",
      "organise_ideas_into_lines",
      "compose_four_connected_lines",
      "review_poem_for_meaning",
    ],
    [
      "writes_unrelated_sentences_as_poem",
      "ignores_required_four_line_structure",
      "copies_known_poem_instead_of_composing",
    ],
    2,
  ),

  spec(
    "B4.1.4.1.1",
    "Retell Stories Sequentially",
    "Retell stories sequentially, including key details.",
    [
      "identify_story_events",
      "distinguish_key_from_minor_details",
      "sequence_story_events",
      "retell_story_coherently",
    ],
    [
      "retells_events_out_of_sequence",
      "omits_key_story_details",
      "adds_unrelated_events",
    ],
    2,
  ),

  spec(
    "B4.1.4.1.2",
    "Tell Original Stories",
    "Tell own stories.",
    [
      "generate_story_idea",
      "establish_characters_and_setting",
      "sequence_story_events",
      "tell_story_with_clear_ending",
    ],
    [
      "gives_disconnected_events",
      "retells_known_story_as_own",
      "story_has_no_clear_sequence",
    ],
    2,
  ),

  spec(
    "B4.1.5.1.1",
    "Role-Play Stories and Plays",
    "Role-play a story or play.",
    [
      "understand_assigned_role",
      "use_dialogue_appropriately",
      "use_voice_and_action_for_character",
      "respond_to_other_characters",
    ],
    [
      "recites_lines_without_role_awareness",
      "confuses_narration_with_role_play",
      "ignores_turns_and_other_characters",
    ],
    2,
  ),

  spec(
    "B4.1.5.2.1",
    "Relate Moral Values to Real Life",
    "Identify moral values in sketches and relate them to real life situations.",
    [
      "identify_events_in_sketch",
      "infer_moral_value",
      "explain_value",
      "connect_value_to_real_life_situation",
    ],
    [
      "summarises_sketch_without_moral",
      "states_unrelated_value",
      "cannot_transfer_value_to_real_life",
    ],
    2,
  ),

  spec(
    "B4.1.6.1.1",
    "Describe Objects Events Dates and Time",
    "Describe or talk about objects, events, dates and time.",
    [
      "describe_object_features",
      "describe_events_clearly",
      "express_dates_correctly",
      "express_time_correctly",
    ],
    [
      "lists_objects_without_description",
      "confuses_date_and_time",
      "gives_events_without_clear_sequence",
    ],
  ),

  spec(
    "B4.1.6.2.1",
    "Sustain Attentive Listening and Viewing",
    "Listen and view attentively for a sustained period and maintain appropriate attention to the speaker.",
    [
      "focus_on_speaker",
      "maintain_sustained_attention",
      "use_appropriate_visual_attention",
      "recognise_signs_of_active_listening",
    ],
    [
      "equates_hearing_with_attentive_listening",
      "frequently_shifts_attention_from_speaker",
      "responds_without_processing_message",
    ],
  ),

  spec(
    "B4.1.6.2.2",
    "Attend to Complete Spoken and Visual Texts",
    "Listen and view for the entire duration of a text, speech, presentation or video.",
    [
      "sustain_attention_through_complete_text",
      "follow_message_from_beginning_to_end",
      "retain_key_information",
      "avoid_premature_response",
    ],
    [
      "stops_attending_after_opening",
      "responds_from_partial_information",
      "misses_later_key_information",
    ],
    2,
  ),

  spec(
    "B4.1.6.3.1",
    "Participate in Collaborative Conversation",
    "Engage in collaborative conversation on familiar topics with peers.",
    [
      "contribute_relevant_ideas",
      "listen_to_peer_contributions",
      "respond_to_previous_speaker",
      "maintain_shared_topic",
    ],
    [
      "speaks_without_listening_to_peers",
      "changes_topic_without_connection",
      "treats_conversation_as_single_speaker_task",
    ],
    2,
  ),

  spec(
    "B4.1.6.3.2",
    "Take Turns and Express Ideas Clearly",
    "Demonstrate turn taking in conversation, speak audibly, and express thoughts and feelings clearly.",
    [
      "recognise_conversation_turns",
      "wait_for_appropriate_turn",
      "speak_audibly",
      "express_thoughts_and_feelings_clearly",
    ],
    [
      "interrupts_without_turn_awareness",
      "speaks_too_softly_for_listener",
      "gives_unclear_or_fragmented_ideas",
    ],
    2,
  ),

  spec(
    "B4.1.6.3.3",
    "Ask Relevant Questions About Opinions",
    "Ask relevant questions to find out the opinion of others about a given topic.",
    [
      "identify_discussion_topic",
      "form_relevant_question",
      "distinguish_opinion_question_from_fact_question",
      "listen_to_response",
    ],
    [
      "asks_questions_unrelated_to_topic",
      "asks_fact_question_when_opinion_is_needed",
      "answers_own_question_instead_of_listening",
    ],
    2,
  ),

  spec(
    "B4.1.7.1.1",
    "Construct Meaning from Stress Rhythm and Intonation",
    "Construct meaning from texts based on knowledge of stress, rhythm and intonation.",
    [
      "recognise_stress_pattern",
      "recognise_rhythm_pattern",
      "recognise_intonation_pattern",
      "infer_meaning_from_voice_pattern",
    ],
    [
      "ignores_voice_pattern_when_interpreting_meaning",
      "confuses_stress_with_volume_only",
      "assumes_intonation_does_not_affect_meaning",
    ],
    2,
  ),

  spec(
    "B4.1.7.1.2",
    "Connect Events in Narrative Texts",
    "Make connections with events in narrative texts.",
    [
      "identify_narrative_events",
      "recognise_relationship_between_events",
      "connect_causes_and_results",
      "explain_event_connections",
    ],
    [
      "treats_story_events_as_unrelated",
      "confuses_event_order_with_event_cause",
      "adds_connections_not_supported_by_text",
    ],
    2,
  ),

  spec(
    "B4.1.7.1.3",
    "Recognise Moral Lessons in Stories",
    "Recognise and discuss moral lessons in a story.",
    [
      "identify_character_actions",
      "identify_consequences",
      "infer_story_moral",
      "discuss_moral_with_evidence",
    ],
    [
      "confuses_plot_with_moral",
      "states_moral_without_story_evidence",
      "focuses_only_on_character_names",
    ],
    2,
  ),

  spec(
    "B4.1.7.1.4",
    "Use Background Knowledge to Build Understanding",
    "Use background knowledge to aid understanding and build new knowledge while listening to narrative texts.",
    [
      "activate_relevant_prior_knowledge",
      "connect_prior_knowledge_to_text",
      "distinguish_prior_belief_from_text_information",
      "update_understanding_from_new_information",
    ],
    [
      "ignores_prior_relevant_experience",
      "allows_prior_belief_to_override_text",
      "fails_to_integrate_new_information",
    ],
    3,
  ),

  spec(
    "B4.1.7.1.5",
    "Identify Main Ideas and Details",
    "Identify the main idea or gist and details of texts.",
    [
      "identify_text_topic",
      "distinguish_main_idea_from_detail",
      "identify_supporting_details",
      "state_gist_concisely",
    ],
    [
      "selects_minor_detail_as_main_idea",
      "retells_every_detail_instead_of_gist",
      "states_topic_only_without_main_idea",
    ],
    2,
  ),

  spec(
    "B4.1.7.1.7",
    "Compare and Contrast Information from Texts",
    "Compare and contrast information, including two or more ideas, from texts.",
    [
      "identify_information_to_compare",
      "recognise_similarities",
      "recognise_differences",
      "explain_comparison_with_evidence",
    ],
    [
      "identifies_only_differences",
      "identifies_only_similarities",
      "compares_unrelated_information",
    ],
    3,
  ),

  spec(
    "B4.1.8.1.1",
    "Use Pronunciation and Intonation in Questions",
    "Use appropriate pronunciation and intonation in asking and answering questions.",
    [
      "pronounce_question_words_clearly",
      "apply_question_intonation",
      "adjust_intonation_for_response",
      "speak_question_and_answer_intelligibly",
    ],
    [
      "uses_flat_intonation_for_all_questions",
      "confuses_pronunciation_with_loudness",
      "uses_question_intonation_for_statements",
    ],
    2,
  ),

  spec(
    "B4.1.8.2.1",
    "Use Question Tags and Auxiliaries in Speech",
    "Use positive tags, negative tags and auxiliaries in speech.",
    [
      "recognise_auxiliary_in_statement",
      "form_positive_question_tag",
      "form_negative_question_tag",
      "use_question_tags_in_spoken_context",
    ],
    [
      "matches_positive_statement_with_positive_tag",
      "omits_required_auxiliary",
      "uses_incorrect_subject_in_tag",
    ],
    3,
  ),

  spec(
    "B4.1.9.1.1",
    "Give and Respond to Commands Instructions and Directions",
    "Give and respond to commands, instructions and directions.",
    [
      "distinguish_command_instruction_direction",
      "give_clear_sequence_of_actions",
      "interpret_spoken_direction",
      "respond_appropriately_to_instruction",
    ],
    [
      "gives_vague_or_incomplete_direction",
      "confuses_request_with_command",
      "ignores_sequence_in_instructions",
    ],
    2,
  ),

  spec(
    "B4.1.9.1.2",
    "Make and Respond to Polite Requests",
    "Make and respond to polite requests for help from peers.",
    [
      "recognise_context_for_request",
      "form_polite_request",
      "use_appropriate_tone",
      "respond_courteously_to_request",
    ],
    [
      "uses_command_instead_of_polite_request",
      "omits_politeness_markers",
      "responds_without_acknowledging_request",
    ],
  ),

  spec(
    "B4.1.10.1.1",
    "Recognise Features of Spoken Language",
    "Demonstrate awareness of features of spoken language including contractions and ellipsis.",
    [
      "recognise_contractions_in_speech",
      "recognise_ellipsis_in_conversation",
      "interpret_reduced_spoken_forms",
      "use_spoken_forms_appropriately",
    ],
    [
      "expects_every_spoken_sentence_to_be_complete",
      "confuses_contraction_with_incorrect_grammar",
      "cannot_recover_omitted_meaning_from_context",
    ],
    2,
  ),

  spec(
    "B4.1.10.1.2",
    "Distinguish Spoken and Written Language",
    "Demonstrate awareness of differences between spoken and written forms of language.",
    [
      "identify_features_of_spoken_language",
      "identify_features_of_written_language",
      "compare_spoken_and_written_sentence_forms",
      "select_form_for_context",
    ],
    [
      "assumes_spoken_and_written_language_are_identical",
      "treats_informal_spoken_reduction_as_formal_writing",
      "cannot_match_language_form_to_context",
    ],
    3,
  ),

  spec(
    "B4.1.10.1.3",
    "Interpret Meaning Through Pace Stress and Tone",
    "Demonstrate awareness of how meaning is conveyed through appropriate pace, stress and tone in spoken texts.",
    [
      "recognise_change_in_pace",
      "recognise_word_stress",
      "recognise_speaker_tone",
      "infer_meaning_from_voice_features",
    ],
    [
      "interprets_words_without_voice_cues",
      "confuses_fast_speech_with_excitement_in_all_cases",
      "treats_tone_as_unrelated_to_meaning",
    ],
    3,
  ),

  spec(
    "B4.1.10.2.1",
    "Speak Clearly and Fluently",
    "Speak clearly and fluently using appropriate voice qualities such as pace and tone.",
    [
      "produce_clear_speech",
      "maintain_suitable_pace",
      "use_appropriate_tone",
      "sustain_fluent_expression",
    ],
    [
      "speaks_too_quickly_for_clarity",
      "uses_monotone_delivery",
      "equates_fluency_with_speed",
    ],
    2,
  ),

  spec(
    "B4.1.10.2.2",
    "Read Aloud with Pace and Expression",
    "Read aloud clearly, at a good pace and with expression.",
    [
      "decode_text_accurately",
      "read_at_suitable_pace",
      "use_phrase_boundaries",
      "apply_expression_to_meaning",
    ],
    [
      "reads_word_by_word_without_phrasing",
      "reads_too_fast_for_comprehension",
      "uses_no_expression",
    ],
    2,
  ),

  spec(
    "B4.1.10.3.1",
    "Identify Speech Purpose and Audience",
    "Identify the purpose and audience of a speech and set goals in the context of assigned topics.",
    [
      "identify_speech_purpose",
      "identify_intended_audience",
      "connect_topic_to_audience",
      "set_appropriate_speaking_goal",
    ],
    [
      "prepares_without_considering_audience",
      "confuses_topic_with_purpose",
      "sets_goal_unrelated_to_speech_task",
    ],
    3,
  ),

  spec(
    "B4.1.10.3.2",
    "Use Prior Knowledge to Identify Speech Subject Matter",
    "Draw on prior knowledge to identify the subject matter of a speech.",
    [
      "activate_relevant_prior_knowledge",
      "identify_clues_to_subject_matter",
      "connect_clues_with_existing_knowledge",
      "form_reasonable_subject_inference",
    ],
    [
      "guesses_subject_without_clues",
      "ignores_relevant_prior_knowledge",
      "confuses_single_detail_with_complete_subject",
    ],
    2,
  ),

  spec(
    "B4.1.10.3.3",
    "Gather and Select Information for a Speech",
    "Gather and select facts and ideas from print and non-print sources appropriate to purpose, audience, context and culture.",
    [
      "gather_information_from_sources",
      "distinguish_relevant_from_irrelevant_information",
      "select_information_for_audience",
      "consider_context_and_culture",
    ],
    [
      "uses_all_information_without_selection",
      "chooses_information_unrelated_to_purpose",
      "ignores_audience_or_cultural_context",
    ],
    3,
  ),

  spec(
    "B4.1.10.3.4",
    "Support Spoken Ideas with Visual Resources",
    "Support ideas and points with visual resources to convey meaning appropriate to purpose and context.",
    [
      "identify_point_needing_visual_support",
      "select_relevant_visual_resource",
      "connect_visual_to_spoken_point",
      "use_visual_without_replacing_explanation",
    ],
    [
      "uses_visual_unrelated_to_message",
      "shows_visual_without_explaining_connection",
      "relies_on_visual_instead_of_speaking",
    ],
    2,
  ),

  spec(
    "B4.1.10.3.5",
    "Use Effective Introductions and Conclusions",
    "Use effective introductions and conclusions.",
    [
      "introduce_topic_clearly",
      "engage_audience_at_opening",
      "signal_closure",
      "conclude_with_main_message",
    ],
    [
      "begins_without_introducing_topic",
      "adds_new_unexplained_idea_in_conclusion",
      "ends_abruptly_without_closure",
    ],
    2,
  ),

  spec(
    "B4.1.10.3.6",
    "Elaborate Ideas with Explanations",
    "Elaborate on ideas using explanations.",
    [
      "state_main_idea",
      "add_relevant_explanation",
      "give_supporting_example_or_reason",
      "maintain_connection_to_main_idea",
    ],
    [
      "repeats_same_sentence_without_elaboration",
      "adds_unrelated_information",
      "states_claim_without_explanation",
    ],
    2,
  ),

  spec(
    "B4.1.10.3.7",
    "Speak Confidently Before Peers",
    "Speak with confidence before peers and maintain appropriate visual engagement with the audience.",
    [
      "prepare_spoken_message",
      "project_voice_to_audience",
      "maintain_composed_delivery",
      "engage_peers_visually",
    ],
    [
      "equates_confidence_with_shouting",
      "reads_entirely_without_audience_engagement",
      "speaks_too_softly_to_be_understood",
    ],
    2,
  ),
];

export const GHANA_B4_ENGLISH_ADAPTIVE_SPECS =
  GHANA_B4_ENGLISH_STRAND1_ADAPTIVE_SPECS;

