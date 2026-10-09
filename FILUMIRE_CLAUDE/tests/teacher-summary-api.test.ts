import { NextRequest } from "next/server";
import { GET } from "../apps/learner/app/api/teacher/summary/route";
import { persistenceStore } from "../services/persistence-provider";
import {
  createPrincipalLearnerAccess,
  revokePrincipalLearnerAccess,
} from "../services/principal";
import {
  submitPendingTeacherReview,
} from "../services/teacher-review";

function assert(
  condition: boolean,
  message: string,
): void {
  if (!condition) {
    throw new Error(`FAIL: ${message}`);
  }
}

function request(
  principalId: string,
  learnerId?: string,
): NextRequest {
  const url = learnerId
    ? `http://localhost/api/teacher/summary?learnerId=${encodeURIComponent(
        learnerId,
      )}`
    : "http://localhost/api/teacher/summary";

  return new NextRequest(url, {
    headers: {
      "x-filumire-principal-id":
        principalId,
    },
  });
}

async function run(): Promise<void> {
  const stamp = crypto.randomUUID();

  const teacherId =
    `principal-summary-teacher-${stamp}`;

  const guardianId =
    `principal-summary-guardian-${stamp}`;

  const learnerA =
    `learner-summary-a-${stamp}`;

  const learnerB =
    `learner-summary-b-${stamp}`;

  await persistenceStore.createPrincipal(
    teacherId,
  );

  await persistenceStore.createPrincipal(
    guardianId,
  );

  await persistenceStore.ensureLearnerExists(
    learnerA,
  );

  await persistenceStore.ensureLearnerExists(
    learnerB,
  );

  await createPrincipalLearnerAccess(
    `access-teacher-a-${stamp}`,
    teacherId,
    learnerA,
    "teacher",
  );

  await createPrincipalLearnerAccess(
    `access-teacher-b-${stamp}`,
    teacherId,
    learnerB,
    "teacher",
  );

  await createPrincipalLearnerAccess(
    `access-guardian-a-${stamp}`,
    guardianId,
    learnerA,
    "guardian",
  );

  const pending =
    await submitPendingTeacherReview({
      learnerId: learnerA,
      competencyId:
        "competency-gh-english-b4-1-1-1-1",
      assessmentItemId:
        "item-gh-b4-english-b4-1-1-1-1-diagnostic-en",
      contentId:
        "content-gh-b4-english-b4-1-1-1-1-diagnostic-en",
      sessionId:
        `session-summary-${stamp}`,
      response:
        "Learner performance awaiting teacher review.",
      clientRequestId:
        `summary-review-${stamp}`,
    });

  const rosterResponse =
    await GET(
      request(teacherId),
    );

  assert(
    rosterResponse.status === 200,
    `teacher roster request failed with ${rosterResponse.status}`,
  );

  const rosterBody =
    await rosterResponse.json() as {
      learners: Array<{
        learnerId: string;
      }>;
      selectedLearnerId?: string;
      requiresSelection: boolean;
      summary: unknown;
    };

  assert(
    rosterBody.learners.length === 2,
    "teacher must see exactly two authorized learners",
  );

  assert(
    rosterBody.requiresSelection === true &&
      !rosterBody.selectedLearnerId &&
      rosterBody.summary === null,
    "multiple learners must require explicit selection",
  );

  const selectedResponse =
    await GET(
      request(
        teacherId,
        learnerA,
      ),
    );

  assert(
    selectedResponse.status === 200,
    `authorized learner selection failed with ${selectedResponse.status}`,
  );

  const selectedBody =
    await selectedResponse.json() as {
      selectedLearnerId?: string;
      summary?: {
        learnerId: string;
        pendingReviewCount: number;
        pendingReviews: Array<{
          id: string;
        }>;
      };
    };

  assert(
    selectedBody.selectedLearnerId ===
      learnerA,
    "selected learner ID was not preserved",
  );

  assert(
    selectedBody.summary?.learnerId ===
      learnerA,
    "teacher summary returned the wrong learner",
  );

  assert(
    selectedBody.summary
      ?.pendingReviewCount === 1 &&
      selectedBody.summary
        .pendingReviews[0]?.id ===
        pending.review.id,
    "pending teacher review was not exposed through teacher summary API",
  );

  const guardianResponse =
    await GET(
      request(
        guardianId,
        learnerA,
      ),
    );

  assert(
    guardianResponse.status === 403,
    "guardian must not access teacher summary",
  );

  await revokePrincipalLearnerAccess(
    teacherId,
    learnerB,
    "teacher",
  );

  const revokedResponse =
    await GET(
      request(
        teacherId,
        learnerB,
      ),
    );

  assert(
    revokedResponse.status === 403,
    "revoked teacher access must be rejected",
  );

  const rosterAfterRevocation =
    await GET(
      request(teacherId),
    );

  const afterBody =
    await rosterAfterRevocation.json() as {
      learners: Array<{
        learnerId: string;
      }>;
      selectedLearnerId?: string;
      requiresSelection: boolean;
    };

  assert(
    afterBody.learners.length === 1 &&
      afterBody.learners[0]
        .learnerId === learnerA,
    "revoked learner must disappear from teacher roster",
  );

  assert(
    afterBody.selectedLearnerId ===
      learnerA &&
      afterBody.requiresSelection ===
        false,
    "single remaining learner must be selected automatically",
  );

  console.log({
    teacherSummaryApi: "PASS",
    rosterIsolation: "PASS",
    learnerSelection: "PASS",
    pendingReviewExposure: "PASS",
    guardianBoundary: "PASS",
    revocationBoundary: "PASS",
  });
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
