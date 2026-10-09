import { buildTopic } from "./authored-builder";
import type { Lesson, Question } from "./authored-builder";

/*
 * Tranche 4C: authored content for the three B4 number-pattern
 * competencies, which had only 1-2 pilot questions each and no
 * retention or transfer items. The original pilot items in seed.ts
 * are kept (stable ids); this adds lessons, a practice item, four
 * mastery questions, two retention and two transfer questions per
 * competency, in English and French.
 *
 * Alignment (B4-mathematics-authoritative-mapping.txt):
 * - patterns-001 Continue Simple Number Patterns  -> B4.2.1.1.2 (support B4.2.1.3.2)
 * - patterns-002 Describe Number Pattern Rules     -> B4.2.1.1.1 (support B4.2.1.3)
 * - patterns-003 Apply Number Patterns in Context  -> B4.2.1.3.2 (support B4.2.1.3.1)
 */

const SOURCE = "NaCCA Mathematics Curriculum for Primary Schools, Basic 4-6, 2019";

const NOT_CHECKED = "chooses_next_number_without_checking_rule";
const ADD_SUB = "confuses_addition_and_subtraction_pattern";
const DIFFERENCE = "pattern_difference_miscalculated";
const NUMBER_AS_RULE = "states_observed_number_instead_of_rule";
const NO_UNITS = "applies_pattern_without_context_units";
const ONE_STEP = "applies_rule_only_once";

/* ---------- 001 Continue Simple Number Patterns ---------- */

const P1_CODE = "B4.2.1.1.2";

const P1_LESSONS: Lesson[] = [
  {
    key: "lesson",
    type: "lesson",
    strategy: "direct_explanation",
    title: { en: "Continue a Number Pattern", fr: "Continuer une suite de nombres" },
    body: {
      en: "A number pattern changes by the same amount each time. To find the change, compare two neighbouring numbers. If the numbers get bigger, the rule adds. If they get smaller, the rule subtracts. Check the change between every pair, not just the last two, then use it to find the next number. In 7, 11, 15, 19 each number is 4 more than the one before, so the next number is 23.",
      fr: "Une suite de nombres change de la même quantité à chaque fois. Pour trouver ce changement, compare deux nombres voisins. Si les nombres deviennent plus grands, la règle ajoute. S'ils deviennent plus petits, la règle soustrait. Vérifie le changement entre chaque paire, pas seulement les deux derniers, puis utilise-le pour trouver le nombre suivant. Dans 7, 11, 15, 19, chaque nombre a 4 de plus que le précédent, donc le nombre suivant est 23.",
    },
  },
  {
    key: "example",
    type: "example",
    strategy: "worked_example",
    title: { en: "Worked Example", fr: "Exemple résolu" },
    body: {
      en: "Kofi counts bottle tops in bags: 50, 45, 40, 35. Step 1: 45 is 5 less than 50. Step 2: 40 is 5 less than 45, and 35 is 5 less than 40, so the change is the same every time. Step 3: the numbers get smaller, so the rule is subtract 5. Step 4: 35 minus 5 is 30, so the next number is 30.",
      fr: "Kofi compte des capsules dans des sacs : 50, 45, 40, 35. Étape 1 : 45, c'est 5 de moins que 50. Étape 2 : 40, c'est 5 de moins que 45, et 35, c'est 5 de moins que 40, donc le changement est toujours le même. Étape 3 : les nombres diminuent, donc la règle est soustraire 5. Étape 4 : 35 moins 5 font 30, donc le nombre suivant est 30.",
    },
  },
  {
    key: "scaffold",
    type: "scaffold",
    strategy: "step_by_step_scaffold",
    title: { en: "Step by Step", fr: "Pas à pas" },
    body: {
      en: "Step 1: look at the first two numbers and find how much they change. Step 2: say whether the numbers go up or down. Step 3: check that the same change works for every pair. Step 4: apply the change once more to the last number. Step 5: check your answer fits the pattern.",
      fr: "Étape 1 : regarde les deux premiers nombres et trouve de combien ils changent. Étape 2 : dis si les nombres montent ou descendent. Étape 3 : vérifie que le même changement marche pour chaque paire. Étape 4 : applique ce changement une fois de plus au dernier nombre. Étape 5 : vérifie que ta réponse suit la suite.",
    },
  },
  {
    key: "remediation",
    type: "remediation",
    strategy: "error_analysis",
    title: { en: "Check Your Thinking", fr: "Vérifie ta réflexion" },
    body: {
      en: "Two slips are common. Some pupils guess the next number without finding the change, for example writing 20 after 12, 15, 18 because it is close. Others add when the pattern goes down, writing 33 after 30, 27, 24 instead of 21. Always find the change, say if it goes up or down, and check it on every pair.",
      fr: "Deux erreurs sont fréquentes. Certains élèves devinent le nombre suivant sans trouver le changement, par exemple écrire 20 après 12, 15, 18 parce que c'est proche. D'autres ajoutent alors que la suite descend, en écrivant 33 après 30, 27, 24 au lieu de 21. Trouve toujours le changement, dis s'il monte ou descend et vérifie-le sur chaque paire.",
    },
  },
];

