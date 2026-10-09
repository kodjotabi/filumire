import type { MathematicsEvidenceDesign } from "./ghana-b4-mathematics-evidence";
import { GHANA_B4_MATHEMATICS_EVIDENCE } from "./ghana-b4-mathematics-evidence-data";

export interface GhanaB4MathematicsIndicatorMapping {
  code: string;
  relationship: "direct" | "supports";
}

export interface GhanaB4MathematicsAdaptiveSpec {
  competencyId: string;
  title: string;
  description: string;

  strandCode: string;
  subStrandCode: string;
  contentStandardCode: string;

  indicatorMappings: GhanaB4MathematicsIndicatorMapping[];

  prerequisiteCompetencyIds: string[];
  relatedCompetencyIds: string[];

  subskills: string[];
  misconceptions: string[];

  difficulty: number;
  evidence?: MathematicsEvidenceDesign;
}

export const GHANA_B4_MATHEMATICS_ADAPTIVE_SPECS:
  GhanaB4MathematicsAdaptiveSpec[] = [
  {
    competencyId: "competency-gh-math-b4-place-value-001",
    title: "Understand Place Value to 100,000",
    description:
      "Model, read and write whole numbers up to 100,000 using place value representations.",
    strandCode: "B4.1",
    subStrandCode: "B4.1.1",
    contentStandardCode: "B4.1.1.1",
    indicatorMappings: [
      { code: "B4.1.1.1.1", relationship: "direct" },
      { code: "B4.1.1.1.2", relationship: "direct" },
    ],
    prerequisiteCompetencyIds: [],
    relatedCompetencyIds: [],
    subskills: [
      "model_place_value",
      "read_whole_numbers",
      "write_whole_numbers",
    ],
    misconceptions: [
      "confuses_digit_with_place_value",
      "omits_zero_placeholders",
    ],
    difficulty: 1,
    evidence: {
      profile: "conceptual_understanding",
      diagnosticTask:
        "In 54,307, state the value of the digit 4, then write fifty-four thousand, three hundred and seven in figures.",
      reassessmentTask:
        "In 82,416, state the value of the digit 2, then write eighty-two thousand, four hundred and sixteen in figures.",
      retentionTask:
        "Without reviewing the lesson, in 70,418 state the value of the digit 4, then write seventy thousand, four hundred and eighteen in figures.",
      transferTask:
        "A school recorded 36,205 exercise books. Explain the value of the digit 6 and write the number in words.",
      successCriteria: [
        "identifies_digit_place_correctly",
        "states_digit_value_correctly",
        "reads_whole_number_correctly",
        "writes_whole_number_correctly",
      ],
      targetIndicatorCodes: [
        "B4.1.1.1.1",
        "B4.1.1.1.2",
      ],
      targetSubskills: [
        "model_place_value",
        "read_whole_numbers",
        "write_whole_numbers",
      ],
    },
  },
  {
    competencyId: "competency-gh-math-b4-number-navigation-001",
    title: "Navigate Number Charts and Sequences",
    description:
      "Locate neighbouring numbers and skip count forwards and backwards in structured number sequences.",
    strandCode: "B4.1",
    subStrandCode: "B4.1.1",
    contentStandardCode: "B4.1.1.1",
    indicatorMappings: [
      { code: "B4.1.1.1.3", relationship: "direct" },
      { code: "B4.1.1.1.6", relationship: "direct" },
    ],
    prerequisiteCompetencyIds: [
      "competency-gh-math-b4-place-value-001",
    ],
    relatedCompetencyIds: [],
    subskills: [
      "locate_numbers_on_chart",
      "identify_number_neighbours",
      "skip_count_forward",
      "skip_count_backward",
    ],
    misconceptions: [
      "uses_digit_pattern_instead_of_number_value",
      "changes_skip_interval",
    ],
    difficulty: 1,
  },
  {
    competencyId: "competency-gh-math-b4-whole-number-comparison-001",
    title: "Compare and Order Whole Numbers",
    description:
      "Compare and order whole numbers up to 10,000 using place value and comparison symbols.",
    strandCode: "B4.1",
    subStrandCode: "B4.1.1",
    contentStandardCode: "B4.1.1.1",
    indicatorMappings: [
      { code: "B4.1.1.1.4", relationship: "direct" },
    ],
    prerequisiteCompetencyIds: [
      "competency-gh-math-b4-place-value-001",
    ],
    relatedCompetencyIds: [],
    subskills: [
      "compare_place_values",
      "order_whole_numbers",
      "use_comparison_symbols",
    ],
    misconceptions: [
      "compares_numbers_by_digit_count_only",
      "reverses_less_than_and_greater_than_symbols",
    ],
    difficulty: 1,
  },
  {
    competencyId: "competency-gh-math-b4-rounding-001",
    title: "Round Whole Numbers",
    description:
      "Round whole numbers up to 10,000 to the nearest ten, hundred and thousand.",
    strandCode: "B4.1",
    subStrandCode: "B4.1.1",
    contentStandardCode: "B4.1.1.1",
    indicatorMappings: [
      { code: "B4.1.1.1.5", relationship: "direct" },
    ],
    prerequisiteCompetencyIds: [
      "competency-gh-math-b4-place-value-001",
      "competency-gh-math-b4-whole-number-comparison-001",
    ],
    relatedCompetencyIds: [],
    subskills: [
      "identify_rounding_place",
      "use_nearest_benchmark",
      "round_whole_number",
    ],
    misconceptions: [
      "rounds_using_wrong_place",
      "changes_digits_left_of_rounding_place",
    ],
    difficulty: 2,

  },
  {
    competencyId: "competency-gh-math-b4-roman-numerals-001",
    title: "Understand and Convert Roman Numerals",
    description:
      "Recognise Roman numeral symbols and convert between Roman and Hindu-Arabic numerals up to 30.",
    strandCode: "B4.1",
    subStrandCode: "B4.1.1",
    contentStandardCode: "B4.1.1.2",
    indicatorMappings: [
      { code: "B4.1.1.2.1", relationship: "direct" },
      { code: "B4.1.1.2.2", relationship: "direct" },
    ],
    prerequisiteCompetencyIds: [],
    relatedCompetencyIds: [],
    subskills: [
      "recognise_roman_symbols",
      "compose_roman_numerals",
      "convert_roman_and_hindu_arabic",
    ],
    misconceptions: [
      "adds_all_roman_symbols_regardless_of_order",
      "uses_invalid_roman_symbol_combinations",
    ],
    difficulty: 1,
  },
  {
    competencyId: "competency-gh-math-b4-factors-multiples-001",
    title: "Identify Factors and Multiples",
    description:
      "Determine factors of whole numbers and recognise the relationship between factors and multiples.",
    strandCode: "B4.1",
    subStrandCode: "B4.1.1",
    contentStandardCode: "B4.1.1.3",
    indicatorMappings: [
      { code: "B4.1.1.3.1", relationship: "direct" },
      { code: "B4.1.1.3.4", relationship: "direct" },
    ],
    prerequisiteCompetencyIds: [
      "competency-gh-math-b4-multiplication-facts-001",
    ],
    relatedCompetencyIds: [],
    subskills: [
      "find_factor_pairs",
      "identify_multiples",
      "relate_factors_and_multiples",
    ],
    misconceptions: [
      "confuses_factors_with_multiples",
      "omits_factor_pairs",
    ],
    difficulty: 2,
  },
  {
    competencyId: "competency-gh-math-b4-hcf-lcm-001",
    title: "Determine HCF and LCM",
    description:
      "Determine the highest common factor and lowest common multiple of given whole numbers.",
    strandCode: "B4.1",
    subStrandCode: "B4.1.1",
    contentStandardCode: "B4.1.1.3",
    indicatorMappings: [
      { code: "B4.1.1.3.2", relationship: "direct" },
      { code: "B4.1.1.3.3", relationship: "direct" },
    ],
    prerequisiteCompetencyIds: [
      "competency-gh-math-b4-factors-multiples-001",
    ],
    relatedCompetencyIds: [],
    subskills: [
      "identify_common_factors",
      "determine_highest_common_factor",
      "identify_common_multiples",
      "determine_lowest_common_multiple",
    ],
    misconceptions: [
      "selects_any_common_factor_as_hcf",
      "selects_first_multiple_of_one_number_as_lcm",
    ],
    difficulty: 3,
  },
  {
    competencyId: "competency-gh-math-b4-square-numbers-001",
    title: "Understand Square Numbers",
    description:
      "Generate, analyse and represent square numbers using equal factors.",
    strandCode: "B4.1",
    subStrandCode: "B4.1.1",
    contentStandardCode: "B4.1.1.3",
    indicatorMappings: [
      { code: "B4.1.1.3.5", relationship: "direct" },
      { code: "B4.1.1.3.6", relationship: "direct" },
    ],
    prerequisiteCompetencyIds: [
      "competency-gh-math-b4-factors-multiples-001",
    ],
    relatedCompetencyIds: [],
    subskills: [
      "generate_square_numbers",
      "recognise_square_number_patterns",
      "represent_square_as_equal_factors",
    ],
    misconceptions: [
      "confuses_doubling_with_squaring",
      "treats_any_product_as_square_number",
    ],
    difficulty: 2,
  },
  {
    competencyId: "competency-gh-math-b4-integers-context-001",
    title: "Interpret Positive and Negative Numbers",
    description:
      "Use positive and negative whole numbers to describe quantities and real-life situations.",
    strandCode: "B4.1",
    subStrandCode: "B4.1.1",
    contentStandardCode: "B4.1.1.4",
    indicatorMappings: [
      { code: "B4.1.1.4.1", relationship: "direct" },
    ],
    prerequisiteCompetencyIds: [],
    relatedCompetencyIds: [],
    subskills: [
      "interpret_positive_values",
      "interpret_negative_values",
      "represent_context_with_signed_numbers",
    ],
    misconceptions: [
      "treats_negative_sign_as_subtraction_only",
      "assumes_negative_numbers_are_larger_than_positive_numbers",
    ],
    difficulty: 1,
  },
  {
    competencyId: "competency-gh-math-b4-integer-order-001",
    title: "Count and Order Through Zero",
    description:
      "Count forwards and backwards with positive and negative whole numbers through zero.",
    strandCode: "B4.1",
    subStrandCode: "B4.1.1",
    contentStandardCode: "B4.1.1.4",
    indicatorMappings: [
      { code: "B4.1.1.4.2", relationship: "direct" },
    ],
    prerequisiteCompetencyIds: [
      "competency-gh-math-b4-integers-context-001",
    ],
    relatedCompetencyIds: [],
    subskills: [
      "sequence_signed_numbers",
      "cross_zero_forward",
      "cross_zero_backward",
    ],
    misconceptions: [
      "skips_zero_when_crossing_signs",
      "reverses_negative_number_order",
    ],
    difficulty: 2,
  },
  {
    competencyId: "competency-gh-math-b4-multiplication-facts-001",
    title: "Recall Multiplication Facts to 12 x 12",
    description:
      "Recall and use basic multiplication facts up to 12 x 12 accurately and efficiently.",
    strandCode: "B4.1",
    subStrandCode: "B4.1.2",
    contentStandardCode: "B4.1.2.1",
    indicatorMappings: [
      { code: "B4.1.2.1.1", relationship: "direct" },
    ],
    prerequisiteCompetencyIds: [],
    relatedCompetencyIds: [
      "competency-gh-math-b4-factors-multiples-001",
    ],
    subskills: [
      "recall_multiplication_facts",
      "use_commutative_fact_pairs",
      "derive_unknown_multiplication_fact",
    ],
    misconceptions: [
      "uses_repeated_addition_inaccurately",
      "confuses_neighbouring_multiplication_facts",
    ],
    difficulty: 1,
  },
  {
    competencyId: "competency-gh-math-b4-fact-families-001",
    title: "Use Multiplication and Division Fact Families",
    description:
      "Use multiplication facts, related division facts and number properties to calculate mentally.",
    strandCode: "B4.1",
    subStrandCode: "B4.1.2",
    contentStandardCode: "B4.1.2.2",
    indicatorMappings: [
      { code: "B4.1.2.2.1", relationship: "direct" },
      { code: "B4.1.2.4.1", relationship: "direct" },
    ],
    prerequisiteCompetencyIds: [
      "competency-gh-math-b4-multiplication-facts-001",
    ],
    relatedCompetencyIds: [],
    subskills: [
      "connect_multiplication_and_division",
      "recall_division_facts",
      "use_number_properties_mentally",
    ],
    misconceptions: [
      "treats_multiplication_and_division_as_unrelated",
      "reverses_dividend_and_divisor",
    ],
    difficulty: 2,
  },
  {
    competencyId: "competency-gh-math-b4-mental-multiplication-001",
    title: "Apply Mental Multiplication Strategies",
    description:
      "Use doubling, halving, place-value adjustment and the distributive property to multiply mentally.",
    strandCode: "B4.1",
    subStrandCode: "B4.1.2",
    contentStandardCode: "B4.1.2.2",
    indicatorMappings: [
      { code: "B4.1.2.2.2", relationship: "direct" },
    ],
    prerequisiteCompetencyIds: [
      "competency-gh-math-b4-multiplication-facts-001",
    ],
    relatedCompetencyIds: [
      "competency-gh-math-b4-fact-families-001",
    ],
    subskills: [
      "double_and_halve",
      "multiply_by_place_value_adjustment",
      "use_distributive_property",
    ],
    misconceptions: [
      "adds_zero_without_place_value_reasoning",
      "halves_only_one_factor_without_compensation",
    ],
    difficulty: 2,
  },
  {
    competencyId: "competency-gh-math-b4-multidigit-multiplication-001",
    title: "Multiply Multi-Digit Numbers",
    description:
      "Multiply multi-digit whole numbers efficiently using place value and appropriate written or mental strategies.",
    strandCode: "B4.1",
    subStrandCode: "B4.1.2",
    contentStandardCode: "B4.1.2.3",
    indicatorMappings: [
      { code: "B4.1.2.3.1", relationship: "direct" },
    ],
    prerequisiteCompetencyIds: [
      "competency-gh-math-b4-multiplication-facts-001",
      "competency-gh-math-b4-mental-multiplication-001",
    ],
    relatedCompetencyIds: [],
    subskills: [
      "decompose_multidigit_factor",
      "calculate_partial_products",
      "combine_partial_products",
    ],
    misconceptions: [
      "ignores_place_value_in_partial_products",
      "multiplies_digits_without_regrouping_correctly",
    ],
    difficulty: 3,
  },
  {
    competencyId: "competency-gh-math-b4-multidigit-division-001",
    title: "Divide Multi-Digit Numbers",
    description:
      "Divide two-digit whole numbers by one-digit divisors efficiently using known facts and place value.",
    strandCode: "B4.1",
    subStrandCode: "B4.1.2",
    contentStandardCode: "B4.1.2.5",
    indicatorMappings: [
      { code: "B4.1.2.5.1", relationship: "direct" },
    ],
    prerequisiteCompetencyIds: [
      "competency-gh-math-b4-fact-families-001",
    ],
    relatedCompetencyIds: [],
    subskills: [
      "decompose_dividend",
      "use_known_division_facts",
      "combine_partial_quotients",
    ],
    misconceptions: [
      "divides_each_digit_independently",
      "ignores_remainder_or_leftover_quantity",
    ],
    difficulty: 3,
  },
  {
    competencyId: "competency-gh-math-b4-four-operation-problems-001",
    title: "Solve Multi-Step Four-Operation Problems",
    description:
      "Select and apply the four basic operations to solve multi-step whole-number problems and explain the reasoning.",
    strandCode: "B4.1",
    subStrandCode: "B4.1.2",
    contentStandardCode: "B4.1.2.6",
    indicatorMappings: [
      { code: "B4.1.2.6.1", relationship: "direct" },
    ],
    prerequisiteCompetencyIds: [
      "competency-gh-math-b4-multidigit-multiplication-001",
      "competency-gh-math-b4-multidigit-division-001",
    ],
    relatedCompetencyIds: [],
    subskills: [
      "identify_required_operations",
      "sequence_problem_steps",
      "calculate_multistep_solution",
      "check_solution_against_context",
    ],
    misconceptions: [
      "uses_numbers_in_given_order_without_interpreting_problem",
      "stops_after_first_operation",
    ],
    difficulty: 3,
  },  {
    competencyId: "competency-gh-math-b4-unit-fractions-001",
    title: "Generate and Locate Unit Fractions",
    description:
      "Generate unit fractions and locate them accurately on a number line.",
    strandCode: "B4.1",
    subStrandCode: "B4.1.3",
    contentStandardCode: "B4.1.3.1",
    indicatorMappings: [
      { code: "B4.1.3.1.1", relationship: "direct" },
    ],
    prerequisiteCompetencyIds: [],
    relatedCompetencyIds: [
      "competency-gh-math-b4-equivalent-fractions-001",
    ],
    subskills: [
      "identify_unit_fraction",
      "partition_whole_into_equal_parts",
      "locate_unit_fraction_on_number_line",
    ],
    misconceptions: [
      "treats_unequal_parts_as_fractions",
      "places_fraction_using_numerator_only",
    ],
    difficulty: 1,
  },
  {
    competencyId: "competency-gh-math-b4-equivalent-fractions-001",
    title: "Recognise Equivalent Fractions",
    description:
      "Recognise and name equivalent fractions using pictorial representations.",
    strandCode: "B4.1",
    subStrandCode: "B4.1.3",
    contentStandardCode: "B4.1.3.1",
    indicatorMappings: [
      { code: "B4.1.3.1.2", relationship: "direct" },
    ],
    prerequisiteCompetencyIds: [
      "competency-gh-math-b4-unit-fractions-001",
    ],
    relatedCompetencyIds: [
      "competency-gh-math-b4-simplest-fractions-001",
    ],
    subskills: [
      "compare_fraction_models",
      "identify_same_fractional_quantity",
      "name_equivalent_fractions",
    ],
    misconceptions: [
      "assumes_different_numerators_mean_different_values",
      "compares_fraction_symbols_without_considering_whole",
    ],
    difficulty: 2,
  },
  {
    competencyId: "competency-gh-math-b4-simplest-fractions-001",
    title: "Express Fractions in Simplest Form",
    description:
      "Find the simplest form of fractions by dividing the numerator and denominator by their highest common factor.",
    strandCode: "B4.1",
    subStrandCode: "B4.1.3",
    contentStandardCode: "B4.1.3.1",
    indicatorMappings: [
      { code: "B4.1.3.1.3", relationship: "direct" },
    ],
    prerequisiteCompetencyIds: [
      "competency-gh-math-b4-equivalent-fractions-001",
      "competency-gh-math-b4-hcf-lcm-001",
    ],
    relatedCompetencyIds: [],
    subskills: [
      "find_common_factors",
      "identify_highest_common_factor",
      "divide_numerator_and_denominator_equally",
    ],
    misconceptions: [
      "divides_only_numerator_or_denominator",
      "stops_before_fraction_is_in_simplest_form",
    ],
    difficulty: 2,
  },
  {
    competencyId: "competency-gh-math-b4-fractions-greater-than-one-001",
    title: "Represent Fractions Greater Than One",
    description:
      "Recognise, draw, label and symbolically represent fractions greater than one.",
    strandCode: "B4.1",
    subStrandCode: "B4.1.3",
    contentStandardCode: "B4.1.3.1",
    indicatorMappings: [
      { code: "B4.1.3.1.4", relationship: "direct" },
    ],
    prerequisiteCompetencyIds: [
      "competency-gh-math-b4-unit-fractions-001",
    ],
    relatedCompetencyIds: [],
    subskills: [
      "identify_fraction_greater_than_one",
      "represent_improper_fraction_pictorially",
      "match_fraction_model_to_symbol",
    ],
    misconceptions: [
      "believes_fraction_cannot_exceed_one",
      "confuses_number_of_wholes_with_denominator",
    ],
    difficulty: 2,
  },
  {
    competencyId: "competency-gh-math-b4-compare-like-fractions-001",
    title: "Compare and Order Like Fractions",
    description:
      "Compare and order fractions with like denominators using pictorial representations.",
    strandCode: "B4.1",
    subStrandCode: "B4.1.3",
    contentStandardCode: "B4.1.3.2",
    indicatorMappings: [
      { code: "B4.1.3.2.1", relationship: "direct" },
    ],
    prerequisiteCompetencyIds: [
      "competency-gh-math-b4-unit-fractions-001",
    ],
    relatedCompetencyIds: [],
    subskills: [
      "compare_like_denominator_models",
      "compare_numerators_for_like_denominators",
      "order_like_fractions",
    ],
    misconceptions: [
      "treats_larger_numerator_as_smaller_fraction",
      "changes_denominator_when_ordering_like_fractions",
    ],
    difficulty: 2,
  },
  {
    competencyId: "competency-gh-math-b4-fraction-contexts-001",
    title: "Recognise Fractions in Everyday Contexts",
    description:
      "Identify and provide examples of situations in which fractions are used.",
    strandCode: "B4.1",
    subStrandCode: "B4.1.3",
    contentStandardCode: "B4.1.3.2",
    indicatorMappings: [
      { code: "B4.1.3.2.3", relationship: "direct" },
    ],
    prerequisiteCompetencyIds: [
      "competency-gh-math-b4-unit-fractions-001",
    ],
    relatedCompetencyIds: [],
    subskills: [
      "identify_fraction_in_context",
      "describe_fractional_quantity",
      "generate_real_world_fraction_example",
    ],
    misconceptions: [
      "labels_any_divided_object_as_fraction_without_equal_parts",
      "cannot_connect_fraction_symbol_to_real_quantity",
    ],
    difficulty: 1,
  },  {
    competencyId: "competency-gh-math-b4-decimal-representation-001",
    title: "Represent Tenths and Hundredths",
    description:
      "Describe and represent decimals, tenths and hundredths concretely, pictorially and symbolically.",
    strandCode: "B4.1",
    subStrandCode: "B4.1.4",
    contentStandardCode: "B4.1.4.1",
    indicatorMappings: [
      { code: "B4.1.4.1.1", relationship: "direct" },
    ],
    prerequisiteCompetencyIds: [
      "competency-gh-math-b4-place-value-001",
      "competency-gh-math-b4-unit-fractions-001",
    ],
    relatedCompetencyIds: [
      "competency-gh-math-b4-decimal-rounding-001",
    ],
    subskills: [
      "identify_tenths_and_hundredths",
      "represent_decimal_with_model",
      "connect_decimal_model_to_symbol",
      "interpret_decimal_place_value",
    ],
    misconceptions: [
      "treats_decimal_digits_as_whole_numbers",
      "confuses_tenths_and_hundredths_place_values",
    ],
    difficulty: 2,
  },
  {
    competencyId: "competency-gh-math-b4-decimal-rounding-001",
    title: "Round Decimals to the Nearest Tenth",
    description:
      "Round decimals to the nearest tenth using place-value reasoning.",
    strandCode: "B4.1",
    subStrandCode: "B4.1.4",
    contentStandardCode: "B4.1.4.1",
    indicatorMappings: [
      { code: "B4.1.4.1.2", relationship: "direct" },
    ],
    prerequisiteCompetencyIds: [
      "competency-gh-math-b4-decimal-representation-001",
      "competency-gh-math-b4-rounding-001",
    ],
    relatedCompetencyIds: [],
    subskills: [
      "identify_tenths_place",
      "inspect_hundredths_digit",
      "round_decimal_to_nearest_tenth",
    ],
    misconceptions: [
      "rounds_using_tenths_digit_instead_of_hundredths",
      "changes_unrelated_decimal_places",
    ],
    difficulty: 2,
  },
  {
    competencyId: "competency-gh-math-b4-decimal-add-subtract-001",
    title: "Add and Subtract Decimals",
    description:
      "Use models to explain addition and subtraction of decimals up to hundredths.",
    strandCode: "B4.1",
    subStrandCode: "B4.1.4",
    contentStandardCode: "B4.1.4.1",
    indicatorMappings: [
      { code: "B4.1.4.1.3", relationship: "direct" },
    ],
    prerequisiteCompetencyIds: [
      "competency-gh-math-b4-decimal-representation-001",
    ],
    relatedCompetencyIds: [],
    subskills: [
      "model_decimal_addition",
      "model_decimal_subtraction",
      "align_decimal_place_values",
      "explain_decimal_operation_result",
    ],
    misconceptions: [
      "aligns_numbers_by_last_digit_instead_of_decimal_point",
      "treats_decimal_parts_as_separate_whole_numbers",
    ],
    difficulty: 3,
  },
  {
    competencyId: "competency-gh-math-b4-percent-hundredths-001",
    title: "Model Percent as Hundredths",
    description:
      "Model and recognise percent as a fraction related to hundredths using concrete, pictorial and number-line representations.",
    strandCode: "B4.1",
    subStrandCode: "B4.1.5",
    contentStandardCode: "B4.1.5.1",
    indicatorMappings: [
      { code: "B4.1.5.1.1", relationship: "direct" },
    ],
    prerequisiteCompetencyIds: [
      "competency-gh-math-b4-decimal-representation-001",
      "competency-gh-math-b4-equivalent-fractions-001",
    ],
    relatedCompetencyIds: [
      "competency-gh-math-b4-fraction-decimal-percent-order-001",
    ],
    subskills: [
      "interpret_percent_as_parts_per_hundred",
      "represent_percent_with_hundred_grid",
      "connect_percent_to_fraction",
      "locate_percent_on_number_line",
    ],
    misconceptions: [
      "treats_percent_as_unrelated_to_hundredths",
      "confuses_percent_symbol_with_decimal_point",
    ],
    difficulty: 2,
  },
  {
    competencyId: "competency-gh-math-b4-fraction-decimal-percent-order-001",
    title: "Compare Fractions, Decimals and Percents",
    description:
      "Compare and order a mixture of common fractions, decimal fractions and percent fractions up to hundredths.",
    strandCode: "B4.1",
    subStrandCode: "B4.1.5",
    contentStandardCode: "B4.1.5.1",
    indicatorMappings: [
      { code: "B4.1.5.1.2", relationship: "direct" },
    ],
    prerequisiteCompetencyIds: [
      "competency-gh-math-b4-percent-hundredths-001",
      "competency-gh-math-b4-decimal-representation-001",
      "competency-gh-math-b4-equivalent-fractions-001",
    ],
    relatedCompetencyIds: [],
    subskills: [
      "convert_between_fraction_decimal_percent_representations",
      "compare_equivalent_quantities",
      "order_mixed_fraction_forms",
    ],
    misconceptions: [
      "compares_symbols_without_converting_values",
      "assumes_percent_number_is_always_larger_than_decimal",
    ],
    difficulty: 3,
  },  {
    competencyId: "competency-gh-math-b4-pattern-describe-001",
    title: "Describe Patterns in Tables and Charts",
    description:
      "Describe patterns found in a given table or chart.",
    strandCode: "B4.2",
    subStrandCode: "B4.2.1",
    contentStandardCode: "B4.2.1.1",
    indicatorMappings: [
      { code: "B4.2.1.1.1", relationship: "direct" },
    ],
    prerequisiteCompetencyIds: [],
    relatedCompetencyIds: [],
    subskills: [
      "identify_pattern_rule",
      "describe_table_pattern",
      "describe_chart_pattern",
    ],
    misconceptions: [
      "focuses_on_single_values_instead_of_relationship",
      "describes_sequence_without_identifying_rule",
    ],
    difficulty: 2,
  },
  {
    competencyId: "competency-gh-math-b4-pattern-missing-elements-001",
    title: "Determine Missing Elements in Patterns",
    description:
      "Determine missing elements in a given table or chart.",
    strandCode: "B4.2",
    subStrandCode: "B4.2.1",
    contentStandardCode: "B4.2.1.1",
    indicatorMappings: [
      { code: "B4.2.1.1.2", relationship: "direct" },
    ],
    prerequisiteCompetencyIds: [
      "competency-gh-math-b4-pattern-describe-001",
    ],
    relatedCompetencyIds: [],
    subskills: [
      "infer_pattern_rule",
      "calculate_missing_pattern_value",
      "check_pattern_consistency",
    ],
    misconceptions: [
      "guesses_missing_value_without_using_pattern",
      "applies_rule_inconsistently",
    ],
    difficulty: 2,
  },
  {
    competencyId: "competency-gh-math-b4-pattern-error-detection-001",
    title: "Detect Errors in Patterns",
    description:
      "Identify and explain errors in numerical patterns represented in tables or charts.",
    strandCode: "B4.2",
    subStrandCode: "B4.2.1",
    contentStandardCode: "B4.2.1.1",
    indicatorMappings: [
      { code: "B4.2.1.1.3", relationship: "direct" },
    ],
    prerequisiteCompetencyIds: [
      "competency-gh-math-b4-pattern-describe-001",
      "competency-gh-math-b4-pattern-missing-elements-001",
    ],
    relatedCompetencyIds: [],
    subskills: [
      "check_pattern_consistency",
      "locate_pattern_error",
      "explain_correct_pattern_rule",
    ],
    misconceptions: [
      "accepts_pattern_without_checking_rule",
      "corrects_value_without_explaining_error",
    ],
    difficulty: 2,
  },
  {
    competencyId: "competency-gh-math-b4-pattern-table-to-concrete-001",
    title: "Represent Table and Chart Patterns Concretely",
    description:
      "Create a concrete representation of a pattern displayed in a table or chart.",
    strandCode: "B4.2",
    subStrandCode: "B4.2.1",
    contentStandardCode: "B4.2.1.2",
    indicatorMappings: [
      { code: "B4.2.1.2.1", relationship: "direct" },
    ],
    prerequisiteCompetencyIds: [
      "competency-gh-math-b4-pattern-describe-001",
    ],
    relatedCompetencyIds: [
      "competency-gh-math-b4-pattern-concrete-to-table-001",
    ],
    subskills: [
      "interpret_table_pattern",
      "select_concrete_representation",
      "construct_pattern_model",
    ],
    misconceptions: [
      "copies_values_without_preserving_relationship",
      "creates_model_that_does_not_match_pattern",
    ],
    difficulty: 2,
  },
  {
    competencyId: "competency-gh-math-b4-pattern-concrete-to-table-001",
    title: "Represent Concrete Patterns in Tables and Charts",
    description:
      "Create a table or chart from a given concrete representation of a pattern.",
    strandCode: "B4.2",
    subStrandCode: "B4.2.1",
    contentStandardCode: "B4.2.1.2",
    indicatorMappings: [
      { code: "B4.2.1.2.2", relationship: "direct" },
    ],
    prerequisiteCompetencyIds: [
      "competency-gh-math-b4-pattern-table-to-concrete-001",
    ],
    relatedCompetencyIds: [],
    subskills: [
      "read_concrete_pattern",
      "organise_pattern_values",
      "construct_table_or_chart",
    ],
    misconceptions: [
      "records_objects_without_preserving_order",
      "creates_table_columns_that_do_not_match_relationship",
    ],
    difficulty: 2,
  },
  {
    competencyId: "competency-gh-math-b4-pattern-problem-to-table-001",
    title: "Translate Problems into Tables and Charts",
    description:
      "Translate information in a given problem into a table or chart.",
    strandCode: "B4.2",
    subStrandCode: "B4.2.1",
    contentStandardCode: "B4.2.1.3",
    indicatorMappings: [
      { code: "B4.2.1.3.1", relationship: "direct" },
    ],
    prerequisiteCompetencyIds: [
      "competency-gh-math-b4-pattern-describe-001",
    ],
    relatedCompetencyIds: [],
    subskills: [
      "extract_problem_values",
      "identify_relationship",
      "organise_information_in_table_or_chart",
    ],
    misconceptions: [
      "includes_irrelevant_problem_information",
      "places_values_in_wrong_table_categories",
    ],
    difficulty: 2,
  },
  {
    competencyId: "competency-gh-math-b4-pattern-extension-problem-001",
    title: "Extend Patterns to Solve Problems",
    description:
      "Identify and extend patterns in a table or chart to solve a given problem.",
    strandCode: "B4.2",
    subStrandCode: "B4.2.1",
    contentStandardCode: "B4.2.1.3",
    indicatorMappings: [
      { code: "B4.2.1.3.2", relationship: "direct" },
    ],
    prerequisiteCompetencyIds: [
      "competency-gh-math-b4-pattern-problem-to-table-001",
      "competency-gh-math-b4-pattern-describe-001",
    ],
    relatedCompetencyIds: [],
    subskills: [
      "identify_extension_rule",
      "extend_table_or_chart_pattern",
      "use_extended_pattern_to_answer_problem",
    ],
    misconceptions: [
      "extends_pattern_using_last_difference_only_when_rule_differs",
      "extends_pattern_but_does_not_use_result_to_solve_problem",
    ],
    difficulty: 3,
  },
  {
    competencyId: "competency-gh-math-b4-equation-from-problem-001",
    title: "Write Equations from Problems",
    description:
      "Write a given problem as an equation using a symbol to represent an unknown number.",
    strandCode: "B4.2",
    subStrandCode: "B4.2.2",
    contentStandardCode: "B4.2.2.1",
    indicatorMappings: [
      { code: "B4.2.2.1.1", relationship: "direct" },
    ],
    prerequisiteCompetencyIds: [
      "competency-gh-math-b4-four-operation-problems-001",
    ],
    relatedCompetencyIds: [],
    subskills: [
      "identify_unknown_quantity",
      "identify_operation_relationship",
      "write_symbolic_equation",
    ],
    misconceptions: [
      "uses_symbol_for_known_quantity",
      "writes_numbers_in_problem_order_without_preserving_relationship",
    ],
    difficulty: 2,
  },
  {
    competencyId: "competency-gh-math-b4-equation-symbolic-representation-001",
    title: "Translate Models into Symbolic Equations",
    description:
      "Express a pictorial or concrete representation of an equation in symbolic form.",
    strandCode: "B4.2",
    subStrandCode: "B4.2.2",
    contentStandardCode: "B4.2.2.1",
    indicatorMappings: [
      { code: "B4.2.2.1.2", relationship: "direct" },
    ],
    prerequisiteCompetencyIds: [
      "competency-gh-math-b4-equation-from-problem-001",
    ],
    relatedCompetencyIds: [],
    subskills: [
      "interpret_equation_model",
      "identify_unknown_in_model",
      "write_symbolic_equation_from_model",
    ],
    misconceptions: [
      "treats_model_objects_as_unrelated_values",
      "misplaces_unknown_symbol_in_equation",
    ],
    difficulty: 2,
  },
  {
    competencyId: "competency-gh-math-b4-equation-manipulatives-001",
    title: "Solve One-Step Equations with Manipulatives",
    description:
      "Solve a given one-step equation using manipulatives.",
    strandCode: "B4.2",
    subStrandCode: "B4.2.2",
    contentStandardCode: "B4.2.2.2",
    indicatorMappings: [
      { code: "B4.2.2.2.1", relationship: "direct" },
    ],
    prerequisiteCompetencyIds: [
      "competency-gh-math-b4-equation-symbolic-representation-001",
    ],
    relatedCompetencyIds: [],
    subskills: [
      "model_equation_with_manipulatives",
      "maintain_equation_balance",
      "determine_unknown_value",
    ],
    misconceptions: [
      "changes_only_one_side_of_equation",
      "treats_equals_sign_as_instruction_to_calculate",
    ],
    difficulty: 2,
  },
  {
    competencyId: "competency-gh-math-b4-equation-meaning-001",
    title: "Explain the Meaning of One-Step Equations",
    description:
      "Describe orally the meaning of a given one-step equation with one unknown.",
    strandCode: "B4.2",
    subStrandCode: "B4.2.2",
    contentStandardCode: "B4.2.2.2",
    indicatorMappings: [
      { code: "B4.2.2.2.2", relationship: "direct" },
    ],
    prerequisiteCompetencyIds: [
      "competency-gh-math-b4-equation-from-problem-001",
    ],
    relatedCompetencyIds: [],
    subskills: [
      "interpret_equation_structure",
      "identify_known_and_unknown_values",
      "explain_equality_relationship",
    ],
    misconceptions: [
      "reads_equals_sign_as_then",
      "cannot_explain_role_of_unknown_symbol",
    ],
    difficulty: 2,
  },
  {
    competencyId: "competency-gh-math-b4-equation-unknown-position-001",
    title: "Solve Equations with Unknowns on Either Side",
    description:
      "Solve a given equation when the unknown is on the left or right side of the equation.",
    strandCode: "B4.2",
    subStrandCode: "B4.2.2",
    contentStandardCode: "B4.2.2.2",
    indicatorMappings: [
      { code: "B4.2.2.2.3", relationship: "direct" },
    ],
    prerequisiteCompetencyIds: [
      "competency-gh-math-b4-equation-manipulatives-001",
      "competency-gh-math-b4-equation-meaning-001",
    ],
    relatedCompetencyIds: [],
    subskills: [
      "identify_unknown_position",
      "preserve_equality",
      "solve_equation_with_reversed_layout",
    ],
    misconceptions: [
      "believes_unknown_must_appear_on_left",
      "changes_solution_method_based_only_on_equation_layout",
    ],
    difficulty: 2,
  },
  {
    competencyId: "competency-gh-math-b4-equation-guess-check-001",
    title: "Solve Equations Using Guess and Check",
    description:
      "Solve a given one-step equation using guess and check.",
    strandCode: "B4.2",
    subStrandCode: "B4.2.2",
    contentStandardCode: "B4.2.2.2",
    indicatorMappings: [
      { code: "B4.2.2.2.4", relationship: "direct" },
    ],
    prerequisiteCompetencyIds: [
      "competency-gh-math-b4-equation-meaning-001",
    ],
    relatedCompetencyIds: [],
    subskills: [
      "select_trial_value",
      "substitute_trial_value",
      "compare_result_with_equation",
      "refine_guess",
    ],
    misconceptions: [
      "guesses_without_checking",
      "stops_after_first_unsuccessful_guess",
    ],
    difficulty: 2,
  },
  {
    competencyId: "competency-gh-math-b4-equation-problem-solving-001",
    title: "Represent and Solve Problems with Unknowns",
    description:
      "Identify the unknown in a problem, represent the problem with an equation, and solve it concretely, pictorially or symbolically.",
    strandCode: "B4.2",
    subStrandCode: "B4.2.2",
    contentStandardCode: "B4.2.2.2",
    indicatorMappings: [
      { code: "B4.2.2.2.5", relationship: "direct" },
    ],
    prerequisiteCompetencyIds: [
      "competency-gh-math-b4-equation-from-problem-001",
      "competency-gh-math-b4-equation-manipulatives-001",
    ],
    relatedCompetencyIds: [],
    subskills: [
      "identify_unknown_in_context",
      "represent_problem_as_equation",
      "choose_solution_representation",
      "solve_and_check_unknown",
    ],
    misconceptions: [
      "solves_arithmetic_without_representing_unknown",
      "writes_equation_that_does_not_match_problem_context",
    ],
    difficulty: 3,
  },
  {
    competencyId: "competency-gh-math-b4-part-part-whole-equations-001",
    title: "Solve Part-Part-Whole and Comparison Problems",
    description:
      "Represent and solve addition or subtraction problems involving part-part-whole or comparison contexts using a symbol for the unknown.",
    strandCode: "B4.2",
    subStrandCode: "B4.2.2",
    contentStandardCode: "B4.2.2.2",
    indicatorMappings: [
      { code: "B4.2.2.2.6", relationship: "direct" },
    ],
    prerequisiteCompetencyIds: [
      "competency-gh-math-b4-equation-problem-solving-001",
    ],
    relatedCompetencyIds: [],
    subskills: [
      "identify_part_part_whole_structure",
      "identify_comparison_structure",
      "represent_unknown_with_symbol",
      "solve_context_equation",
    ],
    misconceptions: [
      "assumes_all_word_problems_require_addition",
      "confuses_difference_with_total",
    ],
    difficulty: 3,
  },
  {
    competencyId: "competency-gh-math-b4-create-equation-problem-001",
    title: "Create Problems from Equations",
    description:
      "Create a problem for a given equation with one unknown.",
    strandCode: "B4.2",
    subStrandCode: "B4.2.2",
    contentStandardCode: "B4.2.2.2",
    indicatorMappings: [
      { code: "B4.2.2.2.7", relationship: "direct" },
    ],
    prerequisiteCompetencyIds: [
      "competency-gh-math-b4-equation-problem-solving-001",
    ],
    relatedCompetencyIds: [],
    subskills: [
      "interpret_given_equation",
      "assign_context_to_known_values",
      "assign_context_to_unknown",
      "write_matching_word_problem",
    ],
    misconceptions: [
      "creates_story_that_uses_numbers_but_not_equation_relationship",
      "changes_operation_when_creating_problem",
    ],
    difficulty: 3,
  },  {
    competencyId: "competency-gh-math-b4-symmetrical-shape-completion-001",
    title: "Complete Symmetrical Shapes",
    description:
      "Complete drawings of shapes to make them symmetrical.",
    strandCode: "B4.3",
    subStrandCode: "B4.3.1",
    contentStandardCode: "B4.3.1.1",
    indicatorMappings: [
      { code: "B4.3.1.1.1", relationship: "direct" },
    ],
    prerequisiteCompetencyIds: [],
    relatedCompetencyIds: [
      "competency-gh-math-b4-lines-of-symmetry-001",
    ],
    subskills: [
      "identify_axis_of_symmetry",
      "match_corresponding_points",
      "complete_reflected_shape",
    ],
    misconceptions: [
      "copies_shape_without_reflecting",
      "changes_distance_from_symmetry_line",
    ],
    difficulty: 2,
  },
  {
    competencyId: "competency-gh-math-b4-lines-of-symmetry-001",
    title: "Identify Lines of Symmetry",
    description:
      "Identify lines of symmetry of regular and irregular 2D shapes, including triangles and quadrilaterals.",
    strandCode: "B4.3",
    subStrandCode: "B4.3.1",
    contentStandardCode: "B4.3.1.1",
    indicatorMappings: [
      { code: "B4.3.1.1.2", relationship: "direct" },
    ],
    prerequisiteCompetencyIds: [
      "competency-gh-math-b4-symmetrical-shape-completion-001",
    ],
    relatedCompetencyIds: [],
    subskills: [
      "test_shape_for_symmetry",
      "identify_symmetry_line",
      "compare_regular_and_irregular_shapes",
    ],
    misconceptions: [
      "assumes_every_shape_has_one_line_of_symmetry",
      "confuses_diagonal_with_symmetry_line",
    ],
    difficulty: 2,
  },
  {
    competencyId: "competency-gh-math-b4-cardinal-position-motion-001",
    title: "Describe Position and Motion Using Cardinal Points",
    description:
      "Tell the position and motion of objects in space using the cardinal points.",
    strandCode: "B4.3",
    subStrandCode: "B4.3.2",
    contentStandardCode: "B4.3.2.1",
    indicatorMappings: [
      { code: "B4.3.2.1.1", relationship: "direct" },
    ],
    prerequisiteCompetencyIds: [],
    relatedCompetencyIds: [],
    subskills: [
      "identify_cardinal_points",
      "describe_relative_position",
      "describe_direction_of_motion",
    ],
    misconceptions: [
      "confuses_east_and_west",
      "describes_position_without_reference_direction",
    ],
    difficulty: 2,
  },
  {
    competencyId: "competency-gh-math-b4-perimeter-estimation-001",
    title: "Estimate Perimeter",
    description:
      "Estimate perimeter using referents for centimetres or metres.",
    strandCode: "B4.3",
    subStrandCode: "B4.3.3",
    contentStandardCode: "B4.3.3.1",
    indicatorMappings: [
      { code: "B4.3.3.1.1", relationship: "direct" },
    ],
    prerequisiteCompetencyIds: [],
    relatedCompetencyIds: [
      "competency-gh-math-b4-perimeter-measurement-001",
    ],
    subskills: [
      "select_length_referent",
      "estimate_side_lengths",
      "estimate_total_perimeter",
    ],
    misconceptions: [
      "estimates_area_instead_of_boundary_length",
      "uses_inappropriate_measurement_unit",
    ],
    difficulty: 2,
  },
  {
    competencyId: "competency-gh-math-b4-perimeter-measurement-001",
    title: "Measure Perimeter",
    description:
      "Measure and record perimeter of regular and irregular shapes in centimetres and metres.",
    strandCode: "B4.3",
    subStrandCode: "B4.3.3",
    contentStandardCode: "B4.3.3.1",
    indicatorMappings: [
      { code: "B4.3.3.1.2", relationship: "direct" },
    ],
    prerequisiteCompetencyIds: [
      "competency-gh-math-b4-perimeter-estimation-001",
    ],
    relatedCompetencyIds: [],
    subskills: [
      "measure_side_lengths",
      "add_boundary_lengths",
      "record_perimeter_with_unit",
    ],
    misconceptions: [
      "omits_a_side_when_measuring_perimeter",
      "records_perimeter_without_unit",
    ],
    difficulty: 2,
  },
  {
    competencyId: "competency-gh-math-b4-perimeter-formula-001",
    title: "Use Perimeter Formulae",
    description:
      "Develop and apply a formula for determining the perimeter of a square and rectangle.",
    strandCode: "B4.3",
    subStrandCode: "B4.3.3",
    contentStandardCode: "B4.3.3.1",
    indicatorMappings: [
      { code: "B4.3.3.1.3", relationship: "direct" },
    ],
    prerequisiteCompetencyIds: [
      "competency-gh-math-b4-perimeter-measurement-001",
    ],
    relatedCompetencyIds: [],
    subskills: [
      "derive_square_perimeter_rule",
      "derive_rectangle_perimeter_rule",
      "apply_perimeter_formula",
    ],
    misconceptions: [
      "multiplies_length_by_width_for_perimeter",
      "counts_only_two_sides_of_rectangle",
    ],
    difficulty: 2,
  },
  {
    competencyId: "competency-gh-math-b4-fixed-perimeter-rectangles-001",
    title: "Construct Rectangles with a Given Perimeter",
    description:
      "Construct different rectangles for a given perimeter and recognise that many shapes can have the same perimeter.",
    strandCode: "B4.3",
    subStrandCode: "B4.3.3",
    contentStandardCode: "B4.3.3.1",
    indicatorMappings: [
      { code: "B4.3.3.1.4", relationship: "direct" },
    ],
    prerequisiteCompetencyIds: [
      "competency-gh-math-b4-perimeter-formula-001",
    ],
    relatedCompetencyIds: [],
    subskills: [
      "find_side_pairs_for_perimeter",
      "construct_valid_rectangles",
      "compare_rectangles_with_same_perimeter",
    ],
    misconceptions: [
      "assumes_same_perimeter_requires_same_shape",
      "confuses_perimeter_with_area",
    ],
    difficulty: 3,
  },
  {
    competencyId: "competency-gh-math-b4-area-square-units-001",
    title: "Recognise Square Units of Area",
    description:
      "Recognise that area is measured in square units.",
    strandCode: "B4.3",
    subStrandCode: "B4.3.3",
    contentStandardCode: "B4.3.3.2",
    indicatorMappings: [
      { code: "B4.3.3.2.1", relationship: "direct" },
    ],
    prerequisiteCompetencyIds: [],
    relatedCompetencyIds: [],
    subskills: [
      "distinguish_area_from_length",
      "identify_square_units",
      "count_square_units_covering_region",
    ],
    misconceptions: [
      "uses_linear_units_for_area",
      "counts_boundary_units_instead_of_surface_units",
    ],
    difficulty: 1,
  },
  {
    competencyId: "competency-gh-math-b4-area-referents-001",
    title: "Select Area Referents",
    description:
      "Select and justify referents for square centimetres or square metres.",
    strandCode: "B4.3",
    subStrandCode: "B4.3.3",
    contentStandardCode: "B4.3.3.2",
    indicatorMappings: [
      { code: "B4.3.3.2.2", relationship: "direct" },
    ],
    prerequisiteCompetencyIds: [
      "competency-gh-math-b4-area-square-units-001",
    ],
    relatedCompetencyIds: [],
    subskills: [
      "identify_square_centimetre_referent",
      "identify_square_metre_referent",
      "justify_area_unit_choice",
    ],
    misconceptions: [
      "selects_linear_referent_for_area",
      "uses_square_metre_for_very_small_surface_without_reason",
    ],
    difficulty: 2,
  },
  {
    competencyId: "competency-gh-math-b4-area-estimation-001",
    title: "Estimate Area",
    description:
      "Estimate area using referents for square centimetres or square metres.",
    strandCode: "B4.3",
    subStrandCode: "B4.3.3",
    contentStandardCode: "B4.3.3.2",
    indicatorMappings: [
      { code: "B4.3.3.2.3", relationship: "direct" },
    ],
    prerequisiteCompetencyIds: [
      "competency-gh-math-b4-area-referents-001",
    ],
    relatedCompetencyIds: [],
    subskills: [
      "choose_area_referent",
      "estimate_number_of_square_units",
      "state_estimated_area",
    ],
    misconceptions: [
      "estimates_perimeter_instead_of_area",
      "ignores_square_unit_size",
    ],
    difficulty: 2,
  },
  {
    competencyId: "competency-gh-math-b4-area-formula-001",
    title: "Use Area Formulae",
    description:
      "Develop and apply a formula for determining the area of a rectangle and square.",
    strandCode: "B4.3",
    subStrandCode: "B4.3.3",
    contentStandardCode: "B4.3.3.2",
    indicatorMappings: [
      { code: "B4.3.3.2.4", relationship: "direct" },
    ],
    prerequisiteCompetencyIds: [
      "competency-gh-math-b4-area-square-units-001",
      "competency-gh-math-b4-multiplication-facts-001",
    ],
    relatedCompetencyIds: [],
    subskills: [
      "derive_rectangle_area_rule",
      "derive_square_area_rule",
      "apply_area_formula",
    ],
    misconceptions: [
      "adds_length_and_width_for_area",
      "uses_perimeter_formula_for_area",
    ],
    difficulty: 2,
  },
  {
    competencyId: "competency-gh-math-b4-fixed-area-rectangles-001",
    title: "Construct Rectangles with a Given Area",
    description:
      "Construct different rectangles for a given area and recognise that different rectangles may have the same area.",
    strandCode: "B4.3",
    subStrandCode: "B4.3.3",
    contentStandardCode: "B4.3.3.2",
    indicatorMappings: [
      { code: "B4.3.3.2.5", relationship: "direct" },
    ],
    prerequisiteCompetencyIds: [
      "competency-gh-math-b4-area-formula-001",
    ],
    relatedCompetencyIds: [
      "competency-gh-math-b4-fixed-perimeter-rectangles-001",
    ],
    subskills: [
      "find_factor_pairs_for_area",
      "construct_rectangles_with_equal_area",
      "compare_shapes_with_same_area",
    ],
    misconceptions: [
      "assumes_same_area_requires_same_dimensions",
      "confuses_equal_area_with_equal_perimeter",
    ],
    difficulty: 3,
  },
  {
    competencyId: "competency-gh-math-b4-time-reading-001",
    title: "Read Analogue, Digital and 24-Hour Time",
    description:
      "Tell time in hours and minutes on analogue and digital watches, including 24-hour clocks.",
    strandCode: "B4.3",
    subStrandCode: "B4.3.3",
    contentStandardCode: "B4.3.3.3",
    indicatorMappings: [
      { code: "B4.3.3.3.1", relationship: "direct" },
    ],
    prerequisiteCompetencyIds: [],
    relatedCompetencyIds: [],
    subskills: [
      "read_analogue_time",
      "read_digital_time",
      "interpret_24_hour_time",
      "convert_between_time_formats",
    ],
    misconceptions: [
      "confuses_hour_and_minute_hands",
      "interprets_24_hour_time_as_12_hour_time_without_conversion",
    ],
    difficulty: 2,
  },
  {
    competencyId: "competency-gh-math-b4-event-duration-001",
    title: "Measure Event Duration",
    description:
      "Use a clock to measure the time taken to complete simple events in minutes and seconds.",
    strandCode: "B4.3",
    subStrandCode: "B4.3.3",
    contentStandardCode: "B4.3.3.3",
    indicatorMappings: [
      { code: "B4.3.3.3.2", relationship: "direct" },
    ],
    prerequisiteCompetencyIds: [
      "competency-gh-math-b4-time-reading-001",
    ],
    relatedCompetencyIds: [],
    subskills: [
      "record_start_time",
      "record_end_time",
      "calculate_elapsed_time",
      "state_duration_with_unit",
    ],
    misconceptions: [
      "subtracts_clock_digits_without_accounting_for_minutes",
      "confuses_elapsed_time_with_end_time",
    ],
    difficulty: 2,
  },
  {
    competencyId: "competency-gh-math-b4-calendar-dates-001",
    title: "Record Calendar Dates",
    description:
      "State dates of events and record calendar dates in a variety of formats.",
    strandCode: "B4.3",
    subStrandCode: "B4.3.3",
    contentStandardCode: "B4.3.3.3",
    indicatorMappings: [
      { code: "B4.3.3.3.3", relationship: "direct" },
    ],
    prerequisiteCompetencyIds: [],
    relatedCompetencyIds: [],
    subskills: [
      "identify_calendar_date",
      "associate_event_with_date",
      "write_date_in_multiple_formats",
    ],
    misconceptions: [
      "reverses_day_and_month_across_formats",
      "confuses_date_with_day_of_week",
    ],
    difficulty: 1,
  },  {
    competencyId: "competency-gh-math-b4-graph-one-to-one-001",
    title: "Read and Interpret One-to-One Graphs",
    description:
      "Use one-to-one correspondence to read and interpret graphs.",
    strandCode: "B4.4",
    subStrandCode: "B4.4.1",
    contentStandardCode: "B4.4.1.1",
    indicatorMappings: [
      { code: "B4.4.1.1.1", relationship: "direct" },
    ],
    prerequisiteCompetencyIds: [],
    relatedCompetencyIds: [],
    subskills: [
      "identify_graph_categories",
      "match_symbol_to_single_unit",
      "read_graph_values",
      "interpret_graph_information",
    ],
    misconceptions: [
      "counts_symbols_without_linking_to_category",
      "misreads_graph_scale",
    ],
    difficulty: 1,
  },
  {
    competencyId: "competency-gh-math-b4-graph-many-to-one-construct-001",
    title: "Construct Many-to-One Graphs",
    description:
      "Use many-to-one correspondence to display or construct graphs.",
    strandCode: "B4.4",
    subStrandCode: "B4.4.1",
    contentStandardCode: "B4.4.1.1",
    indicatorMappings: [
      { code: "B4.4.1.1.2", relationship: "direct" },
    ],
    prerequisiteCompetencyIds: [
      "competency-gh-math-b4-graph-one-to-one-001",
    ],
    relatedCompetencyIds: [],
    subskills: [
      "interpret_graph_key",
      "convert_data_to_scaled_symbols",
      "construct_many_to_one_graph",
      "label_graph_components",
    ],
    misconceptions: [
      "treats_each_symbol_as_one_when_key_shows_multiple",
      "uses_inconsistent_symbol_values",
    ],
    difficulty: 2,
  },
  {
    competencyId: "competency-gh-math-b4-graph-comparison-001",
    title: "Compare Different Graph Displays",
    description:
      "Compare graphs showing the same data and explain how they are the same and different.",
    strandCode: "B4.4",
    subStrandCode: "B4.4.1",
    contentStandardCode: "B4.4.1.1",
    indicatorMappings: [
      { code: "B4.4.1.1.3", relationship: "direct" },
    ],
    prerequisiteCompetencyIds: [
      "competency-gh-math-b4-graph-many-to-one-construct-001",
    ],
    relatedCompetencyIds: [],
    subskills: [
      "identify_same_data_across_graphs",
      "compare_graph_scales",
      "compare_graph_structure",
      "explain_display_differences",
    ],
    misconceptions: [
      "assumes_different_appearance_means_different_data",
      "ignores_graph_key_when_comparing",
    ],
    difficulty: 2,
  },
  {
    competencyId: "competency-gh-math-b4-graph-media-examples-001",
    title: "Identify Many-to-One Graphs in Media",
    description:
      "Find examples of graphs using many-to-one correspondence in print and electronic media and describe the correspondence used.",
    strandCode: "B4.4",
    subStrandCode: "B4.4.1",
    contentStandardCode: "B4.4.1.1",
    indicatorMappings: [
      { code: "B4.4.1.1.4", relationship: "direct" },
    ],
    prerequisiteCompetencyIds: [
      "competency-gh-math-b4-graph-many-to-one-construct-001",
    ],
    relatedCompetencyIds: [],
    subskills: [
      "identify_real_world_graph",
      "locate_graph_key_or_scale",
      "describe_many_to_one_correspondence",
    ],
    misconceptions: [
      "identifies_any_picture_as_pictograph",
      "ignores_correspondence_value_in_graph_key",
    ],
    difficulty: 2,
  },
  {
    competencyId: "competency-gh-math-b4-pictograph-bargraph-construction-001",
    title: "Construct Pictographs and Bar Graphs",
    description:
      "Identify common graph features and construct bar graphs or pictographs with title, labelled axes, key or legend.",
    strandCode: "B4.4",
    subStrandCode: "B4.4.1",
    contentStandardCode: "B4.4.1.2",
    indicatorMappings: [
      { code: "B4.4.1.2.1", relationship: "direct" },
    ],
    prerequisiteCompetencyIds: [
      "competency-gh-math-b4-graph-many-to-one-construct-001",
    ],
    relatedCompetencyIds: [],
    subskills: [
      "identify_required_graph_features",
      "select_graph_scale",
      "construct_bar_graph",
      "construct_pictograph",
      "add_title_axes_and_key",
    ],
    misconceptions: [
      "omits_key_for_scaled_graph",
      "uses_unequal_bar_intervals",
      "fails_to_label_axes",
    ],
    difficulty: 3,
  },
  {
    competencyId: "competency-gh-math-b4-many-to-one-graph-problems-001",
    title: "Solve Problems Using Many-to-One Graphs",
    description:
      "Use many-to-one correspondence to solve simple problems requiring interpretation of many-to-one bar graphs.",
    strandCode: "B4.4",
    subStrandCode: "B4.4.1",
    contentStandardCode: "B4.4.1.2",
    indicatorMappings: [
      { code: "B4.4.1.2.2", relationship: "direct" },
    ],
    prerequisiteCompetencyIds: [
      "competency-gh-math-b4-pictograph-bargraph-construction-001",
    ],
    relatedCompetencyIds: [],
    subskills: [
      "read_many_to_one_scale",
      "calculate_graph_quantity",
      "compare_graph_categories",
      "solve_graph_based_problem",
    ],
    misconceptions: [
      "counts_bars_or_symbols_without_applying_scale",
      "uses_wrong_category_value_in_solution",
    ],
    difficulty: 3,
  },];
for (const spec of GHANA_B4_MATHEMATICS_ADAPTIVE_SPECS) {
  if (!spec.evidence) {
    spec.evidence = GHANA_B4_MATHEMATICS_EVIDENCE[spec.competencyId];
  }

  if (!spec.evidence) {
    throw new Error(`Missing Mathematics evidence design: ${spec.competencyId}`);
  }
}

