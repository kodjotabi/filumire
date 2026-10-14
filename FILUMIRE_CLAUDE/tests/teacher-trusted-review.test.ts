import { seedTrustedRubricContent } from "./fixtures/trusted-rubric-content";
import { POST } from "../apps/learner/app/api/teacher/review/route";
import { persistenceStore } from "../services/persistence-provider";
import {
  createPrincipalLearnerAccess,
  revokePrincipalLearnerAccess,
} from "../services/principal";
import { getEvidence } from "../services/evidence-store";
import {
  submitPendingTeacherReview,
  getPendingTeacherReview,
} from "../services/teacher-review";

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
  "item-test-trusted-oral-review";

const CONTENT_ID =
  "content-test-trusted-oral-review";

function reviewRequest(
  principalId: string,
  reviewId: string,
): Request {
  return new Request(
    "http://localhost/api/teacher/review",
    {
      method: "POST",
      headers: {
        "content-type":
          "application/json",
        "x-filumire-principal-id":
          principalId,
      },
      body: JSON.stringify({
        reviewId,
        outcome: "correct",
      }),
    },
  );
}

async function run(): Promise<void> {
  seedTrustedRubricContent();
  const teacherId =
    `principal-teacher-review-${crypto.randomUUID()}`;

  const guardianId =
    `principal-guardian-review-${crypto.randomUUID()}`;

  const learnerId =
    `learner-teacher-review-${crypto.randomUUID()}`;

  await persistenceStore.createPrincipal(
    teacherId,
  );

  await persistenceStore.createPrincipal(
    guardianId,
  );

  await persistenceStore.ensureLearnerExists(
    learnerId,
  );

  await createPrincipalLearnerAccess(
    `access-${crypto.randomUUID()}`,
    teacherId,
    learnerId,
    "teacher",
  );

  await createPrincipalLearnerAccess(
    `access-${crypto.randomUUID()}`,
    guardianId,
    learnerId,
    "guardian",
  );

  const pending =
    await submitPendingTeacherReview({
      learnerId,
      competencyId: COMPETENCY_ID,
      assessmentItemId:
        ASSESSMENT_ITEM_ID,
      contentId: CONTENT_ID,
      sessionId:
        `learner-session-${crypto.randomUUID()}`,
      response:
        "Learner demonstrated the required oral-language performance.",
      clientRequestId:
        `learner-review-${crypto.randomUUID()}`,
    });

  assert(
    pending.review.status === "pending",
    "learner work must begin as pending review",
  );

  const guardianResponse =
    await POST(
      reviewRequest(
        guardianId,
        pending.review.id,
      ),
    );

  assert(
    guardianResponse.status === 403,
    "guardian must not have teacher review authority",
  );

  const teacherResponse =
    await POST(
      reviewRequest(
        teacherId,
        pending.review.id,
      ),
    );

  assert(
    teacherResponse.status === 200,
    `authorized teacher review must succeed, got ${teacherResponse.status}`,
  );

  const teacherBody =
    await teacherResponse.json() as {
      assessment: {
        evidence: {
          id: string;
          evaluatorType?: string;
          evaluatorId?: string;
          evaluationPolicyVersion?: string;
        };
        result: {
          duplicate?: boolean;
        };
      };
    };

  assert(
    teacherBody.assessment.evidence
      .evaluatorType === "teacher" &&
      teacherBody.assessment.evidence
        .evaluatorId === teacherId &&
      teacherBody.assessment.evidence
        .evaluationPolicyVersion ===
        "teacher-review-v1",
    "teacher evidence must preserve evaluator provenance",
  );

  const evidence =
    await getEvidence(
      learnerId,
      COMPETENCY_ID,
    );

  assert(
    evidence.some(
      (item) =>
        item.evaluatorType ===
          "teacher" &&
        item.evaluatorId ===
          teacherId,
    ),
    "teacher-reviewed evidence must be persisted",
  );

  const reviewed =
    await getPendingTeacherReview(
      pending.review.id,
    );

  assert(
    reviewed?.status === "reviewed" &&
      reviewed.reviewedByPrincipalId ===
        teacherId &&
      reviewed.evidenceId ===
        teacherBody.assessment.evidence.id,
    "pending review must be linked to trusted evidence",
  );

  const duplicateResponse =
    await POST(
      reviewRequest(
        teacherId,
        pending.review.id,
      ),
    );

  const duplicateBody =
    await duplicateResponse.json() as {
      duplicate?: boolean;
    };

  assert(
    duplicateResponse.status === 200 &&
      duplicateBody.duplicate === true,
    "repeated completed review must be idempotent",
  );

  const secondPending =
    await submitPendingTeacherReview({
      learnerId,
      competencyId: COMPETENCY_ID,
      assessmentItemId:
        ASSESSMENT_ITEM_ID,
      contentId: CONTENT_ID,
      sessionId:
        `learner-session-${crypto.randomUUID()}`,
      response:
        "Second learner performance awaiting review.",
      clientRequestId:
        `learner-review-${crypto.randomUUID()}`,
    });

  await revokePrincipalLearnerAccess(
    teacherId,
    learnerId,
    "teacher",
  );

  const revokedResponse =
    await POST(
      reviewRequest(
        teacherId,
        secondPending.review.id,
      ),
    );

  assert(
    revokedResponse.status === 403,
    "revoked teacher must not retain review authority",
  );

  console.log({
    teacherTrustedReview: "PASS",
    persistedPendingReview: "PASS",
    trustedEvidence: "PASS",
    idempotency: "PASS",
    authorizationBoundary: "PASS",
    persistence:
      process.env.FILUMIRE_PERSISTENCE ??
      "memory",
  });
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