const P1_PRACTICE: Question = {
  key: "practice",
  title: { en: "Practise Continuing a Pattern", fr: "Entraîne-toi à continuer une suite" },
  body: { en: "Continue the pattern: 25, 30, 35, 40, __", fr: "Continue la suite : 25, 30, 35, 40, __" },
  options: { en: ["45", "41", "50", "35"], fr: ["45", "41", "50", "35"] },
  answer: 0,
  rules: { 1: [NOT_CHECKED, "conceptual_misunderstanding"], 2: [DIFFERENCE, "procedural_error"], 3: [ADD_SUB, "misconception"] },
  code: P1_CODE,
  subskills: ["continue_pattern"],
  criteria: ["demonstrates_continue_pattern"],
  contexts: ["abstract"],
};

const P1_QUESTIONS: Question[] = [
  {
    key: "diagnostic-decreasing",
    purpose: "diagnostic",
    title: { en: "What Comes Next", fr: "Qu'est-ce qui vient ensuite" },
    body: { en: "What number comes next? 64, 56, 48, 40, __", fr: "Quel nombre vient ensuite ? 64, 56, 48, 40, __" },
    options: { en: ["48", "32", "30", "36"], fr: ["48", "32", "30", "36"] },
    answer: 1,
    rules: { 0: [ADD_SUB, "misconception"], 2: [DIFFERENCE, "procedural_error"], 3: [NOT_CHECKED, "conceptual_misunderstanding"] },
    code: P1_CODE,
    subskills: ["identify_repeated_change", "continue_pattern"],
    criteria: ["demonstrates_identify_repeated_change"],
    contexts: ["abstract"],
  },
  {
    key: "diagnostic-missing",
    purpose: "diagnostic",
    title: { en: "The Missing Number", fr: "Le nombre manquant" },
    body: { en: "Which number is missing? 9, 15, __, 27, 33", fr: "Quel nombre manque ? 9, 15, __, 27, 33" },
    options: { en: ["18", "20", "21", "24"], fr: ["18", "20", "21", "24"] },
    answer: 2,
    rules: { 0: [DIFFERENCE, "procedural_error"], 1: [NOT_CHECKED, "conceptual_misunderstanding"], 3: [DIFFERENCE, "procedural_error"] },
    code: P1_CODE,
    subskills: ["compare_consecutive_terms", "identify_repeated_change"],
    criteria: ["demonstrates_compare_consecutive_terms"],
    contexts: ["abstract"],
  },
  {
    key: "reassess-chart-row",
    purpose: "reassessment",
    title: { en: "A Row of the Chart", fr: "Une ligne du tableau" },
    body: { en: "One row of a multiplication chart reads 6, 12, 18, 24, __. What number comes next?", fr: "Une ligne d'une table de multiplication donne 6, 12, 18, 24, __. Quel nombre vient ensuite ?" },
    options: { en: ["28", "30", "36", "26"], fr: ["28", "30", "36", "26"] },
    answer: 1,
    rules: { 0: [DIFFERENCE, "procedural_error"], 2: [NOT_CHECKED, "conceptual_misunderstanding"], 3: [DIFFERENCE, "procedural_error"] },
    code: "B4.2.1.1.2",
    subskills: ["continue_pattern"],
    criteria: ["demonstrates_continue_pattern"],
    contexts: ["school"],
  },
  {
    key: "reassess-tens",
    purpose: "reassessment",
    title: { en: "Counting Back", fr: "Compter à rebours" },
    body: { en: "Continue the pattern: 100, 90, 80, 70, __", fr: "Continue la suite : 100, 90, 80, 70, __" },
    options: { en: ["80", "60", "69", "50"], fr: ["80", "60", "69", "50"] },
    answer: 1,
    rules: { 0: [ADD_SUB, "misconception"], 2: [NOT_CHECKED, "conceptual_misunderstanding"], 3: [DIFFERENCE, "procedural_error"] },
    code: P1_CODE,
    subskills: ["identify_repeated_change", "continue_pattern"],
    criteria: ["demonstrates_continue_pattern"],
    contexts: ["abstract"],
  },
  {
    key: "retention-fives",
    purpose: "retention",
    title: { en: "Remember the Pattern", fr: "Souviens-toi de la suite" },
    body: { en: "Look at the pattern 3, 8, 13, 18, __. What number comes next?", fr: "Regarde la suite 3, 8, 13, 18, __. Quel nombre vient ensuite ?" },
    options: { en: ["21", "22", "23", "28"], fr: ["21", "22", "23", "28"] },
    answer: 2,
    rules: { 0: [DIFFERENCE, "procedural_error"], 1: [DIFFERENCE, "procedural_error"], 3: [NOT_CHECKED, "conceptual_misunderstanding"] },
    code: P1_CODE,
    subskills: ["continue_pattern"],
    criteria: ["demonstrates_continue_pattern"],
    contexts: ["abstract"],
  },
  {
    key: "retention-nines",
    purpose: "retention",
    title: { en: "Going Down Again", fr: "Encore en descendant" },
    body: { en: "Continue the pattern: 81, 72, 63, 54, __", fr: "Continue la suite : 81, 72, 63, 54, __" },
    options: { en: ["63", "45", "44", "46"], fr: ["63", "45", "44", "46"] },
    answer: 1,
    rules: { 0: [ADD_SUB, "misconception"], 2: [DIFFERENCE, "procedural_error"], 3: [DIFFERENCE, "procedural_error"] },
    code: P1_CODE,
    subskills: ["identify_repeated_change", "continue_pattern"],
    criteria: ["demonstrates_continue_pattern"],
    contexts: ["abstract"],
  },
  {
    key: "transfer-maize",
    purpose: "transfer",
    title: { en: "Rows of Maize", fr: "Des rangées de maïs" },
    body: { en: "A farmer plants maize in rows. Row 1 has 12 plants, row 2 has 16 plants and row 3 has 20 plants. If the pattern continues, how many plants are in row 4?", fr: "Un fermier plante du maïs en rangées. La rangée 1 a 12 plants, la rangée 2 en a 16 et la rangée 3 en a 20. Si la suite continue, combien de plants y a-t-il dans la rangée 4 ?" },
    options: { en: ["22", "24", "28", "20"], fr: ["22", "24", "28", "20"] },
    answer: 1,
    rules: { 0: [DIFFERENCE, "procedural_error"], 2: [NOT_CHECKED, "conceptual_misunderstanding"], 3: [NOT_CHECKED, "conceptual_misunderstanding"] },
    code: "B4.2.1.3.2",
    subskills: ["identify_repeated_change", "continue_pattern"],
    criteria: ["demonstrates_continue_pattern"],
    contexts: ["farm"],
  },
  {
    key: "transfer-water-tank",
    purpose: "transfer",
    title: { en: "The Water Tank", fr: "Le réservoir d'eau" },
    body: { en: "Ama's water tank shows 60 litres on Monday, 54 litres on Tuesday and 48 litres on Wednesday. The same amount is used each day. How many litres will it show on Thursday?", fr: "Le réservoir d'eau d'Ama indique 60 litres lundi, 54 litres mardi et 48 litres mercredi. On utilise la même quantité chaque jour. Combien de litres indiquera-t-il jeudi ?" },
    options: { en: ["42", "54", "44", "36"], fr: ["42", "54", "44", "36"] },
    answer: 0,
    rules: { 1: [ADD_SUB, "misconception"], 2: [DIFFERENCE, "procedural_error"], 3: [DIFFERENCE, "procedural_error"] },
    code: "B4.2.1.3.2",
    subskills: ["identify_repeated_change", "continue_pattern"],
    criteria: ["demonstrates_continue_pattern"],
    contexts: ["household"],
  },
];

