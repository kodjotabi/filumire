import { buildTopic } from "./authored-builder";
import type { Lesson, Question } from "./authored-builder";

export const GHANA_B4_LINES_OF_SYMMETRY_AUTHORED_COMPETENCY_ID =
  "competency-gh-math-b4-lines-of-symmetry-001";

const LESSONS: Lesson[] = [
  {
    key: "lesson",
    type: "lesson",
    strategy: "direct_explanation",
    title: { en: "Lines of Symmetry", fr: "Axes de symétrie" },
    body: {
      en: "A line of symmetry cuts a shape into two halves that match exactly when the shape is folded along the line. Some shapes have no line of symmetry, some have one and some have many. A square has 4 lines of symmetry: two through the middles of opposite sides and two through opposite corners. A rectangle that is not a square has 2: one across the middle each way. Its diagonals are not lines of symmetry, because the halves do not fit on each other when folded. An equilateral triangle has 3 lines. An isosceles triangle has 1. A triangle with three different side lengths has none.",
      fr: "Un axe de symétrie coupe une forme en deux moitiés qui coïncident exactement quand on plie la forme le long de l'axe. Certaines formes n'ont aucun axe de symétrie, certaines en ont un et d'autres en ont plusieurs. Un carré a 4 axes de symétrie : deux passent par les milieux des côtés opposés et deux passent par les coins opposés. Un rectangle qui n'est pas un carré en a 2 : un au milieu dans chaque sens. Ses diagonales ne sont pas des axes de symétrie, car les moitiés ne coïncident pas quand on plie. Un triangle équilatéral a 3 axes. Un triangle isocèle en a 1. Un triangle dont les trois côtés sont différents n'en a aucun.",
    },
  },
  {
    key: "example",
    type: "example",
    strategy: "worked_example",
    title: { en: "Worked Example", fr: "Exemple résolu" },
    body: {
      en: "How many lines of symmetry does a rectangle that is not a square have? Step 1: test by folding. Fold across the middle, from the middle of the long sides: the halves match. Step 2: fold across the middle the other way: the halves match. Step 3: fold along a diagonal: the halves do not match. So there are 2 lines of symmetry.",
      fr: "Combien d'axes de symétrie a un rectangle qui n'est pas un carré ? Étape 1 : teste en pliant. Plie par le milieu, à partir du milieu des grands côtés : les moitiés coïncident. Étape 2 : plie par le milieu dans l'autre sens : les moitiés coïncident. Étape 3 : plie le long d'une diagonale : les moitiés ne coïncident pas. Il y a donc 2 axes de symétrie.",
    },
  },
  {
    key: "scaffold",
    type: "scaffold",
    strategy: "step_by_step_scaffold",
    title: { en: "Step by Step", fr: "Pas à pas" },
    body: {
      en: "Let us test a triangle one step at a time. A triangle has three sides of different lengths. Step 1: try folding it from each corner to the middle of the opposite side. Step 2: in each fold, the two halves do not match, because the sides have different lengths. Step 3: no fold works, so it has no line of symmetry.",
      fr: "Testons un triangle pas à pas. Un triangle a trois côtés de longueurs différentes. Étape 1 : essaie de le plier à partir de chaque coin jusqu'au milieu du côté opposé. Étape 2 : dans chaque pliage, les deux moitiés ne coïncident pas, car les côtés ont des longueurs différentes. Étape 3 : aucun pliage ne marche, donc il n'a aucun axe de symétrie.",
    },
  },
  {
    key: "remediation",
    type: "remediation",
    strategy: "error_analysis",
    title: { en: "Check Your Thinking", fr: "Vérifie ta réflexion" },
    body: {
      en: "Three slips are common. The first is thinking every shape has exactly one line of symmetry. The number depends on the shape. The second is counting a diagonal as a line of symmetry when the halves do not match, as in a rectangle. The third is believing that shapes with unequal sides cannot have any line of symmetry. An isosceles triangle has two equal sides and one line. Always test by folding or by checking that the two halves would match.",
      fr: "Trois erreurs sont fréquentes. La première est de croire que chaque forme a exactement un axe de symétrie. Le nombre dépend de la forme. La seconde est de compter une diagonale comme un axe de symétrie alors que les moitiés ne coïncident pas, comme dans un rectangle. La troisième est de croire que des formes aux côtés inégaux ne peuvent avoir aucun axe de symétrie. Un triangle isocèle a deux côtés égaux et un axe. Teste toujours en pliant ou en vérifiant que les deux moitiés coïncideraient.",
    },
  },
];

