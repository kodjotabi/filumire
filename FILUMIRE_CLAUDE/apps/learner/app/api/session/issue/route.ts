import { NextResponse } from "next/server";

import {
  getProductionSessionCookie,
  issueProductionSession,
} from "../../../../../../services/identity";

export async function POST(
  request: Request,
) {
  try {
    const session =
      await issueProductionSession(request);

    return NextResponse.json(
      {
        issued: true,
        sessionId: session.sessionId,
        principalId: session.principalId,
        learnerId: session.learnerId,
      },
      {
        status: 201,
        headers: {
          "set-cookie":
            getProductionSessionCookie(
              session.token,
            ),
        },
      },
    );
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes(
        "Unauthenticated request",
      )
    ) {
      console.warn(
        "FILUMIRE session issuance: authentication rejected",
        { reason: error.message },
      );

      return NextResponse.json(
        { error: error.message },
        { status: 401 },
      );
    }

    if (
      error instanceof Error &&
      (
        error.message.includes(
          "No authorised learner",
        ) ||
        error.message.includes(
          "Explicit learner selection",
        ) ||
        error.message.includes(
          "Requested learner is not authorised",
        )
      )
    ) {
      console.warn(
        "FILUMIRE session issuance: learner authorization rejected",
        { reason: error.message },
      );

      return NextResponse.json(
        { error: error.message },
        { status: 403 },
      );
    }

    console.error(
      "FILUMIRE session issuance error:",
      error,
    );

    return NextResponse.json(
      { error: "Unable to issue authentication session." },
      { status: 500 },
    );
  }
}