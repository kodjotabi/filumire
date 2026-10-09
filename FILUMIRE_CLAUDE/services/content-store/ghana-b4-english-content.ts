import type {
  InstructionalStrategy,
  ResponseMode,
} from "../../packages/domain";

import type {
  LearningContent,
} from "../../packages/content";

import {
  GHANA_B4_ENGLISH_PRODUCTION_SPECS,
  type GhanaB4EnglishProductionSpec,
} from "../../packages/curriculum/ghana-b4-english-production";

import type {
  GhanaB4EnglishStrand2Spec,
} from "../../packages/curriculum/ghana-b4-english-strand2-adaptive";

import type {
  EnglishEvidenceDesign,
} from "../../packages/curriculum/ghana-b4-english-evidence";

const SOURCE =
  "NaCCA English Language Curriculum for Primary Schools, Basic 4-6, 2019";

const now = new Date().toISOString();

type AssessmentPurpose =
  | "diagnostic"
  | "reassessment"
  | "retention"
  | "transfer";

function slug(code: string): string {
  return code.toLowerCase().replace(/\./g, "-");
}

const observedPerformanceCodes = new Set([
  "B4.1.1.1.1",
  "B4.1.3.1.1",
  "B4.1.5.1.1",
  "B4.1.6.2.1",
  "B4.1.6.2.2",
  "B4.1.9.1.1",
  "B4.1.10.2.2",
  "B4.1.10.3.4",
  "B4.1.10.3.7",
]);

const explanationCodes = new Set([
  "B4.1.1.1.2",
  "B4.1.3.1.2",
  "B4.1.5.2.1",
  "B4.1.7.1.1",
  "B4.1.7.1.2",
  "B4.1.7.1.3",
  "B4.1.7.1.4",
  "B4.1.7.1.5",
  "B4.1.7.1.7",
  "B4.1.10.1.1",
  "B4.1.10.1.2",
  "B4.1.10.1.3",
  "B4.1.10.3.1",
  "B4.1.10.3.2",
  "B4.1.10.3.3",
]);

function responseModeFor(
  spec: GhanaB4EnglishProductionSpec,
): ResponseMode {
  if (observedPerformanceCodes.has(spec.code)) {
    return "observed_performance";
  }

  if (explanationCodes.has(spec.code)) {
    return "explanation";
  }

  if (spec.code === "B4.1.3.1.3") {
    return "constructed_response";
  }

  return spec.responseMode;
}

function evidenceFor(
  spec: GhanaB4EnglishProductionSpec,
): EnglishEvidenceDesign | undefined {
  if ("evidence" in spec) {
    return (spec as GhanaB4EnglishStrand2Spec).evidence;
  }

  return undefined;
}

function purposeTask(
  evidence: EnglishEvidenceDesign,
  purpose: AssessmentPurpose,
): string {
  switch (purpose) {
    case "diagnostic":
      return evidence.diagnosticTask;
    case "reassessment":
      return evidence.reassessmentTask;
    case "retention":
      return evidence.retentionTask;
    case "transfer":
      return evidence.transferTask;
  }
}

function genericPurposeInstruction(
  purpose: AssessmentPurpose,
): string {
  switch (purpose) {
    case "diagnostic":
      return "Show what you can already do before receiving teaching support.";
    case "reassessment":
      return "Demonstrate the skill again using a fresh example after instruction or remediation.";
    case "retention":
      return "Demonstrate the skill without reviewing the previous lesson first.";
    case "transfer":
      return "Apply the skill in a different but appropriate real-life or classroom context.";
  }
}

