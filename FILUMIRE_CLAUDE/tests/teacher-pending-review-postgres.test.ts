import { PostgresPersistenceStore } from "../services/persistence-postgres";

async function main() {
  const store = new PostgresPersistenceStore();

  const stamp = Date.now();
  const learnerId = `learner-pending-review-pg-${stamp}`;
  const reviewId = `pending-review-pg-${stamp}`;

  await store.ensureLearnerExists(learnerId);

  const review = {
    id: reviewId,
    learnerId,
    competencyId: "competency-gh-english-b4-1-1-1-1",
    assessmentItemId:
      "item-gh-b4-english-b4-1-1-1-1-diagnostic-en",
    contentId:
      "content-gh-b4-english-b4-1-1-1-1-diagnostic-en",
    sessionId: `session-pending-review-pg-${stamp}`,
    response: "PostgreSQL pending review test response.",
    status: "pending" as const,
    submittedAt: new Date().toISOString(),
  };

  const inserted =
    await store.savePendingTeacherReview(review);

  if (!inserted) {
    throw new Error("PostgreSQL pending review insert failed.");
  }

  const duplicate =
    await store.savePendingTeacherReview(review);

  if (duplicate) {
    throw new Error("PostgreSQL duplicate must be idempotent.");
  }

  const queue =
    await store.getPendingTeacherReviews(learnerId);

  if (queue.length !== 1 || queue[0].id !== reviewId) {
    throw new Error("PostgreSQL pending queue is incorrect.");
  }

  await store.markPendingTeacherReviewReviewed(
    reviewId,
    "principal-teacher-pg-test",
    `evidence-pg-${stamp}`,
    new Date().toISOString(),
  );

  const reviewed =
    await store.getPendingTeacherReview(reviewId);

  if (
    !reviewed ||
    reviewed.status !== "reviewed" ||
    !reviewed.evidenceId
  ) {
    throw new Error("PostgreSQL review completion failed.");
  }

  const remaining =
    await store.getPendingTeacherReviews(learnerId);

  if (remaining.length !== 0) {
    throw new Error("Reviewed work remained in PostgreSQL pending queue.");
  }

  console.log({
    teacherPendingReviewPersistence: "PASS",
    persistence: "postgres",
  });

  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
