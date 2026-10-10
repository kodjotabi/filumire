import { revokeOtherPrincipalAuthSessions } from "../../../../../../services/auth-session";
import { resolveSignedInSession } from "../../../../../../services/identity";

import { errorResponse, json } from "../../account/http";

/*
 * Ends every other session of the signed-in account (another
 * phone, a shared computer). This browser stays signed in.
 */
export async function POST(request: Request) {
  try {
    const session = await resolveSignedInSession(request);

    const ended = await revokeOtherPrincipalAuthSessions(
      session.principalId,
      session.sessionId,
    );

    return json({ ended });
  } catch (error) {
    return errorResponse(error, "sign out other sessions");
  }
}
