import type {
  DiagnosticState,
  LearningEvidence,
  InterventionType,
  InstructionalStrategy,
  ResponseMode,
} from "../../packages/domain";

import type {
  AssessmentResult,
  AssessmentSubmission,
} from "../../packages/contracts";

import {
  getIntervention,
} from "../intervention-store";

interface DiagnosticRule {
  errorPattern?: string;
  diagnosticState?: DiagnosticState;
  diagnosticConfidence?: number;
}

function resolveDiagnosticRule(
  response: unknown,
  diagnosticRules?: string,
): DiagnosticRule | undefined {
  if (!diagnosticRules) return undefined;

  try {
    const rules =
      JSON.parse(diagnosticRules) as Record<string, DiagnosticRule>;

    const responseKey =
      typeof response === "string"
        ? response
        : JSON.stringify(response);

    return rules[responseKey];
  } catch {
    return undefined;
  }
}

function resolveMetadataInterventionType(
  metadata?: Record<string, string>,
): InterventionType | undefined {
  const value = metadata?.interventionType;

  if (!value) return undefined;

  const valid: InterventionType[] = [
    "diagnose",
    "teach",
    "practice",
    "scaffold",
    "remediate",
    "reassess",
    "retention_check",
    "transfer_check",
    "teacher_review",
  ];

  return valid.includes(value as InterventionType)
    ? (value as InterventionType)
    : undefined;
}

function resolveMetadataStrategy(
  metadata?: Record<string, string>,
): InstructionalStrategy | undefined {
  const value = metadata?.instructionalStrategy;

  if (!value) return undefined;

  const valid: InstructionalStrategy[] = [
    "direct_explanation",
    "worked_example",
    "guided_practice",
    "questioning",
    "visual_representation",
    "concrete_representation",
    "analogy",
    "demonstration",
    "story_context",
    "step_by_step_scaffold",
    "error_analysis",
    "retrieval_practice",
    "mixed_representation",
  ];

  return valid.includes(value as InstructionalStrategy)
    ? (value as InstructionalStrategy)
    : undefined;
}

function resolveMetadataResponseMode(
  metadata?: Record<string, string>,
): ResponseMode | undefined {
  const value = metadata?.responseMode;

  if (!value) return undefined;

  const valid: ResponseMode[] = [
    "multiple_choice",
    "short_answer",
    "constructed_response",
    "worked_solution",
    "explanation",
    "error_identification",
    "sequence_ordering",
    "matching",
    "classification",
    "application",
    "oral_response",
    "observed_performance",
  ];

  return valid.includes(value as ResponseMode)
    ? (value as ResponseMode)
    : undefined;
}

export async function evaluateAssessment(
  submission: AssessmentSubmission,
  expectedResponse: unknown,
  contentId?: string,
  metadata?: Record<string, string>,
): Promise<{
  result: AssessmentResult;
  evidence: LearningEvidence;
}> {
  const correct =
    JSON.stringify(submission.response) ===
    JSON.stringify(expectedResponse);

  const now = new Date().toISOString();

  const diagnosticRule =
    !correct
      ? resolveDiagnosticRule(
          submission.response,
          metadata?.diagnosticRules,
        )
      : undefined;

  let interventionType =
    resolveMetadataInterventionType(metadata);

  let instructionalStrategy =
    resolveMetadataStrategy(metadata);

  let responseMode =
    resolveMetadataResponseMode(metadata);

  if (submission.interventionId) {
    const intervention =
      await getIntervention(
        submission.interventionId,
      );

    interventionType =
      interventionType ??
      intervention?.type;

    instructionalStrategy =
      instructionalStrategy ??
      intervention?.instructionalStrategy;

    responseMode =
      responseMode ??
      intervention?.responseMode;
  }

  const evidence: LearningEvidence = {
    id: `ev-${crypto.randomUUID()}`,

    learnerId: submission.learnerId,
    competencyId: submission.competencyId,

    source: "assessment",

    outcome:
      correct
        ? "correct"
        : "incorrect",

    timestamp: now,

    assessmentItemId:
      submission.assessmentItemId,

    sessionId:
      submission.sessionId,

    contentId,

    instructionalStrategy,

    responseMode,

    policyVersion: "assessment-0.6",

    errorPattern:
      diagnosticRule?.errorPattern,

    diagnosticState:
      diagnosticRule?.diagnosticState,

    diagnosticConfidence:
      diagnosticRule?.diagnosticConfidence,

    interventionId:
      submission.interventionId,

    interventionType,
  };

  return {
    result: {
      evidenceId: evidence.id,
      learnerId: submission.learnerId,
      sessionId: submission.sessionId,
      assessmentItemId:
        submission.assessmentItemId,
      correct,
    },

    evidence,
  };
}
