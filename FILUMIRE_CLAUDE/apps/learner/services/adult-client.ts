import { usesDevelopmentIdentity } from "./session-marker";

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

export type ParentAlertLevel =
  | "attention"
  | "positive"
  | "information";

export type ParentAlertType =
  | "support_needed"
  | "retention_support"
  | "transfer_support"
  | "ready_to_advance"
  | "teacher_review"
  | "learning_active";

export interface ParentAlert {
  id: string;
  type: ParentAlertType;
  level: ParentAlertLevel;
  title: string;
  message: string;
}

export interface HomeSupportGuidance {
  id: string;
  title: string;
  guidance: string;
  boundary: string;
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
  parentExperienceVersion?: string;
  strengths?: string[];
  supportAreas?: string[];
  homeSupport?: HomeSupportGuidance[];
  alerts?: ParentAlert[];
}

export interface AdultSummaryResponse {
  learners: AuthorizedLearner[];
  selectedLearnerId?: string;
  requiresSelection: boolean;
  summary: AdultLearnerSummary | null;
}

export interface ParentTeacherMessage {
  id: string;
  learnerId: string;
  authorPrincipalId: string;
  senderRole: "guardian" | "teacher";
  text: string;
  createdAt: string;
}

export interface ParentTeacherMessagesResponse {
  learnerId: string;
  messages: ParentTeacherMessage[];
}

export interface CreateParentMessageResult {
  message: ParentTeacherMessage;
  duplicate: boolean;
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

async function readError(
  response: Response,
  fallback: string,
): Promise<never> {
  const result =
    await response
      .json()
      .catch(() => null);

  throw new AdultRequestError(
    result?.error ?? fallback,
    response.status,
  );
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
    return readError(
      response,
      "Unable to load the learning summary.",
    );
  }

  return (
    await response.json()
  ) as AdultSummaryResponse;
}

export async function fetchParentTeacherMessages(
  learnerId: string,
): Promise<ParentTeacherMessagesResponse> {
  const response = await fetch(
    `/api/parent/messages?learnerId=${encodeURIComponent(
      learnerId,
    )}`,
    {
      headers: getAdultApiHeaders(),
    },
  );

  if (!response.ok) {
    return readError(
      response,
      "Unable to load messages.",
    );
  }

  return (
    await response.json()
  ) as ParentTeacherMessagesResponse;
}

export async function createParentTeacherMessage(
  input: {
    learnerId: string;
    text: string;
    clientRequestId: string;
  },
): Promise<CreateParentMessageResult> {
  const response = await fetch(
    "/api/parent/messages",
    {
      method: "POST",
      headers: getAdultApiHeaders(),
      body: JSON.stringify(input),
    },
  );

  if (!response.ok) {
    return readError(
      response,
      "Unable to send the message.",
    );
  }

  return (
    await response.json()
  ) as CreateParentMessageResult;
}
