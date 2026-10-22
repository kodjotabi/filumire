import type { GhanaB5ScienceAdaptiveSpec } from "./ghana-b5-science-adaptive";
import type { GhanaB5ComputingAdaptiveSpec } from "./ghana-b5-computing-adaptive";

// Additive source reconciliation. Existing prerequisite keys are never renumbered.
// These are authored specifications, not educator or translation approvals.
export const B5_COMPLETION_SCIENCE: GhanaB5ScienceAdaptiveSpec[] = [{
  code: "B5.2.2.1.2", competencyId: "competency-gh-science-b5-2-2-1-2",
  strandCode: "B5.2", subStrandCode: "B5.2.2", contentStandardCode: "B5.2.2.1",
  title: "Compare Bean and Maize Germination",
  statement: "Compare the differences in germination of bean and maize seeds",
  description: "Observe germination over several days and compare the position of seed leaves using dated observations.",
  subskills: ["record_germination_sequence", "compare_seed_leaf_position", "justify_comparison_from_observations"],
  misconceptions: ["confuses_root_with_shoot", "assumes_seed_leaves_are_always_above_soil", "ignores_relevant_observations", "assumes_identical_results_without_observation", "confuses_germination_with_mature_growth", "confuses_root_with_container", "assumes_identical_germination_timing"],
  difficulty: 2, prerequisiteCodes: [], relatedCodes: ["B5.2.2.1.1"],
}];

export const B5_COMPLETION_COMPUTING: GhanaB5ComputingAdaptiveSpec[] = [{
  code: "B5.1.3.1.9", competencyId: "competency-gh-computing-b5-1-3-1-9",
  strandCode: "B5.1", subStrandCode: "B5.1.3", contentStandardCode: "B5.1.3.1",
  title: "Make Tables and Diagrams from Data",
  statement: "Make simple tables and diagrams from the collected data.",
  description: "Organise collected data into an accurately labelled table and diagram; submit the actual work for review.",
  subskills: ["label_table_rows_and_columns", "preserve_collected_values", "represent_data_in_diagram"],
  misconceptions: ["changes_values_when_displaying_data", "omits_display_labels", "misreads_category_count_pair", "assumes_all_categories_equal"],
  difficulty: 2, prerequisiteCodes: [], relatedCodes: ["B5.1.3.1.8"],
}, {
  code: "B5.1.3.1.10", competencyId: "competency-gh-computing-b5-1-3-1-10",
  strandCode: "B5.1", subStrandCode: "B5.1.3", contentStandardCode: "B5.1.3.1",
  title: "Analyse Data and Explain Conclusions",
  statement: "Analyse tables, maps, diagrams, photographs and charts, and generalize the results and make suggestions (e.g. Finding sum or grand total).",
  description: "Read data displays, calculate simple sums, means and differences, and explain a suggestion supported by the data.",
  subskills: ["read_display_values", "calculate_sum_mean_difference", "justify_data_based_suggestion"],
  misconceptions: ["confuses_total_with_mean", "generalises_beyond_collected_data", "treats_largest_value_as_mean", "ignores_display_labels"],
  difficulty: 3, prerequisiteCodes: [], relatedCodes: ["B5.1.3.1.9"],
}, {
  // Six-part code is printed in the source. Do not normalise it to B5.6.9.1.2.
  code: "B5.6.4.9.1.2", competencyId: "competency-gh-computing-b5-6-4-9-1-2",
  strandCode: "B5.6", subStrandCode: "B5.6.9", contentStandardCode: "B5.6.4.9.1",
  title: "Protect Against Online Identity Theft",
  statement: "Discuss various techniques on online protection from online identity theft.",
  description: "Explain protective choices, including signing out after browsing on a shared device, using fictional accounts only.",
  subskills: ["explain_shared_device_sign_out", "protect_private_credentials", "justify_protective_choices"],
  misconceptions: ["thinks_closing_browser_always_signs_out", "shares_password_for_protection", "discloses_private_credentials"],
  difficulty: 2, prerequisiteCodes: [], relatedCodes: ["B5.6.9.1.1", "B5.6.10.1.2"],
}];

export const B5_COMPLETION_SPECS = [...B5_COMPLETION_SCIENCE, ...B5_COMPLETION_COMPUTING];
export const B5_COMPLETION_SOURCES = [
  { code: "B5.2.2.1.2", rawPrintedCode: "B5.2. 2.1.2", subject: "science", pdfPage: 44, printedPage: 22,
    sha256: "9fd09042246256c1248d6976c4ee82b8b02c910fec771bc797ec2b05320e3c7b" },
  { code: "B5.1.3.1.9", rawPrintedCode: "B5. 1.3.1.9", subject: "computing", pdfPage: 36, printedPage: 15,
    sha256: "d622739de46fdc138508aa82b56a196453581677cd653bcab5f4b3723eb1ecca" },
  { code: "B5.1.3.1.10", rawPrintedCode: "B5. 1.3.1.10", subject: "computing", pdfPage: 36, printedPage: 15,
    sha256: "d622739de46fdc138508aa82b56a196453581677cd653bcab5f4b3723eb1ecca" },
  { code: "B5.6.4.9.1.2", rawPrintedCode: "B5.6.4.9.1.2.", subject: "computing", pdfPage: 48, printedPage: 27,
    sha256: "d622739de46fdc138508aa82b56a196453581677cd653bcab5f4b3723eb1ecca" },
];
