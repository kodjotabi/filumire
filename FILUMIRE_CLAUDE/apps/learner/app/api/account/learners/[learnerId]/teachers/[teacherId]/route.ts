import { removeTeacherFromLearner } from "../../../../../../../../../services/account";
import { resolveSignedInSession } from "../../../../../../../../../services/identity";

import { errorResponse, json } from "../../../../http";

/*
 * The learner's guardian ends a teacher's access to the learner.
 * The teacher's next request for this learner is refused.
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ learnerId: string; teacherId: string }> },
) {
  try {
    const session = await resolveSignedInSession(request);
    const { learnerId, teacherId } = await params;

    await removeTeacherFromLearner(session.principalId, learnerId, teacherId);

    return json({ removed: true });
  } catch (error) {
    return errorResponse(error, "remove teacher");
  }
}
