import { NextResponse } from "next/server";

import {
  resolvePrincipalIdentity,
} from "../../../../../../services/identity";

import {
  listAuthorizedLearnersForPrincipal,
} from "../../../../../../services/principal";

import {
  buildAdultLearnerSummary,
} from "../../../../../../services/adult-summary";

function unauthorizedResponse(message: string) {
  console.warn(
    "FILUMIRE adult summary: authentication rejected",
    { reason: message },
  );

  return NextResponse.json(
    { error: message },
    { status: 401 },
  );
}

function forbiddenResponse(message: string) {
  console.warn(
    "FILUMIRE adult summary: adult authorization rejected",
    { reason: message },
  );

  return NextResponse.json(
    { error: message },
    { status: 403 },
  );
}

export async function GET(
  request: Request,
) {
  try {
    const { principalId } =
      await resolvePrincipalIdentity(request);

    const learners =
      await listAuthorizedLearnersForPrincipal(
        principalId,
      );

    const url = new URL(request.url);
    const requestedLearnerId =
      url.searchParams.get("learnerId");

    let selectedLearnerId: string | undefined;

    if (requestedLearnerId) {
      const authorized = learners.some(
        (learner) =>
          learner.learnerId === requestedLearnerId,
      );

      if (!authorized) {
        return forbiddenResponse(
          "Requested learner is not authorised for this principal.",
        );
      }

      selectedLearnerId = requestedLearnerId;
    } else if (learners.length === 1) {
      selectedLearnerId = learners[0].learnerId;
    }

    const summary = selectedLearnerId
      ? await buildAdultLearnerSummary(
          selectedLearnerId,
          request.headers.get("x-filumire-language") === "fr" ? "fr" : "en",
        )
      : null;

    return NextResponse.json({
      learners,
      selectedLearnerId,
      requiresSelection:
        !selectedLearnerId &&
        learners.length > 1,
      summary,
    });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes(
        "Unauthenticated request",
      )
    ) {
      return unauthorizedResponse(
        error.message,
      );
    }

    console.error(
      "FILUMIRE adult summary error:",
      error,
    );

    return NextResponse.json(
      {
        error:
          "Unable to load the learning summary.",
      },
      { status: 500 },
    );
  }
}
