import { addLearnerForGuardian } from "../../../../../../services/account";
import { resolveSignedInSession } from "../../../../../../services/identity";
import { requireSupportedGrade, setLearnerGrade } from "../../../../../../services/learner-context";

import {
  checkRateLimits,
  errorResponse,
  json,
  readJsonBody,
} from "../http";

/*
 * A guardian adds a learner: first name or nickname, username,
 * password, language and optional grade, plus the guardian's
 * consent to FILUMIRE keeping that learner's learning records.
 */
export async function POST(request: Request) {
  try {
    const session = await resolveSignedInSession(request);

    const limited = await checkRateLimits(request, "add-learner", [
      { key: `principal:${session.principalId}`, limit: 20, windowMs: 60 * 60_000 },
    ]);

    if (limited) {
      return limited;
    }

    const body = await readJsonBody(request);

    // The class is optional here (the learner can choose it during
    // onboarding), but one that is sent must be valid before the
    // learner is created.
    const gradeId =
      body.gradeId === undefined || body.gradeId === ""
        ? undefined
        : await requireSupportedGrade(undefined, body.gradeId);

    const learner = await addLearnerForGuardian(session.principalId, {
      displayName: body.displayName,
      username: body.username,
      password: body.password,
      preferredLanguage: body.preferredLanguage,
      avatarId: body.avatarId,
      consentsToLearnerData: body.consentsToLearnerData,
    });

    if (gradeId) {
      await setLearnerGrade(learner.learnerId, gradeId, "guardian");
    }

    return json(learner, { status: 201 });
  } catch (error) {
    return errorResponse(error, "add learner");
  }
}
