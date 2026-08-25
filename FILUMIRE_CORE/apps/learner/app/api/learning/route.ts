import { NextResponse } from "next/server";

import type {
  AssessmentSubmission,
} from "../../../../../packages/contracts";

import { evaluateAssessment } from "../../../../../services/assessment";

import {
  applyEvidence,
  createInitialLearnerState,
} from "../../../../../services/learner-state";

import { makeAdaptiveDecision } from "../../../../../services/adaptive-engine";

import { generateInstruction } from "../../../../../services/edututor";

import {
  getLearnerState,
  saveLearnerState,
} from "../../../../../services/learner-state-store";

import { saveEvidence } from "../../../../../services/evidence-store";

import { seedContent } from "../../../../../services/content-store/seed";

import {
  getContentForCompetency,
} from "../../../../../services/content-store";

import {
  resolveRequestIdentity,
} from "../../../../../services/identity";

import {
  assertSessionOwnership,
  createSession,
} from "../../../../../services/session";

import {
  recordRetentionCheck,
  recordTransferCheck,
} from "../../../../../services/retention-transfer";

seedContent();

const DEFAULT_SESSION_ID =
  "session-demo-001";

type InteractionType =
  | "assessment"
  | "retention"
  | "transfer";

type EvidenceOutcome =
  | "correct"
  | "incorrect"
  | "partial"
  | "skipped"
  | "observed";

function unauthorizedResponse(
  message: string,
) {
  return NextResponse.json(
    {
      error: message,
    },
    { status: 401 },
  );
}