function modeInstruction(
  responseMode: ResponseMode,
): string {
  switch (responseMode) {
    case "observed_performance":
      return "The learner should perform the task while a trusted evaluator observes the quality of the performance.";
    case "oral_response":
      return "The learner should respond aloud in clear spoken English and the response must be evaluated through trusted evidence.";
    case "explanation":
      return "The learner should explain the answer and give relevant support for the explanation.";
    case "constructed_response":
      return "The learner should create an original response that satisfies the stated criteria.";
    case "matching":
      return "The learner should match each item according to the target sound, symbol or meaning relationship.";
    case "classification":
      return "The learner should classify the items using the required language distinction.";
    case "sequence_ordering":
      return "The learner should arrange the relevant information in the correct sequence.";
    case "short_answer":
      return "The learner should give a concise answer supported by the text or task evidence.";
    case "application":
      return "The learner should apply the target skill correctly in a fresh example or context.";
    default:
      return "The learner should demonstrate the competency using the required response mode.";
  }
}

function assessmentPrompt(
  spec: GhanaB4EnglishProductionSpec,
  purpose: AssessmentPurpose,
  responseMode: ResponseMode,
): string {
  const evidence = evidenceFor(spec);

  if (evidence) {
    return [
      purposeTask(evidence, purpose),
      modeInstruction(responseMode),
      "Use a fresh example appropriate to a Ghanaian learner and do not reuse the exact diagnostic material for reassessment, retention or transfer.",
    ].join(" ");
  }

  return [
    genericPurposeInstruction(purpose),
    modeInstruction(responseMode),
    `Competency task: ${spec.description}`,
    "Use a familiar Ghanaian home, school, community or everyday context where appropriate.",
  ].join(" ");
}

function lessonBody(
  spec: GhanaB4EnglishProductionSpec,
): string {
  const skills = spec.subskills
    .map((skill) => skill.replace(/_/g, " "))
    .join(", ");

  const evidence = evidenceFor(spec);

  if (evidence) {
    return [
      `Target competency: ${spec.description}`,
      `Teach these component skills deliberately: ${skills}.`,
      `The eventual evidence will judge: ${evidence.successCriteria
        .map((criterion) => criterion.replace(/_/g, " "))
        .join(", ")}.`,
      "Model the skill, make the relevant distinction explicit, check understanding during instruction, then move to supported learner practice.",
    ].join(" ");
  }

  return [
    `Focus skill: ${spec.description}`,
    `Build the skill through these components: ${skills}.`,
    "Model the language or performance clearly, make the meaning explicit, then allow the learner to attempt the skill with guided support.",
  ].join(" ");
}

function practiceBody(
  spec: GhanaB4EnglishProductionSpec,
): string {
  const evidence = evidenceFor(spec);

  if (evidence) {
    return [
      `Practise the target skill: ${spec.description}`,
      "Use examples that differ from both the teaching model and the diagnostic task.",
      `Keep practice aligned to these evidence criteria: ${evidence.successCriteria
        .map((criterion) => criterion.replace(/_/g, " "))
        .join(", ")}.`,
      "Give corrective feedback during practice, but do not count supported practice itself as mastery evidence.",
    ].join(" ");
  }

  return [
    `Practise: ${spec.description}`,
    "Use a new familiar example rather than repeating the demonstration exactly.",
    "Give the learner enough opportunity to produce, explain or perform the target skill.",
  ].join(" ");
}

function scaffoldBody(
  spec: GhanaB4EnglishProductionSpec,
): string {
  const steps = spec.subskills
    .map(
      (skill, index) =>
        `${index + 1}. ${skill.replace(/_/g, " ")}`,
    )
    .join(" ");

  return `Work through the competency step by step. ${steps}`;
}

function remediationBody(
  spec: GhanaB4EnglishProductionSpec,
): string {
  const misconceptions = spec.misconceptions
    .map((item) => item.replace(/_/g, " "))
    .join("; ");

  return [
    `Repair difficulties with: ${spec.title}.`,
    `Diagnose which of these error patterns is present: ${misconceptions}.`,
    "Model the correct distinction or process against the observed error. Then provide a fresh contrast example and supported retry.",
    "Do not infer mastery from the remediation attempt itself. Require independent reassessment evidence afterwards.",
  ].join(" ");
}

