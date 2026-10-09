import { GHANA_B4_ENGLISH_GENERATED_CONTENT } from "./ghana-b4-english-content";
import { GHANA_B4_SCIENCE_GENERATED_CONTENT } from "./ghana-b4-science-content";
import { GHANA_B4_COMPUTING_GENERATED_CONTENT } from "./ghana-b4-computing-content";
import { GHANA_B4_MATHEMATICS_GENERATED_CONTENT } from "./ghana-b4-mathematics-content";
import type { LearningContent } from "../../packages/content";

import { AUTHORED_CONTENT, AUTHORED_COMPETENCY_IDS } from "./authored-index";
import { AUTHORED_B5_SCIENCE_CONTENT } from "./authored-index-b5-science";
import { AUTHORED_B6_SCIENCE_CONTENT } from "./authored-index-b6-science";
import { AUTHORED_B5_COMPUTING_CONTENT } from "./authored-index-b5-computing";
import { AUTHORED_B6_COMPUTING_CONTENT } from "./authored-index-b6-computing";
import { AUTHORED_B5_MATHEMATICS_CONTENT } from "./authored-index-b5-mathematics";
import { AUTHORED_B6_MATHEMATICS_CONTENT } from "./authored-index-b6-mathematics";
import { AUTHORED_B5_ENGLISH_CONTENT } from "./authored-index-b5-english";
import { AUTHORED_B6_ENGLISH_CONTENT } from "./authored-index-b6-english";
import { GHANA_B4_NUMBER_PATTERNS_AUTHORED_CONTENT } from "./ghana-b4-mathematics-authored-number-patterns";
import { saveContent } from ".";

const now = new Date().toISOString();

