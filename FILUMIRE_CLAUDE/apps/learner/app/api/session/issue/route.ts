import { checkRateLimits, json } from "../../account/http";

import {
  getProductionSessionCookie,
  issueProductionSession,
} from "../../../../../../services/identity";

export async function POST(
  request: Request,
) {
  try {
    // Match the password-login address budget, using a separate scope. Count
    // every attempt before verifying a token or creating principals/sessions;
    // unverified token claims must never control the limiter key.
    const limited = await checkRateLimits(request, "external-session-issue", [
      { limit: 30, windowMs: 15 * 60_000 },
    ]);
    if (limited) return limited;

    const session =
      await issueProductionSession(request);

    return json(
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

      return json(
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

      return json(
        { error: error.message },
        { status: 403 },
      );
    }

    console.error(
      "FILUMIRE session issuance error:",
      error,
    );

    return json(
      { error: "Unable to issue authentication session." },
      { status: 500 },
    );
  }
}
