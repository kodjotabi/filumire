import { seedTrustedRubricContent } from "./fixtures/trusted-rubric-content";
﻿import { POST } from "../apps/learner/app/api/learning/route";
import { createSession } from "../services/session";
import { ensureLearnerExists } from "../services/learner";
import { getEvidence } from "../services/evidence-store";
import {
  getPendingTeacherReviews,
} from "../services/teacher-review";
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
  "item-test-trusted-oral-review";

async function run(): Promise<void> {
  seedTrustedRubricContent();
  seedContent();

  const stamp = crypto.randomUUID();
  const learnerId =
    `learner-pending-api-${stamp}`;
  const sessionId =
    `session-pending-api-${stamp}`;

  await ensureLearnerExists(
    learnerId,
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

  assert(
    evidenceBefore.length === 0,
    "test learner must begin without evidence",
  );

  const response =
    await POST(
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
            assessmentItemId:
              ASSESSMENT_ITEM_ID,
            competencyId:
              COMPETENCY_ID,
            response:
              "Learner oral-language performance awaiting teacher judgment.",
            clientRequestId:
              `pending-api-${stamp}`,
          }),
        },
      ),
    );

  assert(
    response.status === 200,
    `trusted-rubric learner submission must succeed, got ${response.status}`,
  );

  const body =
    await response.json() as {
      pendingTeacherReview?: {
        id: string;
        status: string;
        duplicate: boolean;
      };
      assessment?: unknown;
    };

  assert(
    body.pendingTeacherReview?.status ===
      "pending",
    "learner response must enter pending teacher review",
  );

  assert(
    !body.assessment,
    "unreviewed learner work must not return an assessment result",
  );

  const evidenceAfter =
    await getEvidence(
      learnerId,
      COMPETENCY_ID,
    );

  assert(
    evidenceAfter.length === 0,
    "unreviewed learner work must not create learning evidence",
  );

  const pending =
    await getPendingTeacherReviews(
      learnerId,
    );

  assert(
    pending.length === 1 &&
      pending[0].id ===
        body.pendingTeacherReview?.id &&
      pending[0].response.includes(
        "awaiting teacher judgment",
      ),
    "learner submission must be persisted in the teacher review queue",
  );

  const duplicateResponse =
    await POST(
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
            assessmentItemId:
              ASSESSMENT_ITEM_ID,
            competencyId:
              COMPETENCY_ID,
            response:
              "Learner oral-language performance awaiting teacher judgment.",
            clientRequestId:
              `pending-api-${stamp}`,
          }),
        },
      ),
    );

  const duplicateBody =
    await duplicateResponse.json() as {
      pendingTeacherReview?: {
        duplicate: boolean;
      };
    };

  assert(
    duplicateResponse.status === 200 &&
      duplicateBody
        .pendingTeacherReview
        ?.duplicate === true,
    "duplicate learner submission must be idempotent",
  );

  console.log({
    learnerPendingReviewApi: "PASS",
    prematureEvidenceBlocked: "PASS",
    persistence: "PASS",
    idempotency: "PASS",
  });
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});