/* ---------- 002 Describe Number Pattern Rules ---------- */

const P2_CODE = "B4.2.1.1.1";

const P2_LESSONS: Lesson[] = [
  {
    key: "lesson",
    type: "lesson",
    strategy: "direct_explanation",
    title: { en: "Describe the Rule", fr: "Décrire la règle" },
    body: {
      en: "A pattern rule tells what happens to each number to get the next one, such as add 6 or subtract 10. A rule is not one of the numbers in the pattern. Find the change between neighbouring numbers, check it for every pair, then say it with an action and an amount. In 5, 11, 17, 23 each number is 6 more than the one before, so the rule is add 6. Using the rule, the next term is 29.",
      fr: "Une règle de suite dit ce qui arrive à chaque nombre pour obtenir le suivant, par exemple ajouter 6 ou soustraire 10. Une règle n'est pas un des nombres de la suite. Trouve le changement entre des nombres voisins, vérifie-le pour chaque paire, puis dis-le avec une action et une quantité. Dans 5, 11, 17, 23, chaque nombre a 6 de plus que le précédent, donc la règle est ajouter 6. Avec cette règle, le terme suivant est 29.",
    },
  },
  {
    key: "example",
    type: "example",
    strategy: "worked_example",
    title: { en: "Worked Example with a Table", fr: "Exemple résolu avec un tableau" },
    body: {
      en: "A table shows money saved: Day 1, 4 cedis. Day 2, 7 cedis. Day 3, 10 cedis. Step 1: from 4 to 7 is 3 more. Step 2: from 7 to 10 is also 3 more. Step 3: the amounts go up by the same amount, so the rule is add 3 cedis. Step 4: on Day 4 the saving is 10 plus 3, which is 13 cedis.",
      fr: "Un tableau montre l'argent économisé : Jour 1, 4 cedis. Jour 2, 7 cedis. Jour 3, 10 cedis. Étape 1 : de 4 à 7, c'est 3 de plus. Étape 2 : de 7 à 10, c'est aussi 3 de plus. Étape 3 : les montants augmentent toujours de la même quantité, donc la règle est ajouter 3 cedis. Étape 4 : le Jour 4, l'économie est 10 plus 3, soit 13 cedis.",
    },
  },
  {
    key: "scaffold",
    type: "scaffold",
    strategy: "step_by_step_scaffold",
    title: { en: "Step by Step", fr: "Pas à pas" },
    body: {
      en: "Step 1: find the change from the first number to the second. Step 2: check the same change works for every other pair. Step 3: decide if the numbers go up (add) or down (subtract). Step 4: write the rule as an action and an amount, such as subtract 4. Step 5: test your rule by using it to make the next term.",
      fr: "Étape 1 : trouve le changement du premier nombre au deuxième. Étape 2 : vérifie que le même changement marche pour toutes les autres paires. Étape 3 : décide si les nombres montent (ajouter) ou descendent (soustraire). Étape 4 : écris la règle avec une action et une quantité, par exemple soustraire 4. Étape 5 : teste ta règle en l'utilisant pour trouver le terme suivant.",
    },
  },
  {
    key: "remediation",
    type: "remediation",
    strategy: "error_analysis",
    title: { en: "Check Your Thinking", fr: "Vérifie ta réflexion" },
    body: {
      en: "Three slips are common. Some pupils give a number from the pattern as the rule, for example saying the rule of 4, 8, 12, 16 is 16. A rule must say what to do: add 4. Some give only the amount and forget the direction, or say add when the numbers go down. Some check only one pair; always check every pair before you say the rule.",
      fr: "Trois erreurs sont fréquentes. Certains élèves donnent un nombre de la suite comme règle, par exemple dire que la règle de 4, 8, 12, 16 est 16. Une règle doit dire quoi faire : ajouter 4. Certains donnent seulement la quantité et oublient le sens, ou disent ajouter quand les nombres descendent. Certains ne vérifient qu'une paire ; vérifie toujours chaque paire avant de dire la règle.",
    },
  },
];

