import { persistenceStore } from "../persistence-provider";

export async function createSession(
  sessionId: string,
  learnerId: string,
): Promise<void> {
  await persistenceStore.createSession(
    sessionId,
    learnerId,
  );
}

export async function assertSessionOwnership(
  sessionId: string,
  learnerId: string,
): Promise<void> {
  const sessionLearnerId =
    await persistenceStore.getSessionLearnerId(
      sessionId,
    );

  if (!sessionLearnerId) {
    throw new Error("Session not found.");
  }

  if (sessionLearnerId !== learnerId) {
    throw new Error(
      "Session does not belong to the authenticated learner.",
    );
  }

  const active =
    await persistenceStore.isSessionActive(
      sessionId,
      learnerId,
    );

  if (!active) {
    throw new Error("Session is inactive.");
  }
}

export async function revokeSession(
  sessionId: string,
  learnerId: string,
): Promise<void> {
  await persistenceStore.revokeSession(
    sessionId,
    learnerId,
  );
}