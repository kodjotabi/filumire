import {
  NextResponse,
} from "next/server";

import {
  resolvePrincipalIdentity,
} from "../../../../../../services/identity";

import { assertSameOrigin } from "../../account/http";

import {
  getPrincipalLearnerAccess,
} from "../../../../../../services/principal";

import {
  createControlledTeacherAction,
} from "../../../../../../services/controlled-teacher-actions";

import type {
  ControlledTeacherActionType,
} from "../../../../../../services/persistence";

type ControlledTeacherActionBody = {
  learnerId?: string;
  competencyId?: string;
  actionType?: ControlledTeacherActionType;
  reason?: string;
  clientRequestId?: string;
};

const allowedActions =
  new Set<ControlledTeacherActionType>([
    "request_practice",
    "request_explanation",
    "request_review",
    "request_reassessment",
  ]);

function isNonEmptyString(
  value: unknown,
): value is string {
  return (
    typeof value === "string" &&
    value.trim().length > 0
  );
}

function jsonError(
  message: string,
  status: number,
) {
  return NextResponse.json(
    { error: message },
    { status },
  );
}

export async function POST(
  request: Request,
) {
  // Teacher writes come only from this application; SameSite=Strict
  // cookies alone would still admit other filumire.com sites.
  try {
    assertSameOrigin(request);
  } catch {
    return NextResponse.json(
      { error: "Cross-site teacher requests are not allowed." },
      { status: 403 },
    );
  }

  try {
    const { principalId } =
      await resolvePrincipalIdentity(request);

    const body =
      await request.json() as ControlledTeacherActionBody;

    if (
      !isNonEmptyString(body.learnerId) ||
      !isNonEmptyString(body.competencyId) ||
      !isNonEmptyString(body.clientRequestId) ||
      !body.actionType ||
      !allowedActions.has(body.actionType)
    ) {
      return jsonError(
        "Learner, competency, valid action type, and client request ID are required.",
        400,
      );
    }

    const teacherAccess =
      await getPrincipalLearnerAccess(
        principalId,
        body.learnerId,
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

    const result =
      await createControlledTeacherAction({
        learnerId: body.learnerId,
        competencyId: body.competencyId,
        teacherPrincipalId: principalId,
        actionType: body.actionType,
        reason: body.reason,
        clientRequestId:
          body.clientRequestId,
      });

    return NextResponse.json(result);
  } catch (error) {
    console.error(error);

    return jsonError(
      "Unable to create controlled teacher action.",
      500,
    );
  }
}