const P2_PRACTICE: Question = {
  key: "practice",
  title: { en: "Practise Describing a Rule", fr: "Entraîne-toi à décrire une règle" },
  body: { en: "Which rule describes the pattern 30, 25, 20, 15?", fr: "Quelle règle décrit la suite 30, 25, 20, 15 ?" },
  options: { en: ["subtract 5", "add 5", "15", "subtract 10"], fr: ["soustraire 5", "ajouter 5", "15", "soustraire 10"] },
  answer: 0,
  rules: { 1: [ADD_SUB, "misconception"], 2: [NUMBER_AS_RULE, "misconception"], 3: [DIFFERENCE, "procedural_error"] },
  code: P2_CODE,
  subskills: ["state_pattern_rule"],
  criteria: ["demonstrates_state_pattern_rule"],
  contexts: ["abstract"],
};

const P2_QUESTIONS: Question[] = [
  {
    key: "diagnostic-sevens",
    purpose: "diagnostic",
    title: { en: "Find the Rule", fr: "Trouve la règle" },
    body: { en: "Look at 2, 9, 16, 23. Which rule describes the pattern?", fr: "Regarde 2, 9, 16, 23. Quelle règle décrit la suite ?" },
    options: { en: ["add 7", "add 9", "23", "subtract 7"], fr: ["ajouter 7", "ajouter 9", "23", "soustraire 7"] },
    answer: 0,
    rules: { 1: [DIFFERENCE, "procedural_error"], 2: [NUMBER_AS_RULE, "misconception"], 3: [ADD_SUB, "misconception"] },
    code: P2_CODE,
    subskills: ["state_pattern_rule"],
    criteria: ["demonstrates_state_pattern_rule"],
    contexts: ["abstract"],
  },
  {
    key: "diagnostic-kwame",
    purpose: "diagnostic",
    title: { en: "Is Kwame Right", fr: "Kwame a-t-il raison" },
    body: { en: "Kwame says the rule for 40, 36, 32, 28 is 28. What is the correct rule?", fr: "Kwame dit que la règle de 40, 36, 32, 28 est 28. Quelle est la bonne règle ?" },
    options: { en: ["28", "subtract 4", "add 4", "subtract 8"], fr: ["28", "soustraire 4", "ajouter 4", "soustraire 8"] },
    answer: 1,
    rules: { 0: [NUMBER_AS_RULE, "misconception"], 2: [ADD_SUB, "misconception"], 3: [DIFFERENCE, "procedural_error"] },
    code: P2_CODE,
    subskills: ["state_pattern_rule"],
    criteria: ["demonstrates_state_pattern_rule"],
    contexts: ["school"],
  },
  {
    key: "reassess-use-rule",
    purpose: "reassessment",
    title: { en: "Use the Rule", fr: "Utilise la règle" },
    body: { en: "The rule for a pattern is add 8. The pattern starts 5, 13, 21. What is the next term?", fr: "La règle d'une suite est ajouter 8. La suite commence par 5, 13, 21. Quel est le terme suivant ?" },
    options: { en: ["26", "29", "24", "37"], fr: ["26", "29", "24", "37"] },
    answer: 1,
    rules: { 0: [DIFFERENCE, "procedural_error"], 2: [DIFFERENCE, "procedural_error"], 3: [DIFFERENCE, "procedural_error"] },
    code: P2_CODE,
    subskills: ["apply_rule_to_next_term"],
    criteria: ["demonstrates_apply_rule_to_next_term"],
    contexts: ["abstract"],
  },
  {
    key: "reassess-chairs-table",
    purpose: "reassessment",
    title: { en: "Chairs in a Table", fr: "Des chaises dans un tableau" },
    body: { en: "A table shows the chairs in each row of a hall: Row 1, 6 chairs. Row 2, 9 chairs. Row 3, 12 chairs. Row 4, 15 chairs. Which rule describes the number of chairs?", fr: "Un tableau montre les chaises de chaque rangée d'une salle : Rangée 1, 6 chaises. Rangée 2, 9 chaises. Rangée 3, 12 chaises. Rangée 4, 15 chaises. Quelle règle décrit le nombre de chaises ?" },
    options: { en: ["add 6", "15", "multiply by 3", "add 3"], fr: ["ajouter 6", "15", "multiplier par 3", "ajouter 3"] },
    answer: 3,
    rules: { 0: [DIFFERENCE, "procedural_error"], 1: [NUMBER_AS_RULE, "misconception"], 2: [NOT_CHECKED, "conceptual_misunderstanding"] },
    code: "B4.2.1.1.1",
    subskills: ["state_pattern_rule"],
    criteria: ["demonstrates_state_pattern_rule"],
    contexts: ["school"],
  },
  {
    key: "retention-nines",
    purpose: "retention",
    title: { en: "Remember the Rule", fr: "Souviens-toi de la règle" },
    body: { en: "Which rule describes 11, 20, 29, 38?", fr: "Quelle règle décrit 11, 20, 29, 38 ?" },
    options: { en: ["add 11", "38", "add 9", "subtract 9"], fr: ["ajouter 11", "38", "ajouter 9", "soustraire 9"] },
    answer: 2,
    rules: { 0: [DIFFERENCE, "procedural_error"], 1: [NUMBER_AS_RULE, "misconception"], 3: [ADD_SUB, "misconception"] },
    code: P2_CODE,
    subskills: ["state_pattern_rule"],
    criteria: ["demonstrates_state_pattern_rule"],
    contexts: ["abstract"],
  },
  {
    key: "retention-rule-and-term",
    purpose: "retention",
    title: { en: "Rule and Next Term", fr: "Règle et terme suivant" },
    body: { en: "Look at 72, 66, 60, 54. Which statement is correct?", fr: "Regarde 72, 66, 60, 54. Quelle phrase est correcte ?" },
    options: {
      en: ["The rule is subtract 6, so the next term is 48", "The rule is add 6, so the next term is 60", "The rule is subtract 6, so the next term is 50", "The rule is 54, so the next term is 54"],
      fr: ["La règle est soustraire 6, donc le terme suivant est 48", "La règle est ajouter 6, donc le terme suivant est 60", "La règle est soustraire 6, donc le terme suivant est 50", "La règle est 54, donc le terme suivant est 54"],
    },
    answer: 0,
    rules: { 1: [ADD_SUB, "misconception"], 2: [DIFFERENCE, "procedural_error"], 3: [NUMBER_AS_RULE, "misconception"] },
    code: P2_CODE,
    subskills: ["state_pattern_rule", "apply_rule_to_next_term"],
    criteria: ["demonstrates_apply_rule_to_next_term"],
    contexts: ["abstract"],
  },
  {
    key: "transfer-bus",
    purpose: "transfer",
    title: { en: "Passengers on a Bus", fr: "Des passagers dans un bus" },
    body: { en: "A bus carries 15 passengers on its first trip, 25 on its second trip and 35 on its third trip. Which statement describes the pattern?", fr: "Un bus transporte 15 passagers au premier voyage, 25 au deuxième et 35 au troisième. Quelle phrase décrit la suite ?" },
    options: {
      en: ["The number of passengers goes up by 15 each trip", "The number of passengers goes up by 10 each trip", "The rule is 35", "The number of passengers goes down by 10 each trip"],
      fr: ["Le nombre de passagers augmente de 15 à chaque voyage", "Le nombre de passagers augmente de 10 à chaque voyage", "La règle est 35", "Le nombre de passagers diminue de 10 à chaque voyage"],
    },
    answer: 1,
    rules: { 0: [DIFFERENCE, "procedural_error"], 2: [NUMBER_AS_RULE, "misconception"], 3: [ADD_SUB, "misconception"] },
    code: "B4.2.1.3.2",
    subskills: ["state_pattern_rule"],
    criteria: ["demonstrates_state_pattern_rule"],
    contexts: ["transport"],
  },
  {
    key: "transfer-exercise-books",
    purpose: "transfer",
    title: { en: "Buying Exercise Books", fr: "Acheter des cahiers" },
    body: { en: "A price table shows: 1 exercise book, 3 cedis. 2 books, 6 cedis. 3 books, 9 cedis. 4 books, 12 cedis. Which rule describes the price each time one more book is bought?", fr: "Un tableau de prix montre : 1 cahier, 3 cedis. 2 cahiers, 6 cedis. 3 cahiers, 9 cedis. 4 cahiers, 12 cedis. Quelle règle décrit le prix chaque fois qu'on achète un cahier de plus ?" },
    options: { en: ["add 4 cedis", "12 cedis", "subtract 3 cedis", "add 3 cedis"], fr: ["ajouter 4 cedis", "12 cedis", "soustraire 3 cedis", "ajouter 3 cedis"] },
    answer: 3,
    rules: { 0: [DIFFERENCE, "procedural_error"], 1: [NUMBER_AS_RULE, "misconception"], 2: [ADD_SUB, "misconception"] },
    code: "B4.2.1.3.2",
    subskills: ["state_pattern_rule"],
    criteria: ["demonstrates_state_pattern_rule"],
    contexts: ["market", "currency"],
  },
];