const initialContent: LearningContent[] = [
  ...GHANA_B4_ENGLISH_GENERATED_CONTENT.filter((item) => !AUTHORED_COMPETENCY_IDS.includes(item.competencyId)),
  ...GHANA_B4_SCIENCE_GENERATED_CONTENT.filter((item) => !AUTHORED_COMPETENCY_IDS.includes(item.competencyId)),
  ...GHANA_B4_COMPUTING_GENERATED_CONTENT.filter((item) => !AUTHORED_COMPETENCY_IDS.includes(item.competencyId)),
    ...GHANA_B4_MATHEMATICS_GENERATED_CONTENT.filter((item) => !AUTHORED_COMPETENCY_IDS.includes(item.competencyId)),
  ...AUTHORED_CONTENT,
  ...AUTHORED_B5_SCIENCE_CONTENT,
  ...AUTHORED_B6_SCIENCE_CONTENT,
  ...AUTHORED_B5_COMPUTING_CONTENT,
  ...AUTHORED_B6_COMPUTING_CONTENT,
  ...AUTHORED_B5_MATHEMATICS_CONTENT,
  ...AUTHORED_B6_MATHEMATICS_CONTENT,
  ...AUTHORED_B5_ENGLISH_CONTENT,
  ...AUTHORED_B6_ENGLISH_CONTENT,
  /*
   * ============================================================
   * GHANA MATHEMATICS PILOT CONTENT
   *
   * This is FILUMIRE-authored pilot material for exercising the
   * production curriculum/content foundation. It is not labelled
   * as official Ghana curriculum alignment.
   * ============================================================
   */

  {
    id: "content-gh-b4-patterns-001-assessment-en",
    competencyId:
      "competency-gh-math-b4-number-patterns-001",
    type: "assessment",
    title: "Continue the Number Pattern",
    body: "Look at the pattern: 12, 15, 18, __. What number comes next?",
    language: "en",
    assessmentItemId:
      "item-gh-b4-patterns-001-diagnostic-en",
    assessmentStrategy: "multiple_choice",
    metadata: {
      options: JSON.stringify([
        "19",
        "20",
        "21",
        "24",
      ]),
      expectedResponse: "21",
      diagnosticRules: JSON.stringify({
        "19": {
          errorPattern:
            "pattern_rule_not_applied",
          diagnosticState:
            "conceptual_misunderstanding",
          diagnosticConfidence: 0.8,
        },
        "20": {
          errorPattern:
            "pattern_difference_miscalculated",
          diagnosticState:
            "procedural_error",
          diagnosticConfidence: 0.8,
        },
        "24": {
          errorPattern:
            "pattern_rule_overextended",
          diagnosticState:
            "misconception",
          diagnosticConfidence: 0.8,
        },
      }),
      curriculumSource:
        "FILUMIRE pilot content - authoritative Ghana curriculum source pending",
      contextTags: JSON.stringify(["abstract"]),
    },
    version: "pilot-content-0.1",
    createdAt: now,
    updatedAt: now,
  },

  {
    id: "content-gh-b4-patterns-001-lesson-en",
    competencyId:
      "competency-gh-math-b4-number-patterns-001",
    type: "lesson",
    title: "Find the Change",
    body: "A number pattern follows a rule. To continue the pattern, compare neighbouring numbers. In 12, 15, 18, each number increases by 3, so the next number is 21.",
    language: "en",
    teachingStrategy: "direct_explanation",
    metadata: {
      curriculumSource:
        "FILUMIRE pilot content - authoritative Ghana curriculum source pending",
      contextTags: JSON.stringify(["abstract"]),
    },
    version: "pilot-content-0.1",
    createdAt: now,
    updatedAt: now,
  },

  {
    id: "content-gh-b4-patterns-001-practice-en",
    competencyId:
      "competency-gh-math-b4-number-patterns-001",
    type: "practice",
    title: "Practise Continuing a Pattern",
    body: "A trader at the market arranges tomatoes in stacks that go down each row: 30, 27, 24, __. What number continues the pattern?",
    language: "en",
    teachingStrategy: "guided_practice",
    assessmentStrategy: "multiple_choice",
    assessmentItemId:
      "item-gh-b4-patterns-001-practice-en",
    metadata: {
      options: JSON.stringify([
        "18",
        "20",
        "21",
        "23",
      ]),
      expectedResponse: "21",
      /* Tranche 4D: every wrong option now maps to a diagnosis. */
      diagnosticRules: JSON.stringify({
        "18": {
          "errorPattern": "pattern_difference_miscalculated",
          "diagnosticState": "procedural_error",
          "diagnosticConfidence": 0.8
        },
        "20": {
          "errorPattern": "pattern_difference_miscalculated",
          "diagnosticState": "procedural_error",
          "diagnosticConfidence": 0.8
        },
        "23": {
          "errorPattern": "chooses_next_number_without_checking_rule",
          "diagnosticState": "conceptual_misunderstanding",
          "diagnosticConfidence": 0.8
        }
      }),
      curriculumSource:
        "FILUMIRE pilot content - authoritative Ghana curriculum source pending",
      contextTags: JSON.stringify(["market"]),
    },
    prerequisiteContentIds: [
      "content-gh-b4-patterns-001-lesson-en",
    ],
    version: "pilot-content-0.1",
    createdAt: now,
    updatedAt: now,
  },

  {
    id: "content-gh-b4-patterns-002-assessment-en",
    competencyId:
      "competency-gh-math-b4-number-patterns-002",
    type: "assessment",
    title: "Describe the Rule",
    body: "Look at 4, 8, 12, 16. Which rule describes the pattern?",
    language: "en",
    assessmentItemId:
      "item-gh-b4-patterns-002-diagnostic-en",
    assessmentStrategy: "multiple_choice",
    metadata: {
      options: JSON.stringify([
        "add 2",
        "add 4",
        "subtract 4",
        "multiply by 4",
      ]),
      expectedResponse: "add 4",
      /* Tranche 4D: every wrong option now maps to a diagnosis. */
      diagnosticRules: JSON.stringify({
        "add 2": {
          "errorPattern": "pattern_difference_miscalculated",
          "diagnosticState": "procedural_error",
          "diagnosticConfidence": 0.8
        },
        "subtract 4": {
          "errorPattern": "confuses_addition_and_subtraction_pattern",
          "diagnosticState": "misconception",
          "diagnosticConfidence": 0.8
        },
        "multiply by 4": {
          "errorPattern": "rule_not_checked_on_every_pair",
          "diagnosticState": "conceptual_misunderstanding",
          "diagnosticConfidence": 0.8
        }
      }),
      curriculumSource:
        "FILUMIRE pilot content - authoritative Ghana curriculum source pending",
      contextTags: JSON.stringify(["abstract"]),
    },
    version: "pilot-content-0.1",
    createdAt: now,
    updatedAt: now,
  },

  {
    id: "content-gh-b4-patterns-002-lesson-en",
    competencyId:
      "competency-gh-math-b4-number-patterns-002",
    type: "lesson",
    title: "Say the Pattern Rule",
    body: "When you describe a number pattern, say exactly what changes each time. The pattern 4, 8, 12, 16 uses the rule add 4.",
    language: "en",
    teachingStrategy: "worked_example",
    metadata: {
      curriculumSource:
        "FILUMIRE pilot content - authoritative Ghana curriculum source pending",
      contextTags: JSON.stringify(["abstract"]),
    },
    version: "pilot-content-0.1",
    createdAt: now,
    updatedAt: now,
  },

  {
    id: "content-gh-b4-patterns-002-practice-en",
    competencyId:
      "competency-gh-math-b4-number-patterns-002",
    type: "practice",
    title: "Describe a Market Pattern",
    body: "A shopkeeper adds more oranges to a basket each day: 3, 7, 11, 15. Which rule describes how the number of oranges changes?",
    language: "en",
    teachingStrategy: "guided_practice",
    assessmentStrategy: "multiple_choice",
    assessmentItemId:
      "item-gh-b4-patterns-002-practice-en",
    metadata: {
      options: JSON.stringify([
        "add 3",
        "add 4",
        "subtract 4",
        "multiply by 4",
      ]),
      expectedResponse: "add 4",
      /* Tranche 4D: every wrong option now maps to a diagnosis. */
      diagnosticRules: JSON.stringify({
        "add 3": {
          "errorPattern": "states_observed_number_instead_of_rule",
          "diagnosticState": "misconception",
          "diagnosticConfidence": 0.8
        },
        "subtract 4": {
          "errorPattern": "confuses_addition_and_subtraction_pattern",
          "diagnosticState": "misconception",
          "diagnosticConfidence": 0.8
        },
        "multiply by 4": {
          "errorPattern": "rule_not_checked_on_every_pair",
          "diagnosticState": "conceptual_misunderstanding",
          "diagnosticConfidence": 0.8
        }
      }),
      curriculumSource:
        "FILUMIRE pilot content - authoritative Ghana curriculum source pending",
      contextTags: JSON.stringify(["market"]),
    },
    prerequisiteContentIds: [
      "content-gh-b4-patterns-002-lesson-en",
    ],
    version: "pilot-content-0.1",
    createdAt: now,
    updatedAt: now,
  },

  {
    id: "content-gh-b4-patterns-003-lesson-en",
    competencyId:
      "competency-gh-math-b4-number-patterns-003",
    type: "lesson",
    title: "Use a Pattern to Solve a Real Problem",
    body: "A trotro (shared taxi) fare collector notices the fares collected each trip follow a pattern: 5, 10, 15 cedis so far. To find the next trip's total, apply the same rule that connects each number to the one before it.",
    language: "en",
    teachingStrategy: "worked_example",
    metadata: {
      curriculumSource:
        "FILUMIRE pilot content - authoritative Ghana curriculum source pending",
      contextTags: JSON.stringify(["transport", "currency"]),
    },
    version: "pilot-content-0.1",
    createdAt: now,
    updatedAt: now,
  },

  {
    id: "content-gh-b4-patterns-003-assessment-en",
    competencyId:
      "competency-gh-math-b4-number-patterns-003",
    type: "assessment",
    title: "Use a Pattern in Context",
    body: "A learner saves 2 cedis on Monday, 4 cedis on Tuesday, and 6 cedis on Wednesday. If the pattern continues, how much will the learner save on Thursday?",
    language: "en",
    assessmentItemId:
      "item-gh-b4-patterns-003-diagnostic-en",
    assessmentStrategy: "application",
    metadata: {
      options: JSON.stringify([
        "6 cedis",
        "8 cedis",
        "10 cedis",
        "12 cedis",
      ]),
      expectedResponse: "8 cedis",
      /* Tranche 4D: every wrong option now maps to a diagnosis. */
      diagnosticRules: JSON.stringify({
        "6 cedis": {
          "errorPattern": "chooses_next_number_without_checking_rule",
          "diagnosticState": "conceptual_misunderstanding",
          "diagnosticConfidence": 0.8
        },
        "10 cedis": {
          "errorPattern": "pattern_difference_miscalculated",
          "diagnosticState": "procedural_error",
          "diagnosticConfidence": 0.8
        },
        "12 cedis": {
          "errorPattern": "rule_not_checked_on_every_pair",
          "diagnosticState": "conceptual_misunderstanding",
          "diagnosticConfidence": 0.8
        }
      }),
      curriculumSource:
        "FILUMIRE pilot content - authoritative Ghana curriculum source pending",
      contextTags: JSON.stringify(["currency", "household"]),
    },
    prerequisiteContentIds: [
      "content-gh-b4-patterns-003-lesson-en",
    ],
    version: "pilot-content-0.1",
    createdAt: now,
    updatedAt: now,
  },

  /*
   * ============================================================
   * ENGLISH
   * ============================================================
   */

  {
    id: "content-number-sequence-assessment-001-en",
    competencyId: "competency-test-001",
    type: "assessment",
    title: "Number Sequence Check",
    body: "Look at the sequence: 2, 4, 6, __. Which number comes next?",
    language: "en",
    assessmentItemId:
      "item-number-sequence-diagnostic-001-en",
    metadata: {
      options: JSON.stringify([
        "7",
        "8",
        "9",
        "10",
      ]),
      expectedResponse: "8",
      diagnosticRules: JSON.stringify({
        "7": {
          errorPattern:
            "sequence_rule_not_identified",
          diagnosticState:
            "conceptual_misunderstanding",
        },
        "9": {
          errorPattern:
            "sequence_rule_not_identified",
          diagnosticState:
            "conceptual_misunderstanding",
        },
        "10": {
          errorPattern:
            "sequence_rule_not_identified",
          diagnosticState:
            "procedural_error",
        },
      }),
    },
    version: "content-0.4",
    createdAt: now,
    updatedAt: now,
  },

  {
    id: "content-number-sequence-lesson-001-en",
    competencyId: "competency-test-001",
    type: "lesson",
    title: "Understanding Number Sequences",
    body: "A number sequence is a list of numbers that follows a rule. Look at how one number changes to the next to find the rule.",
    language: "en",
    version: "content-0.4",
    createdAt: now,
    updatedAt: now,
  },

  {
    id: "content-number-sequence-example-001-en",
    competencyId: "competency-test-001",
    type: "example",
    title: "Finding a Simple Sequence",
    body: "Consider 3, 6, 9, 12. Each number increases by 3. The next number is 15.",
    language: "en",
    prerequisiteContentIds: [
      "content-number-sequence-lesson-001-en",
    ],
    version: "content-0.4",
    createdAt: now,
    updatedAt: now,
  },

  {
    id: "content-number-sequence-practice-001-en",
    competencyId: "competency-test-001",
    type: "practice",
    title: "Number Sequence Practice",
    body: "Look at the sequence: 5, 10, 15, __. Which number comes next?",
    language: "en",
    assessmentItemId:
      "item-number-sequence-practice-001-en",
    metadata: {
      options: JSON.stringify([
        "18",
        "20",
        "21",
        "25",
      ]),
      expectedResponse: "20",
    },
    prerequisiteContentIds: [
      "content-number-sequence-lesson-001-en",
      "content-number-sequence-example-001-en",
    ],
    version: "content-0.4",
    createdAt: now,
    updatedAt: now,
  },

  {
    id: "content-number-sequence-scaffold-001-en",
    competencyId: "competency-test-001",
    type: "scaffold",
    title: "Finding the Pattern Step by Step",
    body: "Compare each number with the number immediately before it. Ask whether the same amount is being added or subtracted each time.",
    language: "en",
    prerequisiteContentIds: [
      "content-number-sequence-practice-001-en",
    ],
    version: "content-0.4",
    createdAt: now,
    updatedAt: now,
  },

  {
    id: "content-number-sequence-remediation-001-en",
    competencyId: "competency-test-001",
    type: "remediation",
    title: "Finding the Pattern Step by Step",
    body: "Start by comparing each number with the number immediately before it. Ask whether the same amount is being added or subtracted each time.",
    language: "en",
    prerequisiteContentIds: [
      "content-number-sequence-scaffold-001-en",
    ],
    version: "content-0.4",
    createdAt: now,
    updatedAt: now,
  },

  {
    id: "content-number-sequence-reassessment-001-en",
    competencyId: "competency-test-001",
    type: "assessment",
    title: "Number Sequence Reassessment",
    body: "Look at the sequence: 4, 7, 10, __. Which number comes next?",
    language: "en",
    assessmentItemId:
      "item-number-sequence-reassessment-001-en",
    metadata: {
      options: JSON.stringify([
        "11",
        "12",
        "13",
        "14",
      ]),
      expectedResponse: "13",
    },
    prerequisiteContentIds: [
      "content-number-sequence-practice-001-en",
    ],
    version: "content-0.4",
    createdAt: now,
    updatedAt: now,
  },

  {
    id: "content-number-sequence-transfer-001-en",
    competencyId: "competency-test-001",
    type: "assessment",
    title: "Number Sequence Transfer",
    body: "A shop packs oranges in groups of 5. If the first three groups contain 5, 10, and 15 oranges, how many oranges will be in the next group?",
    language: "en",
    assessmentItemId:
      "item-number-sequence-transfer-001-en",
    metadata: {
      options: JSON.stringify([
        "18",
        "20",
        "25",
        "30",
      ]),
      expectedResponse: "20",
    },
    prerequisiteContentIds: [
      "content-number-sequence-reassessment-001-en",
    ],
    version: "content-0.5",
    createdAt: now,
    updatedAt: now,
  },

  {
    id: "content-number-sequence-transfer-001-fr",
    competencyId: "competency-test-001",
    type: "assessment",
    title: "Transfert sur les suites numériques",
    body: "Un magasin emballe des oranges par groupes de 5. Si les trois premiers groupes contiennent 5, 10 et 15 oranges, combien d'oranges y aura-t-il dans le groupe suivant ?",
    language: "fr",
    assessmentItemId:
      "item-number-sequence-transfer-001-fr",
    metadata: {
      options: JSON.stringify([
        "18",
        "20",
        "25",
        "30",
      ]),
      expectedResponse: "20",
    },
    prerequisiteContentIds: [
      "content-number-sequence-reassessment-001-fr",
    ],
    version: "content-0.5",
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "content-number-sequence-patterns-assessment-001-en",
    competencyId: "competency-test-002",
    type: "assessment",
    title: "Sequence Pattern Check",
    body: "Look at the sequence: 5, 10, 15, __. Which number comes next?",
    language: "en",
    assessmentItemId:
      "item-number-sequence-patterns-diagnostic-001-en",
    metadata: {
      options: JSON.stringify([
        "18",
        "20",
        "21",
        "25",
      ]),
      expectedResponse: "20",
    },
    version: "content-0.4",
    createdAt: now,
    updatedAt: now,
  },

  {
    id: "content-number-sequence-patterns-lesson-001-en",
    competencyId: "competency-test-002",
    type: "lesson",
    title: "Number Sequence Patterns",
    body: "Number sequences can follow different rules. The change from one number to the next may stay the same, or it may change in a predictable way. Look carefully at the relationship between consecutive numbers to identify the rule.",
    language: "en",
    version: "content-0.4",
    createdAt: now,
    updatedAt: now,
  },

  {
    id: "content-number-sequence-patterns-example-001-en",
    competencyId: "competency-test-002",
    type: "example",
    title: "Finding the Rule",
    body: "Consider 2, 5, 8, 11. Each number increases by 3. The rule is to add 3 each time.",
    language: "en",
    prerequisiteContentIds: [
      "content-number-sequence-patterns-lesson-001-en",
    ],
    version: "content-0.4",
    createdAt: now,
    updatedAt: now,
  },

  {
    id: "content-number-sequence-patterns-practice-001-en",
    competencyId: "competency-test-002",
    type: "practice",
    title: "Sequence Rule Practice",
    body: "Look at the sequence: 4, 8, 12, __. Which number comes next?",
    language: "en",
    assessmentItemId:
      "item-number-sequence-patterns-practice-001-en",
    metadata: {
      options: JSON.stringify([
        "14",
        "15",
        "16",
        "18",
      ]),
      expectedResponse: "16",
    },
    prerequisiteContentIds: [
      "content-number-sequence-patterns-lesson-001-en",
      "content-number-sequence-patterns-example-001-en",
    ],
    version: "content-0.4",
    createdAt: now,
    updatedAt: now,
  },

  {
    id: "content-next-curriculum-competency-assessment-001-en",
    competencyId: "competency-test-003",
    type: "assessment",
    title: "Next Competency Check",
    body: "Look at the sequence: 6, 12, 18, __. Which number comes next?",
    language: "en",
    assessmentItemId:
      "item-next-curriculum-competency-diagnostic-001-en",
    metadata: {
      options: JSON.stringify([
        "20",
        "22",
        "24",
        "26",
      ]),
      expectedResponse: "24",
    },
    version: "content-0.4",
    createdAt: now,
    updatedAt: now,
  },

  {
    id: "content-next-curriculum-competency-001-en",
    competencyId: "competency-test-003",
    type: "lesson",
    title: "Next Curriculum Competency",
    body: "This lesson begins the next competency in the learning sequence.",
    language: "en",
    version: "content-0.4",
    createdAt: now,
    updatedAt: now,
  },

  {
    id: "content-next-curriculum-competency-practice-001-en",
    competencyId: "competency-test-003",
    type: "practice",
    title: "Next Competency Practice",
    body: "Look at the sequence: 7, 14, 21, __. Which number comes next?",
    language: "en",
    assessmentItemId:
      "item-next-curriculum-competency-practice-001-en",
    metadata: {
      options: JSON.stringify([
        "24",
        "26",
        "28",
        "30",
      ]),
      expectedResponse: "28",
    },
    prerequisiteContentIds: [
      "content-next-curriculum-competency-001-en",
    ],
    version: "content-0.4",
    createdAt: now,
    updatedAt: now,
  },

  {
    id: "content-following-number-patterns-assessment-001-en",
    competencyId: "competency-test-004",
    type: "assessment",
    title: "Following Number Patterns Check",
    body: "Look at the sequence: 10, 20, 30, __. Which number comes next?",
    language: "en",
    assessmentItemId:
      "item-following-number-patterns-diagnostic-001-en",
    metadata: {
      options: JSON.stringify([
        "35",
        "40",
        "45",
        "50",
      ]),
      expectedResponse: "40",
    },
    version: "content-0.4",
    createdAt: now,
    updatedAt: now,
  },

  {
    id: "content-following-number-patterns-lesson-001-en",
    competencyId: "competency-test-004",
    type: "lesson",
    title: "Following Number Patterns",
    body: "A number pattern follows a rule. Find how the numbers change, then use the same rule to continue the pattern.",
    language: "en",
    version: "content-0.4",
    createdAt: now,
    updatedAt: now,
  },

  {
    id: "content-following-number-patterns-practice-001-en",
    competencyId: "competency-test-004",
    type: "practice",
    title: "Following Number Patterns Practice",
    body: "Look at the sequence: 8, 16, 24, __. Which number comes next?",
    language: "en",
    assessmentItemId:
      "item-following-number-patterns-practice-001-en",
    metadata: {
      options: JSON.stringify([
        "30",
        "32",
        "34",
        "36",
      ]),
      expectedResponse: "32",
    },
    prerequisiteContentIds: [
      "content-following-number-patterns-lesson-001-en",
    ],
    version: "content-0.4",
    createdAt: now,
    updatedAt: now,
  },

  {
    id: "content-applying-number-pattern-rules-assessment-001-en",
    competencyId: "competency-test-005",
    type: "assessment",
    title: "Applying Number Pattern Rules Check",
    body: "Look at the sequence: 12, 24, 36, __. Which number comes next?",
    language: "en",
    assessmentItemId:
      "item-applying-number-pattern-rules-diagnostic-001",
    metadata: {
      options: JSON.stringify([
        "42",
        "46",
        "48",
        "50",
      ]),
      expectedResponse: "48",
    },
    version: "content-0.4",
    createdAt: now,
    updatedAt: now,
  },

  {
    id: "content-applying-number-pattern-rules-lesson-001-en",
    competencyId: "competency-test-005",
    type: "lesson",
    title: "Applying Number Pattern Rules",
    body: "To continue a number pattern, first find the rule that connects one number to the next. Then apply the same rule to the last number to find what comes next.",
    language: "en",
    version: "content-0.4",
    createdAt: now,
    updatedAt: now,
  },

  {
    id: "content-applying-number-pattern-rules-example-001-en",
    competencyId: "competency-test-005",
    type: "example",
    title: "Using a Pattern Rule",
    body: "Consider 5, 10, 15, 20. Each number increases by 5. Applying the same rule gives 25 as the next number.",
    language: "en",
    prerequisiteContentIds: [
      "content-applying-number-pattern-rules-lesson-001-en",
    ],
    version: "content-0.4",
    createdAt: now,
    updatedAt: now,
  },

  {
    id: "content-applying-number-pattern-rules-practice-001-en",
    competencyId: "competency-test-005",
    type: "practice",
    title: "Applying the Pattern Rule",
    body: "Look at the sequence: 9, 18, 27, __. Which number comes next?",
    language: "en",
    assessmentItemId:
      "item-applying-number-pattern-rules-practice-001-en",
    metadata: {
      options: JSON.stringify([
        "30",
        "34",
        "36",
        "38",
      ]),
      expectedResponse: "36",
    },
    prerequisiteContentIds: [
      "content-applying-number-pattern-rules-lesson-001-en",
      "content-applying-number-pattern-rules-example-001-en",
    ],
    version: "content-0.4",
    createdAt: now,
    updatedAt: now,
  },

  {
    id: "content-applying-number-pattern-rules-scaffold-001-en",
    competencyId: "competency-test-005",
    type: "scaffold",
    title: "Find the Pattern Step by Step",
    body: "Compare each pair of neighbouring numbers. Find how much the number changes each time. Then use that same change to continue the sequence.",
    language: "en",
    prerequisiteContentIds: [
      "content-applying-number-pattern-rules-practice-001-en",
    ],
    version: "content-0.4",
    createdAt: now,
    updatedAt: now,
  },

  {
    id: "content-applying-number-pattern-rules-remediation-001-en",
    competencyId: "competency-test-005",
    type: "remediation",
    title: "Pattern Rule Remediation",
    body: "Start with the first two numbers. Work out whether the same amount is being added or subtracted. Check the next pair to make sure the rule stays the same.",
    language: "en",
    prerequisiteContentIds: [
      "content-applying-number-pattern-rules-scaffold-001-en",
    ],
    version: "content-0.4",
    createdAt: now,
    updatedAt: now,
  },

  {
    id: "content-applying-number-pattern-rules-reassessment-001-en",
    competencyId: "competency-test-005",
    type: "assessment",
    title: "Applying Number Pattern Rules Reassessment",
    body: "Look at the sequence: 15, 30, 45, __. Which number comes next?",
    language: "en",
    assessmentItemId:
      "item-applying-number-pattern-rules-reassessment-001-en",
    metadata: {
      options: JSON.stringify([
        "50",
        "55",
        "60",
        "65",
      ]),
      expectedResponse: "60",
    },
    prerequisiteContentIds: [
      "content-applying-number-pattern-rules-practice-001-en",
    ],
    version: "content-0.4",
    createdAt: now,
    updatedAt: now,
  },

  /*
   * ============================================================
   * FRENCH
   * ============================================================
   */

  {
    id: "content-number-sequence-assessment-001-fr",
    competencyId: "competency-test-001",
    type: "assessment",
    title: "Vérification des suites numériques",
    body: "Regarde la suite : 2, 4, 6, __. Quel nombre vient ensuite ?",
    language: "fr",
    assessmentItemId:
      "item-number-sequence-diagnostic-001-fr",
    metadata: {
      options: JSON.stringify([
        "7",
        "8",
        "9",
        "10",
      ]),
      expectedResponse: "8",
      diagnosticRules: JSON.stringify({
        "7": {
          errorPattern:
            "sequence_rule_not_identified",
          diagnosticState:
            "conceptual_misunderstanding",
        },
        "9": {
          errorPattern:
            "sequence_rule_not_identified",
          diagnosticState:
            "conceptual_misunderstanding",
        },
        "10": {
          errorPattern:
            "sequence_rule_not_identified",
          diagnosticState:
            "procedural_error",
        },
      }),
    },
    version: "content-0.4",
    createdAt: now,
    updatedAt: now,
  },

  {
    id: "content-number-sequence-lesson-001-fr",
    competencyId: "competency-test-001",
    type: "lesson",
    title: "Comprendre les suites numériques",
    body: "Une suite numérique est une liste de nombres qui suit une règle. Observe comment un nombre change pour trouver la règle.",
    language: "fr",
    version: "content-0.4",
    createdAt: now,
    updatedAt: now,
  },

  {
    id: "content-number-sequence-example-001-fr",
    competencyId: "competency-test-001",
    type: "example",
    title: "Trouver une suite simple",
    body: "Considère 3, 6, 9, 12. Chaque nombre augmente de 3. Le nombre suivant est 15.",
    language: "fr",
    prerequisiteContentIds: [
      "content-number-sequence-lesson-001-fr",
    ],
    version: "content-0.4",
    createdAt: now,
    updatedAt: now,
  },

  {
    id: "content-number-sequence-practice-001-fr",
    competencyId: "competency-test-001",
    type: "practice",
    title: "Exercice sur les suites numériques",
    body: "Regarde la suite : 5, 10, 15, __. Quel nombre vient ensuite ?",
    language: "fr",
    assessmentItemId:
      "item-number-sequence-practice-001-fr",
    metadata: {
      options: JSON.stringify([
        "18",
        "20",
        "21",
        "25",
      ]),
      expectedResponse: "20",
    },
    prerequisiteContentIds: [
      "content-number-sequence-lesson-001-fr",
      "content-number-sequence-example-001-fr",
    ],
    version: "content-0.4",
    createdAt: now,
    updatedAt: now,
  },

  {
    id: "content-number-sequence-scaffold-001-fr",
    competencyId: "competency-test-001",
    type: "scaffold",
    title: "Trouver le modèle étape par étape",
    body: "Compare chaque nombre avec le nombre qui le précède immédiatement. Demande-toi si la même quantité est ajoutée ou soustraite Ã  chaque fois.",
    language: "fr",
    prerequisiteContentIds: [
      "content-number-sequence-practice-001-fr",
    ],
    version: "content-0.4",
    createdAt: now,
    updatedAt: now,
  },

  {
    id: "content-number-sequence-remediation-001-fr",
    competencyId: "competency-test-001",
    type: "remediation",
    title: "Trouver le modèle étape par étape",
    body: "Commence par comparer chaque nombre avec le nombre qui le précède immédiatement. Demande-toi si la même quantité est ajoutée ou soustraite Ã  chaque fois.",
    language: "fr",
    prerequisiteContentIds: [
      "content-number-sequence-scaffold-001-fr",
    ],
    version: "content-0.4",
    createdAt: now,
    updatedAt: now,
  },

  {
    id: "content-number-sequence-reassessment-001-fr",
    competencyId: "competency-test-001",
    type: "assessment",
    title: "Nouvelle Vérification des suites numériques",
    body: "Regarde la suite : 4, 7, 10, __. Quel nombre vient ensuite ?",
    language: "fr",
    assessmentItemId:
      "item-number-sequence-reassessment-001-fr",
    metadata: {
      options: JSON.stringify([
        "11",
        "12",
        "13",
        "14",
      ]),
      expectedResponse: "13",
    },
    prerequisiteContentIds: [
      "content-number-sequence-practice-001-fr",
    ],
    version: "content-0.4",
    createdAt: now,
    updatedAt: now,
  },

  {
    id: "content-number-sequence-patterns-assessment-001-fr",
    competencyId: "competency-test-002",
    type: "assessment",
    title: "Vérification des modèles de suites",
    body: "Regarde la suite : 5, 10, 15, __. Quel nombre vient ensuite ?",
    language: "fr",
    assessmentItemId:
      "item-number-sequence-patterns-diagnostic-001-fr",
    metadata: {
      options: JSON.stringify([
        "18",
        "20",
        "21",
        "25",
      ]),
      expectedResponse: "20",
    },
    version: "content-0.4",
    createdAt: now,
    updatedAt: now,
  },

  {
    id: "content-number-sequence-patterns-lesson-001-fr",
    competencyId: "competency-test-002",
    type: "lesson",
    title: "Les modèles des suites numériques",
    body: "Les suites numériques peuvent suivre différentes règles. Le changement d'un nombre au suivant peut rester le même ou changer de manière prévisible. Observe attentivement la relation entre les nombres consécutifs pour identifier la règle.",
    language: "fr",
    version: "content-0.4",
    createdAt: now,
    updatedAt: now,
  },

  {
    id: "content-number-sequence-patterns-example-001-fr",
    competencyId: "competency-test-002",
    type: "example",
    title: "Trouver la règle",
    body: "Considère 2, 5, 8, 11. Chaque nombre augmente de 3. La règle consiste Ã  ajouter 3 Ã  chaque fois.",
    language: "fr",
    prerequisiteContentIds: [
      "content-number-sequence-patterns-lesson-001-fr",
    ],
    version: "content-0.4",
    createdAt: now,
    updatedAt: now,
  },

  {
    id: "content-number-sequence-patterns-practice-001-fr",
    competencyId: "competency-test-002",
    type: "practice",
    title: "Exercice sur la règle de la suite",
    body: "Regarde la suite : 4, 8, 12, __. Quel nombre vient ensuite ?",
    language: "fr",
    assessmentItemId:
      "item-number-sequence-patterns-practice-001-fr",
    metadata: {
      options: JSON.stringify([
        "14",
        "15",
        "16",
        "18",
      ]),
      expectedResponse: "16",
    },
    prerequisiteContentIds: [
      "content-number-sequence-patterns-lesson-001-fr",
      "content-number-sequence-patterns-example-001-fr",
    ],
    version: "content-0.4",
    createdAt: now,
    updatedAt: now,
  },

  {
    id: "content-next-curriculum-competency-assessment-001-fr",
    competencyId: "competency-test-003",
    type: "assessment",
    title: "Vérification de la compétence suivante",
    body: "Regarde la suite : 6, 12, 18, __. Quel nombre vient ensuite ?",
    language: "fr",
    assessmentItemId:
      "item-next-curriculum-competency-diagnostic-001-fr",
    metadata: {
      options: JSON.stringify([
        "20",
        "22",
        "24",
        "26",
      ]),
      expectedResponse: "24",
    },
    version: "content-0.4",
    createdAt: now,
    updatedAt: now,
  },

  {
    id: "content-next-curriculum-competency-001-fr",
    competencyId: "competency-test-003",
    type: "lesson",
    title: "Compétence suivante du programme",
    body: "Cette leçon commence la compétence suivante dans la progression d'apprentissage.",
    language: "fr",
    version: "content-0.4",
    createdAt: now,
    updatedAt: now,
  },

  {
    id: "content-next-curriculum-competency-practice-001-fr",
    competencyId: "competency-test-003",
    type: "practice",
    title: "Exercice sur la compétence suivante",
    body: "Regarde la suite : 7, 14, 21, __. Quel nombre vient ensuite ?",
    language: "fr",
    assessmentItemId:
      "item-next-curriculum-competency-practice-001-fr",
    metadata: {
      options: JSON.stringify([
        "24",
        "26",
        "28",
        "30",
      ]),
      expectedResponse: "28",
    },
    prerequisiteContentIds: [
      "content-next-curriculum-competency-001-fr",
    ],
    version: "content-0.4",
    createdAt: now,
    updatedAt: now,
  },

  {
    id: "content-following-number-patterns-assessment-001-fr",
    competencyId: "competency-test-004",
    type: "assessment",
    title: "Vérification des modèles numériques",
    body: "Regarde la suite : 10, 20, 30, __. Quel nombre vient ensuite ?",
    language: "fr",
    assessmentItemId:
      "item-following-number-patterns-diagnostic-001-fr",
    metadata: {
      options: JSON.stringify([
        "35",
        "40",
        "45",
        "50",
      ]),
      expectedResponse: "40",
    },
    version: "content-0.4",
    createdAt: now,
    updatedAt: now,
  },

  {
    id: "content-following-number-patterns-lesson-001-fr",
    competencyId: "competency-test-004",
    type: "lesson",
    title: "Suivre les modèles numériques",
    body: "Un modèle numérique suit une règle. Trouve comment les nombres changent, puis utilise la même règle pour continuer le modèle.",
    language: "fr",
    version: "content-0.4",
    createdAt: now,
    updatedAt: now,
  },

  {
    id: "content-following-number-patterns-practice-001-fr",
    competencyId: "competency-test-004",
    type: "practice",
    title: "Exercice sur les modèles numériques",
    body: "Regarde la suite : 8, 16, 24, __. Quel nombre vient ensuite ?",
    language: "fr",
    assessmentItemId:
      "item-following-number-patterns-practice-001-fr",
    metadata: {
      options: JSON.stringify([
        "30",
        "32",
        "34",
        "36",
      ]),
      expectedResponse: "32",
    },
    prerequisiteContentIds: [
      "content-following-number-patterns-lesson-001-fr",
    ],
    version: "content-0.4",
    createdAt: now,
    updatedAt: now,
  },

  {
    id: "content-applying-number-pattern-rules-assessment-001-fr",
    competencyId: "competency-test-005",
    type: "assessment",
    title: "Vérification de l'application des règles",
    body: "Regarde la suite : 12, 24, 36, __. Quel nombre vient ensuite ?",
    language: "fr",
    assessmentItemId:
      "item-applying-number-pattern-rules-diagnostic-001-fr",
    metadata: {
      options: JSON.stringify([
        "42",
        "46",
        "48",
        "50",
      ]),
      expectedResponse: "48",
    },
    version: "content-0.4",
    createdAt: now,
    updatedAt: now,
  },

  {
    id: "content-applying-number-pattern-rules-lesson-001-fr",
    competencyId: "competency-test-005",
    type: "lesson",
    title: "Appliquer les règles des modèles numériques",
    body: "Pour continuer un modèle numérique, trouve d'abord la règle qui relie un nombre au suivant. Applique ensuite la même règle au dernier nombre pour trouver le nombre suivant.",
    language: "fr",
    version: "content-0.4",
    createdAt: now,
    updatedAt: now,
  },

  {
    id: "content-applying-number-pattern-rules-example-001-fr",
    competencyId: "competency-test-005",
    type: "example",
    title: "Utiliser une règle de modèle",
    body: "Considère 5, 10, 15, 20. Chaque nombre augmente de 5. En appliquant la même règle, le nombre suivant est 25.",
    language: "fr",
    prerequisiteContentIds: [
      "content-applying-number-pattern-rules-lesson-001-fr",
    ],
    version: "content-0.4",
    createdAt: now,
    updatedAt: now,
  },

  {
    id: "content-applying-number-pattern-rules-practice-001-fr",
    competencyId: "competency-test-005",
    type: "practice",
    title: "Appliquer la règle du modèle",
    body: "Regarde la suite : 9, 18, 27, __. Quel nombre vient ensuite ?",
    language: "fr",
    assessmentItemId:
      "item-applying-number-pattern-rules-practice-001-fr",
    metadata: {
      options: JSON.stringify([
        "30",
        "34",
        "36",
        "38",
      ]),
      expectedResponse: "36",
    },
    prerequisiteContentIds: [
      "content-applying-number-pattern-rules-lesson-001-fr",
      "content-applying-number-pattern-rules-example-001-fr",
    ],
    version: "content-0.4",
    createdAt: now,
    updatedAt: now,
  },

  {
    id: "content-applying-number-pattern-rules-scaffold-001-fr",
    competencyId: "competency-test-005",
    type: "scaffold",
    title: "Trouver le modèle étape par étape",
    body: "Compare chaque paire de nombres voisins. Trouve de combien le nombre change Ã  chaque fois. Utilise ensuite le même changement pour continuer la suite.",
    language: "fr",
    prerequisiteContentIds: [
      "content-applying-number-pattern-rules-practice-001-fr",
    ],
    version: "content-0.4",
    createdAt: now,
    updatedAt: now,
  },

  {
    id: "content-applying-number-pattern-rules-remediation-001-fr",
    competencyId: "competency-test-005",
    type: "remediation",
    title: "Remédiation sur la règle du modèle",
    body: "Commence avec les deux premiers nombres. Détermine si la même quantité est ajoutée ou soustraite. Vérifie la paire suivante pour t'assurer que la règle reste la même.",
    language: "fr",
    prerequisiteContentIds: [
      "content-applying-number-pattern-rules-scaffold-001-fr",
    ],
    version: "content-0.4",
    createdAt: now,
    updatedAt: now,
  },

  {
    id: "content-applying-number-pattern-rules-reassessment-001-fr",
    competencyId: "competency-test-005",
    type: "assessment",
    title: "Nouvelle Vérification de l'application des règles",
    body: "Regarde la suite : 15, 30, 45, __. Quel nombre vient ensuite ?",
    language: "fr",
    assessmentItemId:
      "item-applying-number-pattern-rules-reassessment-001-fr",
    metadata: {
      options: JSON.stringify([
        "50",
        "55",
        "60",
        "65",
      ]),
      expectedResponse: "60",
    },
    prerequisiteContentIds: [
      "content-applying-number-pattern-rules-practice-001-fr",
    ],
    version: "content-0.4",
    createdAt: now,
    updatedAt: now,
  },

  /*
   * Tranche 4C: full content for the B4 number-pattern topics. The pilot
   * items above keep their ids; diagnose now prefers these tagged items.
   */
  ...GHANA_B4_NUMBER_PATTERNS_AUTHORED_CONTENT,
];

export function seedContent(): void {
  for (const content of initialContent) {
    saveContent(content);
  }
}




