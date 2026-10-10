import { AccountForbiddenError } from "../../../../../../services/account";
import { revokePrincipalAuthSession } from "../../../../../../services/auth-session";
import {
  issueSessionForPrincipal,
  resolveSignedInSession,
} from "../../../../../../services/identity";
import { listAuthorizedLearnersForPrincipal } from "../../../../../../services/principal";

import {
  errorResponse,
  json,
  readJsonBody,
  withSessionCookies,
} from "../../account/http";

/*
 * Switches the signed-in session to learn as one of the
 * account's learners (a guardian opening their child's learning),
 * or back to a principal-only session with learnerId null. The old
 * session is revoked and a new one issued, so a session is only
 * ever bound to one learner at a time.
 *
 * Teacher links are excluded: a teacher reviews learners from the
 * teacher pages but never learns as them.
 */
export async function POST(request: Request) {
  try {
    const session = await resolveSignedInSession(request);
    const body = await readJsonBody(request);
    const requested = body.learnerId;

    let learnerId: string | undefined;

    if (requested !== null) {
      const access = await listAuthorizedLearnersForPrincipal(
        session.principalId,
      );
      const match = access.find(
        (entry) =>
          entry.learnerId === requested &&
          (entry.relationshipType === "guardian" ||
            entry.relationshipType === "self"),
      );

      if (!match) {
        throw new AccountForbiddenError("This learner is not linked to you.");
      }

      learnerId = match.learnerId;
    } else {
      const self = (
        await listAuthorizedLearnersForPrincipal(session.principalId)
      ).some((entry) => entry.relationshipType === "self");

      if (self) {
        throw new AccountForbiddenError(
          "A learner sign-in always learns as that learner.",
        );
      }
    }

    await revokePrincipalAuthSession(session.sessionId, session.principalId);

    const issued = await issueSessionForPrincipal(
      session.principalId,
      learnerId,
    );

    return withSessionCookies(
      json({ activeLearnerId: learnerId ?? null }),
      issued.token,
    );
  } catch (error) {
    return errorResponse(error, "learner selection");
  }
}