/* ---------- 003 Apply Number Patterns in Context ---------- */

const P3_CODE = "B4.2.1.3.2";

const P3_LESSONS: Lesson[] = [
  {
    key: "lesson",
    type: "lesson",
    strategy: "direct_explanation",
    title: { en: "Solve Problems with Patterns", fr: "Résoudre des problèmes avec des suites" },
    body: {
      en: "To solve a problem with a pattern: 1. Write the numbers from the story in order, like a table. 2. Find the rule between neighbouring numbers. 3. Use the rule as many times as the question asks. 4. Answer with the unit from the story, such as cedis, litres or chairs. A shop sells 8 loaves on Monday, 11 on Tuesday and 14 on Wednesday. The rule is add 3, so it sells 17 loaves on Thursday and 20 loaves on Friday.",
      fr: "Pour résoudre un problème avec une suite : 1. Écris les nombres de l'histoire dans l'ordre, comme un tableau. 2. Trouve la règle entre des nombres voisins. 3. Utilise la règle autant de fois que la question le demande. 4. Réponds avec l'unité de l'histoire, comme des cedis, des litres ou des chaises. Une boutique vend 8 pains lundi, 11 mardi et 14 mercredi. La règle est ajouter 3, donc elle vend 17 pains jeudi et 20 pains vendredi.",
    },
  },
  {
    key: "example",
    type: "example",
    strategy: "worked_example",
    title: { en: "Worked Example: Trotro Fares", fr: "Exemple résolu : les tarifs du trotro" },
    body: {
      en: "A trotro mate collects 5 cedis after trip 1, 10 cedis after trip 2 and 15 cedis after trip 3. How much after trip 5? Step 1: make a table: trip 1, 5; trip 2, 10; trip 3, 15. Step 2: the rule is add 5 cedis. Step 3: trip 4 is 20 cedis and trip 5 is 25 cedis. Step 4: answer with the unit: 25 cedis.",
      fr: "Un apprenti de trotro a 5 cedis après le voyage 1, 10 cedis après le voyage 2 et 15 cedis après le voyage 3. Combien après le voyage 5 ? Étape 1 : fais un tableau : voyage 1, 5 ; voyage 2, 10 ; voyage 3, 15. Étape 2 : la règle est ajouter 5 cedis. Étape 3 : le voyage 4 donne 20 cedis et le voyage 5 donne 25 cedis. Étape 4 : réponds avec l'unité : 25 cedis.",
    },
  },
  {
    key: "scaffold",
    type: "scaffold",
    strategy: "step_by_step_scaffold",
    title: { en: "Step by Step", fr: "Pas à pas" },
    body: {
      en: "Step 1: underline what is being counted, such as bottles or cedis. Step 2: put the numbers in a table in order. Step 3: find and check the rule. Step 4: count how many more steps the question asks for and use the rule that many times. Step 5: write the answer with its unit.",
      fr: "Étape 1 : souligne ce qu'on compte, comme des bouteilles ou des cedis. Étape 2 : mets les nombres dans un tableau, dans l'ordre. Étape 3 : trouve la règle et vérifie-la. Étape 4 : compte combien d'étapes de plus la question demande et utilise la règle autant de fois. Étape 5 : écris la réponse avec son unité.",
    },
  },
  {
    key: "remediation",
    type: "remediation",
    strategy: "error_analysis",
    title: { en: "Check Your Thinking", fr: "Vérifie ta réflexion" },
    body: {
      en: "Three slips are common. Some pupils answer with the wrong thing, such as the day number instead of the number of cedis. Some use the rule only once when the question asks about a later day. Some add when the amount is going down, such as money being spent. Read what is counted, count the steps, and give the unit.",
      fr: "Trois erreurs sont fréquentes. Certains élèves répondent avec la mauvaise chose, comme le numéro du jour au lieu du nombre de cedis. Certains n'utilisent la règle qu'une fois alors que la question parle d'un jour plus tard. Certains ajoutent alors que la quantité diminue, comme de l'argent dépensé. Lis ce qu'on compte, compte les étapes et donne l'unité.",
    },
  },
];

