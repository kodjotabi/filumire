import type { InstructionalStrategy, ResponseMode } from "../../packages/domain";
import type { LearningContent } from "../../packages/content";
import { GHANA_B4_MATHEMATICS_ADAPTIVE_SPECS } from "../../packages/curriculum/ghana-b4-mathematics-adaptive";

const SOURCE = "NaCCA Mathematics Curriculum, Basic 4";
const now = new Date().toISOString();

function slug(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function responseMode(profile: string, purpose: string): ResponseMode {
  if (purpose === "transfer") return "application";

  switch (profile) {
    case "procedural_fluency":
    case "measurement":
      return "worked_solution";
    case "mathematical_reasoning":
      return "explanation";
    case "problem_solving":
    case "application":
      return "application";
    case "representation":
    case "data_interpretation":
      return "constructed_response";
    case "estimation":
      return "short_answer";
    case "conceptual_understanding":
    default:
      return "constructed_response";
  }
}

function assessment(
  competencyId: string,
  code: string,
  purpose: "diagnostic" | "reassessment" | "retention" | "transfer",
  title: string,
  body: string,
  profile: string,
  successCriteria: string[],
  subskills: string[],
): LearningContent {
  return {
    id: `content-gh-b4-mathematics-${slug(competencyId)}-${purpose}`,
    competencyId,
    type: "assessment",
    title,
    body,
    language: "en",
    assessmentStrategy: responseMode(profile, purpose),
    assessmentItemId: `item-gh-b4-mathematics-${slug(competencyId)}-${purpose}`,
    metadata: {
      expectedResponse: "rubric_evaluated_performance",
      assessmentPurpose: purpose,
      curriculumNodeCode: code,
      curriculumSource: SOURCE,
      evidenceProfile: profile,
      successCriteria: JSON.stringify(successCriteria),
      targetSubskills: JSON.stringify(subskills),
    },
    version: "mathematics-adaptive-1.0",
    createdAt: now,
    updatedAt: now,
  };
}

function instruction(
  competencyId: string,
  suffix: string,
  type: "lesson" | "practice" | "scaffold" | "remediation",
  title: string,
  body: string,
  strategy: InstructionalStrategy,
  code: string,
): LearningContent {
  return {
    id: `content-gh-b4-mathematics-${slug(competencyId)}-${suffix}`,
    competencyId,
    type,
    title,
    body,
    language: "en",
    teachingStrategy: strategy,
    metadata: {
      curriculumNodeCode: code,
      curriculumSource: SOURCE,
    },
    version: "mathematics-adaptive-1.0",
    createdAt: now,
    updatedAt: now,
  };
}

export const GHANA_B4_MATHEMATICS_GENERATED_CONTENT: LearningContent[] =
  GHANA_B4_MATHEMATICS_ADAPTIVE_SPECS.flatMap((spec) => {
    if (!spec.evidence) {
      throw new Error(`Missing Mathematics evidence for ${spec.competencyId}`);
    }

    const evidence = spec.evidence;

    const directMappings = spec.indicatorMappings.filter(
      (mapping) => mapping.relationship === "direct",
    );

    if (directMappings.length === 0) {
      throw new Error(
        `Missing direct Mathematics indicator mapping for ${spec.competencyId}`,
      );
    }

    const code = directMappings[0].code;

    const lessonBody =
      `${spec.description} Focus on ${spec.subskills.join(", ")}.`;

    const practiceBody =
      `Practise ${spec.title.toLowerCase()} through tasks that require ${spec.subskills.join(", ")}.`;

    const scaffoldBody =
      `Work step by step. Focus first on ${spec.subskills[0] ?? spec.title}, then connect it to ${spec.subskills.slice(1).join(", ") || "the complete task"}.`;

    const remediationBody =
      spec.misconceptions.length > 0
        ? `Check and correct these likely misunderstandings: ${spec.misconceptions.join("; ")}.`
        : `Review the reasoning used for ${spec.title.toLowerCase()} and correct errors before trying again.`;

    return [
      assessment(
        spec.competencyId,
        code,
        "diagnostic",
        `${spec.title} Diagnostic`,
        evidence.diagnosticTask,
        evidence.profile,
        evidence.successCriteria,
        evidence.targetSubskills,
      ),

      instruction(
        spec.competencyId,
        "lesson",
        "lesson",
        spec.title,
        lessonBody,
        "direct_explanation",
        code,
      ),

      instruction(
        spec.competencyId,
        "practice",
        "practice",
        `${spec.title} Practice`,
        practiceBody,
        "guided_practice",
        code,
      ),

      instruction(
        spec.competencyId,
        "scaffold",
        "scaffold",
        `${spec.title} Step by Step`,
        scaffoldBody,
        "step_by_step_scaffold",
        code,
      ),

      instruction(
        spec.competencyId,
        "remediation",
        "remediation",
        `${spec.title} Misconception Repair`,
        remediationBody,
        "error_analysis",
        code,
      ),

      assessment(
        spec.competencyId,
        code,
        "reassessment",
        `${spec.title} Reassessment`,
        evidence.reassessmentTask,
        evidence.profile,
        evidence.successCriteria,
        evidence.targetSubskills,
      ),

      assessment(
        spec.competencyId,
        code,
        "retention",
        `${spec.title} Retention Check`,
        evidence.retentionTask,
        evidence.profile,
        evidence.successCriteria,
        evidence.targetSubskills,
      ),

      assessment(
        spec.competencyId,
        code,
        "transfer",
        `${spec.title} Transfer`,
        evidence.transferTask,
        evidence.profile,
        evidence.successCriteria,
        evidence.targetSubskills,
      ),
    ];
  });

