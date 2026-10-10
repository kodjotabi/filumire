import { NextResponse } from "next/server";

import {
  getProductionSessionClearCookie,
  resolveSignedInSession,
} from "../../../../../../services/identity";

import {
  revokePrincipalAuthSession,
} from "../../../../../../services/auth-session";

export async function POST(
  request: Request,
) {
  try {
    // Learner-bound and principal-only (parent) sessions both
    // sign out here; development headers never count as a session.
    const identity =
      await resolveSignedInSession(request);

    if (!identity.sessionId || !identity.principalId) {
      return NextResponse.json(
        { error: "Production session is required." },
        { status: 401 },
      );
    }

    await revokePrincipalAuthSession(
      identity.sessionId,
      identity.principalId,
    );

    return NextResponse.json(
      { revoked: true },
      {
        headers: {
          "set-cookie": getProductionSessionClearCookie(),
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
      return NextResponse.json(
        { error: error.message },
        { status: 401 },
      );
    }

    console.error(
      "FILUMIRE session logout error:",
      error,
    );

    return NextResponse.json(
      { error: "Unable to end authentication session." },
      { status: 500 },
    );
  }
}