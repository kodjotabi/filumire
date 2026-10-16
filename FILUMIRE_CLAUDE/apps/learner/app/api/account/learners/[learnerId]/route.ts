import { updateLearnerProfileFor } from "../../../../../../../services/account";
import { resolveSignedInSession } from "../../../../../../../services/identity";
import {
  LearnerContextValidationError,
  getLearnerLearningContext,
  requireSupportedGrade,
  setLearnerGrade,
} from "../../../../../../../services/learner-context";

import { errorResponse, json, readJsonBody } from "../../http";

/*
 * Updates a learner's profile (name, avatar, language), grade and
 * onboarding state. Allowed for the learner themselves and their
 * guardian. Learner passwords change through ./password.
 *
 * Nothing is written unless the whole request is valid. Finishing
 * onboarding requires the class the learner chose, sent in the
 * same request, so no learner starts on a grade nobody picked.
 * A class the guardian chose is locked for the learner: sending
 * the same class is accepted (and changes nothing), another one is
 * refused. The guardian can still change it.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ learnerId: string }> },
) {
  try {
    const session = await resolveSignedInSession(request);
    const { learnerId } = await params;
    const body = await readJsonBody(request);

    const learner = await updateLearnerProfileFor(
      session.principalId,
      learnerId,
      {
        displayName: body.displayName,
        avatarId: body.avatarId,
        preferredLanguage: body.preferredLanguage,
        completeOnboarding: body.completeOnboarding,
      },
      async (existing) => {
        if (
          body.completeOnboarding === true &&
          !existing.onboardingComplete &&
          body.gradeId === undefined
        ) {
          throw new LearnerContextValidationError("Choose a class.");
        }

        if (body.gradeId !== undefined) {
          const gradeId = await requireSupportedGrade(learnerId, body.gradeId);

          if (!existing.byGuardian) {
            const context = await getLearnerLearningContext(learnerId);

            if (context?.gradeSetBy === "guardian") {
              if (context.gradeId !== gradeId) {
                throw new LearnerContextValidationError(
                  "Your class was chosen by your parent or guardian.",
                );
              }
              return;
            }
          }

          await setLearnerGrade(
            learnerId,
            gradeId,
            existing.byGuardian ? "guardian" : "learner",
          );
        }
      },
    );

    return json(learner);
  } catch (error) {
    return errorResponse(error, "learner profile");
  }
}
