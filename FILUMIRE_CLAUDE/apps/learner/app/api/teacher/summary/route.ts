import { NextRequest, NextResponse } from "next/server";

import {
  resolvePrincipalIdentity,
} from "../../../../../../services/identity";

import {
  getPrincipalLearnerAccess,
  listAuthorizedTeacherLearnersForPrincipal,
} from "../../../../../../services/principal";

import {
  buildTeacherLearnerSummary,
} from "../../../../../../services/teacher-summary";

export async function GET(
  request: NextRequest,
) {
  try {
    const identity =
      await resolvePrincipalIdentity(request);

    const learners =
      await listAuthorizedTeacherLearnersForPrincipal(
        identity.principalId,
      );

    const requestedLearnerId =
      request.nextUrl.searchParams.get(
        "learnerId",
      );

    if (requestedLearnerId) {
      const access =
        await getPrincipalLearnerAccess(
          identity.principalId,
          requestedLearnerId,
          "teacher",
        );

      if (
        !access ||
        access.status !== "active"
      ) {
        return NextResponse.json(
          {
            error:
              "Teacher access to this learner is not authorized.",
          },
          { status: 403 },
        );
      }
    }

    const selectedLearnerId =
      requestedLearnerId ??
      (
        learners.length === 1
          ? learners[0].learnerId
          : undefined
      );

    const summary =
      selectedLearnerId
        ? await buildTeacherLearnerSummary(
            selectedLearnerId,
          )
        : null;

    return NextResponse.json({
      learners,
      selectedLearnerId,
      requiresSelection:
        learners.length > 1 &&
        !selectedLearnerId,
      summary,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "";

    if (
      /unauthenticated|authentication|required/i.test(
        message,
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Authentication required.",
        },
        { status: 401 },
      );
    }

    console.error(
      "FILUMIRE teacher summary failed:",
      error,
    );

    return NextResponse.json(
      {
        error:
          "Unable to load teacher summary.",
      },
      { status: 500 },
    );
  }
}
