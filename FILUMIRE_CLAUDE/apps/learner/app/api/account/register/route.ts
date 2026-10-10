import { registerGuardian, registerTeacher } from "../../../../../../services/account";
import { issueSessionForPrincipal } from "../../../../../../services/identity";

import {
  checkRateLimits,
  errorResponse,
  json,
  readJsonBody,
  withSessionCookies,
} from "../http";

/*
 * Parent / guardian registration, or teacher registration when
 * accountType is "teacher". Records the declaration and acceptance
 * of the notice, and signs the new account in with a principal-only
 * session: a guardian goes on to add a learner, a teacher to enter
 * a parent's link code.
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
    const teacher = body.accountType === "teacher";
    const { principalId } = teacher
      ? await registerTeacher({
          email: body.email,
          password: body.password,
          displayName: body.displayName,
          preferredLanguage: body.preferredLanguage,
          confirmsTeacher: body.confirmsTeacher,
          acceptsNotice: body.acceptsNotice,
        })
      : await registerGuardian({
          email: body.email,
          password: body.password,
          displayName: body.displayName,
          preferredLanguage: body.preferredLanguage,
          confirmsGuardian: body.confirmsGuardian,
          acceptsNotice: body.acceptsNotice,
        });
    const session = await issueSessionForPrincipal(principalId);

    return withSessionCookies(
      json(
        { registered: true, accountKind: teacher ? "teacher" : "guardian" },
        { status: 201 },
      ),
      session.token,
    );
  } catch (error) {
    return errorResponse(error, "registration");
  }
}
