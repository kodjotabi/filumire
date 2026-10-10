import { addLearnerForGuardian } from "../../../../../../services/account";
import { resolveSignedInSession } from "../../../../../../services/identity";
import { setLearnerGrade } from "../../../../../../services/learner-context";

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

    const limited = checkRateLimits(request, "add-learner", [
      { key: `principal:${session.principalId}`, limit: 20, windowMs: 60 * 60_000 },
    ]);

    if (limited) {
      return limited;
    }

    const body = await readJsonBody(request);
    const learner = await addLearnerForGuardian(session.principalId, {
      displayName: body.displayName,
      username: body.username,
      password: body.password,
      preferredLanguage: body.preferredLanguage,
      avatarId: body.avatarId,
      consentsToLearnerData: body.consentsToLearnerData,
    });

    if (typeof body.gradeId === "string" && body.gradeId) {
      await setLearnerGrade(learner.learnerId, body.gradeId);
    }

    return json(learner, { status: 201 });
  } catch (error) {
    return errorResponse(error, "add learner");
  }
}
