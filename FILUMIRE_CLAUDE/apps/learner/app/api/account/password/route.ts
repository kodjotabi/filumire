import { changeOwnPassword } from "../../../../../../services/account";
import { revokeOtherPrincipalAuthSessions } from "../../../../../../services/auth-session";
import { resolveSignedInSession } from "../../../../../../services/identity";

import {
  checkRateLimits,
  errorResponse,
  json,
  readJsonBody,
} from "../http";

/*
 * The signed-in guardian or learner changes their own password,
 * giving the current one. Every other session of the account ends;
 * this browser stays signed in.
 */
export async function POST(request: Request) {
  try {
    const session = await resolveSignedInSession(request);

    const limited = await checkRateLimits(request, "change-password", [
      { key: `principal:${session.principalId}`, limit: 10, windowMs: 60 * 60_000 },
    ]);

    if (limited) {
      return limited;
    }

    const body = await readJsonBody(request);

    await changeOwnPassword(
      session.principalId,
      body.currentPassword,
      body.newPassword,
    );

    const otherSessionsEnded = await revokeOtherPrincipalAuthSessions(
      session.principalId,
      session.sessionId,
    );

    return json({ updated: true, otherSessionsEnded });
  } catch (error) {
    return errorResponse(error, "change password");
  }
}
