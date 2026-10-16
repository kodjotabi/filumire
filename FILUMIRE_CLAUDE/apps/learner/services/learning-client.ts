import { usesDevelopmentIdentity } from "./session-marker";
import { readLanguage } from "../components/filumire/language";

export const DEVELOPMENT_LEARNER_ID =
  "learner-runtime-feedback-001";

export const SESSION_ID =
  `session-${DEVELOPMENT_LEARNER_ID}`;

export const IS_PRODUCTION =
  process.env.NODE_ENV === "production";

export type LearningContent = {
  language?: "en" | "fr";
  id: string;
  competencyId: string;
  type: string;
  title: string;
  body: string;
  assessmentItemId?: string;
  metadata?: {
    options?: string;
    expectedResponse?: string;
    evaluationMethod?: string;
  };
};

export type LearningResponse = {
  /** Signed delivery identity; not proof of completion or mastery. */
  lessonReceipt?: string;
  learnerState: {
    learnerId: string;
    competencies: Array<{
      competencyId: string;
      masteryEstimate: number;
      confidence: number;
      evidenceCount: number;
    }>;
  };

  decision: {
    id: string;
    interventionId?: string;
    sessionId: string;
    action: string;
    competencyId: string;
    reasonCode: string;
    instructionalStrategy?: string;
    responseMode?: string;
  };

  progress: {
    learnerId: string;
    activeCompetencyId?: string;
    competencyCount: number;
    completedCompetencies: number;
    masteryEstimate: number;
    confidence: number;
    evidenceCount: number;
    readiness: boolean;
    /** Legacy mastery/confidence aggregate; never use as lesson or subject completion. */
    percent: number;
    subjectId?: string;
    subjectName?: string;
    competencyTitle?: string;
  };

  content?: LearningContent;

  instruction: {
    content: string;
    structured?: {
      elements: Array<{
        type: string;
        text: string;
      }>;
    };
  };

  assessment?: {
    result: {
      correct: boolean;
      assessmentItemId?: string;
      duplicate?: boolean;
    };
    evidence?: { outcome: string };
  };
};

export type PendingTeacherReviewResponse = {
  id: string;
  status: "pending" | "reviewed";
  duplicate: boolean;
};
export function isPendingTeacherReviewResponse(
  value: LearningResponse | {
    pendingTeacherReview: PendingTeacherReviewResponse;
  },
): value is {
  pendingTeacherReview: PendingTeacherReviewResponse;
} {
  return "pendingTeacherReview" in value;
}
export class LearningRequestError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

/*
 * Thrown when the request itself could not reach the server
 * (a connectivity-type failure), as opposed to a real server
 * response such as an authorization or validation error.
 */
export class LearningNetworkError extends Error {}

export async function fetchDashboardSnapshot(subjectId?: string): Promise<LearningResponse> {
  const url = getLearningUrl(subjectId);
  let response: Response;
  try {
    response = await fetch(`${url}${url.includes("?") ? "&" : "?"}dashboard=1`, {
      headers: getApiHeaders(), cache: "no-store",
    });
  } catch { throw new LearningNetworkError("Unable to reach FILUMIRE."); }
  if (!response.ok) throw new LearningRequestError("Unable to load dashboard.", response.status);
  return response.json();
}

export function getApiHeaders(): Record<string, string> {
  // The interface language also chooses the lesson language.
  const language: Record<string, string> =
    typeof window === "undefined"
      ? {}
      : { "x-filumire-language": readLanguage() };

  if (!usesDevelopmentIdentity()) {
    return {
      "Content-Type": "application/json",
      ...language,
    };
  }

  return {
    "Content-Type": "application/json",
    ...language,
    "x-filumire-learner-id":
      DEVELOPMENT_LEARNER_ID,
  };
}

export function getLearningUrl(
  subjectId?: string,
): string {
  const params = new URLSearchParams();

  if (usesDevelopmentIdentity()) {
    params.set("sessionId", SESSION_ID);
  }

  if (subjectId) {
    params.set("subjectId", subjectId);
  }

  const query = params.toString();

  return query
    ? `/api/learning?${query}`
    : "/api/learning";
}

export function getSessionId(
  data: LearningResponse,
): string {
  return !usesDevelopmentIdentity()
    ? data.decision.sessionId
    : SESSION_ID;
}

