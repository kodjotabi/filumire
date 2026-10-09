export interface GhanaB4ComputingIndicatorMapping {
  code: string;
  relationship: "direct" | "supports";
}

export interface GhanaB4ComputingAdaptiveSpec {
  competencyId: string;
  title: string;
  description: string;
  strandCode: string;
  subStrandCode: string;
  contentStandardCode: string;
  indicatorMappings: GhanaB4ComputingIndicatorMapping[];
  prerequisiteCompetencyIds: string[];
  relatedCompetencyIds: string[];
  subskills: string[];
  misconceptions: string[];
  difficulty: number;
}

export const GHANA_B4_COMPUTING_ADAPTIVE_SPECS:
  GhanaB4ComputingAdaptiveSpec[] = [
  {
    competencyId: "competency-gh-computing-b4-computer-parts-001",
    title: "Identify Computer Parts and Technology Tools",
    description:
      "Identify common computer parts, components, peripherals and technology tools and recognise their basic purposes.",
    strandCode: "B4.1",
    subStrandCode: "B4.1.1",
    contentStandardCode: "B4.1.1.1",
    indicatorMappings: [
      { code: "B4.1.1.1.1", relationship: "direct" },
    ],
    prerequisiteCompetencyIds: [],
    relatedCompetencyIds: [
      "competency-gh-computing-b4-input-devices-001",
    ],
    subskills: [
      "identify_computer_parts",
      "identify_computer_components",
      "identify_peripherals",
      "match_technology_tools_to_basic_purposes",
    ],
    misconceptions: [
      "treats_monitor_as_the_computer",
      "confuses_internal_components_with_peripherals",
      "assumes_all_computer_parts_have_the_same_function",
    ],
    difficulty: 1,
  },
  {
    competencyId: "competency-gh-computing-b4-input-devices-001",
    title: "Describe Input Devices and Their Uses",
    description:
      "Identify common input devices and explain how devices such as the joystick, light pen, mouse and pointing stick are used.",
    strandCode: "B4.1",
    subStrandCode: "B4.1.1",
    contentStandardCode: "B4.1.1.1",
    indicatorMappings: [
      { code: "B4.1.1.1.2", relationship: "direct" },
    ],
    prerequisiteCompetencyIds: [
      "competency-gh-computing-b4-computer-parts-001",
    ],
    relatedCompetencyIds: [],
    subskills: [
      "identify_input_devices",
      "distinguish_input_from_output",
      "match_input_device_to_use",
      "describe_device_interaction",
    ],
    misconceptions: [
      "classifies_output_devices_as_input_devices",
      "assumes_all_input_is_done_with_a_keyboard",
      "confuses_device_name_with_device_function",
    ],
    difficulty: 1,
  },
  {
    competencyId: "competency-gh-computing-b4-ram-rom-001",
    title: "Differentiate RAM and ROM",
    description:
      "Differentiate between RAM and ROM using their basic roles and characteristics in a computer system.",
    strandCode: "B4.1",
    subStrandCode: "B4.1.1",
    contentStandardCode: "B4.1.1.1",
    indicatorMappings: [
      { code: "B4.1.1.1.3", relationship: "direct" },
    ],
    prerequisiteCompetencyIds: [
      "competency-gh-computing-b4-computer-parts-001",
    ],
    relatedCompetencyIds: [],
    subskills: [
      "identify_ram",
      "identify_rom",
      "compare_ram_and_rom",
      "relate_memory_type_to_basic_function",
    ],
    misconceptions: [
      "treats_ram_and_rom_as_identical",
      "confuses_memory_with_storage_devices",
      "assumes_ram_keeps_all_data_permanently",
    ],
    difficulty: 2,
  },
  {
    competencyId: "competency-gh-computing-b4-typing-001",
    title: "Type Short Phrases",
    description:
      "Use a keyboard to type short phrases accurately and appropriately.",
    strandCode: "B4.1",
    subStrandCode: "B4.1.1",
    contentStandardCode: "B4.1.1.1",
    indicatorMappings: [
      { code: "B4.1.1.1.4", relationship: "direct" },
    ],
    prerequisiteCompetencyIds: [
      "competency-gh-computing-b4-computer-parts-001",
    ],
    relatedCompetencyIds: [
      "competency-gh-computing-b4-word-processing-tools-001",
    ],
    subskills: [
      "locate_keyboard_keys",
      "enter_letters_and_spaces",
      "use_basic_punctuation",
      "type_short_phrase_accurately",
    ],
    misconceptions: [
      "uses_spacebar_between_every_character",
      "confuses_enter_with_spacebar",
      "ignores_capitalisation_and_basic_punctuation",
    ],
    difficulty: 1,
  },
  {
    competencyId: "competency-gh-computing-b4-first-generation-001",
    title: "Describe First Generation Computers",
    description:
      "Summarise key characteristics of first generation computers, including the use of vacuum tubes and examples such as ENIAC, EDVAC, UNIVAC and IBM-701.",
    strandCode: "B4.1",
    subStrandCode: "B4.1.1",
    contentStandardCode: "B4.1.1.1",
    indicatorMappings: [
      { code: "B4.1.1.1.5", relationship: "direct" },
    ],
    prerequisiteCompetencyIds: [
      "competency-gh-computing-b4-computer-parts-001",
    ],
    relatedCompetencyIds: [],
    subskills: [
      "identify_first_generation_period",
      "recognise_vacuum_tube_technology",
      "identify_first_generation_examples",
      "summarise_first_generation_characteristics",
    ],
    misconceptions: [
      "assumes_first_generation_computers_used_modern_microprocessors",
      "confuses_early_computers_with_current_personal_computers",
      "treats_vacuum_tubes_as_storage_disks",
    ],
    difficulty: 2,
  },
  {
    competencyId: "competency-gh-computing-b4-desktop-features-001",
    title: "Describe the Desktop Background and Features",
    description:
      "Describe the computer desktop background and identify common features such as images, icons and the taskbar.",
    strandCode: "B4.1",
    subStrandCode: "B4.1.2",
    contentStandardCode: "B4.1.2.1",
    indicatorMappings: [
      { code: "B4.1.2.1.1", relationship: "direct" },
    ],
    prerequisiteCompetencyIds: [
      "competency-gh-computing-b4-computer-parts-001",
    ],
    relatedCompetencyIds: [
      "competency-gh-computing-b4-taskbar-001",
    ],
    subskills: [
      "identify_desktop_background",
      "identify_desktop_icons",
      "identify_taskbar",
      "describe_desktop_features",
    ],
    misconceptions: [
      "confuses_desktop_with_physical_desk",
      "treats_icons_as_decorative_images_only",
      "confuses_taskbar_with_desktop_background",
    ],
    difficulty: 1,
  },
  {
    competencyId: "competency-gh-computing-b4-personalise-desktop-001",
    title: "Personalise the Desktop Background",
    description:
      "Use appropriate settings and tools to personalise the desktop background.",
    strandCode: "B4.1",
    subStrandCode: "B4.1.2",
    contentStandardCode: "B4.1.2.1",
    indicatorMappings: [
      { code: "B4.1.2.1.2", relationship: "direct" },
    ],
    prerequisiteCompetencyIds: [
      "competency-gh-computing-b4-desktop-features-001",
    ],
    relatedCompetencyIds: [],
    subskills: [
      "open_personalisation_settings",
      "select_desktop_background",
      "apply_background_setting",
      "verify_desktop_change",
    ],
    misconceptions: [
      "confuses_personalisation_with_deleting_files",
      "assumes_background_change_alters_file_contents",
      "cannot_distinguish_preview_from_applied_setting",
    ],
    difficulty: 2,
  },
  {
    competencyId: "competency-gh-computing-b4-taskbar-001",
    title: "Use Taskbar Sections",
    description:
      "Use common taskbar sections including the Start menu, pinned applications and the notification or system tray area.",
    strandCode: "B4.1",
    subStrandCode: "B4.1.2",
    contentStandardCode: "B4.1.2.1",
    indicatorMappings: [
      { code: "B4.1.2.1.3", relationship: "direct" },
    ],
    prerequisiteCompetencyIds: [
      "competency-gh-computing-b4-desktop-features-001",
    ],
    relatedCompetencyIds: [],
    subskills: [
      "locate_start_menu",
      "launch_application",
      "identify_pinned_application",
      "identify_notification_area",
      "use_basic_taskbar_controls",
    ],
    misconceptions: [
      "confuses_taskbar_with_application_window",
      "assumes_minimised_application_is_closed",
      "confuses_pinned_application_with_open_application",
    ],
    difficulty: 2,
  },
  {
    competencyId: "competency-gh-computing-b4-desktop-icons-add-remove-001",
    title: "Add and Remove Desktop Icons",
    description:
      "Demonstrate how to add and remove icons from the computer desktop.",
    strandCode: "B4.1",
    subStrandCode: "B4.1.2",
    contentStandardCode: "B4.1.2.1",
    indicatorMappings: [
      { code: "B4.1.2.1.4", relationship: "direct" },
    ],
    prerequisiteCompetencyIds: [
      "competency-gh-computing-b4-desktop-features-001",
    ],
    relatedCompetencyIds: [
      "competency-gh-computing-b4-desktop-icons-manage-001",
    ],
    subskills: [
      "identify_desktop_icon",
      "add_desktop_icon",
      "remove_desktop_icon",
      "verify_icon_change",
    ],
    misconceptions: [
      "assumes_removing_icon_always_deletes_program",
      "confuses_icon_with_file_contents",
      "cannot_distinguish_shortcut_from_application",
    ],
    difficulty: 2,
  },
  {
    competencyId: "competency-gh-computing-b4-desktop-icons-manage-001",
    title: "Move, Select and Hide Desktop Icons",
    description:
      "Move, select and hide multiple icons on the desktop using appropriate controls.",
    strandCode: "B4.1",
    subStrandCode: "B4.1.2",
    contentStandardCode: "B4.1.2.1",
    indicatorMappings: [
      { code: "B4.1.2.1.5", relationship: "direct" },
    ],
    prerequisiteCompetencyIds: [
      "competency-gh-computing-b4-desktop-icons-add-remove-001",
    ],
    relatedCompetencyIds: [],
    subskills: [
      "select_single_icon",
      "select_multiple_icons",
      "move_desktop_icon",
      "hide_desktop_icons",
    ],
    misconceptions: [
      "confuses_moving_with_deleting",
      "assumes_only_one_icon_can_be_selected",
      "assumes_hidden_icons_are_deleted",
    ],
    difficulty: 2,
  },
  {
    competencyId: "competency-gh-computing-b4-folders-001",
    title: "Create, Name and Rename Folders",
    description:
      "Create folders and give them appropriate names, then rename existing folders.",
    strandCode: "B4.1",
    subStrandCode: "B4.1.2",
    contentStandardCode: "B4.1.2.1",
    indicatorMappings: [
      { code: "B4.1.2.1.6", relationship: "direct" },
    ],
    prerequisiteCompetencyIds: [
      "competency-gh-computing-b4-desktop-features-001",
    ],
    relatedCompetencyIds: [],
    subskills: [
      "create_folder",
      "name_folder",
      "rename_folder",
      "recognise_folder_location",
    ],
    misconceptions: [
      "confuses_folder_with_file",
      "assumes_renaming_changes_folder_contents",
      "creates_multiple_folders_when_rename_is_required",
    ],
    difficulty: 2,
  },
  {
    competencyId: "competency-gh-computing-b4-identify-data-001",
    title: "Identify Data in Everyday Sources",
    description:
      "Identify examples of data in conversations, newspapers and other familiar sources.",
    strandCode: "B4.1",
    subStrandCode: "B4.1.3",
    contentStandardCode: "B4.1.3.1",
    indicatorMappings: [
      { code: "B4.1.3.1.1", relationship: "direct" },
    ],
    prerequisiteCompetencyIds: [],
    relatedCompetencyIds: [
      "competency-gh-computing-b4-classify-data-001",
    ],
    subskills: [
      "recognise_data",
      "extract_data_from_conversation",
      "extract_data_from_newspaper",
      "distinguish_data_items_from_surrounding_text",
    ],
    misconceptions: [
      "assumes_data_means_numbers_only",
      "confuses_opinion_with_recorded_data",
      "fails_to_recognise_textual_data",
    ],
    difficulty: 1,
  },
  {
    competencyId: "competency-gh-computing-b4-classify-data-001",
    title: "Classify Data into Useful Information",
    description:
      "Sort and classify data so that it can be organised into useful information.",
    strandCode: "B4.1",
    subStrandCode: "B4.1.3",
    contentStandardCode: "B4.1.3.1",
    indicatorMappings: [
      { code: "B4.1.3.1.2", relationship: "direct" },
    ],
    prerequisiteCompetencyIds: [
      "competency-gh-computing-b4-identify-data-001",
    ],
    relatedCompetencyIds: [],
    subskills: [
      "identify_classification_attribute",
      "sort_data",
      "group_related_data",
      "interpret_organised_data",
    ],
    misconceptions: [
      "groups_data_without_consistent_rule",
      "confuses_raw_data_with_interpreted_information",
      "assumes_data_has_only_one_possible_classification",
    ],
    difficulty: 2,
  },
  {
    competencyId: "competency-gh-computing-b4-primary-information-sources-001",
    title: "Identify Primary Sources of Information",
    description:
      "Identify primary sources of information such as photographs, recordings, letters, diaries, speeches, publications and oral histories.",
    strandCode: "B4.1",
    subStrandCode: "B4.1.3",
    contentStandardCode: "B4.1.3.1",
    indicatorMappings: [
      { code: "B4.1.3.1.3", relationship: "direct" },
    ],
    prerequisiteCompetencyIds: [
      "competency-gh-computing-b4-identify-data-001",
    ],
    relatedCompetencyIds: [],
    subskills: [
      "recognise_information_source",
      "identify_primary_source",
      "compare_source_types",
      "match_source_to_information",
    ],
    misconceptions: [
      "assumes_all_information_sources_are_identical",
      "confuses_source_with_information_it_contains",
      "assumes_only_digital_sources_provide_information",
    ],
    difficulty: 2,
  },
  {
    competencyId: "competency-gh-computing-b4-share-information-001",
    title: "Send and Share Information Using Technology",
    description:
      "Demonstrate ways information can be sent and shared using communication technologies and gadgets.",
    strandCode: "B4.1",
    subStrandCode: "B4.1.3",
    contentStandardCode: "B4.1.3.1",
    indicatorMappings: [
      { code: "B4.1.3.1.4", relationship: "direct" },
    ],
    prerequisiteCompetencyIds: [
      "competency-gh-computing-b4-identify-data-001",
    ],
    relatedCompetencyIds: [
      "competency-gh-computing-b4-community-digital-systems-001",
    ],
    subskills: [
      "identify_communication_gadget",
      "select_information_sharing_method",
      "describe_information_transmission",
      "demonstrate_basic_information_sharing",
    ],
    misconceptions: [
      "assumes_all_devices_send_information_the_same_way",
      "confuses_sending_with_storing_information",
      "assumes_communication_requires_a_computer_only",
    ],
    difficulty: 2,
  },
  {
    competencyId: "competency-gh-computing-b4-data-calculations-001",
    title: "Perform Basic Calculations on Data",
    description:
      "Perform basic calculations on sample data, including sum, percentage and average.",
    strandCode: "B4.1",
    subStrandCode: "B4.1.3",
    contentStandardCode: "B4.1.3.1",
    indicatorMappings: [
      { code: "B4.1.3.1.5", relationship: "direct" },
    ],
    prerequisiteCompetencyIds: [
      "competency-gh-computing-b4-classify-data-001",
    ],
    relatedCompetencyIds: [],
    subskills: [
      "calculate_sum",
      "calculate_simple_percentage",
      "calculate_average",
      "interpret_calculated_result",
    ],
    misconceptions: [
      "confuses_sum_with_average",
      "calculates_average_without_considering_number_of_values",
      "treats_percentage_as_raw_count",
    ],
    difficulty: 3,
  },
  {
    competencyId: "competency-gh-computing-b4-data-collection-process-001",
    title: "Identify Data Collection Steps and Issues",
    description:
      "Identify the main steps in collecting data and recognise common issues that can affect data collection.",
    strandCode: "B4.1",
    subStrandCode: "B4.1.3",
    contentStandardCode: "B4.1.3.2",
    indicatorMappings: [
      { code: "B4.1.3.2.1", relationship: "direct" },
    ],
    prerequisiteCompetencyIds: [
      "competency-gh-computing-b4-identify-data-001",
    ],
    relatedCompetencyIds: [
      "competency-gh-computing-b4-data-collection-tools-001",
    ],
    subskills: [
      "identify_data_collection_goal",
      "plan_data_collection",
      "collect_and_interpret_data",
      "recognise_data_collection_errors",
    ],
    misconceptions: [
      "collects_data_without_defined_purpose",
      "assumes_collected_data_is_always_error_free",
      "ignores_missing_or_manipulated_data",
    ],
    difficulty: 2,
  },
  {
    competencyId: "competency-gh-computing-b4-data-collection-tools-001",
    title: "Describe Data Collection Tools and Techniques",
    description:
      "Describe common data collection tools and techniques including interviews, observation and checklists.",
    strandCode: "B4.1",
    subStrandCode: "B4.1.3",
    contentStandardCode: "B4.1.3.2",
    indicatorMappings: [
      { code: "B4.1.3.2.2", relationship: "direct" },
    ],
    prerequisiteCompetencyIds: [
      "competency-gh-computing-b4-data-collection-process-001",
    ],
    relatedCompetencyIds: [],
    subskills: [
      "identify_data_collection_tool",
      "describe_interview_method",
      "describe_observation_method",
      "describe_checklist_method",
      "select_suitable_collection_method",
    ],
    misconceptions: [
      "assumes_one_collection_method_suits_every_task",
      "confuses_observation_with_guessing",
      "treats_checklist_as_completed_data",
    ],
    difficulty: 2,
  },
  {
    competencyId: "competency-gh-computing-b4-survey-maps-001",
    title: "Sketch Maps for Data Collection",
    description:
      "Draw or sketch simple maps of an area to support a survey or data collection activity.",
    strandCode: "B4.1",
    subStrandCode: "B4.1.3",
    contentStandardCode: "B4.1.3.2",
    indicatorMappings: [
      { code: "B4.1.3.2.3", relationship: "direct" },
    ],
    prerequisiteCompetencyIds: [
      "competency-gh-computing-b4-data-collection-process-001",
    ],
    relatedCompetencyIds: [],
    subskills: [
      "identify_survey_area_features",
      "represent_relative_locations",
      "create_simple_map",
      "use_map_for_survey_planning",
    ],
    misconceptions: [
      "draws_objects_without_spatial_relationship",
      "confuses_map_with_written_list",
      "adds_unrelated_features_that_obscure_survey_area",
    ],
    difficulty: 2,
  },
  {
    competencyId: "competency-gh-computing-b4-community-digital-systems-001",
    title: "Describe Digital Systems in the Community",
    description:
      "Describe how digital systems are or could be used at home, at school and in the local community.",
    strandCode: "B4.1",
    subStrandCode: "B4.1.4",
    contentStandardCode: "B4.1.4.1",
    indicatorMappings: [
      { code: "B4.1.4.1.1", relationship: "direct" },
    ],
    prerequisiteCompetencyIds: [
      "competency-gh-computing-b4-computer-parts-001",
    ],
    relatedCompetencyIds: [
      "competency-gh-computing-b4-community-system-purposes-001",
    ],
    subskills: [
      "identify_digital_system",
      "identify_home_use",
      "identify_school_use",
      "identify_community_use",
      "propose_appropriate_digital_use",
    ],
    misconceptions: [
      "assumes_digital_system_means_desktop_computer_only",
      "cannot_distinguish_digital_from_non_digital_tool",
      "selects_technology_without_matching_community_need",
    ],
    difficulty: 2,
  },
  {
    competencyId: "competency-gh-computing-b4-energy-efficient-gadgets-001",
    title: "Identify Energy-Efficient Gadgets and Techniques",
    description:
      "Identify common energy-efficient gadgets and techniques used at home, school and in the community.",
    strandCode: "B4.1",
    subStrandCode: "B4.1.4",
    contentStandardCode: "B4.1.4.1",
    indicatorMappings: [
      { code: "B4.1.4.1.2", relationship: "direct" },
    ],
    prerequisiteCompetencyIds: [
      "competency-gh-computing-b4-community-digital-systems-001",
    ],
    relatedCompetencyIds: [],
    subskills: [
      "identify_energy_efficient_gadget",
      "identify_energy_saving_technique",
      "compare_energy_use_behaviours",
      "select_energy_efficient_practice",
    ],
    misconceptions: [
      "assumes_all_electronic_devices_use_equal_energy",
      "confuses_energy_efficiency_with_device_size",
      "assumes_switching_off_unused_devices_has_no_effect",
    ],
    difficulty: 2,
  },
  {
    competencyId: "competency-gh-computing-b4-community-system-purposes-001",
    title: "Match Digital Systems and Peripherals to Community Purposes",
    description:
      "Describe how digital systems, software and peripherals can be used for different purposes in the community.",
    strandCode: "B4.1",
    subStrandCode: "B4.1.4",
    contentStandardCode: "B4.1.4.1",
    indicatorMappings: [
      { code: "B4.1.4.1.3", relationship: "direct" },
    ],
    prerequisiteCompetencyIds: [
      "competency-gh-computing-b4-community-digital-systems-001",
    ],
    relatedCompetencyIds: [
      "competency-gh-computing-b4-input-devices-001",
    ],
    subskills: [
      "identify_hardware_role",
      "identify_software_role",
      "identify_peripheral_role",
      "match_system_to_community_purpose",
    ],
    misconceptions: [
      "confuses_hardware_and_software",
      "assumes_one_system_is_best_for_every_purpose",
      "ignores_role_of_peripherals",
    ],
    difficulty: 2,
  },
  {
    competencyId: "competency-gh-computing-b4-technological-change-001",
    title: "Identify Technological Changes in the Community",
    description:
      "Identify examples of technological change in the community and describe how technology can improve familiar activities.",
    strandCode: "B4.1",
    subStrandCode: "B4.1.4",
    contentStandardCode: "B4.1.4.1",
    indicatorMappings: [
      { code: "B4.1.4.1.4", relationship: "direct" },
    ],
    prerequisiteCompetencyIds: [
      "competency-gh-computing-b4-community-digital-systems-001",
    ],
    relatedCompetencyIds: [],
    subskills: [
      "recognise_technological_change",
      "compare_old_and_new_method",
      "identify_community_benefit",
      "describe_technology_application",
    ],
    misconceptions: [
      "assumes_every_new_method_is_digital",
      "treats_technology_as_entertainment_only",
      "cannot_connect_technology_to_community_problem",
    ],
    difficulty: 2,
  },
  {
    competencyId: "competency-gh-computing-b4-powerpoint-home-ribbon-001",
    title: "Use PowerPoint Home Ribbon Tools",
    description:
      "Demonstrate the use of clipboard, slides, fonts, paragraph and editing tools in the Home ribbon of presentation software.",
    strandCode: "B4.2",
    subStrandCode: "B4.2.1",
    contentStandardCode: "B4.2.1.1",
    indicatorMappings: [
      { code: "B4.2.1.1.1", relationship: "direct" },
    ],
    prerequisiteCompetencyIds: [
      "competency-gh-computing-b4-typing-001",
    ],
    relatedCompetencyIds: [
      "competency-gh-computing-b4-word-processing-tools-001",
    ],
    subskills: [
      "use_clipboard_tools",
      "manage_slides",
      "format_fonts",
      "format_paragraphs",
      "use_basic_editing_tools",
    ],
    misconceptions: [
      "confuses_slide_with_entire_presentation",
      "uses_formatting_without_selecting_target_content",
      "confuses_clipboard_actions_with_file_storage",
    ],
    difficulty: 2,
  },
  {
    competencyId: "competency-gh-computing-b4-powerpoint-presentation-001",
    title: "Create and Show a Three-Slide Presentation",
    description:
      "Create and show a three-slide presentation using the clipboard, slide, font, paragraph and editing tools studied.",
    strandCode: "B4.2",
    subStrandCode: "B4.2.1",
    contentStandardCode: "B4.2.1.1",
    indicatorMappings: [
      { code: "B4.2.1.1.2", relationship: "direct" },
    ],
    prerequisiteCompetencyIds: [
      "competency-gh-computing-b4-powerpoint-home-ribbon-001",
    ],
    relatedCompetencyIds: [],
    subskills: [
      "create_three_slides",
      "enter_slide_content",
      "format_slide_content",
      "organise_slide_sequence",
      "show_presentation",
    ],
    misconceptions: [
      "places_all_content_on_one_slide",
      "confuses_edit_mode_with_slide_show",
      "creates_slides_without_logical_sequence",
    ],
    difficulty: 3,
  },
  {
    competencyId: "competency-gh-computing-b4-word-processing-tools-001",
    title: "Use Basic Word Processing Tools",
    description:
      "Demonstrate the use of clipboard, styles, fonts, paragraph and editing tools in a word processing application.",
    strandCode: "B4.3",
    subStrandCode: "B4.3.1",
    contentStandardCode: "B4.3.1.1",
    indicatorMappings: [
      { code: "B4.3.1.1.1", relationship: "direct" },
    ],
    prerequisiteCompetencyIds: [
      "competency-gh-computing-b4-typing-001",
    ],
    relatedCompetencyIds: [
      "competency-gh-computing-b4-powerpoint-home-ribbon-001",
    ],
    subskills: [
      "use_word_processor_clipboard",
      "apply_text_style",
      "format_font",
      "format_paragraph",
      "use_basic_editing_tools",
    ],
    misconceptions: [
      "confuses_formatting_with_content_entry",
      "uses_clipboard_tools_without_understanding_copy_and_paste",
      "assumes_font_changes_alter_text_meaning",
    ],
    difficulty: 2,
  },
  {
    competencyId: "competency-gh-computing-b4-word-processing-application-001",
    title: "Apply Word Processing Tools",
    description:
      "Illustrate the practical use of clipboard, styles, fonts, paragraph and editing tools in a word processing task.",
    strandCode: "B4.3",
    subStrandCode: "B4.3.1",
    contentStandardCode: "B4.3.1.1",
    indicatorMappings: [
      { code: "B4.3.1.1.2", relationship: "direct" },
    ],
    prerequisiteCompetencyIds: [
      "competency-gh-computing-b4-word-processing-tools-001",
    ],
    relatedCompetencyIds: [],
    subskills: [
      "enter_document_content",
      "edit_document_content",
      "apply_text_formatting",
      "apply_paragraph_formatting",
      "produce_formatted_document",
    ],
    misconceptions: [
      "formats_text_without_selecting_it",
      "confuses_editing_with_formatting",
      "assumes_visual_formatting_replaces_correct_content",
    ],
    difficulty: 3,
  },
];

