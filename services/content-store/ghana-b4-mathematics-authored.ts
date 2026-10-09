import type { LearningContent } from "../../packages/content";

const COMPETENCY = "competency-gh-math-b4-place-value-001";
const SOURCE = "NaCCA Mathematics Curriculum, Basic 4";
const VERSION = "authored-place-value-1.0";
const now = new Date().toISOString();

type Lang = "en" | "fr";
type Purpose = "diagnostic" | "reassessment" | "retention" | "transfer";
type State =
  | "conceptual_misunderstanding"
  | "procedural_error"
  | "misconception";
type Rule = readonly [string, State];
type Text = { en: string; fr: string };

type Question = {
  key: string;
  purpose?: Purpose;
  title: Text;
  body: Text;
  options: { en: string[]; fr: string[] };
  answer: number;
  rules: Record<number, Rule>;
  code: string;
  subskills: string[];
  criteria: string[];
  contexts: string[];
};

type Lesson = {
  key: string;
  type: "lesson" | "example" | "scaffold" | "remediation";
  strategy:
    | "direct_explanation"
    | "worked_example"
    | "step_by_step_scaffold"
    | "error_analysis";
  title: Text;
  body: Text;
};

const LANGS: Lang[] = ["en", "fr"];

function contentId(key: string, lang: Lang): string {
  return `content-gh-b4-place-value-001-${key}-${lang}`;
}

function baseMeta(code: string, contexts: string[]) {
  return {
    curriculumNodeCode: code,
    curriculumSource: SOURCE,
    contextTags: JSON.stringify(contexts),
  };
}

function lessonItem(item: Lesson, lang: Lang): LearningContent {
  return {
    id: contentId(item.key, lang),
    competencyId: COMPETENCY,
    type: item.type,
    title: item.title[lang],
    body: item.body[lang],
    language: lang,
    teachingStrategy: item.strategy,
    translationOfContentId:
      lang === "fr" ? contentId(item.key, "en") : undefined,
    metadata: baseMeta("B4.1.1.1.1", ["abstract"]),
    version: VERSION,
    createdAt: now,
    updatedAt: now,
  };
}

function questionItem(
  q: Question,
  lang: Lang,
  type: "assessment" | "practice",
): LearningContent {
  const options = q.options[lang];
  const diagnosticRules: Record<
    string,
    {
      errorPattern: string;
      diagnosticState: State;
      diagnosticConfidence: number;
    }
  > = {};

  for (const [index, rule] of Object.entries(q.rules)) {
    diagnosticRules[options[Number(index)]] = {
      errorPattern: rule[0],
      diagnosticState: rule[1],
      diagnosticConfidence: 0.8,
    };
  }

  const metadata: Record<string, string> = {
    ...baseMeta(q.code, q.contexts),
    options: JSON.stringify(options),
    expectedResponse: options[q.answer],
    diagnosticRules: JSON.stringify(diagnosticRules),
    evidenceProfile: "conceptual_understanding",
    successCriteria: JSON.stringify(q.criteria),
    targetSubskills: JSON.stringify(q.subskills),
  };

  if (q.purpose) {
    metadata.assessmentPurpose = q.purpose;
  }

  return {
    id: contentId(q.key, lang),
    competencyId: COMPETENCY,
    type,
    title: q.title[lang],
    body: q.body[lang],
    language: lang,
    teachingStrategy: type === "practice" ? "guided_practice" : undefined,
    assessmentStrategy: "multiple_choice",
    assessmentItemId: `item-gh-b4-place-value-001-${q.key}-${lang}`,
    translationOfContentId:
      lang === "fr" ? contentId(q.key, "en") : undefined,
    prerequisiteContentIds:
      type === "practice" ? [contentId("lesson", lang)] : undefined,
    metadata,
    version: VERSION,
    createdAt: now,
    updatedAt: now,
  };
}

