import type {
  LearnerId,
} from "../../packages/domain";

export interface RequestIdentity {
  learnerId: LearnerId;
  authenticated: boolean;
  source: "development-header";
}

const DEVELOPMENT_IDENTITY_HEADER =
  "x-filumire-learner-id";

export function resolveRequestIdentity(
  request: Request,
): RequestIdentity {
  const learnerId =
    request.headers.get(
      DEVELOPMENT_IDENTITY_HEADER,
    );

  if (!learnerId) {
    throw new Error(
      "Unauthenticated request: learner identity is required.",
    );
  }

  if (
    learnerId.length < 1 ||
    learnerId.length > 128
  ) {
    throw new Error(
      "Invalid learner identity.",
    );
  }

  return {
    learnerId:
      learnerId as LearnerId,
    authenticated: true,
    source:
      "development-header",
  };
}