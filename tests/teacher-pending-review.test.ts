import { MemoryPersistenceStore } from "../services/persistence-memory";

async function main() {
  const store = new MemoryPersistenceStore();

  const learnerId =
    "learner-pending-review-test-001";

  await store.ensureLearnerExists(
    learnerId,
  );

  const review = {
    id: "pending-review-test-001",
    learnerId,
    competencyId:
      "competency-gh-english-b4-1-1-1-1",
    assessmentItemId:
      "item-gh-b4-english-b4-1-1-1-1-diagnostic-en",
    contentId:
      "content-gh-b4-english-b4-1-1-1-1-diagnostic-en",
    sessionId:
      "session-pending-review-test-001",
    response:
      "Learner submitted performance response.",
    status: "pending" as const,
    submittedAt:
      new Date().toISOString(),
  };

  const inserted =
    await store.savePendingTeacherReview(
      review,
    );

  if (!inserted) {
    throw new Error(
      "Expected pending review to be inserted.",
    );
  }

  const duplicate =
    await store.savePendingTeacherReview(
      review,
    );

  if (duplicate) {
    throw new Error(
      "Duplicate pending review must be idempotent.",
    );
  }

  const stored =
    await store.getPendingTeacherReview(
      review.id,
    );

  if (
    !stored ||
    stored.status !== "pending" ||
    stored.response !== review.response
  ) {
    throw new Error(
      "Pending review was not stored correctly.",
    );
  }

  const queue =
    await store.getPendingTeacherReviews(
      learnerId,
    );

  if (
    queue.length !== 1 ||
    queue[0].id !== review.id
  ) {
    throw new Error(
      "Pending review queue is incorrect.",
    );
  }

  await store.markPendingTeacherReviewReviewed(
    review.id,
    "principal-teacher-test-001",
    "evidence-teacher-test-001",
    new Date().toISOString(),
  );

  const reviewed =
    await store.getPendingTeacherReview(
      review.id,
    );

  if (
    !reviewed ||
    reviewed.status !== "reviewed" ||
    reviewed.reviewedByPrincipalId !==
      "principal-teacher-test-001" ||
    reviewed.evidenceId !==
      "evidence-teacher-test-001"
  ) {
    throw new Error(
      "Reviewed state was not persisted correctly.",
    );
  }

  const remaining =
    await store.getPendingTeacherReviews(
      learnerId,
    );

  if (remaining.length !== 0) {
    throw new Error(
      "Reviewed work must leave the pending queue.",
    );
  }

  console.log({
    teacherPendingReviewPersistence:
      "PASS",
    persistence: "memory",
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
