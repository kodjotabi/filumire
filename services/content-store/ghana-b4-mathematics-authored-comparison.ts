import { buildTopic } from "./authored-builder";
import type { Lesson, Question, Rule } from "./authored-builder";

export const GHANA_B4_COMPARISON_AUTHORED_COMPETENCY_ID =
  "competency-gh-math-b4-whole-number-comparison-001";

const WRONG_END: Rule = [
  "compares_digits_from_the_wrong_end",
  "procedural_error",
];
const DIGIT_COUNT: Rule = [
  "compares_numbers_by_digit_count_only",
  "misconception",
];
const REVERSED: Rule = [
  "reverses_less_than_and_greater_than_symbols",
  "misconception",
];

const LESSONS: Lesson[] = [
  {
    key: "lesson",
    type: "lesson",
    strategy: "direct_explanation",
    title: { en: "Comparing Numbers", fr: "Comparer des nombres" },
    body: {
      en: "To compare two numbers, start from the left, at the biggest place. A number with more digits is greater. If both numbers have the same number of digits, compare the digits from the left, one place at a time. The first place where the digits differ decides which number is greater. Compare 4,215 and 4,512. Both have 4 digits and the thousands are the same. In the hundreds, 2 is less than 5, so 4,215 < 4,512. The symbol < means is less than and > means is greater than. The open side of the symbol faces the greater number.",
      fr: "Pour comparer deux nombres, commence par la gauche, à la plus grande place. Un nombre qui a plus de chiffres est plus grand. Si les deux nombres ont le même nombre de chiffres, compare les chiffres de gauche à droite, une place à la fois. La première place où les chiffres sont différents décide quel nombre est le plus grand. Compare 4 215 et 4 512. Les deux ont 4 chiffres et les milliers sont les mêmes. Aux centaines, 2 est plus petit que 5, donc 4 215 < 4 512. Le symbole < veut dire plus petit que et > veut dire plus grand que. L'ouverture du symbole est tournée vers le plus grand nombre.",
    },
  },
  {
    key: "example",
    type: "example",
    strategy: "worked_example",
    title: {
      en: "Worked Example: Put Numbers in Order",
      fr: "Exemple résolu : ranger des nombres",
    },
    body: {
      en: "Put 3,205; 3,025 and 3,520 in order from smallest to greatest. Step 1: all three numbers have 4 digits and the same thousands digit, 3. Step 2: compare the hundreds: 2, 0 and 5. The smallest is 0, then 2, then 5. Step 3: write them in order: 3,025; 3,205; 3,520.",
      fr: "Range 3 205 ; 3 025 et 3 520 du plus petit au plus grand. Étape 1 : les trois nombres ont 4 chiffres et le même chiffre des milliers, 3. Étape 2 : compare les centaines : 2, 0 et 5. Le plus petit est 0, puis 2, puis 5. Étape 3 : écris-les dans l'ordre : 3 025 ; 3 205 ; 3 520.",
    },
  },
  {
    key: "scaffold",
    type: "scaffold",
    strategy: "step_by_step_scaffold",
    title: { en: "Compare Step by Step", fr: "Compare pas à pas" },
    body: {
      en: "Let us compare 6,340 and 6,304 one step at a time. Write them in a place value chart, one under the other: thousands 6 and 6, hundreds 3 and 3, tens 4 and 0, ones 0 and 4. Start from the left. The thousands are equal. The hundreds are equal. In the tens, 4 is greater than 0. So 6,340 is greater than 6,304. Remember, never decide using the ones digit first.",
      fr: "Comparons 6 340 et 6 304 pas à pas. Écris-les dans un tableau de numération, l'un sous l'autre : milliers 6 et 6, centaines 3 et 3, dizaines 4 et 0, unités 0 et 4. Commence par la gauche. Les milliers sont égaux. Les centaines sont égales. Aux dizaines, 4 est plus grand que 0. Donc 6 340 est plus grand que 6 304. Souviens-toi : ne décide jamais avec le chiffre des unités en premier.",
    },
  },
  {
    key: "remediation",
    type: "remediation",
    strategy: "error_analysis",
    title: { en: "Check Your Thinking", fr: "Vérifie ta réflexion" },
    body: {
      en: "Some learners compare numbers by looking at the last digit, or say two numbers are equal because they have the same number of digits. Both are mistakes. The biggest places matter most, so always start from the left. For 4,215 and 4,512, the ones digits are 5 and 2, but that decides nothing. The hundreds decide: 2 is less than 5, so 4,215 < 4,512. For the symbols, picture a mouth that opens towards the greater number.",
      fr: "Certains élèves comparent les nombres en regardant le dernier chiffre, ou disent que deux nombres sont égaux parce qu'ils ont le même nombre de chiffres. Ce sont deux erreurs. Les plus grandes places comptent le plus, alors commence toujours par la gauche. Pour 4 215 et 4 512, les chiffres des unités sont 5 et 2, mais cela ne décide rien. Ce sont les centaines qui décident : 2 est plus petit que 5, donc 4 215 < 4 512. Pour les symboles, imagine une bouche qui s'ouvre vers le plus grand nombre.",
    },
  },
];

