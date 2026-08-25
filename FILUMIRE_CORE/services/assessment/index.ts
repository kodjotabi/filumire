import type {
  DiagnosticState,
  LearningEvidence,
  InterventionType,
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
  if (!diagnosticRules) {
    return undefined;
  }

  try {
    const rules =
      JSON.parse(
        diagnosticRules,
      ) as Record<
        string,
        DiagnosticRule
      >;

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
  const value =
    metadata?.interventionType;

  if (!value) {
    return undefined;
  }

  const validTypes: InterventionType[] = [
    "teach",
    "practice",
    "scaffold",
    "remediate",
    "reassess",
    "retention_check",
    "transfer_check",
    "teacher_review",
  ];

  return validTypes.includes(
    value as InterventionType,
  )
    ? (value as InterventionType)
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
    JSON.stringify(
      submission.response,
    ) ===
    JSON.stringify(
      expectedResponse,
    );

  const now =
    new Date().toISOString();

  const diagnosticRule =
    !correct
      ? resolveDiagnosticRule(
          submission.response,
          metadata?.diagnosticRules,
        )
      : undefined;

  /*
   * Explicit metadata remains supported.
   *
   * When metadata does not provide the type,
   * resolve it from the persisted intervention.
   */
  let interventionType =
    resolveMetadataInterventionType(
      metadata,
    );

  if (
    !interventionType &&
    submission.interventionId
  ) {
    const intervention =
      await getIntervention(
        submission.interventionId,
      );

    interventionType =
      intervention?.type;
  }

  const evidence:
    LearningEvidence = {
    id:
      `ev-${crypto.randomUUID()}`,

    learnerId:
      submission.learnerId,

    competencyId:
      submission.competencyId,

    source:
      "assessment",

    outcome:
      correct
        ? "correct"
        : "incorrect",

    timestamp:
      now,

    assessmentItemId:
      submission.assessmentItemId,

    sessionId:
      submission.sessionId,

    contentId,

    policyVersion:
      "assessment-0.4",

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
      evidenceId:
        evidence.id,

      learnerId:
        submission.learnerId,

      sessionId:
        submission.sessionId,

      assessmentItemId:
        submission.assessmentItemId,

      correct,
    },

    evidence,
  };
}