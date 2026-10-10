import {
  cancelTeacherLinkCodesFor,
  createTeacherLinkCodeFor,
  listTeachersForLearner,
} from "../../../../../../../../services/account";
import { resolveSignedInSession } from "../../../../../../../../services/identity";

import { checkRateLimits, errorResponse, json } from "../../../http";

type Params = { params: Promise<{ learnerId: string }> };

export async function DELETE(request: Request, { params }: Params) {
  try {
    const session = await resolveSignedInSession(request);
    const { learnerId } = await params;
    await cancelTeacherLinkCodesFor(session.principalId, learnerId);
    return json({ cancelled: true });
  } catch (error) {
    return errorResponse(error, "cancel teacher code");
  }
}

/*
 * The learner's guardian sees which teachers are linked to the
 * learner.
 */
export async function GET(request: Request, { params }: Params) {
  try {
    const session = await resolveSignedInSession(request);
    const { learnerId } = await params;

    return json({
      teachers: await listTeachersForLearner(session.principalId, learnerId),
    });
  } catch (error) {
    return errorResponse(error, "list teachers");
  }
}

/*
 * The learner's guardian creates a one-time code (valid seven
 * days) to give to a teacher. A new code cancels any unused one.
 */
export async function POST(request: Request, { params }: Params) {
  try {
    const session = await resolveSignedInSession(request);
    const { learnerId } = await params;

    const limited = await checkRateLimits(request, "teacher-code", [
      { key: `principal:${session.principalId}`, limit: 20, windowMs: 60 * 60_000 },
    ]);

    if (limited) {
      return limited;
    }

    return json(
      await createTeacherLinkCodeFor(session.principalId, learnerId),
      { status: 201 },
    );
  } catch (error) {
    return errorResponse(error, "teacher code");
  }
}
