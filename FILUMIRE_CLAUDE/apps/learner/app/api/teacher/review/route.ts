import { NextResponse } from "next/server";

import type {
  AssessmentSubmission,
} from "../../../../../../packages/contracts";

import {
  getCompetency,
} from "../../../../../../packages/curriculum";

import {
  evaluateAssessment,
} from "../../../../../../services/assessment";

import {
  applyEvidence,
  createInitialLearnerState,
} from "../../../../../../services/learner-state";

import {
  saveEvidenceAndUpdateLearnerState,
} from "../../../../../../services/evidence-store";

import {
  getContentForCompetency,
} from "../../../../../../services/content-store";

import {
  seedContent,
} from "../../../../../../services/content-store/seed";

import {
  resolvePrincipalIdentity,
} from "../../../../../../services/identity";

import {
  getPrincipalLearnerAccess,
} from "../../../../../../services/principal";

import {
  getPendingTeacherReview,
  markPendingTeacherReviewReviewed,
} from "../../../../../../services/teacher-review";

seedContent();

type TeacherReviewBody = {
  reviewId?: string;
  outcome?:
    | "correct"
    | "incorrect"
    | "partial"
    | "skipped"
    | "observed";
};

function jsonError(
  error: string,
  status: number,
) {
  return NextResponse.json(
    { error },
    { status },
  );
}

function isNonEmptyString(
  value: unknown,
): value is string {
  return (
    typeof value === "string" &&
    value.trim().length > 0
  );
}

export async function POST(
  request: Request,
) {
  try {
    const { principalId } =
      await resolvePrincipalIdentity(request);

    const body =
      await request.json() as TeacherReviewBody;

    if (
      !isNonEmptyString(body.reviewId) ||
      !body.outcome
    ) {
      return jsonError(
        "Pending review and outcome are required.",
        400,
      );
    }

    const pendingReview =
      await getPendingTeacherReview(
        body.reviewId,
      );

    if (!pendingReview) {
      return jsonError(
        "Pending teacher review not found.",
        404,
      );
    }

    const teacherAccess =
      await getPrincipalLearnerAccess(
        principalId,
        pendingReview.learnerId,
        "teacher",
      );

    if (
      !teacherAccess ||
      teacherAccess.status !== "active"
    ) {
      return jsonError(
        "Active teacher authorization is required for this learner.",
        403,
      );
    }

    if (
      pendingReview.status === "reviewed"
    ) {
      return NextResponse.json({
        review: pendingReview,
        duplicate: true,
      });
    }

    if (
      !getCompetency(
        pendingReview.competencyId,
      )
    ) {
      return jsonError(
        "Unknown competency.",
        404,
      );
    }

    const assessmentContent =
      getContentForCompetency(
        pendingReview.competencyId,
      ).find(
        (content) =>
          (
            content.type ===
              "assessment" ||
            content.type ===
              "practice"
          ) &&
          content.assessmentItemId ===
            pendingReview.assessmentItemId,
      );

    if (!assessmentContent) {
      return jsonError(
        "Assessment item not found for the requested competency.",
        404,
      );
    }

    if (
      assessmentContent.metadata
        ?.evaluationMethod !==
      "trusted_rubric_evaluation"
    ) {
      return jsonError(
        "This assessment item does not require trusted teacher evaluation.",
        400,
      );
    }

    const expectedResponse =
      assessmentContent.metadata
        ?.expectedResponse;

    if (
      expectedResponse === undefined
    ) {
      return jsonError(
        "Assessment item has no trusted expected response.",
        500,
      );
    }

    const submission:
      AssessmentSubmission = {
      learnerId:
        pendingReview.learnerId,
      sessionId:
        pendingReview.sessionId,
      competencyId:
        pendingReview.competencyId,
      assessmentItemId:
        pendingReview.assessmentItemId,
      response:
        pendingReview.response,
      clientRequestId:
        pendingReview.id,
    };

    const assessment =
      await evaluateAssessment(
        submission,
        expectedResponse,
        assessmentContent.id,
        assessmentContent.metadata,
        {
          outcome: body.outcome,
          evaluatorType: "teacher",
          evaluatorId: principalId,
          evaluationPolicyVersion:
            "teacher-review-v1",
        },
      );

    const {
      learnerState,
      isNewEvidence,
    } =
      await saveEvidenceAndUpdateLearnerState(
        assessment.evidence,
        pendingReview.competencyId,
        (
          currentState,
          isNew,
          evidenceHistory,
        ) => {
          const baseState =
            currentState ??
            createInitialLearnerState(
              pendingReview.learnerId,
              pendingReview.competencyId,
            );

          return isNew
            ? applyEvidence(
                baseState,
                assessment.evidence,
                evidenceHistory,
              )
            : baseState;
        },
      );

    await markPendingTeacherReviewReviewed(
      pendingReview.id,
      principalId,
      assessment.evidence.id,
    );

    return NextResponse.json({
      review: {
        id: pendingReview.id,
        status: "reviewed",
      },
      assessment: {
        ...assessment,
        result: {
          ...assessment.result,
          duplicate:
            !isNewEvidence,
        },
      },
      learnerState,
    });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes(
        "Unauthenticated request",
      )
    ) {
      return jsonError(
        "Authentication required.",
        401,
      );
    }

    console.error(
      "FILUMIRE teacher review failure",
      error,
    );

    return jsonError(
      "Teacher review could not be completed.",
      500,
    );
  }
}
