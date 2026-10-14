import { NextResponse } from "next/server";
import { assertSameOrigin, BadRequestError, errorResponse } from "../../account/http";

import {
  getSignedInMarkerClearCookie,
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
    assertSameOrigin(request);
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

    const response = NextResponse.json(
      { revoked: true },
      {
        headers: {
          "cache-control": "no-store",
          "set-cookie": getProductionSessionClearCookie(),
        },
      },
    );

    response.headers.append(
      "set-cookie",
      getSignedInMarkerClearCookie(),
    );

    return response;
  } catch (error) {
    if (error instanceof BadRequestError) return errorResponse(error, "logout");
    if (
      error instanceof Error &&
      error.message.includes(
        "Unauthenticated request",
      )
    ) {
      const response = NextResponse.json(
        { error: error.message },
        { status: 401, headers: { "cache-control": "no-store", "set-cookie": getProductionSessionClearCookie() } },
      );
      response.headers.append("set-cookie", getSignedInMarkerClearCookie());
      return response;
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
