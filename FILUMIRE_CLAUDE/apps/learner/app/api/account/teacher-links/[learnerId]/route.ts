import { leaveLearnerAsTeacher } from "../../../../../../../services/account";
import { resolveSignedInSession } from "../../../../../../../services/identity";

import {
  checkRateLimits,
  errorResponse,
  json,
  readJsonBody,
} from "../../http";

/*
 * A signed-in teacher stops teaching one learner. Only that
 * teacher's own link ends; the request must confirm it.
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ learnerId: string }> },
) {
  try {
    const session = await resolveSignedInSession(request);

    const limited = await checkRateLimits(request, "teacher-leave", [
      { key: `principal:${session.principalId}`, limit: 20, windowMs: 60 * 60_000 },
    ]);

    if (limited) {
      return limited;
    }

    const { learnerId } = await params;
    const body = await readJsonBody(request);
    await leaveLearnerAsTeacher(session.principalId, learnerId, body.confirmRemoval);
    return json({ removed: true });
  } catch (error) {
    return errorResponse(error, "teacher leave learner");
  }
}