function assessment(
  spec: GhanaB4EnglishProductionSpec,
  purpose: AssessmentPurpose,
): LearningContent {
  const responseMode = responseModeFor(spec);
  const evidence = evidenceFor(spec);

  return {
    id:
      `content-gh-b4-english-${slug(spec.code)}-${purpose}-en`,

    competencyId:
      spec.competencyId,

    type:
      "assessment",

    title:
      `${spec.title} ${
        purpose === "diagnostic"
          ? "Diagnostic"
          : purpose === "reassessment"
            ? "Reassessment"
            : purpose === "retention"
              ? "Retention Check"
              : "Transfer Check"
      }`,

    body:
      assessmentPrompt(
        spec,
        purpose,
        responseMode,
      ),

    language:
      "en",

    assessmentItemId:
      `item-gh-b4-english-${slug(spec.code)}-${purpose}-en`,

    assessmentStrategy:
      responseMode,

    metadata: {
      assessmentPurpose:
        purpose,

      responseMode,

      curriculumNodeCode:
        spec.code,

      curriculumSource:
        SOURCE,

      rubricCriteria:
        JSON.stringify(
          evidence?.successCriteria ??
          spec.subskills,
        ),

      misconceptionPatterns:
        JSON.stringify(spec.misconceptions),

      evidenceProfile:
        evidence?.profile ?? "legacy_english_evidence",

      evaluationMethod:
        "trusted_rubric_evaluation",

      /*
       * This marker deliberately cannot be submitted as an ordinary
       * learner answer to establish correctness. Rich English evidence
       * must pass the trusted evaluation boundary.
       */
      expectedResponse:
        "rubric_evaluated_performance",
    },

    version:
      evidence ? "english-adaptive-2.0" : "english-adaptive-1.0",

    createdAt:
      now,

    updatedAt:
      now,
  };
}

function instruction(
  spec: GhanaB4EnglishProductionSpec,
  suffix: string,
  type:
    | "lesson"
    | "practice"
    | "scaffold"
    | "remediation",
  title: string,
  body: string,
  teachingStrategy: InstructionalStrategy,
): LearningContent {
  return {
    id:
      `content-gh-b4-english-${slug(spec.code)}-${suffix}-en`,

    competencyId:
      spec.competencyId,

    type,

    title,

    body,

    language:
      "en",

    teachingStrategy,

    metadata: {
      curriculumNodeCode:
        spec.code,

      curriculumSource:
        SOURCE,

      targetSubskills:
        JSON.stringify(spec.subskills),

      misconceptionPatterns:
        JSON.stringify(spec.misconceptions),
    },

    version:
      evidenceFor(spec)
        ? "english-adaptive-2.0"
        : "english-adaptive-1.0",

    createdAt:
      now,

    updatedAt:
      now,
  };
}

export const GHANA_B4_ENGLISH_GENERATED_CONTENT:
  LearningContent[] =
    GHANA_B4_ENGLISH_PRODUCTION_SPECS.flatMap(
      (spec) => [
        assessment(
          spec,
          "diagnostic",
        ),

        instruction(
          spec,
          "lesson",
          "lesson",
          spec.title,
          lessonBody(spec),
          "direct_explanation",
        ),

        instruction(
          spec,
          "practice",
          "practice",
          `${spec.title} Practice`,
          practiceBody(spec),
          "guided_practice",
        ),

        instruction(
          spec,
          "scaffold",
          "scaffold",
          `${spec.title} Step by Step`,
          scaffoldBody(spec),
          "step_by_step_scaffold",
        ),

        instruction(
          spec,
          "remediation",
          "remediation",
          `${spec.title} Misconception Repair`,
          remediationBody(spec),
          "error_analysis",
        ),

        assessment(
          spec,
          "reassessment",
        ),

        assessment(
          spec,
          "retention",
        ),

        assessment(
          spec,
          "transfer",
        ),
      ],
    );

if (
  GHANA_B4_ENGLISH_GENERATED_CONTENT.length !== 1048
) {
  throw new Error(
    `Expected 1048 B4 English production content records, found ${GHANA_B4_ENGLISH_GENERATED_CONTENT.length}.`,
  );
}