const PRACTICE: Question = {
    key: "practice",
    title: { en: "Practise Counting Lines", fr: "Entraîne-toi à compter les axes" },
    body: { en: "How many lines of symmetry does a square have?", fr: "Combien d'axes de symétrie a un carré ?" },
    options: { en: ["4", "1", "2"], fr: ["4", "1", "2"] },
    answer: 0,
    rules: { 1: ["assumes_every_shape_has_one_line_of_symmetry", "misconception"], 2: ["confuses_diagonal_with_symmetry_line", "misconception"] },
    code: "B4.3.1.1.2",
    subskills: ["identify_symmetry_line"],
    criteria: ["identifies_symmetry_lines"],
    contexts: ["abstract"],
  };

const QUESTIONS: Question[] = [
  {
    key: "diagnostic-rectangle",
    purpose: "diagnostic",
    title: { en: "Rectangle", fr: "Rectangle" },
    body: { en: "How many lines of symmetry does a rectangle that is not a square have?", fr: "Combien d'axes de symétrie a un rectangle qui n'est pas un carré ?" },
    options: { en: ["2", "4", "1", "0"], fr: ["2", "4", "1", "0"] },
    answer: 0,
    rules: { 1: ["confuses_diagonal_with_symmetry_line", "misconception"], 2: ["assumes_every_shape_has_one_line_of_symmetry", "misconception"], 3: ["thinks_shapes_that_are_not_regular_have_no_line_of_symmetry", "misconception"] },
    code: "B4.3.1.1.2",
    subskills: ["test_shape_for_symmetry"],
    criteria: ["tests_shape_for_symmetry"],
    contexts: ["abstract"],
  },
  {
    key: "diagnostic-three",
    purpose: "diagnostic",
    title: { en: "Three Lines", fr: "Trois axes" },
    body: { en: "Which shape has exactly 3 lines of symmetry?", fr: "Quelle forme a exactement 3 axes de symétrie ?" },
    options: { en: ["An equilateral triangle", "An isosceles triangle", "A triangle with three different side lengths", "A square"], fr: ["Un triangle équilatéral", "Un triangle isocèle", "Un triangle dont les trois côtés sont différents", "Un carré"] },
    answer: 0,
    rules: { 1: ["assumes_every_shape_has_one_line_of_symmetry", "misconception"], 2: ["thinks_shapes_that_are_not_regular_have_no_line_of_symmetry", "misconception"], 3: ["confuses_diagonal_with_symmetry_line", "misconception"] },
    code: "B4.3.1.1.2",
    subskills: ["compare_regular_and_irregular_shapes"],
    criteria: ["compares_regular_and_irregular_shapes"],
    contexts: ["abstract"],
  },
  {
    key: "reassess-isosceles",
    purpose: "reassessment",
    title: { en: "Isosceles Triangle", fr: "Triangle isocèle" },
    body: { en: "How many lines of symmetry does a triangle with exactly two equal sides have?", fr: "Combien d'axes de symétrie a un triangle qui a exactement deux côtés égaux ?" },
    options: { en: ["1", "3", "0", "2"], fr: ["1", "3", "0", "2"] },
    answer: 0,
    rules: { 1: ["counts_extra_lines_of_symmetry", "procedural_error"], 2: ["thinks_shapes_that_are_not_regular_have_no_line_of_symmetry", "misconception"], 3: ["counts_extra_lines_of_symmetry", "procedural_error"] },
    code: "B4.3.1.1.2",
    subskills: ["compare_regular_and_irregular_shapes"],
    criteria: ["compares_regular_and_irregular_shapes"],
    contexts: ["abstract"],
  },
  {
    key: "reassess-equilateral",
    purpose: "reassessment",
    title: { en: "Equilateral Triangle", fr: "Triangle équilatéral" },
    body: { en: "How many lines of symmetry does an equilateral triangle have?", fr: "Combien d'axes de symétrie a un triangle équilatéral ?" },
    options: { en: ["3", "1", "0", "6"], fr: ["3", "1", "0", "6"] },
    answer: 0,
    rules: { 1: ["assumes_every_shape_has_one_line_of_symmetry", "misconception"], 2: ["thinks_shapes_that_are_not_regular_have_no_line_of_symmetry", "misconception"], 3: ["counts_extra_lines_of_symmetry", "procedural_error"] },
    code: "B4.3.1.1.2",
    subskills: ["identify_symmetry_line"],
    criteria: ["identifies_symmetry_lines"],
    contexts: ["abstract"],
  },
  {
    key: "retain-diagonal",
    purpose: "retention",
    title: { en: "Remember the Diagonal", fr: "Souviens-toi de la diagonale" },
    body: { en: "Without looking back at the lesson: is a diagonal of a rectangle that is not a square a line of symmetry?", fr: "Sans revoir la leçon : une diagonale d'un rectangle qui n'est pas un carré est-elle un axe de symétrie ?" },
    options: { en: ["No, the two halves do not fit on each other when folded", "Yes, a diagonal always makes two equal halves", "Yes, because it goes through two corners", "Yes, but only if the rectangle is long"], fr: ["Non, les deux moitiés ne coïncident pas quand on plie", "Oui, une diagonale fait toujours deux moitiés égales", "Oui, parce qu'elle passe par deux coins", "Oui, mais seulement si le rectangle est long"] },
    answer: 0,
    rules: { 1: ["confuses_diagonal_with_symmetry_line", "misconception"], 2: ["confuses_diagonal_with_symmetry_line", "misconception"], 3: ["confuses_diagonal_with_symmetry_line", "misconception"] },
    code: "B4.3.1.1.2",
    subskills: ["test_shape_for_symmetry"],
    criteria: ["tests_shape_for_symmetry"],
    contexts: ["abstract"],
  },
  {
    /*
     * Tranche 4E: was an exact copy of diagnostic-rectangle (retention
     * re-asked the same question). Same reasoning and misconceptions,
     * new item: the letter H has one vertical and one horizontal line.
     */
    key: "retain-letter-h",
    purpose: "retention",
    title: { en: "The Letter H", fr: "La lettre H" },
    body: { en: "How many lines of symmetry does the capital letter H have?", fr: "Combien d'axes de symétrie a la lettre majuscule H ?" },
    options: { en: ["2", "4", "1", "0"], fr: ["2", "4", "1", "0"] },
    answer: 0,
    rules: { 1: ["confuses_diagonal_with_symmetry_line", "misconception"], 2: ["assumes_every_shape_has_one_line_of_symmetry", "misconception"], 3: ["thinks_shapes_that_are_not_regular_have_no_line_of_symmetry", "misconception"] },
    code: "B4.3.1.1.2",
    subskills: ["identify_symmetry_line"],
    criteria: ["identifies_symmetry_lines"],
    contexts: ["abstract"],
  },
  {
    key: "transfer-board",
    purpose: "transfer",
    title: { en: "School Sign", fr: "Le panneau de l'école" },
    body: { en: "A school sign is a square board. In how many different ways can it be folded so that the two halves match exactly?", fr: "Un panneau d'école est une planche carrée. De combien de façons différentes peut-on la plier pour que les deux moitiés coïncident exactement ?" },
    options: { en: ["4", "2", "1", "8"], fr: ["4", "2", "1", "8"] },
    answer: 0,
    rules: { 1: ["confuses_diagonal_with_symmetry_line", "misconception"], 2: ["assumes_every_shape_has_one_line_of_symmetry", "misconception"], 3: ["counts_extra_lines_of_symmetry", "procedural_error"] },
    code: "B4.3.1.1.2",
    subskills: ["identify_symmetry_line"],
    criteria: ["identifies_symmetry_lines"],
    contexts: ["school"],
  },
  {
    key: "transfer-tray",
    purpose: "transfer",
    title: { en: "Trader's Tray", fr: "Le plateau de la commerçante" },
    body: { en: "A trader's tray is a rectangle 30 cm long and 20 cm wide. How many lines of symmetry does it have?", fr: "Le plateau d'une commerçante est un rectangle de 30 cm de long et 20 cm de large. Combien d'axes de symétrie a-t-il ?" },
    options: { en: ["2", "4", "1", "0"], fr: ["2", "4", "1", "0"] },
    answer: 0,
    rules: { 1: ["confuses_diagonal_with_symmetry_line", "misconception"], 2: ["assumes_every_shape_has_one_line_of_symmetry", "misconception"], 3: ["thinks_shapes_that_are_not_regular_have_no_line_of_symmetry", "misconception"] },
    code: "B4.3.1.1.2",
    subskills: ["test_shape_for_symmetry"],
    criteria: ["tests_shape_for_symmetry"],
    contexts: ["market"],
  },
];

export const GHANA_B4_LINES_OF_SYMMETRY_AUTHORED_CONTENT = buildTopic(
  {
    competencyId: GHANA_B4_LINES_OF_SYMMETRY_AUTHORED_COMPETENCY_ID,
    slug: "lines-of-symmetry-001",
    version: "authored-lines-of-symmetry-1.0",
    source: "NaCCA Mathematics Curriculum, Basic 4",
    defaultCode: "B4.3.1.1.2",
  },
  LESSONS,
  PRACTICE,
  QUESTIONS,
);
