import { usesDevelopmentIdentity } from "./session-marker";

const DEVELOPMENT_PRINCIPAL_ID =
  "principal-runtime-feedback-001";

export type TeacherRelationshipType =
  "teacher";

export interface TeacherAuthorizedLearner {
  learnerId: string;
  relationshipType: TeacherRelationshipType;
}

export interface TeacherCompetencySummary {
  competencyId: string;
  competencyTitle: string;
  subjectId: string;
  subjectName: string;
  masteryEstimate: number;
  confidence: number;
  evidenceCount: number;
  diagnosticState: string;
  diagnosticConfidence: number;
  errorPatterns: string[];
  readyForAdvancement: boolean;
  retentionStatus?: string;
  transferStatus?: string;
  lastUpdated: string;
  attentionReasons: string[];
  /* Tranche 4C: content ran out; when, and when FILUMIRE retries it. */
  needsSupportSince?: string;
  needsSupportRetryAt?: string;
  /* Tranche 4G: prerequisite the learner was sent to learn first. */
  prerequisiteRepair?: {
    competencyId: string;
    competencyTitle: string;
    startedAt: string;
    completed: boolean;
  };
}

export interface TeacherSubjectSummary {
  subjectId: string;
  subjectName: string;
  competencyCount: number;
  competenciesNeedingAttention: number;
  averageMastery: number;
  averageConfidence: number;
  competencies: TeacherCompetencySummary[];
}

export interface PendingTeacherReview {
  id: string;
  learnerId: string;
  competencyId: string;
  assessmentItemId: string;
  contentId?: string;
  sessionId: string;
  response: string;
  status: "pending" | "reviewed";
  submittedAt: string;
  reviewedAt?: string;
  reviewedByPrincipalId?: string;
  evidenceId?: string;
}

/* Mirrors services/pilot-measures MasteryPilotMeasures (Tranche 4D). */
export interface MeasureRate {
  numerator: number;
  denominator: number;
  rate: number | null;
}

export interface MasteryPilotMeasures {
  version: string;
  learners: number;
  competenciesAttempted: number;
  competenciesMastered: number;
  falseMasteryRate: MeasureRate;
  retentionAfterMastery: MeasureRate;
  delayedRetentionAfterMastery: MeasureRate;
  transferAfterMastery: MeasureRate;
  teacherAgreementAfterMastery: MeasureRate;
  stuckRate: MeasureRate;
  contentExhaustedCount: number;
  medianAnswersToMastery: number | null;
  medianMinutesToMastery: number | null;
  meanLearningGain: number | null;
  learningGainSample: number;
}

export interface TeacherLearnerSummary {
  learnerId: string;
  subjects: TeacherSubjectSummary[];
  attentionQueue: TeacherCompetencySummary[];
  pendingReviews: PendingTeacherReview[];
  pendingReviewCount: number;
  updatedAt?: string;
  /* Tranche 4D: Option B mastery pilot measures for this learner. */
  masteryMeasures?: MasteryPilotMeasures;
}

export interface TeacherSummaryResponse {
  learners: TeacherAuthorizedLearner[];
  selectedLearnerId?: string;
  requiresSelection: boolean;
  summary: TeacherLearnerSummary | null;
}

export class TeacherRequestError extends Error {
  status: number;

  constructor(
    message: string,
    status: number,
  ) {
    super(message);
    this.status = status;
  }
}

function getTeacherApiHeaders(): Record<string, string> {
  if (!usesDevelopmentIdentity()) {
    return {
      "Content-Type": "application/json",
    };
  }

  return {
    "Content-Type": "application/json",
    "x-filumire-principal-id":
      DEVELOPMENT_PRINCIPAL_ID,
  };
}

export async function fetchTeacherSummary(
  learnerId?: string,
): Promise<TeacherSummaryResponse> {
  const url = learnerId
    ? `/api/teacher/summary?learnerId=${encodeURIComponent(
        learnerId,
      )}`
    : "/api/teacher/summary";

  let response: Response;

  try {
    response = await fetch(url, {
      headers: getTeacherApiHeaders(),
    });
  } catch {
    throw new TeacherRequestError(
      "Unable to reach the teacher service.",
      0,
    );
  }

  if (!response.ok) {
    const result =
      await response
        .json()
        .catch(() => null);

    throw new TeacherRequestError(
      result?.error ??
        "Unable to load the teacher summary.",
      response.status,
    );
  }

  return (
    await response.json()
  ) as TeacherSummaryResponse;
}

export type TeacherReviewOutcome =
  | "correct"
  | "incorrect"
  | "partial"
  | "skipped"
  | "observed";

export interface TeacherReviewSubmission {
  reviewId: string;
  outcome: TeacherReviewOutcome;
}

export interface TeacherReviewResponse {
  review: {
    id: string;
    status: "pending" | "reviewed";
    evidenceId?: string;
  };
  duplicate?: boolean;
  assessment?: {
    evidence: {
      id: string;
      evaluatorType?: string;
      evaluatorId?: string;
      evaluationPolicyVersion?: string;
      [key: string]: unknown;
    };
    result: {
      correct: boolean;
      duplicate?: boolean;
      [key: string]: unknown;
    };
    [key: string]: unknown;
  };
  learnerState?: {
    learnerId: string;
    competencies: Array<{
      competencyId: string;
      masteryEstimate: number;
      confidence: number;
      evidenceCount: number;
    }>;
    [key: string]: unknown;
  };
}

export async function submitTeacherReview(
  submission: TeacherReviewSubmission,
): Promise<TeacherReviewResponse> {
  let response: Response;

  try {
    response = await fetch(
      "/api/teacher/review",
      {
        method: "POST",
        headers: getTeacherApiHeaders(),
        body: JSON.stringify(submission),
      },
    );
  } catch {
    throw new TeacherRequestError(
      "Unable to reach the teacher service.",
      0,
    );
  }

  if (!response.ok) {
    const result =
      await response
        .json()
        .catch(() => null);

    throw new TeacherRequestError(
      result?.error ??
        "Unable to submit the teacher review.",
      response.status,
    );
  }

  return (
    await response.json()
  ) as TeacherReviewResponse;
}
