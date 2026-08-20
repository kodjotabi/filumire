import { NextResponse } from "next/server";
import {
  createInitialLearnerState,
  applyEvidence,
} from "../../../../../services/learner-state";
import {
  getLearnerState,
  saveLearnerState,
} from "../../../../../services/learner-state-store";
import {
  saveEvidence,
} from "../../../../../services/evidence-store";
import { evaluateAssessment } from "../../../../../services/assessment";
import { makeAdaptiveDecision } from "../../../../../services/adaptive-engine";
import { generateInstruction } from "../../../../../services/edututor";
import { seedContent } from "../../../../../services/content-store/seed";
import type { AssessmentSubmission } from "../../../../../packages/contracts";

seedContent();

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

    let learnerState =
      (await getLearnerState(
        submission.learnerId,
        submission.competencyId,
      )) ??
      createInitialLearnerState(
        submission.learnerId,
        submission.competencyId,
      );

    const assessment = evaluateAssessment(
      submission,
      body.expectedResponse,
    );

    await saveEvidence(assessment.evidence);

    learnerState = applyEvidence(
      learnerState,
      assessment.evidence,
    );

    await saveLearnerState(learnerState);

    const adaptiveDecision = await makeAdaptiveDecision({
      learnerId: submission.learnerId,
      sessionId: submission.sessionId,
      learnerState,
    });

    const instruction = await generateInstruction({
      learnerState,
      decision: adaptiveDecision.decision,
      content: adaptiveDecision.content,
      instructionalContext:
        body.instructionalContext ??
        "FILUMIRE adaptive-learning session.",
    });

    return NextResponse.json({
      learnerState,
      assessment,
      decision: adaptiveDecision.decision,
      content: adaptiveDecision.content,
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