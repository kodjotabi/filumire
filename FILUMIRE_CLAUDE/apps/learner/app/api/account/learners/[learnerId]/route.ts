import { updateLearnerProfileFor } from "../../../../../../../services/account";
import { resolveSignedInSession } from "../../../../../../../services/identity";
import { setLearnerGrade } from "../../../../../../../services/learner-context";

import { errorResponse, json, readJsonBody } from "../../http";

/*
 * Updates a learner's profile (name, avatar, language), grade and
 * onboarding state. Allowed for the learner themselves and their
 * guardian. Learner passwords change through ./password.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ learnerId: string }> },
) {
  try {
    const session = await resolveSignedInSession(request);
    const { learnerId } = await params;
    const body = await readJsonBody(request);

    // Checks the caller is the learner or their guardian, and
    // applies the profile part of the change.
    const learner = await updateLearnerProfileFor(
      session.principalId,
      learnerId,
      {
        displayName: body.displayName,
        avatarId: body.avatarId,
        preferredLanguage: body.preferredLanguage,
        completeOnboarding: body.completeOnboarding,
      },
    );

    if (typeof body.gradeId === "string" && body.gradeId) {
      await setLearnerGrade(learnerId, body.gradeId);
    }

    return json(learner);
  } catch (error) {
    return errorResponse(error, "learner profile");
  }
}
