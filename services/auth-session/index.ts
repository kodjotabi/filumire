import { persistenceStore } from "../persistence-provider";
import type {
  PrincipalAuthSessionRecord,
} from "../persistence";

export async function createPrincipalAuthSession(
  sessionId: string,
  principalId: string,
  expiresAt: string,
): Promise<void> {
  await persistenceStore.createPrincipalAuthSession(
    sessionId,
    principalId,
    expiresAt,
  );
}

export async function getPrincipalAuthSession(
  sessionId: string,
): Promise<PrincipalAuthSessionRecord | undefined> {
  return persistenceStore.getPrincipalAuthSession(
    sessionId,
  );
}

export async function isPrincipalAuthSessionValid(
  sessionId: string,
  principalId: string,
  at = new Date().toISOString(),
): Promise<boolean> {
  return persistenceStore.isPrincipalAuthSessionValid(
    sessionId,
    principalId,
    at,
  );
}

export async function updatePrincipalAuthSessionLastActivity(
  sessionId: string,
  principalId: string,
  lastActivityAt = new Date().toISOString(),
): Promise<void> {
  await persistenceStore.updatePrincipalAuthSessionLastActivity(
    sessionId,
    principalId,
    lastActivityAt,
  );
}

export async function revokePrincipalAuthSession(
  sessionId: string,
  principalId: string,
  revokedAt = new Date().toISOString(),
): Promise<void> {
  await persistenceStore.revokePrincipalAuthSession(
    sessionId,
    principalId,
    revokedAt,
  );
}