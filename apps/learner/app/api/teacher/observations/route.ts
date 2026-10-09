import {
  NextResponse,
} from "next/server";

import {
  resolvePrincipalIdentity,
} from "../../../../../../services/identity";

import {
  getPrincipalLearnerAccess,
} from "../../../../../../services/principal";

import {
  recordTeacherObservation,
} from "../../../../../../services/teacher-observation";

import type {
  EvidenceDifficulty,
  EvidenceErrorClass,
  EvidenceIndependence,
  EvidenceOutcome,
  EvidenceRepresentation,
  EvidenceStrength,
} from "../../../../../../packages/domain";

type Body = {
  learnerId?: string;
  competencyId?: string;
  outcome?: EvidenceOutcome;
  independence?: EvidenceIndependence;
  supportLevel?: number;
  difficulty?: EvidenceDifficulty;
  representation?: EvidenceRepresentation;
  strength?: EvidenceStrength;
  errorClass?: EvidenceErrorClass;
  errorPattern?: string;
  prerequisiteCompetencyId?: string;
  misconceptionId?: string;
  clientRequestId?: string;
};

function required(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.trim().length > 0
  );
}

export async function POST(
  request: Request,
) {
  try {
    const { principalId } =
      await resolvePrincipalIdentity(request);

    const body =
      await request.json() as Body;

    if (
      !required(body.learnerId) ||
      !required(body.competencyId) ||
      !required(body.clientRequestId) ||
      !body.outcome
    ) {
      return NextResponse.json(
        { error: "Invalid teacher observation." },
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
      await recordTeacherObservation({
        ...body,
        learnerId: body.learnerId,
        competencyId: body.competencyId,
        clientRequestId:
          body.clientRequestId,
        outcome: body.outcome,
        teacherId: principalId,
      });

    return NextResponse.json(result);
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        error:
          "Unable to record teacher observation.",
      },
      { status: 500 },
    );
  }
}
