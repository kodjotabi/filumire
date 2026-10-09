export interface GhanaB4ScienceAdaptiveSpec {
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
}

function competencyId(code: string): string {
  return `competency-gh-science-${code.toLowerCase().replace(/\./g, "-")}`;
}

export const GHANA_B4_SCIENCE_ADAPTIVE_SPECS:
  GhanaB4ScienceAdaptiveSpec[] = [
  {
    code: "B4.1.1.1.1",
    competencyId:
      "competency-gh-science-b4-animal-classification-001",
    strandCode: "B4.1",
    subStrandCode: "B4.1.1",
    contentStandardCode: "B4.1.1.1",
    title: "Classify Animals by Defining Features",
    description:
      "Classify familiar animals as insects, birds, mammals or reptiles using defining features rather than habitat or movement alone.",
    subskills: [
      "observe_relevant_animal_features",
      "distinguish_animal_group_features",
      "classify_animal_by_features",
      "justify_animal_classification",
    ],
    misconceptions: [
      "classifies_flying_animals_as_birds",
      "classifies_by_habitat_instead_of_features",
      "treats_all_small_animals_as_insects",
      "ignores_defining_body_features",
    ],
    difficulty: 1,
  },
  {
    code: "B4.1.1.1.2",
    competencyId: competencyId("B4.1.1.1.2"),
    strandCode: "B4.1",
    subStrandCode: "B4.1.1",
    contentStandardCode: "B4.1.1.1",
    title: "Explain Life Processes of Animals",
    description:
      "Recognise and explain movement, nutrition and reproduction as important life processes of animals.",
    subskills: [
      "identify_animal_movement",
      "identify_animal_nutrition",
      "identify_animal_reproduction",
      "connect_life_processes_to_living_animals",
    ],
    misconceptions: [
      "treats_movement_as_the_only_life_process",
      "confuses_feeding_with_reproduction",
      "assumes_all_animals_move_in_the_same_way",
    ],
    difficulty: 1,
  },
  {
    code: "B4.1.1.2.2",
    competencyId: competencyId("B4.1.1.2.2"),
    strandCode: "B4.1",
    subStrandCode: "B4.1.1",
    contentStandardCode: "B4.1.1.2",
    title: "Describe Types of Plants",
    description:
      "Describe physical features of trees, shrubs, climbing plants and creeping plants.",
    subskills: [
      "observe_plant_structure",
      "distinguish_growth_forms",
      "classify_common_plants",
      "describe_visible_plant_features",
    ],
    misconceptions: [
      "classifies_plants_only_by_size",
      "confuses_climbing_and_creeping_plants",
      "assumes_all_woody_plants_are_trees",
    ],
    difficulty: 1,
  },
  {
    code: "B4.1.1.2.3",
    competencyId: competencyId("B4.1.1.2.3"),
    strandCode: "B4.1",
    subStrandCode: "B4.1.1",
    contentStandardCode: "B4.1.1.2",
    title: "Describe Animal Group Features",
    description:
      "Describe distinguishing physical features of mammals, reptiles, insects and amphibians.",
    subskills: [
      "observe_animal_body_features",
      "compare_animal_groups",
      "identify_distinguishing_features",
      "describe_animal_groups",
    ],
    misconceptions: [
      "confuses_amphibians_with_reptiles",
      "uses_habitat_as_the_main_group_feature",
      "ignores_body_covering_and_structure",
    ],
    difficulty: 1,
  },
  {
    code: "B4.1.2.2.1",
    competencyId: competencyId("B4.1.2.2.1"),
    strandCode: "B4.1",
    subStrandCode: "B4.1.2",
    contentStandardCode: "B4.1.2.2",
    title: "Separate Liquid-Liquid Mixtures",
    description:
      "Identify liquid-liquid mixtures and select appropriate ways of separating their components.",
    subskills: [
      "identify_liquid_liquid_mixture",
      "observe_liquid_properties",
      "select_separation_method",
      "explain_separation_reasoning",
    ],
    misconceptions: [
      "assumes_all_liquids_mix_completely",
      "uses_filtration_for_any_mixture",
      "confuses_mixing_with_dissolving",
    ],
    difficulty: 2,
  },
  {
    code: "B4.2.1.1.1",
    competencyId: competencyId("B4.2.1.1.1"),
    strandCode: "B4.2",
    subStrandCode: "B4.2.1",
    contentStandardCode: "B4.2.1.1",
    title: "Recognise Cyclic Environmental Movements",
    description:
      "Recognise and explain environmental movements or events that occur repeatedly in cycles.",
    subskills: [
      "identify_repeating_events",
      "recognise_cycle_order",
      "distinguish_cycle_from_one_time_event",
      "explain_recurrence",
    ],
    misconceptions: [
      "treats_any_repeated_event_as_a_natural_cycle",
      "confuses_sequence_with_cycle",
      "assumes_cycles_have_no_order",
    ],
    difficulty: 2,
  },
  {
    code: "B4.2.1.2.1",
    competencyId: competencyId("B4.2.1.2.1"),
    strandCode: "B4.2",
    subStrandCode: "B4.2.1",
    contentStandardCode: "B4.2.1.2",
    title: "Identify Objects Seen in the Sky",
    description:
      "Identify common objects visible in the sky during daytime and nighttime.",
    subskills: [
      "identify_day_sky_objects",
      "identify_night_sky_objects",
      "compare_day_and_night_observations",
      "avoid_visibility_overgeneralisation",
    ],
    misconceptions: [
      "assumes_the_moon_only_exists_at_night",
      "confuses_stars_with_planets",
      "assumes_objects_disappear_when_not_visible",
    ],
    difficulty: 1,
  },
  {
    code: "B4.2.1.3.1",
    competencyId: competencyId("B4.2.1.3.1"),
    strandCode: "B4.2",
    subStrandCode: "B4.2.1",
    contentStandardCode: "B4.2.1.3",
    title: "Explain Evapotranspiration",
    description:
      "Explain evaporation and transpiration and how both contribute water vapour to the atmosphere.",
    subskills: [
      "identify_evaporation",
      "identify_transpiration",
      "compare_evaporation_and_transpiration",
      "connect_processes_to_water_cycle",
    ],
    misconceptions: [
      "confuses_evaporation_with_boiling",
      "assumes_plants_do_not_release_water",
      "treats_transpiration_as_plant_respiration",
    ],
    difficulty: 2,
  },
  {
    code: "B4.2.1.5.1",
    competencyId: competencyId("B4.2.1.5.1"),
    strandCode: "B4.2",
    subStrandCode: "B4.2.1",
    contentStandardCode: "B4.2.1.5",
    title: "Make Water Safer for Use",
    description:
      "Identify and explain appropriate ways of making water safer for household use.",
    subskills: [
      "recognise_unsafe_water",
      "identify_water_treatment_methods",
      "select_method_for_context",
      "explain_safe_storage",
    ],
    misconceptions: [
      "assumes_clear_water_is_always_safe",
      "confuses_filtering_with_complete_disinfection",
      "ignores_recontamination_after_treatment",
    ],
    difficulty: 2,
  },
  {
    code: "B4.2.2.1.1",
    competencyId: competencyId("B4.2.2.1.1"),
    strandCode: "B4.2",
    subStrandCode: "B4.2.2",
    contentStandardCode: "B4.2.2.1",
    title: "Identify Plant Parts and Their Functions",
    description:
      "Identify major parts of a plant and explain their basic functions.",
    subskills: [
      "identify_root",
      "identify_stem",
      "identify_leaf",
      "identify_flower",
      "match_plant_part_to_function",
    ],
    misconceptions: [
      "confuses_root_and_stem_functions",
      "assumes_leaves_only_provide_shade",
      "treats_all_plant_parts_as_having_the_same_function",
    ],
    difficulty: 1,
  },
  {
    code: "B4.2.2.1.2",
    competencyId: competencyId("B4.2.2.1.2"),
    strandCode: "B4.2",
    subStrandCode: "B4.2.2",
    contentStandardCode: "B4.2.2.1",
    title: "Explain Seed Germination",
    description:
      "Observe common seeds and explain the basic conditions and changes involved in germination.",
    subskills: [
      "observe_seed_features",
      "identify_germination_conditions",
      "sequence_germination_changes",
      "distinguish_germination_from_growth",
    ],
    misconceptions: [
      "assumes_soil_is_always_required_for_germination",
      "assumes_light_is_the_only_germination_requirement",
      "confuses_germination_with_full_plant_growth",
    ],
    difficulty: 2,
  },
  {
    code: "B4.3.1.1.1",
    competencyId: competencyId("B4.3.1.1.1"),
    strandCode: "B4.3",
    subStrandCode: "B4.3.1",
    contentStandardCode: "B4.3.1.1",
    title: "Identify Digestive Organs and Functions",
    description:
      "Identify major organs of the digestive system and match them to their basic functions.",
    subskills: [
      "identify_digestive_organs",
      "sequence_digestive_path",
      "match_organ_to_function",
      "explain_digestion_as_a_system",
    ],
    misconceptions: [
      "assumes_digestion_occurs_only_in_the_stomach",
      "confuses_digestive_organs_with_excretory_organs",
      "treats_organs_as_working_independently",
    ],
    difficulty: 2,
  },
  {
    code: "B4.3.2.1.1",
    competencyId: competencyId("B4.3.2.1.1"),
    strandCode: "B4.3",
    subStrandCode: "B4.3.2",
    contentStandardCode: "B4.3.2.1",
    title: "Explain the Sun's Place in the Solar System",
    description:
      "Explain that the sun is at the centre of the solar system and planets move around it.",
    subskills: [
      "identify_sun",
      "identify_planets",
      "recognise_solar_system_structure",
      "explain_planetary_orbit_concept",
    ],
    misconceptions: [
      "places_earth_at_centre_of_solar_system",
      "treats_sun_as_a_planet",
      "assumes_sun_moves_around_earth",
    ],
    difficulty: 2,
  },
  {
    code: "B4.3.3.1.1",
    competencyId: competencyId("B4.3.3.1.1"),
    strandCode: "B4.3",
    subStrandCode: "B4.3.3",
    contentStandardCode: "B4.3.3.1",
    title: "Explain an Ecosystem",
    description:
      "Explain an ecosystem as living organisms interacting with one another and with their environment.",
    subskills: [
      "identify_living_components",
      "identify_nonliving_components",
      "recognise_interactions",
      "explain_interdependence",
    ],
    misconceptions: [
      "treats_ecosystem_as_only_animals",
      "ignores_nonliving_environment",
      "assumes_organisms_live_independently",
    ],
    difficulty: 2,
  },
  {
    code: "B4.4.1.1.1",
    competencyId: competencyId("B4.4.1.1.1"),
    strandCode: "B4.4",
    subStrandCode: "B4.4.1",
    contentStandardCode: "B4.4.1.1",
    title: "Explain Heat and Changes of State",
    description:
      "Identify how heating or cooling can cause substances to change state.",
    subskills: [
      "identify_states_of_matter",
      "recognise_melting",
      "recognise_evaporation",
      "recognise_condensation",
      "connect_heat_to_state_change",
    ],
    misconceptions: [
      "assumes_melting_and_dissolving_are_the_same",
      "assumes_matter_disappears_during_evaporation",
      "ignores_cooling_in_state_changes",
    ],
    difficulty: 2,
  },
  {
    code: "B4.4.2.1.1",
    competencyId: competencyId("B4.4.2.1.1"),
    strandCode: "B4.4",
    subStrandCode: "B4.4.2",
    contentStandardCode: "B4.4.2.1",
    title: "Identify Uses of Electricity",
    description:
      "Identify common uses of electricity and the devices or activities that depend on it.",
    subskills: [
      "identify_electrical_devices",
      "match_electricity_to_use",
      "distinguish_electrical_and_nonelectrical_uses",
      "recognise_safe_use_contexts",
    ],
    misconceptions: [
      "assumes_all_devices_use_electricity",
      "confuses_electricity_with_battery_only",
      "ignores_electrical_safety",
    ],
    difficulty: 1,
  },
  {
    code: "B4.4.2.1.2",
    competencyId: competencyId("B4.4.2.1.2"),
    strandCode: "B4.4",
    subStrandCode: "B4.4.2",
    contentStandardCode: "B4.4.2.1",
    title: "Conserve Electricity",
    description:
      "Identify and explain practical ways of reducing unnecessary electricity use.",
    subskills: [
      "identify_energy_waste",
      "choose_conservation_action",
      "explain_conservation_benefit",
      "apply_conservation_at_home_and_school",
    ],
    misconceptions: [
      "assumes_switching_devices_off_has_no_effect",
      "confuses_conservation_with_not_using_electricity_at_all",
      "ignores_standby_or_unnecessary_use",
    ],
    difficulty: 1,
  },
  {
    code: "B4.4.2.2.1",
    competencyId: competencyId("B4.4.2.2.1"),
    strandCode: "B4.4",
    subStrandCode: "B4.4.2",
    contentStandardCode: "B4.4.2.2",
    title: "Identify Basic Electronic Circuit Components",
    description:
      "Identify basic components used in simple electronic circuits and recognise their functions.",
    subskills: [
      "identify_cell_or_battery",
      "identify_wire",
      "identify_switch",
      "identify_output_component",
      "match_component_to_function",
    ],
    misconceptions: [
      "confuses_component_with_complete_circuit",
      "assumes_wire_is_the_energy_source",
      "ignores_need_for_complete_path",
    ],
    difficulty: 2,
  },
  {
    code: "B4.4.3.1.1",
    competencyId: competencyId("B4.4.3.1.1"),
    strandCode: "B4.4",
    subStrandCode: "B4.4.3",
    contentStandardCode: "B4.4.3.1",
    title: "Explain Elastic and Compressional Forces",
    description:
      "Recognise elastic and compressional forces and explain familiar applications.",
    subskills: [
      "identify_elastic_force",
      "identify_compression",
      "observe_shape_change",
      "connect_force_to_everyday_application",
    ],
    misconceptions: [
      "confuses_force_with_motion",
      "assumes_all_deformation_is_permanent",
      "confuses_stretching_and_compression",
    ],
    difficulty: 2,
  },
  {
    code: "B4.5.1.1.1",
    competencyId: competencyId("B4.5.1.1.1"),
    strandCode: "B4.5",
    subStrandCode: "B4.5.1",
    contentStandardCode: "B4.5.1.1",
    title: "Practise Personal and Environmental Hygiene",
    description:
      "Identify appropriate ways of caring for oneself and keeping the immediate environment clean.",
    subskills: [
      "identify_personal_hygiene_action",
      "identify_environmental_hygiene_action",
      "connect_hygiene_to_health",
      "choose_safe_hygiene_practice",
    ],
    misconceptions: [
      "treats_hygiene_as_appearance_only",
      "ignores_environmental_cleanliness",
      "assumes_handwashing_without_soap_is_always_equivalent",
    ],
    difficulty: 1,
  },
  {
    code: "B4.5.1.1.2",
    competencyId: competencyId("B4.5.1.1.2"),
    strandCode: "B4.5",
    subStrandCode: "B4.5.1",
    contentStandardCode: "B4.5.1.1",
    title: "Manage Waste to Protect the Environment",
    description:
      "Describe responsible waste-management practices that help sustain a clean environment.",
    subskills: [
      "identify_types_of_waste",
      "recognise_safe_disposal",
      "identify_reuse_and_recycling",
      "connect_waste_management_to_environment",
    ],
    misconceptions: [
      "assumes_burning_is_the_best_solution_for_all_waste",
      "treats_littering_as_harmless",
      "confuses_reuse_with_disposal",
    ],
    difficulty: 2,
  },
  {
    code: "B4.5.2.1.1",
    competencyId: competencyId("B4.5.2.1.1"),
    strandCode: "B4.5",
    subStrandCode: "B4.5.2",
    contentStandardCode: "B4.5.2.1",
    title: "Understand Measles",
    description:
      "Identify basic causes, symptoms and prevention measures associated with measles.",
    subskills: [
      "recognise_measles_as_infectious_disease",
      "identify_common_symptoms",
      "identify_prevention",
      "distinguish_cause_symptom_and_prevention",
    ],
    misconceptions: [
      "confuses_symptom_with_cause",
      "assumes_measles_is_caused_by_dirt",
      "ignores_preventive_role_of_vaccination",
    ],
    difficulty: 2,
  },
  {
    code: "B4.5.2.1.2",
    competencyId: competencyId("B4.5.2.1.2"),
    strandCode: "B4.5",
    subStrandCode: "B4.5.2",
    contentStandardCode: "B4.5.2.1",
    title: "Prevent Food-Borne Disease",
    description:
      "Explain common causes, symptoms and prevention of food-borne diseases.",
    subskills: [
      "identify_contaminated_food_risk",
      "recognise_common_symptoms",
      "identify_safe_food_practices",
      "connect_contamination_to_disease",
    ],
    misconceptions: [
      "assumes_food_is_safe_if_it_smells_normal",
      "confuses_food_spoilage_with_all_foodborne_disease",
      "ignores_hand_and_utensil_hygiene",
    ],
    difficulty: 2,
  },
  {
    code: "B4.5.4.1.1",
    competencyId: competencyId("B4.5.4.1.1"),
    strandCode: "B4.5",
    subStrandCode: "B4.5.4",
    contentStandardCode: "B4.5.4.1",
    title: "Explain Burning as a Cause of Climate Change",
    description:
      "Explain how burning fuels or materials can contribute to climate change.",
    subskills: [
      "identify_common_burning_sources",
      "recognise_emissions_from_burning",
      "connect_emissions_to_climate_change",
      "distinguish_weather_from_climate",
    ],
    misconceptions: [
      "confuses_climate_change_with_daily_weather",
      "assumes_only_large_fires_matter",
      "assumes_smoke_has_no_atmospheric_effect",
    ],
    difficulty: 2,
  },
];

export const GHANA_B4_SCIENCE_LEARNING_INDICATOR_CODES =
  GHANA_B4_SCIENCE_ADAPTIVE_SPECS.map(
    (spec) => spec.code,
  );

export function getGhanaB4ScienceAdaptiveSpec(
  code: string,
): GhanaB4ScienceAdaptiveSpec | undefined {
  return GHANA_B4_SCIENCE_ADAPTIVE_SPECS.find(
    (spec) => spec.code === code,
  );
}
