import {
  persistenceStore,
} from "../persistence-provider";

/*
 * Local hands-on testing only. The browser clients send these
 * development identities as headers outside production
 * (apps/learner/services/learning-client.ts, adult-client.ts).
 * The in-memory store starts with no principal-learner links,
 * so the parent and teacher pages had nothing to show. This
 * links the development principal to the development learner
 * as guardian and teacher. It never runs in production or
 * against Postgres, and it only touches these two fixed ids.
 */
export const DEVELOPMENT_LEARNER_ID =
  "learner-runtime-feedback-001";

export const DEVELOPMENT_PRINCIPAL_ID =
  "principal-runtime-feedback-001";

let linked: Promise<void> | undefined;

function fixturesEnabled(): boolean {
  return (
    process.env.NODE_ENV !== "production" &&
    (process.env.FILUMIRE_PERSISTENCE ?? "memory") ===
      "memory"
  );
}

async function linkDevelopmentAdult(): Promise<void> {
  await persistenceStore.createPrincipal(
    DEVELOPMENT_PRINCIPAL_ID,
  );
  await persistenceStore.ensureLearnerExists(
    DEVELOPMENT_LEARNER_ID,
  );

  for (const relationshipType of [
    "guardian",
    "teacher",
  ] as const) {
    const existing =
      await persistenceStore.getPrincipalLearnerAccess(
        DEVELOPMENT_PRINCIPAL_ID,
        DEVELOPMENT_LEARNER_ID,
        relationshipType,
      );

    if (!existing) {
      await persistenceStore.createPrincipalLearnerAccess(
        `access-development-${relationshipType}`,
        DEVELOPMENT_PRINCIPAL_ID,
        DEVELOPMENT_LEARNER_ID,
        relationshipType,
      );
    }
  }
}

export async function ensureDevelopmentAdultAccess(
  principalId: string,
): Promise<void> {
  if (
    principalId !== DEVELOPMENT_PRINCIPAL_ID ||
    !fixturesEnabled()
  ) {
    return;
  }

  linked ??= linkDevelopmentAdult().catch((error) => {
    linked = undefined;
    throw error;
  });

  await linked;
}
