import { buildTopic } from "./authored-builder";
import type { Lesson, Question, Rule } from "./authored-builder";

export const GHANA_B4_ROUNDING_AUTHORED_COMPETENCY_ID =
  "competency-gh-math-b4-rounding-001";

const WRONG_PLACE: Rule = ["rounds_using_wrong_place", "procedural_error"];
const DROPS: Rule = [
  "drops_digits_instead_of_rounding",
  "procedural_error",
];
const FIVE_DOWN: Rule = ["rounds_down_when_digit_is_5", "misconception"];

const LESSONS: Lesson[] = [
  {
    key: "lesson",
    type: "lesson",
    strategy: "direct_explanation",
    title: { en: "How to Round", fr: "Comment arrondir" },
    body: {
      en: "To round a number, first find the place you are rounding to. Then look at the digit just to its right. If that digit is 5 or more, round up: add 1 to the rounding digit. If it is 4 or less, keep the rounding digit as it is. Every digit to the right then becomes 0. For example, round 3,486 to the nearest hundred. The hundreds digit is 4. The digit to its right is 8, which is 5 or more, so the 4 becomes 5. Replace the tens and ones with 0. The answer is 3,500.",
      fr: "Pour arrondir un nombre, trouve d'abord la place à laquelle tu arrondis. Regarde ensuite le chiffre juste à sa droite. Si ce chiffre est 5 ou plus, arrondis par excès : ajoute 1 au chiffre de la place d'arrondi. S'il est 4 ou moins, garde ce chiffre tel quel. Tous les chiffres à droite deviennent alors 0. Par exemple, arrondis 3 486 à la centaine près. Le chiffre des centaines est 4. Le chiffre à sa droite est 8, qui est 5 ou plus, donc le 4 devient 5. Remplace les dizaines et les unités par 0. La réponse est 3 500.",
    },
  },
  {
    key: "example",
    type: "example",
    strategy: "worked_example",
    title: {
      en: "Worked Example: Nearest Ten",
      fr: "Exemple résolu : à la dizaine près",
    },
    body: {
      en: "Round 7,238 to the nearest ten. Step 1: the tens digit is 3. Step 2: look at the ones digit, 8. It is 5 or more, so we round up. Step 3: the 3 becomes 4 and the ones become 0. The answer is 7,240.",
      fr: "Arrondis 7 238 à la dizaine près. Étape 1 : le chiffre des dizaines est 3. Étape 2 : regarde le chiffre des unités, 8. Il est 5 ou plus, donc on arrondit par excès. Étape 3 : le 3 devient 4 et les unités deviennent 0. La réponse est 7 240.",
    },
  },
  {
    key: "scaffold",
    type: "scaffold",
    strategy: "step_by_step_scaffold",
    title: { en: "Round Step by Step", fr: "Arrondis pas à pas" },
    body: {
      en: "Let us round 2,650 to the nearest thousand one step at a time. Step 1: underline the thousands digit, 2. Step 2: look at the digit to its right, in the hundreds place: 6. Step 3: 6 is 5 or more, so add 1 to the 2 to make 3. Step 4: make the hundreds, tens and ones 0. The answer is 3,000. Check: 2,650 is closer to 3,000 than to 2,000.",
      fr: "Arrondissons 2 650 au millier près, pas à pas. Étape 1 : souligne le chiffre des milliers, 2. Étape 2 : regarde le chiffre à sa droite, aux centaines : 6. Étape 3 : 6 est 5 ou plus, donc ajoute 1 au 2 pour obtenir 3. Étape 4 : remplace les centaines, les dizaines et les unités par 0. La réponse est 3 000. Vérification : 2 650 est plus proche de 3 000 que de 2 000.",
    },
  },
  {
    key: "remediation",
    type: "remediation",
    strategy: "error_analysis",
    title: { en: "Check Your Thinking", fr: "Vérifie ta réflexion" },
    body: {
      en: "Two slips are common. The first is looking at the wrong digit. To round to the nearest hundred, look at the tens digit, not the ones digit. The second is dropping the digits on the right without rounding. Take 4,362 rounded to the nearest hundred. The tens digit is 6, so we round up to 4,400, not down to 4,300. The 4 in the thousands place does not change. Only the rounding digit can change, and the digits to its right become 0.",
      fr: "Deux erreurs sont fréquentes. La première est de regarder le mauvais chiffre. Pour arrondir à la centaine près, regarde le chiffre des dizaines, pas celui des unités. La seconde est de supprimer les chiffres de droite sans arrondir. Prenons 4 362 arrondi à la centaine près. Le chiffre des dizaines est 6, donc on arrondit par excès à 4 400, et non à 4 300. Le 4 des milliers ne change pas. Seul le chiffre de la place d'arrondi peut changer, et les chiffres à sa droite deviennent 0.",
    },
  },
];