const PRACTICE: Question = {
  key: "practice",
  title: { en: "Practise Comparing", fr: "Entraîne-toi à comparer" },
  body: {
    en: "Kofi has 3,408 cedis and Ama has 3,480 cedis. Who has more money?",
    fr: "Kofi a 3 408 cédis et Ama a 3 480 cédis. Qui a le plus d'argent ?",
  },
  options: {
    en: ["Kofi", "Ama", "They have the same amount"],
    fr: ["Kofi", "Ama", "Ils ont la même somme"],
  },
  answer: 1,
  rules: { 0: WRONG_END, 2: DIGIT_COUNT },
  code: "B4.1.1.1.4",
  subskills: ["compare_place_values"],
  criteria: ["compares_numbers_using_place_value"],
  contexts: ["money"],
};
const SAME_DIGITS_EN = "They are equal because both have 4 digits";
const SAME_DIGITS_FR = "Ils sont égaux parce qu'ils ont tous les deux 4 chiffres";

const QUESTIONS: Question[] = [
  {
    key: "diagnostic-compare",
    purpose: "diagnostic",
    title: { en: "Which Is Greater?", fr: "Lequel est le plus grand ?" },
    body: {
      en: "Which number is greater, 4,215 or 4,512?",
      fr: "Quel nombre est le plus grand, 4 215 ou 4 512 ?",
    },
    options: {
      en: ["4,215", "4,512", SAME_DIGITS_EN],
      fr: ["4 215", "4 512", SAME_DIGITS_FR],
    },
    answer: 1,
    rules: { 0: WRONG_END, 2: DIGIT_COUNT },
    code: "B4.1.1.1.4",
    subskills: ["compare_place_values"],
    criteria: ["compares_numbers_using_place_value"],
    contexts: ["abstract"],
  },
  {
    key: "diagnostic-symbol",
    purpose: "diagnostic",
    title: { en: "Choose the Symbol", fr: "Choisis le symbole" },
    body: {
      en: "Which symbol makes this true? 3,072 __ 3,785",
      fr: "Quel symbole rend cette phrase vraie ? 3 072 __ 3 785",
    },
    options: { en: ["<", ">", "="], fr: ["<", ">", "="] },
    answer: 0,
    rules: { 1: REVERSED, 2: DIGIT_COUNT },
    code: "B4.1.1.1.4",
    subskills: ["use_comparison_symbols"],
    criteria: ["uses_comparison_symbols_correctly"],
    contexts: ["abstract"],
  },
  {
    key: "reassess-compare",
    purpose: "reassessment",
    title: { en: "Which Is Greater Again?", fr: "Lequel est le plus grand, encore ?" },
    body: {
      en: "Which number is greater, 6,340 or 6,304?",
      fr: "Quel nombre est le plus grand, 6 340 ou 6 304 ?",
    },
    options: {
      en: ["6,340", "6,304", SAME_DIGITS_EN],
      fr: ["6 340", "6 304", SAME_DIGITS_FR],
    },
    answer: 0,
    rules: { 1: WRONG_END, 2: DIGIT_COUNT },
    code: "B4.1.1.1.4",
    subskills: ["compare_place_values"],
    criteria: ["compares_numbers_using_place_value"],
    contexts: ["abstract"],
  },
  {
    key: "reassess-symbol",
    purpose: "reassessment",
    title: { en: "Choose the Symbol Again", fr: "Choisis le symbole, encore" },
    body: {
      en: "Which symbol makes this true? 7,125 __ 7,093",
      fr: "Quel symbole rend cette phrase vraie ? 7 125 __ 7 093",
    },
    options: { en: ["<", ">", "="], fr: ["<", ">", "="] },
    answer: 1,
    rules: { 0: REVERSED, 2: DIGIT_COUNT },
    code: "B4.1.1.1.4",
    subskills: ["use_comparison_symbols"],
    criteria: ["uses_comparison_symbols_correctly"],
    contexts: ["abstract"],
  },
  {
    key: "retain-order",
    purpose: "retention",
    title: { en: "Put in Order", fr: "Range dans l'ordre" },
    body: {
      en: "Which list shows the numbers from smallest to greatest? 3,205; 3,025; 3,520",
      fr: "Quelle liste range les nombres du plus petit au plus grand ? 3 205 ; 3 025 ; 3 520",
    },
    options: {
      en: [
        "3,025; 3,205; 3,520",
        "3,520; 3,205; 3,025",
        "3,205; 3,025; 3,520",
        "3,025; 3,520; 3,205",
      ],
      fr: [
        "3 025 ; 3 205 ; 3 520",
        "3 520 ; 3 205 ; 3 025",
        "3 205 ; 3 025 ; 3 520",
        "3 025 ; 3 520 ; 3 205",
      ],
    },
    answer: 0,
    rules: {
      1: ["orders_greatest_to_smallest_instead", "misconception"],
      2: ["compares_digits_in_wrong_order", "procedural_error"],
      3: ["misorders_hundreds_digits", "procedural_error"],
    },
    code: "B4.1.1.1.4",
    subskills: ["order_whole_numbers"],
    criteria: ["orders_whole_numbers_correctly"],
    contexts: ["abstract"],
  },
  {
    key: "retain-symbol",
    purpose: "retention",
    title: { en: "Remember the Symbol", fr: "Souviens-toi du symbole" },
    body: {
      en: "Without looking back at the lesson, which symbol makes this true? 5,309 __ 5,268",
      fr: "Sans revoir la leçon, quel symbole rend cette phrase vraie ? 5 309 __ 5 268",
    },
    options: { en: ["<", ">", "="], fr: ["<", ">", "="] },
    answer: 1,
    rules: { 0: REVERSED, 2: DIGIT_COUNT },
    code: "B4.1.1.1.4",
    subskills: ["use_comparison_symbols"],
    criteria: ["uses_comparison_symbols_correctly"],
    contexts: ["abstract"],
  },
  {
    key: "transfer-books",
    purpose: "transfer",
    title: { en: "School Books", fr: "Les livres de l'école" },
    body: {
      en: "One school has 2,450 books. Another school has 2,540 books. Which school has more books?",
      fr: "Une école a 2 450 livres. Une autre école a 2 540 livres. Quelle école a le plus de livres ?",
    },
    options: {
      en: [
        "The school with 2,450 books",
        "The school with 2,540 books",
        "They have the same number because both numbers have 4 digits",
      ],
      fr: [
        "L'école qui a 2 450 livres",
        "L'école qui a 2 540 livres",
        "Elles en ont autant parce que les deux nombres ont 4 chiffres",
      ],
    },
    answer: 1,
    rules: { 0: WRONG_END, 2: DIGIT_COUNT },
    code: "B4.1.1.1.4",
    subskills: ["compare_place_values"],
    criteria: ["compares_numbers_using_place_value"],
    contexts: ["school"],
  },
  {
    key: "transfer-order",
    purpose: "transfer",
    title: { en: "Mango Sellers", fr: "Les vendeurs de mangues" },
    body: {
      en: "Three traders sold 1,205, 1,052 and 1,520 mangoes. Which trader sold the fewest mangoes?",
      fr: "Trois commerçants ont vendu 1 205, 1 052 et 1 520 mangues. Quel commerçant a vendu le moins de mangues ?",
    },
    options: {
      en: [
        "The trader who sold 1,205",
        "The trader who sold 1,052",
        "The trader who sold 1,520",
      ],
      fr: [
        "Le commerçant qui a vendu 1 205",
        "Le commerçant qui a vendu 1 052",
        "Le commerçant qui a vendu 1 520",
      ],
    },
    answer: 1,
    rules: {
      0: ["ignores_zero_placeholder_value", "procedural_error"],
      2: WRONG_END,
    },
    code: "B4.1.1.1.4",
    subskills: ["order_whole_numbers"],
    criteria: ["orders_whole_numbers_correctly"],
    contexts: ["market"],
  },
];

export const GHANA_B4_COMPARISON_AUTHORED_CONTENT = buildTopic(
  {
    competencyId: GHANA_B4_COMPARISON_AUTHORED_COMPETENCY_ID,
    slug: "whole-number-comparison-001",
    version: "authored-comparison-1.0",
    source: "NaCCA Mathematics Curriculum, Basic 4",
    defaultCode: "B4.1.1.1.4",
  },
  LESSONS,
  PRACTICE,
  QUESTIONS,
);