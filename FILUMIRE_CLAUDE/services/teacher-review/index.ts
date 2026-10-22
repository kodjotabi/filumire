import { createHash } from "node:crypto";

import {
  persistenceStore,
} from "../persistence-provider";

import type {
  PendingTeacherReviewRecord,
} from "../persistence";
import { getPilotMeasurementEvents } from "../pilot-measurement";
import { getIntervention } from "../intervention-store";

/** Recover the server-recorded delivery, never a teacher/client-supplied ID.
 * Pending-review storage predates intervention IDs. Match the exact learner,
 * session, topic, item and content, only at/before submission. Legacy reviews
 * without a recorded delivery retain their existing unbound behaviour.
 */
export async function resolveReviewIntervention(review: PendingTeacherReviewRecord): Promise<string | undefined> {
  const deliveries = (await getPilotMeasurementEvents(review.learnerId)).filter(event =>
    event.eventType === "learning_presented" && event.sessionId === review.sessionId &&
    event.competencyId === review.competencyId && event.createdAt <= review.submittedAt &&
    event.metadata.source === "assessment-delivery-v1" &&
    event.metadata.assessmentItemId === review.assessmentItemId &&
    event.metadata.contentId === review.contentId && typeof event.metadata.interventionId === "string");
  for (const event of [...deliveries].reverse().sort((a, b) => b.createdAt.localeCompare(a.createdAt))) {
    const id = event.metadata.interventionId as string;
    const intervention = await getIntervention(id);
    if (intervention?.learnerId === review.learnerId && intervention.sessionId === review.sessionId &&
      intervention.competencyId === review.competencyId) return id;
  }
  return undefined;
}

export interface PendingTeacherReviewSubmission {
  learnerId: string;
  competencyId: string;
  assessmentItemId: string;
  contentId?: string;
  sessionId: string;
  response: string;
  clientRequestId?: string;
}

function createReviewId(
  submission: PendingTeacherReviewSubmission,
): string {
  const source =
    submission.clientRequestId ??
    [
      submission.learnerId,
      submission.sessionId,
      submission.competencyId,
      submission.assessmentItemId,
      submission.response,
    ].join("|");

  return `teacher-review-${createHash("sha256")
    .update(source)
    .digest("hex")
    .slice(0, 32)}`;
}

export async function submitPendingTeacherReview(
  submission: PendingTeacherReviewSubmission,
): Promise<{
  review: PendingTeacherReviewRecord;
  duplicate: boolean;
}> {
  const id = createReviewId(submission);

  const review: PendingTeacherReviewRecord = {
    id,
    learnerId: submission.learnerId,
    competencyId: submission.competencyId,
    assessmentItemId: submission.assessmentItemId,
    contentId: submission.contentId,
    sessionId: submission.sessionId,
    response: submission.response,
    status: "pending",
    submittedAt: new Date().toISOString(),
  };

  const inserted =
    await persistenceStore.savePendingTeacherReview(
      review,
    );

  if (!inserted) {
    const existing =
      await persistenceStore.getPendingTeacherReview(
        id,
      );

    if (!existing) {
      throw new Error(
        "Pending teacher review duplicate could not be resolved.",
      );
    }

    return {
      review: existing,
      duplicate: true,
    };
  }

  return {
    review,
    duplicate: false,
  };
}

export async function getPendingTeacherReview(
  reviewId: string,
): Promise<PendingTeacherReviewRecord | undefined> {
  return persistenceStore.getPendingTeacherReview(
    reviewId,
  );
}

export async function getPendingTeacherReviews(
  learnerId: string,
): Promise<PendingTeacherReviewRecord[]> {
  return persistenceStore.getPendingTeacherReviews(
    learnerId,
  );
}

export async function markPendingTeacherReviewReviewed(
  reviewId: string,
  reviewedByPrincipalId: string,
  evidenceId: string,
): Promise<void> {
  await persistenceStore.markPendingTeacherReviewReviewed(
    reviewId,
    reviewedByPrincipalId,
    evidenceId,
    new Date().toISOString(),
  );
}
