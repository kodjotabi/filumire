import { IS_PRODUCTION } from "./learning-client";

const DEVELOPMENT_PRINCIPAL_ID =
  "principal-runtime-feedback-001";

export type RelationshipType =
  | "self"
  | "guardian"
  | "teacher";

export interface AuthorizedLearner {
  learnerId: string;
  relationshipType: RelationshipType;
}

export interface AdultActivityEntry {
  outcome: string;
  occurredAt: string;
}

export interface AdultLearnerSummary {
  hasActivity: boolean;
  subjectName?: string;
  competencyTitle?: string;
  masteryPercent: number;
  confidencePercent: number;
  evidenceCount: number;
  readyForAdvancement: boolean;
  retentionStatus?: string;
  transferStatus?: string;
  needsSupport?: string;
  nextFocus?: string;
  recentActivity: AdultActivityEntry[];
}

export interface AdultSummaryResponse {
  learners: AuthorizedLearner[];
  selectedLearnerId?: string;
  requiresSelection: boolean;
  summary: AdultLearnerSummary | null;
}

export class AdultRequestError extends Error {
  status: number;

  constructor(
    message: string,
    status: number,
  ) {
    super(message);
    this.status = status;
  }
}

function getAdultApiHeaders(): Record<string, string> {
  if (IS_PRODUCTION) {
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

export async function fetchAdultSummary(
  learnerId?: string,
): Promise<AdultSummaryResponse> {
  const url = learnerId
    ? `/api/adult/summary?learnerId=${encodeURIComponent(
        learnerId,
      )}`
    : "/api/adult/summary";

  const response = await fetch(url, {
    headers: getAdultApiHeaders(),
  });

  if (!response.ok) {
    const result =
      await response
        .json()
        .catch(() => null);

    throw new AdultRequestError(
      result?.error ??
        "Unable to load the learning summary.",
      response.status,
    );
  }

  return (
    await response.json()
  ) as AdultSummaryResponse;
}
