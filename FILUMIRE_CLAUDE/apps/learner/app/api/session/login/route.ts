import {
  authenticateWithPassword,
  normaliseLoginIdentifier,
} from "../../../../../../services/account";
import { revokePrincipalAuthSession } from "../../../../../../services/auth-session";
import {
  issueSessionForPrincipal,
  resolveSignedInSession,
} from "../../../../../../services/identity";
import { listAuthorizedLearnersForPrincipal } from "../../../../../../services/principal";

import {
  checkRateLimits,
  errorResponse,
  json,
  readJsonBody,
  withSessionCookies,
} from "../../account/http";

/*
 * Password sign-in for built-in accounts. A learner's session is
 * bound to their own learner record straight away; a guardian
 * gets a principal-only session and chooses a learner (or the
 * family page) afterwards.
 */
export async function POST(request: Request) {
  try {
    const body = await readJsonBody(request);
    const login = normaliseLoginIdentifier(body.login) ?? "";

    const limited = checkRateLimits(request, "login", [
      { limit: 30, windowMs: 15 * 60_000 },
      { key: `login:${login}`, limit: 10, windowMs: 15 * 60_000 },
    ]);

    if (limited) {
      return limited;
    }

    const account = await authenticateWithPassword(login, body.password);

    let learnerId: string | undefined;

    if (account.accountKind === "learner") {
      const access = await listAuthorizedLearnersForPrincipal(
        account.principalId,
      );
      learnerId = access.find(
        (entry) => entry.relationshipType === "self",
      )?.learnerId;

      if (!learnerId) {
        throw new Error(
          "Unauthenticated request: this learner sign-in is not active.",
        );
      }
    }

    // Replace, rather than stack, any session this browser had.
    await resolveSignedInSession(request)
      .then((previous) =>
        revokePrincipalAuthSession(previous.sessionId, previous.principalId),
      )
      .catch(() => undefined);

    const session = await issueSessionForPrincipal(
      account.principalId,
      learnerId,
    );

    return withSessionCookies(
      json({
        signedIn: true,
        accountKind: account.accountKind,
        learnerId: learnerId ?? null,
      }),
      session.token,
    );
  } catch (error) {
    return errorResponse(error, "sign-in");
  }
}