const PRACTICE: Question = {
  key: "practice",
  title: { en: "Practise Rounding", fr: "Entraîne-toi à arrondir" },
  body: {
    en: "A shop in Accra sold 2,468 bags of rice. Round this number to the nearest hundred.",
    fr: "Un magasin d'Accra a vendu 2 468 sacs de riz. Arrondis ce nombre à la centaine près.",
  },
  options: {
    en: ["2,500", "2,400", "2,470", "2,000"],
    fr: ["2 500", "2 400", "2 470", "2 000"],
  },
  answer: 0,
  rules: { 1: DROPS, 2: WRONG_PLACE, 3: WRONG_PLACE },
  code: "B4.1.1.1.5",
  subskills: ["round_whole_number"],
  criteria: ["rounds_whole_number_correctly"],
  contexts: ["market"],
};

const QUESTIONS: Question[] = [
  {
    key: "diagnostic-hundred",
    purpose: "diagnostic",
    title: { en: "Round to the Hundred", fr: "Arrondir à la centaine" },
    body: {
      en: "Round 3,486 to the nearest hundred.",
      fr: "Arrondis 3 486 à la centaine près.",
    },
    options: {
      en: ["3,500", "3,400", "3,490", "3,000"],
      fr: ["3 500", "3 400", "3 490", "3 000"],
    },
    answer: 0,
    rules: { 1: DROPS, 2: WRONG_PLACE, 3: WRONG_PLACE },
    code: "B4.1.1.1.5",
    subskills: ["identify_rounding_place", "round_whole_number"],
    criteria: ["rounds_whole_number_correctly"],
    contexts: ["abstract"],
  },
  {
    key: "diagnostic-thousand",
    purpose: "diagnostic",
    title: { en: "Round to the Thousand", fr: "Arrondir au millier" },
    body: {
      en: "Round 6,517 to the nearest thousand.",
      fr: "Arrondis 6 517 au millier près.",
    },
    options: {
      en: ["7,000", "6,000", "6,500", "6,520"],
      fr: ["7 000", "6 000", "6 500", "6 520"],
    },
    answer: 0,
    rules: { 1: FIVE_DOWN, 2: WRONG_PLACE, 3: WRONG_PLACE },
    code: "B4.1.1.1.5",
    subskills: ["use_nearest_benchmark", "round_whole_number"],
    criteria: ["rounds_whole_number_correctly"],
    contexts: ["abstract"],
  },
  {
    key: "reassess-ten",
    purpose: "reassessment",
    title: { en: "Round to the Ten", fr: "Arrondir à la dizaine" },
    body: {
      en: "Round 4,729 to the nearest ten.",
      fr: "Arrondis 4 729 à la dizaine près.",
    },
    options: {
      en: ["4,730", "4,720", "4,700", "4,800"],
      fr: ["4 730", "4 720", "4 700", "4 800"],
    },
    answer: 0,
    rules: { 1: DROPS, 2: WRONG_PLACE, 3: WRONG_PLACE },
    code: "B4.1.1.1.5",
    subskills: ["identify_rounding_place", "round_whole_number"],
    criteria: ["rounds_whole_number_correctly"],
    contexts: ["abstract"],
  },
  {
    key: "reassess-thousand",
    purpose: "reassessment",
    title: { en: "Round to the Thousand Again", fr: "Arrondir au millier, encore" },
    body: {
      en: "Round 8,350 to the nearest thousand.",
      fr: "Arrondis 8 350 au millier près.",
    },
    options: {
      en: ["8,000", "9,000", "8,400", "8,300"],
      fr: ["8 000", "9 000", "8 400", "8 300"],
    },
    answer: 0,
    rules: { 1: WRONG_PLACE, 2: WRONG_PLACE, 3: DROPS },
    code: "B4.1.1.1.5",
    subskills: ["use_nearest_benchmark", "round_whole_number"],
    criteria: ["rounds_whole_number_correctly"],
    contexts: ["abstract"],
  },
  {
    key: "retain-hundred",
    purpose: "retention",
    title: { en: "Remember to Round", fr: "Souviens-toi d'arrondir" },
    body: {
      en: "Without looking back at the lesson, round 2,951 to the nearest hundred.",
      fr: "Sans revoir la leçon, arrondis 2 951 à la centaine près.",
    },
    options: {
      en: ["3,000", "2,900", "2,950", "2,000"],
      fr: ["3 000", "2 900", "2 950", "2 000"],
    },
    answer: 0,
    rules: { 1: DROPS, 2: WRONG_PLACE, 3: WRONG_PLACE },
    code: "B4.1.1.1.5",
    subskills: ["identify_rounding_place", "round_whole_number"],
    criteria: ["rounds_whole_number_correctly"],
    contexts: ["abstract"],
  },
  {
    key: "retain-ten",
    purpose: "retention",
    title: { en: "Remember the Ten", fr: "Souviens-toi de la dizaine" },
    body: {
      en: "Round 9,847 to the nearest ten.",
      fr: "Arrondis 9 847 à la dizaine près.",
    },
    options: {
      en: ["9,850", "9,840", "9,900", "10,000"],
      fr: ["9 850", "9 840", "9 900", "10 000"],
    },
    answer: 0,
    rules: { 1: DROPS, 2: WRONG_PLACE, 3: WRONG_PLACE },
    code: "B4.1.1.1.5",
    subskills: ["identify_rounding_place", "round_whole_number"],
    criteria: ["rounds_whole_number_correctly"],
    contexts: ["abstract"],
  },
  {
    key: "transfer-books",
    purpose: "transfer",
    title: { en: "Exercise Books Report", fr: "Le rapport sur les cahiers" },
    body: {
      en: "A school has 4,362 exercise books. The head teacher reports the number to the nearest hundred. What number does she report?",
      fr: "Une école a 4 362 cahiers. La directrice annonce le nombre à la centaine près. Quel nombre annonce-t-elle ?",
    },
    options: {
      en: ["4,400", "4,300", "4,360", "4,000"],
      fr: ["4 400", "4 300", "4 360", "4 000"],
    },
    answer: 0,
    rules: { 1: DROPS, 2: WRONG_PLACE, 3: WRONG_PLACE },
    code: "B4.1.1.1.5",
    subskills: ["round_whole_number"],
    criteria: ["rounds_whole_number_correctly"],
    contexts: ["school"],
  },
  {
    key: "transfer-bus",
    purpose: "transfer",
    title: { en: "Bus Passengers", fr: "Les passagers du bus" },
    body: {
      en: "A bus company carried 5,650 passengers this month. Round this number to the nearest thousand.",
      fr: "Une compagnie de bus a transporté 5 650 passagers ce mois-ci. Arrondis ce nombre au millier près.",
    },
    options: {
      en: ["6,000", "5,000", "5,700", "5,600"],
      fr: ["6 000", "5 000", "5 700", "5 600"],
    },
    answer: 0,
    rules: { 1: DROPS, 2: WRONG_PLACE, 3: WRONG_PLACE },
    code: "B4.1.1.1.5",
    subskills: ["use_nearest_benchmark", "round_whole_number"],
    criteria: ["rounds_whole_number_correctly"],
    contexts: ["transport"],
  },
];

export const GHANA_B4_ROUNDING_AUTHORED_CONTENT = buildTopic(
  {
    competencyId: GHANA_B4_ROUNDING_AUTHORED_COMPETENCY_ID,
    slug: "rounding-001",
    version: "authored-rounding-1.0",
    source: "NaCCA Mathematics Curriculum, Basic 4",
    defaultCode: "B4.1.1.1.5",
  },
  LESSONS,
  PRACTICE,
  QUESTIONS,
);