export async function fetchLearningSession(
  subjectId?: string,
): Promise<LearningResponse> {
  let response: Response;

  /*
   * With the development header and no subjectId the route falls
   * back to the validation test subject (one "Number Sequences"
   * topic), so Home and /learn showed test content during local
   * testing. Use the learner's active subject from the overview
   * instead. Production resolves the stored learning context on
   * the server and is unchanged.
   */
  if (!subjectId && usesDevelopmentIdentity()) {
    const overview = await fetchLearningOverview();
    subjectId = overview?.activeSubjectId || undefined;
  }

  try {
    response = await fetch(
      getLearningUrl(subjectId),
      {
        cache: "no-store",
        headers: getApiHeaders(),
      },
    );
  } catch {
    throw new LearningNetworkError(
      "Unable to reach the server.",
    );
  }

  if (!response.ok) {
    const result =
      await response
        .json()
        .catch(() => null);

    throw new LearningRequestError(
      result?.error ??
        "Unable to load the learning session.",
      response.status,
    );
  }

  return (await response.json()) as LearningResponse;
}

export interface AssessmentSubmissionBody {
  learnerId: string;
  sessionId: string;
  interventionId?: string;
  assessmentItemId: string;
  competencyId: string;
  response: string;
  clientRequestId: string;
}

/*
 * Submits a trusted assessment response through the existing
 * learning API. Never resolves as success unless the server
 * actually accepted and evaluated the submission.
 */
export async function submitAssessmentResponse(
  body: AssessmentSubmissionBody,
): Promise<LearningResponse | { pendingTeacherReview: PendingTeacherReviewResponse }> {
  let response: Response;

  try {
    response = await fetch("/api/learning", {
      method: "POST",
      headers: getApiHeaders(),
      body: JSON.stringify({
        ...body,
        interactionType: "assessment",
      }),
    });
  } catch {
    throw new LearningNetworkError(
      "Unable to reach the server.",
    );
  }

  if (!response.ok) {
    const result =
      await response
        .json()
        .catch(() => null);

    throw new LearningRequestError(
      result?.error ??
        "Unable to submit your answer.",
      response.status,
    );
  }

  return (await response.json()) as LearningResponse;
}

/*
 * Tranche 4B: the learner pressed Next on a teaching card. The
 * server marks that step delivered (no evidence, no mastery
 * change) and returns the next learning step.
 */
export async function acknowledgeLearningStep(body: {
  sessionId: string;
  interventionId: string;
  competencyId: string;
}): Promise<LearningResponse> {
  let response: Response;

  try {
    response = await fetch("/api/learning", {
      method: "POST",
      headers: getApiHeaders(),
      body: JSON.stringify({
        ...body,
        interactionType: "acknowledge",
      }),
    });
  } catch {
    throw new LearningNetworkError(
      "Unable to reach the server.",
    );
  }

  if (!response.ok) {
    const result =
      await response
        .json()
        .catch(() => null);

    throw new LearningRequestError(
      result?.error ??
        "Unable to continue.",
      response.status,
    );
  }

  return (await response.json()) as LearningResponse;
}

/*
 * A subject the server says is available for the learner's
 * grade. discipline is the stable subject-type key used for
 * presentation; id is used for every data relationship.
 */
export type AvailableSubject = {
  id: string;
  name: string;
  code: string;
  discipline: string;
};

export type LearningOverview = {
  gradeId: string;
  gradeName: string;
  // The guardian chose this class; the learner cannot change it.
  gradeSetByGuardian?: boolean;
  activeSubjectId: string;
  availableSubjects: AvailableSubject[];
  // Subjects of each supported grade, for first-time setup.
  gradeSubjects?: Record<string, AvailableSubject[]>;
  subjects: Record<
    string,
    { total: number; tracked: number; completed: number; started: boolean }
  >;
  areasSubjectId: string;
  areas: Array<{
    id: string;
    title: string;
    description: string;
    status: "completed" | "inprogress" | "new";
  }>;
};

export async function fetchLearningOverview(
  subjectId?: string,
): Promise<LearningOverview | null> {
  try {
    const query = subjectId
      ? `&subjectId=${encodeURIComponent(subjectId)}`
      : "";
    const response = await fetch(`/api/learning?overview=1${query}`, {
      headers: getApiHeaders(),
      cache: "no-store",
    });
    if (!response.ok) return null;
    return (await response.json()) as LearningOverview;
  } catch {
    return null;
  }
}