function isEvidenceOutcome(
  value: unknown,
): value is EvidenceOutcome {
  return (
    value === "correct" ||
    value === "incorrect" ||
    value === "partial" ||
    value === "skipped" ||
    value === "observed"
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

async function assertOwnedSession(
  sessionId: string,
  learnerId: string,
) {
  const existingSessionLearnerId =
    await import(
      "../../../../../services/persistence-provider"
    ).then(
      async ({
        persistenceStore,
      }) =>
        persistenceStore.getSessionLearnerId(
          sessionId,
        ),
    );

  if (!existingSessionLearnerId) {
    await createSession(
      sessionId,
      learnerId,
    );

    return;
  }

  await assertSessionOwnership(
    sessionId,
    learnerId,
  );
}

async function ensureCompetencyState(
  learnerId: string,
  learnerState: Awaited<
    ReturnType<
      typeof createInitialLearnerState
    >
  >,
  competencyId: string,
) {
  if (
    learnerState.competencies.some(
      (competency) =>
        competency.competencyId ===
        competencyId,
    )
  ) {
    return learnerState;
  }

  const nextState =
    createInitialLearnerState(
      learnerId,
      competencyId,
    );

  const updatedState = {
    ...learnerState,
    competencies: [
      nextState.competencies[0],
      ...learnerState.competencies,
    ],
    updatedAt:
      new Date().toISOString(),
    stateVersion:
      "state-0.3",
  };

  await saveLearnerState(
    updatedState,
  );

  return updatedState;
}

async function buildLearningResponse(
  learnerId: string,
  sessionId: string,
  learnerState: Awaited<
    ReturnType<
      typeof createInitialLearnerState
    >
  >,
) {
  const adaptiveDecision =
    await makeAdaptiveDecision({
      learnerId,
      sessionId,
      learnerState,
    });

  let updatedLearnerState =
    learnerState;

  if (
    adaptiveDecision.decision.action ===
    "advance"
  ) {
    updatedLearnerState =
      await ensureCompetencyState(
        learnerId,
        learnerState,
        adaptiveDecision
          .decision.competencyId,
      );
  }

  const instruction =
    await generateInstruction({
      learnerState:
        updatedLearnerState,
      decision:
        adaptiveDecision.decision,
      content:
        adaptiveDecision.content,
      instructionalContext:
        "FILUMIRE learner-facing adaptive-learning session.",
    });

  return {
    learnerState:
      updatedLearnerState,
    decision:
      adaptiveDecision.decision,
    content:
      adaptiveDecision.content,
    nextCompetency:
      adaptiveDecision.nextCompetency,
    instruction,
  };
}

export async function GET(
  request: Request,
) {
  try {
    const identity =
      resolveRequestIdentity(request);

    const url =
      new URL(request.url);

    const sessionId =
      url.searchParams.get(
        "sessionId",
      ) ??
      DEFAULT_SESSION_ID;

    const learnerId =
      identity.learnerId;

    await assertOwnedSession(
      sessionId,
      learnerId,
    );

    const competencyId =
      "competency-test-001";

    let learnerState =
      await getLearnerState(
        learnerId,
        competencyId,
      );

    if (!learnerState) {
      learnerState =
        createInitialLearnerState(
          learnerId,
          competencyId,
        );

      await saveLearnerState(
        learnerState,
      );
    }

    const response =
      await buildLearningResponse(
        learnerId,
        sessionId,
        learnerState,
      );

    return NextResponse.json(
      response,
    );
  } catch (error) {
    if (
      error instanceof Error &&
      (
        error.message.includes(
          "Unauthenticated request",
        ) ||
        error.message.includes(
          "Invalid learner identity",
        ) ||
        error.message.includes(
          "Session does not belong to the authenticated learner",
        ) ||
        error.message.includes(
          "Session not found",
        )
      )
    ) {
      return unauthorizedResponse(
        error.message,
      );
    }

    console.error(
      "FILUMIRE learning GET error:",
      error,
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to load learning session.",
      },
      { status: 500 },
    );
  }
}

export async function POST(
  request: Request,
) {
  try {
    const identity =
      resolveRequestIdentity(request);

    const body =
      (await request.json()) as {
        learnerId?: string;
        sessionId: string;
        interactionType?: InteractionType;
        competencyId: string;
        outcome?: EvidenceOutcome;
        assessmentItemId?: string;
        response?: unknown;
        instructionalContext?: string;
      };

    const authenticatedLearnerId =
      identity.learnerId;

    if (
      body.learnerId &&
      body.learnerId !==
        authenticatedLearnerId
    ) {
      return unauthorizedResponse(
        "Learner identity does not match the authenticated requester.",
      );
    }

    if (
      !body.sessionId ||
      !body.competencyId
    ) {
      return NextResponse.json(
        {
          error:
            "Session and competency are required.",
        },
        { status: 400 },
      );
    }

    await assertOwnedSession(
      body.sessionId,
      authenticatedLearnerId,
    );

    const interactionType =
      body.interactionType ??
      "assessment";

    if (
      interactionType ===
        "retention" ||
      interactionType ===
        "transfer"
    ) {
      if (
        !isEvidenceOutcome(
          body.outcome,
        )
      ) {
        return NextResponse.json(
          {
            error:
              "A valid outcome is required for retention or transfer.",
          },
          { status: 400 },
        );
      }

      const evidenceId =
        `${interactionType}-${body.competencyId}-${crypto.randomUUID()}`;

      if (
        interactionType ===
        "retention"
      ) {
        await recordRetentionCheck({
          learnerId:
            authenticatedLearnerId,
          competencyId:
            body.competencyId,
          evidenceId,
          outcome:
            body.outcome,
        });
      } else {
        await recordTransferCheck({
          learnerId:
            authenticatedLearnerId,
          competencyId:
            body.competencyId,
          evidenceId,
          outcome:
            body.outcome,
        });
      }

      const learnerState =
        await getLearnerState(
          authenticatedLearnerId,
          body.competencyId,
        );

      if (!learnerState) {
        throw new Error(
          "Learner state not found after retention or transfer check.",
        );
      }

      const response =
        await buildLearningResponse(
          authenticatedLearnerId,
          body.sessionId,
          learnerState,
        );

      return NextResponse.json({
        ...response,
        interaction: {
          type:
            interactionType,
          evidenceId,
          outcome:
            body.outcome,
        },
      });
    }

    if (
      interactionType !==
      "assessment"
    ) {
      return NextResponse.json(
        {
          error:
            "Unsupported learning interaction.",
        },
        { status: 400 },
      );
    }

    if (
      !body.assessmentItemId
    ) {
      return NextResponse.json(
        {
          error:
            "Assessment item is required.",
        },
        { status: 400 },
      );
    }

    if (
      !isNonEmptyString(
        body.response,
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Assessment response is required.",
        },
        { status: 400 },
      );
    }

    const submission:
      AssessmentSubmission = {
      learnerId:
        authenticatedLearnerId,
      sessionId:
        body.sessionId,
      assessmentItemId:
        body.assessmentItemId,
      competencyId:
        body.competencyId,
      response:
        body.response,
    };

    const assessmentContent =
      getContentForCompetency(
        body.competencyId,
      ).find(
        (content) =>
          (
            content.type ===
              "assessment" ||
            content.type ===
              "practice"
          ) &&
          content.assessmentItemId ===
            body.assessmentItemId,
      );

    if (!assessmentContent) {
      return NextResponse.json(
        {
          error:
            "Assessment item not found for the requested competency.",
        },
        { status: 404 },
      );
    }

    const expectedResponse =
      assessmentContent.metadata
        ?.expectedResponse;

    if (
      expectedResponse ===
      undefined
    ) {
      return NextResponse.json(
        {
          error:
            "Assessment item has no trusted expected response.",
        },
        { status: 500 },
      );
    }

    const assessment =
      await evaluateAssessment(
        submission,
        expectedResponse,
        assessmentContent.id,
      );

    await saveEvidence(
      assessment.evidence,
    );

    let learnerState =
      (await getLearnerState(
        authenticatedLearnerId,
        body.competencyId,
      )) ??
      createInitialLearnerState(
        authenticatedLearnerId,
        body.competencyId,
      );

    learnerState =
      applyEvidence(
        learnerState,
        assessment.evidence,
      );

    await saveLearnerState(
      learnerState,
    );

    const response =
      await buildLearningResponse(
        authenticatedLearnerId,
        body.sessionId,
        learnerState,
      );

    return NextResponse.json({
      assessment,
      ...response,
    });
  } catch (error) {
    if (
      error instanceof Error &&
      (
        error.message.includes(
          "Unauthenticated request",
        ) ||
        error.message.includes(
          "Invalid learner identity",
        ) ||
        error.message.includes(
          "Session does not belong to the authenticated learner",
        ) ||
        error.message.includes(
          "Session not found",
        )
      )
    ) {
      return unauthorizedResponse(
        error.message,
      );
    }

    console.error(
      "FILUMIRE learning POST error:",
      error,
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Learning interaction failed.",
      },
      { status: 500 },
    );
  }
}