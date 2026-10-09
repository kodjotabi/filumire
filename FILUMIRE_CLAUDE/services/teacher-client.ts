import type {
  TeacherLearnerSummary,
} from "./teacher-summary";

export interface TeacherLearnerOption {
  learnerId: string;
  relationshipType: string;
}

export interface TeacherSummaryResponse {
  learners: TeacherLearnerOption[];
  selectedLearnerId?: string;
  requiresSelection: boolean;
  summary: TeacherLearnerSummary | null;
}

/*
 * Outside production the teacher API resolves the principal
 * from a development header (services/identity
 * resolvePrincipalIdentity). Without it the teacher workspace
 * always showed "Please sign in" during local testing. In
 * production the session cookie is used and no header is sent.
 */
const DEVELOPMENT_PRINCIPAL_ID =
  "principal-runtime-feedback-001";

function teacherHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    "content-type": "application/json",
  };

  if (process.env.NODE_ENV !== "production") {
    headers["x-filumire-principal-id"] =
      DEVELOPMENT_PRINCIPAL_ID;
  }

  return headers;
}

export class TeacherRequestError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "TeacherRequestError";
  }
}

export async function fetchTeacherSummary(
  learnerId?: string,
): Promise<TeacherSummaryResponse> {
  const params = new URLSearchParams();

  if (learnerId) {
    params.set("learnerId", learnerId);
  }

  const query = params.toString();

  const response = await fetch(
    `/api/teacher/summary${query ? `?${query}` : ""}`,
    {
      method: "GET",
      cache: "no-store",
      headers: teacherHeaders(),
    },
  );

  if (!response.ok) {
    throw new TeacherRequestError(
      "Unable to load teacher summary.",
      response.status,
    );
  }

  return response.json() as Promise<TeacherSummaryResponse>;
}

export type ControlledTeacherActionType =
  | "request_practice"
  | "request_explanation"
  | "request_review"
  | "request_reassessment";

export interface ControlledTeacherActionResult {
  action: {
    id: string;
    learnerId: string;
    competencyId: string;
    teacherPrincipalId: string;
    actionType: ControlledTeacherActionType;
    reason?: string;
    status: string;
    createdAt: string;
    resolvedAt?: string;
  };
  duplicate: boolean;
}

export async function createTeacherAction(
  input: {
    learnerId: string;
    competencyId: string;
    actionType: ControlledTeacherActionType;
    reason?: string;
    clientRequestId: string;
  },
): Promise<ControlledTeacherActionResult> {
  const response = await fetch(
    "/api/teacher/actions",
    {
      method: "POST",
      headers: teacherHeaders(),
      body: JSON.stringify(input),
    },
  );

  if (!response.ok) {
    throw new TeacherRequestError(
      "Unable to submit teacher action.",
      response.status,
    );
  }

  return response.json() as Promise<ControlledTeacherActionResult>;
}

export type TeacherProfessionalNoteType =
  | "context"
  | "instructional"
  | "professional_feedback";

export async function createTeacherObservation(
  input: {
    learnerId: string;
    competencyId: string;
    outcome:
      | "correct"
      | "incorrect"
      | "partial"
      | "skipped"
      | "observed";
    clientRequestId: string;
  },
): Promise<unknown> {
  const response = await fetch(
    "/api/teacher/observations",
    {
      method: "POST",
      headers: teacherHeaders(),
      body: JSON.stringify(input),
    },
  );

  if (!response.ok) {
    throw new TeacherRequestError(
      "Unable to record teacher observation.",
      response.status,
    );
  }

  return response.json();
}

export async function createTeacherNote(
  input: {
    learnerId: string;
    competencyId?: string;
    noteType: TeacherProfessionalNoteType;
    text: string;
    clientRequestId: string;
  },
): Promise<unknown> {
  const response = await fetch(
    "/api/teacher/notes",
    {
      method: "POST",
      headers: teacherHeaders(),
      body: JSON.stringify(input),
    },
  );

  if (!response.ok) {
    throw new TeacherRequestError(
      "Unable to create teacher note.",
      response.status,
    );
  }

  return response.json();
}

export type TeacherReviewOutcome =
  | "correct"
  | "incorrect"
  | "partial"
  | "skipped"
  | "observed";

export async function submitTeacherReview(
  input: {
    reviewId: string;
    outcome: TeacherReviewOutcome;
  },
): Promise<unknown> {
  const response = await fetch(
    "/api/teacher/review",
    {
      method: "POST",
      headers: teacherHeaders(),
      body: JSON.stringify(input),
    },
  );

  if (!response.ok) {
    throw new TeacherRequestError(
      "Unable to complete teacher review.",
      response.status,
    );
  }

  return response.json();
}

export interface TeacherThreadMessage {
  id: string;
  learnerId: string;
  senderRole: "guardian" | "teacher";
  text: string;
  createdAt: string;
}

export async function fetchTeacherMessages(
  learnerId: string,
): Promise<TeacherThreadMessage[]> {
  const response = await fetch(
    `/api/teacher/messages?learnerId=${encodeURIComponent(
      learnerId,
    )}`,
    {
      method: "GET",
      cache: "no-store",
      headers: teacherHeaders(),
    },
  );

  if (!response.ok) {
    throw new TeacherRequestError(
      "Unable to load parent-teacher messages.",
      response.status,
    );
  }

  const result = await response.json() as {
    messages: TeacherThreadMessage[];
  };

  return result.messages;
}

export async function createTeacherMessage(
  input: {
    learnerId: string;
    text: string;
    clientRequestId: string;
  },
): Promise<unknown> {
  const response = await fetch(
    "/api/teacher/messages",
    {
      method: "POST",
      headers: teacherHeaders(),
      body: JSON.stringify(input),
    },
  );

  if (!response.ok) {
    throw new TeacherRequestError(
      "Unable to send message.",
      response.status,
    );
  }

  return response.json();
}
