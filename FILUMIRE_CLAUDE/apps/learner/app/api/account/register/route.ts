import { registerGuardian } from "../../../../../../services/account";
import { issueSessionForPrincipal } from "../../../../../../services/identity";

import {
  checkRateLimits,
  errorResponse,
  json,
  readJsonBody,
  withSessionCookies,
} from "../http";

/*
 * Parent / guardian registration. Creates the guardian account,
 * records the guardian's declaration and acceptance of the notice,
 * and signs them in with a principal-only session so they can add
 * their first learner.
 */
export async function POST(request: Request) {
  try {
    const limited = await checkRateLimits(request, "register", [
      { limit: 10, windowMs: 60 * 60_000 },
    ]);

    if (limited) {
      return limited;
    }

    const body = await readJsonBody(request);
    const { principalId } = await registerGuardian({
      email: body.email,
      password: body.password,
      displayName: body.displayName,
      preferredLanguage: body.preferredLanguage,
      confirmsGuardian: body.confirmsGuardian,
      acceptsNotice: body.acceptsNotice,
    });
    const session = await issueSessionForPrincipal(principalId);

    return withSessionCookies(
      json({ registered: true, accountKind: "guardian" }, { status: 201 }),
      session.token,
    );
  } catch (error) {
    return errorResponse(error, "registration");
  }
}
