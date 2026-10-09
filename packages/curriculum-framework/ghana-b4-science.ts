import type {
  CurriculumNode,
  FrameworkSubjectId,
} from "./index";

const NACCA_B4_SCIENCE_SOURCE =
  "NaCCA Science Curriculum for Primary Schools, Basic 4-6, 2019";

function id(code: string): string {
  return `node-gh-b4-science-${code.toLowerCase()}`;
}

function node(
  subjectId: FrameworkSubjectId,
  code: string,
  nodeType: CurriculumNode["nodeType"],
  title: string,
  order: number,
  parentNodeId?: string,
): CurriculumNode {
  return {
    id: id(code),
    subjectId,
    parentNodeId,
    nodeType,
    code,
    title,
    sourceReference: NACCA_B4_SCIENCE_SOURCE,
    order,
  };
}

export function getGhanaB4ScienceNodes(
  subjectId: FrameworkSubjectId,
): CurriculumNode[] {
  return [
    // STRAND 1: DIVERSITY OF MATTER
    node(subjectId, "B4.1", "strand", "Diversity of Matter", 1),

    node(
      subjectId,
      "B4.1.1",
      "sub_strand",
      "Living and Non-Living Things",
      1,
      id("B4.1"),
    ),
    node(
      subjectId,
      "B4.1.1.1",
      "content_standard",
      "Understand the physical features and life processes of living things and use this understanding to classify them",
      1,
      id("B4.1.1"),
    ),
    node(
      subjectId,
      "B4.1.1.1.1",
      "learning_indicator",
      "Classify animals into insects, birds, mammals and reptiles",
      1,
      id("B4.1.1.1"),
    ),
    node(
      subjectId,
      "B4.1.1.1.2",
      "learning_indicator",
      "Know life processes of animals (movement, nutrition and reproduction)",
      2,
      id("B4.1.1.1"),
    ),
    node(
      subjectId,
      "B4.1.1.2",
      "content_standard",
      "Understand the differences between living things and things which have never been alive",
      2,
      id("B4.1.1"),
    ),
    node(
      subjectId,
      "B4.1.1.2.2",
      "learning_indicator",
      "Describe the physical appearance of different types of plants (trees, shrubs, climbing, creeping)",
      2,
      id("B4.1.1.2"),
    ),
    node(
      subjectId,
      "B4.1.1.2.3",
      "learning_indicator",
      "Describe the physical features of mammals, reptiles, insects and amphibians",
      3,
      id("B4.1.1.2"),
    ),

    node(
      subjectId,
      "B4.1.2",
      "sub_strand",
      "Materials",
      2,
      id("B4.1"),
    ),
    node(
      subjectId,
      "B4.1.2.2",
      "content_standard",
      "Understand mixtures, their types, formation, uses and ways of separating them into their components",
      2,
      id("B4.1.2"),
    ),
    node(
      subjectId,
      "B4.1.2.2.1",
      "learning_indicator",
      "Identify a liquid-liquid mixture and describe how to separate its components",
      1,
      id("B4.1.2.2"),
    ),

    // STRAND 2: CYCLES
    node(subjectId, "B4.2", "strand", "Cycles", 2),

    node(
      subjectId,
      "B4.2.1",
      "sub_strand",
      "Earth Science",
      1,
      id("B4.2"),
    ),
    node(
      subjectId,
      "B4.2.1.1",
      "content_standard",
      "Recognise that some events in our environment occur recurrently",
      1,
      id("B4.2.1"),
    ),
    node(
      subjectId,
      "B4.2.1.1.1",
      "learning_indicator",
      "Demonstrate understanding of cyclic movements in the environment",
      1,
      id("B4.2.1.1"),
    ),
    node(
      subjectId,
      "B4.2.1.2",
      "content_standard",
      "Recognise the relationship between the earth and the sun",
      2,
      id("B4.2.1"),
    ),
    node(
      subjectId,
      "B4.2.1.2.1",
      "learning_indicator",
      "Identify the objects in the sky during day and night",
      1,
      id("B4.2.1.2"),
    ),
    node(
      subjectId,
      "B4.2.1.3",
      "content_standard",
      "Show understanding of the roles of condensation, evaporation, transpiration and precipitation in the hydrological (water) cycle",
      3,
      id("B4.2.1"),
    ),
    node(
      subjectId,
      "B4.2.1.3.1",
      "learning_indicator",
      "Demonstrate the process of evapotranspiration",
      1,
      id("B4.2.1.3"),
    ),
    node(
      subjectId,
      "B4.2.1.5",
      "content_standard",
      "Recognise water and air as important natural resources",
      5,
      id("B4.2.1"),
    ),
    node(
      subjectId,
      "B4.2.1.5.1",
      "learning_indicator",
      "Demonstrate ways of making water safe for use",
      1,
      id("B4.2.1.5"),
    ),

    node(
      subjectId,
      "B4.2.2",
      "sub_strand",
      "Life Cycles of Organisms",
      2,
      id("B4.2"),
    ),
    node(
      subjectId,
      "B4.2.2.1",
      "content_standard",
      "Demonstrate understanding of the life cycle of plants",
      1,
      id("B4.2.2"),
    ),
    node(
      subjectId,
      "B4.2.2.1.1",
      "learning_indicator",
      "Observe, identify and give functions of the parts of a plant",
      1,
      id("B4.2.2.1"),
    ),
    node(
      subjectId,
      "B4.2.2.1.2",
      "learning_indicator",
      "Examine some common seeds and how they germinate",
      2,
      id("B4.2.2.1"),
    ),

    // STRAND 3: SYSTEMS
    node(subjectId, "B4.3", "strand", "Systems", 3),

    node(
      subjectId,
      "B4.3.1",
      "sub_strand",
      "The Human Body Systems",
      1,
      id("B4.3"),
    ),
    node(
      subjectId,
      "B4.3.1.1",
      "content_standard",
      "Recognise that different parts of the human body work interdependently to perform a specific function",
      1,
      id("B4.3.1"),
    ),
    node(
      subjectId,
      "B4.3.1.1.1",
      "learning_indicator",
      "Know the organs of the digestive system and their functions",
      1,
      id("B4.3.1.1"),
    ),

    node(
      subjectId,
      "B4.3.2",
      "sub_strand",
      "The Solar System",
      2,
      id("B4.3"),
    ),
    node(
      subjectId,
      "B4.3.2.1",
      "content_standard",
      "Show an understanding of the orderliness of the sun, planets and satellites in the solar system, as well as the important role of the sun in the existence of the solar system",
      1,
      id("B4.3.2"),
    ),
    node(
      subjectId,
      "B4.3.2.1.1",
      "learning_indicator",
      "Explain that the sun is at the centre of the solar system",
      1,
      id("B4.3.2.1"),
    ),

    node(
      subjectId,
      "B4.3.3",
      "sub_strand",
      "Ecosystem",
      3,
      id("B4.3"),
    ),
    node(
      subjectId,
      "B4.3.3.1",
      "content_standard",
      "Show understanding and appreciation of the interactions and interdependencies of organisms in an ecosystem",
      1,
      id("B4.3.3"),
    ),
    node(
      subjectId,
      "B4.3.3.1.1",
      "learning_indicator",
      "Explain the concept of ecosystem",
      1,
      id("B4.3.3.1"),
    ),

    // STRAND 4: FORCES AND ENERGY
    node(subjectId, "B4.4", "strand", "Forces and Energy", 4),

    node(
      subjectId,
      "B4.4.1",
      "sub_strand",
      "Sources and Forms of Energy",
      1,
      id("B4.4"),
    ),
    node(
      subjectId,
      "B4.4.1.1",
      "content_standard",
      "Demonstrate understanding of the concept of energy, its various forms, sources and how to transform and conserve it",
      1,
      id("B4.4.1"),
    ),
    node(
      subjectId,
      "B4.4.1.1.1",
      "learning_indicator",
      "Identify the effect of heat on the change of state of substances",
      1,
      id("B4.4.1.1"),
    ),

    node(
      subjectId,
      "B4.4.2",
      "sub_strand",
      "Electricity and Electronics",
      2,
      id("B4.4"),
    ),
    node(
      subjectId,
      "B4.4.2.1",
      "content_standard",
      "Demonstrate knowledge of generation of electricity, its transmission and transformation into other forms",
      1,
      id("B4.4.2"),
    ),
    node(
      subjectId,
      "B4.4.2.1.1",
      "learning_indicator",
      "Identify the uses of electricity",
      1,
      id("B4.4.2.1"),
    ),
    node(
      subjectId,
      "B4.4.2.1.2",
      "learning_indicator",
      "Describe ways of conserving electricity",
      2,
      id("B4.4.2.1"),
    ),
    node(
      subjectId,
      "B4.4.2.2",
      "content_standard",
      "Know the functions and assemblage of basic electronics components",
      2,
      id("B4.4.2"),
    ),
    node(
      subjectId,
      "B4.4.2.2.1",
      "learning_indicator",
      "Identify the basic components of electronic circuits",
      1,
      id("B4.4.2.2"),
    ),

    node(
      subjectId,
      "B4.4.3",
      "sub_strand",
      "Forces and Movement",
      3,
      id("B4.4"),
    ),
    node(
      subjectId,
      "B4.4.3.1",
      "content_standard",
      "Know that movement is caused by applied forces due to the release of stored energy",
      1,
      id("B4.4.3"),
    ),
    node(
      subjectId,
      "B4.4.3.1.1",
      "learning_indicator",
      "Demonstrate understanding of elastic and compressional forces and their everyday applications",
      1,
      id("B4.4.3.1"),
    ),

    // STRAND 5: HUMANS AND THE ENVIRONMENT
    node(
      subjectId,
      "B4.5",
      "strand",
      "Humans and the Environment",
      5,
    ),

    node(
      subjectId,
      "B4.5.1",
      "sub_strand",
      "Personal Hygiene and Sanitation",
      1,
      id("B4.5"),
    ),
    node(
      subjectId,
      "B4.5.1.1",
      "content_standard",
      "Recognise the importance of personal hygiene",
      1,
      id("B4.5.1"),
    ),
    node(
      subjectId,
      "B4.5.1.1.1",
      "learning_indicator",
      "Know how to care for one's self and the environment",
      1,
      id("B4.5.1.1"),
    ),
    node(
      subjectId,
      "B4.5.1.1.2",
      "learning_indicator",
      "Describe ways of sustaining the environment through waste management",
      2,
      id("B4.5.1.1"),
    ),

    node(
      subjectId,
      "B4.5.2",
      "sub_strand",
      "Diseases",
      2,
      id("B4.5"),
    ),
    node(
      subjectId,
      "B4.5.2.1",
      "content_standard",
      "Know common diseases of humans; causes, symptoms, effects and prevention",
      1,
      id("B4.5.2"),
    ),
    node(
      subjectId,
      "B4.5.2.1.1",
      "learning_indicator",
      "Identify causes, symptoms and prevention of measles",
      1,
      id("B4.5.2.1"),
    ),
    node(
      subjectId,
      "B4.5.2.1.2",
      "learning_indicator",
      "Demonstrate understanding of the causes, symptoms and prevention of food-borne diseases",
      2,
      id("B4.5.2.1"),
    ),

    /*
     * NaCCA B4 proceeds from sub-strand 2 to sub-strand 4 here.
     * FILUMIRE preserves the source numbering and does not
     * fabricate a B4.5.3 node.
     */
    node(
      subjectId,
      "B4.5.4",
      "sub_strand",
      "Climate Change",
      4,
      id("B4.5"),
    ),
    node(
      subjectId,
      "B4.5.4.1",
      "content_standard",
      "Know that climate change is one of the most important environmental issues facing the world today",
      1,
      id("B4.5.4"),
    ),
    node(
      subjectId,
      "B4.5.4.1.1",
      "learning_indicator",
      "Explain that burning is one of the causes of climate change",
      1,
      id("B4.5.4.1"),
    ),
  ];
}
