import type {
  DiagnosticState,
  EvidenceDifficulty,
  EvidenceErrorClass,
  EvidenceEvaluatorType,
  EvidenceIndependence,
  EvidenceOutcome,
  EvidencePurpose,
  EvidenceRepresentation,
  EvidenceStrength,
  LearningEvidence,
  InterventionType,
  InstructionalStrategy,
  ResponseMode,
} from "../../packages/domain";

import type {
  AssessmentResult,
  AssessmentSubmission,
  SubmissionAssistance,
} from "../../packages/contracts";

import {
  getIntervention,
} from "../intervention-store";

import {
  getEvidence,
} from "../evidence-store";

interface DiagnosticRule {
  errorPattern?: string;
  diagnosticState?: DiagnosticState;
  diagnosticConfidence?: number;
  errorClass?: EvidenceErrorClass;
  prerequisiteCompetencyId?: string;
  misconceptionId?: string;
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

function resolveEvidencePurpose(
  metadata: Record<string, string> | undefined,
  interventionType: InterventionType | undefined,
): EvidencePurpose {
  const metadataPurpose = metadata?.evidencePurpose;

  const valid: EvidencePurpose[] = [
    "diagnostic",
    "practice",
    "mastery",
    "retention",
    "transfer",
    "intervention_evaluation",
    "teacher_observation",
  ];

  if (
    metadataPurpose &&
    valid.includes(metadataPurpose as EvidencePurpose)
  ) {
    return metadataPurpose as EvidencePurpose;
  }

  /*
   * Authored items declare what they were written to measure.
   * Honour that before falling back to the intervention type.
   */
  switch (metadata?.assessmentPurpose) {
    case "diagnostic":
      return "diagnostic";
    case "reassessment":
      return "mastery";
    case "retention":
      return "retention";
    case "transfer":
      return "transfer";
  }

  switch (interventionType) {
    case "diagnose":
    case "reassess":
      return "diagnostic";

    case "practice":
      return "practice";

    case "retention_check":
      return "retention";

    case "transfer_check":
      return "transfer";

    case "teach":
    case "scaffold":
    case "remediate":
      return "intervention_evaluation";

    case "teacher_review":
      return "teacher_observation";

    default:
      return "mastery";
  }
}

function resolveEvidenceIndependence(
  metadata: Record<string, string> | undefined,
  interventionType: InterventionType | undefined,
  assistance: SubmissionAssistance | undefined,
): EvidenceIndependence {
  const value = metadata?.evidenceIndependence;

  const valid: EvidenceIndependence[] = [
    "independent",
    "light_support",
    "guided",
    "fully_supported",
    "unknown",
  ];

  if (
    value &&
    valid.includes(value as EvidenceIndependence)
  ) {
    return value as EvidenceIndependence;
  }

  /*
   * The ceiling is set by the delivering intervention.
   * Teaching, scaffolding and remediation give the learner
   * support by design, so success there is guided evidence.
   */
  let level: EvidenceIndependence;

  switch (interventionType) {
    case "teach":
    case "scaffold":
    case "remediate":
      level = "guided";
      break;

    case "diagnose":
    case "practice":
    case "reassess":
    case "retention_check":
    case "transfer_check":
      level = "independent";
      break;

    default:
      return "unknown";
  }

  /*
   * Reported assistance can only lower the level.
   */
  const order: EvidenceIndependence[] = [
    "independent",
    "light_support",
    "guided",
    "fully_supported",
  ];

  let rank = order.indexOf(level);

  const lower = (
    to: EvidenceIndependence,
  ): void => {
    rank = Math.max(rank, order.indexOf(to));
  };

  if (assistance?.filuAnswerRevealed) {
    lower("fully_supported");
  }

  if (assistance?.workedExampleViewed) {
    lower("guided");
  }

  const hints = assistance?.hintsUsed ?? 0;

  if (hints >= 2) {
    lower("guided");
  } else if (hints === 1) {
    lower("light_support");
  }

  if ((assistance?.attemptNumber ?? 1) > 1) {
    lower("light_support");
  }

  return order[rank];
}

function independenceToSupportLevel(
  independence: EvidenceIndependence,
): number | undefined {
  switch (independence) {
    case "independent":
      return 0;
    case "light_support":
      return 0.25;
    case "guided":
      return 0.6;
    case "fully_supported":
      return 1;
    default:
      return undefined;
  }
}

function resolveEvidenceDifficulty(
  metadata?: Record<string, string>,
): EvidenceDifficulty {
  const value = metadata?.evidenceDifficulty;

  const valid: EvidenceDifficulty[] = [
    "foundational",
    "standard",
    "challenging",
    "extension",
    "unknown",
  ];

  if (
    value &&
    valid.includes(value as EvidenceDifficulty)
  ) {
    return value as EvidenceDifficulty;
  }

  /*
   * Authored items that test application in a new setting
   * are harder than the same competency met again directly.
   */
  if (metadata?.assessmentPurpose === "transfer") {
    return "challenging";
  }

  if (metadata?.assessmentPurpose) {
    return "standard";
  }

  return "unknown";
}

function resolveEvidenceRepresentation(
  metadata?: Record<string, string>,
): EvidenceRepresentation {
  const value = metadata?.evidenceRepresentation;

  const valid: EvidenceRepresentation[] = [
    "symbolic",
    "numeric",
    "verbal",
    "visual",
    "concrete",
    "diagram",
    "table",
    "graph",
    "story_context",
    "mixed",
    "unknown",
  ];

  return value &&
    valid.includes(value as EvidenceRepresentation)
    ? (value as EvidenceRepresentation)
    : "unknown";
}

function resolveEvidenceStrength(
  metadata: Record<string, string> | undefined,
  independence: EvidenceIndependence,
  assistance: SubmissionAssistance | undefined,
): EvidenceStrength | undefined {
  const value = metadata?.evidenceStrength;

  const valid: EvidenceStrength[] = [
    "weak",
    "moderate",
    "strong",
  ];

  if (
    value &&
    valid.includes(value as EvidenceStrength)
  ) {
    return value as EvidenceStrength;
  }

  /*
   * An answer the tutor effectively supplied carries
   * almost no weight.
   */
  if (
    independence === "fully_supported" ||
    assistance?.filuAnswerRevealed
  ) {
    return "weak";
  }

  /*
   * Multiple choice allows guessing, so an exact match is
   * moderate evidence at best.
   */
  if (metadata?.expectedResponse !== undefined) {
    return "moderate";
  }

  return undefined;
}

function resolveContextTags(
  metadata?: Record<string, string>,
): string[] | undefined {
  const raw = metadata?.contextTags;

  if (!raw) return undefined;

  try {
    const parsed = JSON.parse(raw) as unknown;

    if (
      Array.isArray(parsed) &&
      parsed.every((item) => typeof item === "string")
    ) {
      return parsed as string[];
    }
  } catch {
    return undefined;
  }

  return undefined;
}

function resolveSupportLevel(
  metadata?: Record<string, string>,
): number | undefined {
  const value = metadata?.supportLevel;

  if (value === undefined) return undefined;

  const parsed = Number(value);

  if (
    !Number.isFinite(parsed) ||
    parsed < 0 ||
    parsed > 1
  ) {
    return undefined;
  }

  return parsed;
}

function resolveExposureCount(
  metadata?: Record<string, string>,
): number | undefined {
  const value = metadata?.exposureCount;

  if (value === undefined) return undefined;

  const parsed = Number(value);

  if (
    !Number.isInteger(parsed) ||
    parsed < 0
  ) {
    return undefined;
  }

  return parsed;
}

function inferErrorClass(
  diagnosticRule?: DiagnosticRule,
): EvidenceErrorClass | undefined {
  if (diagnosticRule?.errorClass) {
    return diagnosticRule.errorClass;
  }

  switch (diagnosticRule?.diagnosticState) {
    case "prerequisite_gap":
      return "prerequisite_gap";

    case "misconception":
    case "conceptual_misunderstanding":
      return "misconception";

    case "procedural_error":
      return "procedural_error";

    case "careless_execution":
      return "careless_execution";

    case "forgotten_knowledge":
      return "retention_failure";

    case "transfer_failure":
      return "transfer_failure";

    default:
      return diagnosticRule?.errorPattern
        ? "unknown"
        : undefined;
  }
}

const CLIENT_REQUEST_ID_PATTERN =
  /^[a-zA-Z0-9-]{1,64}$/;

/*
 * A stable, client-supplied retry key becomes the evidence
 * id itself, so an identical resynchronization safely relies
 * on the existing evidence-id uniqueness guarantee instead of
 * creating a new trusted evidence row.
 */
function resolveEvidenceId(
  clientRequestId?: string,
): string {
  if (
    clientRequestId &&
    CLIENT_REQUEST_ID_PATTERN.test(
      clientRequestId,
    )
  ) {
    return `ev-${clientRequestId}`;
  }

  return `ev-${crypto.randomUUID()}`;
}

export type TrustedAssessmentEvaluatorType =
  | "teacher"
  | "system_rubric"
  | "ai_rubric"
  | "observer";

export interface TrustedAssessmentEvaluation {
  outcome: EvidenceOutcome;
  evaluatorType: TrustedAssessmentEvaluatorType;
  evaluatorId: string;
  evaluationPolicyVersion: string;
}

function validateTrustedAssessmentEvaluation(
  evaluation: TrustedAssessmentEvaluation,
): void {
  if (
    !evaluation.evaluatorId.trim() ||
    !evaluation.evaluationPolicyVersion.trim()
  ) {
    throw new Error(
      "Trusted assessment evaluation requires evaluator provenance.",
    );
  }
}

export async function evaluateAssessment(
  submission: AssessmentSubmission,
  expectedResponse: unknown,
  contentId?: string,
  metadata?: Record<string, string>,
  trustedEvaluation?: TrustedAssessmentEvaluation,
): Promise<{
  result: AssessmentResult;
  evidence: LearningEvidence;
}> {
  const exactMatch =
    JSON.stringify(submission.response) ===
    JSON.stringify(expectedResponse);

  if(metadata?.reviewEvidencePolicy==='jhs-required-performance-v1'&&metadata.evidenceIndependence==='independent'&&!trustedEvaluation){
    throw new Error('Required JHS performance cannot be evaluated by exact match.');
  }
  if(metadata?.reviewEvidencePolicy==='jhs-required-performance-v1'&&trustedEvaluation&&(trustedEvaluation.evaluatorType!=='teacher'||!/^teacher-review-jhs-v1:[a-f0-9]{64}$/.test(trustedEvaluation.evaluationPolicyVersion))){
    throw new Error('Required JHS performance needs a teacher attestation provenance digest.');
  }

  if (trustedEvaluation) {
    validateTrustedAssessmentEvaluation(
      trustedEvaluation,
    );
  }

  const outcome: EvidenceOutcome =
    trustedEvaluation?.outcome ??
    (exactMatch ? "correct" : "incorrect");

  const correct =
    outcome === "correct";

  const now = new Date().toISOString();

  const diagnosticRule =
    outcome === "incorrect"
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

  const evaluatorType: EvidenceEvaluatorType =
    trustedEvaluation?.evaluatorType ??
    "system_exact_match";

  const evaluatorId =
    trustedEvaluation?.evaluatorId ??
    "filumire-system-exact-match";

  const evaluationPolicyVersion =
    trustedEvaluation?.evaluationPolicyVersion ??
    "assessment-exact-match-1";

  const independence =
    resolveEvidenceIndependence(
      metadata,
      interventionType,
      submission.assistance,
    );

  const strength = resolveEvidenceStrength(
    metadata,
    independence,
    submission.assistance,
  );

  /*
   * Tranche 4B: the n-th answer to the same item (1 = first). A
   * repeated item is identifiable on its evidence and counts for
   * less in mastery.
   */
  const exposureCount =
    resolveExposureCount(metadata) ??
    (
      await getEvidence(
        submission.learnerId,
        submission.competencyId,
      )
    ).filter(
      (item) =>
        item.assessmentItemId ===
          submission.assessmentItemId &&
        /* A retried submission is not a new exposure. */
        item.id !==
          resolveEvidenceId(
            submission.clientRequestId,
          ),
    ).length + 1;

  const evidence: LearningEvidence = {
    id: resolveEvidenceId(
      submission.clientRequestId,
    ),

    learnerId: submission.learnerId,
    competencyId: submission.competencyId,

    source: "assessment",

    outcome,

    timestamp: now,

    assessmentItemId:
      submission.assessmentItemId,

    sessionId:
      submission.sessionId,

    contentId,

    purpose:
      resolveEvidencePurpose(
        metadata,
        interventionType,
      ),

    independence,

    supportLevel:
      resolveSupportLevel(metadata) ??
      independenceToSupportLevel(independence),

    difficulty:
      resolveEvidenceDifficulty(metadata),

    representation:
      resolveEvidenceRepresentation(metadata),

    strength,

    attemptCount:
      submission.assistance?.attemptNumber,

    contextTags: resolveContextTags(metadata),

    errorClass:
      inferErrorClass(diagnosticRule),

    errorPattern:
      diagnosticRule?.errorPattern,

    prerequisiteCompetencyId:
      diagnosticRule?.prerequisiteCompetencyId,

    misconceptionId:
      diagnosticRule?.misconceptionId ??
      (diagnosticRule?.diagnosticState ===
      "misconception"
        ? diagnosticRule.errorPattern
        : undefined),

    exposureCount,

    evaluatorType,
    evaluatorId,
    evaluationPolicyVersion,

    interpretationVersion:
      "evidence-v1.1",

    instructionalStrategy,

    responseMode,

    policyVersion: "assessment-0.9",

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
