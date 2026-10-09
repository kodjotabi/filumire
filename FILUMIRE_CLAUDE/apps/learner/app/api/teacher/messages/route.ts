import {
  NextResponse,
} from "next/server";

import {
  resolvePrincipalIdentity,
} from "../../../../../../services/identity";

import {
  getPrincipalLearnerAccess,
} from "../../../../../../services/principal";

import {
  createParentTeacherMessage,
  getParentTeacherMessages,
} from "../../../../../../services/parent-teacher-communication";

/*
 * Teacher side of the parent-teacher thread (services/
 * parent-teacher-communication already supports senderRole
 * "teacher"). Same checks as /api/parent/messages, with an
 * active teacher relationship to the learner instead of guardian.
 */
type TeacherMessageBody = {
  learnerId?: string;
  text?: string;
  clientRequestId?: string;
};

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
  try {
    const { principalId } =
      await resolvePrincipalIdentity(request);

    const body =
      await request.json() as TeacherMessageBody;

    if (
      !isNonEmptyString(body.learnerId) ||
      !isNonEmptyString(body.text) ||
      !isNonEmptyString(body.clientRequestId)
    ) {
      return jsonError(
        "Learner, message, and client request ID are required.",
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
      await createParentTeacherMessage({
        learnerId: body.learnerId,
        authorPrincipalId: principalId,
        senderRole: "teacher",
        text: body.text,
        clientRequestId:
          body.clientRequestId,
      });

    return NextResponse.json(
      result,
      { status: result.duplicate ? 200 : 201 },
    );
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to create teacher message.";

    const status =
      message.toLowerCase().includes("identity") ||
      message.toLowerCase().includes("authentication")
        ? 401
        : 500;

    return jsonError(message, status);
  }
}

export async function GET(
  request: Request,
) {
  try {
    const { principalId } =
      await resolvePrincipalIdentity(request);

    const url = new URL(request.url);
    const learnerId =
      url.searchParams.get("learnerId");

    if (!isNonEmptyString(learnerId)) {
      return jsonError(
        "Learner is required.",
        400,
      );
    }

    const teacherAccess =
      await getPrincipalLearnerAccess(
        principalId,
        learnerId,
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

    const messages =
      await getParentTeacherMessages(
        learnerId,
      );

    return NextResponse.json({
      learnerId,
      messages,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to load parent-teacher messages.";

    const status =
      message.toLowerCase().includes("identity") ||
      message.toLowerCase().includes("authentication")
        ? 401
        : 500;

    return jsonError(message, status);
  }
}