const LESSONS: Lesson[] = [
  {
    key: "lesson",
    type: "lesson",
    strategy: "direct_explanation",
    title: {
      en: "Every Digit Has a Place",
      fr: "Chaque chiffre a une place",
    },
    body: {
      en: "In a number, the place of a digit tells you its value. Take 54,307. The 5 is in the ten thousands place, so it is worth 50,000. The 4 is in the thousands place, so it is worth 4,000. The 3 is worth 300, the 0 means there are no tens, and the 7 is worth 7. We read it as fifty-four thousand, three hundred and seven. The digit 0 is a placeholder. It keeps the other digits in their correct places, so never leave it out.",
      fr: "Dans un nombre, la place d'un chiffre indique sa valeur. Prenons 54 307. Le 5 est à la place des dizaines de mille, il vaut donc 50 000. Le 4 est à la place des milliers, il vaut 4 000. Le 3 vaut 300, le 0 signifie qu'il n'y a pas de dizaines, et le 7 vaut 7. On lit : cinquante-quatre mille trois cent sept. Le chiffre 0 garde la place. Il maintient les autres chiffres à leur bonne position, ne l'oublie jamais.",
    },
  },
  {
    key: "example",
    type: "example",
    strategy: "worked_example",
    title: {
      en: "Worked Example: Value of a Digit",
      fr: "Exemple résolu : la valeur d'un chiffre",
    },
    body: {
      en: "Find the value of the digit 6 in 26,148. Step 1: write the places under the digits: 2 ten thousands, 6 thousands, 1 hundred, 4 tens, 8 ones. Step 2: the 6 is in the thousands place. Step 3: the value is 6 x 1,000 = 6,000. The digit is 6, but its value is 6,000.",
      fr: "Trouve la valeur du chiffre 6 dans 26 148. Étape 1 : écris les places sous les chiffres : 2 dizaines de mille, 6 milliers, 1 centaine, 4 dizaines, 8 unités. Étape 2 : le 6 est à la place des milliers. Étape 3 : la valeur est 6 x 1 000 = 6 000. Le chiffre est 6, mais sa valeur est 6 000.",
    },
  },
  {
    key: "scaffold",
    type: "scaffold",
    strategy: "step_by_step_scaffold",
    title: {
      en: "Use a Place Value Chart",
      fr: "Utilise un tableau de numération",
    },
    body: {
      en: "Let us do it one step at a time. Put the number 3,452 in a place value chart: thousands 3, hundreds 4, tens 5, ones 2. Now say the value of each digit: 3,000, 400, 50 and 2. Put them together: 3,000 + 400 + 50 + 2 = 3,452. To find the value of any digit, find its column first, then say the name of the column.",
      fr: "Avançons pas à pas. Place le nombre 3 452 dans un tableau de numération : milliers 3, centaines 4, dizaines 5, unités 2. Dis maintenant la valeur de chaque chiffre : 3 000, 400, 50 et 2. Assemble : 3 000 + 400 + 50 + 2 = 3 452. Pour trouver la valeur d'un chiffre, trouve d'abord sa colonne, puis dis le nom de la colonne.",
    },
  },
  {
    key: "remediation",
    type: "remediation",
    strategy: "error_analysis",
    title: {
      en: "Check Your Thinking",
      fr: "Vérifie ta réflexion",
    },
    body: {
      en: "Many learners say the value of the 4 in 54,307 is 4, because the digit is 4. But a digit and its value are different things. The digit tells you which number it is. The place tells you what it is worth. Here the 4 is in the thousands place, so it is worth 4,000. Another common slip is leaving out the zero when writing fifty-four thousand, three hundred and seven. Say it in parts: 54 thousand, 3 hundred, no tens, 7 ones. Then write 54,307. The zero holds the tens place.",
      fr: "Beaucoup d'élèves disent que la valeur du 4 dans 54 307 est 4, parce que le chiffre est 4. Mais un chiffre et sa valeur sont deux choses différentes. Le chiffre dit de quel nombre il s'agit. La place dit ce qu'il vaut. Ici le 4 est à la place des milliers, il vaut donc 4 000. Une autre erreur fréquente est d'oublier le zéro en écrivant cinquante-quatre mille trois cent sept. Dis-le par parties : 54 mille, 3 centaines, aucune dizaine, 7 unités. Écris ensuite 54 307. Le zéro garde la place des dizaines.",
    },
  },
];
const PRACTICE: Question = {
  key: "practice",
  title: {
    en: "Practise Digit Values",
    fr: "Entraîne-toi aux valeurs des chiffres",
  },
  body: {
    en: "A trader in Kumasi counted 23,456 mangoes at the market. What is the value of the digit 3 in 23,456?",
    fr: "Une commerçante de Kumasi a compté 23 456 mangues au marché. Quelle est la valeur du chiffre 3 dans 23 456 ?",
  },
  options: {
    en: ["3", "30", "300", "3,000"],
    fr: ["3", "30", "300", "3 000"],
  },
  answer: 3,
  rules: {
    0: ["confuses_digit_with_place_value", "conceptual_misunderstanding"],
    1: ["place_name_misidentified", "procedural_error"],
    2: ["place_name_misidentified", "procedural_error"],
  },
  code: "B4.1.1.1.1",
  subskills: ["model_place_value"],
  criteria: ["states_digit_value_correctly"],
  contexts: ["market"],
};

