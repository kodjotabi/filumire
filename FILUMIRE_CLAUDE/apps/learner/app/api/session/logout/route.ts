import { NextResponse } from "next/server";

import {
  getProductionSessionClearCookie,
  resolveRequestIdentity,
} from "../../../../../../services/identity";

import {
  revokePrincipalAuthSession,
} from "../../../../../../services/auth-session";

export async function POST(
  request: Request,
) {
  try {
    const identity =
      await resolveRequestIdentity(request);

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