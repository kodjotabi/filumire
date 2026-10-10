import { linkTeacherWithCode } from "../../../../../../services/account";
import { resolveSignedInSession } from "../../../../../../services/identity";

import {
  checkRateLimits,
  errorResponse,
  json,
  readJsonBody,
} from "../http";

/*
 * A signed-in teacher enters the code a learner's guardian gave
 * them. Tightly rate limited per teacher and per address so codes
 * cannot be guessed.
 */
export async function POST(request: Request) {
  try {
    const session = await resolveSignedInSession(request);

    const limited = await checkRateLimits(request, "teacher-link", [
      { key: `principal:${session.principalId}`, limit: 10, windowMs: 60 * 60_000 },
      { limit: 30, windowMs: 60 * 60_000 },
    ]);

    if (limited) {
      return limited;
    }

    const body = await readJsonBody(request);
    const learner = await linkTeacherWithCode(session.principalId, body.code);

    return json(
      { learnerId: learner.learnerId, displayName: learner.displayName },
      { status: 201 },
    );
  } catch (error) {
    return errorResponse(error, "teacher link");
  }
}
