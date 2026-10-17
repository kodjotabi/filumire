import {
  NextResponse,
} from "next/server";

import {
  resolvePrincipalIdentity,
} from "../../../../../../services/identity";

import { assertSameOrigin } from "../../account/http";

import {
  getPrincipalLearnerAccess,
} from "../../../../../../services/principal";

import {
  createTeacherProfessionalNote,
} from "../../../../../../services/teacher-professional-notes";

import type {
  TeacherProfessionalNoteType,
} from "../../../../../../services/persistence";

type Body = {
  learnerId?: string;
  competencyId?: string;
  noteType?: TeacherProfessionalNoteType;
  text?: string;
  clientRequestId?: string;
};

const noteTypes =
  new Set<TeacherProfessionalNoteType>([
    "context",
    "instructional",
    "professional_feedback",
  ]);

function required(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.trim().length > 0
  );
}

export async function POST(
  request: Request,
) {
  // Teacher writes come only from this application; SameSite=Strict
  // cookies alone would still admit other filumire.com sites.
  try {
    assertSameOrigin(request);
  } catch {
    return NextResponse.json(
      { error: "Cross-site teacher requests are not allowed." },
      { status: 403 },
    );
  }

  try {
    const { principalId } =
      await resolvePrincipalIdentity(request);

    const body =
      await request.json() as Body;

    if (
      !required(body.learnerId) ||
      !required(body.text) ||
      !required(body.clientRequestId) ||
      !body.noteType ||
      !noteTypes.has(body.noteType)
    ) {
      return NextResponse.json(
        { error: "Invalid teacher note." },
        { status: 400 },
      );
    }

    const access =
      await getPrincipalLearnerAccess(
        principalId,
        body.learnerId,
        "teacher",
      );

    if (!access || access.status !== "active") {
      return NextResponse.json(
        {
          error:
            "Active teacher authorization is required for this learner.",
        },
        { status: 403 },
      );
    }

    const result =
      await createTeacherProfessionalNote({
        learnerId: body.learnerId,
        competencyId: body.competencyId,
        authorPrincipalId: principalId,
        noteType: body.noteType,
        text: body.text,
        clientRequestId:
          body.clientRequestId,
      });

    return NextResponse.json(result);
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        error:
          "Unable to create teacher note.",
      },
      { status: 500 },
    );
  }
}
