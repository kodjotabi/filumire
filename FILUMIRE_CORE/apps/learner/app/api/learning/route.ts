import { NextResponse } from "next/server";
import { createInitialLearnerState, applyEvidence } from "../../../../../services/learner-state";
import { evaluateAssessment } from "../../../../../services/assessment";
import { makeAdaptiveDecision } from "../../../../../services/adaptive-engine";
import { generateInstruction } from "../../../../../services/edututor";
import type { AssessmentSubmission } from "../../../../../packages/contracts";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const submission: AssessmentSubmission = {
      learnerId: body.learnerId,
      sessionId: body.sessionId,
      assessmentItemId: body.assessmentItemId,
      competencyId: body.competencyId,
      response: body.response,
    };

    let learnerState = createInitialLearnerState(
      submission.learnerId,
      submission.competencyId,
    );

    const assessment = evaluateAssessment(
      submission,
      body.expectedResponse,
    );

    learnerState = applyEvidence(
      learnerState,
      assessment.evidence,
    );

    const adaptiveDecision = makeAdaptiveDecision({
      learnerId: submission.learnerId,
      sessionId: submission.sessionId,
      learnerState,
    });

    const instruction = await generateInstruction({
      learnerState,
      decision: adaptiveDecision.decision,
      instructionalContext:
        body.instructionalContext ??
        "FILUMIRE adaptive-learning session.",
    });

    return NextResponse.json({
      learnerState,
      assessment,
      decision: adaptiveDecision.decision,
      instruction,
    });
  } catch {
    return NextResponse.json(
      {
        error: "Unable to process learning interaction.",
      },
      { status: 400 },
    );
  }
}