const VALUE_RULES: Record<number, Rule> = {
  0: ["confuses_digit_with_place_value", "conceptual_misunderstanding"],
  1: ["place_name_misidentified", "procedural_error"],
  2: ["place_name_misidentified", "procedural_error"],
  3: ["place_name_misidentified", "procedural_error"],
};

function valueRules(answer: number): Record<number, Rule> {
  const rules: Record<number, Rule> = { ...VALUE_RULES };
  delete rules[answer];
  return rules;
}

const VALUE_CRITERIA = [
  "identifies_digit_place_correctly",
  "states_digit_value_correctly",
];

const QUESTIONS: Question[] = [
  {
    key: "diagnostic-value",
    purpose: "diagnostic",
    title: { en: "Value of a Digit", fr: "Valeur d'un chiffre" },
    body: {
      en: "In 54,307, what is the value of the digit 4?",
      fr: "Dans 54 307, quelle est la valeur du chiffre 4 ?",
    },
    options: {
      en: ["4", "40", "400", "4,000"],
      fr: ["4", "40", "400", "4 000"],
    },
    answer: 3,
    rules: valueRules(3),
    code: "B4.1.1.1.1",
    subskills: ["model_place_value"],
    criteria: VALUE_CRITERIA,
    contexts: ["abstract"],
  },
  {
    key: "diagnostic-write",
    purpose: "diagnostic",
    title: { en: "Write the Number", fr: "Écris le nombre" },
    body: {
      en: "Which number is fifty-four thousand, three hundred and seven?",
      fr: "Quel nombre s'écrit cinquante-quatre mille trois cent sept ?",
    },
    options: {
      en: ["54,307", "54,37", "54,370", "5,437"],
      fr: ["54 307", "54 37", "54 370", "5 437"],
    },
    answer: 0,
    rules: {
      1: ["omits_zero_placeholders", "misconception"],
      2: ["zero_placed_in_wrong_position", "procedural_error"],
      3: ["thousands_group_ignored", "conceptual_misunderstanding"],
    },
    code: "B4.1.1.1.2",
    subskills: ["write_whole_numbers"],
    criteria: ["writes_whole_number_correctly"],
    contexts: ["abstract"],
  },
  {
    key: "reassess-value",
    purpose: "reassessment",
    title: { en: "Value of a Digit Again", fr: "Valeur d'un chiffre encore" },
    body: {
      en: "In 82,416, what is the value of the digit 2?",
      fr: "Dans 82 416, quelle est la valeur du chiffre 2 ?",
    },
    options: {
      en: ["2", "20", "200", "2,000"],
      fr: ["2", "20", "200", "2 000"],
    },
    answer: 3,
    rules: valueRules(3),
    code: "B4.1.1.1.1",
    subskills: ["model_place_value"],
    criteria: VALUE_CRITERIA,
    contexts: ["abstract"],
  },
  {
    key: "reassess-write",
    purpose: "reassessment",
    title: { en: "Write the Number Again", fr: "Écris le nombre encore" },
    body: {
      en: "Which number is eighty-two thousand, four hundred and sixteen?",
      fr: "Quel nombre s'écrit quatre-vingt-deux mille quatre cent seize ?",
    },
    options: {
      en: ["82,416", "82,40016", "820,416", "82,461"],
      fr: ["82 416", "82 40016", "820 416", "82 461"],
    },
    answer: 0,
    rules: {
      1: [
        "joins_number_parts_instead_of_adding_place_values",
        "misconception",
      ],
      2: ["thousands_group_misplaced", "procedural_error"],
      3: ["digit_order_swapped", "procedural_error"],
    },
    code: "B4.1.1.1.2",
    subskills: ["write_whole_numbers"],
    criteria: ["writes_whole_number_correctly"],
    contexts: ["abstract"],
  },  {
    key: "retain-value",
    purpose: "retention",
    title: { en: "Remember the Value", fr: "Souviens-toi de la valeur" },
    body: {
      en: "Without looking back at the lesson, what is the value of the digit 4 in 70,418?",
      fr: "Sans revoir la leçon, quelle est la valeur du chiffre 4 dans 70 418 ?",
    },
    options: {
      en: ["4", "40", "400", "4,000"],
      fr: ["4", "40", "400", "4 000"],
    },
    answer: 2,
    rules: valueRules(2),
    code: "B4.1.1.1.1",
    subskills: ["model_place_value"],
    criteria: VALUE_CRITERIA,
    contexts: ["abstract"],
  },
  {
    key: "retain-write",
    purpose: "retention",
    title: { en: "Remember to Write", fr: "Souviens-toi d'écrire" },
    body: {
      en: "Which number is seventy thousand, four hundred and eighteen?",
      fr: "Quel nombre s'écrit soixante-dix mille quatre cent dix-huit ?",
    },
    options: {
      en: ["70,418", "7,418", "70,480", "70,4018"],
      fr: ["70 418", "7 418", "70 480", "70 4018"],
    },
    answer: 0,
    rules: {
      1: ["omits_zero_placeholders", "misconception"],
      2: ["confuses_teen_and_ty_number_words", "misconception"],
      3: [
        "joins_number_parts_instead_of_adding_place_values",
        "misconception",
      ],
    },
    code: "B4.1.1.1.2",
    subskills: ["write_whole_numbers"],
    criteria: ["writes_whole_number_correctly"],
    contexts: ["abstract"],
  },
  {
    key: "transfer-value",
    purpose: "transfer",
    title: { en: "Exercise Books", fr: "Les cahiers" },
    body: {
      en: "A school recorded 36,205 exercise books. What is the value of the digit 6 in this number?",
      fr: "Une école a enregistré 36 205 cahiers. Quelle est la valeur du chiffre 6 dans ce nombre ?",
    },
    options: {
      en: ["6", "60", "600", "6,000"],
      fr: ["6", "60", "600", "6 000"],
    },
    answer: 3,
    rules: valueRules(3),
    code: "B4.1.1.1.1",
    subskills: ["model_place_value"],
    criteria: VALUE_CRITERIA,
    contexts: ["school"],
  },
  {
    key: "transfer-read",
    purpose: "transfer",
    title: { en: "Read the Number", fr: "Lis le nombre" },
    body: {
      en: "A school recorded 36,205 exercise books. How do we read this number in words?",
      fr: "Une école a enregistré 36 205 cahiers. Comment lit-on ce nombre en mots ?",
    },
    options: {
      en: [
        "thirty-six thousand, two hundred and five",
        "thirty-six thousand, twenty-five",
        "thirty-six thousand, two hundred and fifty",
        "three hundred and sixty thousand, two hundred and five",
      ],
      fr: [
        "trente-six mille deux cent cinq",
        "trente-six mille vingt-cinq",
        "trente-six mille deux cent cinquante",
        "trois cent soixante mille deux cent cinq",
      ],
    },
    answer: 0,
    rules: {
      1: ["omits_zero_placeholders", "misconception"],
      2: ["reads_digits_in_wrong_places", "procedural_error"],
      3: ["thousands_group_misplaced", "procedural_error"],
    },
    code: "B4.1.1.1.2",
    subskills: ["read_whole_numbers"],
    criteria: ["reads_whole_number_correctly"],
    contexts: ["school"],
  },
];

export const GHANA_B4_PLACE_VALUE_AUTHORED_COMPETENCY_ID = COMPETENCY;

export const GHANA_B4_PLACE_VALUE_AUTHORED_CONTENT: LearningContent[] =
  LANGS.flatMap((lang) => [
    ...LESSONS.map((item) => lessonItem(item, lang)),
    questionItem(PRACTICE, lang, "practice"),
    ...QUESTIONS.map((q) => questionItem(q, lang, "assessment")),
  ]);