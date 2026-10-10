import { describeAccount } from "../../../../../../services/account";
import { resolveSignedInSession } from "../../../../../../services/identity";

import { errorResponse, json } from "../../account/http";

/*
 * Who is signed in on this browser, which learner the session is
 * learning as (if any), and the learners the account may open.
 * 401 with code "unauthenticated" when nobody is signed in.
 */
export async function GET(request: Request) {
  try {
    const session = await resolveSignedInSession(request);
    const account = await describeAccount(session.principalId);

    return json({
      ...account,
      activeLearnerId: session.learnerId ?? null,
    });
  } catch (error) {
    return errorResponse(error, "session lookup");
  }
}
