import { resetLearnerPassword } from "../../../../../../../../services/account";
import { resolveSignedInSession } from "../../../../../../../../services/identity";

import {
  checkRateLimits,
  errorResponse,
  json,
  readJsonBody,
} from "../../../http";

/*
 * A guardian sets a new password for one of their learners
 * (children cannot recover a forgotten password by email).
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ learnerId: string }> },
) {
  try {
    const session = await resolveSignedInSession(request);
    const { learnerId } = await params;

    const limited = await checkRateLimits(request, "learner-password", [
      { key: `principal:${session.principalId}`, limit: 20, windowMs: 60 * 60_000 },
    ]);

    if (limited) {
      return limited;
    }

    const body = await readJsonBody(request);

    await resetLearnerPassword(session.principalId, learnerId, body.password);

    return json({ updated: true });
  } catch (error) {
    return errorResponse(error, "learner password");
  }
}
