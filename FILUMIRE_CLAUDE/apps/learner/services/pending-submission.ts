/*
 * Safe local storage for a single not-yet-synchronized
 * assessment answer. This is NOT trusted evidence - it is
 * only enough information to retry the exact same submission
 * through the existing trusted server assessment pipeline.
 *
 * Never store auth secrets, provider tokens or raw identity
 * credentials here.
 */

const STORAGE_KEY =
  "filumire.pendingAssessmentSubmission";

export interface PendingAssessmentSubmission {
  clientRequestId: string;
  learnerId: string;
  sessionId: string;
  competencyId: string;
  assessmentItemId: string;
  response: string;
  interventionId?: string;
  queuedAt: string;
}

function isPendingSubmission(
  value: unknown,
): value is PendingAssessmentSubmission {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const candidate = value as Record<string, unknown>;

  return (
    typeof candidate.clientRequestId === "string" &&
    typeof candidate.learnerId === "string" &&
    typeof candidate.sessionId === "string" &&
    typeof candidate.competencyId === "string" &&
    typeof candidate.assessmentItemId === "string" &&
    typeof candidate.response === "string" &&
    typeof candidate.queuedAt === "string"
  );
}

function getStorage(): Storage | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return window.localStorage;
  } catch {
    // Some browsers throw merely accessing localStorage
    // (private-mode/storage-disabled contexts).
    return null;
  }
}

export function readPendingSubmission(): PendingAssessmentSubmission | null {
  const storage = getStorage();

  if (!storage) {
    return null;
  }

  try {
    const raw = storage.getItem(STORAGE_KEY);

    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw);

    if (!isPendingSubmission(parsed)) {
      storage.removeItem(STORAGE_KEY);
      return null;
    }

    return parsed;
  } catch {
    try {
      storage.removeItem(STORAGE_KEY);
    } catch {
      // Storage is unavailable/corrupt; nothing more we can
      // safely do here.
    }

    return null;
  }
}

export function writePendingSubmission(
  item: PendingAssessmentSubmission,
): void {
  const storage = getStorage();

  if (!storage) {
    return;
  }

  try {
    storage.setItem(
      STORAGE_KEY,
      JSON.stringify(item),
    );
  } catch {
    // Storage full/unavailable: the learner's in-memory UI
    // state still reflects the pending answer for this
    // session; it just cannot survive a reload.
  }
}

export function clearPendingSubmission(): void {
  const storage = getStorage();

  if (!storage) {
    return;
  }

  try {
    storage.removeItem(STORAGE_KEY);
  } catch {
    // Nothing more we can safely do if storage is unavailable.
  }
}
