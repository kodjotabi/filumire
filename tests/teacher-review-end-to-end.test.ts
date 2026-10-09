import { NextRequest } from "next/server";
import { POST as learningPOST } from "../apps/learner/app/api/learning/route";
import { GET as teacherSummaryGET } from "../apps/learner/app/api/teacher/summary/route";
import { POST as teacherReviewPOST } from "../apps/learner/app/api/teacher/review/route";
import { persistenceStore } from "../services/persistence-provider";
import { createPrincipalLearnerAccess } from "../services/principal";
import { createSession } from "../services/session";
import { getEvidence } from "../services/evidence-store";
import { getLearnerState } from "../services/learner-state";
import { getPendingTeacherReviews } from "../services/teacher-review";
import { seedContent } from "../services/content-store/seed";

function assert(
  condition: boolean,
  message: string,
): void {
  if (!condition) {
    throw new Error(`FAIL: ${message}`);
  }
}

const COMPETENCY_ID =
  "competency-gh-english-b4-1-1-1-1";

const ASSESSMENT_ITEM_ID =
  "item-gh-b4-english-b4-1-1-1-1-diagnostic-en";

async function run(): Promise<void> {
  seedContent();

  const stamp = crypto.randomUUID();
  const learnerId =
    `learner-e2e-review-${stamp}`;
  const teacherId =
    `principal-e2e-teacher-${stamp}`;
  const sessionId =
    `session-e2e-review-${stamp}`;

  await persistenceStore.createPrincipal(
    teacherId,
  );

  await persistenceStore.ensureLearnerExists(
    learnerId,
  );

  await createPrincipalLearnerAccess(
    `access-e2e-${stamp}`,
    teacherId,
    learnerId,
    "teacher",
  );

  await createSession(
    sessionId,
    learnerId,
  );

  const evidenceBefore =
    await getEvidence(
      learnerId,
      COMPETENCY_ID,
    );

  const learnerResponse =
    await learningPOST(
      new Request(
        "http://localhost/api/learning",
        {
          method: "POST",
          headers: {
            "content-type":
              "application/json",
            "x-filumire-learner-id":
              learnerId,
          },
          body: JSON.stringify({
            learnerId,
            sessionId,
            interactionType:
              "assessment",
            competencyId:
              COMPETENCY_ID,
            assessmentItemId:
              ASSESSMENT_ITEM_ID,
            response:
              "Learner demonstrated the oral-language performance.",
            clientRequestId:
              `e2e-submission-${stamp}`,
          }),
        },
      ),
    );

  assert(
    learnerResponse.status === 200,
    `learner submission failed with ${learnerResponse.status}`,
  );

  const learnerBody =
    await learnerResponse.json() as {
      pendingTeacherReview?: {
        id: string;
        status: string;
      };
    };

  const reviewId =
    learnerBody.pendingTeacherReview?.id;

  assert(
    Boolean(reviewId) &&
      learnerBody.pendingTeacherReview
        ?.status === "pending",
    "learner submission did not create pending review",
  );

  const evidencePending =
    await getEvidence(
      learnerId,
      COMPETENCY_ID,
    );

  assert(
    evidencePending.length ===
      evidenceBefore.length,
    "pending work must not create evidence",
  );

  const summaryResponse =
    await teacherSummaryGET(
      new NextRequest(
        `http://localhost/api/teacher/summary?learnerId=${encodeURIComponent(
          learnerId,
        )}`,
        {
          headers: {
            "x-filumire-principal-id":
              teacherId,
          },
        },
      ),
    );

  assert(
    summaryResponse.status === 200,
    "teacher summary request failed",
  );

  const summaryBody =
    await summaryResponse.json() as {
      summary?: {
        pendingReviewCount: number;
        pendingReviews: Array<{
          id: string;
        }>;
      };
    };

  assert(
    summaryBody.summary
      ?.pendingReviewCount === 1 &&
      summaryBody.summary
        .pendingReviews[0]?.id ===
        reviewId,
    "teacher summary did not expose pending learner work",
  );

  const reviewResponse =
    await teacherReviewPOST(
      new Request(
        "http://localhost/api/teacher/review",
        {
          method: "POST",
          headers: {
            "content-type":
              "application/json",
            "x-filumire-principal-id":
              teacherId,
          },
          body: JSON.stringify({
            reviewId,
            outcome: "correct",
          }),
        },
      ),
    );

  assert(
    reviewResponse.status === 200,
    `teacher review failed with ${reviewResponse.status}`,
  );

  const reviewBody =
    await reviewResponse.json() as {
      review: {
        status: string;
        evidenceId?: string;
      };
      assessment?: {
        evidence: {
          id: string;
          evaluatorType?: string;
          evaluatorId?: string;
        };
      };
      learnerState?: {
        learnerId: string;
      };
    };

  assert(
    reviewBody.review.status ===
      "reviewed",
    "review was not completed",
  );

  assert(
    reviewBody.assessment?.evidence
      .evaluatorType === "teacher" &&
      reviewBody.assessment?.evidence
        .evaluatorId === teacherId,
    "trusted teacher provenance was not preserved",
  );

  const reviewedRecord =
    await import("../services/teacher-review")
      .then(({ getPendingTeacherReview }) =>
        getPendingTeacherReview(reviewId!),
      );

  assert(
    reviewedRecord?.evidenceId ===
      reviewBody.assessment?.evidence.id,
    "persisted review was not linked to resulting evidence",
  );

  const evidenceAfter =
    await getEvidence(
      learnerId,
      COMPETENCY_ID,
    );

  assert(
    evidenceAfter.length ===
      evidenceBefore.length + 1,
    "teacher review did not create exactly one evidence record",
  );

  const learnerState =
    await getLearnerState(
      learnerId,
      COMPETENCY_ID,
    );

  assert(
    Boolean(learnerState) &&
      learnerState!.competencies[0]
        .evidenceCount >= 1,
    "trusted evidence did not update learner state",
  );

  const pendingAfter =
    await getPendingTeacherReviews(
      learnerId,
    );

  assert(
    pendingAfter.length === 0,
    "reviewed work must leave the pending queue",
  );

  const summaryAfterResponse =
    await teacherSummaryGET(
      new NextRequest(
        `http://localhost/api/teacher/summary?learnerId=${encodeURIComponent(
          learnerId,
        )}`,
        {
          headers: {
            "x-filumire-principal-id":
              teacherId,
          },
        },
      ),
    );

  const summaryAfter =
    await summaryAfterResponse.json() as {
      summary?: {
        pendingReviewCount: number;
      };
    };

  assert(
    summaryAfter.summary
      ?.pendingReviewCount === 0,
    "teacher summary must clear completed review",
  );

  console.log({
    cluster5PendingReviewEndToEnd:
      "PASS",
    learnerSubmission: "PASS",
    pendingQueue: "PASS",
    prematureEvidenceBlocked:
      "PASS",
    teacherVisibility: "PASS",
    trustedReview: "PASS",
    evidenceCreation: "PASS",
    learnerStateUpdate: "PASS",
    queueClearance: "PASS",
  });
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});