const P3_PRACTICE: Question = {
  key: "practice",
  title: { en: "Practise Using a Pattern", fr: "Entraîne-toi à utiliser une suite" },
  body: { en: "Esi reads 3 pages on day 1, 6 pages on day 2 and 9 pages on day 3. If the pattern continues, how many pages will she read on day 5?", fr: "Esi lit 3 pages le jour 1, 6 pages le jour 2 et 9 pages le jour 3. Si la suite continue, combien de pages lira-t-elle le jour 5 ?" },
  options: { en: ["12 pages", "15 pages", "5 pages", "18 pages"], fr: ["12 pages", "15 pages", "5 pages", "18 pages"] },
  answer: 1,
  rules: { 0: [ONE_STEP, "procedural_error"], 2: [NO_UNITS, "misconception"], 3: [DIFFERENCE, "procedural_error"] },
  code: P3_CODE,
  subskills: ["apply_rule_to_quantity"],
  criteria: ["demonstrates_apply_rule_to_quantity"],
  contexts: ["school"],
};

const P3_QUESTIONS: Question[] = [
  {
    key: "diagnostic-bottles",
    purpose: "diagnostic",
    title: { en: "Collecting Bottles", fr: "Ramasser des bouteilles" },
    body: { en: "A class collects 10 bottles on Monday, 15 on Tuesday and 20 on Wednesday. If the pattern continues, how many bottles will they collect on Thursday?", fr: "Une classe ramasse 10 bouteilles lundi, 15 mardi et 20 mercredi. Si la suite continue, combien de bouteilles ramassera-t-elle jeudi ?" },
    options: { en: ["25 bottles", "30 bottles", "4 bottles", "21 bottles"], fr: ["25 bouteilles", "30 bouteilles", "4 bouteilles", "21 bouteilles"] },
    answer: 0,
    rules: { 1: [DIFFERENCE, "procedural_error"], 2: [NO_UNITS, "misconception"], 3: [NOT_CHECKED, "conceptual_misunderstanding"] },
    code: P3_CODE,
    subskills: ["connect_pattern_to_context", "apply_rule_to_quantity"],
    criteria: ["demonstrates_apply_rule_to_quantity"],
    contexts: ["school"],
  },
  {
    key: "diagnostic-savings-table",
    purpose: "diagnostic",
    title: { en: "Yaw's Savings Box", fr: "La tirelire de Yaw" },
    body: { en: "Yaw's savings box has 50 cedis. Each week he takes out 5 cedis for lunch. Which list shows the money left in the box for the next three weeks?", fr: "La tirelire de Yaw contient 50 cedis. Chaque semaine, il retire 5 cedis pour son déjeuner. Quelle liste montre l'argent qui reste dans la tirelire pendant les trois semaines suivantes ?" },
    options: {
      en: ["55 cedis, 60 cedis, 65 cedis", "45 cedis, 44 cedis, 43 cedis", "45 cedis, 40 cedis, 35 cedis", "5 cedis, 10 cedis, 15 cedis"],
      fr: ["55 cedis, 60 cedis, 65 cedis", "45 cedis, 44 cedis, 43 cedis", "45 cedis, 40 cedis, 35 cedis", "5 cedis, 10 cedis, 15 cedis"],
    },
    answer: 2,
    rules: { 0: [ADD_SUB, "misconception"], 1: [DIFFERENCE, "procedural_error"], 3: [NO_UNITS, "misconception"] },
    code: "B4.2.1.3.1",
    subskills: ["connect_pattern_to_context"],
    criteria: ["demonstrates_connect_pattern_to_context"],
    contexts: ["currency", "household"],
  },
  {
    key: "reassess-chairs-row-six",
    purpose: "reassessment",
    title: { en: "Chairs for an Event", fr: "Des chaises pour une fête" },
    body: { en: "Chairs are set out for a school event. Row 1 has 8 chairs, row 2 has 12 chairs and row 3 has 16 chairs. How many chairs are in row 6?", fr: "On installe des chaises pour une fête de l'école. La rangée 1 a 8 chaises, la rangée 2 en a 12 et la rangée 3 en a 16. Combien de chaises y a-t-il dans la rangée 6 ?" },
    options: { en: ["20 chairs", "24 chairs", "28 chairs", "6 chairs"], fr: ["20 chaises", "24 chaises", "28 chaises", "6 chaises"] },
    answer: 2,
    rules: { 0: [ONE_STEP, "procedural_error"], 1: [ONE_STEP, "procedural_error"], 3: [NO_UNITS, "misconception"] },
    code: P3_CODE,
    subskills: ["apply_rule_to_quantity"],
    criteria: ["demonstrates_apply_rule_to_quantity"],
    contexts: ["school"],
  },
  {
    key: "reassess-tank",
    purpose: "reassessment",
    title: { en: "Using Water", fr: "Utiliser de l'eau" },
    body: { en: "A tank holds 90 litres of water. 15 litres are used each day. How many litres are left after 3 days?", fr: "Un réservoir contient 90 litres d'eau. On utilise 15 litres chaque jour. Combien de litres reste-t-il après 3 jours ?" },
    options: { en: ["75 litres", "105 litres", "3 litres", "45 litres"], fr: ["75 litres", "105 litres", "3 litres", "45 litres"] },
    answer: 3,
    rules: { 0: [ONE_STEP, "procedural_error"], 1: [ADD_SUB, "misconception"], 2: [NO_UNITS, "misconception"] },
    code: P3_CODE,
    subskills: ["apply_rule_to_quantity"],
    criteria: ["demonstrates_apply_rule_to_quantity"],
    contexts: ["household"],
  },
  {
    key: "retention-baker",
    purpose: "retention",
    title: { en: "The Baker", fr: "Le boulanger" },
    body: { en: "A baker bakes 20 loaves on day 1, 26 loaves on day 2 and 32 loaves on day 3. If the pattern continues, how many loaves are baked on day 4?", fr: "Un boulanger fait 20 pains le jour 1, 26 pains le jour 2 et 32 pains le jour 3. Si la suite continue, combien de pains fait-il le jour 4 ?" },
    options: { en: ["36 loaves", "38 loaves", "44 loaves", "4 loaves"], fr: ["36 pains", "38 pains", "44 pains", "4 pains"] },
    answer: 1,
    rules: { 0: [DIFFERENCE, "procedural_error"], 2: [DIFFERENCE, "procedural_error"], 3: [NO_UNITS, "misconception"] },
    code: P3_CODE,
    subskills: ["apply_rule_to_quantity"],
    criteria: ["demonstrates_apply_rule_to_quantity"],
    contexts: ["market"],
  },
  {
    key: "retention-walking",
    purpose: "retention",
    title: { en: "Walking Further", fr: "Marcher plus loin" },
    body: { en: "Abena walks 400 metres on Monday, 500 metres on Tuesday and 600 metres on Wednesday. If she keeps adding the same distance, how far will she walk on Friday?", fr: "Abena marche 400 mètres lundi, 500 mètres mardi et 600 mètres mercredi. Si elle ajoute toujours la même distance, quelle distance marchera-t-elle vendredi ?" },
    options: { en: ["700 metres", "800 metres", "1000 metres", "5 metres"], fr: ["700 mètres", "800 mètres", "1000 mètres", "5 mètres"] },
    answer: 1,
    rules: { 0: [ONE_STEP, "procedural_error"], 2: [DIFFERENCE, "procedural_error"], 3: [NO_UNITS, "misconception"] },
    code: P3_CODE,
    subskills: ["apply_rule_to_quantity"],
    criteria: ["demonstrates_apply_rule_to_quantity"],
    contexts: ["community"],
  },
  {
    key: "transfer-football",
    purpose: "transfer",
    title: { en: "Football Points", fr: "Des points au football" },
    body: { en: "A football team has 3 points after game 1, 6 points after game 2 and 9 points after game 3. If it keeps winning in the same way, how many points will it have after game 5?", fr: "Une équipe de football a 3 points après le match 1, 6 points après le match 2 et 9 points après le match 3. Si elle continue à gagner de la même façon, combien de points aura-t-elle après le match 5 ?" },
    options: { en: ["15 points", "12 points", "5 points", "18 points"], fr: ["15 points", "12 points", "5 points", "18 points"] },
    answer: 0,
    rules: { 1: [ONE_STEP, "procedural_error"], 2: [NO_UNITS, "misconception"], 3: [DIFFERENCE, "procedural_error"] },
    code: P3_CODE,
    subskills: ["connect_pattern_to_context", "apply_rule_to_quantity"],
    criteria: ["demonstrates_apply_rule_to_quantity"],
    contexts: ["sport"],
  },
  {
    key: "transfer-phone-credit",
    purpose: "transfer",
    title: { en: "Phone Credit", fr: "Le crédit de téléphone" },
    body: { en: "Kojo has 30 cedis of phone credit. He uses 4 cedis every day. After how many days will he have 10 cedis left?", fr: "Kojo a 30 cedis de crédit de téléphone. Il utilise 4 cedis chaque jour. Après combien de jours lui restera-t-il 10 cedis ?" },
    options: { en: ["4 days", "10 days", "5 days", "6 days"], fr: ["4 jours", "10 jours", "5 jours", "6 jours"] },
    answer: 2,
    rules: { 0: [ONE_STEP, "procedural_error"], 1: [NO_UNITS, "misconception"], 3: [DIFFERENCE, "procedural_error"] },
    code: "B4.2.1.3.1",
    subskills: ["connect_pattern_to_context", "explain_pattern_reasoning"],
    criteria: ["demonstrates_connect_pattern_to_context"],
    contexts: ["currency", "technology"],
  },
];

