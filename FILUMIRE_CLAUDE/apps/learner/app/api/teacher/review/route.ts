import { NextResponse } from "next/server";
import {requireJhsPerformanceEvidence,JhsPerformanceEvidenceError} from '../../../../../../services/teacher-review/jhs-performance';
import {recordPilotMeasurementEvent,getPilotMeasurementEvents} from '../../../../../../services/pilot-measurement';

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
  resolveReviewIntervention,
} from "../../../../../../services/teacher-review";

seedContent();

type TeacherReviewBody = {
  performanceEvidence?: unknown;
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
      !body.outcome || !['correct','incorrect','partial','skipped','observed'].includes(body.outcome)
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
      interventionId: await resolveReviewIntervention(pendingReview),
    };

    if(assessmentContent.metadata?.reviewEvidencePolicy==='jhs-required-performance-v1'&&!submission.interventionId)return jsonError('A matching server-recorded assessment delivery is required.',409);
    const performance = requireJhsPerformanceEvidence(assessmentContent.metadata,body.performanceEvidence,body.outcome);
    if(performance){
      const delivery=(await getPilotMeasurementEvents(pendingReview.learnerId)).filter(e=>e.metadata.source==='assessment-delivery-v1'&&e.metadata.interventionId===submission.interventionId&&e.metadata.assessmentItemId===pendingReview.assessmentItemId&&e.metadata.contentId===assessmentContent.id&&e.createdAt<=pendingReview.submittedAt).sort((a,b)=>b.createdAt.localeCompare(a.createdAt))[0];
      if(!delivery||Date.parse(performance.evidence.performedAt)<Math.floor(Date.parse(delivery.createdAt)/1000)*1000||Date.parse(performance.evidence.performedAt)>Date.parse(pendingReview.submittedAt))return jsonError('The performance date must fall between its server delivery and submission.',400);
      const recorded=await recordPilotMeasurementEvent({learnerId:pendingReview.learnerId,competencyId:pendingReview.competencyId,sessionId:pendingReview.sessionId,eventType:'response_submitted',clientRequestId:`jhs-review-${pendingReview.id}`,metadata:{source:'jhs-required-performance-v1',teacherPrincipalId:principalId,reviewId:pendingReview.id,evidenceSha256:performance.digest,attestation:JSON.stringify(performance.evidence)}});
      if(recorded.duplicate){
        const prior=(await getPilotMeasurementEvents(pendingReview.learnerId)).find(e=>e.id===recorded.event.id);
        if(prior?.metadata.evidenceSha256!==performance.digest||prior.metadata.teacherPrincipalId!==principalId)return jsonError('This review already has a different teacher attestation.',409);
      }
    }
    const assessment =
      await evaluateAssessment(
        submission,
        expectedResponse,
        assessmentContent.id,
        performance?{...assessmentContent.metadata,evidenceIndependence:performance.independence}:assessmentContent.metadata,
        {
          outcome: body.outcome,
          evaluatorType: "teacher",
          evaluatorId: principalId,
          evaluationPolicyVersion:
            performance?`teacher-review-jhs-v1:${performance.digest}`:"teacher-review-v1",
        },
      );

    // A later review date must not turn an earlier performance into delayed
    // retention evidence. Keep review time in the audit event, performance time
    // on the learning evidence consumed by the adaptive engine.
    if(performance)assessment.evidence.timestamp=performance.evidence.performedAt;

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
    if(error instanceof JhsPerformanceEvidenceError)return jsonError(error.message,400);
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
