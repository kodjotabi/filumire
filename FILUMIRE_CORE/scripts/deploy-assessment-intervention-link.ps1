$ErrorActionPreference = "Stop"

$Root = "C:\Users\tabi\Desktop\filumire\FILUMIRE_CORE"

@'
import type {
  DiagnosticState,
  LearningEvidence,
} from "../../packages/domain";

import type {
  AssessmentResult,
  AssessmentSubmission,
} from "../../packages/contracts";

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

export function evaluateAssessment(
  submission: AssessmentSubmission,
  expectedResponse: unknown,
  contentId?: string,
  metadata?: Record<string, string>,
): {
  result: AssessmentResult;
  evidence: LearningEvidence;
} {
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
      "assessment-0.3",

    errorPattern:
      diagnosticRule?.errorPattern,

    diagnosticState:
      diagnosticRule?.diagnosticState,

    diagnosticConfidence:
      diagnosticRule?.diagnosticConfidence,

    interventionId:
      submission.interventionId,
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
'@ | Set-Content `
  "$Root\services\assessment\index.ts" `
  -Encoding UTF8

Write-Host ""
Write-Host "Assessment intervention evidence linkage installed."
Write-Host ""
Write-Host "Run:"
Write-Host "npx tsx --env-file=.env.local ./tests/complete-intervention-loop.test.ts"