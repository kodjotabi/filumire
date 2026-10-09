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

type ParentMessageBody = {
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
      await request.json() as ParentMessageBody;

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

    const guardianAccess =
      await getPrincipalLearnerAccess(
        principalId,
        body.learnerId,
        "guardian",
      );

    if (
      !guardianAccess ||
      guardianAccess.status !== "active"
    ) {
      return jsonError(
        "Active guardian authorization is required for this learner.",
        403,
      );
    }

    const result =
      await createParentTeacherMessage({
        learnerId: body.learnerId,
        authorPrincipalId: principalId,
        senderRole: "guardian",
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
        : "Unable to create parent message.";

    const status =
      message.toLowerCase().includes("unauthenticated") ||
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

    const guardianAccess =
      await getPrincipalLearnerAccess(
        principalId,
        learnerId,
        "guardian",
      );

    if (
      !guardianAccess ||
      guardianAccess.status !== "active"
    ) {
      return jsonError(
        "Active guardian authorization is required for this learner.",
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
        : "Unable to load parent messages.";

    const status =
      message.toLowerCase().includes("unauthenticated") ||
      message.toLowerCase().includes("identity") ||
      message.toLowerCase().includes("authentication")
        ? 401
        : 500;

    return jsonError(message, status);
  }
}
