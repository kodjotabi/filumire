import { createHash } from "node:crypto";

import {
  persistenceStore,
} from "../persistence-provider";

import type {
  PendingTeacherReviewRecord,
} from "../persistence";

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