export const GHANA_B4_NUMBER_PATTERNS_AUTHORED_COMPETENCY_IDS = [
  "competency-gh-math-b4-number-patterns-001",
  "competency-gh-math-b4-number-patterns-002",
  "competency-gh-math-b4-number-patterns-003",
];

export const GHANA_B4_NUMBER_PATTERNS_AUTHORED_CONTENT = [
  ...buildTopic(
    {
      competencyId: GHANA_B4_NUMBER_PATTERNS_AUTHORED_COMPETENCY_IDS[0],
      slug: "number-patterns-001",
      version: "authored-number-patterns-001-1.0",
      source: SOURCE,
      defaultCode: P1_CODE,
    },
    P1_LESSONS,
    P1_PRACTICE,
    P1_QUESTIONS,
  ),
  ...buildTopic(
    {
      competencyId: GHANA_B4_NUMBER_PATTERNS_AUTHORED_COMPETENCY_IDS[1],
      slug: "number-patterns-002",
      version: "authored-number-patterns-002-1.0",
      source: SOURCE,
      defaultCode: P2_CODE,
    },
    P2_LESSONS,
    P2_PRACTICE,
    P2_QUESTIONS,
  ),
  ...buildTopic(
    {
      competencyId: GHANA_B4_NUMBER_PATTERNS_AUTHORED_COMPETENCY_IDS[2],
      slug: "number-patterns-003",
      version: "authored-number-patterns-003-1.0",
      source: SOURCE,
      defaultCode: P3_CODE,
    },
    P3_LESSONS,
    P3_PRACTICE,
    P3_QUESTIONS,
  ),
];
